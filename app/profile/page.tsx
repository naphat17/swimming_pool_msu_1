"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import UserLayout from "@/components/user-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Lock, Mail, Phone, MapPin, Calendar, CreditCard, Shield, Check, Clock, Key } from "lucide-react"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
interface UserProfile {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  address: string
  date_of_birth: string
  id_card: string
  created_at: string
  role: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          setProfile(data.user)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          address: profile.address,
        }),
      })

      if (response.ok) {
        toast({
          title: "อัปเดตข้อมูลสำเร็จ",
          description: "ข้อมูลส่วนตัวได้รับการอัปเดตแล้ว",
        })
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลได้",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณาตรวจสอบรหัสผ่านใหม่ให้ตรงกัน",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/user/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      })

      if (response.ok) {
        toast({
          title: "เปลี่ยนรหัสผ่านสำเร็จ",
          description: "รหัสผ่านได้รับการเปลี่ยนแปลงแล้ว",
        })
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        })
      } else {
        const data = await response.json()
        toast({
          title: "เปลี่ยนรหัสผ่านไม่สำเร็จ",
          description: data.message || "รหัสผ่านปัจจุบันไม่ถูกต้อง",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </UserLayout>
    )
  }

  if (!profile) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500">
            <Shield className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">เกิดข้อผิดพลาด</h2>
            <p className="text-slate-500 font-medium">ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ในขณะนี้</p>
          </div>
          <Button onClick={() => window.location.reload()} className="rounded-xl font-bold">ลองใหม่อีกครั้ง</Button>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        {/* Profile Header Card */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-[2.5rem]" />
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-b-[2.5rem] rounded-t-none -mt-10 overflow-visible">
            <CardContent className="pt-0 pb-8 px-8">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-4">
                <div className="flex-1 text-center md:text-left space-y-1 mb-2">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                      <Shield className="h-3 w-3" /> {profile.role || 'USER'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> {profile.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> เข้าร่วมเมื่อ {new Date(profile.created_at).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
          <div className="flex items-center justify-center md:justify-start border-b border-slate-100">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
              <TabsTrigger 
                value="profile" 
                className="bg-transparent border-none p-0 h-12 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 font-black uppercase tracking-widest text-xs text-slate-400 transition-all"
              >
                ข้อมูลส่วนตัว
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="bg-transparent border-none p-0 h-12 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-4 data-[state=active]:border-blue-600 font-black uppercase tracking-widest text-xs text-slate-400 transition-all"
              >
                ความปลอดภัย
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Details Form */}
              <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">แก้ไขข้อมูลส่วนตัว</CardTitle>
                      <CardDescription className="font-medium text-slate-400">ระบุข้อมูลของคุณให้ถูกต้องและเป็นปัจจุบัน</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleProfileUpdate} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ชื่อผู้ใช้ (เปลี่ยนไม่ได้)</Label>
                        <div className="relative">
                          <Input id="username" value={profile.username} disabled className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-400 pl-10" />
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">อีเมล (เปลี่ยนไม่ได้)</Label>
                        <div className="relative">
                          <Input id="email" value={profile.email} disabled className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-400 pl-10" />
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ชื่อจริง</Label>
                        <Input
                          id="first_name"
                          value={profile.first_name}
                          onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                          required
                          className="h-12 bg-white border-slate-200 rounded-xl focus:ring-blue-500 font-bold transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">นามสกุล</Label>
                        <Input
                          id="last_name"
                          value={profile.last_name}
                          onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                          required
                          className="h-12 bg-white border-slate-200 rounded-xl focus:ring-blue-500 font-bold transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">เบอร์โทรศัพท์</Label>
                        <div className="relative">
                          <Input
                            id="phone"
                            value={profile.phone || ""}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="h-12 bg-white border-slate-200 rounded-xl focus:ring-blue-500 font-bold transition-all pl-10"
                          />
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">วัน/เดือน/ปีเกิด</Label>
                        <div className="relative">
                          <Input
                            id="date_of_birth"
                            type="date"
                            value={profile.date_of_birth ? profile.date_of_birth.split('T')[0] : ""}
                            disabled
                            className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-400 pl-10"
                          />
                          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ที่อยู่ปัจจุบัน</Label>
                      <div className="relative">
                        <Input
                          id="address"
                          value={profile.address || ""}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                          className="h-12 bg-white border-slate-200 rounded-xl focus:ring-blue-500 font-bold transition-all pl-10"
                        />
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={saving} className="h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95">
                        {saving ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>กำลังบันทึก...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 stroke-[3px]" />
                            <span>บันทึกการเปลี่ยนแปลง</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Side Info Cards */}
              <div className="space-y-8">
                <Card className="border-none shadow-xl shadow-slate-200/50 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-all duration-700" />
                  <div className="relative z-10 space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <CreditCard className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">เลขบัตรประชาชน</p>
                      <h3 className="text-xl font-black tracking-[0.15em]">{profile.id_card ? `XXXX-XXXX-XX${profile.id_card.slice(-3)}` : 'ยังไม่ได้ระบุ'}</h3>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Verified Member</span>
                      <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5" />
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight">ความปลอดภัยบัญชี</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">อัปเดตล่าสุด: เมื่อวานนี้</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">รหัสผ่าน</span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] px-2 uppercase tracking-wider">แข็งแรง</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">2FA</span>
                      </div>
                      <Badge className="bg-slate-100 text-slate-400 border-none font-black text-[9px] px-2 uppercase tracking-wider">ปิดอยู่</Badge>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="max-w-2xl border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">เปลี่ยนรหัสผ่าน</CardTitle>
                    <CardDescription className="font-medium text-slate-400">แนะนำให้เปลี่ยนรหัสผ่านทุกๆ 3-6 เดือนเพื่อความปลอดภัย</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="current_password" dangerouslySetInnerHTML={{ __html: 'รหัสผ่านปัจจุบัน <span className="text-rose-500">*</span>' }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1" />
                    <div className="relative">
                      <Input
                        id="current_password"
                        type="password"
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        required
                        className="h-14 bg-slate-50 border-slate-100 rounded-2xl focus:ring-rose-500 font-bold transition-all pl-12"
                      />
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="new_password" dangerouslySetInnerHTML={{ __html: 'รหัสผ่านใหม่ <span className="text-rose-500">*</span>' }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1" />
                      <div className="relative">
                        <Input
                          id="new_password"
                          type="password"
                          value={passwordData.new_password}
                          onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                          required
                          className="h-14 bg-white border-slate-200 rounded-2xl focus:ring-rose-500 font-bold transition-all pl-12"
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password" dangerouslySetInnerHTML={{ __html: 'ยืนยันรหัสผ่านใหม่ <span className="text-rose-500">*</span>' }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1" />
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type="password"
                          value={passwordData.confirm_password}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                          required
                          className="h-14 bg-white border-slate-200 rounded-2xl focus:ring-rose-500 font-bold transition-all pl-12"
                        />
                        <Check className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={saving} className="h-14 px-8 bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-95">
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>กำลังเปลี่ยน...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 stroke-[3px]" />
                          <span>อัปเดตรหัสผ่าน</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  )
}

