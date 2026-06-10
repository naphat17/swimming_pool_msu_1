"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Waves, User, Lock } from "lucide-react"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const success = await login(usernameOrEmail, password)

    if (success) {
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับเข้าสู่ระบบสระว่ายน้ำโรจนากร",
      })
      router.push("/")
    } else {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: "กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน",
        variant: "destructive",
      })
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-3xl" />
      </div>

      <Card className="w-full max-w-[450px] relative z-10 border-none shadow-2xl shadow-blue-900/5 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-400" />
        <CardHeader className="text-center pt-10 pb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-200">
            <Waves size={32} />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            ยินดีต้อนรับกลับมา
          </CardTitle>
          <CardDescription className="text-base pt-2">
            เข้าสู่ระบบสระว่ายน้ำโรจนากรเพื่อดำเนินการต่อ
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 font-medium ml-1">ชื่อผู้ใช้หรืออีเมล</Label>
              <div className="relative group">
                <Input
                  id="username"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  placeholder="กรอกชื่อผู้ใช้หรืออีเมลของคุณ"
                  className="pl-10 h-12 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <Label htmlFor="password" className="text-gray-700 font-medium">รหัสผ่าน</Label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <div className="relative group">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="กรอกรหัสผ่านของคุณ"
                  className="pl-10 h-12 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : "เข้าสู่ระบบ"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-gray-500">
              ยังไม่มีบัญชี?{" "}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-bold ml-1 underline-offset-4 hover:underline">
                สมัครสมาชิกฟรี
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
