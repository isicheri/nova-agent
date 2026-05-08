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
import { sendWhatsappMessage } from "./lib/twilio"

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const server = new MastraServer({ app, mastra })
await server.init()

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
    const response = await orchestratorAgent.generate(Body, {
      memory: {
        thread: threadId,
        resource: WaId
      }
    });

    console.log(`Agent response: ${response.text}`);

    // Send response back via Twilio
    await sendWhatsappMessage(WaId, response.text);

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
