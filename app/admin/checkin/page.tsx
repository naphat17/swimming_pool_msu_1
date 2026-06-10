"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  Key, 
  Droplets,
  RefreshCcw,
  Search,
  Check,
  X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface UserReservation {
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  pool_reservations: Array<{
    id: number
    pool_name: string
    start_time: string
    end_time: string
    status: string
    checked_in: boolean
  }>
  locker_reservations: Array<{
    id: number
    locker_number: string
    status: string
    checked_in: boolean
  }>
}

interface TodayData {
  date: string
  total_reservations: number
  reservations: UserReservation[]
}

const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().split("T")[0]
}

export default function AdminCheckinPage() {
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all')
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString())
  const { toast } = useToast()

  const fetchReservations = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/checkin?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setTodayData(data)
        if (isManual) {
          toast({ title: "โหลดข้อมูลสำเร็จ", description: "อัปเดตรายการจองล่าสุดแล้ว" })
        }
      } else {
        setTodayData({
          date: selectedDate,
          total_reservations: 0,
          reservations: []
        })
      }
    } catch (error) {
      setTodayData({
        date: selectedDate,
        total_reservations: 0,
        reservations: []
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCheckin = async (type: 'pool' | 'locker', id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/checkin/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      })

      if (response.ok) {
        toast({ title: "เช็คอินสำเร็จ", description: "บันทึกการเข้าใช้บริการเรียบร้อยแล้ว" })
        fetchReservations()
      } else {
        toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเช็คอินได้", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", variant: "destructive" })
    }
  }

  useEffect(() => {
    fetchReservations()
  }, [selectedDate])

  const filteredReservations = todayData?.reservations.filter(res => {
    const fullName = `${res.first_name} ${res.last_name}`.toLowerCase()
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) ||
      res.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.phone.includes(searchQuery)
    
    const hasPool = res.pool_reservations.length > 0
    const hasLocker = res.locker_reservations.length > 0
    const allPoolCheckedIn = hasPool ? res.pool_reservations.every(p => p.checked_in) : true
    const allLockerCheckedIn = hasLocker ? res.locker_reservations.every(l => l.checked_in) : true
    const allCheckedIn = allPoolCheckedIn && allLockerCheckedIn
    
    let matchesFilter = true
    if (checkInFilter === 'checked_in') {
      matchesFilter = allCheckedIn
    } else if (checkInFilter === 'not_checked_in') {
      matchesFilter = !allCheckedIn
    }
    
    return matchesSearch && matchesFilter
  }) || []

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Calendar className="h-10 w-10 text-blue-600" /> เช็คการเข้าใช้<span className="text-blue-600">บริการ</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">ตรวจสอบการจองสระว่ายน้ำและตู้เก็บของ</p>
          </div>
          <div className="flex flex-col md:flex-row items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">เลือกวันที่</label>
              <Input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-14 bg-white border-slate-200 rounded-2xl font-bold text-slate-700 px-4 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
               <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border border-blue-100 shadow-sm">
                 <span className="mr-2">{todayData?.total_reservations || 0}</span> รายการ
               </div>
               <Button 
                 onClick={() => fetchReservations(true)} 
                 variant="outline" 
                 className="h-14 px-6 rounded-2xl border-blue-100 text-blue-700 hover:bg-blue-50 font-black uppercase tracking-widest text-xs gap-2"
                 disabled={refreshing}
               >
                 <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
               </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl shadow-blue-100/50 bg-gradient-to-br from-blue-50 to-white rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">รวมรายการจองทั้งหมด</p>
                  <p className="text-5xl font-black text-blue-600">{todayData?.total_reservations || 0}</p>
                </div>
                <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl shadow-cyan-100/50 bg-gradient-to-br from-cyan-50 to-white rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">จองสระว่ายน้ำ</p>
                  <p className="text-5xl font-black text-cyan-600">
                    {filteredReservations.filter(r => r.pool_reservations.length > 0).length}
                  </p>
                </div>
                <div className="w-16 h-16 bg-cyan-600/10 rounded-3xl flex items-center justify-center">
                  <Droplets className="h-8 w-8 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl shadow-amber-100/50 bg-gradient-to-br from-amber-50 to-white rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">จองตู้เก็บของ</p>
                  <p className="text-5xl font-black text-amber-600">
                    {filteredReservations.filter(r => r.locker_reservations.length > 0).length}
                  </p>
                </div>
                <div className="w-16 h-16 bg-amber-600/10 rounded-3xl flex items-center justify-center">
                  <Key className="h-8 w-8 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and List */}
        <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" /> รายชื่อผู้มาจอง
                </CardTitle>
                <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                  วันที่ {todayData?.date ? new Date(todayData.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </CardDescription>
              </div>
              <div className="flex flex-col md:flex-row items-end gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input 
                    placeholder="ค้นหาด้วยชื่อ, นามสกุล, อีเมล..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 px-8 pt-2">
              <Button
                variant={checkInFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCheckInFilter('all')}
                className={`h-9 rounded-xl text-xs font-bold uppercase tracking-wider ${checkInFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                ทั้งหมด
              </Button>
              <Button
                variant={checkInFilter === 'checked_in' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCheckInFilter('checked_in')}
                className={`h-9 rounded-xl text-xs font-bold uppercase tracking-wider ${checkInFilter === 'checked_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                เช็คอินแล้ว
              </Button>
              <Button
                variant={checkInFilter === 'not_checked_in' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCheckInFilter('not_checked_in')}
                className={`h-9 rounded-xl text-xs font-bold uppercase tracking-wider ${checkInFilter === 'not_checked_in' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                ยังไม่เช็คอิน
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8 pt-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-300">
                <Calendar className="h-16 w-16 stroke-[1px]" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">{searchQuery ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการจองในวันนี้'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReservations.map((reservation) => {
                  const hasPool = reservation.pool_reservations.length > 0
                  const hasLocker = reservation.locker_reservations.length > 0
                  const allPoolCheckedIn = hasPool ? reservation.pool_reservations.every(p => p.checked_in) : true
                  const allLockerCheckedIn = hasLocker ? reservation.locker_reservations.every(l => l.checked_in) : true
                  const allCheckedIn = allPoolCheckedIn && allLockerCheckedIn
                  
                  return (
                    <div key={reservation.user_id} className="group p-6 rounded-3xl bg-slate-50/50 border border-slate-100 hover:bg-blue-50/30 hover:border-blue-100 transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-200">
                            {reservation.first_name[0]}{reservation.last_name[0]}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-900 text-lg leading-tight group-hover:text-blue-700 transition-colors">
                                {reservation.first_name} {reservation.last_name}
                              </p>
                              {allCheckedIn && (
                                <Badge className="bg-emerald-500 text-white border-none text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1 flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> เช็คอินแล้ว
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {reservation.phone}
                              </span>
                              <span>{reservation.email}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          {/* Reservation Details */}
                          <div className="flex items-center gap-4">
                            {hasPool && (
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">จองสระ</span>
                                <div className="flex flex-wrap gap-2 justify-end">
                                  {reservation.pool_reservations.map((pool, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <Badge className={`${pool.checked_in ? 'bg-emerald-500' : 'bg-cyan-500'} text-white border-none text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1`}>
                                        {pool.pool_name} · {pool.start_time.substring(0, 5)} - {pool.end_time.substring(0, 5)}
                                      </Badge>
                                      {!pool.checked_in && (
                                        <Button 
                                          size="sm" 
                                          className="h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black px-3"
                                          onClick={() => handleCheckin('pool', pool.id)}
                                        >
                                          เช็คอิน
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {hasLocker && (
                              <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ตู้เก็บ</span>
                                <div className="flex flex-wrap gap-2 justify-end">
                                  {reservation.locker_reservations.map((locker, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <Badge className={`${locker.checked_in ? 'bg-emerald-500' : 'bg-amber-500'} text-white border-none text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1`}>
                                        ตู้ #{locker.locker_number}
                                      </Badge>
                                      {!locker.checked_in && (
                                        <Button 
                                          size="sm" 
                                          className="h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black px-3"
                                          onClick={() => handleCheckin('locker', locker.id)}
                                        >
                                          เช็คอิน
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
