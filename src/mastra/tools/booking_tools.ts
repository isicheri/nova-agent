import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { db } from "../../db"
import { bookingTable, serviceTable, customerTable, therapistTable } from "../../db/schema"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

// Tool 1: Create a new booking
export const createBookingTool = createTool({
  id: "create-booking",
  description:
    "Creates a new appointment booking for a customer. " +
    "Use this after confirming the service, therapist, date, and time with the customer. " +
    "Always check availability first before creating a booking.",
  inputSchema: z.object({
    customerPhone: z.string().describe("The customer's phone number (WaId)"),
    customerName: z.string().describe("The customer's full name"),
    serviceName: z.string().describe("The name of the service to book (e.g. 'Swedish Massage')"),
    therapistName: z.string().optional().describe("The name of the therapist (optional)"),
    date: z.string().describe("The appointment date in YYYY-MM-DD format"),
    timeSlot: z.string().describe("The time slot, e.g. '10:00 AM', '2:30 PM'"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    bookingId: z.string().optional(),
  }),
  execute: async (inputData) => {
    const { customerPhone, customerName, serviceName, therapistName, date, timeSlot } = inputData

    let customer = null
    const customers = await db.select().from(customerTable).where(eq(customerTable.phone, customerPhone))
    if (customers.length === 0) {
      const newId = randomUUID()
      await db.insert(customerTable).values({ id: newId, name: customerName, phone: customerPhone })
      customer = { id: newId, name: customerName, phone: customerPhone }
    } else {
      customer = customers[0]
    }

    if (!customer) return { success: false, message: "Could not create or find customer." }

    const allServices = await db.select().from(serviceTable)
    const service = allServices.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase()))
    if (!service) return { success: false, message: `Service '${serviceName}' not found.` }

    let therapist = null
    if (therapistName) {
      const allTherapists = await db.select().from(therapistTable)
      therapist = allTherapists.find(t => t.name.toLowerCase().includes(therapistName.toLowerCase()))
    }

    const bookingId = randomUUID()

    await db.insert(bookingTable).values({
      id: bookingId,
      customerId: customer.id,
      serviceId: service.id,
      therapistId: therapist?.id ?? null,
      date: new Date(date),
      timeSlot: timeSlot,
      status: "confirmed",
    })

    console.log(`[EMAIL MOCK] New booking created! Admin alerted. Booking ID: ${bookingId}`)

    return {
      success: true,
      message: `Booking confirmed! ${service.name}${therapist ? ` with ${therapist.name}` : ''} on ${date} at ${timeSlot}. Your booking ID is ${bookingId.slice(0, 8)}.`,
      bookingId,
    }
  },
})

// Tool 2: Manage existing bookings (get, reschedule, cancel)
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

    const customers = await db.select().from(customerTable).where(eq(customerTable.phone, customerPhone))
    if (customers.length === 0) return { success: false, message: "Customer not found." }
    const customer = customers[0]
    if (!customer) return { success: false, message: "Customer not found." }

    if (action === "get") {
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

      if (bookings.length === 0) return { success: true, message: "You have no bookings yet." }

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
      if (!bookingId || !newDate || !newTimeSlot) return { success: false, message: "Please provide the booking ID, new date, and new time slot." }
      await db.update(bookingTable).set({ date: new Date(newDate), timeSlot: newTimeSlot, status: "rescheduled", updatedAt: new Date() }).where(eq(bookingTable.id, bookingId))
      return { success: true, message: `Booking rescheduled to ${newDate} at ${newTimeSlot}.` }
    }

    if (action === "cancel") {
      if (!bookingId) return { success: false, message: "Please provide the booking ID." }
      await db.update(bookingTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(bookingTable.id, bookingId))
      return { success: true, message: "Booking has been cancelled." }
    }

    return { success: false, message: "Invalid action." }
  },
})

// Tool 3: Waitlist Booking Tool
export const waitlistBookingTool = createTool({
  id: "waitlist-booking",
  description:
    "Adds a customer to the waitlist for a specific service on a specific date when the time slot is full.",
  inputSchema: z.object({
    customerPhone: z.string().describe("The customer's phone number (WaId)"),
    customerName: z.string().describe("The customer's full name"),
    serviceName: z.string().describe("The name of the service to waitlist for"),
    date: z.string().describe("The date in YYYY-MM-DD format"),
    timeSlot: z.string().describe("The time slot they want, e.g. '10:00 AM'"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async (inputData) => {
    const { customerPhone, customerName, serviceName, date, timeSlot } = inputData

    let customer = null
    const customers = await db.select().from(customerTable).where(eq(customerTable.phone, customerPhone))
    if (customers.length === 0) {
      const newId = randomUUID()
      await db.insert(customerTable).values({ id: newId, name: customerName, phone: customerPhone })
      customer = { id: newId, name: customerName, phone: customerPhone }
    } else {
      customer = customers[0]
    }

    if (!customer) return { success: false, message: "Could not create or find customer." }

    const allServices = await db.select().from(serviceTable)
    const service = allServices.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase()))
    if (!service) return { success: false, message: `Service '${serviceName}' not found.` }

    await db.insert(bookingTable).values({
      id: randomUUID(),
      customerId: customer.id,
      serviceId: service.id,
      date: new Date(date),
      timeSlot: timeSlot,
      status: "waitlisted",
    })

    return {
      success: true,
      message: `You have been added to the waitlist for ${timeSlot} on ${date}. We will contact you if a spot opens up!`,
    }
  },
})
