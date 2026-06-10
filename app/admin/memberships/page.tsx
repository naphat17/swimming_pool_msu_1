"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Users, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  UserCircle, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck,
  Calendar,
  CreditCard,
  UserPlus
} from "lucide-react"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  address: string
  date_of_birth: string
  id_card: string
  user_category_id: number
  user_category_name: string
  role: string
  status: string
  membership?: {
    type: string
    expires_at: string
    status: string
  }
}

interface UserCategory {
  id: number
  name: string
}

export default function AdminMembershipsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [editOpen, setEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<User>>({})
  const { toast } = useToast()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Fetch users error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/memberships/categories`)
      if (response.ok) {
        const data = await response.json()
        setUserCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Fetch categories error:", error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchCategories()
  }, [])

  const handleEditClick = (user: User) => {
    setSelectedUser(user)
    setEditFormData({ ...user })
    setEditOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editFormData)
      })
      if (response.ok) {
        toast({ title: "อัปเดตข้อมูลสำเร็จ", description: "ข้อมูลผู้ใช้งานถูกบันทึกเรียบร้อยแล้ว" })
        setEditOpen(false)
        fetchUsers()
      } else {
        const data = await response.json()
        toast({ title: "อัปเดตไม่สำเร็จ", description: data.message || "เกิดข้อผิดพลาด", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", variant: "destructive" })
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (!confirm("ยืนยันการลบผู้ใช้งานรายนี้? ข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบออก")) return
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        toast({ title: "ลบผู้ใช้งานสำเร็จ" })
        fetchUsers()
      }
    } catch (error) {
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" })
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = filterRole === "all" || user.role === filterRole
    return matchesSearch && matchesRole
  })

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users className="h-10 w-10 text-blue-600" /> จัดการ<span className="text-blue-600">สมาชิก</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">ดูและแก้ไขข้อมูลผู้ใช้งานทั้งหมดในระบบ</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border border-blue-100 shadow-sm">
               Total: {users.length} Users
             </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input 
              placeholder="ค้นหาด้วยชื่อ, นามสกุล หรืออีเมล..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-16 bg-white border-none shadow-xl shadow-slate-200/50 rounded-[1.25rem] font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="md:col-span-4">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-16 bg-white border-none shadow-xl shadow-slate-200/50 rounded-[1.25rem] font-black text-slate-700 uppercase tracking-widest text-xs px-6">
                <div className="flex items-center gap-3">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <SelectValue placeholder="กรองตามสิทธิ์" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                <SelectItem value="all" className="rounded-xl font-bold py-3">สิทธิ์ทั้งหมด</SelectItem>
                <SelectItem value="user" className="rounded-xl font-bold py-3">สมาชิกทั่วไป</SelectItem>
                <SelectItem value="admin" className="rounded-xl font-bold py-3">ผู้ดูแลระบบ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ข้อมูลสมาชิก</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ประเภท/สิทธิ์</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">สมาชิกภาพ</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">สถานะ</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">กำลังโหลดข้อมูล...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-300">
                           <Search className="h-16 w-16 stroke-[1px]" />
                           <p className="text-sm font-black uppercase tracking-[0.2em]">ไม่พบข้อมูลสมาชิก</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-black text-xl group-hover:scale-110 transition-all shadow-sm">
                              {user.first_name[0]}{user.last_name[0]}
                            </div>
                            <div className="space-y-1">
                              <p className="font-black text-slate-900 text-lg leading-tight">{user.first_name} {user.last_name}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                <Mail className="h-3.5 w-3.5 text-blue-400" /> {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-2">
                            <Badge variant="outline" className="border-blue-100 bg-blue-50/50 text-blue-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                              {user.user_category_name || 'ทั่วไป'}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                              <ShieldCheck className={`h-3.5 w-3.5 ${user.role === 'admin' ? 'text-rose-500' : 'text-indigo-500'}`} />
                              <span className={user.role === 'admin' ? 'text-rose-600' : 'text-indigo-600'}>{user.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {user.membership ? (
                            <div className="space-y-1.5">
                              <Badge className={`border-none rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${user.membership.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {user.membership.type}
                              </Badge>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <Calendar className="h-3 w-3" /> Exp: {new Date(user.membership.expires_at).toLocaleDateString('th-TH')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ไม่มีสมาชิกภาพ</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <Badge variant="outline" className={`rounded-full border-none px-4 py-1.5 text-[9px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {user.status === 'active' ? 'ปกติ' : 'ปิดใช้งาน'}
                          </Badge>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditClick(user)}
                              className="w-12 h-12 rounded-2xl hover:bg-blue-600 hover:text-white text-blue-600 transition-all shadow-sm hover:shadow-blue-200"
                            >
                              <Edit3 className="h-5 w-5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-12 h-12 rounded-2xl hover:bg-rose-600 hover:text-white text-rose-600 transition-all shadow-sm hover:shadow-rose-200"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[800px] p-0 rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
            <div className="bg-gradient-to-br from-slate-900 to-blue-900 p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                <DialogTitle className="text-4xl font-black tracking-tight mb-3 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                    <UserCircle className="h-7 w-7 text-blue-400" />
                  </div>
                  แก้ไขข้อมูลสมาชิก
                </DialogTitle>
                <DialogDescription className="text-blue-200/70 font-black uppercase text-[10px] tracking-[0.4em] ml-16">
                  Admin Data Management System
                </DialogDescription>
              </div>
            </div>
            
            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Section: Account Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-4 w-1 bg-blue-600 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Account Credentials</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</Label>
                      <Input 
                        value={editFormData.username} 
                        onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                        className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold text-slate-700 px-5 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</Label>
                      <Input 
                        type="email"
                        value={editFormData.email} 
                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                        className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold text-slate-700 px-5 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Personal Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-4 w-1 bg-indigo-600 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Personal Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">ชื่อจริง</Label>
                      <Input 
                        value={editFormData.first_name} 
                        onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                        className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold text-slate-700 px-5 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">นามสกุล</Label>
                      <Input 
                        value={editFormData.last_name} 
                        onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                        className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold text-slate-700 px-5 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">เบอร์โทรศัพท์</Label>
                    <Input 
                      value={editFormData.phone} 
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold text-slate-700 px-5 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section: System Config */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-4 w-1 bg-rose-600 rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Configuration</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">ประเภทสมาชิก</Label>
                    <Select 
                      value={editFormData.user_category_id?.toString()} 
                      onValueChange={(val) => setEditFormData({...editFormData, user_category_id: parseInt(val)})}
                    >
                      <SelectTrigger className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-widest px-5">
                        <SelectValue placeholder="เลือกประเภท" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                        {userCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()} className="rounded-xl font-bold py-3 uppercase tracking-widest text-[10px]">{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">สิทธิ์เข้าถึง</Label>
                    <Select 
                      value={editFormData.role} 
                      onValueChange={(val) => setEditFormData({...editFormData, role: val})}
                    >
                      <SelectTrigger className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-widest px-5">
                        <SelectValue placeholder="เลือกสิทธิ์" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                        <SelectItem value="user" className="rounded-xl font-bold py-3 uppercase tracking-widest text-[10px]">User (สมาชิกทั่วไป)</SelectItem>
                        <SelectItem value="admin" className="rounded-xl font-bold py-3 uppercase tracking-widest text-[10px]">Admin (ผู้ดูแลระบบ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">สถานะบัญชี</Label>
                    <Select 
                      value={editFormData.status} 
                      onValueChange={(val) => setEditFormData({...editFormData, status: val})}
                    >
                      <SelectTrigger className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-[11px] uppercase tracking-widest px-5">
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                        <SelectItem value="active" className="rounded-xl font-bold py-3 uppercase tracking-widest text-[10px]">Active (ปกติ)</SelectItem>
                        <SelectItem value="inactive" className="rounded-xl font-bold py-3 uppercase tracking-widest text-[10px]">Inactive (ปิดใช้งาน)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">ที่อยู่ผู้ใช้งาน</Label>
                <Input 
                  value={editFormData.address} 
                  onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                  className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold text-slate-700 px-5 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button 
                  onClick={() => setEditOpen(false)} 
                  variant="outline" 
                  className="flex-1 h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs border-slate-200 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  ยกเลิกการแก้ไข
                </Button>
                <Button 
                  onClick={handleUpdateUser} 
                  className="flex-1 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95"
                >
                  บันทึกข้อมูลทั้งหมด
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
