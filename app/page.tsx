"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Waves, Calendar, Shield, Users, ArrowRight } from "lucide-react"


const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showLanding, setShowLanding] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === "admin") {
          router.push("/admin/dashboard")
        } else {
          router.push("/dashboard")
        }
      } else {
        setShowLanding(true)
      }
    }
  }, [user, loading, router])

  if (loading || (!showLanding && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Waves size={24} />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                สระว่ายน้ำโรจนากร
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">เข้าสู่ระบบ</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100">
                  สมัครสมาชิก
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0 scale-105 animate-slow-zoom"
          style={{ 
            backgroundImage: "url('/555.png')", 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            filter: 'brightness(0.7)' 
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-transparent z-1" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-2xl text-white">
            <Badge className="bg-blue-500/20 text-blue-100 border-blue-400/30 mb-6 backdrop-blur-sm px-4 py-1">
              ยินดีต้อนรับสู่สระว่ายน้ำโรจนากร
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              สัมผัสประสบการณ์<br />
              <span className="text-blue-300">ว่ายน้ำที่เหนือระดับ</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-50/90 mb-10 leading-relaxed font-light">
              ระบบจัดการสระว่ายน้ำที่ทันสมัย จองล่วงหน้า สะดวก รวดเร็ว 
              พร้อมตู้เก็บของที่ปลอดภัยสำหรับคุณและครอบครัว
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-7 text-lg rounded-xl shadow-xl shadow-blue-900/20">
                  เริ่มใช้งานเลย <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 px-10 py-7 text-lg rounded-xl">
                  เข้าสู่ระบบ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">บริการของเรา</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              เรามอบความสะดวกสบายและเทคโนโลยีที่ทันสมัยเพื่อตอบโจทย์ทุกไลฟ์สไตล์การออกกำลังกายของคุณ
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Calendar size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">จองสระว่ายน้ำออนไลน์</h3>
              <p className="text-gray-600 leading-relaxed">
                จองล่วงหน้าได้ง่ายๆ ผ่านระบบออนไลน์ ตรวจสอบช่วงเวลาที่ว่างได้ทันที ไม่ต้องรอคิว
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Shield size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">ระบบตู้เก็บของปลอดภัย</h3>
              <p className="text-gray-600 leading-relaxed">
                จองตู้เก็บของพร้อมการเข้าใช้สระ มั่นใจในความปลอดภัยของทรัพย์สินด้วยระบบการจัดการที่รัดกุม
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">สมาชิกรายปีสุดคุ้ม</h3>
              <p className="text-gray-600 leading-relaxed">
                รับสิทธิพิเศษมากมายสำหรับสมาชิกรายปี ทั้งส่วนลดและการเข้าใช้บริการที่ไม่จำกัดครั้ง
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
              <Waves size={18} />
            </div>
            <span className="text-lg font-bold text-gray-900">สระว่ายน้ำโรจนากร</span>
          </div>
          <p className="text-gray-500 mb-6">
            © 2026 ระบบจัดการสระว่ายน้ำโรจนากร. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-gray-400">
            <Link href="#" className="hover:text-blue-600 transition-colors">ติดต่อเรา</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">นโยบายความเป็นส่วนตัว</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">ข้อกำหนดการใช้งาน</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}



