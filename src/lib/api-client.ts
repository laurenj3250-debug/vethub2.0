const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://vethub20-production.up.railway.app';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/api/auth/me');
  }

  logout() {
    localStorage.removeItem('auth_token');
  }

  // Patients
  async getPatients() {
    return this.request<any[]>('/api/patients');
  }

  async getPatient(id: string) {
    return this.request<any>(`/api/patients/${id}`);
  }

  async createPatient(data: any) {
    return this.request<any>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePatient(id: string, data: any) {
    return this.request<any>(`/api/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePatient(id: string) {
    return this.request<void>(`/api/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async createTask(patientId: string, data: any) {
    return this.request<any>(`/api/tasks/patients/${patientId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(patientId: string, taskId: string, data: any) {
    return this.request<any>(`/api/tasks/patients/${patientId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(patientId: string, taskId: string) {
    return this.request<void>(`/api/tasks/patients/${patientId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // General Tasks
  async getGeneralTasks() {
    return this.request<any[]>('/api/tasks/general');
  }

  async createGeneralTask(data: any) {
    return this.request<any>('/api/tasks/general', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGeneralTask(id: string, data: any) {
    return this.request<any>(`/api/tasks/general/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGeneralTask(id: string) {
    return this.request<void>(`/api/tasks/general/${id}`, {
      method: 'DELETE',
    });
  }

  // Common Items
  async getCommonProblems() {
    return this.request<any[]>('/api/common/problems');
  }

  async createCommonProblem(name: string) {
    return this.request<any>('/api/common/problems', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteCommonProblem(id: string) {
    return this.request<void>(`/api/common/problems/${id}`, {
      method: 'DELETE',
    });
  }

  async getCommonComments() {
    return this.request<any[]>('/api/common/comments');
  }

  async createCommonComment(name: string) {
    return this.request<any>('/api/common/comments', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteCommonComment(id: string) {
    return this.request<void>(`/api/common/comments/${id}`, {
      method: 'DELETE',
    });
  }

  async getCommonMedications() {
    return this.request<any[]>('/api/common/medications');
  }

  async createCommonMedication(name: string) {
    return this.request<any>('/api/common/medications', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteCommonMedication(id: string) {
    return this.request<void>(`/api/common/medications/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
