import { Hono } from "hono"
import { eq, and, or, sql, desc, like } from "drizzle-orm"
import { db } from "../../db"
import { reservations, poolResources, payments, lockers, lockerReservations, systemSettings } from "../../db/schema"
import { authenticateToken } from "../middleware/auth"
import type { HonoEnv } from "../middleware/auth"

const reservationRouter = new Hono<HonoEnv>()

reservationRouter.use("*", authenticateToken)

// Get daily pool usage
reservationRouter.get("/daily-usage", async (c) => {
  try {
    const date = c.req.query("date")
    const pool_id = c.req.query("pool_id")

    if (!date || !pool_id) {
      return c.json({ message: "Date and pool_id are required" }, 400)
    }

    const maxCapacity = 150

    const results = await db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.poolResourceId, Number(pool_id)),
          eq(reservations.reservationDate, date),
          or(eq(reservations.status, "confirmed"), eq(reservations.status, "pending"))
        )
      )

    const currentCount = results[0]?.count || 0
    const remaining = Math.max(0, maxCapacity - currentCount)
    const isFull = remaining <= 0

    return c.json({
      date,
      pool_id: Number(pool_id),
      current_count: currentCount,
      max_capacity: maxCapacity,
      remaining,
      is_full: isFull,
    })
  } catch (err) {
    console.error("Daily usage error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Get user reservations
reservationRouter.get("/user", async (c) => {
  try {
    const userPayload = c.get("user")
    const results = await db
      .select({
        id: reservations.id,
        reservation_date: reservations.reservationDate,
        status: reservations.status,
        notes: reservations.notes,
        created_at: reservations.createdAt,
        pool_name: poolResources.name,
      })
      .from(reservations)
      .innerJoin(poolResources, eq(reservations.poolResourceId, poolResources.id))
      .where(eq(reservations.userId, userPayload.id))
      .orderBy(desc(reservations.reservationDate), desc(reservations.id))

    return c.json({ reservations: results || [] })
  } catch (err) {
    console.error("User reservations fetch error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Get available time slots
reservationRouter.get("/available", async (c) => {
  try {
    const date = c.req.query("date")
    const pool_id = c.req.query("pool_id")

    if (!date || !pool_id) {
      return c.json({ message: "Date and pool_id are required" }, 400)
    }

    // Check if pool_id is child pool (id: 2)
    if (Number(pool_id) === 2) {
      return c.json({ message: "สระเด็กไม่เปิดให้จองรายบุคคล" }, 403)
    }

    // Get pool capacity
    const pools = await db
      .select({ capacity: poolResources.capacity })
      .from(poolResources)
      .where(eq(poolResources.id, Number(pool_id)))
      .limit(1)

    const pool = pools[0]
    if (!pool) return c.json({ message: "Pool not found" }, 404)

    // Generate time slots (6:00 AM to 10:00 PM, 2-hour slots)
    const timeSlots = []
    for (let hour = 6; hour < 22; hour += 2) {
      const startTime = `${hour.toString().padStart(2, "0")}:00:00`
      const endTime = `${(hour + 2).toString().padStart(2, "0")}:00:00`
      timeSlots.push({
        start_time: startTime,
        end_time: endTime,
        capacity: pool.capacity,
        current_usage: 0,
        available: true,
      })
    }

    // Check existing reservations for this pool and date
    const existingReservations = await db
      .select({
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        notes: reservations.notes,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.poolResourceId, Number(pool_id)),
          eq(reservations.reservationDate, date),
          or(eq(reservations.status, "confirmed"), eq(reservations.status, "pending"))
        )
      )

    // Check if there is a 'เหมาสระ' (Charter) reservation
    const isChartered = existingReservations.some((r) => r.notes && r.notes.includes("เหมาสระ"))

    if (isChartered) {
      timeSlots.forEach((slot) => {
        slot.available = false
        slot.current_usage = pool.capacity
      })
    } else {
      // Count usage for each slot
      existingReservations.forEach((reservation) => {
        timeSlots.forEach((slot) => {
          if (slot.start_time === reservation.startTime) {
            slot.current_usage++
            if (slot.current_usage >= slot.capacity) {
              slot.available = false
            }
          }
        })
      })
    }

    return c.json({
      available_slots: timeSlots,
      capacity: pool.capacity,
      isChartered,
    })
  } catch (err) {
    console.error("Available slots error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Create reservation
reservationRouter.post("/", async (c) => {
  try {
    const { pool_resource_id, reservation_date, notes, payment_method, amount, start_time, end_time, is_charter } =
      await c.req.json()
    const userPayload = c.get("user")
    const userId = userPayload.id

    // Check for Maintenance Mode
    const maintenance = await db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "maintenance_mode"))
      .limit(1)

    if (maintenance.length > 0 && maintenance[0].value === "true") {
      return c.json({ message: "ระบบปิดปรับปรุงชั่วคราว ไม่สามารถทำการจองได้ในขณะนี้" }, 503)
    }

    if (!pool_resource_id || !reservation_date) {
      return c.json({ message: "Missing required fields" }, 400)
    }

    // Condition: No child pool
    if (Number(pool_resource_id) === 2) {
      return c.json({ message: "ไม่สามารถจองสระเด็กได้" }, 403)
    }

    // Booking rules calculation in JS
    const selectedDate = new Date(reservation_date)
    selectedDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (is_charter) {
      if (diffDays < 7 || diffDays > 14) {
        return c.json({ message: "การจองเหมาสระต้องจองล่วงหน้า 7-14 วัน" }, 400)
      }

      // Cannot charter if there are any existing individual bookings
      const existing = await db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.poolResourceId, Number(pool_resource_id)),
            eq(reservations.reservationDate, reservation_date),
            or(eq(reservations.status, "confirmed"), eq(reservations.status, "pending"))
          )
        )
        .limit(1)

      if (existing.length > 0) {
        return c.json({ message: "ไม่สามารถเหมาสระได้เนื่องจากมีผู้ใช้งานจองรายบุคคลไว้แล้ว" }, 400)
      }
    } else {
      // Daily booking is only allowed before the charter window starts
      if (diffDays >= 7) {
        return c.json(
          {
            message:
              "การจองรายบุคคลสามารถจองล่วงหน้าได้ไม่เกิน 6 วัน โดยช่วง 7-14 วันสงวนไว้สำหรับการเหมาสระ",
          },
          400
        )
      }

      // Check if there's a charter booking on that day
      const charterBooking = await db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.poolResourceId, Number(pool_resource_id)),
            eq(reservations.reservationDate, reservation_date),
            or(eq(reservations.status, "confirmed"), eq(reservations.status, "pending")),
            like(reservations.notes, "%เหมาสระ%")
          )
        )
        .limit(1)

      if (charterBooking.length > 0) {
        return c.json({ message: "สระถูกเหมาไปแล้วในวันที่เลือก" }, 400)
      }
    }

    let reservationStatus: "pending" | "confirmed" = "pending"
    let paymentStatus: "pending" | "completed" = "pending"

    if (payment_method === "system") {
      reservationStatus = "confirmed"
      paymentStatus = "completed"
    }

    // Create reservation
    const [reservationResult] = await db.insert(reservations).values({
      userId: userId,
      poolResourceId: Number(pool_resource_id),
      reservationDate: reservation_date,
      status: reservationStatus,
      notes: notes || "",
      startTime: start_time || "00:00:00",
      endTime: end_time || "23:59:59",
    })

    const reservationId = reservationResult.insertId

    // If charter and confirmed, lock all lockers
    if (is_charter && reservationStatus === "confirmed") {
      const allLockers = await db
        .select({ id: lockers.id })
        .from(lockers)
        .where(eq(lockers.status, "available"))

      for (const locker of allLockers) {
        await db.insert(lockerReservations).values({
          userId: userId,
          lockerId: locker.id,
          reservationDate: reservation_date,
          startTime: "00:00:00",
          endTime: "23:59:59",
          status: "confirmed",
          notes: "จองโดยระบบ (เหมาสระ)",
        })
      }
    }

    // Create payment entry
    const [paymentResult] = await db.insert(payments).values({
      userId: userId,
      amount: String(amount),
      status: paymentStatus,
      paymentMethod: payment_method,
      transactionId: `RSV${reservationId}_${Date.now()}`,
    })

    const paymentId = paymentResult.insertId

    return c.json(
      {
        message: "Reservation created successfully",
        reservationId,
        paymentId,
        payment_method,
        reservation_status: reservationStatus,
      },
      201
    )
  } catch (err: any) {
    console.error("Failed to create reservation:", err)
    return c.json({ message: "Failed to create reservation", error: err.message }, 500)
  }
})

// Cancel reservation
reservationRouter.delete("/:id", async (c) => {
  try {
    const reservationId = c.req.param("id")
    const userPayload = c.get("user")

    const result = await db
      .update(reservations)
      .set({ status: "cancelled" })
      .where(and(eq(reservations.id, Number(reservationId)), eq(reservations.userId, userPayload.id)))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Reservation not found" }, 404)
    }

    return c.json({ message: "Reservation cancelled successfully" })
  } catch (err) {
    console.error("Error cancelling reservation:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

export { reservationRouter }
