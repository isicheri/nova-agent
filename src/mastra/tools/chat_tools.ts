import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { db } from "../../db"
import { serviceTable } from "../../db/schema"

// Tool: Get all available spa services
export const getServicesTool = createTool({
  id: "get-services",
  description:
    "Retrieves the list of available spa services with their names, prices, and durations. " +
    "Use this when a customer asks about services, prices, what's available, or needs a recommendation.",
  inputSchema: z.object({
    query: z.string().optional().describe("Optional search term to filter services by name"),
  }),
  outputSchema: z.object({
    services: z.array(z.object({
      id: z.string(),
      name: z.string(),
      price: z.string(),
      duration: z.number(),
    })),
    message: z.string(),
  }),
  execute: async (inputData) => {
    const services = await db.select().from(serviceTable)

    let filtered = services

    // Filter by name if a query is provided
    if (inputData.query) {
      const q = inputData.query.toLowerCase()
      filtered = services.filter((s) =>
        s.name.toLowerCase().includes(q)
      )
    }

    if (filtered.length === 0) {
      return {
        services: [],
        message: "No services found matching your search.",
      }
    }

    return {
      services: filtered.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
      })),
      message: `Found ${filtered.length} service(s) available.`,
    }
  },
})

// Tool: Customer History
export const customerHistoryTool = createTool({
  id: "customer-history",
  description:
    "Retrieves the customer's past bookings to make personalized recommendations.",
  inputSchema: z.object({
    customerPhone: z.string().describe("The customer's phone number (WaId)"),
  }),
  outputSchema: z.object({
    pastBookings: z.array(z.object({
      serviceName: z.string(),
      date: z.string(),
      status: z.string(),
    })).optional(),
    message: z.string(),
  }),
  execute: async (inputData) => {
    const { customerPhone } = inputData
    
    // Import here to avoid circular dependencies if any, or just import at the top
    const { customerTable, bookingTable } = await import("../../db/schema")
    const { eq } = await import("drizzle-orm")
    
    const customers = await db.select().from(customerTable).where(eq(customerTable.phone, customerPhone))
    if (customers.length === 0) return { message: "New customer. No past history." }
    
    const customer = customers[0]
    if (!customer) return { message: "New customer. No past history." }

    const bookings = await db
      .select({
        serviceName: serviceTable.name,
        date: bookingTable.date,
        status: bookingTable.status,
      })
      .from(bookingTable)
      .innerJoin(serviceTable, eq(bookingTable.serviceId, serviceTable.id))
      .where(eq(bookingTable.customerId, customer.id))

    if (bookings.length === 0) return { message: "No past bookings." }
    
    return {
      pastBookings: bookings.map(b => ({
        serviceName: b.serviceName,
        date: b.date ? new Date(b.date).toISOString().split("T")[0] ?? "" : "",
        status: b.status
      })),
      message: `Found ${bookings.length} past booking(s).`
    }
  },
})
