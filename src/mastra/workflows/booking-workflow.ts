import { createWorkflow }  from "@mastra/core/workflows"
import { z } from "zod";



const bookingWorkflow = createWorkflow({
  id: "booking-workflow",
  inputSchema: z.object({  }),
  outputSchema: z.object({ }),
  execute: async () => {} 
})

export { bookingWorkflow }