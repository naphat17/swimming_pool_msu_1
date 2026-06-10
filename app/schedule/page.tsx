"use client"

import { useEffect, useState } from "react"
import UserLayout from "@/components/user-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Users } from "lucide-react"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
interface PoolSchedule {
  id: number
  name: string
  description: string
  capacity: number
  status: string
  schedules: Array<{
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

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<PoolSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch(`${API_URL}/api/pool-schedule`)
        if (response.ok) {
          const data = await response.json()
          setSchedules(data.schedules || [])
        }
      } catch (error) {
        console.error("Error fetching schedules:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchedules()
  }, [])

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

  // Filter เฉพาะสระหลัก (เช่น สระหลัก)
  const filteredSchedules = schedules.filter(
    (pool) => !["สระเด็ก", "สระออกกำลังกาย", "สระจากุซซี่"].some((name) => pool.name.includes(name))
  )

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ตารางเวลาสระว่ายน้ำ</h1>
          <p className="text-gray-600">ตารางเวลาเปิด-ปิด และสถานะของสระว่ายน้ำแต่ละสระ</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSchedules.map((pool) => (
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
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">ตารางเวลาเปิด-ปิด</h4>
                  {pool.schedules && pool.schedules.length > 0 ? (
                    <div className="space-y-2">
                      {pool.schedules.map((schedule, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded ${schedule.is_active ? "bg-green-50" : "bg-gray-50"}`}
                        >
                          <span className="text-sm font-medium">
                            {dayNames[schedule.day_of_week as keyof typeof dayNames] || schedule.day_of_week}
                          </span>
                          <div className="flex items-center">
                            {schedule.is_active ? (
                              <>
                                <Clock className="h-4 w-4 mr-1 text-green-600" />
                                <span className="text-sm text-green-700">
                                  {schedule.open_time} - {schedule.close_time}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500">ปิด</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">ไม่มีข้อมูลตารางเวลา</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {schedules.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มีข้อมูลตารางเวลา</h3>
              <p className="text-gray-600">กรุณาติดต่อเจ้าหน้าที่เพื่อสอบถามข้อมูลเพิ่มเติม</p>
            </CardContent>
          </Card>
        )}

        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลทั่วไป</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">เวลาทำการ</h4>
                <p className="text-sm text-gray-600">จันทร์ - อาทิตย์: 06:00 - 22:00</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">การจองล่วงหน้า</h4>
                <p className="text-sm text-gray-600">สามารถจองได้สูงสุด 7 วันล่วงหน้า</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">การยกเลิกการจอง</h4>
                <p className="text-sm text-gray-600">สามารถยกเลิกได้ก่อนเวลาใช้งาน 2 ชั่วโมง</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">ติดต่อสอบถาม</h4>
                <p className="text-sm text-gray-600">โทร: 02-xxx-xxxx</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  )
}
