## Build a modern web-based Student Performance Analytics and Gamified Progress Dashboard System for secondary schools.

The system should replace an Excel-based score dashboard and support:
- Student score entry
- Continuous assessment tracking
- Weighted score computation
- Student ranking
- Achievement badges
- XP and level progression
- Progress analytics
- Class performance monitoring
- Risk detection for weak students
- Dashboard visualizations
- Parent and student portals
- Teacher analytics

The UI should be modern, responsive, and mobile-friendly.

Recommended stack:
- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- Charts: Recharts or Chart.js
- Authentication: JWT or Firebase Auth

The app must support:
- Admin role
- Teacher role
- Student role
- Parent role

Use clean architecture and modular components.
Generate scalable production-ready code.

Building a complete, production-ready, multi-role web application of this magnitude requires a full repository structure with dozens of files, robust authentication flows, and extensive database migrations.

However, I can provide you with the **architectural blueprint, database schema, core backend logic for the gamification engine, and a fully functional frontend dashboard component** to serve as the foundation for your project.

### 1. Database Schema (PostgreSQL via Prisma ORM)

Using Prisma is highly recommended for this stack as it integrates perfectly with Node.js/Next.js and provides type-safe database access.

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
  PARENT
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          Role
  createdAt     DateTime  @default(now())
  
  // Relations based on role
  studentProfile StudentProfile?
  teacherProfile TeacherProfile?
}

model StudentProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  parentId    String?  // Links to Parent User ID
  level       Int      @default(1)
  xp          Int      @default(0)
  classRank   Int?
  
  scores      Score[]
  badges      StudentBadge[]
}

model TeacherProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  subjects    Subject[]
}

model Subject {
  id          String   @id @default(uuid())
  name        String
  teacherId   String
  teacher     TeacherProfile @relation(fields: [teacherId], references: [id])
  assessments Assessment[]
}

model Assessment {
  id          String   @id @default(uuid())
  subjectId   String
  subject     Subject  @relation(fields: [subjectId], references: [id])
  title       String
  weight      Float    // e.g., 0.2 for 20%
  maxScore    Int
  date        DateTime
  scores      Score[]
}

model Score {
  id            String         @id @default(uuid())
  assessmentId  String
  assessment    Assessment     @relation(fields: [assessmentId], references: [id])
  studentId     String
  student       StudentProfile @relation(fields: [studentId], references: [id])
  marksObtained Float
  recordedAt    DateTime       @default(now())
}

model Badge {
  id          String         @id @default(uuid())
  name        String
  description String
  iconUrl     String
  students    StudentBadge[]
}

model StudentBadge {
  id          String         @id @default(uuid())
  studentId   String
  student     StudentProfile @relation(fields: [studentId], references: [id])
  badgeId     String
  badge       Badge          @relation(fields: [badgeId], references: [id])
  awardedAt   DateTime       @default(now())
}

```

### 2. Backend: Gamification & Scoring Service (Node.js/TypeScript)

This service handles adding a score, computing the weighted contribution, adding XP, and checking for level-ups.

```typescript
// services/scoringService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const XP_PER_LEVEL = 1000;

export async function recordStudentScore(studentId: string, assessmentId: string, marksObtained: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Record the score
    const assessment = await tx.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new Error("Assessment not found");

    const score = await tx.score.create({
      data: { studentId, assessmentId, marksObtained: parseFloat(marksObtained) }
    });

    // 2. Calculate XP gained (e.g., based on percentage score and assessment weight)
    const percentage = parseFloat(marksObtained) / assessment.maxScore;
    const baseXP = 500; // Base XP for taking an assessment
    const earnedXP = Math.round(baseXP * percentage * assessment.weight * 10);

    // 3. Update Student Profile (XP and Level)
    const student = await tx.studentProfile.findUnique({ where: { id: studentId } });
    const newTotalXp = (student?.xp || 0) + earnedXP;
    const newLevel = Math.floor(newTotalXp / XP_PER_LEVEL) + 1;

    await tx.studentProfile.update({
      where: { id: studentId },
      data: { xp: newTotalXp, level: newLevel }
    });

    // 4. Badge Logic Check (Example: Perfect Score)
    if (percentage === 1.0) {
      const perfectBadge = await tx.badge.findFirst({ where: { name: "Perfect Score" } });
      if (perfectBadge) {
        // Check if student already has it to avoid duplicates
        const existing = await tx.studentBadge.findFirst({
          where: { studentId, badgeId: perfectBadge.id }
        });
        if (!existing) {
          await tx.studentBadge.create({
            data: { studentId, badgeId: perfectBadge.id }
          });
        }
      }
    }

    return { score, earnedXP, newLevel };
  });
}

```

### 3. Frontend: Student Gamified Dashboard (Next.js + Tailwind + Recharts)

This is a modern, responsive dashboard component built with React and Tailwind CSS that visualizes the student's progress and gamification elements.

```tsx
// components/StudentDashboard.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Star, TrendingUp, AlertTriangle } from 'lucide-react';

const performanceData = [
  { month: 'Jan', math: 65, science: 70, english: 80 },
  { month: 'Feb', math: 75, science: 72, english: 85 },
  { month: 'Mar', math: 85, science: 88, english: 82 },
  { month: 'Apr', math: 82, science: 90, english: 88 },
];

export default function StudentDashboard() {
  const student = {
    name: "Alex Johnson",
    level: 12,
    xp: 11450,
    nextLevelXp: 12000,
    rank: 4,
    totalStudents: 32,
    atRisk: false
  };

  const progressPercentage = (student.xp % 1000) / 10;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {student.name}!</h1>
          <p className="text-gray-500">Here is your academic progress.</p>
        </div>
      </header>

      {/* Gamification Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="bg-indigo-100 p-4 rounded-full mr-4 text-indigo-600">
            <Star size={32} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-semibold">Current Level</p>
            <h2 className="text-2xl font-bold text-gray-900">Level {student.level}</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{student.nextLevelXp - student.xp} XP to Level {student.level + 1}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="bg-amber-100 p-4 rounded-full mr-4 text-amber-600">
            <Trophy size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Class Rank</p>
            <h2 className="text-2xl font-bold text-gray-900">#{student.rank} <span className="text-sm font-normal text-gray-500">/ {student.totalStudents}</span></h2>
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <TrendingUp size={16} className="mr-1"/> Up 2 spots from last month
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm text-gray-500 font-semibold mb-3">Recent Badges</h3>
          <div className="flex space-x-3">
            <div className="flex flex-col items-center">
              <div className="bg-yellow-100 w-12 h-12 rounded-full flex justify-center items-center text-xl shadow-sm border border-yellow-200">🏆</div>
              <span className="text-xs mt-1 text-gray-600">Perfect Math</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex justify-center items-center text-xl shadow-sm border border-blue-200">🚀</div>
              <span className="text-xs mt-1 text-gray-600">Fast Learner</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex justify-center items-center text-xl shadow-sm border border-green-200">📚</div>
              <span className="text-xs mt-1 text-gray-600">Bookworm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Subject Performance Over Time</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="math" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Math" />
              <Line type="monotone" dataKey="science" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} name="Science" />
              <Line type="monotone" dataKey="english" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} name="English" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weak Student Risk Detection Example */}
      {student.atRisk && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start">
          <AlertTriangle className="text-red-500 mr-3 mt-0.5" size={20} />
          <div>
            <h3 className="text-red-800 font-bold">Action Required: Physics Performance</h3>
            <p className="text-red-700 text-sm mt-1">Your recent scores in Physics indicate you might need extra help. Consider scheduling a session with your teacher or utilizing the peer-tutoring system.</p>
          </div>
        </div>
      )}
    </div>
  );
}

```

### Next Steps for Implementation:

1. **Project Initialization:** Create a Next.js monorepo or separated frontend/backend. `npx create-next-app@latest` for the frontend.
2. **Authentication:** Integrate Firebase Auth or NextAuth.js. Ensure role-based access control (RBAC) middleware checks the `user.role` before allowing route access (e.g., only `TEACHER` can hit the `POST /api/scores` endpoint).
3. **State Management:** Use React Query or SWR to fetch the user's dashboard data, keeping the UI perfectly synced with the Postgres backend.
4. **Analytics:** To implement the "Teacher Analytics" and "Risk Detection," write a backend CRON job or trigger that calculates a moving average of recent scores. If a student drops below a threshold (e.g., 50%), flag `atRisk = true` in their profile.

