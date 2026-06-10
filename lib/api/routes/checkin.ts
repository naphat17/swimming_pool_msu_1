import { Hono } from "hono"
import { eq, and, sql } from "drizzle-orm"
import { db } from "../../db"
import { reservations, lockerReservations, users, poolResources, lockers } from "../../db/schema"
import { authenticateToken } from "../middleware/auth"
import type { HonoEnv } from "../middleware/auth"

const checkinRouter = new Hono<HonoEnv>()

// Get reservations for a specific date (both pools and lockers)
checkinRouter.get("/", async (c) => {
  try {
    const dateQuery = c.req.query("date") || new Date().toISOString().split("T")[0]

    // Get pool reservations for the selected date
    const poolReservationsList = await db
      .select({
        id: reservations.id,
        pool_resource_id: reservations.poolResourceId,
        start_time: reservations.startTime,
        end_time: reservations.endTime,
        status: reservations.status,
        checked_in: reservations.checkedIn,
        user_id: users.id,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        phone: users.phone,
        pool_name: poolResources.name,
      })
      .from(reservations)
      .innerJoin(users, eq(reservations.userId, users.id))
      .innerJoin(poolResources, eq(reservations.poolResourceId, poolResources.id))
      .where(sql`DATE(${reservations.reservationDate}) = ${dateQuery}`)
      .orderBy(reservations.startTime)

    // Get locker reservations for the selected date
    const lockerReservationsList = await db
      .select({
        id: lockerReservations.id,
        locker_id: lockerReservations.lockerId,
        reservation_date: lockerReservations.reservationDate,
        status: lockerReservations.status,
        checked_in: lockerReservations.checkedIn,
        user_id: users.id,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        phone: users.phone,
        locker_number: lockers.code,
      })
      .from(lockerReservations)
      .innerJoin(users, eq(lockerReservations.userId, users.id))
      .innerJoin(lockers, eq(lockerReservations.lockerId, lockers.id))
      .where(sql`DATE(${lockerReservations.reservationDate}) = ${dateQuery}`)
      .orderBy(users.lastName)

    // Combine and structure data
    const userReservationsMap: Record<number, any> = {}

    poolReservationsList.forEach((res) => {
      const userId = res.user_id
      if (!userReservationsMap[userId]) {
        userReservationsMap[userId] = {
          user_id: userId,
          first_name: res.first_name,
          last_name: res.last_name,
          email: res.email,
          phone: res.phone,
          pool_reservations: [],
          locker_reservations: [],
        }
      }
      userReservationsMap[userId].pool_reservations.push({
        id: res.id,
        pool_name: res.pool_name,
        start_time: res.start_time,
        end_time: res.end_time,
        status: res.status,
        checked_in: res.checked_in || false,
      })
    })

    lockerReservationsList.forEach((res) => {
      const userId = res.user_id
      if (!userReservationsMap[userId]) {
        userReservationsMap[userId] = {
          user_id: userId,
          first_name: res.first_name,
          last_name: res.last_name,
          email: res.email,
          phone: res.phone,
          pool_reservations: [],
          locker_reservations: [],
        }
      }
      userReservationsMap[userId].locker_reservations.push({
        id: res.id,
        locker_number: res.locker_number,
        status: res.status,
        checked_in: res.checked_in || false,
      })
    })

    // Convert to array
    const reservationsArray = Object.values(userReservationsMap)

    return c.json({
      date: dateQuery,
      total_reservations: reservationsArray.length,
      reservations: reservationsArray,
    })
  } catch (err) {
    console.error("Today reservations error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Check in reservation (pool or locker)
checkinRouter.post("/checkin", async (c) => {
  try {
    const { type, id } = await c.req.json()

    if (!type || !id) {
      return c.json({ message: "Missing required fields" }, 400)
    }

    if (type === "pool") {
      await db
        .update(reservations)
        .set({ checkedIn: true, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(reservations.id, Number(id)))
    } else if (type === "locker") {
      await db
        .update(lockerReservations)
        .set({ checkedIn: true, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(lockerReservations.id, Number(id)))
    } else {
      return c.json({ message: "Invalid type" }, 400)
    }

    return c.json({ message: "Check-in successful" })
  } catch (err) {
    console.error("Check-in error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

export { checkinRouter }
