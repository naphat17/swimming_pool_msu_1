# 🏊‍♂️ ระบบจัดการสระว่ายน้ำโรจนากร (Rojanakor Swimming Pool Management System)

ระบบจัดการสระว่ายน้ำครบวงจรที่รวมเอาการจองสระว่ายน้ำ, การจองตู้ล็อกเกอร์, การซื้อแพ็กเกจสมาชิกภาพ และการชำระเงิน มาไว้บนระบบออนไลน์เดียวกัน

---

## 🛠 เทคโนโลยีที่ใช้ในระบบ (Tech Stack)

*   **Frontend & Backend (Unified Server)**: [Next.js App Router](https://nextjs.org/) (Version 15+)
*   **API Framework**: [Hono](https://hono.dev/) (ทำหน้าที่รองรับ API endpoint ต่างๆ ใน Next.js catch-all routes)
*   **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
*   **Database Engine**: MySQL / TiDB Cloud
*   **Cloud Image Storage**: [Cloudinary](https://cloudinary.com/) (สำหรับจัดเก็บหลักฐานรูปภาพการโอนเงิน/สลิปธนาคาร)
*   **Styling & UI**: Tailwind CSS & Radix UI (Shadcn components)

---

## 📖 วิธีการติดตั้งและตั้งค่าโปรเจกต์

คุณสามารถดูขั้นตอนการติดตั้งโปรเจกต์อย่างละเอียด วิธีรันคำสั่ง Drizzle ORM และวิธีตั้งค่า Environment Variables ต่างๆ ได้ที่คู่มือหลักด้านล่างนี้ครับ:

👉 **[คู่มือการติดตั้งระบบ (SETUP.md)](SETUP.md)**

---

## 🏃‍♂️ คำสั่งพื้นฐานสำหรับการทดสอบรันระบบ

### 1. ติดตั้ง Packages
```bash
npm install --legacy-peer-deps
```

### 2. รันระบบในโหมดพัฒนา (Development Mode)
```bash
npm run dev
```
ระบบจะเริ่มต้นทำงานที่พอร์ต 3001 โดยคุณสามารถเข้าหน้าเว็บหลักผ่านเบราว์เซอร์ได้ที่: **`http://localhost:3001`**

### 3. รันการจัดการตารางฐานข้อมูลผ่านเว็บ GUI (Drizzle Studio)
```bash
npx drizzle-kit studio
```
