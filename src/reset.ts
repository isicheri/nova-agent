import "dotenv/config"
import { redisClient } from "./lib/lib"
import { db } from "./db"
import { customerTable, bookingTable, conversationTable } from "./db/schema"
import { eq } from "drizzle-orm"

async function reset() {
  const phone = "2347074026283"
  console.log(`Resetting state and database records for ${phone}...`)

  try {
    // 1. Delete from Redis
    const redisKey = `${phone}_thread_id`
    await redisClient.del(redisKey)
    console.log(`Deleted Redis key: ${redisKey}`)

    // 2. Find customer in PostgreSQL
    const customers = await db.select().from(customerTable).where(eq(customerTable.phone, phone))
    
    if (customers.length > 0) {
      const customerId = customers[0].id
      
      // Delete referencing bookings
      await db.delete(bookingTable).where(eq(bookingTable.customerId, customerId))
      // Delete referencing conversations
      await db.delete(conversationTable).where(eq(conversationTable.customerId, customerId))
      // Delete customer
      await db.delete(customerTable).where(eq(customerTable.id, customerId))
      
      console.log(`Deleted customer ${phone} and all associated records from DB.`)
    } else {
      console.log(`No customer found with phone ${phone} in DB.`)
    }
  } catch (error) {
    console.error("Error during reset:", error)
  }
}

reset()
