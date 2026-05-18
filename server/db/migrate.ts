import { db } from './index';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

export async function runMigrations() {
  console.log('Running database migrations...');

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'parent');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE subject AS ENUM ('math', 'science', 'english', 'history', 'art', 'pe', 'ict', 'music');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE badge_category AS ENUM ('academic', 'streak', 'improvement', 'social', 'milestone');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role user_role NOT NULL DEFAULT 'student',
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      academic_year TEXT NOT NULL DEFAULT '2024-2025',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      class_id INTEGER REFERENCES classes(id),
      student_code TEXT NOT NULL,
      grade INTEGER NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak_days INTEGER NOT NULL DEFAULT 0,
      last_active_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS students_code_idx ON students(student_code);
    CREATE INDEX IF NOT EXISTS students_class_idx ON students(class_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      subject subject NOT NULL,
      score REAL NOT NULL,
      max_score REAL NOT NULL DEFAULT 100,
      assessment_type TEXT NOT NULL DEFAULT 'quiz',
      assessment_name TEXT NOT NULL,
      recorded_by INTEGER REFERENCES users(id),
      recorded_at TIMESTAMP DEFAULT NOW() NOT NULL,
      semester INTEGER NOT NULL DEFAULT 1,
      academic_year TEXT NOT NULL DEFAULT '2024-2025'
    );
    CREATE INDEX IF NOT EXISTS scores_student_idx ON scores(student_id);
    CREATE INDEX IF NOT EXISTS scores_subject_idx ON scores(subject);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category badge_category NOT NULL,
      xp_reward INTEGER NOT NULL DEFAULT 50,
      criteria TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1'
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_badges (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      badge_id INTEGER NOT NULL REFERENCES badges(id),
      earned_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS student_badge_unique ON student_badges(student_id, badge_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rankings (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      class_id INTEGER REFERENCES classes(id),
      overall_rank INTEGER NOT NULL,
      class_rank INTEGER,
      average_score REAL NOT NULL,
      total_xp INTEGER NOT NULL DEFAULT 0,
      period TEXT NOT NULL DEFAULT '2024-2025-S1',
      calculated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS rankings_student_period ON rankings(student_id, period);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      subject subject NOT NULL,
      predicted_score REAL NOT NULL,
      confidence_score REAL NOT NULL,
      risk_level risk_level NOT NULL DEFAULT 'low',
      risk_factors TEXT[],
      recommendations TEXT[],
      generated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS parent_links (
      id SERIAL PRIMARY KEY,
      parent_id INTEGER NOT NULL REFERENCES users(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      relationship TEXT NOT NULL DEFAULT 'parent',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS parent_student_unique ON parent_links(parent_id, student_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS class_subjects (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      UNIQUE(class_id, subject)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS prt_token_idx ON password_reset_tokens(token);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS assessments (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'quiz',
      status TEXT NOT NULL DEFAULT 'draft',
      time_limit_mins INTEGER,
      max_attempts INTEGER NOT NULL DEFAULT 1,
      passing_score REAL DEFAULT 50,
      class_id INTEGER REFERENCES classes(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      instructions TEXT,
      shuffle_questions BOOLEAN NOT NULL DEFAULT false,
      shuffle_options BOOLEAN NOT NULL DEFAULT false,
      scheduled_at TIMESTAMP,
      closes_at TIMESTAMP,
      semester INTEGER NOT NULL DEFAULT 1,
      academic_year TEXT NOT NULL DEFAULT '2024-2025',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS assessments_created_by_idx ON assessments(created_by);
    CREATE INDEX IF NOT EXISTS assessments_class_idx ON assessments(class_id);
    CREATE INDEX IF NOT EXISTS assessments_status_idx ON assessments(status);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'mcq',
      text TEXT NOT NULL,
      image_url TEXT,
      points REAL NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      explanation TEXT,
      correct_answer TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS questions_assessment_idx ON questions(assessment_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS question_options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL DEFAULT false,
      order_index INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS q_options_question_idx ON question_options(question_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      assessment_id INTEGER NOT NULL REFERENCES assessments(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      status TEXT NOT NULL DEFAULT 'in_progress',
      started_at TIMESTAMP DEFAULT NOW() NOT NULL,
      submitted_at TIMESTAMP,
      total_score REAL,
      max_score REAL,
      time_taken_secs INTEGER,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS submissions_assessment_student_idx ON submissions(assessment_id, student_id);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS submission_answers (
      id SERIAL PRIMARY KEY,
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id),
      selected_option_id INTEGER REFERENCES question_options(id),
      answer_text TEXT,
      is_correct BOOLEAN,
      points_awarded REAL DEFAULT 0,
      feedback TEXT
    );
    CREATE INDEX IF NOT EXISTS sub_answers_submission_idx ON submission_answers(submission_id);
  `);

  // Question bank table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS question_bank (
      id          SERIAL PRIMARY KEY,
      subject     TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'mcq',
      text        TEXT NOT NULL,
      options     TEXT,
      correct_answer TEXT,
      explanation TEXT,
      points      REAL NOT NULL DEFAULT 1,
      tags        TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      created_at  TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS qb_subject_idx ON question_bank(subject);
  `);

  // Assessment module v2 — public links + guest submissions
  await db.execute(sql`
    ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE assessments ADD COLUMN IF NOT EXISTS public_token TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS assessments_public_token_idx ON assessments(public_token) WHERE public_token IS NOT NULL;
    ALTER TABLE submissions ALTER COLUMN student_id DROP NOT NULL;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS participant_name TEXT;
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;
  `);

  console.log('Migrations completed successfully!');
}
