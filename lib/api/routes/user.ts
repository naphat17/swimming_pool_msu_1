import { Hono } from "hono"
import bcrypt from "bcryptjs"
import { eq, and, desc, gte, sql } from "drizzle-orm"
import { db } from "../../db"
import { users, userCategories, memberships, membershipTypes, reservations, poolResources, notifications } from "../../db/schema"
import { authenticateToken } from "../middleware/auth"
import type { HonoEnv } from "../middleware/auth"

const userRouter = new Hono<HonoEnv>()

userRouter.use("*", authenticateToken)

// Get user profile
userRouter.get("/profile", async (c) => {
  try {
    const userPayload = c.get("user")
    const matchedUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        first_name: users.firstName,
        last_name: users.lastName,
        phone: users.phone,
        address: users.address,
        date_of_birth: users.dateOfBirth,
        id_card: users.idCard,
        role: users.role,
        status: users.status,
        created_at: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userPayload.id))
      .limit(1)

    if (matchedUsers.length === 0) {
      return c.json({ message: "User not found" }, 404)
    }

    return c.json({ user: matchedUsers[0] })
  } catch (error) {
    console.error("Profile error:", error)
    return c.json({ message: "Database error" }, 500)
  }
})

// Update user profile
userRouter.put("/profile", async (c) => {
  try {
    const userPayload = c.get("user")
    const { first_name, last_name, phone, address } = await c.req.json()

    await db
      .update(users)
      .set({
        firstName: first_name,
        lastName: last_name,
        phone: phone,
        address: address,
      })
      .where(eq(users.id, userPayload.id))

    return c.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Update profile error:", error)
    return c.json({ message: "Failed to update profile" }, 500)
  }
})

// Change password
userRouter.put("/change-password", async (c) => {
  try {
    const userPayload = c.get("user")
    const { current_password, new_password } = await c.req.json()

    // Get current password
    const matchedUsers = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userPayload.id))
      .limit(1)

    if (matchedUsers.length === 0) {
      return c.json({ message: "User not found" }, 404)
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, matchedUsers[0].password)
    if (!isValidPassword) {
      return c.json({ message: "Current password is incorrect" }, 400)
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10)

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userPayload.id))

    return c.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    return c.json({ message: "Server error" }, 500)
  }
})

// Get user dashboard data
userRouter.get("/dashboard", async (c) => {
  try {
    const userPayload = c.get("user")
    const userId = userPayload.id

    // Get user's current category details
    const categoryDetails = await db
      .select({
        id: userCategories.id,
        name: userCategories.name,
        description: userCategories.description,
        pay_per_session_price: userCategories.payPerSessionPrice,
        annual_price: userCategories.annualPrice,
      })
      .from(users)
      .innerJoin(userCategories, eq(users.userCategoryId, userCategories.id))
      .where(eq(users.id, userId))
      .limit(1)

    const userCategoryDetails = categoryDetails[0] || null

    // Get membership info (only active ones)
    const activeMemberships = await db
      .select({
        type: membershipTypes.name,
        expires_at: memberships.expiresAt,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
      .orderBy(desc(memberships.expiresAt))
      .limit(1)

    let membershipData = activeMemberships[0] || null

    // If there's an active membership, augment it with user category details
    if (membershipData && userCategoryDetails) {
      membershipData = {
        ...membershipData,
        user_category: userCategoryDetails.name,
        pay_per_session_price: userCategoryDetails.pay_per_session_price,
        annual_price: userCategoryDetails.annual_price,
      } as any
    } else if (!membershipData && userCategoryDetails) {
      membershipData = {
        type: "No Active Membership",
        expires_at: null,
        status: "inactive",
        user_category: userCategoryDetails.name,
        pay_per_session_price: userCategoryDetails.pay_per_session_price,
        annual_price: userCategoryDetails.annual_price,
      } as any
    }

    // Get upcoming reservations
    const todayStr = new Date().toISOString().split("T")[0]
    const upcomingReservations = await db
      .select({
        id: reservations.id,
        reservation_date: reservations.reservationDate,
        start_time: reservations.startTime,
        end_time: reservations.endTime,
        status: reservations.status,
        notes: reservations.notes,
        pool_name: poolResources.name,
      })
      .from(reservations)
      .innerJoin(poolResources, eq(reservations.poolResourceId, poolResources.id))
      .where(and(eq(reservations.userId, userId), gte(reservations.reservationDate, todayStr)))
      .orderBy(desc(reservations.reservationDate), desc(reservations.startTime))
      .limit(5)

    // Get notifications
    const recentNotifications = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        created_at: notifications.createdAt,
        is_read: notifications.isRead,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(10)

    // Get usage stats
    const statsResult = await db
      .select({
        total_reservations: sql<number>`count(*)`,
        this_month_reservations: sql<number>`count(case when ${reservations.reservationDate} >= DATE_FORMAT(NOW(), '%Y-%m-01') then 1 end)`,
      })
      .from(reservations)
      .where(eq(reservations.userId, userId))

    const stats = statsResult[0] || { total_reservations: 0, this_month_reservations: 0 }

    return c.json({
      membership: membershipData,
      upcoming_reservations: upcomingReservations || [],
      notifications: recentNotifications || [],
      usage_stats: stats,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return c.json({ message: "Database error" }, 500)
  }
})

export { userRouter }
