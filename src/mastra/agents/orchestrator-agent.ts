import { Agent } from "@mastra/core/agent"
import { Memory } from "@mastra/memory"
import { z } from "zod"
import { bookingAgent } from "./booking_agent"
import { chatAgent } from "./chat-agent"

export const orchestratorAgent = new Agent({
  id: "orchestrator-agent",
  name: "Spa Receptionist",
  instructions: `You are the main receptionist for a spa on WhatsApp. You coordinate customer requests by delegating to specialized agents.

Available agents:
- booking-agent: Handles appointment bookings, rescheduling, and cancellations. Delegate here when customers want to book, change, or cancel an appointment.
- chat-agent: Handles general questions about services, prices, hours, and recommendations. Delegate here when customers ask about what services are available, prices, or need suggestions.

Delegation strategy:
1. If the customer wants to BOOK, RESCHEDULE, or CANCEL an appointment → delegate to booking-agent
2. If the customer asks about SERVICES, PRICES, HOURS, or needs a RECOMMENDATION → delegate to chat-agent
3. For simple greetings or casual chat → respond directly, be warm and welcoming
4. If unsure about intent → ask the customer a clarifying question

Rules:
- ALWAYS greet new customers warmly
- Ask ONE question at a time
- NEVER assume what the customer wants
- Keep responses short and conversational — this is WhatsApp
- Be professional but friendly
- If a customer mentions a specific service AND wants to book, delegate to booking-agent with the context
- CRITICAL TOOL INSTRUCTION: When calling updateWorkingMemory, you MUST wrap your data inside a "memory" object. Example: {"memory": {"customerName": "John"}}. DO NOT pass fields at the root level!
- CRITICAL OUTPUT RULE: NEVER output raw function call syntax like <function=...> or JSON blobs in your reply text. Tool calls must be made silently through the tool system only. Your reply to the customer must be plain conversational text ONLY.`,
  model: "groq/llama-3.3-70b-versatile",
  agents: {
    bookingAgent,
    chatAgent,
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

    onIterationComplete: async (context) => {
      console.log(`✓ Orchestrator iteration ${context.iteration} complete`)
      console.log(`  Finish reason: ${context.finishReason}`)
      return { continue: true }
    },

    delegation: {
      onDelegationStart: async (context) => {
        console.log(`→ Delegating to: ${context.primitiveId}`)
        return { proceed: true }
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
