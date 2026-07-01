import "dotenv/config"
import { db } from "./db"
import { serviceTable, therapistTable } from "./db/schema"
import { randomUUID } from "crypto"

const services = [
  { id: randomUUID(), name: "Swedish Massage", price: "90.00", duration: 60 },
  { id: randomUUID(), name: "Deep Tissue Massage", price: "110.00", duration: 60 },
  { id: randomUUID(), name: "Hot Stone Massage", price: "130.00", duration: 75 },
  { id: randomUUID(), name: "Aromatherapy Massage", price: "115.00", duration: 60 },
  { id: randomUUID(), name: "Classic Facial", price: "80.00", duration: 50 },
  { id: randomUUID(), name: "Anti-Aging Facial", price: "120.00", duration: 60 },
  { id: randomUUID(), name: "Hydrating Facial", price: "95.00", duration: 50 },
  { id: randomUUID(), name: "Luxury Manicure", price: "45.00", duration: 45 },
  { id: randomUUID(), name: "Luxury Pedicure", price: "55.00", duration: 60 },
  { id: randomUUID(), name: "Sauna & Steam Session", price: "30.00", duration: 30 },
  { id: randomUUID(), name: "Couples Massage", price: "200.00", duration: 60 },
]

const therapists = [
  { id: randomUUID(), name: "Sarah Jenkins", specialties: "Swedish, Hot Stone" },
  { id: randomUUID(), name: "Michael Chen", specialties: "Deep Tissue, Sports" },
  { id: randomUUID(), name: "Elena Rodriguez", specialties: "Facials, Aromatherapy" },
  { id: randomUUID(), name: "David Kim", specialties: "Couples, Deep Tissue" },
]

async function seed() {
  console.log("Seeding database...")
  try {
    await db.insert(serviceTable).values(services).onConflictDoNothing()
    await db.insert(therapistTable).values(therapists).onConflictDoNothing()
    console.log(`Seeding completed! Inserted ${services.length} services and ${therapists.length} therapists.`)
  } catch (error) {
    console.error("Error seeding database:", error)
  }
}
seed()