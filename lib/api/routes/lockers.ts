import { Hono } from "hono"
import { eq, and, or, sql, desc, like } from "drizzle-orm"
import { db } from "../../db"
import { lockers, lockerReservations, systemSettings, reservations, payments } from "../../db/schema"
import { authenticateToken } from "../middleware/auth"
import type { HonoEnv } from "../middleware/auth"

const lockerRouter = new Hono<HonoEnv>()

// Admin: Get all lockers, with optional date for reservation status
lockerRouter.get("/", authenticateToken, async (c) => {
  const userPayload = c.get("user")
  if (userPayload.role !== "admin") {
    return c.json({ message: "Access denied. Admins only." }, 403)
  }
  try {
    const dateQuery = c.req.query("date")

    if (dateQuery) {
      const results = await db
        .select({
          id: lockers.id,
          code: lockers.code,
          location: lockers.location,
          status: lockers.status,
          is_reserved_on_selected_date: sql<boolean>`CASE WHEN EXISTS (
            SELECT 1 FROM locker_reservations lr 
            WHERE lr.locker_id = lockers.id 
            AND lr.reservation_date = ${dateQuery} 
            AND lr.status IN ('pending', 'confirmed')
          ) THEN TRUE ELSE FALSE END`,
        })
        .from(lockers)
        .orderBy(lockers.code)

      return c.json({ lockers: results })
    } else {
      const results = await db
        .select()
        .from(lockers)
        .orderBy(lockers.code)

      return c.json({ lockers: results })
    }
  } catch (err) {
    console.error("Error fetching all lockers:", err)
    return c.json({ message: "Failed to fetch all lockers" }, 500)
  }
})

// Admin: Create a new locker
lockerRouter.post("/", authenticateToken, async (c) => {
  const userPayload = c.get("user")
  if (userPayload.role !== "admin") {
    return c.json({ message: "Access denied. Admins only." }, 403)
  }
  try {
    const { code, location, status } = await c.req.json()
    if (!code || !location || !status) {
      return c.json({ message: "Code, location, and status are required." }, 400)
    }
    const [result] = await db.insert(lockers).values({
      code,
      location,
      status: status as any,
    })
    return c.json({ message: "Locker created successfully", locker_id: result.insertId }, 201)
  } catch (err) {
    console.error("Error creating locker:", err)
    return c.json({ message: "Failed to create locker" }, 500)
  }
})

// Admin: Update an existing locker
lockerRouter.put("/:id", authenticateToken, async (c) => {
  const userPayload = c.get("user")
  if (userPayload.role !== "admin") {
    return c.json({ message: "Access denied. Admins only." }, 403)
  }
  try {
    const lockerId = c.req.param("id")
    const { code, location, status } = await c.req.json()
    if (!code || !location || !status) {
      return c.json({ message: "Code, location, and status are required." }, 400)
    }
    const result = await db
      .update(lockers)
      .set({ code, location, status: status as any })
      .where(eq(lockers.id, Number(lockerId)))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Locker not found" }, 404)
    }
    return c.json({ message: "Locker updated successfully" })
  } catch (err) {
    console.error("Error updating locker:", err)
    return c.json({ message: "Failed to update locker" }, 500)
  }
})

// Admin: Delete a locker
lockerRouter.delete("/:id", authenticateToken, async (c) => {
  const userPayload = c.get("user")
  if (userPayload.role !== "admin") {
    return c.json({ message: "Access denied. Admins only." }, 403)
  }
  try {
    const lockerId = c.req.param("id")
    const result = await db.delete(lockers).where(eq(lockers.id, Number(lockerId)))
    if (result[0].affectedRows === 0) {
      return c.json({ message: "Locker not found" }, 404)
    }
    return c.json({ message: "Locker deleted successfully" })
  } catch (err) {
    console.error("Error deleting locker:", err)
    return c.json({ message: "Failed to delete locker" }, 500)
  }
})

// User & Admin: Get all lockers with status for a specific date
lockerRouter.get("/status", async (c) => {
  try {
    const dateQuery = c.req.query("date")
    if (!dateQuery) {
      return c.json({ message: "Date is required" }, 400)
    }

    const results = await db
      .select({
        id: lockers.id,
        code: lockers.code,
        location: lockers.location,
        status: lockers.status,
        current_status: sql<string>`
          CASE 
            WHEN lockers.status != 'available' THEN 'maintenance'
            WHEN EXISTS (
              SELECT 1 FROM locker_reservations lr 
              WHERE lr.locker_id = lockers.id 
              AND lr.reservation_date = ${dateQuery} 
              AND lr.status IN ('pending', 'confirmed')
            ) THEN 'reserved'
            ELSE 'available'
          END
        `,
      })
      .from(lockers)
      .orderBy(lockers.code)

    return c.json({ lockers: results })
  } catch (err) {
    console.error("Error fetching lockers status:", err)
    return c.json({ message: "Failed to fetch lockers status" }, 500)
  }
})

// User: Get all available lockers (compatibility helper)
lockerRouter.get("/available", async (c) => {
  try {
    const results = await db.select().from(lockers).where(eq(lockers.status, "available")).orderBy(lockers.code)
    return c.json({ lockers: results })
  } catch (err) {
    console.error("Error fetching available lockers:", err)
    return c.json({ message: "Failed to fetch available lockers" }, 500)
  }
})

// User: Get user's locker reservations
lockerRouter.get("/reservations/user", authenticateToken, async (c) => {
  try {
    const userPayload = c.get("user")
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
        locker_code: lockers.code,
      })
      .from(lockerReservations)
      .innerJoin(lockers, eq(lockerReservations.lockerId, lockers.id))
      .where(eq(lockerReservations.userId, userPayload.id))
      .orderBy(desc(lockerReservations.reservationDate))

    return c.json({ reservations: results })
  } catch (err) {
    console.error("Error fetching user reservations:", err)
    return c.json({ message: "Failed to fetch reservations" }, 500)
  }
})

// User: Create a new locker reservation
lockerRouter.post("/reservations", authenticateToken, async (c) => {
  try {
    const { locker_id, reservation_date, payment_method } = await c.req.json()
    const userPayload = c.get("user")

    // Check for Maintenance Mode
    const maintenance = await db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "maintenance_mode"))
      .limit(1)

    if (maintenance.length > 0 && maintenance[0].value === "true") {
      return c.json({ message: "ระบบปิดปรับปรุงชั่วคราว ไม่สามารถทำการจองได้ในขณะนี้" }, 503)
    }

    if (!locker_id || !reservation_date) {
      return c.json({ message: "locker_id and reservation_date are required" }, 400)
    }

    // Prevent duplicate reservation for the same locker and date
    const existing = await db
      .select({ id: lockerReservations.id })
      .from(lockerReservations)
      .where(
        and(
          eq(lockerReservations.lockerId, Number(locker_id)),
          eq(lockerReservations.reservationDate, reservation_date),
          or(eq(lockerReservations.status, "pending"), eq(lockerReservations.status, "confirmed"))
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return c.json({ message: "Locker is already reserved for this date" }, 400)
    }

    const amount = 30

    let reservationStatus: "pending" | "confirmed" = "pending"
    let paymentStatus: "pending" | "completed" = "pending"

    // Check if there's a pool charter on this day
    const poolCharter = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.reservationDate, reservation_date),
          or(eq(reservations.status, "confirmed"), eq(reservations.status, "pending")),
          like(reservations.notes, "%เหมาสระ%")
        )
      )
      .limit(1)

    if (poolCharter.length > 0) {
      return c.json({ message: "ไม่สามารถจองตู้เก็บของได้เนื่องจากสระถูกเหมาไปแล้วในวันนี้" }, 400)
    }

    if (payment_method === "cash" || payment_method === "bank_transfer") {
      reservationStatus = "pending"
      paymentStatus = "pending"
    } else if (payment_method === "system") {
      reservationStatus = "confirmed"
      paymentStatus = "completed"
    } else {
      return c.json({ message: "Invalid payment method" }, 400)
    }

    // Create locker reservation
    const [reservationResult] = await db.insert(lockerReservations).values({
      userId: userPayload.id,
      lockerId: Number(locker_id),
      reservationDate: reservation_date,
      startTime: "00:00:00",
      endTime: "23:59:59",
      status: reservationStatus,
    })
    const reservationId = reservationResult.insertId

    // Create payment
    const [paymentResult] = await db.insert(payments).values({
      userId: userPayload.id,
      amount: String(amount),
      status: paymentStatus,
      paymentMethod: payment_method as any,
      transactionId: `LKR${reservationId}_${Date.now()}`,
    })
    const paymentId = paymentResult.insertId

    return c.json(
      {
        message: "Locker reserved successfully",
        reservation_id: reservationId,
        paymentId,
        reservation_status: reservationStatus,
      },
      201
    )
  } catch (err: any) {
    console.error("Error creating locker reservation:", err)
    return c.json({ message: "Failed to reserve locker", error: err.message }, 500)
  }
})

// User: Cancel a locker reservation
lockerRouter.delete("/reservations/:id", authenticateToken, async (c) => {
  try {
    const reservationId = c.req.param("id")
    const userPayload = c.get("user")

    const result = await db
      .update(lockerReservations)
      .set({ status: "cancelled" })
      .where(and(eq(lockerReservations.id, Number(reservationId)), eq(lockerReservations.userId, userPayload.id)))

    if (result[0].affectedRows === 0) {
      return c.json({ message: "Reservation not found or cannot be cancelled" }, 404)
    }
    return c.json({ message: "Reservation cancelled successfully" })
  } catch (err) {
    console.error("Error cancelling reservation:", err)
    return c.json({ message: "Failed to cancel reservation" }, 500)
  }
})

export { lockerRouter }
