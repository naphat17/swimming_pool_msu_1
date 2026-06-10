import { relations } from "drizzle-orm/relations";
import { users, lockerReservations, lockers, memberships, membershipTypes, notifications, payments, poolResources, poolSchedules, reservations, userCategories } from "./schema";

export const lockerReservationsRelations = relations(lockerReservations, ({one}) => ({
	user: one(users, {
		fields: [lockerReservations.userId],
		references: [users.id]
	}),
	locker: one(lockers, {
		fields: [lockerReservations.lockerId],
		references: [lockers.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	lockerReservations: many(lockerReservations),
	memberships: many(memberships),
	notifications: many(notifications),
	payments: many(payments),
	reservations: many(reservations),
	userCategory: one(userCategories, {
		fields: [users.userCategoryId],
		references: [userCategories.id]
	}),
}));

export const lockersRelations = relations(lockers, ({many}) => ({
	lockerReservations: many(lockerReservations),
}));

export const membershipsRelations = relations(memberships, ({one}) => ({
	user: one(users, {
		fields: [memberships.userId],
		references: [users.id]
	}),
	membershipType: one(membershipTypes, {
		fields: [memberships.membershipTypeId],
		references: [membershipTypes.id]
	}),
}));

export const membershipTypesRelations = relations(membershipTypes, ({many}) => ({
	memberships: many(memberships),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user: one(users, {
		fields: [payments.userId],
		references: [users.id]
	}),
}));

export const poolSchedulesRelations = relations(poolSchedules, ({one}) => ({
	poolResource: one(poolResources, {
		fields: [poolSchedules.poolResourceId],
		references: [poolResources.id]
	}),
}));

export const poolResourcesRelations = relations(poolResources, ({many}) => ({
	poolSchedules: many(poolSchedules),
	reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({one}) => ({
	user: one(users, {
		fields: [reservations.userId],
		references: [users.id]
	}),
	poolResource: one(poolResources, {
		fields: [reservations.poolResourceId],
		references: [poolResources.id]
	}),
}));

export const userCategoriesRelations = relations(userCategories, ({many}) => ({
	users: many(users),
}));