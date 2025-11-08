-- VetHub PostgreSQL Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Admit',
  status VARCHAR(50) NOT NULL DEFAULT 'New Admit',
  added_time VARCHAR(10),

  -- Patient info (JSONB for flexibility)
  patient_info JSONB DEFAULT '{}',
  rounding_data JSONB DEFAULT '{}',
  mri_data JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- General tasks (not tied to specific patient)
CREATE TABLE IF NOT EXISTS general_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Morning',
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Common problems (user-specific templates)
CREATE TABLE IF NOT EXISTS common_problems (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Common comments (user-specific templates)
CREATE TABLE IF NOT EXISTS common_comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Common medications (user-specific templates)
CREATE TABLE IF NOT EXISTS common_medications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_general_tasks_user_id ON general_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_common_problems_user_id ON common_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_common_comments_user_id ON common_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_common_medications_user_id ON common_medications(user_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers (drop first to avoid errors on re-run)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_general_tasks_updated_at ON general_tasks;
CREATE TRIGGER update_general_tasks_updated_at BEFORE UPDATE ON general_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
