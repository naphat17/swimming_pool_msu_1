"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Loader2, Calendar as CalendarIcon, KeyRound } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface Locker {
  id: number
  code: string
  location: string
  status: 'available' | 'maintenance' | 'unavailable'
  created_at: string
  updated_at: string
  is_reserved_on_selected_date?: boolean // New field for availability
}

export default function AdminLockersPage() {
  const [lockers, setLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentLocker, setCurrentLocker] = useState<Locker | null>(null)
  const [formCode, setFormCode] = useState("")
  const [formLocation, setFormLocation] = useState("")
  const [formStatus, setFormStatus] = useState<'available' | 'maintenance' | 'unavailable'>('available')
  const [submitting, setSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()) // State for date picker
  const { toast } = useToast()

  useEffect(() => {
    if (selectedDate) {
      fetchLockers(selectedDate)
    }
  }, [selectedDate])

  const fetchLockers = async (date: Date) => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const formattedDate = format(date, "yyyy-MM-dd")
      const response = await fetch(`/api/lockers?date=${formattedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setLockers(data.lockers || [])
      } else {
        toast({
          title: "ข้อผิดพลาด",
          description: "ไม่สามารถดึงข้อมูลตู้เก็บของได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching lockers:", error)
      toast({ 
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (locker: Locker | null = null) => {
    setCurrentLocker(locker)
    setFormCode(locker ? locker.code : "")
    setFormLocation(locker ? locker.location : "")
    setFormStatus(locker ? locker.status : 'available')
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setCurrentLocker(null)
    setFormCode("")
    setFormLocation("")
    setFormStatus('available')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const token = localStorage.getItem("token")

    const method = currentLocker ? "PUT" : "POST"
    const url = currentLocker ? `/api/lockers/${currentLocker.id}` : "/api/lockers"

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: formCode, location: formLocation, status: formStatus }),
      })

      if (response.ok) {
        toast({
          title: "สำเร็จ",
          description: `ตู้เก็บของถูก${currentLocker ? "อัปเดต" : "เพิ่ม"}เรียบร้อยแล้ว`,
        })
        handleCloseDialog()
        if (selectedDate) {
          fetchLockers(selectedDate)
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "ข้อผิดพลาด",
          description: errorData.message || "ไม่สามารถดำเนินการได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting locker:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return

    setLoading(true) // Show loading while deleting
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/lockers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast({
          title: "สำเร็จ",
          description: "ตู้เก็บของถูกลบเรียบร้อยแล้ว",
        })
        if (selectedDate) {
          fetchLockers(selectedDate)
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "ข้อผิดพลาด",
          description: errorData.message || "ไม่สามารถลบได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting locker:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-100 text-emerald-700';
      case 'maintenance': return 'bg-amber-100 text-amber-700';
      case 'unavailable': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              จัดการตู้เก็บของ
            </h1>
            <p className="text-slate-500 mt-1 font-medium">เพิ่ม แก้ไข หรือลบข้อมูลตู้เก็บของในระบบ</p>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[220px] justify-start text-left font-bold rounded-2xl border-slate-200 shadow-sm",
                    !selectedDate && "text-slate-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>เลือกวันที่</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-2xl font-bold px-6">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มตู้เก็บของใหม่
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">รายการตู้เก็บของ</CardTitle>
              </div>
              <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm">
                ทั้งหมด {lockers.length} ตู้
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              </div>
            ) : lockers.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-28 h-28 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-300">
                  <KeyRound className="h-14 w-14" />
                </div>
                <p className="text-slate-500 font-medium text-lg mb-2">ยังไม่มีข้อมูลตู้เก็บของ</p>
                <p className="text-slate-400 text-sm mb-6">เริ่มต้นด้วยการเพิ่มตู้เก็บของใหม่</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-slate-100">
                      <TableHead className="px-8 font-bold text-[12px] uppercase tracking-wider text-slate-500">รหัสตู้</TableHead>
                      <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">ตำแหน่ง</TableHead>
                      <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">สถานะ</TableHead>
                      <TableHead className="font-bold text-[12px] uppercase tracking-wider text-slate-500">ความว่าง (วันที่เลือก)</TableHead>
                      <TableHead className="text-right px-8 font-bold text-[12px] uppercase tracking-wider text-slate-500">การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockers.map((locker) => (
                      <TableRow key={locker.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell className="px-8 font-bold text-slate-900 text-lg">{locker.code}</TableCell>
                        <TableCell className="font-medium text-slate-600">{locker.location}</TableCell>
                        <TableCell>
                          <Badge className={cn("border-none px-4 py-2 rounded-full font-bold text-[11px]", getStatusBadgeColor(locker.status))}>
                            {locker.status === 'available' ? 'พร้อมใช้' : locker.status === 'maintenance' ? 'ซ่อมบำรุง' : 'ปิดใช้งาน'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {locker.is_reserved_on_selected_date ? (
                            <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 font-bold text-[11px] px-3 py-1 rounded-xl">ไม่ว่าง (มีคนจอง)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-bold text-[11px] px-3 py-1 rounded-xl">ว่าง</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-8 space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(locker)} className="h-10 w-10 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-slate-400">
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(locker.id)} className="h-10 w-10 rounded-xl hover:bg-rose-50 hover:text-rose-600 text-slate-400">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-slate-900">{currentLocker ? "แก้ไขตู้เก็บของ" : "เพิ่มตู้เก็บของใหม่"}</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">ระบุรายละเอียดข้อมูลตู้เก็บของ</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-bold text-slate-700 ml-1">รหัสตู้เก็บของ *</Label>
                <Input
                  id="code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  placeholder="เช่น L01"
                  className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-blue-500 transition-all text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-bold text-slate-700 ml-1">ตำแหน่ง/โซน *</Label>
                <Input
                  id="location"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  required
                  placeholder="เช่น Zone A"
                  className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-blue-500 transition-all text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-bold text-slate-700 ml-1">สถานะตู้</Label>
                <Select
                  value={formStatus}
                  onValueChange={(value: any) => setFormStatus(value)}
                >
                  <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-blue-500 transition-all">
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="available" className="rounded-xl font-medium">พร้อมใช้งาน</SelectItem>
                    <SelectItem value="maintenance" className="rounded-xl font-medium">อยู่ระหว่างซ่อมบำรุง</SelectItem>
                    <SelectItem value="unavailable" className="rounded-xl font-medium">ปิดใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button type="button" variant="ghost" onClick={handleCloseDialog} className="rounded-2xl font-bold text-slate-600 hover:bg-slate-100 h-12">
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold shadow-lg shadow-blue-200 h-12" disabled={submitting}>
                {submitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}


