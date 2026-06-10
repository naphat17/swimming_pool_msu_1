import { createMiddleware } from "hono/factory"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export type UserPayload = {
  id: number
  username: string
  role: "user" | "admin"
}

export type HonoEnv = {
  Variables: {
    user: UserPayload
  }
}

export const authenticateToken = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header("authorization")
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return c.json({ message: "Access token required" }, 401)
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    c.set("user", decoded)
    await next()
  } catch (err) {
    return c.json({ message: "Invalid or expired token" }, 403)
  }
})

export const requireAdmin = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get("user")
  if (!user || user.role !== "admin") {
    return c.json({ message: "Access denied. Admins only." }, 403)
  }
  await next()
})
