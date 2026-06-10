"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Check, X, DollarSign, AlertCircle, Calendar, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface Payment {
  id: number
  user_name: string
  user_email: string
  amount: number
  status: string
  payment_method: string
  transaction_id: string
  created_at: string
  membership_type?: string
  notes?: string
  slip_url?: string
  payment_type: string
}

export default function AdminPaymentsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const { toast } = useToast()
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipUrl, setSlipUrl] = useState<string | null>(null)

  // Ensure numeric amount for correct calculations and rendering
  const normalizeAmount = (amount: unknown) => {
    const n = typeof amount === "number" ? amount : Number.parseFloat(String(amount ?? 0))
    return Number.isFinite(n) ? n : 0
  }

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    fetchPayments()
  }, [user, router, statusFilter, dateFilter])

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token")
      const queryParams = new URLSearchParams()
      if (dateFilter !== "all") {
        queryParams.append("dateFilter", dateFilter)
      }

      const url = `${API_URL}/api/admin/payments?${queryParams.toString()}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async (paymentId: number, status: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/payments/${paymentId}/confirm`, {
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
          description: `สถานะการชำระเงินได้รับการเปลี่ยนเป็น ${getStatusText(status)}`,
        })
        fetchPayments()
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

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "refunded":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "สำเร็จ"
      case "pending":
        return "รอดำเนินการ"
      case "failed":
        return "ไม่สำเร็จ"
      case "refunded":
        return "คืนเงิน"
      default:
        return status
    }
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "credit_card":
        return "บัตรเครดิต"
      case "bank_transfer":
        return "โอนเงิน"
      case "cash":
        return "เงินสด"
      default:
        return method
    }
  }

  // คำนวณรายได้รวมจาก payment ที่สำเร็จ
  const totalRevenue = payments.reduce((sum, p) => sum + (p.status === "completed" ? normalizeAmount(p.amount) : 0), 0)

  const pendingPayments = payments.filter((p) => p.status === "pending").length
  const completedPayments = payments.filter((p) => p.status === "completed").length
  const failedPayments = payments.filter((p) => p.status === "failed").length

  // สถิติตามประเภทการชำระ
  const poolReservations = payments.filter((p) => p.payment_type === "การจองสระว่ายน้ำ").length
  const lockerPayments = payments.filter((p) => p.payment_type === "การจองตู้เก็บของ").length
  const membershipPayments = payments.filter((p) => p.payment_type.includes("สมาชิกภาพ")).length

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
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              จัดการการชำระเงิน
            </h1>
            <p className="text-slate-500 mt-1 font-medium">จัดการและยืนยันการชำระเงินของสมาชิก</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">รายได้รวม</p>
                  <p className="text-3xl font-extrabold text-green-600 mt-2">฿{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                  <DollarSign className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">รอดำเนินการ</p>
                  <p className="text-3xl font-extrabold text-yellow-600 mt-2">{pendingPayments}</p>
                </div>
                <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">สำเร็จ</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">{completedPayments}</p>
                </div>
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <Check className="h-7 w-7 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-rose-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">ไม่สำเร็จ</p>
                  <p className="text-3xl font-extrabold text-rose-600 mt-2">{failedPayments}</p>
                </div>
                <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center">
                  <X className="h-7 w-7 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Type Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">การจองสระ</p>
                  <p className="text-3xl font-extrabold text-blue-600 mt-2">{poolReservations}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">การจองตู้</p>
                  <p className="text-3xl font-extrabold text-purple-600 mt-2">{lockerPayments}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <KeyRound className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">สมาชิกภาพ</p>
                  <p className="text-3xl font-extrabold text-orange-600 mt-2">{membershipPayments}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    placeholder="ค้นหาชื่อสมาชิก, อีเมล, รหัสอ้างอิง, หรือประเภท..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl text-base"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 h-14 bg-slate-50 border-slate-200 rounded-2xl">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all" className="rounded-xl font-medium">ทุกสถานะ</SelectItem>
                  <SelectItem value="pending" className="rounded-xl font-medium">รอดำเนินการ</SelectItem>
                  <SelectItem value="completed" className="rounded-xl font-medium">สำเร็จ</SelectItem>
                  <SelectItem value="failed" className="rounded-xl font-medium">ไม่สำเร็จ</SelectItem>
                  <SelectItem value="refunded" className="rounded-xl font-medium">คืนเงิน</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-48 h-14 bg-slate-50 border-slate-200 rounded-2xl">
                  <SelectValue placeholder="ช่วงเวลา" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all" className="rounded-xl font-medium">ทั้งหมด</SelectItem>
                  <SelectItem value="day" className="rounded-xl font-medium">วันนี้</SelectItem>
                  <SelectItem value="week" className="rounded-xl font-medium">สัปดาห์นี้</SelectItem>
                  <SelectItem value="month" className="rounded-xl font-medium">เดือนนี้</SelectItem>
                  <SelectItem value="year" className="rounded-xl font-medium">ปีนี้</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 px-8 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-xl font-bold text-slate-900">รายการการชำระเงิน ({filteredPayments.length})</CardTitle>
              <div className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">
                ทั้งหมดในช่วงเวลา: <span className="text-slate-900">{payments.length}</span> รายการ
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-slate-100">
                    <TableHead className="px-8 font-bold text-[12px] uppercase tracking-wider text-slate-500">สมาชิก</TableHead>
                    <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">ประเภท</TableHead>
                    <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">จำนวนเงิน</TableHead>
                    <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">วิธีชำระ</TableHead>
                    <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">รหัสอ้างอิง</TableHead>
                    <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">สถานะ</TableHead>
                    <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">วันที่</TableHead>
                    <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">Slip</TableHead>
                    <TableHead className="text-right px-8 font-bold text-[12px] uppercase tracking-wider text-slate-500">การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment, index) => (
                    <TableRow key={`${payment.id}-${index}`} className="border-slate-100 hover:bg-slate-50 transition-colors">
                      <TableCell className="px-8">
                        <div>
                          <div className="font-bold text-slate-900">{payment.user_name}</div>
                          <div className="text-sm text-slate-500">{payment.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-sm px-3 py-1 rounded-xl border-slate-200">
                          {payment.payment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-lg text-slate-900">฿{normalizeAmount(payment.amount).toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-slate-700">{getPaymentMethodText(payment.payment_method)}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">{payment.transaction_id}</TableCell>
                      <TableCell>
                        <Badge className={cn("border-none px-4 py-2 rounded-full font-bold text-[11px]", getStatusColor(payment.status))}>{getStatusText(payment.status)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{new Date(payment.created_at).toLocaleDateString("th-TH")}</TableCell>
                      <TableCell>
                        {payment.slip_url ? (
                          <Button size="sm" variant="outline" onClick={() => { setSlipUrl(payment.slip_url!); setSlipOpen(true) }} className="rounded-xl">ดูสลิป</Button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex space-x-2 justify-end">
                          {payment.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfirmPayment(payment.id, "completed")}
                                className="rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfirmPayment(payment.id, "failed")}
                                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {payment.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmPayment(payment.id, "refunded")}
                              className="rounded-xl"
                            >
                              คืนเงิน
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Dialog open={slipOpen} onOpenChange={setSlipOpen}>
                <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-extrabold text-slate-900">สลิปการชำระเงิน</DialogTitle>
                  </DialogHeader>
                  {slipUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200">
                      <img src={slipUrl.startsWith("http") ? slipUrl : `${API_URL}${slipUrl}`} alt="slip" className="w-full max-h-[80vh] object-contain" />
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
