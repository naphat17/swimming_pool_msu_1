"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Check, X, Trash2 } from "lucide-react"
import { useRef } from "react"
import { Dialog as BaseDialog } from "@/components/ui/dialog"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface Reservation {
  id: number
  user_name: string
  user_email: string
  pool_name: string
  reservation_date: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  created_at: string
  payment_id?: number
  payment_amount?: number
  payment_status?: string
  payment_method?: string
  slip_url?: string
}

interface LockerReservation {
  id: number
  user_id: number
  username: string
  first_name: string
  last_name: string
  user_email: string
  locker_id: number
  locker_code: string
  location: string
  reservation_date: string
  start_time: string
  end_time: string
  status: string
  created_at: string
  payment_id?: number
  payment_amount?: number
  payment_status?: string
  payment_method?: string
  slip_url?: string
}

interface Pool {
  id: number
  name: string
  capacity: number
  status: string
}

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().split("T")[0]
}

export default function AdminReservationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [lockerReservations, setLockerReservations] = useState<LockerReservation[]>([])
  const [pools, setPools] = useState<Pool[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newReservationData, setNewReservationData] = useState({
    user_id: "",
    pool_resource_id: "",
    reservation_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  })
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const slipInputRef = useRef<HTMLInputElement>(null)
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipUrl, setSlipUrl] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    fetchReservations()
    fetchLockerReservations()
    fetchPools()
    fetchUsers()
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/bank_account_number`)
        if (res.ok) {
          const data = await res.json()
          setBankAccountNumber(data.value)
        }
      } catch {}
    })()
  }, [user, router])

  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/reservations`, {
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

  const fetchLockerReservations = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/locker-reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setLockerReservations(data.reservations || [])
      }
    } catch (error) {
      console.error("Error fetching locker reservations:", error)
    }
  }

  const fetchPools = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/pools`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setPools(data.pools || [])
      }
    } catch (error) {
      console.error("Error fetching pools:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/users?role=user`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("token")
      // ส่ง payment_method ไปด้วย
      const response = await fetch(`${API_URL}/api/admin/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newReservationData,
          user_id: Number.parseInt(newReservationData.user_id),
          pool_resource_id: Number.parseInt(newReservationData.pool_resource_id),
          reservation_date: newReservationData.reservation_date,
          start_time: newReservationData.start_time,
          end_time: newReservationData.end_time,
          notes: newReservationData.notes,
          payment_method: paymentMethod,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // ถ้าเลือกโอนเงิน ให้ upload slip ต่อ
        if (paymentMethod === "bank_transfer" && slipFile && data.paymentId) {
          const formData = new FormData()
          formData.append("slip", slipFile)
          await fetch(`${API_URL}/api/payments/${data.paymentId}/upload-slip`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
        }
        toast({
          title: "สร้างการจองสำเร็จ",
          description: "การจองใหม่ได้รับการสร้างแล้ว",
        })
        setDialogOpen(false)
        setNewReservationData({
          user_id: "",
          pool_resource_id: "",
          reservation_date: "",
          start_time: "",
          end_time: "",
          notes: "",
        })
        setPaymentMethod("cash")
        setSlipFile(null)
        if (slipInputRef.current) slipInputRef.current.value = ""
        fetchReservations()
      } else {
        const errorData = await response.json()
        toast({
          title: "สร้างการจองไม่สำเร็จ",
          description: errorData.message || "เกิดข้อผิดพลาด",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างการจองได้",
        variant: "destructive",
      })
    }
  }

  const handleUpdateReservationStatus = async (reservationId: number, status: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/reservations/${reservationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({
          title: "อัปเดตสถานะสำเร็จ",
          description: `สถานะการจองได้รับการเปลี่ยนเป็น ${getStatusText(status)}`,
        })
        fetchReservations()
      } else {
        toast({
          title: "อัปเดตไม่สำเร็จ",
          description: "ไม่สามารถอัปเดตสถานะได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      })
    }
  }

  const handleUpdateLockerReservationStatus = async (reservationId: number, status: "confirmed" | "cancelled") => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/locker-reservations/${reservationId}/confirm`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (response.ok) {
        toast({ title: "อัปเดตสถานะสำเร็จ", description: `สถานะการจองตู้ถูกเปลี่ยนเป็น ${getStatusText(status)}` })
        fetchLockerReservations()
      } else {
        toast({ title: "อัปเดตไม่สำเร็จ", description: "ไม่สามารถอัปเดตสถานะการจองตู้ได้", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปเดตสถานะการจองตู้ได้", variant: "destructive" })
    }
  }

  const handleDeleteLockerReservation = async (reservationId: number) => {
    if (!confirm("ต้องการลบการจองตู้เก็บของนี้หรือไม่?")) return
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/locker-reservations/${reservationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        toast({ title: "ลบสำเร็จ", description: "ลบการจองตู้เก็บของแล้ว" })
        fetchLockerReservations()
      } else {
        toast({ title: "ลบไม่สำเร็จ", description: "ไม่สามารถลบรายการได้", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบรายการได้", variant: "destructive" })
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-300"
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "cancelled": return "bg-red-100 text-red-800 border-red-300"
      case "completed": return "bg-blue-100 text-blue-800 border-blue-300"
      default: return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const paymentStatusColor = (status?: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-300"
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "failed": return "bg-red-100 text-red-800 border-red-300"
      case "refunded": return "bg-blue-100 text-blue-800 border-blue-300"
      default: return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "ยืนยันแล้ว"
      case "pending":
        return "รอยืนยัน"
      case "cancelled":
        return "ยกเลิก"
      case "completed":
        return "เสร็จสิ้น"
      default:
        return status
    }
  }

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case "credit_card":
        return "บัตรเครดิต"
      case "bank_transfer":
        return "โอนเงิน"
      case "cash":
        return "เงินสด"
      default:
        return method || "-"
    }
  }

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.pool_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter
    const matchesDate = !dateFilter || reservation.reservation_date === dateFilter

    return matchesSearch && matchesStatus && matchesDate
  })

  const filteredLockerReservations = lockerReservations.filter((r) => {
    const matchesSearch =
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.locker_code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    const matchesDate = !dateFilter || r.reservation_date === dateFilter

    return matchesSearch && matchesStatus && matchesDate
  })

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (user?.role !== "admin") {
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify_between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการการจอง</h1>
            <p className="text-gray-600">จัดการและอนุมัติการจองใช้งานสระว่ายน้ำ และตู้เก็บของ พร้อมสถานะการชำระเงิน</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                สร้างการจองใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>สร้างการจองใหม่</DialogTitle>
                <DialogDescription>สร้างการจองสำหรับสมาชิก</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateReservation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">เลือกสมาชิก</Label>
                  <Select
                    value={newReservationData.user_id}
                    onValueChange={(value) => setNewReservationData({ ...newReservationData, user_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสมาชิก" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pool_resource_id">เลือกสระ</Label>
                  <Select
                    value={newReservationData.pool_resource_id}
                    onValueChange={(value) => setNewReservationData({ ...newReservationData, pool_resource_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสระ" />
                    </SelectTrigger>
                    <SelectContent>
                      {pools
                        .filter((pool) => pool.status === "available")
                        .map((pool) => (
                          <SelectItem key={pool.id} value={pool.id.toString()}>
                            {pool.name} (ความจุ: {pool.capacity} คน)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservation_date">วันที่</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={newReservationData.reservation_date}
                    onChange={(e) => setNewReservationData({ ...newReservationData, reservation_date: e.target.value })}
                    min={getLocalDateString()}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">เวลาเริ่ม</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={newReservationData.start_time}
                      onChange={(e) => setNewReservationData({ ...newReservationData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">เวลาสิ้นสุด</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={newReservationData.end_time}
                      onChange={(e) => setNewReservationData({ ...newReservationData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Input
                    id="notes"
                    value={newReservationData.notes}
                    onChange={(e) => setNewReservationData({ ...newReservationData, notes: e.target.value })}
                    placeholder="หมายเหตุเพิ่มเติม"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">วิธีชำระเงิน</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกวิธีชำระเงิน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">เงินสด</SelectItem>
                      <SelectItem value="bank_transfer">โอนผ่านบัญชีธนาคาร</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === "bank_transfer" && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">บัญชีสำหรับโอน: <strong>{bankAccountNumber}</strong></p>
                    <Label htmlFor="slip">อัปโหลดหลักฐานการชำระเงิน (สลิป)</Label>
                    <input
                      ref={slipInputRef}
                      type="file"
                      accept="image/*"
                      id="slip"
                      className="block w-full border rounded px-2 py-1"
                      onChange={e => setSlipFile(e.target.files?.[0] || null)}
                      required
                    />
                </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">สร้างการจอง</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="ค้นหา: สมาชิก, อีเมล, สระ/ตู้..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="pending">รอดำเนินการ</SelectItem>
                  <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                  <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-40 rounded-lg border-gray-300" />
            </div>
          </CardContent>
        </Card>

        {/* Pool Reservations Table */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>การจองสระ ({filteredReservations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="rounded-lg overflow-hidden shadow-sm">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead>สมาชิก</TableHead>
                    <TableHead>สระ</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>เวลา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>วิธีชำระ</TableHead>
                    <TableHead>สถานะชำระ</TableHead>
                    <TableHead>Slip</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                    <TableHead>วันที่จอง</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((reservation, index) => (
                    <TableRow key={`pool-${reservation.id}-${reservation.payment_id ?? "none"}-${index}`} className="hover:bg-blue-50 transition-all">
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.user_name}</div>
                          <div className="text-sm text-gray-500">{reservation.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{reservation.pool_name}</TableCell>
                      <TableCell>{new Date(reservation.reservation_date).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>
                        {reservation.start_time} - {reservation.end_time}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${statusColor(reservation.status)}`}>{getStatusText(reservation.status)}</span>
                      </TableCell>
                      <TableCell>฿{reservation.payment_amount?.toLocaleString() || '-'}</TableCell>
                      <TableCell>{getPaymentMethodText(reservation.payment_method)}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${paymentStatusColor(reservation.payment_status)}`}>{reservation.payment_status || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {reservation.slip_url ? (
                          <Button size="sm" variant="outline" onClick={() => { setSlipUrl(reservation.slip_url?.startsWith("http") ? reservation.slip_url : `${API_URL}${reservation.slip_url}`); setSlipOpen(true) }}>ดูสลิป</Button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{reservation.notes || "-"}</TableCell>
                      <TableCell>{new Date(reservation.created_at).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {reservation.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="mb-1"
                                onClick={() => handleUpdateReservationStatus(reservation.id, "confirmed")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="mb-1"
                                onClick={() => handleUpdateReservationStatus(reservation.id, "cancelled")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {reservation.status === "confirmed" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mb-1"
                              onClick={() => handleUpdateReservationStatus(reservation.id, "completed")}
                            >
                              เสร็จสิ้น
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Locker Reservations Table */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>การจองตู้เก็บของ ({filteredLockerReservations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="rounded-lg overflow-hidden shadow-sm">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead>สมาชิก</TableHead>
                    <TableHead>ตู้</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>เวลา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>วิธีชำระ</TableHead>
                    <TableHead>สถานะชำระ</TableHead>
                    <TableHead>Slip</TableHead>
                    <TableHead>วันที่จอง</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLockerReservations.map((r, index) => (
                    <TableRow key={`locker-${r.id}-${r.payment_id ?? "none"}-${index}`} className="hover:bg-blue-50 transition-all">
                      <TableCell>
                        <div>
                          <div className="font-medium">{r.first_name} {r.last_name}</div>
                          <div className="text-sm text-gray-500">{r.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{r.locker_code} ({r.location})</TableCell>
                      <TableCell>{new Date(r.reservation_date).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>
                        {r.start_time} - {r.end_time}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${statusColor(r.status)}`}>{getStatusText(r.status)}</span>
                      </TableCell>
                      <TableCell>฿{r.payment_amount?.toLocaleString() || '-'}</TableCell>
                      <TableCell>{getPaymentMethodText(r.payment_method)}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 rounded border text-xs font-semibold ${paymentStatusColor(r.payment_status)}`}>{r.payment_status || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {r.slip_url ? (
                          <Button size="sm" variant="outline" onClick={() => { setSlipUrl(r.slip_url?.startsWith("http") ? r.slip_url : `${API_URL}${r.slip_url}`); setSlipOpen(true) }}>ดูสลิป</Button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {r.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="mb-1"
                                onClick={() => handleUpdateLockerReservationStatus(r.id, "confirmed")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="mb-1"
                                onClick={() => handleUpdateLockerReservationStatus(r.id, "cancelled")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLockerReservation(r.id)}
                            title="ลบการจอง"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <BaseDialog open={slipOpen} onOpenChange={setSlipOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>สลิปการชำระเงิน</DialogTitle>
            </DialogHeader>
            {slipUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slipUrl} alt="slip" className="w-full max-h-[70vh] object-contain border" />
            )}
          </DialogContent>
        </BaseDialog>
      </div>
    </AdminLayout>
  )
}
