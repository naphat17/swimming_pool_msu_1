"use client"

import type React from "react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Calendar, MapPin, CreditCard, Settings, LogOut, Menu, X, Award, KeyRound, ClipboardCheck } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
const navigation = [
  { name: "แดชบอร์ด", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "เช็คการเข้าใช้บริการ", href: "/admin/checkin", icon: ClipboardCheck },
  { name: "จัดการสมาชิก", href: "/admin/members", icon: Users },
  { name: "จัดการสมาชิกภาพ", href: "/admin/memberships", icon: Award },
  { name: "จัดการการจอง", href: "/admin/reservations", icon: Calendar },
  { name: "จัดการสระ", href: "/admin/pools", icon: MapPin },
  { name: "จัดการตู้เก็บของ", href: "/admin/lockers", icon: KeyRound },
  { name: "จัดการการชำระ", href: "/admin/payments", icon: CreditCard },
  { name: "ตั้งค่าระบบ", href: "/admin/settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      {/* Background Decoration */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-red-50 blur-3xl opacity-50" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-orange-50 blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-md px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-200">
              <LayoutDashboard size={18} />
            </div>
            <span className="font-bold text-gray-900 uppercase tracking-tight">Admin Panel</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile sidebar */}
        <div className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className={`absolute inset-y-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="flex h-20 items-center justify-between px-6 border-b">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                  <LayoutDashboard size={20} />
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tight">ADMIN</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      isActive 
                        ? "bg-red-600 text-white shadow-lg shadow-red-200" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-red-600"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-red-600"}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 mt-auto border-t bg-slate-50/50">
              <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                  {user?.first_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {user?.first_name}
                  </p>
                  <p className="text-[10px] uppercase font-black text-red-500 tracking-widest">Administrator</p>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={logout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 z-50">
          <div className="flex flex-col flex-grow bg-white border-r border-slate-200 shadow-sm">
            <div className="flex h-20 items-center px-8 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                  <LayoutDashboard size={22} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-slate-900 leading-tight tracking-tight uppercase">Control Panel</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-red-500 font-black">Management</span>
                </div>
              </div>
            </div>
            <nav className="flex-1 space-y-1 px-6 py-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${
                      isActive 
                        ? "bg-red-600 text-white shadow-lg shadow-red-200" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-red-600"
                    }`}
                  >
                    <item.icon className={`mr-3.5 h-5 w-5 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-red-600"}`} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="p-6 mt-auto border-t bg-slate-50/30">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {user?.first_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">
                    {user?.first_name}
                  </p>
                  <p className="text-[10px] text-red-500 truncate font-black uppercase tracking-widest">Administrator</p>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" onClick={logout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
          {/* Top Bar Desktop */}
          <header className="hidden lg:flex sticky top-0 z-40 h-20 items-center justify-between border-b bg-white/70 backdrop-blur-md px-8 shadow-sm">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {navigation.find(n => n.href === pathname)?.name || "Dashboard"}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                System Online
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
