import { Agent } from "@mastra/core/agent"
import { Memory } from "@mastra/memory"
import { z } from "zod"
import { bookingAgent } from "./booking_agent"
import { chatAgent } from "./chat-agent"
import { availabilityAgent } from "./availability-agent"

export const orchestratorAgent = new Agent({
  id: "orchestrator-agent",
  name: "Spa Receptionist",
  instructions: `You are the main receptionist for a spa on WhatsApp. You coordinate customer requests by delegating to specialized agents.

Available agents:
- booking-agent: Handles actual creation, rescheduling, cancellation, and waitlisting of appointments.
- availability-agent: Checks if a date/time/therapist is free, and calculates prices with add-ons. Delegate here BEFORE booking to check dates.
- chat-agent: Handles general questions about services, hours, and looks up customer history.

Delegation strategy:
1. If the customer wants to check AVAILABILITY for a date/time/therapist or asks for a PRICE calculation → delegate to availability-agent
2. If the customer wants to CREATE, RESCHEDULE, CANCEL, or WAITLIST an appointment → delegate to booking-agent
3. If the customer asks about SERVICES, HOURS, or PAST BOOKINGS → delegate to chat-agent
4. For simple greetings or casual chat → respond directly, be warm and welcoming
5. If unsure about intent → ask the customer a clarifying question

Rules:
- ALWAYS greet new customers warmly
- Ask ONE question at a time
- NEVER assume what the customer wants
- Keep responses short and conversational — this is WhatsApp
- Be professional but friendly
- When updating the working memory for simple greetings or casual chat, you MUST set the intent to "chat" and the step to "greeting" (do not use "greeting" as the intent, as it is not a valid schema option).
- CRITICAL TOOL INSTRUCTION: When calling updateWorkingMemory, you MUST wrap your data inside a "memory" object. Example: {"memory": {"customerName": "John"}}. DO NOT pass fields at the root level!
- CRITICAL OUTPUT RULE: NEVER output raw function call syntax like <function=...> or JSON blobs in your reply text. Tool calls must be made silently through the tool system only. Your reply to the customer must be plain conversational text ONLY.`,
  model: {
    url: "https://api.freemodel.dev/v1",
    id: "freemodel/gpt-5.5",
    apiKey: process.env.FREEMODEL_API_KEY,
    headers: {
      "X-Custom-Header": "value"
    }
  },
  agents: {
    bookingAgent,
    chatAgent,
    availabilityAgent,
  },
  memory: new Memory({
    options: {
      workingMemory: {
        enabled: true,
        scope: "thread",
        schema: z.object({
          customerName: z.string().optional().describe("The customer's name"),
          intent: z.enum(["booking", "rescheduling", "cancellation", "inquiry", "chat", ""]).optional().describe("The customer's current intent"),
          step: z.enum(["greeting", "service", "date", "time", "confirm", ""]).optional().describe("Current step in the booking flow"),
          service: z.string().optional().describe("The service the customer selected"),
          date: z.string().optional().describe("The appointment date"),
          time: z.string().optional().describe("The appointment time"),
        }),
      },
      lastMessages: 15,
    },
  }),
  defaultOptions: {
    maxSteps: 5,
    toolCallConcurrency: 1,

    onIterationComplete: async (context) => {
      console.log(`✓ Orchestrator iteration ${context.iteration} complete`)
      console.log(`  Finish reason: ${context.finishReason}`)
      return { continue: true }
    },

    delegation: {
      onDelegationStart: async (context) => {
        console.log(`→ Delegating to: ${context.primitiveId}`)
        return { proceed: true, modifiedMaxSteps: 5 }
      },

      onDelegationComplete: async (context) => {
        console.log(`✓ Completed: ${context.primitiveId}`)

        if (context.error) {
          console.error("Delegation failed:", context.error)
          context.bail()
          return {
            feedback: `Delegation to ${context.primitiveId} failed. Handle the request directly.`,
          }
        }
      },

      messageFilter: ({ messages }) => {
        return messages.slice(-10)
      },
    },
  },
})
