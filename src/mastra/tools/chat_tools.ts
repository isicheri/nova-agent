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
