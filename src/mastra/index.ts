
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
// import { DuckDBStore } from "@mastra/duckdb";
// import { MastraCompositeStore } from '@mastra/core/storage';
// import { PostgresStore } from '@mastra/pg'
// import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';

export const mastra = new Mastra({
  workflows: {  },
  agents: {  },
  // storage: new MastraCompositeStore({
    // id: 'composite-storage',
    storage: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    // domains: {
    //   observability: await new DuckDBStore().getStore('observability'),
    // }
  // }),

//  storage: new PostgresStore({
//     id: 'mastra-storage',
//     connectionString: process.env.DATABASE_URL,
//   }),

  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  // observability: new Observability({
  //   configs: {
  //     default: {
  //       serviceName: 'mastra',
  //       exporters: [
  //         new DefaultExporter(), // Persists traces to storage for Mastra Studio
  //         new CloudExporter(), // Sends observability data to hosted Mastra Studio (if MASTRA_CLOUD_ACCESS_TOKEN is set)
  //       ],
  //       spanOutputProcessors: [
  //         new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
  //       ],
  //     },
  //   },
  // }),
});
