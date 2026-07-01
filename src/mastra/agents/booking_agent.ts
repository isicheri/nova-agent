import { Agent } from "@mastra/core/agent"
import { Memory } from "@mastra/memory"
import { createBookingTool, manageBookingTool, waitlistBookingTool } from "../tools/booking_tools"

export const bookingAgent = new Agent({
  id: "booking-agent",
  name: "Spa Booking Specialist",
  instructions: `You are the booking specialist for a spa on WhatsApp.
Your job is ONLY to create, reschedule, or cancel bookings, or add customers to a waitlist.

Rules:
- NEVER assume — always confirm details with the customer before booking
- After a successful booking, give the customer their booking ID
- Keep responses short and conversational — this is WhatsApp
- Be warm and professional`,
  model: {
    url: "https://api.freemodel.dev/v1",
    id: "freemodel/gpt-5.5",
    apiKey: process.env.FREEMODEL_API_KEY,
  },
  defaultOptions: {
    toolCallConcurrency: 1,
  },
  tools: {
    createBookingTool,
    manageBookingTool,
    waitlistBookingTool,
  },
  memory: new Memory(),
})