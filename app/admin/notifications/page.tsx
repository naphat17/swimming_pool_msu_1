'use client'

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface NotificationRow {
  id: number
  user_id: number
  title: string
  message: string
  is_read: 0 | 1
  created_at: string
  first_name: string
  last_name: string
  email: string
}

interface UserOption { id: number; name: string }

export default function AdminNotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [form, setForm] = useState({ user_id: "all", title: "", message: "" })
  const { toast } = useToast()

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }
    fetchNotifications()
    fetchUsers()
  }, [user, router, filter])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token")
      const query = new URLSearchParams()
      if (filter !== "all") query.append("is_read", filter)
      const res = await fetch(`${API_URL}/api/admin/notifications?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/admin/users?role=user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers((data.users || []).map((u: any) => ({ id: u.id, name: `${u.first_name} ${u.last_name} (${u.email})` })))
      }
    } catch {}
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: form.user_id === "all" ? "all" : Number.parseInt(form.user_id),
          title: form.title,
          message: form.message,
        }),
      })
      if (res.ok) {
        toast({ title: "ส่งแจ้งเตือนสำเร็จ" })
        setDialogOpen(false)
        setForm({ user_id: "all", title: "", message: "" })
        fetchNotifications()
      } else {
        toast({ title: "ส่งไม่สำเร็จ", variant: "destructive" })
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" })
    }
  }

  const updateRead = async (id: number, is_read: boolean) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/admin/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_read }),
      })
      if (res.ok) fetchNotifications()
    } catch {}
  }

  const deleteRow = async (id: number) => {
    if (!confirm("ต้องการลบการแจ้งเตือนนี้หรือไม่?")) return
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) fetchNotifications()
    } catch {}
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

  if (user?.role !== "admin") return null

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">การแจ้งเตือน</h1>
            <p className="text-gray-600">ส่ง/จัดการข้อความแจ้งเตือนถึงสมาชิก</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>ส่งแจ้งเตือน</Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4 items-center">
              <Label>สถานะ</Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="ทั้งหมด" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="false">ยังไม่อ่าน</SelectItem>
                  <SelectItem value="true">อ่านแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายการแจ้งเตือน ({notifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สมาชิก</TableHead>
                    <TableHead>หัวข้อ</TableHead>
                    <TableHead>ข้อความ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="font-medium">{n.first_name} {n.last_name}</div>
                        <div className="text-sm text-gray-500">{n.email}</div>
                      </TableCell>
                      <TableCell className="font-medium">{n.title}</TableCell>
                      <TableCell className="max-w-md truncate">{n.message}</TableCell>
                      <TableCell>{n.is_read ? "อ่านแล้ว" : "ยังไม่อ่าน"}</TableCell>
                      <TableCell>{new Date(n.created_at).toLocaleString("th-TH")}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!n.is_read ? (
                            <Button size="sm" onClick={() => updateRead(n.id, true)}>ทำเป็นอ่านแล้ว</Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => updateRead(n.id, false)}>ทำเป็นยังไม่อ่าน</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteRow(n.id)}>ลบ</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ส่งการแจ้งเตือน</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>สมาชิก</Label>
                <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="เลือกสมาชิก" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">สมาชิกทั้งหมด</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>หัวข้อ</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>ข้อความ</Label>
                <Input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
                <Button type="submit">ส่ง</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
