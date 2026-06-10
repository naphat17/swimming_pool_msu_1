import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import * as schema from "./schema"

const ssl =
  process.env.DB_SSL === "true"
    ? {
        minVersion: "TLSv1.2",
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
      }
    : undefined

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "swimming_pool_db",
  port: Number(process.env.DB_PORT) || 3306,
  ssl,
}

let lazyDb: ReturnType<typeof drizzle<typeof schema>> | null = null

function initDb() {
  if (!lazyDb) {
    if (process.env.NODE_ENV === "production") {
      const pool = mysql.createPool(dbConfig)
      lazyDb = drizzle(pool, { schema, mode: "default" })
    } else {
      const globalWithDb = global as typeof globalThis & {
        db?: ReturnType<typeof drizzle<typeof schema>>
      }
      if (!globalWithDb.db) {
        const pool = mysql.createPool(dbConfig)
        globalWithDb.db = drizzle(pool, { schema, mode: "default" })
      }
      lazyDb = globalWithDb.db
    }
  }
  return lazyDb
}

// Proxy to make DB operations lazy and prevent connection pool creation during Next.js builds
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    const databaseInstance = initDb()
    const value = Reflect.get(databaseInstance, prop, receiver)
    if (typeof value === "function") {
      return function (this: any, ...args: any[]) {
        return value.apply(this === receiver ? databaseInstance : this, args)
      }
    }
    return value
  },
})
