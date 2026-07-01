import { Agent } from "@mastra/core/agent"
import { checkAvailabilityTool, getTherapistAvailabilityTool, calculatePriceTool } from "../tools/availability_tools"

export const availabilityAgent = new Agent({
  id: "availability-agent",
  name: "Spa Availability Agent",
  instructions: `You are the availability and pricing specialist for the spa on WhatsApp.
Your job is to help customers find out when they can book and how much it will cost.

Rules:
- ALWAYS check availability if a user asks for a specific date or time.
- If a user asks for a specific therapist, use get-therapist-availability.
- If a user asks about prices with add-ons, use calculate-price.
- NEVER make up prices or availability.
- Keep responses short and conversational.`,
  model: {
    url: "https://api.freemodel.dev/v1",
    id: "freemodel/gpt-5.5",
    apiKey: process.env.FREEMODEL_API_KEY,
  },
  defaultOptions: {
    toolCallConcurrency: 1,
  },
  tools: {
    checkAvailabilityTool,
    getTherapistAvailabilityTool,
    calculatePriceTool,
  },
})
