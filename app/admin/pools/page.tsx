"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, MapPin, Users, Settings } from "lucide-react"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
interface Pool {
  id: number
  name: string
  description: string
  capacity: number
  status: string
  schedules?: Array<{
    day_of_week: string
    open_time: string
    close_time: string
    is_active: boolean
  }>
}

const dayNames = {
  monday: "จันทร์",
  tuesday: "อังคาร",
  wednesday: "พุธ",
  thursday: "พฤหัสบดี",
  friday: "ศุกร์",
  saturday: "เสาร์",
  sunday: "อาทิตย์",
}

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

export default function AdminPoolsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPool, setEditingPool] = useState<Pool | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [newPoolData, setNewPoolData] = useState({
    name: "",
    description: "",
    capacity: 10,
    status: "available",
  })
  const [schedules, setSchedules] = useState(
    daysOfWeek.map((day) => ({
      day_of_week: day,
      open_time: "06:00",
      close_time: "22:00",
      is_active: true,
    })),
  )
  const { toast } = useToast()

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    fetchPools()
  }, [user, router])

  const fetchPools = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:3001/api/admin/pools", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setPools(data.pools || [])
      }
    } catch (error) {
      console.error("Error fetching pools:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPoolSchedule = async (poolId: number) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:3001/api/admin/pools/${poolId}/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error fetching pool schedule:", error)
    }
  }

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:3001/api/admin/pools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPoolData),
      })

      if (response.ok) {
        toast({
          title: "เพิ่มสระสำเร็จ",
          description: "สระใหม่ได้รับการเพิ่มเข้าสู่ระบบแล้ว",
        })
        setDialogOpen(false)
        setNewPoolData({
          name: "",
          description: "",
          capacity: 10,
          status: "available",
        })
        fetchPools()
      } else {
        const errorData = await response.json()
        toast({
          title: "เพิ่มสระไม่สำเร็จ",
          description: errorData.message || "เกิดข้อผิดพลาด",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มสระได้",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPool) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:3001/api/admin/pools/${editingPool.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingPool.name,
          description: editingPool.description,
          capacity: editingPool.capacity,
          status: editingPool.status,
        }),
      })

      if (response.ok) {
        toast({
          title: "อัปเดตสระสำเร็จ",
          description: "ข้อมูลสระได้รับการอัปเดตแล้ว",
        })
        setEditingPool(null)
        fetchPools()
      } else {
        toast({
          title: "อัปเดตไม่สำเร็จ",
          description: "ไม่สามารถอัปเดตข้อมูลได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลได้",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPool) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:3001/api/admin/pools/${selectedPool.id}/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schedules }),
      })

      if (response.ok) {
        toast({
          title: "อัปเดตตารางเวลาสำเร็จ",
          description: "ตารางเวลาได้รับการอัปเดตแล้ว",
        })
        setScheduleDialogOpen(false)
        setSelectedPool(null)
        fetchPools()
      } else {
        toast({
          title: "อัปเดตไม่สำเร็จ",
          description: "ไม่สามารถอัปเดตตารางเวลาได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตตารางเวลาได้",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800"
      case "closed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "เปิดใช้งาน"
      case "maintenance":
        return "ปิดซ่อมบำรุง"
      case "closed":
        return "ปิดใช้งาน"
      default:
        return status
    }
  }

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการสระและทรัพยากร</h1>
            <p className="text-gray-600">จัดการข้อมูลสระว่ายน้ำและตารางเวลา</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มสระใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>เพิ่มสระใหม่</DialogTitle>
                <DialogDescription>กรอกข้อมูลสระว่ายน้ำใหม่</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePool} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อสระ</Label>
                  <Input
                    id="name"
                    value={newPoolData.name}
                    onChange={(e) => setNewPoolData({ ...newPoolData, name: e.target.value })}
                    required
                    placeholder="เช่น สระหลัก, สระเด็ก"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Input
                    id="description"
                    value={newPoolData.description}
                    onChange={(e) => setNewPoolData({ ...newPoolData, description: e.target.value })}
                    placeholder="คำอธิบายเพิ่มเติม"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">ความจุ (คน)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newPoolData.capacity}
                    onChange={(e) => setNewPoolData({ ...newPoolData, capacity: Number.parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">สถานะ</Label>
                  <Select
                    value={newPoolData.status}
                    onValueChange={(value) => setNewPoolData({ ...newPoolData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">เปิดใช้งาน</SelectItem>
                      <SelectItem value="maintenance">ปิดซ่อมบำรุง</SelectItem>
                      <SelectItem value="closed">ปิดใช้งาน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">เพิ่มสระ</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => (
            <Card key={pool.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                      {pool.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{pool.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(pool.status)}>{getStatusText(pool.status)}</Badge>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  ความจุ: {pool.capacity} คน
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingPool(pool)} className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPool(pool)
                      fetchPoolSchedule(pool.id)
                      setScheduleDialogOpen(true)
                    }}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    ตารางเวลา
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {pools.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีสระ</h3>
              <p className="text-gray-600 mb-4">เริ่มต้นด้วยการเพิ่มสระว่ายน้ำแรก</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มสระใหม่
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Pool Dialog */}
        <Dialog open={!!editingPool} onOpenChange={() => setEditingPool(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>แก้ไขข้อมูลสระ</DialogTitle>
            </DialogHeader>
            {editingPool && (
              <form onSubmit={handleUpdatePool} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">ชื่อสระ</Label>
                  <Input
                    id="edit_name"
                    value={editingPool.name}
                    onChange={(e) => setEditingPool({ ...editingPool, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_description">คำอธิบาย</Label>
                  <Input
                    id="edit_description"
                    value={editingPool.description}
                    onChange={(e) => setEditingPool({ ...editingPool, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_capacity">ความจุ (คน)</Label>
                  <Input
                    id="edit_capacity"
                    type="number"
                    value={editingPool.capacity}
                    onChange={(e) => setEditingPool({ ...editingPool, capacity: Number.parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_status">สถานะ</Label>
                  <Select
                    value={editingPool.status}
                    onValueChange={(value) => setEditingPool({ ...editingPool, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">เปิดใช้งาน</SelectItem>
                      <SelectItem value="maintenance">ปิดซ่อมบำรุง</SelectItem>
                      <SelectItem value="closed">ปิดใช้งาน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditingPool(null)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">บันทึก</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>จัดการตารางเวลา</DialogTitle>
              <DialogDescription>ตั้งค่าเวลาเปิด-ปิดสำหรับ {selectedPool?.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSchedule} className="space-y-4">
              <div className="space-y-4">
                {schedules.map((schedule, index) => (
                  <div key={schedule.day_of_week} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-20">
                      <span className="font-medium">{dayNames[schedule.day_of_week as keyof typeof dayNames]}</span>
                    </div>
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => {
                        const newSchedules = [...schedules]
                        newSchedules[index].is_active = checked
                        setSchedules(newSchedules)
                      }}
                    />
                    {schedule.is_active && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`open_${schedule.day_of_week}`} className="text-sm">
                            เปิด:
                          </Label>
                          <Input
                            id={`open_${schedule.day_of_week}`}
                            type="time"
                            value={schedule.open_time}
                            onChange={(e) => {
                              const newSchedules = [...schedules]
                              newSchedules[index].open_time = e.target.value
                              setSchedules(newSchedules)
                            }}
                            className="w-24"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`close_${schedule.day_of_week}`} className="text-sm">
                            ปิด:
                          </Label>
                          <Input
                            id={`close_${schedule.day_of_week}`}
                            type="time"
                            value={schedule.close_time}
                            onChange={(e) => {
                              const newSchedules = [...schedules]
                              newSchedules[index].close_time = e.target.value
                              setSchedules(newSchedules)
                            }}
                            className="w-24"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึกตารางเวลา</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
