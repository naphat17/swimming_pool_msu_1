"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { Search, Plus, Edit, Trash2, UserPlus, Shield, Mail, Phone, Calendar, Filter, MoreHorizontal, User as UserIcon, Check, X, CreditCard, Users, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: string
  status: string
  created_at: string
  id_card?: string
  address?: string
  date_of_birth?: string
  membership?: {
    type: string
    expires_at: string
    status: string
  }
}

interface MembershipType {
  id: number
  name: string
  duration_days: number
}

interface UserCategory {
  id: number
  name: string
  description: string
  pay_per_session_price: number
  annual_price: number
}

export default function AdminMembersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<User[]>([])
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [extendDialogOpen, setExtendDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    date_of_birth: "",
    id_card: "",
    user_category_id: "",
    role: "user",
  })
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])
  const [extendData, setExtendData] = useState({
    membership_type_id: "",
    duration_days: 30,
  })
  const { toast } = useToast()

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    const fetchData = async () => {
      setLoading(true)
      await Promise.all([
        fetchUsers(),
        fetchMembershipTypes(),
        fetchUserCategories()
      ])
      setLoading(false)
    }
    
    fetchData()

    const add = searchParams.get("add")
    if (add === "1") {
      setDialogOpen(true)
    }
  }, [user, router])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/users`, {
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

  const fetchMembershipTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/membership-types`)
      if (response.ok) {
        const data = await response.json()
        setMembershipTypes(data.membership_types || [])
      }
    } catch (error) {
      console.error("Error fetching membership types:", error)
    }
  }

  const fetchUserCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/memberships/categories`)
      if (response.ok) {
        const data = await response.json()
        setUserCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Error fetching user categories:", error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    if (newUserData.password !== newUserData.confirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณาตรวจสอบรหัสผ่านให้ตรงกัน",
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newUserData,
          user_category_id: parseInt(newUserData.user_category_id),
        }),
      })

      if (response.ok) {
        toast({ title: "เพิ่มผู้ใช้สำเร็จ", description: "ผู้ใช้ใหม่ได้รับการเพิ่มเข้าสู่ระบบแล้ว" })
        setDialogOpen(false)
        resetNewUserData()
        fetchUsers()
      } else {
        const errorData = await response.json()
        toast({ title: "เพิ่มผู้ใช้ไม่สำเร็จ", description: errorData.message || "เกิดข้อผิดพลาด", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเพิ่มผู้ใช้ได้", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const resetNewUserData = () => {
    setNewUserData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
      date_of_birth: "",
      id_card: "",
      user_category_id: "",
      role: "user",
    })
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSubmitting(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingUser),
      })

      if (response.ok) {
        toast({ title: "อัปเดตผู้ใช้สำเร็จ", description: "ข้อมูลผู้ใช้ได้รับการอัปเดตแล้ว" })
        setEditingUser(null)
        fetchUsers()
      } else {
        toast({ title: "อัปเดตไม่สำเร็จ", description: "ไม่สามารถอัปเดตข้อมูลได้", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปเดตข้อมูลได้", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("คุณต้องการลบผู้ใช้นี้หรือไม่? ข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบไปด้วย")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast({ title: "ลบผู้ใช้สำเร็จ", description: "ผู้ใช้ได้รับการลบออกจากระบบแล้ว" })
        fetchUsers()
      } else {
        toast({ title: "ลบไม่สำเร็จ", description: "ไม่สามารถลบผู้ใช้ได้", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบผู้ใช้ได้", variant: "destructive" })
    }
  }

  const handleExtendMembership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setSubmitting(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/users/${selectedUser.id}/extend-membership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(extendData),
      })

      if (response.ok) {
        toast({ title: "ต่ออายุสมาชิกสำเร็จ", description: "สมาชิกภาพได้รับการต่ออายุแล้ว" })
        setExtendDialogOpen(false)
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast({ title: "ต่ออายุไม่สำเร็จ", description: "ไม่สามารถต่ออายุสมาชิกได้", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถต่ออายุสมาชิกได้", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Active</Badge>
      case "inactive":
        return <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">Inactive</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 w-fit"><Shield className="h-3 w-3" /> Admin</Badge>
      case "user":
        return <Badge className="bg-blue-100 text-blue-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 w-fit"><UserIcon className="h-3 w-3" /> Member</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-none font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full w-fit">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-100 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">กำลังโหลดข้อมูลสมาชิก...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">User <span className="text-red-600">Management</span></h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">จัดการข้อมูลสมาชิก สิทธิ์การเข้าถึง และสมาชิกภาพ</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200 rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95">
                <Plus className="mr-2 h-5 w-5 stroke-[3px]" /> เพิ่มสมาชิกใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl p-0 rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              <div className="bg-gradient-to-br from-red-600 to-rose-700 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                <DialogTitle className="text-3xl font-black tracking-tight mb-2">เพิ่มผู้ใช้ใหม่</DialogTitle>
                <DialogDescription className="text-red-100 font-medium">กรอกข้อมูลพื้นฐานเพื่อสร้างบัญชีผู้ใช้งานใหม่ในระบบ</DialogDescription>
              </div>
              <form onSubmit={handleCreateUser} className="p-8 space-y-8">
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-8">
                    {/* Account Section */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Shield className="h-3 w-3" /> Account Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ชื่อผู้ใช้ *</Label>
                          <Input value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} required placeholder="username" className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">อีเมล *</Label>
                          <Input type="email" value={newUserData.email} onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} required placeholder="email@example.com" className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">รหัสผ่าน *</Label>
                          <Input type="password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} required className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ยืนยันรหัสผ่าน *</Label>
                          <Input type="password" value={newUserData.confirmPassword} onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })} required className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Personal Section */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <UserIcon className="h-3 w-3" /> Personal Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ชื่อจริง *</Label>
                          <Input value={newUserData.first_name} onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })} required className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">นามสกุล *</Label>
                          <Input value={newUserData.last_name} onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })} required className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">เบอร์โทรศัพท์</Label>
                          <Input value={newUserData.phone} onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })} className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">วันเกิด</Label>
                          <Input type="date" value={newUserData.date_of_birth} onChange={(e) => setNewUserData({ ...newUserData, date_of_birth: e.target.value })} className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">เลขบัตรประชาชน</Label>
                          <Input value={newUserData.id_card} onChange={(e) => setNewUserData({ ...newUserData, id_card: e.target.value })} className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ประเภทผู้ใช้ *</Label>
                          <Select value={newUserData.user_category_id} onValueChange={(v) => setNewUserData({ ...newUserData, user_category_id: v })}>
                            <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold">
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {userCategories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ที่อยู่</Label>
                        <Input value={newUserData.address} onChange={(e) => setNewUserData({ ...newUserData, address: e.target.value })} className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400">ยกเลิก</Button>
                  <Button type="submit" disabled={submitting} className="flex-[2] h-14 bg-red-600 hover:bg-red-700 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-200">
                    {submitting ? "กำลังบันทึก..." : "ยืนยันการเพิ่มสมาชิก"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] p-8 flex items-center gap-6 group hover:shadow-red-100 transition-all">
            <div className="w-16 h-16 rounded-[1.25rem] bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">TOTAL USERS</p>
              <h3 className="text-2xl font-black text-slate-900">{users.length}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] p-8 flex items-center gap-6 group hover:shadow-emerald-100 transition-all">
            <div className="w-16 h-16 rounded-[1.25rem] bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">ACTIVE</p>
              <h3 className="text-2xl font-black text-slate-900">{users.filter(u => u.status === 'active').length}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] p-8 flex items-center gap-6 group hover:shadow-indigo-100 transition-all">
            <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">ADMINS</p>
              <h3 className="text-2xl font-black text-slate-900">{users.filter(u => u.role === 'admin').length}</h3>
            </div>
          </Card>
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] p-8 flex items-center gap-6 group hover:shadow-amber-100 transition-all">
            <div className="w-16 h-16 rounded-[1.25rem] bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">MEMBERSHIP</p>
              <h3 className="text-2xl font-black text-slate-900">{users.filter(u => u.membership).length}</h3>
            </div>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-red-600 transition-colors" />
                <Input
                  placeholder="ค้นหาสมาชิกด้วย ชื่อ, อีเมล, หรือชื่อผู้ใช้..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-2xl border border-slate-100">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] border-none bg-transparent font-bold h-12 focus:ring-0">
                      <SelectValue placeholder="สถานะ" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="all">ทุกสถานะ</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-2xl border border-slate-100">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px] border-none bg-transparent font-bold h-12 focus:ring-0">
                      <SelectValue placeholder="บทบาท" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="all">ทุกบทบาท</SelectItem>
                      <SelectItem value="user">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">รายการสมาชิก ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-slate-100">
                    <TableHead className="px-8 py-5 font-black text-[11px] uppercase tracking-widest text-slate-400">สมาชิก</TableHead>
                    <TableHead className="py-5 font-black text-[11px] uppercase tracking-widest text-slate-400">การติดต่อ</TableHead>
                    <TableHead className="py-5 font-black text-[11px] uppercase tracking-widest text-slate-400">บทบาท/สถานะ</TableHead>
                    <TableHead className="py-5 font-black text-[11px] uppercase tracking-widest text-slate-400">สมาชิกภาพ</TableHead>
                    <TableHead className="py-5 font-black text-[11px] uppercase tracking-widest text-slate-400 text-right px-8">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group">
                        <TableCell className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 rounded-2xl shadow-sm border-2 border-white">
                              <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-black text-xs">
                                {user.first_name[0]}{user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5">
                              <p className="font-black text-slate-900 leading-none">{user.first_name} {user.last_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">@{user.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                              <Mail className="h-3 w-3 text-slate-400" /> {user.email}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                              <Phone className="h-3 w-3 text-slate-400" /> {user.phone || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col gap-2">
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user.status)}
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          {user.membership ? (
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 w-fit">
                              <div className="text-[10px] font-black uppercase tracking-widest text-red-600">{user.membership.type}</div>
                              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" /> หมดอายุ: {new Date(user.membership.expires_at).toLocaleDateString("th-TH")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">ไม่มีสมาชิกภาพ</span>
                          )}
                        </TableCell>
                        <TableCell className="py-5 text-right px-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
                                <MoreHorizontal className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-100 shadow-xl p-2">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setEditingUser(user)} className="rounded-xl py-3 cursor-pointer">
                                <Edit className="h-4 w-4 mr-3 text-blue-600" /> <span className="font-bold text-slate-700">แก้ไขข้อมูล</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedUser(user); setExtendDialogOpen(true); }} className="rounded-xl py-3 cursor-pointer">
                                <UserPlus className="h-4 w-4 mr-3 text-emerald-600" /> <span className="font-bold text-slate-700">ต่ออายุสมาชิก</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-50" />
                              <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="rounded-xl py-3 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                                <Trash2 className="h-4 w-4 mr-3" /> <span className="font-bold">ลบสมาชิก</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-32 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
                            <Users className="h-10 w-10" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-black text-slate-900 uppercase tracking-tight">ไม่พบข้อมูลสมาชิก</p>
                            <p className="text-xs font-bold text-slate-400">ลองค้นหาด้วยคำค้นอื่นหรือเปลี่ยนตัวกรอง</p>
                          </div>
                          <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setRoleFilter("all"); }} className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-slate-200">
                            รีเซ็ตตัวกรอง
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-md p-0 rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-8 text-white relative">
              <DialogTitle className="text-2xl font-black tracking-tight mb-1">แก้ไขข้อมูลสมาชิก</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">อัปเดตข้อมูลส่วนตัวและสถานะของสมาชิก</DialogDescription>
            </div>
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ชื่อ</Label>
                    <Input value={editingUser.first_name} onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })} required className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">นามสกุล</Label>
                    <Input value={editingUser.last_name} onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })} required className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">เบอร์โทรศัพท์</Label>
                  <Input value={editingUser.phone} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">สถานะสมาชิก</Label>
                  <Select value={editingUser.status} onValueChange={(v) => setEditingUser({ ...editingUser, status: v })}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400">ยกเลิก</Button>
                  <Button type="submit" disabled={submitting} className="flex-1 h-14 bg-slate-900 hover:bg-black rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl shadow-slate-200">
                    {submitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Extend Membership Dialog */}
        <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
          <DialogContent className="sm:max-w-md p-0 rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 p-8 text-white relative">
              <DialogTitle className="text-2xl font-black tracking-tight mb-1">ต่ออายุสมาชิกภาพ</DialogTitle>
              <DialogDescription className="text-emerald-100 font-medium">จัดการวันหมดอายุสำหรับคุณ {selectedUser?.first_name}</DialogDescription>
            </div>
            <form onSubmit={handleExtendMembership} className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ประเภทสมาชิก</Label>
                <Select value={extendData.membership_type_id} onValueChange={(v) => setExtendData({ ...extendData, membership_type_id: v })} required>
                  <SelectTrigger className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold">
                    <SelectValue placeholder="เลือกประเภทสมาชิก" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl p-2">
                    {membershipTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()} className="rounded-xl py-3 focus:bg-emerald-50">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-bold">{type.name}</span>
                          <Badge variant="outline" className="text-[10px] font-black uppercase px-2 bg-emerald-50 text-emerald-600 border-emerald-100">
                            {type.duration_days} DAYS
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">จำนวนวัน (สามารถปรับแต่งได้)</Label>
                <div className="relative">
                  <Input type="number" value={extendData.duration_days} onChange={(e) => setExtendData({ ...extendData, duration_days: parseInt(e.target.value) })} min="1" required className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-xl pl-12" />
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={() => setExtendDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400">ยกเลิก</Button>
                <Button type="submit" disabled={submitting} className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl shadow-emerald-100">
                  {submitting ? "กำลังบันทึก..." : "ยืนยันการต่ออายุ"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
