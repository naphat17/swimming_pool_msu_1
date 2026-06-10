"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import UserLayout from "@/components/user-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Calendar as CalendarIcon, Plus, Trash2, Shield, CreditCard, Clock, Check, Lock, Unlock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface Locker {
  id: number
  code: string
  location: string
  status: string
  current_status: string // 'available', 'reserved', 'maintenance'
}

interface LockerReservation {
  id: number
  locker_code: string
  reservation_date: string
  start_time: string
  end_time: string
  status: string
}

const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().split("T")[0]
}

export default function LockerReservationsPage() {
  const [lockerReservations, setLockerReservations] = useState<LockerReservation[]>([])
  const [allLockers, setAllLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedLocker, setSelectedLocker] = useState("")
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  // Payment states (fixed amount 30 THB)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const slipInputRef = useRef<HTMLInputElement>(null)
  const [bankAccountNumber, setBankAccountNumber] = useState("")

  useEffect(() => {
    fetchLockerReservations()
    fetchBankAccountNumber()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchLockersStatus()
    }
  }, [selectedDate])

  const fetchLockerReservations = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/lockers/reservations/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setLockerReservations(data.reservations || [])
      }
    } catch (error) {
      console.error("Error fetching locker reservations:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLockersStatus = async () => {
    try {
      const response = await fetch(`/api/lockers/status?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setAllLockers(data.lockers || [])
      }
    } catch (error) {
      console.error("Error fetching lockers status:", error)
    }
  }

  const fetchBankAccountNumber = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/bank_account_number`)
      if (response.ok) {
        const data = await response.json()
        setBankAccountNumber(data.value)
      }
    } catch (error) {
      console.error("Error fetching bank account number:", error)
    }
  }

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLocker || !selectedDate) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "เลือกตู้และวันที่ที่ต้องการจอง",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const token = localStorage.getItem("token")

      if (!token) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "กรุณาเข้าสู่ระบบใหม่",
          variant: "destructive",
        })
        window.location.href = "/login"
        return
      }

      const response = await fetch(`${API_URL}/api/lockers/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locker_id: Number.parseInt(selectedLocker),
          reservation_date: selectedDate,
          payment_method: paymentMethod,
          amount: 30,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (paymentMethod === "bank_transfer" && slipFile && data.paymentId) {
          const formData = new FormData()
          formData.append("slip", slipFile)
          await fetch(`/api/payments/${data.paymentId}/upload-slip`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
        }
        toast({
          title: "จองตู้สำเร็จ",
          description: "การจองตู้ของคุณถูกบันทึกแล้ว",
        })
        setDialogOpen(false)
        setSelectedLocker("")
        setPaymentMethod("cash")
        setSlipFile(null)
        if (slipInputRef.current) slipInputRef.current.value = ""
        fetchLockerReservations()
        fetchLockersStatus()
      } else {
        const errorData = await response.json()
        toast({
          title: "จองตู้ไม่สำเร็จ",
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelReservation = async (reservationId: number) => {
    if (!confirm("คุณต้องการยกเลิกการจองตู้นี้หรือไม่?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/lockers/reservations/${reservationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast({
          title: "ยกเลิกการจองตู้สำเร็จ",
          description: "การจองตู้ได้รับการยกเลิกแล้ว",
        })
        fetchLockerReservations()
        fetchLockersStatus()
      } else {
        toast({
          title: "ยกเลิกไม่สำเร็จ",
          description: "ไม่สามารถยกเลิกการจองตู้ได้",
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
  }

  const handleLockerClick = (locker: Locker) => {
    if (locker.current_status === 'available') {
      setSelectedLocker(locker.id.toString())
      setDialogOpen(true)
    } else if (locker.current_status === 'reserved') {
      toast({
        title: "ตู้ไม่ว่าง",
        description: "ตู้นี้มีผู้ใช้งานอื่นจองไว้แล้วในวันที่เลือก",
      })
    } else {
      toast({
        title: "ปิดปรับปรุง",
        description: "ตู้นี้ไม่พร้อมใช้งานชั่วคราว",
        variant: "destructive",
      })
    }
  }

  return (
    <UserLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">จองตู้เก็บของ</h1>
            <p className="text-slate-500 mt-1 font-medium">จองและจัดการตู้เก็บของเพื่อความปลอดภัยของสิ่งของ</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getLocalDateString()}
                className="h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 font-bold pr-10 shadow-sm"
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Banner Section */}
        <Card className="border-none shadow-lg shadow-blue-900/5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-1">บริการตู้เก็บของ</h2>
                <p className="text-blue-100 font-medium max-w-md">ตู้นิรภัยสำหรับทรัพย์สินของคุณ มีระบบล็อคที่ปลอดภัย ใช้งานได้ตลอดทั้งวันที่จอง</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-blue-100 text-[9px] font-black uppercase tracking-widest mb-1">ราคา</p>
                <p className="text-lg font-black tracking-tight">฿30 / วัน</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-blue-100 text-[9px] font-black uppercase tracking-widest mb-1">ความปลอดภัย</p>
                <p className="text-lg font-black tracking-tight flex items-center justify-center gap-1">
                  <Check className="h-4 w-4" /> AUTO
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locker Grid Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-blue-600 rounded-full" />
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">ตู้เก็บของทั้งหมด</h2>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ว่าง</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-rose-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ไม่ว่าง</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ปรับปรุง</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {allLockers.map((locker) => (
              <div 
                key={locker.id}
                onClick={() => handleLockerClick(locker)}
                className={`
                  relative p-6 rounded-2xl border-2 transition-all cursor-pointer group flex flex-col items-center justify-center text-center
                  ${locker.current_status === 'available' ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-200/50' : ''}
                  ${locker.current_status === 'reserved' ? 'bg-rose-50/50 border-rose-100 hover:border-rose-200 cursor-not-allowed' : ''}
                  ${locker.current_status === 'maintenance' ? 'bg-amber-50/50 border-amber-100 hover:border-amber-200 cursor-not-allowed' : ''}
                `}
              >
                <div className={`mb-3 p-3 rounded-xl ${
                  locker.current_status === 'available' ? 'bg-emerald-100 text-emerald-600' :
                  locker.current_status === 'reserved' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {locker.current_status === 'available' ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <p className="text-lg font-black text-slate-900 leading-none mb-1">{locker.code}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-3">{locker.location}</p>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  locker.current_status === 'available' ? 'bg-emerald-500 text-white' :
                  locker.current_status === 'reserved' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {locker.current_status === 'available' ? 'ว่าง' : locker.current_status === 'reserved' ? 'ไม่ว่าง' : 'ปรับปรุง'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* My Reservations Section */}
        <div className="space-y-6 pt-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 bg-indigo-600 rounded-full" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">รายการจองของฉัน</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lockerReservations.length > 0 ? (
              lockerReservations.map((reservation) => (
                <Card key={reservation.id} className="border-none shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all group">
                  <div className={`h-1.5 w-full ${
                    reservation.status === 'confirmed' ? 'bg-emerald-500' : 
                    reservation.status === 'pending' ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex flex-col items-center justify-center text-indigo-600">
                        <span className="text-[9px] font-black uppercase tracking-tighter">
                          {new Date(reservation.reservation_date).toLocaleDateString('th-TH', { month: 'short' })}
                        </span>
                        <span className="text-lg font-black leading-none">{new Date(reservation.reservation_date).getDate()}</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`border-none px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider ${
                          reservation.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 
                          reservation.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {reservation.status === 'confirmed' ? 'ยืนยันแล้ว' : reservation.status === 'pending' ? 'รอยืนยัน' : 'ยกเลิก'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleCancelReservation(reservation.id)}
                          className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">{reservation.locker_code}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locker Reservation</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                  <Lock className="h-10 w-10" />
                </div>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">ยังไม่มีรายการจองตู้เก็บของ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <div className="h-2 bg-blue-600" />
          <div className="p-8">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">ยืนยันการจองตู้เก็บของ</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 uppercase text-xs tracking-widest">Secure Locker Booking System</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmitReservation} className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">รหัสตู้ที่เลือก</span>
                  <span className="text-xl font-black text-slate-900">{allLockers.find(l => l.id.toString() === selectedLocker)?.code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">วันที่เข้าใช้</span>
                  <span className="text-xl font-black text-slate-900">{new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">ค่าบริการ</span>
                  <span className="text-2xl font-black text-blue-600">฿30.00</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">เลือกช่องทางชำระเงิน</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className={`rounded-xl font-bold h-11 transition-all ${paymentMethod === 'cash' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                  >
                    เงินสด
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`rounded-xl font-bold h-11 transition-all ${paymentMethod === 'bank_transfer' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                  >
                    โอนเงิน
                  </Button>
                </div>
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-600 uppercase">โอนเข้าบัญชี (SCB)</span>
                    <span className="text-sm font-black text-blue-700">{bankAccountNumber}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slip" className="text-[10px] font-black text-slate-400 uppercase ml-1">อัปโหลดสลิปหลักฐาน</Label>
                    <Input 
                      id="slip" 
                      type="file" 
                      accept="image/*"
                      ref={slipInputRef}
                      onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                      className="h-auto py-2 text-xs bg-white rounded-xl border-blue-200"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-slate-400">
                  ยกเลิก
                </Button>
                <Button type="submit" className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" disabled={submitting}>
                  {submitting ? "กำลังดำเนินการ..." : "ยืนยันการจอง"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </UserLayout>
  )
}
