"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingTable = exports.conversationTable = exports.serviceTable = exports.bookingStatusEnum = exports.customerTable = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.customerTable = (0, pg_core_1.pgTable)('customers', {
    id: (0, pg_core_1.uuid)().primaryKey(),
    name: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)({ length: 20 }).notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.bookingStatusEnum = (0, pg_core_1.pgEnum)("status", ["pending", "confirmed", "rescheduled", "cancelled"]);
exports.serviceTable = (0, pg_core_1.pgTable)('services', {
    id: (0, pg_core_1.uuid)().primaryKey(),
    name: (0, pg_core_1.varchar)({ length: 255 }).notNull(),
    price: (0, pg_core_1.numeric)({ precision: 10, scale: 2 }).notNull(),
    duration: (0, pg_core_1.integer)().notNull(),
    createdAt: (0, pg_core_1.timestamp)().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.conversationTable = (0, pg_core_1.pgTable)('conversations', {
    id: (0, pg_core_1.uuid)().primaryKey(),
    customerId: (0, pg_core_1.uuid)().notNull().references(function () { return exports.customerTable.id; }),
    role: (0, pg_core_1.varchar)({ length: 20 }).notNull(),
    message: (0, pg_core_1.varchar)({ length: 2000 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.bookingTable = (0, pg_core_1.pgTable)('bookings', {
    id: (0, pg_core_1.uuid)().primaryKey(),
    customerId: (0, pg_core_1.uuid)().notNull().references(function () { return exports.customerTable.id; }),
    status: (0, exports.bookingStatusEnum)().notNull(),
    timeSlot: (0, pg_core_1.varchar)({ length: 100 }).notNull(),
    date: (0, pg_core_1.timestamp)(),
    serviceId: (0, pg_core_1.uuid)().notNull().references(function () { return exports.serviceTable.id; }),
    createdAt: (0, pg_core_1.timestamp)().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)().defaultNow(),
});
