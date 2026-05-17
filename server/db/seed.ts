import { db } from './index';
import { users, students, classes, scores, badges, studentBadges, activityLogs, rankings, predictions, parentLinks, notifications } from './schema';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';

const SUBJECTS = ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music'] as const;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateScoreForStudent(baseSkill: number, subject: string, month: number): number {
  const subjectBias: Record<string, number> = {
    math: 0, science: -5, english: 3, history: 5, art: 8, pe: 10, ict: 2, music: 7
  };
  const bias = subjectBias[subject] ?? 0;
  const trendBonus = month * 1.5;
  const noise = randomBetween(-12, 12);
  return Math.min(100, Math.max(25, Math.round(baseSkill + bias + trendBonus + noise)));
}

export async function seedDatabase() {
  // Check ALL critical tables — users alone is not enough (reset can wipe students)
  const [userCount, studentCount, badgeCount] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(users),
    db.select({ count: sql<number>`COUNT(*)` }).from(students),
    db.select({ count: sql<number>`COUNT(*)` }).from(badges),
  ]);
  if (userCount[0].count > 0 && studentCount[0].count > 0 && badgeCount[0].count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }
  // Partial data detected — wipe and re-seed cleanly
  if (userCount[0].count > 0 || studentCount[0].count > 0) {
    console.log('Partial data detected, wiping and re-seeding...');
    await db.execute(sql`TRUNCATE TABLE notifications, parent_links, predictions, activity_logs, rankings, student_badges, scores, students, class_subjects, classes, badges, users RESTART IDENTITY CASCADE`);
  }

  console.log('Seeding database...');

  // ─── Seed Badges ────────────────────────────────────────
  const badgeData = [
    { name: 'Perfect Score', description: 'Achieved 100% on an assessment', icon: '🏆', category: 'academic' as const, xpReward: 150, criteria: 'score = maxScore', color: '#f59e0b' },
    { name: 'Fast Learner', description: 'Improved score by 20+ points in one subject', icon: '🚀', category: 'improvement' as const, xpReward: 100, criteria: 'improvement >= 20', color: '#6366f1' },
    { name: 'Bookworm', description: 'Completed 20 assessments', icon: '📚', category: 'milestone' as const, xpReward: 75, criteria: 'assessments >= 20', color: '#10b981' },
    { name: 'Streak Master', description: 'Maintained a 7-day learning streak', icon: '🔥', category: 'streak' as const, xpReward: 120, criteria: 'streak >= 7', color: '#f43f5e' },
    { name: 'Math Wizard', description: 'Scored 90%+ in Math three times', icon: '🔢', category: 'academic' as const, xpReward: 100, criteria: 'math_90plus >= 3', color: '#4f46e5' },
    { name: 'Science Star', description: 'Scored 90%+ in Science', icon: '⚗️', category: 'academic' as const, xpReward: 90, criteria: 'science_90plus >= 1', color: '#0ea5e9' },
    { name: 'Consistent', description: 'Never scored below 70% in a week', icon: '✅', category: 'streak' as const, xpReward: 80, criteria: 'weekly_min >= 70', color: '#10b981' },
    { name: 'Top Achiever', description: 'Ranked in top 3 of class', icon: '👑', category: 'milestone' as const, xpReward: 200, criteria: 'rank <= 3', color: '#f59e0b' },
    { name: 'Team Player', description: 'Helped 5 peers with study sessions', icon: '🤝', category: 'social' as const, xpReward: 60, criteria: 'peer_help >= 5', color: '#8b5cf6' },
    { name: 'Level Up!', description: 'Reached Level 5', icon: '⬆️', category: 'milestone' as const, xpReward: 100, criteria: 'level >= 5', color: '#ec4899' },
  ];
  const insertedBadges = await db.insert(badges).values(badgeData).returning();

  // ─── Seed Admin ─────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  const [admin] = await db.insert(users).values({
    name: 'Dr. Sarah Mitchell',
    email: 'admin@eduanalytics.com',
    passwordHash: adminHash,
    role: 'admin',
  }).returning();

  // ─── Seed Teachers ───────────────────────────────────────
  const teacherHash = await bcrypt.hash('teacher123', 12);
  const teacherData = [
    { name: 'Mr. James Rodriguez', email: 'j.rodriguez@eduanalytics.com' },
    { name: 'Ms. Priya Sharma', email: 'p.sharma@eduanalytics.com' },
    { name: 'Mr. David Chen', email: 'd.chen@eduanalytics.com' },
  ];
  const insertedTeachers = await db.insert(users).values(
    teacherData.map(t => ({ ...t, passwordHash: teacherHash, role: 'teacher' as const }))
  ).returning();

  // ─── Seed Classes ────────────────────────────────────────
  const classData = [
    { name: 'Grade 10-A', grade: 10, teacherId: insertedTeachers[0].id },
    { name: 'Grade 10-B', grade: 10, teacherId: insertedTeachers[1].id },
    { name: 'Grade 11-A', grade: 11, teacherId: insertedTeachers[2].id },
    { name: 'Grade 11-B', grade: 11, teacherId: insertedTeachers[0].id },
  ];
  const insertedClasses = await db.insert(classes).values(classData).returning();

  // ─── Seed Students ───────────────────────────────────────
  const studentNames = [
    'Alex Johnson', 'Emma Williams', 'Liam Brown', 'Olivia Davis',
    'Noah Miller', 'Ava Wilson', 'Mason Moore', 'Isabella Taylor',
    'Ethan Anderson', 'Sophia Thomas', 'Lucas Jackson', 'Mia White',
    'Aiden Harris', 'Charlotte Martin', 'James Thompson', 'Amelia Garcia',
    'Benjamin Martinez', 'Harper Robinson', 'Logan Clark', 'Evelyn Lewis',
    'Sebastian Lee', 'Abigail Walker', 'Mateo Hall', 'Emily Allen',
    'Henry Young', 'Elizabeth Hernandez', 'Alexander King', 'Sofia Wright',
    'Daniel Scott', 'Victoria Green',
  ];

  const studentHash = await bcrypt.hash('student123', 12);
  const parentHash = await bcrypt.hash('parent123', 12);

  // Also create demo accounts
  const [demoStudentUser] = await db.insert(users).values({
    name: 'Alex Johnson',
    email: 'student@eduanalytics.com',
    passwordHash: studentHash,
    role: 'student',
  }).returning();

  const [demoParentUser] = await db.insert(users).values({
    name: 'Robert Johnson',
    email: 'parent@eduanalytics.com',
    passwordHash: parentHash,
    role: 'parent',
  }).returning();

  const skillLevels = studentNames.map(() => randomBetween(45, 90));
  const insertedStudentUsers: { id: number; name: string }[] = [];

  for (let i = 0; i < studentNames.length; i++) {
    const name = studentNames[i];
    // Skip if already inserted Alex Johnson as demo
    if (name === 'Alex Johnson') {
      insertedStudentUsers.push(demoStudentUser);
      continue;
    }
    const [u] = await db.insert(users).values({
      name,
      email: `student${i + 1}@eduanalytics.com`,
      passwordHash: studentHash,
      role: 'student',
    }).returning();
    insertedStudentUsers.push(u);
  }

  const insertedStudents = [];
  for (let i = 0; i < insertedStudentUsers.length; i++) {
    const u = insertedStudentUsers[i];
    const xp = randomBetween(200, 8000);
    const level = Math.min(20, Math.floor(xp / 400) + 1);
    const classId = insertedClasses[i % insertedClasses.length].id;
    const grade = classId <= 2 ? 10 : 11;
    const [s] = await db.insert(students).values({
      userId: u.id,
      classId,
      studentCode: `STU-${String(i + 1).padStart(5, '0')}`,
      grade,
      xp,
      level,
      streakDays: randomBetween(0, 14),
    }).returning();
    insertedStudents.push({ ...s, name: u.name, skill: skillLevels[i] });
  }

  // ─── Seed Scores ─────────────────────────────────────────
  const assessmentNames = {
    math: ['Algebra Quiz', 'Geometry Test', 'Calculus Midterm', 'Statistics Exam', 'Trigonometry Quiz'],
    science: ['Biology Lab', 'Chemistry Test', 'Physics Exam', 'Ecology Quiz', 'Scientific Method'],
    english: ['Essay Writing', 'Grammar Test', 'Literature Analysis', 'Reading Comprehension', 'Poetry Review'],
    history: ['World War II Test', 'Ancient Civilizations', 'Modern History Exam', 'Geography Quiz', 'Political Science'],
    art: ['Portfolio Review', 'Painting Project', 'Design Critique', 'Art History Test', 'Sculpture Assessment'],
    pe: ['Fitness Assessment', 'Sports Skills Test', 'Endurance Run', 'Team Sport Eval', 'Flexibility Test'],
    ict: ['Programming Quiz', 'Network Fundamentals', 'Database Design', 'Web Development Project', 'Cybersecurity Test'],
    music: ['Theory Exam', 'Instrument Performance', 'Music History', 'Composition Project', 'Ear Training'],
  };

  for (const student of insertedStudents) {
    for (const subject of SUBJECTS) {
      const numScores = randomBetween(3, 6);
      const names = assessmentNames[subject];
      for (let m = 0; m < numScores; m++) {
        const month = randomBetween(1, 5);
        const scoreVal = generateScoreForStudent(student.skill, subject, month);
        const date = new Date(2025, month - 1, randomBetween(1, 28));
        await db.insert(scores).values({
          studentId: student.id,
          subject,
          score: scoreVal,
          maxScore: 100,
          assessmentType: m % 3 === 0 ? 'exam' : m % 3 === 1 ? 'quiz' : 'homework',
          assessmentName: names[m % names.length],
          recordedBy: admin.id,
          recordedAt: date,
          semester: 1,
          academicYear: '2024-2025',
        });
      }
    }
  }

  // ─── Seed Badges for Students ────────────────────────────
  for (const student of insertedStudents) {
    const numBadges = randomBetween(1, 5);
    const shuffled = [...insertedBadges].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numBadges; i++) {
      try {
        await db.insert(studentBadges).values({ studentId: student.id, badgeId: shuffled[i].id });
      } catch { /* skip duplicates */ }
    }
  }

  // ─── Seed Activity Logs ──────────────────────────────────
  for (const student of insertedStudents.slice(0, 10)) {
    const activities = [
      { type: 'login', desc: 'Logged into the platform', xp: 5 },
      { type: 'score_recorded', desc: 'Completed a Math quiz with 88%', xp: 75 },
      { type: 'badge_earned', desc: 'Earned the "Fast Learner" badge', xp: 100 },
      { type: 'streak', desc: 'Maintained 7-day learning streak', xp: 50 },
    ];
    for (const act of activities) {
      await db.insert(activityLogs).values({
        studentId: student.id,
        activityType: act.type,
        description: act.desc,
        xpEarned: act.xp,
        createdAt: new Date(Date.now() - randomBetween(0, 7) * 86400000),
      });
    }
  }

  // ─── Link Parent to Demo Student ────────────────────────
  if (insertedStudents.length > 0) {
    await db.insert(parentLinks).values({
      parentId: demoParentUser.id,
      studentId: insertedStudents[0].id,
      relationship: 'parent',
    });
  }

  // ─── Seed Predictions ────────────────────────────────────
  for (const student of insertedStudents.slice(0, 5)) {
    for (const subject of SUBJECTS.slice(0, 4)) {
      const predicted = randomBetween(55, 95);
      const riskLevel = predicted < 60 ? 'critical' : predicted < 70 ? 'high' : predicted < 80 ? 'medium' : 'low';
      await db.insert(predictions).values({
        studentId: student.id,
        subject,
        predictedScore: predicted,
        confidenceScore: Math.round(randomBetween(55, 90)) / 100,
        riskLevel: riskLevel as any,
        riskFactors: riskLevel !== 'low' ? ['Inconsistent performance', 'Below average scores'] : [],
        recommendations: ['Keep up the study habits', 'Review previous exam mistakes'],
      });
    }
  }

  // ─── Seed Notifications ──────────────────────────────────
  await db.insert(notifications).values([
    { userId: demoStudentUser.id, title: 'New Badge Earned!', message: 'You earned the "Fast Learner" badge. Keep it up!', type: 'success' },
    { userId: demoStudentUser.id, title: 'Score Recorded', message: 'Your Math quiz score has been recorded: 88/100', type: 'info' },
    { userId: admin.id, title: 'System Ready', message: 'EduAnalytics platform is fully operational.', type: 'info' },
  ]);

  console.log('Database seeded successfully!');
  console.log('\nDemo Accounts:');
  console.log('  Admin:   admin@eduanalytics.com / admin123');
  console.log('  Teacher: j.rodriguez@eduanalytics.com / teacher123');
  console.log('  Student: student@eduanalytics.com / student123');
  console.log('  Parent:  parent@eduanalytics.com / parent123');
}
