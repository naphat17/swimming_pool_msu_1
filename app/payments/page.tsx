"use client"

import { useEffect, useState } from "react"
import UserLayout from "@/components/user-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt, CreditCard, Calendar, ArrowUpRight, CheckCircle2, Clock, Wallet, Filter } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
interface Payment {
  id: number
  amount: any
  status: string
  payment_method: string
  transaction_id: string
  created_at: string
  membership_type?: string
  receipt_url?: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const normalizeAmount = (amount: unknown) => {
    const n = typeof amount === "number" ? amount : Number.parseFloat(String(amount ?? 0))
    return Number.isFinite(n) ? n : 0
  }

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`${API_URL}/api/payments/user`, {
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

    fetchPayments()
  }, [])

  const handleShowDetail = (payment: Payment) => {
    setSelectedPayment(payment)
    setDetailOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "failed":
        return "bg-rose-100 text-rose-700 border-rose-200"
      case "refunded":
        return "bg-blue-100 text-blue-700 border-blue-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
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
        return "โอนผ่านธนาคาร"
      case "cash":
        return "เงินสด"
      case "qr_code":
        return "QR Code"
      case "system":
        return "ระบบ (สมาชิกรายปี)"
      default:
        return method
    }
  }

  if (loading) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลการชำระเงิน...</p>
        </div>
      </UserLayout>
    )
  }

  const totalAmount = payments.reduce((sum, p) => sum + (p.status === "completed" ? normalizeAmount(p.amount) : 0), 0)
  const pendingPayments = payments.filter(p => p.status === 'pending')
  const completedPayments = payments.filter(p => p.status === 'completed')

  return (
    <UserLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ประวัติการชำระเงิน</h1>
            <p className="text-slate-500 mt-1 font-medium">จัดการรายการธุรกรรมของคุณ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200">
              <Filter className="h-4 w-4 mr-2" /> ตัวกรอง
            </Button>
          </div>
        </div>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-2xl shadow-blue-900/5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">ยอดชำระสะสม</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-blue-100">฿</span>
                    <span className="text-4xl font-black">{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Wallet className="h-7 w-7" />
                </div>
              </div>
              <div className="mt-6 flex items-center text-blue-100 text-sm font-medium">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span>อัปเดตล่าสุดวันนี้</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg shadow-slate-200 bg-white overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">รายการที่สำเร็จ</p>
                  <p className="text-4xl font-black text-slate-900">{completedPayments.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
              </div>
              <p className="mt-6 text-slate-400 text-sm font-medium">รายการที่ตรวจสอบเรียบร้อยแล้ว</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg shadow-slate-200 bg-white overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">รอดำเนินการ</p>
                  <p className="text-4xl font-black text-slate-900">{pendingPayments.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock className="h-7 w-7" />
                </div>
              </div>
              <p className="mt-6 text-slate-400 text-sm font-medium">กรุณารอการตรวจสอบจากเจ้าหน้าที่</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="space-y-6">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList className="bg-slate-100 p-1 rounded-2xl border-none h-12">
                <TabsTrigger value="all" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">ทั้งหมด</TabsTrigger>
                <TabsTrigger value="completed" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">สำเร็จแล้ว</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">รอดำเนินการ</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0 space-y-4">
              <PaymentList payments={payments} normalizeAmount={normalizeAmount} getStatusColor={getStatusColor} getStatusText={getStatusText} getPaymentMethodText={getPaymentMethodText} handleShowDetail={handleShowDetail} />
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0 space-y-4">
              <PaymentList payments={completedPayments} normalizeAmount={normalizeAmount} getStatusColor={getStatusColor} getStatusText={getStatusText} getPaymentMethodText={getPaymentMethodText} handleShowDetail={handleShowDetail} />
            </TabsContent>

            <TabsContent value="pending" className="mt-0 space-y-4">
              <PaymentList payments={pendingPayments} normalizeAmount={normalizeAmount} getStatusColor={getStatusColor} getStatusText={getStatusText} getPaymentMethodText={getPaymentMethodText} handleShowDetail={handleShowDetail} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Payment Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black tracking-tight">รายละเอียดการชำระเงิน</DialogTitle>
                <DialogDescription className="text-blue-100 font-bold text-[10px] uppercase tracking-[0.2em]">Payment Details</DialogDescription>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                <Receipt className="h-6 w-6 text-blue-200" />
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            {selectedPayment && (
              <>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ชื่อรายการ</p>
                      <p className="font-black text-slate-900 text-right">
                        {selectedPayment.membership_type ? `ค่าสมาชิก ${selectedPayment.membership_type}` : "ชำระค่าบริการ"}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">สถานะ</p>
                      <Badge className={getStatusColor(selectedPayment.status)}>
                        {getStatusText(selectedPayment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ข้อมูลการชำระ</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-600 text-sm">วันที่ชำระ</p>
                      <p className="font-black text-slate-900">
                        {new Date(selectedPayment.created_at).toLocaleDateString('th-TH', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <p className="font-bold text-slate-600 text-sm">วิธีการชำระ</p>
                      <p className="font-black text-slate-900 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        {getPaymentMethodText(selectedPayment.payment_method)}
                      </p>
                    </div>
                    {selectedPayment.transaction_id && (
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <p className="font-bold text-slate-600 text-sm">เลขที่ธุรกรรม</p>
                        <p className="font-mono text-slate-700 text-sm">{selectedPayment.transaction_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-dashed border-slate-100">
                  <div className="flex justify-between items-center">
                    <p className="font-black text-slate-900 uppercase tracking-widest text-lg">ยอดชำระ</p>
                    <p className="text-3xl font-black text-blue-600">
                      ฿{normalizeAmount(selectedPayment.amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  {selectedPayment.status === 'completed' && (
                    <div className="flex items-center gap-2 justify-center text-emerald-500 bg-emerald-50 py-2 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">ชำระเงินสำเร็จแล้ว</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-14 rounded-2xl border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs"
                      onClick={() => setDetailOpen(false)}
                    >
                      ปิด
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </UserLayout>
  )
}

function PaymentList({ payments, normalizeAmount, getStatusColor, getStatusText, getPaymentMethodText, handleShowDetail }: any) {
  if (payments.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-200 shadow-none rounded-3xl">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
            <Receipt className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">ไม่พบรายการชำระเงิน</h3>
          <p className="text-slate-500 font-medium text-center max-w-xs">
            คุณยังไม่มีประวัติการชำระเงินในหมวดหมู่นี้
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {payments.map((payment: any, index: number) => (
        <Card key={`${payment.id}-${index}`} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row md:items-center">
              {/* Left Side - Status Color Bar */}
              <div className={`w-full md:w-2 h-2 md:h-24 ${payment.status === 'completed' ? 'bg-emerald-500' : payment.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'}`} />
              
              <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-50 transition-colors shrink-0">
                    <Receipt className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-lg">
                        {payment.membership_type ? `ค่าสมาชิก ${payment.membership_type}` : "ชำระค่าบริการ"}
                      </h3>
                      <Badge className={`${getStatusColor(payment.status)} border rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-tight`}>
                        {getStatusText(payment.status)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{getPaymentMethodText(payment.payment_method)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(payment.created_at).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                    {payment.transaction_id && (
                      <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">Ref: {payment.transaction_id}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-none pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">ยอดเงินสุทธิ</p>
                    <p className="text-2xl font-black text-slate-900">
                      <span className="text-sm mr-0.5">฿</span>
                      {normalizeAmount(payment.amount).toLocaleString()}
                    </p>
                  </div>
                  
                  {payment.status === "completed" && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleShowDetail(payment)}
                      className="rounded-xl border-slate-200 font-bold text-xs hover:bg-slate-50 hover:text-blue-600 transition-all px-4"
                    >
                      <Receipt className="h-3.5 w-3.5 mr-2" />
                      ดูรายละเอียด
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
