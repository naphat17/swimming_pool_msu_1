"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Users, Calendar, DollarSign, TrendingUp, Clock, AlertCircle, RefreshCcw, CreditCard, Power, Settings } from "lucide-react"
import Link from "next/link"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface DashboardStats {
  total_members: number
  active_members: number
  today_reservations: number
  monthly_revenue: number
}

interface RecentActivity {
  id: number
  type: string
  description: string
  created_at: string
  user_name?: string
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const token = localStorage.getItem("token")
      const [response, maintenanceRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/settings/maintenance_mode`)
      ])

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setActivities(data.recent_activities || [])
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token")
        window.location.href = "/login"
      }

      if (maintenanceRes.ok) {
        const data = await maintenanceRes.json()
        setMaintenanceMode(data.value === 'true')
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const toggleMaintenanceMode = async () => {
    try {
      const newValue = !maintenanceMode
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/settings/maintenance_mode`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ value: String(newValue) })
      })
      if (res.ok) {
        setMaintenanceMode(newValue)
        toast({
          title: newValue ? "เปิดระบบปิดปรับปรุงแล้ว" : "ปิดระบบปิดปรับปรุงแล้ว",
          description: newValue ? "ผู้ใช้งานจะไม่สามารถทำการจองใหม่ได้" : "ผู้ใช้งานสามารถใช้งานได้ตามปกติ",
        })
      }
    } catch (error) {
      console.error("Error toggling maintenance mode:", error)
    }
  }

  const { toast } = useToast()

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    if (user) {
      fetchDashboard()
    }
  }, [user, router])

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'reservation': return <Calendar className="h-4 w-4 text-purple-500" />
      case 'payment': return <CreditCard className="h-4 w-4 text-emerald-500" />
      default: return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'reservation': return 'bg-purple-500'
      case 'payment': return 'bg-emerald-500'
      default: return 'bg-slate-400'
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              Dashboard <span className="text-red-600">Overview</span>
            </h1>
            <p className="text-slate-500 mt-1 font-bold uppercase text-xs tracking-widest">ยินดีต้อนรับกลับมา, ผู้ดูแลระบบ</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-slate-200 font-bold text-xs uppercase tracking-wider"
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} /> 
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 rounded-xl font-bold text-xs uppercase tracking-wider px-5">
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="h-1.5 bg-blue-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">สมาชิกทั้งหมด</p>
                  <p className="text-3xl font-black text-slate-900">{stats?.total_members || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="h-1.5 bg-emerald-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Active Members</p>
                  <p className="text-3xl font-black text-emerald-600">{stats?.active_members || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="h-1.5 bg-purple-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">การจองวันนี้</p>
                  <p className="text-3xl font-black text-purple-600">{stats?.today_reservations || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="h-1.5 bg-orange-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">รายได้เดือนนี้</p>
                  <p className="text-3xl font-black text-orange-600">
                    ฿{(stats?.monthly_revenue || 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden h-full">
              <CardHeader className="border-b border-slate-50 pb-6 px-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">กิจกรรมล่าสุด</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Recent System Logs</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="text-red-600 hover:text-red-700 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest">
                    <Link href="/admin/activities">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activities.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {activities.map((activity, index) => (
                      <div key={`${activity.type}-${activity.id}-${index}`} className="flex items-start gap-4 p-6 hover:bg-slate-50/50 transition-colors">
                        <div className="mt-1 flex-shrink-0 relative">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getActivityColor(activity.type)} shadow-sm`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">{activity.description}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            {activity.user_name && (
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                                BY: {activity.user_name}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400 flex items-center uppercase">
                              <Clock className="mr-1 h-3 w-3" />
                              {new Date(activity.created_at).toLocaleString("th-TH")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                      <Clock className="h-10 w-10" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">ไม่มีกิจกรรมล่าสุด</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel: Status & Actions */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">สถานะระบบ</CardTitle>
                <Badge variant={maintenanceMode ? "destructive" : "outline"} className="text-[10px] font-black uppercase">
                  {maintenanceMode ? "ปิดปรับปรุง" : "ปกติ"}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  {[
                    { label: "ระบบการจอง", status: maintenanceMode ? "ปิดปรับปรุง" : "ปกติ", color: maintenanceMode ? "bg-red-500" : "bg-emerald-500" },
                    { label: "ระบบชำระเงิน", status: "ปกติ", color: "bg-emerald-500" },
                    { label: "ฐานข้อมูล", status: "ปกติ", color: "bg-emerald-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.color} animate-pulse`} />
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-slate-100 py-0.5">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-slate-50">
                    <Button 
                      onClick={toggleMaintenanceMode}
                      variant={maintenanceMode ? "default" : "destructive"} 
                      className={`w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] gap-2 transition-all ${maintenanceMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      <Power className="h-4 w-4" />
                      {maintenanceMode ? "เปิดใช้งานระบบ" : "ปิดปรับปรุงระบบ"}
                    </Button>
                    <p className="text-[9px] text-center text-slate-400 mt-3 font-bold uppercase tracking-tight">
                      * เมื่อปิดปรับปรุง ผู้ใช้จะไม่สามารถจองสระและตู้ได้
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg shadow-red-900/5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 rounded-full -mr-16 -mt-16 blur-3xl" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-500" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 mt-2">
                <Button asChild variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white justify-start h-auto py-3 px-3 rounded-xl group transition-all">
                  <Link href="/admin/members?add=1">
                    <div className="flex flex-col items-start gap-1">
                      <Users className="h-4 w-4 text-red-500 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-tight">เพิ่มสมาชิก</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white justify-start h-auto py-3 px-3 rounded-xl group transition-all">
                  <Link href="/admin/reservations">
                    <div className="flex flex-col items-start gap-1">
                      <Calendar className="h-4 w-4 text-purple-500 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-tight">จัดการการจอง</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white justify-start h-auto py-3 px-3 rounded-xl group transition-all">
                  <Link href="/admin/notifications">
                    <div className="flex flex-col items-start gap-1">
                      <AlertCircle className="h-4 w-4 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-tight">ส่งแจ้งเตือน</span>
                    </div>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white justify-start h-auto py-3 px-3 rounded-xl group transition-all">
                  <Link href="/admin/memberships">
                    <div className="flex flex-col items-start gap-1">
                      <CreditCard className="h-4 w-4 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-tight">อนุมัติสมาชิก</span>
                    </div>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
