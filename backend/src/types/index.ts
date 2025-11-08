export interface User {
  id: number;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface Patient {
  id: number;
  user_id: number;
  name: string;
  type: string;
  status: string;
  added_time?: string;
  patient_info?: any;
  rounding_data?: any;
  mri_data?: any;
  tasks?: Task[];
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: number;
  patient_id: number;
  name: string;
  completed: boolean;
  date: string;
  created_at: Date;
  updated_at: Date;
}

export interface GeneralTask {
  id: number;
  user_id: number;
  name: string;
  category: string;
  priority: string;
  completed: boolean;
  completed_date?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Express.Request {
  userId?: number;
}
