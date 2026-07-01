import { Agent } from "@mastra/core/agent"
import { getServicesTool, customerHistoryTool } from "../tools/chat_tools"
import { Memory } from "@mastra/memory"

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Spa Chat Assistant",
  instructions: `You are the chat assistant for a spa on WhatsApp.
Your job is to answer general questions about services, prices, hours, and recommendations.

Rules:
- Keep responses short, warm, and conversational — this is WhatsApp
- Use customer-history to see their past bookings and make personalized recommendations
- If a customer wants to book, let them know you'll connect them with the booking system
- NEVER make up services or prices — always use the get_services tool
- If you don't know something, say so honestly`,
  model: {
    url: "https://api.freemodel.dev/v1",
    id: "freemodel/gpt-5.5",
    apiKey: process.env.FREEMODEL_API_KEY,
  },
  defaultOptions: {
    toolCallConcurrency: 1,
  },
  tools: {
    getServicesTool,
    customerHistoryTool,
  },
  memory: new Memory(),
})
