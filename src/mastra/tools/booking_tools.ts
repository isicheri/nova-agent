import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { db } from "../../db"
import { bookingTable, serviceTable, customerTable } from "../../db/schema"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "crypto"

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
    serviceId: z.string().describe("The UUID of the service to book"),
  }),
  outputSchema: z.object({
    available: z.boolean(),
    message: z.string(),
    suggestedSlots: z.array(z.string()).optional(),
  }),
  execute: async ( inputData  ) => {
    const { date, timeSlot, serviceId } = inputData

    // Check if any booking exists for this date and time slot
    const existingBookings = await db
      .select()
      .from(bookingTable)
      .where(
        and(
          eq(bookingTable.timeSlot, timeSlot),
          eq(bookingTable.serviceId, serviceId),
          eq(bookingTable.status, "confirmed")
        )
      )

    // Filter bookings for the specific date
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

    // Suggest alternative time slots
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

// Tool 2: Create a new booking
export const createBookingTool = createTool({
  id: "create-booking",
  description:
    "Creates a new appointment booking for a customer. " +
    "Use this after confirming the service, date, and time with the customer. " +
    "Always check availability first before creating a booking.",
  inputSchema: z.object({
    customerPhone: z.string().describe("The customer's phone number (WaId)"),
    serviceId: z.string().describe("The UUID of the service to book"),
    date: z.string().describe("The appointment date in YYYY-MM-DD format"),
    timeSlot: z.string().describe("The time slot, e.g. '10:00 AM', '2:30 PM'"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    bookingId: z.string().optional(),
  }),
  execute: async (inputData) => {
    const { customerPhone, serviceId, date, timeSlot } = inputData

    // Find the customer by phone number
    const customers = await db
      .select()
      .from(customerTable)
      .where(eq(customerTable.phone, customerPhone))

    if (customers.length === 0) {
      return {
        success: false,
        message: "Customer not found. Please register first.",
      }
    }

    const customer = customers[0]
    if (!customer) {
      return {
        success: false,
        message: "Customer not found. Please register first.",
      }
    }

    // Verify the service exists
    const services = await db
      .select()
      .from(serviceTable)
      .where(eq(serviceTable.id, serviceId))

    if (services.length === 0) {
      return {
        success: false,
        message: "Service not found. Please choose a valid service.",
      }
    }

    const service = services[0]

    const bookingId = randomUUID()

    await db.insert(bookingTable).values({
      id: bookingId,
      customerId: customer.id,
      serviceId: serviceId,
      date: new Date(date),
      timeSlot: timeSlot,
      status: "confirmed",
    })

    return {
      success: true,
      message: `Booking confirmed! ${service?.name} on ${date} at ${timeSlot}. Your booking ID is ${bookingId.slice(0, 8)}.`,
      bookingId,
    }
  },
})

// Tool 3: Manage existing bookings (get, reschedule, cancel)
export const manageBookingTool = createTool({
  id: "manage-booking",
  description:
    "Manages existing bookings — can retrieve a customer's bookings, reschedule, or cancel them. " +
    "Use action 'get' to list bookings, 'reschedule' to change date/time, 'cancel' to cancel.",
  inputSchema: z.object({
    action: z.enum(["get", "reschedule", "cancel"]).describe("The action to perform"),
    customerPhone: z.string().describe("The customer's phone number (WaId)"),
    bookingId: z.string().optional().describe("The booking ID (required for reschedule/cancel)"),
    newDate: z.string().optional().describe("New date in YYYY-MM-DD format (for reschedule)"),
    newTimeSlot: z.string().optional().describe("New time slot (for reschedule)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    bookings: z.array(z.object({
      id: z.string(),
      serviceName: z.string(),
      date: z.string(),
      timeSlot: z.string(),
      status: z.string(),
    })).optional(),
  }),
  execute: async (inputData) => {
    const { action, customerPhone, bookingId, newDate, newTimeSlot } = inputData

    // Find the customer
    const customers = await db
      .select()
      .from(customerTable)
      .where(eq(customerTable.phone, customerPhone))

    if (customers.length === 0) {
      return { success: false, message: "Customer not found." }
    }

    const customer = customers[0]
    if (!customer) {
      return { success: false, message: "Customer not found." }
    }

    if (action === "get") {
      // Get all bookings for this customer
      const bookings = await db
        .select({
          id: bookingTable.id,
          date: bookingTable.date,
          timeSlot: bookingTable.timeSlot,
          status: bookingTable.status,
          serviceName: serviceTable.name,
        })
        .from(bookingTable)
        .innerJoin(serviceTable, eq(bookingTable.serviceId, serviceTable.id))
        .where(eq(bookingTable.customerId, customer.id))

      if (bookings.length === 0) {
        return { success: true, message: "You have no bookings yet." }
      }

      return {
        success: true,
        message: `Found ${bookings.length} booking(s).`,
        bookings: bookings.map((b) => ({
          id: b.id,
          serviceName: b.serviceName,
          date: b.date ? new Date(b.date).toISOString().split("T")[0] ?? "" : "",
          timeSlot: b.timeSlot,
          status: b.status,
        })),
      }
    }

    if (action === "reschedule") {
      if (!bookingId || !newDate || !newTimeSlot) {
        return {
          success: false,
          message: "Please provide the booking ID, new date, and new time slot to reschedule.",
        }
      }

      await db
        .update(bookingTable)
        .set({
          date: new Date(newDate),
          timeSlot: newTimeSlot,
          status: "rescheduled",
          updatedAt: new Date(),
        })
        .where(eq(bookingTable.id, bookingId))

      return {
        success: true,
        message: `Booking rescheduled to ${newDate} at ${newTimeSlot}.`,
      }
    }

    if (action === "cancel") {
      if (!bookingId) {
        return {
          success: false,
          message: "Please provide the booking ID to cancel.",
        }
      }

      await db
        .update(bookingTable)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(bookingTable.id, bookingId))

      return {
        success: true,
        message: "Booking has been cancelled.",
      }
    }

    return { success: false, message: "Invalid action." }
  },
})
