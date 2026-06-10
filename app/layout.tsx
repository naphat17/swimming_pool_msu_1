import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { Toaster } from "@/components/ui/toaster"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ระบบสระว่ายน้ำโรจนากร",
  description: "Swimming Pool Management System",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
