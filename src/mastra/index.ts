
import { Mastra } from "@mastra/core/mastra"
import { PinoLogger } from "@mastra/loggers"
import { LibSQLStore } from "@mastra/libsql"
import { orchestratorAgent } from "./agents/orchestrator-agent"
import { bookingAgent } from "./agents/booking_agent"
import { chatAgent } from "./agents/chat-agent"

export const mastra = new Mastra({
  agents: { orchestratorAgent, bookingAgent, chatAgent },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
})
