import { pgTable, varchar, uuid, timestamp,pgEnum, integer, numeric } from "drizzle-orm/pg-core";

export const customerTable = pgTable('customers', {
    id: uuid().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 20 }).notNull().unique(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
})

export const bookingStatusEnum = pgEnum("status", ["pending", "confirmed", "rescheduled", "cancelled", "waitlisted"]);

export const serviceTable = pgTable('services', {
    id: uuid().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    price: numeric({ precision: 10, scale: 2 }).notNull(),
    duration: integer().notNull(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
})

export const therapistTable = pgTable('therapists', {
    id: uuid().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    specialties: varchar({ length: 255 }),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
})

export const conversationTable = pgTable('conversations', {
    id: uuid().primaryKey(),
    customerId: uuid().notNull().references(() => customerTable.id),
    role: varchar({ length: 20 }).notNull(),
    message: varchar({ length: 2000 }).notNull(),
    createdAt: timestamp().defaultNow(),
})

export const bookingTable = pgTable('bookings', {
    id: uuid().primaryKey(),
    customerId: uuid().notNull().references(() => customerTable.id),
    
    status: bookingStatusEnum().notNull(),
    timeSlot: varchar({ length: 100 }).notNull(),
    date: timestamp(),
    serviceId: uuid().notNull().references(() => serviceTable.id),
    therapistId: uuid().references(() => therapistTable.id),
    
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
})