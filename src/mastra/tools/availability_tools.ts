import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { db } from "../../db"
import { bookingTable, serviceTable, therapistTable } from "../../db/schema"
import { eq, and } from "drizzle-orm"

// Tool 1: Check availability for a service on a specific date/time
export const checkAvailabilityTool = createTool({
  id: "check-availability",
  description:
    "Checks if a specific time slot is available for a service on a given date. " +
    "Use this before creating a booking to ensure the slot is free. " +
    "Returns whether the slot is available and suggests alternatives if not.",
  inputSchema: z.object({
    date: z.string().describe("The date to check in YYYY-MM-DD format"),
    timeSlot: z.string().describe("The time slot to check, e.g. '10:00 AM', '2:30 PM'"),
    serviceName: z.string().describe("The name of the service (e.g. 'Swedish Massage')"),
  }),
  outputSchema: z.object({
    available: z.boolean(),
    message: z.string(),
    suggestedSlots: z.array(z.string()).optional(),
  }),
  execute: async (inputData) => {
    const { date, timeSlot, serviceName } = inputData

    const allServices = await db.select().from(serviceTable)
    const service = allServices.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase()))
    if (!service) return { available: false, message: `Service '${serviceName}' not found.` }

    const existingBookings = await db
      .select()
      .from(bookingTable)
      .where(
        and(
          eq(bookingTable.timeSlot, timeSlot),
          eq(bookingTable.serviceId, service.id),
          eq(bookingTable.status, "confirmed")
        )
      )

    const conflicting = existingBookings.filter((b) => {
      if (!b.date) return false
      const bookingDate = new Date(b.date).toISOString().split("T")[0]
      return bookingDate === date
    })

    if (conflicting.length === 0) {
      return {
        available: true,
        message: `The ${timeSlot} slot on ${date} is available!`,
      }
    }

    const allSlots = [
      "9:00 AM", "10:00 AM", "11:00 AM",
      "12:00 PM", "1:00 PM", "2:00 PM",
      "3:00 PM", "4:00 PM", "5:00 PM",
    ]

    const bookedSlots = existingBookings
      .filter((b) => {
        if (!b.date) return false
        return new Date(b.date).toISOString().split("T")[0] === date
      })
      .map((b) => b.timeSlot)

    const suggestedSlots = allSlots.filter((s) => !bookedSlots.includes(s))

    return {
      available: false,
      message: `Sorry, the ${timeSlot} slot on ${date} is already booked.`,
      suggestedSlots: suggestedSlots.slice(0, 3),
    }
  },
})

// Tool 2: Get Therapist Availability
export const getTherapistAvailabilityTool = createTool({
  id: "get-therapist-availability",
  description:
    "Checks which therapists are available on a specific date, or gets the schedule for a specific therapist.",
  inputSchema: z.object({
    date: z.string().describe("The date to check in YYYY-MM-DD format"),
    therapistName: z.string().optional().describe("Optional: Search for a specific therapist by name"),
  }),
  outputSchema: z.object({
    therapists: z.array(z.object({
      id: z.string(),
      name: z.string(),
      specialties: z.string().nullable(),
    })),
    message: z.string(),
  }),
  execute: async (inputData) => {
    const { therapistName } = inputData
    
    // Simplification: In a real app we would check schedules. Here we return therapists.
    const allTherapists = await db.select().from(therapistTable)
    
    let filtered = allTherapists
    if (therapistName) {
      const q = therapistName.toLowerCase()
      filtered = allTherapists.filter((t) => t.name.toLowerCase().includes(q))
    }
    
    if (filtered.length === 0) {
      return { therapists: [], message: "No therapists found matching your criteria." }
    }
    
    return {
      therapists: filtered.map(t => ({ id: t.id, name: t.name, specialties: t.specialties })),
      message: `Found ${filtered.length} therapist(s).`,
    }
  },
})

// Tool 3: Calculate Price
export const calculatePriceTool = createTool({
  id: "calculate-price",
  description:
    "Calculates the total price of a service with optional add-ons like Hot Stones, Aromatherapy, etc.",
  inputSchema: z.object({
    serviceName: z.string().describe("The name of the base service"),
    addOns: z.array(z.enum(["Hot Stones", "Aromatherapy", "CBD Oil", "None"])).optional(),
  }),
  outputSchema: z.object({
    basePrice: z.number(),
    addOnPrice: z.number(),
    totalPrice: z.number(),
    message: z.string(),
  }),
  execute: async (inputData) => {
    const { serviceName, addOns } = inputData
    
    const allServices = await db.select().from(serviceTable)
    const service = allServices.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase()))
    
    if (!service) {
      return { basePrice: 0, addOnPrice: 0, totalPrice: 0, message: "Service not found." }
    }
    
    const basePrice = Number(service?.price ?? 0)
    
    let addOnPrice = 0
    if (addOns) {
      for (const addon of addOns) {
        if (addon === "Hot Stones") addOnPrice += 20
        if (addon === "Aromatherapy") addOnPrice += 15
        if (addon === "CBD Oil") addOnPrice += 25
      }
    }
    
    const totalPrice = basePrice + addOnPrice
    
    return {
      basePrice,
      addOnPrice,
      totalPrice,
      message: `The total price is $${totalPrice.toFixed(2)} (Base: $${basePrice.toFixed(2)}, Add-ons: $${addOnPrice.toFixed(2)}).`,
    }
  },
})
