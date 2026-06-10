import { Hono } from "hono"
import { eq } from "drizzle-orm"
import { db } from "../../db"
import { systemSettings } from "../../db/schema"
import type { HonoEnv } from "../middleware/auth"

const settingsRouter = new Hono<HonoEnv>()

// GET a specific setting value
settingsRouter.get("/:key", async (c) => {
  try {
    const key = c.req.param("key")
    const rows = await db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, key))
      .limit(1)

    if (rows.length > 0) {
      return c.json({ value: rows[0].value })
    } else {
      return c.json({ message: "Setting not found" }, 404)
    }
  } catch (error) {
    console.error("Error fetching setting:", error)
    return c.json({ message: "Error fetching setting", error }, 500)
  }
})

// UPDATE a specific setting value
settingsRouter.put("/:key", async (c) => {
  try {
    const key = c.req.param("key")
    const { value } = await c.req.json()

    // Try to update first
    const updateResult = await db
      .update(systemSettings)
      .set({ settingValue: value })
      .where(eq(systemSettings.settingKey, key))

    if (updateResult[0].affectedRows > 0) {
      return c.json({ message: "Setting updated successfully" })
    } else {
      // If setting doesn't exist, insert it
      await db.insert(systemSettings).values({
        settingKey: key,
        settingValue: value,
      })
      return c.json({ message: "Setting created successfully" })
    }
  } catch (error) {
    console.error("Error updating setting:", error)
    return c.json({ message: "Error updating setting", error }, 500)
  }
})

export { settingsRouter }
