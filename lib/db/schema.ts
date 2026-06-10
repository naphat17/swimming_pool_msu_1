import {
  mysqlTable,
  serial,
  varchar,
  text,
  decimal,
  timestamp,
  mysqlEnum,
  date,
  time,
  boolean,
  int,
  datetime,
} from "drizzle-orm/mysql-core"
import { relations } from "drizzle-orm"

// 1. User Categories Table
export const userCategories = mysqlTable("user_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  payPerSessionPrice: decimal("pay_per_session_price", { precision: 10, scale: 2 }).notNull(),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 2. Users Table
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  idCard: varchar("id_card", { length: 20 }),
  userCategoryId: int("user_category_id").references(() => userCategories.id),
  role: mysqlEnum("role", ["user", "admin"]).default("user"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 3. Membership Types Table
export const membershipTypes = mysqlTable("membership_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationDays: int("duration_days").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 4. Memberships Table
export const memberships = mysqlTable("memberships", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  membershipTypeId: int("membership_type_id").notNull().references(() => membershipTypes.id),
  expiresAt: datetime("expires_at").notNull(),
  status: mysqlEnum("status", ["active", "expired", "pending", "rejected"]).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 5. Pool Resources Table
export const poolResources = mysqlTable("pool_resources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  capacity: int("capacity").notNull(),
  status: mysqlEnum("status", ["available", "maintenance", "closed"]).default("available"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 6. Pool Schedules Table
export const poolSchedules = mysqlTable("pool_schedules", {
  id: serial("id").primaryKey(),
  poolResourceId: int("pool_resource_id").notNull().references(() => poolResources.id, { onDelete: "cascade" }),
  dayOfWeek: mysqlEnum("day_of_week", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).notNull(),
  openTime: time("open_time").notNull(),
  closeTime: time("close_time").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 7. Reservations Table
export const reservations = mysqlTable("reservations", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  poolResourceId: int("pool_resource_id").notNull().references(() => poolResources.id),
  reservationDate: date("reservation_date", { mode: "string" }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  checkedIn: boolean("checked_in").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 8. Payments Table
export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending"),
  paymentMethod: mysqlEnum("payment_method", ["credit_card", "bank_transfer", "cash", "qr_code", "system"]).default("system"),
  transactionId: varchar("transaction_id", { length: 100 }),
  slipUrl: varchar("slip_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 9. Notifications Table
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 10. System Settings Table
export const systemSettings = mysqlTable("system_settings", {
  settingKey: varchar("setting_key", { length: 100 }).primaryKey(),
  settingValue: text("setting_value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 11. Lockers Table
export const lockers = mysqlTable("lockers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  location: varchar("location", { length: 100 }),
  status: mysqlEnum("status", ["available", "maintenance", "unavailable"]).default("available"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// 12. Locker Reservations Table
export const lockerReservations = mysqlTable("locker_reservations", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lockerId: int("locker_id").notNull().references(() => lockers.id, { onDelete: "cascade" }),
  reservationDate: date("reservation_date", { mode: "string" }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending"),
  checkedIn: boolean("checked_in").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
})

// Relationships
export const userCategoriesRelations = relations(userCategories, ({ many }) => ({
  users: many(users),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  category: one(userCategories, {
    fields: [users.userCategoryId],
    references: [userCategories.id],
  }),
  memberships: many(memberships),
  reservations: many(reservations),
  payments: many(payments),
  notifications: many(notifications),
  lockerReservations: many(lockerReservations),
}))

export const membershipTypesRelations = relations(membershipTypes, ({ many }) => ({
  memberships: many(memberships),
}))

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  type: one(membershipTypes, {
    fields: [memberships.membershipTypeId],
    references: [membershipTypes.id],
  }),
}))

export const poolResourcesRelations = relations(poolResources, ({ many }) => ({
  schedules: many(poolSchedules),
  reservations: many(reservations),
}))

export const poolSchedulesRelations = relations(poolSchedules, ({ one }) => ({
  pool: one(poolResources, {
    fields: [poolSchedules.poolResourceId],
    references: [poolResources.id],
  }),
}))

export const reservationsRelations = relations(reservations, ({ one }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
  pool: one(poolResources, {
    fields: [reservations.poolResourceId],
    references: [poolResources.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

export const lockersRelations = relations(lockers, ({ many }) => ({
  reservations: many(lockerReservations),
}))

export const lockerReservationsRelations = relations(lockerReservations, ({ one }) => ({
  user: one(users, {
    fields: [lockerReservations.userId],
    references: [users.id],
  }),
  locker: one(lockers, {
    fields: [lockerReservations.lockerId],
    references: [lockers.id],
  }),
}))
