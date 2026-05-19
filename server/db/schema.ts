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

// ─── Assessments ─────────────────────────────────────────────────────────────
export const assessments = pgTable('assessments', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  subject: text('subject').notNull(),
  type: text('type').notNull().default('quiz'),
  status: text('status').notNull().default('draft'),
  timeLimitMins: integer('time_limit_mins'),
  maxAttempts: integer('max_attempts').notNull().default(1),
  passingScore: real('passing_score').default(50),
  classId: integer('class_id').references(() => classes.id),
  createdBy: integer('created_by').notNull().references(() => users.id),
  instructions: text('instructions'),
  shuffleQuestions: boolean('shuffle_questions').notNull().default(false),
  shuffleOptions: boolean('shuffle_options').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(false),
  publicToken: text('public_token'),
  scheduledAt: timestamp('scheduled_at'),
  closesAt: timestamp('closes_at'),
  semester: integer('semester').notNull().default(1),
  academicYear: text('academic_year').notNull().default('2024-2025'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  createdByIdx: index('assessments_created_by_idx').on(t.createdBy),
  classIdx: index('assessments_class_idx').on(t.classId),
  statusIdx: index('assessments_status_idx').on(t.status),
}));

// ─── Questions ────────────────────────────────────────────────────────────────
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  assessmentId: integer('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('mcq'),
  text: text('text').notNull(),
  imageUrl: text('image_url'),
  points: real('points').notNull().default(1),
  orderIndex: integer('order_index').notNull().default(0),
  explanation: text('explanation'),
  correctAnswer: text('correct_answer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  assessmentIdx: index('questions_assessment_idx').on(t.assessmentId),
}));

// ─── Question Options ─────────────────────────────────────────────────────────
export const questionOptions = pgTable('question_options', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
  orderIndex: integer('order_index').notNull().default(0),
}, (t) => ({
  questionIdx: index('q_options_question_idx').on(t.questionId),
}));

// ─── Question Bank ────────────────────────────────────────────────────────────
export const questionBank = pgTable('question_bank', {
  id: serial('id').primaryKey(),
  subject: text('subject').notNull(),
  type: text('type').notNull().default('mcq'),
  text: text('text').notNull(),
  options: text('options'),
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  points: real('points').notNull().default(1),
  tags: text('tags'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  subjectIdx: index('qb_subject_idx').on(t.subject),
}));

// ─── Submissions ──────────────────────────────────────────────────────────────
export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  assessmentId: integer('assessment_id').notNull().references(() => assessments.id),
  studentId: integer('student_id').references(() => students.id),
  participantName: text('participant_name'),
  isGuest: boolean('is_guest').notNull().default(false),
  status: text('status').notNull().default('in_progress'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
  totalScore: real('total_score'),
  maxScore: real('max_score'),
  timeTakenSecs: integer('time_taken_secs'),
  attemptNumber: integer('attempt_number').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  assessmentStudentIdx: index('submissions_assessment_student_idx').on(t.assessmentId, t.studentId),
}));

// ─── Submission Answers ───────────────────────────────────────────────────────
export const submissionAnswers = pgTable('submission_answers', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questions.id),
  selectedOptionId: integer('selected_option_id').references(() => questionOptions.id),
  answerText: text('answer_text'),
  isCorrect: boolean('is_correct'),
  pointsAwarded: real('points_awarded').default(0),
  feedback: text('feedback'),
}, (t) => ({
  submissionIdx: index('sub_answers_submission_idx').on(t.submissionId),
}));

// ─── Assessment Relations ─────────────────────────────────────────────────────
export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  creator: one(users, { fields: [assessments.createdBy], references: [users.id] }),
  class: one(classes, { fields: [assessments.classId], references: [classes.id] }),
  questions: many(questions),
  submissions: many(submissions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  assessment: one(assessments, { fields: [questions.assessmentId], references: [assessments.id] }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, { fields: [questionOptions.questionId], references: [questions.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  assessment: one(assessments, { fields: [submissions.assessmentId], references: [assessments.id] }),
  student: one(students, { fields: [submissions.studentId], references: [students.id] }),
  answers: many(submissionAnswers),
}));

export const submissionAnswersRelations = relations(submissionAnswers, ({ one }) => ({
  submission: one(submissions, { fields: [submissionAnswers.submissionId], references: [submissions.id] }),
  question: one(questions, { fields: [submissionAnswers.questionId], references: [questions.id] }),
  selectedOption: one(questionOptions, { fields: [submissionAnswers.selectedOptionId], references: [questionOptions.id] }),
}));

// ─── Topics (LMS) ────────────────────────────────────────
export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  subject: text('subject').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull().default(0),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  subjectIdx: index('topics_subject_idx').on(t.subject),
}));

// ─── Learning Materials (LMS) ────────────────────────────
export const learningMaterials = pgTable('learning_materials', {
  id: serial('id').primaryKey(),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  classId: integer('class_id').references(() => classes.id),
  createdBy: integer('created_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('note'),
  url: text('url'),
  content: text('content'),
  isPublished: boolean('is_published').notNull().default(false),
  estimatedMins: integer('estimated_mins').default(10),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  topicIdx: index('lm_topic_idx').on(t.topicId),
  classIdx: index('lm_class_idx').on(t.classId),
}));

// ─── Lesson Progress (LMS) ───────────────────────────────
export const lessonProgress = pgTable('lesson_progress', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  materialId: integer('material_id').notNull().references(() => learningMaterials.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at'),
  timeSpentMins: integer('time_spent_mins').default(0),
  isBookmarked: boolean('is_bookmarked').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqueProgress: uniqueIndex('lesson_progress_unique').on(t.studentId, t.materialId),
}));

// ─── Announcements ───────────────────────────────────────
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id),
  authorId: integer('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  classIdx: index('announcements_class_idx').on(t.classId),
}));

// ─── LMS & Announcements Relations ───────────────────────
export const topicsRelations = relations(topics, ({ one, many }) => ({
  creator: one(users, { fields: [topics.createdBy], references: [users.id] }),
  materials: many(learningMaterials),
}));

export const learningMaterialsRelations = relations(learningMaterials, ({ one, many }) => ({
  topic: one(topics, { fields: [learningMaterials.topicId], references: [topics.id] }),
  class: one(classes, { fields: [learningMaterials.classId], references: [classes.id] }),
  creator: one(users, { fields: [learningMaterials.createdBy], references: [users.id] }),
  progress: many(lessonProgress),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  student: one(students, { fields: [lessonProgress.studentId], references: [students.id] }),
  material: one(learningMaterials, { fields: [lessonProgress.materialId], references: [learningMaterials.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  class: one(classes, { fields: [announcements.classId], references: [classes.id] }),
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
}));

// ─── Mentor Requests ─────────────────────────────────────
export const mentorRequests = pgTable('mentor_requests', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').notNull().references(() => students.id),
  subject: text('subject').notNull(),
  message: text('message'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  mrStudentIdx: index('mr_student_idx').on(t.studentId),
  mrStatusIdx: index('mr_status_idx').on(t.status),
}));

export const mentorSessions = pgTable('mentor_sessions', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => mentorRequests.id),
  mentorId: integer('mentor_id').notNull().references(() => users.id),
  studentId: integer('student_id').notNull().references(() => students.id),
  scheduledAt: timestamp('scheduled_at'),
  notes: text('notes'),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mentorRatings = pgTable('mentor_ratings', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => mentorSessions.id),
  studentId: integer('student_id').notNull().references(() => students.id),
  mentorId: integer('mentor_id').notNull().references(() => users.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  mentorRatingUnique: uniqueIndex('mentor_rating_session_unique').on(t.sessionId),
}));

export const mentorRequestsRelations = relations(mentorRequests, ({ one, many }) => ({
  student: one(students, { fields: [mentorRequests.studentId], references: [students.id] }),
  sessions: many(mentorSessions),
}));

export const mentorSessionsRelations = relations(mentorSessions, ({ one, many }) => ({
  request: one(mentorRequests, { fields: [mentorSessions.requestId], references: [mentorRequests.id] }),
  mentor: one(users, { fields: [mentorSessions.mentorId], references: [users.id] }),
  student: one(students, { fields: [mentorSessions.studentId], references: [students.id] }),
  ratings: many(mentorRatings),
}));

export const mentorRatingsRelations = relations(mentorRatings, ({ one }) => ({
  session: one(mentorSessions, { fields: [mentorRatings.sessionId], references: [mentorSessions.id] }),
  student: one(students, { fields: [mentorRatings.studentId], references: [students.id] }),
  mentor: one(users, { fields: [mentorRatings.mentorId], references: [users.id] }),
}));
