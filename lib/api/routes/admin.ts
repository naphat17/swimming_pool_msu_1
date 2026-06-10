import { Hono } from "hono"
import bcrypt from "bcryptjs"
import { eq, and, or, sql, desc, between, like } from "drizzle-orm"
import { db } from "../../db"
import {
  users,
  memberships,
  membershipTypes,
  userCategories,
  reservations,
  poolResources,
  poolSchedules,
  payments,
  systemSettings,
  lockers,
  lockerReservations,
} from "../../db/schema"
import { authenticateToken, requireAdmin } from "../middleware/auth"
import type { HonoEnv } from "../middleware/auth"

const adminRouter = new Hono<HonoEnv>()

adminRouter.use("*", authenticateToken, requireAdmin)

// Admin Dashboard
adminRouter.get("/dashboard", async (c) => {
  try {
    // 1. Get stats
    const statsResult = await db.select({
      total_members: sql<number>`(SELECT COUNT(*) FROM users WHERE role = 'user')`,
      active_members: sql<number>`(SELECT COUNT(*) FROM users WHERE role = 'user' AND status = 'active')`,
      today_reservations: sql<number>`(SELECT COUNT(*) FROM reservations WHERE reservation_date = CURDATE())`,
      monthly_revenue: sql<number>`(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND DATE(created_at) >= DATE_FORMAT(NOW(), '%Y-%m-01'))`,
    }).from(users).limit(1)

    const stats = statsResult[0] || {
      total_members: 0,
      active_members: 0,
      today_reservations: 0,
      monthly_revenue: 0,
    }

    // 2. Get recent reservations (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentReservations = await db
      .select({
        id: reservations.id,
        createdAt: reservations.createdAt,
        user_name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .where(sql`${reservations.createdAt} >= ${sevenDaysAgo}`)
      .orderBy(desc(reservations.createdAt))

    // 3. Get recent payments (last 7 days)
    const recentPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        createdAt: payments.createdAt,
        user_name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .where(and(eq(payments.status, "completed"), sql`${payments.createdAt} >= ${sevenDaysAgo}`))
      .orderBy(desc(payments.createdAt))

    // 4. Combine and sort
    const activities: any[] = []
    recentReservations.forEach((r) => {
      activities.push({
        id: r.id,
        type: "reservation",
        description: "New reservation created",
        created_at: r.createdAt,
        user_name: r.user_name,
      })
    })

    recentPayments.forEach((p) => {
      activities.push({
        id: p.id,
        type: "payment",
        description: `Payment of ฿${p.amount} received`,
        created_at: p.createdAt,
        user_name: p.user_name,
      })
    })

    // Sort by created_at desc, limit 15
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const recentActivities = activities.slice(0, 15)

    return c.json({
      stats,
      recent_activities: recentActivities,
    })
  } catch (err) {
    console.error("Dashboard error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Get all users
adminRouter.get("/users", async (c) => {
  try {
    const roleQuery = c.req.query("role")

    const query = db
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
        user_category_id: users.userCategoryId,
        role: users.role,
        status: users.status,
        created_at: users.createdAt,
        membership_type: membershipTypes.name,
        membership_expires: memberships.expiresAt,
        membership_status: memberships.status,
        user_category_name: userCategories.name,
      })
      .from(users)
      .leftJoin(memberships, and(eq(users.id, memberships.userId), eq(memberships.status, "active")))
      .leftJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))
      .leftJoin(userCategories, eq(users.userCategoryId, userCategories.id))

    const finalQuery = roleQuery 
      ? query.where(eq(users.role, roleQuery as any))
      : query

    const results = await finalQuery.orderBy(desc(users.createdAt))

    // Format users with membership info
    const formattedUsers = results.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      address: user.address,
      date_of_birth: user.date_of_birth,
      id_card: user.id_card,
      user_category_id: user.user_category_id,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      user_category_name: user.user_category_name,
      membership: user.membership_type
        ? {
            type: user.membership_type,
            expires_at: user.membership_expires,
            status: user.membership_status,
          }
        : null,
    }))

    return c.json({ users: formattedUsers })
  } catch (err) {
    console.error("Admin fetch users error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Create user
adminRouter.post("/users", async (c) => {
  try {
    const { username, email, password, first_name, last_name, phone, role } = await c.req.json()

    // Check if user exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))

    if (existing.length > 0) {
      return c.json({ message: "Username or email already exists" }, 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      firstName: first_name,
      lastName: last_name,
      phone,
      role: role || "user",
      status: "active",
    })

    return c.json(
      {
        message: "User created successfully",
        userId: result.insertId,
      },
      201
    )
  } catch (error) {
    console.error("Admin create user error:", error)
    return c.json({ message: "Server error" }, 500)
  }
})

// Update user
adminRouter.put("/users/:id", async (c) => {
  try {
    const userId = Number(c.req.param("id"))
    const {
      username,
      email,
      first_name,
      last_name,
      phone,
      address,
      date_of_birth,
      id_card,
      user_category_id,
      role,
      status,
    } = await c.req.json()

    const result = await db
      .update(users)
      .set({
        username,
        email,
        firstName: first_name,
        lastName: last_name,
        phone,
        address,
        dateOfBirth: date_of_birth || null,
        idCard: id_card || null,
        userCategoryId: user_category_id ? Number(user_category_id) : null,
        role: role as any,
        status: status as any,
      })
      .where(eq(users.id, userId))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "User not found" }, 404)
    }
    return c.json({ message: "User updated successfully" })
  } catch (err) {
    console.error("Admin update user error:", err)
    return c.json({ message: "Failed to update user" }, 500)
  }
})

// Delete user
adminRouter.delete("/users/:id", async (c) => {
  try {
    const userId = Number(c.req.param("id"))
    const result = await db.delete(users).where(eq(users.id, userId))
    if (result[0].affectedRows === 0) {
      return c.json({ message: "User not found" }, 404)
    }
    return c.json({ message: "User deleted successfully" })
  } catch (err) {
    console.error("Admin delete user error:", err)
    return c.json({ message: "Failed to delete user" }, 500)
  }
})

// Extend user membership
adminRouter.post("/users/:id/extend-membership", async (c) => {
  try {
    const userId = Number(c.req.param("id"))
    const { membership_type_id, duration_days } = await c.req.json()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + Number(duration_days))

    // Check if membership already exists, then upsert
    const existing = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.membershipTypeId, Number(membership_type_id))))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(memberships)
        .set({ expiresAt, status: "active" })
        .where(eq(memberships.id, existing[0].id))
    } else {
      await db.insert(memberships).values({
        userId,
        membershipTypeId: Number(membership_type_id),
        expiresAt,
        status: "active",
      })
    }

    return c.json({ message: "Membership extended successfully" })
  } catch (err) {
    console.error("Admin extend membership error:", err)
    return c.json({ message: "Failed to extend membership" }, 500)
  }
})

// Get all pool reservations
adminRouter.get("/reservations", async (c) => {
  try {
    const results = await db
      .select({
        id: reservations.id,
        reservation_date: reservations.reservationDate,
        start_time: reservations.startTime,
        end_time: reservations.endTime,
        status: reservations.status,
        notes: reservations.notes,
        created_at: reservations.createdAt,
        first_name: users.firstName,
        last_name: users.lastName,
        user_email: users.email,
        pool_name: poolResources.name,
        payment_id: payments.id,
        payment_amount: payments.amount,
        payment_status: payments.status,
        payment_method: payments.paymentMethod,
        slip_url: payments.slipUrl,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .innerJoin(poolResources, eq(reservations.poolResourceId, poolResources.id))
      .leftJoin(payments, and(eq(payments.userId, reservations.userId), like(payments.transactionId, sql`CONCAT('RSV', ${reservations.id}, '%')`)))
      .orderBy(desc(reservations.reservationDate), desc(reservations.startTime))

    const formatted = results.map((r) => ({
      id: r.id,
      reservation_date: r.reservation_date,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      notes: r.notes,
      created_at: r.created_at,
      user_name: `${r.first_name} ${r.last_name}`,
      user_email: r.user_email,
      pool_name: r.pool_name,
      payment_id: r.payment_id,
      payment_amount: r.payment_amount,
      payment_status: r.payment_status,
      payment_method: r.payment_method,
      slip_url: r.slip_url,
    }))

    return c.json({ reservations: formatted || [] })
  } catch (err) {
    console.error("Admin fetch reservations error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Create reservation (admin)
adminRouter.post("/reservations", async (c) => {
  try {
    const { user_id, pool_resource_id, reservation_date, start_time, end_time, notes, status } = await c.req.json()
    const [result] = await db.insert(reservations).values({
      userId: Number(user_id),
      poolResourceId: Number(pool_resource_id),
      reservationDate: reservation_date,
      startTime: start_time,
      endTime: end_time,
      status: status || "confirmed",
      notes: notes || null,
    })

    return c.json(
      {
        message: "Reservation created successfully",
        reservationId: result.insertId,
      },
      201
    )
  } catch (err) {
    console.error("Admin create reservation error:", err)
    return c.json({ message: "Failed to create reservation" }, 500)
  }
})

// Update reservation status
adminRouter.put("/reservations/:id", async (c) => {
  try {
    const reservationId = Number(c.req.param("id"))
    const { status } = await c.req.json()
    const result = await db
      .update(reservations)
      .set({ status: status as any })
      .where(eq(reservations.id, reservationId))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Reservation not found" }, 404)
    }
    return c.json({ message: "Reservation updated successfully" })
  } catch (err) {
    console.error("Admin update reservation status error:", err)
    return c.json({ message: "Failed to update reservation" }, 500)
  }
})

// Get all pools
adminRouter.get("/pools", async (c) => {
  try {
    const results = await db.select().from(poolResources).orderBy(poolResources.name)
    return c.json({ pools: results || [] })
  } catch (err) {
    console.error("Admin fetch pools error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Create pool
adminRouter.post("/pools", async (c) => {
  try {
    const { name, description, capacity, status } = await c.req.json()
    const [result] = await db.insert(poolResources).values({
      name,
      description,
      capacity: Number(capacity),
      status: status as any,
    })

    return c.json(
      {
        message: "Pool created successfully",
        poolId: result.insertId,
      },
      201
    )
  } catch (err) {
    console.error("Admin create pool error:", err)
    return c.json({ message: "Failed to create pool" }, 500)
  }
})

// Update pool
adminRouter.put("/pools/:id", async (c) => {
  try {
    const poolId = Number(c.req.param("id"))
    const { name, description, capacity, status } = await c.req.json()

    const result = await db
      .update(poolResources)
      .set({
        name,
        description,
        capacity: Number(capacity),
        status: status as any,
      })
      .where(eq(poolResources.id, poolId))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Pool not found" }, 404)
    }
    return c.json({ message: "Pool updated successfully" })
  } catch (err) {
    console.error("Admin update pool error:", err)
    return c.json({ message: "Failed to update pool" }, 500)
  }
})

// Get pool schedule
adminRouter.get("/pools/:id/schedule", async (c) => {
  try {
    const poolId = Number(c.req.param("id"))
    const schedules = await db
      .select()
      .from(poolSchedules)
      .where(eq(poolSchedules.poolResourceId, poolId))
      .orderBy(poolSchedules.dayOfWeek)

    return c.json({ schedules: schedules || [] })
  } catch (err) {
    console.error("Admin fetch pool schedule error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Update pool schedule
adminRouter.put("/pools/:id/schedule", async (c) => {
  try {
    const poolId = Number(c.req.param("id"))
    const { schedules } = await c.req.json()

    // Delete existing schedules
    await db.delete(poolSchedules).where(eq(poolSchedules.poolResourceId, poolId))

    // Insert new schedules
    for (const schedule of schedules) {
      await db.insert(poolSchedules).values({
        poolResourceId: poolId,
        dayOfWeek: schedule.day_of_week,
        openTime: schedule.open_time,
        closeTime: schedule.close_time,
        isActive: schedule.is_active,
      })
    }

    return c.json({ message: "Schedule updated successfully" })
  } catch (err) {
    console.error("Admin update pool schedule error:", err)
    return c.json({ message: "Failed to update schedule" }, 500)
  }
})

// Get system settings
adminRouter.get("/settings", async (c) => {
  try {
    const settings = await db.select().from(systemSettings)
    return c.json({ settings: settings || [] })
  } catch (err) {
    console.error("Admin fetch settings error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Update system settings
adminRouter.put("/settings", async (c) => {
  try {
    const { settings } = await c.req.json()
    for (const setting of settings) {
      // Upsert setting value
      const existing = await db
        .select({ key: systemSettings.settingKey })
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, setting.setting_key))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(systemSettings)
          .set({ settingValue: setting.setting_value })
          .where(eq(systemSettings.settingKey, setting.setting_key))
      } else {
        await db.insert(systemSettings).values({
          settingKey: setting.setting_key,
          settingValue: setting.setting_value,
        })
      }
    }
    return c.json({ message: "Settings updated successfully" })
  } catch (err) {
    console.error("Admin update settings error:", err)
    return c.json({ message: "Failed to update settings" }, 500)
  }
})

// Get membership types
adminRouter.get("/membership-types", async (c) => {
  try {
    const results = await db.select().from(membershipTypes).orderBy(membershipTypes.price)
    return c.json({ membership_types: results || [] })
  } catch (err) {
    console.error("Admin fetch membership types error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Create membership type
adminRouter.post("/membership-types", async (c) => {
  try {
    const { name, description, price, duration_days } = await c.req.json()
    const [result] = await db.insert(membershipTypes).values({
      name,
      description,
      price: String(price),
      durationDays: Number(duration_days),
    })

    return c.json(
      {
        message: "Membership type created successfully",
        membershipTypeId: result.insertId,
      },
      201
    )
  } catch (err) {
    console.error("Admin create membership type error:", err)
    return c.json({ message: "Failed to create membership type" }, 500)
  }
})

// Update membership type
adminRouter.put("/membership-types/:id", async (c) => {
  try {
    const typeId = Number(c.req.param("id"))
    const { name, description, price, duration_days } = await c.req.json()

    const result = await db
      .update(membershipTypes)
      .set({
        name,
        description,
        price: String(price),
        durationDays: Number(duration_days),
      })
      .where(eq(membershipTypes.id, typeId))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Membership type not found" }, 404)
    }
    return c.json({ message: "Membership type updated successfully" })
  } catch (err) {
    console.error("Admin update membership type error:", err)
    return c.json({ message: "Failed to update membership type" }, 500)
  }
})

// อนุมัติ membership (admin)
adminRouter.put("/memberships/:id/approve", async (c) => {
  try {
    const membershipId = Number(c.req.param("id"))
    const result = await db
      .update(memberships)
      .set({ status: "active" })
      .where(and(eq(memberships.id, membershipId), eq(memberships.status, "pending")))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Membership not found or not pending" }, 404)
    }
    return c.json({ message: "Membership approved successfully" })
  } catch (err) {
    console.error("Admin approve membership error:", err)
    return c.json({ message: "Failed to approve membership" }, 500)
  }
})

// ปฏิเสธ membership (admin)
adminRouter.put("/memberships/:id/reject", async (c) => {
  try {
    const membershipId = Number(c.req.param("id"))
    const result = await db
      .update(memberships)
      .set({ status: "rejected" })
      .where(and(eq(memberships.id, membershipId), eq(memberships.status, "pending")))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Membership not found or not pending" }, 404)
    }
    return c.json({ message: "Membership rejected successfully" })
  } catch (err) {
    console.error("Admin reject membership error:", err)
    return c.json({ message: "Failed to reject membership" }, 500)
  }
})

// ดูรายการ membership ที่ pending (admin)
adminRouter.get("/memberships/pending", async (c) => {
  try {
    const results = await db
      .select({
        id: memberships.id,
        user_id: memberships.userId,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        membership_type_id: memberships.membershipTypeId,
        membership_type: membershipTypes.name,
        expires_at: memberships.expiresAt,
        status: memberships.status,
        created_at: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))
      .where(eq(memberships.status, "pending"))
      .orderBy(desc(memberships.createdAt))

    return c.json({ memberships: results })
  } catch (err) {
    console.error("Admin fetch pending memberships error:", err)
    return c.json({ message: "Failed to fetch pending memberships" }, 500)
  }
})

// ดูรายการ membership ทั้งหมด (admin) พร้อม filter ตาม status
adminRouter.get("/memberships", async (c) => {
  try {
    const statusQuery = c.req.query("status")

    const query = db
      .select({
        id: memberships.id,
        user_id: memberships.userId,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        membership_type_id: memberships.membershipTypeId,
        membership_type: membershipTypes.name,
        expires_at: memberships.expiresAt,
        status: memberships.status,
        created_at: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))

    const finalQuery = statusQuery 
      ? query.where(eq(memberships.status, statusQuery as any))
      : query

    const results = await finalQuery.orderBy(desc(memberships.createdAt))
    return c.json({ memberships: results })
  } catch (err) {
    console.error("Admin fetch memberships error:", err)
    return c.json({ message: "Failed to fetch memberships" }, 500)
  }
})

// ดูรายละเอียด membership รายบุคคล (admin)
adminRouter.get("/memberships/:id", async (c) => {
  try {
    const membershipId = Number(c.req.param("id"))
    const results = await db
      .select({
        id: memberships.id,
        user_id: memberships.userId,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        membership_type_id: memberships.membershipTypeId,
        membership_type: membershipTypes.name,
        expires_at: memberships.expiresAt,
        status: memberships.status,
        created_at: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))
      .where(eq(memberships.id, membershipId))
      .limit(1)

    if (results.length === 0) {
      return c.json({ message: "Membership not found" }, 404)
    }
    return c.json({ membership: results[0] })
  } catch (err) {
    console.error("Admin fetch membership detail error:", err)
    return c.json({ message: "Failed to fetch membership detail" }, 500)
  }
})

// แก้ไขข้อมูล membership รายบุคคล (admin)
adminRouter.put("/memberships/:id", async (c) => {
  try {
    const membershipId = Number(c.req.param("id"))
    const { expires_at, status, membership_type_id } = await c.req.json()

    const updateFields: any = {}
    if (expires_at) updateFields.expiresAt = new Date(expires_at)
    if (status) updateFields.status = status as any
    if (membership_type_id) updateFields.membershipTypeId = Number(membership_type_id)

    if (Object.keys(updateFields).length === 0) {
      return c.json({ message: "No fields to update" }, 400)
    }

    const result = await db
      .update(memberships)
      .set(updateFields)
      .where(eq(memberships.id, membershipId))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Membership not found" }, 404)
    }
    return c.json({ message: "Membership updated successfully" })
  } catch (err) {
    console.error("Admin update membership error:", err)
    return c.json({ message: "Failed to update membership" }, 500)
  }
})

// ลบ membership รายบุคคล (admin)
adminRouter.delete("/memberships/:id", async (c) => {
  try {
    const membershipId = Number(c.req.param("id"))
    const result = await db.delete(memberships).where(eq(memberships.id, membershipId))
    if (result[0].affectedRows === 0) {
      return c.json({ message: "Membership not found" }, 404)
    }
    return c.json({ message: "Membership deleted successfully" })
  } catch (err) {
    console.error("Admin delete membership error:", err)
    return c.json({ message: "Failed to delete membership" }, 500)
  }
})

// ดูรายการจองตู้เก็บของทั้งหมด (admin)
adminRouter.get("/locker-reservations", async (c) => {
  try {
    const results = await db
      .select({
        id: lockerReservations.id,
        user_id: lockerReservations.userId,
        locker_id: lockerReservations.lockerId,
        reservation_date: lockerReservations.reservationDate,
        start_time: lockerReservations.startTime,
        end_time: lockerReservations.endTime,
        status: lockerReservations.status,
        checked_in: lockerReservations.checkedIn,
        notes: lockerReservations.notes,
        created_at: lockerReservations.createdAt,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        user_email: users.email,
        locker_code: lockers.code,
        location: lockers.location,
        payment_id: payments.id,
        payment_amount: payments.amount,
        payment_status: payments.status,
        payment_method: payments.paymentMethod,
        slip_url: payments.slipUrl,
      })
      .from(lockerReservations)
      .innerJoin(users, eq(lockerReservations.userId, users.id))
      .innerJoin(lockers, eq(lockerReservations.lockerId, lockers.id))
      .leftJoin(payments, and(eq(payments.userId, lockerReservations.userId), like(payments.transactionId, sql`CONCAT('LKR', ${lockerReservations.id}, '%')`)))
      .orderBy(desc(lockerReservations.reservationDate), desc(lockerReservations.startTime))

    return c.json({ reservations: results || [] })
  } catch (err) {
    console.error("Admin fetch locker reservations error:", err)
    return c.json({ message: "Failed to fetch locker reservations" }, 500)
  }
})

// อนุมัติ/ยกเลิก locker reservation
adminRouter.put("/locker-reservations/:id/confirm", async (c) => {
  try {
    const reservationId = Number(c.req.param("id"))
    const { status } = await c.req.json() // 'confirmed' หรือ 'cancelled'

    if (!["confirmed", "cancelled"].includes(status)) {
      return c.json({ message: "Invalid status" }, 400)
    }

    const result = await db
      .update(lockerReservations)
      .set({ status: status as any })
      .where(and(eq(lockerReservations.id, reservationId), eq(lockerReservations.status, "pending")))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Reservation not found or not pending" }, 404)
    }
    return c.json({ message: `Reservation ${status} successfully` })
  } catch (err) {
    console.error("Admin update locker reservation error:", err)
    return c.json({ message: "Failed to update reservation status" }, 500)
  }
})

// ลบ locker reservation (admin)
adminRouter.delete("/locker-reservations/:id", async (c) => {
  try {
    const reservationId = Number(c.req.param("id"))
    const result = await db.delete(lockerReservations).where(eq(lockerReservations.id, reservationId))
    if (result[0].affectedRows === 0) {
      return c.json({ message: "Reservation not found" }, 404)
    }
    return c.json({ message: "Reservation deleted successfully" })
  } catch (err) {
    console.error("Admin delete locker reservation error:", err)
    return c.json({ message: "Failed to delete reservation" }, 500)
  }
})

// GET notifications (admin)
adminRouter.get("/notifications", async (c) => {
  try {
    const isReadQuery = c.req.query("is_read")
    const baseQuery = db
      .select({
        id: notifications.id,
        user_id: notifications.userId,
        title: notifications.title,
        message: notifications.message,
        is_read: sql<0 | 1>`CASE WHEN ${notifications.isRead} = 1 THEN 1 ELSE 0 END`,
        created_at: notifications.createdAt,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.userId, users.id))

    const conditions = []
    if (isReadQuery && isReadQuery !== "all") {
      conditions.push(eq(notifications.isRead, isReadQuery === "true"))
    }

    const finalQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery

    const results = await finalQuery.orderBy(desc(notifications.createdAt))
    return c.json({ notifications: results })
  } catch (err) {
    console.error("Admin fetch notifications error:", err)
    return c.json({ message: "Failed to fetch notifications" }, 500)
  }
})

// POST notification (admin)
adminRouter.post("/notifications", async (c) => {
  try {
    const { user_id, title, message } = await c.req.json()
    if (!title || !message) {
      return c.json({ message: "Title and message are required" }, 400)
    }

    if (user_id === "all") {
      // Send to all active users
      const activeUsers = await db.select({ id: users.id }).from(users).where(eq(users.status, "active"))
      for (const u of activeUsers) {
        await db.insert(notifications).values({
          userId: u.id,
          title,
          message,
          isRead: false,
        })
      }
    } else {
      await db.insert(notifications).values({
        userId: Number(user_id),
        title,
        message,
        isRead: false,
      })
    }

    return c.json({ message: "Notification sent successfully" }, 201)
  } catch (err) {
    console.error("Admin create notification error:", err)
    return c.json({ message: "Failed to create notification" }, 500)
  }
})

// PUT update notification read status (admin)
adminRouter.put("/notifications/:id/read", async (c) => {
  try {
    const id = Number(c.req.param("id"))
    const { is_read } = await c.req.json()

    const result = await db
      .update(notifications)
      .set({ isRead: is_read })
      .where(eq(notifications.id, id))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Notification not found" }, 404)
    }
    return c.json({ message: "Notification status updated" })
  } catch (err) {
    console.error("Admin update notification read status error:", err)
    return c.json({ message: "Failed to update notification" }, 500)
  }
})

// DELETE notification (admin)
adminRouter.delete("/notifications/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"))
    const result = await db.delete(notifications).where(eq(notifications.id, id))
    if (result[0].affectedRows === 0) {
      return c.json({ message: "Notification not found" }, 404)
    }
    return c.json({ message: "Notification deleted successfully" })
  } catch (err) {
    console.error("Admin delete notification error:", err)
    return c.json({ message: "Failed to delete notification" }, 500)
  }
})

// GET payments (admin)
adminRouter.get("/payments", async (c) => {

  try {
    const status = c.req.query("status")
    const dateFilter = c.req.query("dateFilter")

    let baseQuery = db
      .select({
        id: payments.id,
        user_id: payments.userId,
        user_name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        user_email: users.email,
        amount: payments.amount,
        status: payments.status,
        payment_method: payments.paymentMethod,
        transaction_id: payments.transactionId,
        created_at: payments.createdAt,
        slip_url: payments.slipUrl,
        membership_type: membershipTypes.name,
        payment_type: sql<string>`
          CASE 
            WHEN ${payments.transactionId} LIKE 'RSV%' THEN 'การจองสระว่ายน้ำ'
            WHEN ${payments.transactionId} LIKE 'LKR%' THEN 'การจองตู้เก็บของ'
            WHEN ${membershipTypes.name} IS NOT NULL THEN CONCAT('สมาชิกภาพ - ', ${membershipTypes.name})
            ELSE 'อื่นๆ'
          END
        `,
      })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .leftJoin(memberships, and(eq(payments.userId, memberships.userId), between(payments.createdAt, memberships.createdAt, memberships.expiresAt)))
      .leftJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))

    const conditions = []

    if (status && status !== "all") {
      conditions.push(eq(payments.status, status as any))
    }

    if (dateFilter && dateFilter !== "all") {
      switch (dateFilter) {
        case "day":
          conditions.push(sql`DATE(${payments.createdAt}) = CURDATE()`)
          break;
        case "week":
          conditions.push(sql`YEARWEEK(DATE(${payments.createdAt}), 1) = YEARWEEK(CURDATE(), 1)`)
          break;
        case "month":
          conditions.push(sql`YEAR(${payments.createdAt}) = YEAR(CURDATE()) AND MONTH(${payments.createdAt}) = MONTH(CURDATE())`)
          break;
        case "year":
          conditions.push(sql`YEAR(${payments.createdAt}) = YEAR(CURDATE())`)
          break;
      }
    }

    const finalQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery

    const results = await finalQuery.orderBy(desc(payments.createdAt))
    return c.json({ payments: results || [] })
  } catch (err) {
    console.error("Error fetching admin payments:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

export { adminRouter }


