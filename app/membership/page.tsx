"use client"

import { useEffect, useState, useRef } from "react"
import UserLayout from "@/components/user-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Check, Crown, Star, Calendar, CreditCard, Shield, Plus, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserMembership {
  type: string
  expires_at: string
  status: string
  user_category: string
  pay_per_session_price: number
  annual_price: number
}

interface UserCategory {
  id: number;
  name: string;
  description: string;
  pay_per_session_price: number;
  annual_price: number;
}

export default function MembershipPage() {
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null)
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const { toast } = useToast()
  const [paymentModal, setPaymentModal] = useState<null | { type: 'session' | 'annual', price: number, categoryId: number }>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "">("")
  const [paymentStep, setPaymentStep] = useState<"choose" | "upload" | "pending" | "done">("choose")
  const [createdPayment, setCreatedPayment] = useState<any>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bankAccountNumber, setBankAccountNumber] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token")
        const dashboardResponse = await fetch("/api/user/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json()
          setUserMembership(dashboardData.membership)
          console.log("User Membership:", dashboardData.membership); // Debug log
        } else if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
          localStorage.removeItem("token")
          window.location.href = "/login"
          return
        } else {
          console.error("Failed to fetch user dashboard:", dashboardResponse.status, dashboardResponse.statusText);
        }

        const categoriesResponse = await fetch("/api/memberships/categories");
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setUserCategories(categoriesData.categories);
          console.log("User Categories:", categoriesData.categories); // Debug log
        } else {
          console.error("Failed to fetch user categories:", categoriesResponse.status, categoriesResponse.statusText);
        }

      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    ;(async () => {
      try {
        const res = await fetch("/api/settings/bank_account_number")
        if (res.ok) {
          const data = await res.json()
          setBankAccountNumber(data.value)
        }
      } catch {}
    })()
  }, [])

  const handleOpenPaymentModal = (type: 'session' | 'annual', price: number, categoryId: number) => {
    setPaymentModal({ type, price, categoryId })
    setPaymentMethod("")
    setPaymentStep("choose")
    setCreatedPayment(null)
    setSlipFile(null)
  }

  const handleCreatePayment = async () => {
    if (!paymentModal || !paymentMethod) return
    setPurchasing(paymentModal.type)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/memberships/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purchase_type: paymentModal.type,
          payment_method: paymentMethod,
          user_category_id: paymentModal.categoryId, // Pass the selected category ID
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setCreatedPayment(data)
        if (paymentMethod === "bank_transfer") {
          setPaymentStep("upload")
        } else {
          setPaymentStep("pending")
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "ไม่สามารถสร้างรายการชำระเงินได้",
          description: errorData.message || "เกิดข้อผิดพลาด",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดำเนินการได้",
        variant: "destructive",
      })
    }
    setPurchasing(null)
  }

  const handleUploadSlip = async () => {
    if (!createdPayment?.payment_id || !slipFile) return
    setUploading(true)
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      formData.append("slip", slipFile)
      const response = await fetch(`/api/payments/${createdPayment.payment_id}/upload-slip`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (response.ok) {
        setPaymentStep("pending")
        toast({ title: "อัปโหลดสลิปสำเร็จ", description: "รอเจ้าหน้าที่ตรวจสอบ" })
      } else {
        const errorData = await response.json()
        toast({
          title: "อัปโหลดสลิปไม่สำเร็จ",
          description: errorData.message || "เกิดข้อผิดพลาด",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปโหลดสลิปได้",
        variant: "destructive",
      })
    }
    setUploading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "expired":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">สมาชิกภาพ</h1>
            <p className="text-slate-500 mt-1 font-medium">จัดการสถานะสมาชิกภาพและแพ็คเกจการใช้งานของคุณ</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">Secure Payment</span>
          </div>
        </div>

        {userMembership && (
          <Card className="border-none shadow-lg shadow-blue-900/5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Crown className="h-6 w-6 text-yellow-300" />
                </div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight">{userMembership.user_category}</CardTitle>
              </div>
              <CardDescription className="text-blue-100 font-medium">ข้อมูลสมาชิกภาพปัจจุบันของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                  <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">ประเภทสมาชิก</p>
                  <p className="text-xl font-black uppercase">{userMembership.type}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                  <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">วันหมดอายุ</p>
                  <p className="text-xl font-black">{new Date(userMembership.expires_at).toLocaleDateString("th-TH")}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                  <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">สถานะ</p>
                  <Badge className={`${getStatusColor(userMembership.status)} border-none font-black text-[10px] px-4 py-1.5 rounded-full uppercase self-start mt-1`}>
                    {userMembership.status === "active" ? "ใช้งานได้" : userMembership.status === "expired" ? "หมดอายุ" : "รอดำเนินการ"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 bg-blue-600 rounded-full" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">แพ็คเกจราคาแนะนำ</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {userMembership && userMembership.user_category && (
              <>
                {/* Session Card */}
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all group border border-slate-100 flex flex-col">
                  <div className="h-2 bg-blue-400" />
                  <CardHeader className="text-center pt-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Star className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900">ชำระรายครั้ง</CardTitle>
                    <CardDescription className="font-bold text-blue-600 uppercase text-xs tracking-widest mt-1">Pay per session</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-black text-slate-900">฿{userMembership.pay_per_session_price.toLocaleString()}</span>
                        <span className="text-slate-400 font-bold uppercase text-xs">/ ครั้ง</span>
                      </div>
                      <p className="text-slate-500 text-sm mt-3 font-medium px-4">เหมาะสำหรับการเข้าใช้งานชั่วคราว ไม่ต้องมีข้อผูกมัดรายปี</p>
                    </div>
                    <Button 
                      onClick={() => handleOpenPaymentModal('session', userMembership.pay_per_session_price, userCategories.find(c => c.name === userMembership.user_category)?.id || 0)}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest mt-4"
                    >
                      เลือกแพ็คเกจนี้
                    </Button>
                  </CardContent>
                </Card>

                {/* Annual Card */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all group border-2 border-blue-600 flex flex-col relative scale-105 z-10">
                  <div className="absolute top-0 right-0">
                    <div className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">Recommended</div>
                  </div>
                  <div className="h-2 bg-blue-600" />
                  <CardHeader className="text-center pt-10">
                    <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform">
                      <Crown className="h-10 w-10" />
                    </div>
                    <CardTitle className="text-2xl font-black text-slate-900">สมาชิกรายปี</CardTitle>
                    <CardDescription className="font-bold text-blue-600 uppercase text-xs tracking-widest mt-1">Annual Membership</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-black text-slate-900">฿{userMembership.annual_price.toLocaleString()}</span>
                        <span className="text-slate-400 font-bold uppercase text-xs">/ ปี</span>
                      </div>
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-2 text-slate-600 text-sm font-bold justify-center">
                          <Check className="h-4 w-4 text-emerald-500" /> ใช้งานได้ไม่จำกัดจำนวนครั้ง
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-sm font-bold justify-center">
                          <Check className="h-4 w-4 text-emerald-500" /> จองตู้เก็บของได้ฟรี
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 text-sm font-bold justify-center">
                          <Check className="h-4 w-4 text-emerald-500" /> สิทธิพิเศษอื่นๆ อีกมากมาย
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleOpenPaymentModal('annual', userMembership.annual_price, userCategories.find(c => c.name === userMembership.user_category)?.id || 0)}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 mt-4"
                      disabled={userMembership.type === 'Annual' && userMembership.status === 'active'}
                    >
                      {userMembership.type === 'Annual' && userMembership.status === 'active' ? "ใช้งานอยู่" : "สมัครสมาชิกรายปี"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Charter Card - New */}
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all group border border-slate-100 flex flex-col">
                  <div className="h-2 bg-indigo-600" />
                  <CardHeader className="text-center pt-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Shield className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900">เหมาสระว่ายน้ำ</CardTitle>
                    <CardDescription className="font-bold text-indigo-600 uppercase text-xs tracking-widest mt-1">Pool Charter</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-black text-slate-900">฿10,000</span>
                        <span className="text-slate-400 font-bold uppercase text-xs">/ วัน</span>
                      </div>
                      <p className="text-slate-500 text-sm mt-3 font-medium px-4">ปิดสระว่ายน้ำเพื่อใช้งานส่วนตัว พร้อมล็อกตู้เก็บของทั้งหมด</p>
                    </div>
                    <Button 
                      onClick={() => window.location.href = '/reservations'}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest mt-4"
                    >
                      จองเหมาสระ
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Dialog - Modernized */}
      <Dialog open={!!paymentModal} onOpenChange={(open) => !open && setPaymentModal(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <div className="h-2 bg-blue-600" />
          <div className="p-8">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                ชำระเงิน <span className="text-blue-600">{paymentModal?.type === 'annual' ? 'สมาชิกรายปี' : 'รายครั้ง'}</span>
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-400 uppercase text-xs tracking-widest">
                Payment Verification System
              </DialogDescription>
            </DialogHeader>

            {paymentStep === "choose" && (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">ยอดชำระทั้งสิ้น</span>
                    <span className="text-3xl font-black text-slate-900">฿{paymentModal?.price.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">เลือกช่องทางชำระเงิน</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-1 gap-3">
                    <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`} onClick={() => setPaymentMethod('cash')}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-tight">เงินสด (ชำระที่เคาน์เตอร์)</span>
                      </div>
                      <RadioGroupItem value="cash" className="sr-only" />
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'bank_transfer' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`} onClick={() => setPaymentMethod('bank_transfer')}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'bank_transfer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <Calendar className="h-5 w-5" />
                        </div>
                        <span className="font-black text-slate-900 uppercase tracking-tight">โอนเงินผ่านธนาคาร</span>
                      </div>
                      <RadioGroupItem value="bank_transfer" className="sr-only" />
                    </div>
                  </RadioGroup>
                </div>

                <Button onClick={handleCreatePayment} className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200" disabled={!paymentMethod || !!purchasing}>
                  {purchasing ? "กำลังประมวลผล..." : "ยืนยันช่องทางชำระเงิน"}
                </Button>
              </div>
            )}

            {paymentStep === "upload" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="p-6 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mb-2">บัญชีสำหรับโอนเงิน</p>
                  <p className="text-2xl font-black tracking-wider">{bankAccountNumber}</p>
                  <p className="text-xs font-bold mt-2 text-blue-100">ธนาคารไทยพาณิชย์ (SCB)</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">อัปโหลดหลักฐานการโอนเงิน (สลิป)</Label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <input type="file" ref={fileInputRef} onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="hidden" accept="image/*" />
                    {slipFile ? (
                      <div className="flex items-center justify-center gap-2 text-blue-600 font-black uppercase text-sm">
                        <Check className="h-5 w-5" /> {slipFile.name}
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:scale-110 transition-transform">
                          <Plus className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">คลิกเพื่อเลือกไฟล์รูปภาพ</p>
                      </>
                    )}
                  </div>
                </div>

                <Button onClick={handleUploadSlip} className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200" disabled={!slipFile || uploading}>
                  {uploading ? "กำลังอัปโหลด..." : "ส่งหลักฐานการโอนเงิน"}
                </Button>
              </div>
            )}

            {paymentStep === "pending" && (
              <div className="text-center py-10 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                  <Clock className="h-10 w-10 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">รอการตรวจสอบ</h3>
                <p className="text-slate-500 font-medium px-8">ระบบได้รับข้อมูลการชำระเงินของคุณแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบและอนุมัติภายใน 24 ชม.</p>
                <Button onClick={() => setPaymentModal(null)} className="mt-8 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-10 font-black uppercase tracking-widest">
                  ตกลง
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </UserLayout>
  )
}
