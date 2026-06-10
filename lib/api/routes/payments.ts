import { Hono } from "hono"
import { eq, and, desc, sql, like, between } from "drizzle-orm"
import { uploadToCloudinary } from "../../cloudinary"
import { db } from "../../db"
import { payments, users, memberships, membershipTypes } from "../../db/schema"
import { authenticateToken } from "../middleware/auth"
import type { HonoEnv } from "../middleware/auth"

const paymentRouter = new Hono<HonoEnv>()

paymentRouter.use("*", authenticateToken)

// Get user payments
paymentRouter.get("/user", async (c) => {
  try {
    const userPayload = c.get("user")
    const results = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        payment_method: payments.paymentMethod,
        transaction_id: payments.transactionId,
        created_at: payments.createdAt,
        membership_type: membershipTypes.name,
      })
      .from(payments)
      .leftJoin(memberships, eq(payments.userId, memberships.userId))
      .leftJoin(membershipTypes, eq(memberships.membershipTypeId, membershipTypes.id))
      .where(eq(payments.userId, userPayload.id))
      .orderBy(desc(payments.createdAt))

    return c.json({ payments: results || [] })
  } catch (err) {
    console.error("User payments fetch error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// (สำหรับ admin) ดึงรายการการชำระเงินทั้งหมดพร้อม filter
paymentRouter.get("/admin/payments", async (c) => {
  const userPayload = c.get("user")
  if (userPayload.role !== "admin") {
    return c.json({ message: "Access denied. Admins only." }, 403)
  }

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

// GET payment receipt details
paymentRouter.get("/:id/receipt", async (c) => {
  try {
    const paymentId = c.req.param("id")
    const userPayload = c.get("user")

    const rows = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        payment_method: payments.paymentMethod,
        transaction_id: payments.transactionId,
        created_at: payments.createdAt,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        phone: users.phone,
      })
      .from(payments)
      .innerJoin(users, eq(payments.userId, users.id))
      .where(and(eq(payments.id, Number(paymentId)), eq(payments.userId, userPayload.id)))
      .limit(1)

    if (rows.length === 0) {
      return c.json({ message: "Payment not found" }, 404)
    }

    const payment = rows[0]

    return c.json({
      receipt_id: `REC-${payment.id}-${Date.now()}`,
      date: payment.created_at,
      amount: payment.amount,
      method: payment.payment_method,
      status: payment.status,
      customer: {
        name: `${payment.first_name} ${payment.last_name}`,
        email: payment.email,
        phone: payment.phone,
      },
      items: [
        {
          description: payment.transaction_id?.startsWith("RSV")
            ? "Pool Reservation Fee"
            : payment.transaction_id?.startsWith("LKR")
            ? "Locker Reservation Fee"
            : "Membership Fee",
          amount: payment.amount,
        },
      ],
    })
  } catch (err) {
    console.error("Receipt error:", err)
    return c.json({ message: "Database error" }, 500)
  }
})

// อัปโหลด slip (กรณีโอนเงินผ่านบัญชี)
paymentRouter.post("/:id/upload-slip", async (c) => {
  try {
    const paymentId = c.req.param("id")
    const userPayload = c.get("user")
    const body = await c.req.parseBody()
    const slipFile = body["slip"] as File

    if (!slipFile) {
      return c.json({ message: "No slip file uploaded" }, 400)
    }

    const arrayBuffer = await slipFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudinary under 'swimming-pool-slips' folder
    const slipUrl = await uploadToCloudinary(buffer, "swimming-pool-slips")

    // Update payment in db
    await db
      .update(payments)
      .set({
        slipUrl,
        status: "pending",
      })
      .where(and(eq(payments.id, Number(paymentId)), eq(payments.userId, userPayload.id)))

    return c.json({ message: "Slip uploaded successfully", slip_url: slipUrl })
  } catch (err: any) {
    console.error("Upload slip error:", err)
    return c.json({ message: "Failed to upload slip", error: err.message }, 500)
  }
})

// (สำหรับ admin) ยืนยันการชำระเงิน
paymentRouter.put("/:id/confirm", async (c) => {
  const userPayload = c.get("user")
  if (userPayload.role !== "admin") {
    return c.json({ message: "Access denied. Admins only." }, 403)
  }

  try {
    const paymentId = c.req.param("id")
    const { status } = await c.req.json()

    if (!["completed", "failed"].includes(status)) {
      return c.json({ message: "Invalid status" }, 400)
    }

    // 1. Update payment status
    const updateResult = await db
      .update(payments)
      .set({ status: status as any })
      .where(eq(payments.id, Number(paymentId)))

    if (updateResult[0].affectedRows === 0) {
      return c.json({ message: "Payment not found" }, 404)
    }

    if (status === "failed") {
      return c.json({ message: "Payment status updated to failed" })
    }

    // --- Logic for 'completed' payments ---
    // 2. Get payment and membership details
    const paymentDetails = await db
      .select({
        userId: payments.userId,
        membershipId: memberships.id,
        membershipTypeId: memberships.membershipTypeId,
      })
      .from(payments)
      .leftJoin(memberships, eq(payments.userId, memberships.userId))
      .where(eq(payments.id, Number(paymentId)))
      .orderBy(desc(memberships.createdAt))
      .limit(1)

    const details = paymentDetails[0]

    if (!details) {
      return c.json({ message: "Payment details not found." }, 404)
    }

    const { userId, membershipId, membershipTypeId } = details

    // If this payment isn't associated with any membership record, skip membership logic
    if (!membershipId) {
      return c.json({ message: "Payment confirmed (non-membership payment)" })
    }

    // 3. Handle membership activation/extension
    if (membershipTypeId === 2) {
      // Annual Membership
      const activeAnnualMemberships = await db
        .select({ id: memberships.id, expiresAt: memberships.expiresAt })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.status, "active"), eq(memberships.membershipTypeId, 2)))
        .limit(1)

      const activeAnnual = activeAnnualMemberships[0]

      if (activeAnnual) {
        const currentExpiry = new Date(activeAnnual.expiresAt)
        currentExpiry.setFullYear(currentExpiry.getFullYear() + 1)

        await db
          .update(memberships)
          .set({ expiresAt: currentExpiry })
          .where(eq(memberships.id, activeAnnual.id))
      } else {
        const newExpiry = new Date()
        newExpiry.setFullYear(newExpiry.getFullYear() + 1)

        await db
          .update(memberships)
          .set({ status: "active", expiresAt: newExpiry })
          .where(eq(memberships.id, membershipId))
      }
    } else {
      // Pay-per-session
      const newExpiry = new Date()
      newExpiry.setHours(23, 59, 59, 999) // End of current day

      await db
        .update(memberships)
        .set({ status: "active", expiresAt: newExpiry })
        .where(eq(memberships.id, membershipId))
    }

    return c.json({ message: "Payment confirmed and membership updated successfully" })
  } catch (err: any) {
    console.error("Confirm payment error:", err)
    return c.json({ message: "Failed to update payment status", error: err.message }, 500)
  }
})

export { paymentRouter }
