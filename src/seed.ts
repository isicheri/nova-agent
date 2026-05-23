import "dotenv/config"
import { db } from "./db"
import { serviceTable } from "./db/schema"
import { randomUUID } from "crypto"

const services = [
  {
    id: randomUUID(),
    name: "Swedish Massage",
    price: "90.00",
    duration: 60,
  },
  {
    id: randomUUID(),
    name: "Deep Tissue Massage",
    price: "110.00",
    duration: 60,
  },
  {
    id: randomUUID(),
    name: "Hot Stone Massage",
    price: "130.00",
    duration: 75,
  },
  {
    id: randomUUID(),
    name: "Classic Facial",
    price: "80.00",
    duration: 50,
  },
  {
    id: randomUUID(),
    name: "Anti-Aging Facial",
    price: "120.00",
    duration: 60,
  },
  {
    id: randomUUID(),
    name: "Luxury Manicure",
    price: "45.00",
    duration: 45,
  },
  {
    id: randomUUID(),
    name: "Luxury Pedicure",
    price: "55.00",
    duration: 60,
  },
  {
    id: randomUUID(),
    name: "Sauna & Steam Session",
    price: "30.00",
    duration: 30,
  },
]

async function seed() {
  console.log("Seeding services database...")
  try {
    // Optional: Clear existing services first if you want to avoid duplicates on multiple runs
    // await db.delete(serviceTable);

    await db.insert(serviceTable).values(services)
    console.log("Seeding completed successfully! Inserted 8 services.")
  } catch (error) {
    console.error("Error seeding database:", error)
  }
}

seed()
