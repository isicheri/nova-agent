import "dotenv/config"
import { db } from "./db"
import { customerTable, bookingTable, conversationTable } from "./db/schema"

async function clearUsers() {
  console.log("Clearing user data...")
  try {
    // We must delete in this order to respect foreign key constraints
    await db.delete(bookingTable)
    await db.delete(conversationTable)
    await db.delete(customerTable)
    console.log("Database successfully cleared of all users, bookings, and conversations!")
  } catch (error) {
    console.error("Error clearing database:", error)
  }
}

clearUsers()
