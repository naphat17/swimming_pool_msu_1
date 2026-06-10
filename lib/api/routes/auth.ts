import { Hono } from "hono"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { eq, or } from "drizzle-orm"
import { db } from "../../db"
import { users, memberships } from "../../db/schema"
import type { HonoEnv } from "../middleware/auth"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

const authRouter = new Hono<HonoEnv>()

// Register
authRouter.post("/register", async (c) => {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      phone,
      address,
      date_of_birth,
      id_card,
      user_category_id,
    } = await c.req.json()

    // Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
    if (!passwordRegex.test(password)) {
      return c.json(
        {
          message:
            "รหัสผ่านไม่ตรงตามเงื่อนไขความปลอดภัย: อย่างน้อย 10 ตัวอักษร และต้องประกอบด้วยตัวอักษรพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ",
        },
        400
      )
    }

    // Check if user exists
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))

    if (existingUsers.length > 0) {
      return c.json({ message: "Username or email already exists" }, 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    const [result] = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      firstName: first_name,
      lastName: last_name,
      phone,
      address,
      dateOfBirth: date_of_birth || null,
      idCard: id_card || null,
      userCategoryId: user_category_id ? Number(user_category_id) : 6,
      role: "user",
      status: "active",
    })

    const userId = result.insertId

    // Create an annual membership for the new user, expires in 1 year
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // membership_type_id 2 is for 'Annual' membership
    await db.insert(memberships).values({
      userId: userId,
      membershipTypeId: 2,
      expiresAt: expiresAt,
      status: "active",
    })

    return c.json(
      {
        message: "User created successfully",
        userId: userId,
      },
      201
    )
  } catch (error) {
    console.error("Register error:", error)
    return c.json({ message: "Server error" }, 500)
  }
})

// Login
authRouter.post("/login", async (c) => {
  try {
    const { username, password } = await c.req.json()

    if (!username || !password) {
      return c.json({ message: "Username/email and password are required" }, 400)
    }

    const matchedUsers = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, username),
          eq(users.email, username)
        )
      )
      .limit(1)

    if (matchedUsers.length === 0 || matchedUsers[0].status !== "active") {
      return c.json({ message: "Invalid credentials" }, 401)
    }

    const user = matchedUsers[0]
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return c.json({ message: "Invalid credentials" }, 401)
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    )

    // Remove password from response user object
    const { password: _, ...userWithoutPassword } = user

    // Format keys for client compatibility
    const formattedUser = {
      id: userWithoutPassword.id,
      username: userWithoutPassword.username,
      email: userWithoutPassword.email,
      first_name: userWithoutPassword.firstName,
      last_name: userWithoutPassword.lastName,
      phone: userWithoutPassword.phone,
      address: userWithoutPassword.address,
      date_of_birth: userWithoutPassword.dateOfBirth,
      id_card: userWithoutPassword.idCard,
      user_category_id: userWithoutPassword.userCategoryId,
      role: userWithoutPassword.role,
      status: userWithoutPassword.status,
      created_at: userWithoutPassword.createdAt,
      updated_at: userWithoutPassword.updatedAt,
    }

    return c.json({
      token,
      user: formattedUser,
    })
  } catch (error) {
    console.error("Login error:", error)
    return c.json({ message: "Server error" }, 500)
  }
})

// Forgot Password
authRouter.post("/forgot-password", async (c) => {
  const { email } = await c.req.json()

  // In a real app, you would send an email with reset link
  // For demo purposes, we'll just return success
  return c.json({
    message: "Password reset email sent",
    email,
  })
})

export { authRouter }
