"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import UserLayout from "@/components/user-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Users, AlertCircle, CreditCard, Clock } from "lucide-react"
import Link from "next/link"

interface DashboardData {
  membership: {
    type: string
    expires_at: string
    status: string
  } | null
  upcoming_reservations: Array<{
    id: number
    reservation_date: string
    start_time: string
    end_time: string
    pool_name: string
    status: string
  }>
  notifications: Array<{
    id: number
    title: string
    message: string
    created_at: string
    is_read: boolean
  }>
  usage_stats: {
    total_reservations: number
    this_month_reservations: number
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch("/api/user/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const dashboardData = await response.json()
          setData(dashboardData)
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("token")
          window.location.href = "/login"
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </UserLayout>
    )
  }

  const getMembershipStatusColor = (status: string) => {
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

  const getReservationStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <UserLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ยินดีต้อนรับ, <span className="text-blue-600">{user?.first_name}</span> 👋
            </h1>
            <p className="text-slate-500 mt-1 font-medium">ภาพรวมการใช้งานระบบสระว่ายน้ำโรจนากรของคุณ</p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl px-6">
            <Link href="/reservations">
              <Calendar className="mr-2 h-4 w-4" /> จองเวลาว่ายน้ำ
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-blue-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">สถานะสมาชิก</p>
                  <div className="mt-2">
                    {data?.membership ? (
                      <Badge className={`${getMembershipStatusColor(data.membership.status)} border-none px-3 py-1 rounded-full font-bold text-[11px]`}>
                        {data.membership.status === "active"
                          ? "ใช้งานได้"
                          : data.membership.status === "expired"
                            ? "หมดอายุ"
                            : "รอดำเนินการ"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full px-3 py-1">ไม่มีสมาชิกภาพ</Badge>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-emerald-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">การจองที่จะมาถึง</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{data?.upcoming_reservations?.length || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-violet-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">การใช้งานเดือนนี้</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{data?.usage_stats?.this_month_reservations || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-orange-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">การแจ้งเตือน</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">
                    {data?.notifications?.filter((n) => !n.is_read).length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Reservations */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">การจองที่จะมาถึง</CardTitle>
                    <CardDescription className="mt-1">รายการที่คุณจองไว้เร็วๆ นี้</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold">
                    <Link href="/reservations">ดูทั้งหมด</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data?.upcoming_reservations && data.upcoming_reservations.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {data.upcoming_reservations.map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-600">
                            <span className="text-[10px] font-bold uppercase">{new Date(reservation.reservation_date).toLocaleDateString('th-TH', { month: 'short' })}</span>
                            <span className="text-lg font-black leading-none">{new Date(reservation.reservation_date).getDate()}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{reservation.pool_name}</p>
                            <p className="text-sm text-slate-500 font-medium flex items-center">
                              <Clock className="mr-1.5 h-3.5 w-3.5" />
                              {reservation.start_time.substring(0, 5)} - {reservation.end_time.substring(0, 5)}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getReservationStatusColor(reservation.status)} border-none px-3 py-1 rounded-full font-bold text-[11px]`}>
                          {reservation.status === "confirmed"
                            ? "ยืนยันแล้ว"
                            : reservation.status === "pending"
                              ? "รอยืนยัน"
                              : "ยกเลิก"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Calendar className="h-10 w-10" />
                    </div>
                    <p className="text-slate-500 font-medium">ยังไม่มีรายการจองในขณะนี้</p>
                    <Button variant="link" asChild className="text-blue-600 font-bold mt-2">
                      <Link href="/reservations">คลิกเพื่อเริ่มจอง</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel: Membership & Notifications */}
          <div className="space-y-6">
            {/* Membership Status Card */}
            <Card className="border-none shadow-lg shadow-blue-900/5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> ข้อมูลสมาชิก
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.membership ? (
                  <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                      <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">ประเภทสมาชิก</p>
                      <p className="text-xl font-black">{data.membership.type}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">วันหมดอายุ</p>
                        <p className="font-bold">{new Date(data.membership.expires_at).toLocaleDateString("th-TH")}</p>
                      </div>
                      <Badge className="bg-white text-blue-700 border-none font-black text-[10px] px-3 py-1 rounded-full uppercase">
                        {data.membership.status === "active" ? "ใช้งานได้" : "รอดำเนินการ"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-blue-100 font-medium mb-4">คุณยังไม่มีสมาชิกภาพ</p>
                    <Button asChild className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none rounded-xl font-bold">
                      <Link href="/membership">สมัครสมาชิกตอนนี้</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Notifications */}
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" /> แจ้งเตือนล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data?.notifications && data.notifications.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {data.notifications.slice(0, 3).map((notif) => (
                      <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <p className={`text-sm font-bold ${notif.is_read ? 'text-slate-600' : 'text-slate-900'}`}>{notif.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-sm font-medium">ไม่มีการแจ้งเตือนใหม่</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UserLayout>
  )
}

