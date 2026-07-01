import "dotenv/config"
import express, { type Request, type Response } from "express"
import { MastraServer } from "@mastra/express"
import { mastra } from "./mastra"
import { db } from "./db"
import { saveConversationState, loadConversationState, deleteConversationState } from "./lib/lib"
import { customerTable } from "./db/schema"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"
import { orchestratorAgent } from "./mastra/agents/orchestrator-agent"
import { textFormatterAgent } from "./mastra/agents/text-formatter-agent"
import { sendWhatsappMessage } from "./lib/twilio"

const app = express()
const PORT = process.env.PORT || 3000

/**
 * Cleans agent response text before sending to WhatsApp:
 * 1. Strips leaked <function=...>...</function> tool call blocks (Groq llama model bug)
 * 2. Strips any leftover raw JSON blobs
 * 3. Deduplicates repeated content caused by Mastra memory context bleed
 */
function cleanAgentResponse(text: string): string {
  if (!text) return text

  // Step 1: Strip <function=functionName>{...}</function> blocks the model leaks as plain text
  let cleaned = text.replace(/<function=[^>]+>[\s\S]*?<\/function>/g, "").trim()

  // Step 2: Strip any orphaned JSON blobs at the end (e.g. {"memory": {...}})
  cleaned = cleaned.replace(/\s*\{[\s\S]*\}\s*$/, "").trim()

  // Step 3: Deduplicate — if the response contains an exact repeated prefix, keep only the last occurrence
  if (cleaned.length >= 20) {
    const halfLen = Math.floor(cleaned.length / 2)
    for (let len = halfLen; len >= 20; len--) {
      const candidate = cleaned.slice(0, len)
      const rest = cleaned.slice(len)
      if (rest.trimStart().startsWith(candidate) || rest.includes(candidate)) {
        const lastIdx = cleaned.lastIndexOf(candidate)
        if (lastIdx > 0) {
          cleaned = cleaned.slice(lastIdx).trim()
          break
        }
      }
    }
  }

  return cleaned
}

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const server = new MastraServer({ app, mastra })
await server.init()

//is database active
app.get("/test-db", async (_req: Request, _res: Response) => {
  try {
    const customers = await db.select().from(customerTable)
    return _res.status(200).json({ message: "Database is active", customers: customers })
  } catch (error) {
    console.error("Database error:", error)
    return _res.status(500).json({ message: "Database is not active" })
  }
})

// Spa Admin Dashboard
import { renderSpaDashboard } from "./dashboard"
app.get("/spa-dashboard", async (_req: Request, _res: Response) => {
  try {
    const html = await renderSpaDashboard()
    _res.status(200).send(html)
  } catch (error) {
    console.error("Dashboard error:", error)
    _res.status(500).send("Internal Server Error loading dashboard")
  }
})

// Webhooks
app.post("/recieve-message", async (_req: Request, _res: Response) => {
  try {
    // Handle webhook
    if (_req.body === undefined) {
      return _res.status(400).send("Bad Request")
    }

    console.log(_req.body)

    const {
      ProfileName,
      MessageType, // text
      WaId, // '2349060440901'
      SmsStatus, // received
      Body, // the message body
      From, // whatsapp:+2349060440901
    } = _req.body

    if (SmsStatus !== "received" || MessageType !== "text" || Body.length === 1) {
      return _res.status(400).send("Bad Request")
    }

    const findCustomerByNumber = await db
      .select()
      .from(customerTable)
      .where(eq(customerTable.phone, WaId))

    let threadId: string
    let customerName: string = ProfileName

    if (findCustomerByNumber.length === 0) {
      // New customer — create record + initialize state
      await db.insert(customerTable).values({
        id: randomUUID(),
        phone: WaId,
        name: ProfileName,
      })

      threadId = randomUUID()

      await saveConversationState({
        phoneNumber: WaId,
        threadId,
        intent: "",
        step: "service",
        service: "",
        date: "",
        time: "",
      })

      console.log(`New customer created: ${customerName} (${WaId})`)
    } else {
      // Existing customer — use name from DB (more reliable than Twilio profile)
      customerName = findCustomerByNumber[0]?.name ?? ProfileName

      const state = await loadConversationState({ phoneNumber: WaId })

      if (!state) {
        // State expired or missing — create fresh state
        threadId = randomUUID()

        await saveConversationState({
          phoneNumber: WaId,
          threadId,
          intent: "",
          step: "service",
          service: "",
          date: "",
          time: "",
        })

        console.log(`State reset for returning customer: ${customerName} (${WaId})`)
      } else {
        threadId = (state as { threadId: string }).threadId
        console.log(`Resuming conversation for: ${customerName} (${WaId}), thread: ${threadId}`)
      }
    }

    // Call AI agent with user message and thread state
    console.log(`Calling orchestrator agent for thread: ${threadId}`);
    let response;
    try {
      response = await orchestratorAgent.generate(Body, {
        toolCallConcurrency: 1,
        memory: {
          thread: threadId,
          resource: WaId
        }
      });
    } catch (generateError) {
      console.error("Failed to generate response for thread:", threadId, generateError);

      // Self-healing: Clean up the poisoned conversation history from the SQLite database
      try {
        const memory = await orchestratorAgent.getMemory();
        if (memory) {
          const recallResult = await memory.recall({ threadId });
          const messages = recallResult?.messages;
          if (messages && Array.isArray(messages) && messages.length > 0) {
            // Revert the last 2 messages (the user prompt and any partial/failed assistant response)
            const lastMessages = messages.slice(-2);
            const messagesToDelete = lastMessages.map(msg => msg.id).filter(Boolean) as string[];

            if (messagesToDelete.length > 0) {
              await memory.deleteMessages(messagesToDelete);
              console.log(`Cleaned up ${messagesToDelete.length} failed/poisoned messages from thread memory.`);
            }
          }
        }
      } catch (cleanupError) {
        console.error("Failed to clean up memory after error:", cleanupError);
      }

      throw generateError; // Re-throw to propagate error to Express's catch block
    }

    console.log(`Agent response (raw): ${response.text}`)

    // Run through the text formatter agent to strip artifacts and clean the message
    let finalResponse: string
    try {
      const formatted = await textFormatterAgent.generate(
        `Clean this raw agent response before sending it to a WhatsApp customer:\n\n${response.text}`
      )
      finalResponse = formatted.text.trim()
      console.log(`Agent response (formatted): ${finalResponse}`)
    } catch (formatterError) {
      // Fallback to regex cleaner if formatter agent fails
      console.warn("Formatter agent failed, using regex fallback:", formatterError)
      finalResponse = cleanAgentResponse(response.text)
      console.log(`Agent response (regex fallback): ${finalResponse}`)
    }

    // Send response back via Twilio
    await sendWhatsappMessage(WaId, finalResponse);

    // Acknowledge the webhook so Twilio doesn't retry
    return _res.status(200).send("OK")
  } catch (error) {
    console.error("Webhook error:", error)
    return _res.status(500).send("Internal Server Error")
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})