import { Hono } from "hono"
import { eq, and, or, desc } from "drizzle-orm"
import { db } from "../../db"
import { userCategories, users, payments, memberships, membershipTypes } from "../../db/schema"
import { authenticateToken } from "../middleware/auth"
import type { HonoEnv } from "../middleware/auth"

const membershipRouter = new Hono<HonoEnv>()

// Get membership types (public)
membershipRouter.get("/", async (c) => {
  try {
    const results = await db
      .select({
        id: membershipTypes.id,
        name: membershipTypes.name,
        description: membershipTypes.description,
        price: membershipTypes.price,
        duration_days: membershipTypes.durationDays,
      })
      .from(membershipTypes)
      .orderBy(membershipTypes.price)

    return c.json({ membership_types: results || [] })
  } catch (err: any) {
    console.error("Error fetching membership types:", err)
    return c.json({ message: "Database error", error: err.message }, 500)
  }
})

// Get user categories (public)
membershipRouter.get("/categories", async (c) => {
  try {
    const categories = await db
      .select({
        id: userCategories.id,
        name: userCategories.name,
        description: userCategories.description,
        pay_per_session_price: userCategories.payPerSessionPrice,
        annual_price: userCategories.annualPrice,
      })
      .from(userCategories)
      .orderBy(userCategories.id)

    return c.json({ categories: categories || [] })
  } catch (err: any) {
    console.error("Error fetching categories:", err)
    return c.json({ message: "Database error", error: err.message }, 500)
  }
})

// Create a payment for a membership (pay-per-session or annual)
membershipRouter.post("/purchase", authenticateToken, async (c) => {
  try {
    const { purchase_type, payment_method, user_category_id } = await c.req.json()
    const userPayload = c.get("user")
    const userId = userPayload.id

    if (!purchase_type || !payment_method || !user_category_id) {
      return c.json({ message: "purchase_type, payment_method, and user_category_id are required" }, 400)
    }

    // Get selected user category pricing
    const categories = await db
      .select({
        id: userCategories.id,
        pay_per_session_price: userCategories.payPerSessionPrice,
        annual_price: userCategories.annualPrice,
      })
      .from(userCategories)
      .where(eq(userCategories.id, Number(user_category_id)))
      .limit(1)

    const selectedCategory = categories[0]

    if (!selectedCategory) {
      return c.json({ message: "Selected user category not found." }, 404)
    }

    const amount = purchase_type === "annual" ? selectedCategory.annual_price : selectedCategory.pay_per_session_price
    const membership_type_id = purchase_type === "annual" ? 2 : 1

    // 1. Create payment
    const [paymentResult] = await db.insert(payments).values({
      userId: userId,
      amount: amount,
      status: "pending",
      paymentMethod: payment_method,
      transactionId: `TXN${Date.now()}`,
    })

    const paymentId = paymentResult.insertId

    // 2. Update user's category
    await db
      .update(users)
      .set({ userCategoryId: Number(user_category_id) })
      .where(eq(users.id, userId))

    // 3. Update or create membership entry
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)

    if (purchase_type === "annual") {
      // Check if user already has an active/pending annual membership
      const existingMembership = await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, userId),
            eq(memberships.membershipTypeId, 2),
            or(eq(memberships.status, "active"), eq(memberships.status, "pending"))
          )
        )
        .limit(1)

      if (existingMembership.length > 0) {
        // Update existing annual membership
        await db
          .update(memberships)
          .set({
            membershipTypeId: membership_type_id,
            expiresAt: nextYear,
            status: "pending",
          })
          .where(eq(memberships.id, existingMembership[0].id))
      } else {
        // Create new annual membership
        await db.insert(memberships).values({
          userId: userId,
          membershipTypeId: membership_type_id,
          expiresAt: nextYear,
          status: "pending",
        })
      }
    } else {
      // For session-based, ensure a pending 'pay-per-session' membership exists or update it
      const existingSessionMembership = await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.membershipTypeId, 1), eq(memberships.status, "pending")))
        .limit(1)

      if (existingSessionMembership.length === 0) {
        await db.insert(memberships).values({
          userId: userId,
          membershipTypeId: 1,
          expiresAt: nextYear,
          status: "pending",
        })
      } else {
        // Update existing session membership expiry
        await db
          .update(memberships)
          .set({ expiresAt: nextYear })
          .where(eq(memberships.id, existingSessionMembership[0].id))
      }
    }

    return c.json({
      message: "Payment created. Please proceed to payment.",
      payment_id: paymentId,
      payment_status: "pending",
    }, 201)
  } catch (err: any) {
    console.error("Purchase membership error:", err)
    return c.json({ message: "Failed to create payment", error: err.message }, 500)
  }
})

// ดูรายการ membership ทั้งหมด (admin) พร้อม filter ตาม status
membershipRouter.get("/admin/list", authenticateToken, async (c) => {
  const userPayload = c.get("user")
  if (userPayload.role !== "admin") {
    return c.json({ message: "Admins only" }, 403)
  }
  try {
    const status = c.req.query("status")

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

    const filteredQuery = status
      ? query.where(eq(memberships.status, status as any))
      : query

    const results = await filteredQuery.orderBy(desc(memberships.createdAt))

    return c.json({ memberships: results })
  } catch (err) {
    console.error("Fetch memberships error:", err)
    return c.json({ message: "Failed to fetch memberships" }, 500)
  }
})

export { membershipRouter }
