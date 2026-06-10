"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Plus, Trash2, CreditCard, Banknote, Upload, CheckCircle2, XCircle, Users, Clock, Trophy } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

import UserLayout from "@/components/user-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface PoolResource {
  id: number
  name: string
  capacity: number
  status: string
}

interface Reservation {
  id: number
  reservation_date: string
  status: string
  notes: string
  created_at: string
  pool_name: string
}

interface DailyUsage {
  date: string
  pool_id: number
  current_count: number
  max_capacity: number
  remaining: number
  is_full: boolean
}

export default function ReservationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const DAILY_MAX_ADVANCE_DAYS = 6
  const CHARTER_MIN_ADVANCE_DAYS = 7
  const CHARTER_MAX_ADVANCE_DAYS = 14
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [pools, setPools] = useState<PoolResource[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dailyUsage, setDailyUsage] = useState<DailyUsage | null>(null)
  const [newReservation, setNewReservation] = useState({
    pool_resource_id: "1",
    reservation_date: new Date(),
    payment_method: "cash",
    amount: "30",
    is_charter: false,
  })
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const slipInputRef = useRef<HTMLInputElement>(null)

  const getDateWindow = (isCharter: boolean) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const minDate = new Date(today)
    const maxDate = new Date(today)

    if (isCharter) {
      minDate.setDate(today.getDate() + CHARTER_MIN_ADVANCE_DAYS)
      maxDate.setDate(today.getDate() + CHARTER_MAX_ADVANCE_DAYS)
    } else {
      maxDate.setDate(today.getDate() + DAILY_MAX_ADVANCE_DAYS)
    }

    return { minDate, maxDate }
  }

  const clampReservationDate = (isCharter: boolean) => {
    const { minDate, maxDate } = getDateWindow(isCharter)
    const selectedDate = new Date(newReservation.reservation_date)
    selectedDate.setHours(0, 0, 0, 0)

    if (selectedDate < minDate || selectedDate > maxDate) {
      setNewReservation((prev) => ({
        ...prev,
        reservation_date: minDate,
        is_charter: isCharter,
        amount: isCharter ? "10000" : "30",
      }))
      return
    }

    setNewReservation((prev) => ({
      ...prev,
      is_charter: isCharter,
      amount: isCharter ? "10000" : "30",
    }))
  }

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/reservations/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setReservations(data.reservations || [])
      }
    } catch (error) {
      console.error("Error fetching reservations:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPools = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/pools`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setPools(data.pools?.filter((p: PoolResource) => p.id === 1) || [])
      }
    } catch (error) {
      console.error("Error fetching pools:", error)
    }
  }

  const fetchDailyUsage = async (date: Date, poolId: number) => {
    try {
      const token = localStorage.getItem("token")
      const dateStr = format(date, "yyyy-MM-dd")
      const response = await fetch(`${API_URL}/api/reservations/daily-usage?date=${dateStr}&pool_id=${poolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setDailyUsage(data)
      }
    } catch (error) {
      console.error("Error fetching daily usage:", error)
    }
  }

  useEffect(() => {
    if (newReservation.pool_resource_id && !newReservation.is_charter) {
      fetchDailyUsage(newReservation.reservation_date, Number(newReservation.pool_resource_id))
    } else {
      setDailyUsage(null)
    }
  }, [newReservation.reservation_date, newReservation.pool_resource_id, newReservation.is_charter])

  const handleCreateReservation = async () => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pool_resource_id: Number(newReservation.pool_resource_id),
          reservation_date: format(newReservation.reservation_date, "yyyy-MM-dd"),
          start_time: "06:00:00",
          end_time: "22:00:00",
          notes: newReservation.is_charter ? "เหมาสระ" : "",
          payment_method: newReservation.payment_method,
          amount: Number(newReservation.amount),
          is_charter: newReservation.is_charter,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (newReservation.payment_method === "bank_transfer" && slipFile && data.paymentId) {
          const formData = new FormData()
          formData.append("slip", slipFile)
          await fetch(`${API_URL}/api/payments/${data.paymentId}/upload-slip`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
        }
        toast({ title: "จองสระสำเร็จ", description: data.message })
        setDialogOpen(false)
        setNewReservation({
          pool_resource_id: "1",
          reservation_date: new Date(),
          payment_method: "cash",
          amount: "30",
          is_charter: false,
        })
        setSlipFile(null)
        if (slipInputRef.current) slipInputRef.current.value = ""
        setDailyUsage(null)
        fetchReservations()
      } else {
        const data = await response.json()
        toast({ title: "จองไม่สำเร็จ", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถจองได้", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelReservation = async (id: number) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/reservations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        toast({ title: "ยกเลิกจองสำเร็จ", description: data.message })
        fetchReservations()
      } else {
        const data = await response.json()
        toast({ title: "ยกเลิกไม่สำเร็จ", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถยกเลิกได้", variant: "destructive" })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "ยืนยันแล้ว"
      case "pending":
        return "รอตรวจสอบ"
      case "cancelled":
        return "ยกเลิกแล้ว"
      case "completed":
        return "เสร็จสิ้น"
      default:
        return status
    }
  }

  useEffect(() => {
    fetchReservations()
    fetchPools()
  }, [])

  return (
    <UserLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">การจองของฉัน</h1>
            <p className="text-slate-500 mt-1 font-medium">ดูและจัดการการจองสระว่ายน้ำของคุณ</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-200 rounded-xl px-6 h-11">
                  <Plus className="w-4 h-4 mr-2" />
                  จองสระว่ายน้ำ
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] rounded-3xl border-slate-100 max-h-[85vh] overflow-y-auto">
                <DialogHeader className="pb-2 sticky top-0 bg-white z-10">
                  <DialogTitle className="text-xl flex items-center gap-2 font-bold text-slate-900">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-blue-600" />
                    </div>
                    จองสระว่ายน้ำ
                  </DialogTitle>
                  <DialogDescription className="text-slate-500">เลือกรูปแบบการจองและกรอกข้อมูล</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  {/* Booking Type Selection */}
                  <div className="grid gap-2">
                    <Label className="text-sm font-bold text-slate-800">ประเภทการจอง</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${
                          !newReservation.is_charter
                            ? "border-blue-600 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-400"
                        }`}
                        onClick={() => clampReservationDate(false)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Users className={`w-5 h-5 ${!newReservation.is_charter ? "text-blue-600" : "text-slate-500"}`} />
                          <span className={`font-bold ${!newReservation.is_charter ? "text-blue-900" : "text-slate-700"}`}>จองรายบุคคล</span>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-black text-slate-900">30 บาท</p>
                          <p className="text-xs text-slate-500 font-medium">ต่อครั้ง</p>
                        </div>
                        {!newReservation.is_charter && <CheckCircle2 className="w-5 h-5 text-blue-600 mt-2" />}
                      </div>
                      <div
                        className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${
                          newReservation.is_charter
                            ? "border-purple-600 bg-purple-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-purple-400"
                        }`}
                        onClick={() => clampReservationDate(true)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className={`w-5 h-5 ${newReservation.is_charter ? "text-purple-600" : "text-slate-500"}`} />
                          <span className={`font-bold ${newReservation.is_charter ? "text-purple-900" : "text-slate-700"}`}>เหมาสระ</span>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-black text-slate-900">10,000 บาท</p>
                          <p className="text-xs text-slate-500 font-medium">ต่อวัน</p>
                        </div>
                        {newReservation.is_charter && <CheckCircle2 className="w-5 h-5 text-purple-600 mt-2" />}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-sm font-bold text-slate-800">เลือกสระว่ายน้ำ</Label>
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-slate-700 font-bold">สระหลัก</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-sm font-bold text-slate-800">เลือกวันที่</Label>
                      <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                        <p className="text-slate-700 font-bold">
                          {format(newReservation.reservation_date, "d MMMM yyyy", { locale: th })}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-bold text-slate-800">ปรับแต่งวันที่</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-12 w-full justify-start text-left font-medium border-slate-200 rounded-xl hover:bg-slate-50">
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                            เปิดปฏิทิน
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 shadow-xl" align="start">
                          <Calendar
                            mode="single"
                            selected={newReservation.reservation_date}
                            onSelect={(date) => setNewReservation({ ...newReservation, reservation_date: date || new Date() })}
                            locale={th}
                            initialFocus
                            className="rounded-2xl"
                            disabled={(date) => {
                              const { minDate, maxDate } = getDateWindow(newReservation.is_charter)
                              return date < minDate || date > maxDate
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className={`rounded-2xl p-4 border ${newReservation.is_charter ? "bg-purple-50 border-purple-100" : "bg-blue-50 border-blue-100"}`}>
                    <p className={`text-sm font-bold ${newReservation.is_charter ? "text-purple-900" : "text-blue-900"}`}>
                      {newReservation.is_charter
                        ? `เหมาสระจองได้เฉพาะล่วงหน้า ${CHARTER_MIN_ADVANCE_DAYS}-${CHARTER_MAX_ADVANCE_DAYS} วัน`
                        : `จองรายวันได้เฉพาะล่วงหน้าไม่เกิน ${DAILY_MAX_ADVANCE_DAYS} วัน`}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {newReservation.is_charter
                        ? "ช่วง 7-14 วันถูกสงวนไว้สำหรับการเหมาสระเท่านั้น"
                        : "หากเป็นช่วง 7-14 วัน ระบบจะไม่อนุญาตให้จองรายวัน"}
                    </p>
                  </div>

                  {!newReservation.is_charter && dailyUsage && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="font-bold text-slate-800">จำนวนคนในวันนี้</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-white/70 px-2.5 py-1 rounded-full">สูงสุด 150 คน</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">ทั้งหมด</p>
                          <p className="text-3xl font-black text-slate-900">{dailyUsage.max_capacity}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">จองแล้ว</p>
                          <p className="text-3xl font-black text-orange-600">{dailyUsage.current_count}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                          <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">เหลือว่าง</p>
                          <p className={`text-3xl font-black ${dailyUsage.remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {dailyUsage.remaining}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              dailyUsage.is_full ? 'bg-red-500' : 
                              dailyUsage.remaining < 30 ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(dailyUsage.current_count / dailyUsage.max_capacity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      {dailyUsage.is_full ? (
                        <div className="mt-4 flex items-center gap-2.5 text-red-600 bg-red-100/80 p-3.5 rounded-xl">
                          <XCircle className="w-5 h-5" />
                          <span className="text-sm font-bold">สระเต็มแล้ว!</span>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center gap-2.5 text-green-600 bg-green-100/80 p-3.5 rounded-xl">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-bold">มีจองว่าง {dailyUsage.remaining} คน!</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label className="text-sm font-bold text-slate-800">วิธีการชำระเงิน</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${
                          newReservation.payment_method === "cash"
                            ? "border-blue-600 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-400"
                        }`}
                        onClick={() => setNewReservation({ ...newReservation, payment_method: "cash" })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                            <Banknote className={`w-5 h-5 ${newReservation.payment_method === "cash" ? "text-blue-600" : "text-slate-500"}`} />
                          </div>
                          <span className={`font-bold ${newReservation.payment_method === "cash" ? "text-blue-900" : "text-slate-700"}`}>เงินสด</span>
                        </div>
                        {newReservation.payment_method === "cash" && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div
                        className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${
                          newReservation.payment_method === "bank_transfer"
                            ? "border-blue-600 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-400"
                        }`}
                        onClick={() => setNewReservation({ ...newReservation, payment_method: "bank_transfer" })}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                            <CreditCard className={`w-5 h-5 ${newReservation.payment_method === "bank_transfer" ? "text-blue-600" : "text-slate-500"}`} />
                          </div>
                          <span className={`font-bold ${newReservation.payment_method === "bank_transfer" ? "text-blue-900" : "text-slate-700"}`}>โอนเงิน</span>
                        </div>
                        {newReservation.payment_method === "bank_transfer" && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                      </div>
                    </div>
                  </div>

                  {newReservation.payment_method === "bank_transfer" && (
                    <div className="grid gap-2">
                      <Label htmlFor="slip" className="text-sm font-bold text-slate-800">แนบหลักฐานการโอน</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            id="slip"
                            type="file"
                            accept="image/*"
                            ref={slipInputRef}
                            onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                            className="h-12 border-slate-200 rounded-xl"
                          />
                        </div>
                        {slipFile && (
                          <CheckCircle2 className="w-7 h-7 text-green-500" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price Display */}
                  <div className={`rounded-2xl p-5 ${newReservation.is_charter ? 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100'} shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">ราคารวม</span>
                      <span className="text-3xl font-black text-slate-900">{newReservation.amount.toLocaleString()} บาท</span>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-3 mt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                    className="h-12 rounded-xl"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    className={`${newReservation.is_charter ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-200' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-200'} text-white h-12 rounded-xl`}
                    onClick={handleCreateReservation}
                    disabled={
                      submitting || 
                      !newReservation.pool_resource_id || 
                      (newReservation.payment_method === "bank_transfer" && !slipFile) || 
                      (!newReservation.is_charter && dailyUsage?.is_full)
                    }
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        กำลังจอง...
                      </>
                    ) : (
                      "จองสระ"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => router.push("/schedule")} className="h-11 rounded-xl border-slate-200 hover:bg-slate-50">
              <CalendarIcon className="w-4 h-4 mr-2" />
              ดูตารางเวลา
            </Button>
          </div>
        </div>

        {/* Reservations List */}
        <div className="grid gap-5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader>
                  <Skeleton className="h-7 w-1/3 rounded-xl" />
                  <Skeleton className="h-5 w-1/4 rounded-lg mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-5 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))
          ) : reservations.length === 0 ? (
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="py-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <CalendarIcon className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">ยังไม่มีการจอง</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">คุณยังไม่ได้จองสระว่ายน้ำ</p>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-200 rounded-xl px-8 h-12"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  จองสระว่ายน้ำ
                </Button>
              </CardContent>
            </Card>
          ) : (
            reservations.map((reservation) => (
              <Card key={reservation.id} className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold text-slate-900">{reservation.pool_name}</CardTitle>
                        {reservation.notes && reservation.notes.includes("เหมาสระ") && (
                          <Badge className="bg-purple-100 text-purple-800 border-none font-bold">เหมาสระ</Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center mt-2 text-slate-500 font-medium">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(new Date(reservation.reservation_date), "d MMMM yyyy", { locale: th })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`px-4 py-1.5 text-sm font-bold rounded-full ${getStatusColor(reservation.status)} border-none`}>
                        {getStatusText(reservation.status)}
                      </Badge>
                      {reservation.status === "pending" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelReservation(reservation.id)}
                          className="h-10 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          ยกเลิก
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </UserLayout>
  )
}
