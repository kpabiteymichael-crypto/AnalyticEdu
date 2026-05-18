import {
  pgTable, serial, text, integer, real, boolean, timestamp,
  pgEnum, uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'student', 'parent']);
export const subjectEnum = pgEnum('subject', ['math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music']);
export const badgeCategoryEnum = pgEnum('badge_category', ['academic', 'streak', 'improvement', 'social', 'milestone']);
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'critical']);

// ─── Users ───────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('student'),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
}));

// ─── Classes ─────────────────────────────────────────────
export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  grade: integer('grade').notNull(),
  teacherId: integer('teacher_id').notNull().references(() => users.id),
  academicYear: text('academic_year').notNull().default('2024-2025'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Students ────────────────────────────────────────────
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  classId: integer('class_id').references(() => classes.id),
  studentCode: text('student_code').notNull(),
  grade: integer('grade').notNull(),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  streakDays: integer('streak_days').notNull().default(0),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  codeIdx: uniqueIndex('students_code_idx').on(t.studentCode),
  classIdx: index('students_class_idx').on(t.classId),
}));

// ─── Scores ──────────────────────────────────────────────
export const scores = pgTable('scores', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  subject: subjectEnum('subject').notNull(),
  score: real('score').notNull(),
  maxScore: real('max_score').notNull().default(100),
  assessmentType: text('assessment_type').notNull().default('quiz'),
  assessmentName: text('assessment_name').notNull(),
  recordedBy: integer('recorded_by').references(() => users.id),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  semester: integer('semester').notNull().default(1),
  academicYear: text('academic_year').notNull().default('2024-2025'),
}, (t) => ({
  studentIdx: index('scores_student_idx').on(t.studentId),
  subjectIdx: index('scores_subject_idx').on(t.subject),
}));

// ─── Badges ──────────────────────────────────────────────
export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  category: badgeCategoryEnum('category').notNull(),
  xpReward: integer('xp_reward').notNull().default(50),
  criteria: text('criteria').notNull(),
  color: text('color').notNull().default('#6366f1'),
});

export const studentBadges = pgTable('student_badges', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  badgeId: integer('badge_id').notNull().references(() => badges.id),
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
}, (t) => ({
  uniqueBadge: uniqueIndex('student_badge_unique').on(t.studentId, t.badgeId),
}));

// ─── Rankings ────────────────────────────────────────────
export const rankings = pgTable('rankings', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  classId: integer('class_id').references(() => classes.id),
  overallRank: integer('overall_rank').notNull(),
  classRank: integer('class_rank'),
  averageScore: real('average_score').notNull(),
  totalXp: integer('total_xp').notNull().default(0),
  period: text('period').notNull().default('2024-2025-S1'),
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
}, (t) => ({
  studentPeriodIdx: uniqueIndex('rankings_student_period').on(t.studentId, t.period),
}));

// ─── AI Predictions ──────────────────────────────────────
export const predictions = pgTable('predictions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  subject: subjectEnum('subject').notNull(),
  predictedScore: real('predicted_score').notNull(),
  confidenceScore: real('confidence_score').notNull(),
  riskLevel: riskLevelEnum('risk_level').notNull().default('low'),
  riskFactors: text('risk_factors').array(),
  recommendations: text('recommendations').array(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

// ─── Parent Links ─────────────────────────────────────────
export const parentLinks = pgTable('parent_links', {
  id: serial('id').primaryKey(),
  parentId: integer('parent_id').notNull().references(() => users.id),
  studentId: integer('student_id').notNull().references(() => students.id),
  relationship: text('relationship').notNull().default('parent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqueLink: uniqueIndex('parent_student_unique').on(t.parentId, t.studentId),
}));

// ─── Activity Logs ───────────────────────────────────────
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  activityType: text('activity_type').notNull(),
  description: text('description').notNull(),
  xpEarned: integer('xp_earned').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  student: one(students, { fields: [users.id], references: [students.userId] }),
  notifications: many(notifications),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  class: one(classes, { fields: [students.classId], references: [classes.id] }),
  scores: many(scores),
  badges: many(studentBadges),
  rankings: many(rankings),
  predictions: many(predictions),
  activityLogs: many(activityLogs),
  parentLinks: many(parentLinks),
}));

export const scoresRelations = relations(scores, ({ one }) => ({
  student: one(students, { fields: [scores.studentId], references: [students.id] }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, { fields: [classes.teacherId], references: [users.id] }),
  students: many(students),
}));

export const studentBadgesRelations = relations(studentBadges, ({ one }) => ({
  student: one(students, { fields: [studentBadges.studentId], references: [students.id] }),
  badge: one(badges, { fields: [studentBadges.badgeId], references: [badges.id] }),
}));

// ─── Password Reset Tokens ────────────────────────────────
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tokenIdx: uniqueIndex('prt_token_idx').on(t.token),
}));

// ─── Class Subjects ───────────────────────────────────────
export const classSubjects = pgTable('class_subjects', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
}, (t) => ({
  uniqueClassSubject: uniqueIndex('class_subject_unique').on(t.classId, t.subject),
}));

export const classSubjectsRelations = relations(classSubjects, ({ one }) => ({
  class: one(classes, { fields: [classSubjects.classId], references: [classes.id] }),
}));
