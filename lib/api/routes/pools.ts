import { Hono } from "hono"
import { eq, asc } from "drizzle-orm"
import { db } from "../../db"
import { poolResources, poolSchedules } from "../../db/schema"
import type { HonoEnv } from "../middleware/auth"

const poolRouter = new Hono<HonoEnv>()

// Get pool status (public)
poolRouter.get("/status", async (c) => {
  try {
    const pools = await db
      .select({
        id: poolResources.id,
        name: poolResources.name,
        description: poolResources.description,
        capacity: poolResources.capacity,
        status: poolResources.status,
      })
      .from(poolResources)
      .orderBy(poolResources.name)

    return c.json({ pools: pools || [] })
  } catch (err) {
    console.error("Error fetching pool status:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// Get pool schedules (public)
poolRouter.get("/", async (c) => {
  try {
    const rows = await db
      .select({
        id: poolResources.id,
        name: poolResources.name,
        description: poolResources.description,
        capacity: poolResources.capacity,
        status: poolResources.status,
        day_of_week: poolSchedules.dayOfWeek,
        open_time: poolSchedules.openTime,
        close_time: poolSchedules.closeTime,
        is_active: poolSchedules.isActive,
      })
      .from(poolResources)
      .leftJoin(poolSchedules, eq(poolResources.id, poolSchedules.poolResourceId))
      .orderBy(poolResources.name, poolSchedules.dayOfWeek)

    // Group schedules by pool
    const poolsMap: Record<number, any> = {}
    rows.forEach((row) => {
      if (!poolsMap[row.id]) {
        poolsMap[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          capacity: row.capacity,
          status: row.status,
          schedules: [],
        }
      }
      if (row.day_of_week) {
        poolsMap[row.id].schedules.push({
          day_of_week: row.day_of_week,
          open_time: row.open_time,
          close_time: row.close_time,
          is_active: row.is_active,
        })
      }
    })

    const schedules = Object.values(poolsMap)
    return c.json({ schedules })
  } catch (err) {
    console.error("Error fetching pool schedules:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

export { poolRouter }
