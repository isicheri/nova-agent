import express, { type NextFunction, type Request, type Response } from "express";
import { MastraServer } from '@mastra/express'
import { mastra } from './mastra'
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { saveConversationState,loadConversationState,deleteConversationState } from "./lib/lib";
import dotenv from "dotenv";  


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({client:sql });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const server = new MastraServer({ app, mastra })
await server.init()

// Webhooks
app.post('/recieve-message', async (_req: Request, _res: Response) => {
  // Handle webhook
  if (_req.body === undefined) {
    return _res.status(400).send("Bad Request");
  }

  console.log(_req.body)

  let {} = _req.body

  
  
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 