import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, foreignKey, int, date, time, mysqlEnum, text, timestamp, varchar, decimal, datetime, tinyint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const lockerReservations = mysqlTable("locker_reservations", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id),
	lockerId: int("locker_id").notNull().references(() => lockers.id),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reservationDate: date("reservation_date", { mode: 'string' }).notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	status: mysqlEnum(['pending','confirmed','cancelled','completed']).default('pending'),
	checkedIn: tinyint("checked_in").default(0),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_locker_reservation_date").on(table.lockerId, table.reservationDate),
]);

export const lockers = mysqlTable("lockers", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 20 }).notNull(),
	location: varchar({ length: 100 }),
	status: mysqlEnum(['available','maintenance','unavailable']).default('available'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("code").on(table.code),
]);

export const membershipTypes = mysqlTable("membership_types", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	price: decimal({ precision: 10, scale: 2 }).notNull(),
	durationDays: int("duration_days").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const memberships = mysqlTable("memberships", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id),
	membershipTypeId: int("membership_type_id").notNull().references(() => membershipTypes.id),
	expiresAt: datetime("expires_at", { mode: 'string'}).notNull(),
	status: mysqlEnum(['active','expired','pending']).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_memberships_user").on(table.userId, table.status),
]);

export const notifications = mysqlTable("notifications", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id),
	title: varchar({ length: 200 }).notNull(),
	message: text().notNull(),
	isRead: tinyint("is_read").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_user_notifications").on(table.userId, table.isRead),
]);

export const payments = mysqlTable("payments", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id),
	amount: decimal({ precision: 10, scale: 2 }).notNull(),
	status: mysqlEnum(['pending','completed','failed','refunded']).default('pending'),
	paymentMethod: mysqlEnum("payment_method", ['credit_card','bank_transfer','cash','qr_code','system']).default('system'),
	transactionId: varchar("transaction_id", { length: 100 }),
	slipUrl: varchar("slip_url", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_user_payments").on(table.userId),
	index("idx_transaction_id").on(table.transactionId),
]);

export const poolResources = mysqlTable("pool_resources", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	capacity: int().notNull(),
	status: mysqlEnum(['available','maintenance','closed']).default('available'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const poolSchedules = mysqlTable("pool_schedules", {
	id: int().autoincrement().notNull(),
	poolResourceId: int("pool_resource_id").notNull().references(() => poolResources.id),
	dayOfWeek: mysqlEnum("day_of_week", ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']).notNull(),
	openTime: time("open_time").notNull(),
	closeTime: time("close_time").notNull(),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const reservations = mysqlTable("reservations", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id),
	poolResourceId: int("pool_resource_id").notNull().references(() => poolResources.id),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	reservationDate: date("reservation_date", { mode: 'string' }).notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	status: mysqlEnum(['pending','confirmed','cancelled','completed']).default('pending'),
	checkedIn: tinyint("checked_in").default(0),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_reservation_date").on(table.reservationDate),
	index("idx_user_reservations").on(table.userId, table.reservationDate),
	index("idx_reservations_pool_date").on(table.poolResourceId, table.reservationDate),
]);

export const systemSettings = mysqlTable("system_settings", {
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: text("setting_value"),
	description: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const userCategories = mysqlTable("user_categories", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	payPerSessionPrice: decimal("pay_per_session_price", { precision: 10, scale: 2 }).notNull(),
	annualPrice: decimal("annual_price", { precision: 10, scale: 2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	username: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 100 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 50 }).notNull(),
	lastName: varchar("last_name", { length: 50 }).notNull(),
	phone: varchar({ length: 20 }),
	address: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateOfBirth: date("date_of_birth", { mode: 'string' }),
	idCard: varchar("id_card", { length: 20 }),
	userCategoryId: int("user_category_id").references(() => userCategories.id),
	role: mysqlEnum(['user','admin']).default('user'),
	status: mysqlEnum(['active','inactive']).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("username").on(table.username),
	index("email").on(table.email),
	index("idx_users_email").on(table.email),
	index("idx_users_username").on(table.username),
]);
