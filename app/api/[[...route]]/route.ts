import { Hono } from "hono"
import { handle } from "hono/vercel"
import { cors } from "hono/cors"
import { authRouter } from "../../../lib/api/routes/auth"
import { userRouter } from "../../../lib/api/routes/user"
import { adminRouter } from "../../../lib/api/routes/admin"
import { poolRouter } from "../../../lib/api/routes/pools"
import { reservationRouter } from "../../../lib/api/routes/reservations"
import { membershipRouter } from "../../../lib/api/routes/memberships"
import { paymentRouter } from "../../../lib/api/routes/payments"
import { lockerRouter } from "../../../lib/api/routes/lockers"
import { settingsRouter } from "../../../lib/api/routes/settings"
import { checkinRouter } from "../../../lib/api/routes/checkin"
import type { HonoEnv } from "../../../lib/api/middleware/auth"

const app = new Hono<HonoEnv>().basePath("/api")

// CORS Middleware
app.use(
  "*",
  cors({
    origin: (origin) => {
      // allow requests from any origin or specific local host origins
      return origin || "http://localhost:3000"
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
)

// Health Check
app.get("/health", (c) => {
  return c.json({ status: "OK", message: "Swimming Pool API is running inside Next.js!" })
})

// Sub-routers mapping
app.route("/auth", authRouter)
app.route("/user", userRouter)
app.route("/admin", adminRouter)
app.route("/pools", poolRouter)
app.route("/pool-schedule", poolRouter) // Alias compatibility
app.route("/reservations", reservationRouter)
app.route("/memberships", membershipRouter)
app.route("/membership-types", membershipRouter) // Alias compatibility
app.route("/payments", paymentRouter)
app.route("/lockers", lockerRouter)
app.route("/settings", settingsRouter)
app.route("/checkin", checkinRouter)

// Error Handler
app.onError((err, c) => {
  console.error("Hono API Error:", err)
  return c.json({ message: "Something went wrong!", error: err.message }, 500)
})

// 404 Handler
app.notFound((c) => {
  return c.json({ message: "Route not found" }, 404)
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const OPTIONS = handle(app)
export const PATCH = handle(app)
