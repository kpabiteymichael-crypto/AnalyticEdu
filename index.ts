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