"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { UserPlus, CheckCircle2, Info } from "lucide-react"

interface UserCategory {
  id: number
  name: string
  description: string
  pay_per_session_price: number
  annual_price: number
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    date_of_birth: "",
    id_card: "",
    user_category_id: "",
  })
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const passwordRequirements = [
    { label: "อย่างน้อย 10 ตัวอักษร", regex: /.{10,}/ },
    { label: "ตัวอักษรพิมพ์เล็ก (a-z)", regex: /[a-z]/ },
    { label: "ตัวอักษรพิมพ์ใหญ่ (A-Z)", regex: /[A-Z]/ },
    { label: "ตัวเลข (0-9)", regex: /[0-9]/ },
    { label: "อักขระพิเศษ (@, #, $, %, !, &, *)", regex: /[@#$!%*?&]/ },
  ]

  useEffect(() => {
    const fetchUserCategories = async () => {
      try {
        const response = await fetch("/api/memberships/categories")
        if (response.ok) {
          const data = await response.json()
          setUserCategories(data.categories || [])
        }
      } catch (error) {
        console.error("Error fetching user categories:", error)
      }
    }

    fetchUserCategories()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      user_category_id: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณาตรวจสอบรหัสผ่านให้ตรงกัน",
        variant: "destructive",
      })
      return
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
    if (!passwordRegex.test(formData.password)) {
      toast({
        title: "รหัสผ่านไม่ปลอดภัยพอ",
        description: "รหัสผ่านต้องมีความยาวอย่างน้อย 10 ตัวอักษร และประกอบด้วยตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, ตัวเลข และอักขระพิเศษ",
        variant: "destructive",
      })
      return
    }

    if (!formData.user_category_id) {
      toast({
        title: "กรุณาเลือกประเภทผู้ใช้",
        description: "กรุณาเลือกประเภทผู้ใช้ที่ต้องการ",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.date_of_birth,
          id_card: formData.id_card,
          user_category_id: parseInt(formData.user_category_id),
        }),
      })

      if (response.ok) {
        toast({
          title: "สมัครสมาชิกสำเร็จ",
          description: "กรุณาเข้าสู่ระบบด้วยบัญชีที่สร้างใหม่",
        })
        router.push("/login")
      } else {
        const data = await response.json()
        toast({
          title: "สมัครสมาชิกไม่สำเร็จ",
          description: data.message || "เกิดข้อผิดพลาด",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
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

      <Card className="w-full max-w-2xl relative z-10 border-none shadow-2xl shadow-blue-900/5 bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-400" />
        <CardHeader className="text-center pt-8 pb-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-200">
            <UserPlus size={28} />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            สร้างบัญชีใหม่
          </CardTitle>
          <CardDescription className="text-base pt-2">
            เข้าร่วมเป็นส่วนหนึ่งของสระว่ายน้ำโรจนากรวันนี้
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 font-medium ml-1">ชื่อผู้ใช้ *</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Username"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium ml-1">อีเมล *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="example@mail.com"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-gray-700 font-medium ml-1">ชื่อ *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="ชื่อจริง"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-gray-700 font-medium ml-1">นามสกุล *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="นามสกุล"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium ml-1">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08X-XXXXXXX"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-gray-700 font-medium ml-1">วันเกิด</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_card" className="text-gray-700 font-medium ml-1">เลขบัตรประชาชน</Label>
                <Input
                  id="id_card"
                  name="id_card"
                  value={formData.id_card}
                  onChange={handleChange}
                  placeholder="เลขบัตรประชาชน 13 หลัก"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user_category" className="text-gray-700 font-medium ml-1">ประเภทผู้ใช้ *</Label>
                <Select value={formData.user_category_id} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all">
                    <SelectValue placeholder="เลือกประเภทผู้ใช้" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100">
                    {userCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()} className="focus:bg-blue-50 rounded-lg py-2">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-700 font-medium ml-1">ที่อยู่</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด"
                className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium ml-1">รหัสผ่าน *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 mt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
                    <Info size={12} /> เงื่อนไขรหัสผ่าน
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {passwordRequirements.map((req, i) => {
                      const isMet = req.regex.test(formData.password)
                      return (
                        <div key={i} className="flex items-center gap-2">
                          {isMet ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-slate-300" />
                          )}
                          <span className={`text-[10px] font-bold ${isMet ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {req.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium ml-1">ยืนยันรหัสผ่าน *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังสมัครสมาชิก...
                </span>
              ) : "สมัครสมาชิก"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-gray-500">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-bold ml-1 underline-offset-4 hover:underline">
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
