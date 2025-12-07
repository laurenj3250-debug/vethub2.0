/**
 * EzyVet API Client
 *
 * Integrates with EzyVet cloud-based veterinary practice management system.
 * Fetches patient records, appointments, consultations, and treatments.
 *
 * API Documentation: https://api.trial.ezyvet.com/v2/apidocs
 * Authentication: OAuth 2.0
 */

export interface EzyVetPatient {
  id: string;
  name: string;
  species_name: string;
  breed_name: string;
  date_of_birth: string;
  sex: { name: string };
  weight: number;
  weight_units: string;
  active: boolean;
  contacts?: Array<{
    name: string;
    phone?: string;
    email?: string;
  }>;
  allergies?: string;
  presenting_problems?: string;
  active_prescriptions?: Array<{
    drug_name: string;
    dose: string;
    frequency: string;
  }>;
}

export interface EzyVetAppointment {
  id: string;
  animal_id: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
}

export interface EzyVetTreatment {
  id: string;
  animal_id: string;
  treatment_type: string;
  medication?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  start_date: string;
  end_date?: string;
}

export interface UnifiedPatient {
  id: string;
  name: string;
  demographics: {
    species: string;
    breed: string;
    age: string;
    sex: string;
    weight: number;
    weightUnit: string;
    owner?: {
      name: string;
      phone?: string;
      email?: string;
    };
  };
  medicalHistory?: {
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
  };
  status: string;
  type: 'Surgery' | 'MRI' | 'Medical';
  addedTime: string;
}

export class EzyVetClient {
  private apiKey: string;
  private partnerId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.EZYVET_API_KEY || '';
    this.partnerId = process.env.EZYVET_PARTNER_ID || '';
    this.baseUrl = process.env.EZYVET_BASE_URL || 'https://api.trial.ezyvet.com/v2';

    if (!this.apiKey || !this.partnerId) {
      console.warn('EzyVet credentials not configured. Set EZYVET_API_KEY and EZYVET_PARTNER_ID in .env.local');
    }
  }

  /**
   * Test connection to EzyVet API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/animal?limit=1`, {
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return { success: true, message: 'Connection successful' };
      } else {
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Fetch patients from EzyVet
   */
  async getPatients(params?: {
    limit?: number;
    active?: boolean;
    offset?: number;
  }): Promise<UnifiedPatient[]> {
    const queryParams = new URLSearchParams({
      limit: String(params?.limit || 50),
      active: String(params?.active !== false ? 1 : 0),
      offset: String(params?.offset || 0),
    });

    const response = await fetch(`${this.baseUrl}/animal?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`EzyVet API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items.map((item: EzyVetPatient) => this.mapEzyVetPatient(item));
  }

  /**
   * Fetch single patient by ID
   */
  async getPatientById(id: string): Promise<UnifiedPatient> {
    const response = await fetch(`${this.baseUrl}/animal/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`EzyVet API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.mapEzyVetPatient(data.animal);
  }

  /**
   * Fetch appointments for a specific date
   */
  async getAppointments(date: Date): Promise<EzyVetAppointment[]> {
    const dateStr = date.toISOString().split('T')[0];

    const response = await fetch(
      `${this.baseUrl}/appointment?date=${dateStr}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`EzyVet API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Fetch treatments for a patient
   */
  async getTreatments(patientId: string): Promise<EzyVetTreatment[]> {
    const response = await fetch(
      `${this.baseUrl}/treatment?animal_id=${patientId}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`EzyVet API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Map EzyVet patient to VetHub UnifiedPatient format
   */
  private mapEzyVetPatient(ezyvetData: EzyVetPatient): UnifiedPatient {
    return {
      id: `ezyvet-${ezyvetData.id}`,
      name: ezyvetData.name,

      demographics: {
        species: ezyvetData.species_name || 'Unknown',
        breed: ezyvetData.breed_name || 'Unknown',
        age: this.calculateAge(ezyvetData.date_of_birth),
        sex: ezyvetData.sex?.name || 'Unknown',
        weight: ezyvetData.weight || 0,
        weightUnit: ezyvetData.weight_units || 'kg',
        owner: ezyvetData.contacts?.[0] ? {
          name: ezyvetData.contacts[0].name,
          phone: ezyvetData.contacts[0].phone,
          email: ezyvetData.contacts[0].email,
        } : undefined,
      },

      medicalHistory: {
        allergies: ezyvetData.allergies ? [ezyvetData.allergies] : [],
        chronicConditions: ezyvetData.presenting_problems ? [ezyvetData.presenting_problems] : [],
        currentMedications: ezyvetData.active_prescriptions?.map(rx =>
          `${rx.drug_name} ${rx.dose} ${rx.frequency}`
        ) || [],
      },

      status: ezyvetData.active ? 'New' : 'Discharging',
      type: this.determinePatientType(ezyvetData.presenting_problems || ''),
      addedTime: new Date().toISOString(),
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: string): string {
    if (!dateOfBirth) return 'Unknown';

    const birth = new Date(dateOfBirth);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years > 1) {
      return `${years}yo`;
    } else if (years === 1) {
      return months >= 0 ? '1yo' : `${12 + months}mo`;
    } else {
      return `${months}mo`;
    }
  }

  /**
   * Determine patient type from presenting problems
   */
  private determinePatientType(presentingProblems: string): 'Surgery' | 'MRI' | 'Medical' {
    const problems = presentingProblems.toLowerCase();

    if (problems.includes('surgery') || problems.includes('post-op')) {
      return 'Surgery';
    } else if (problems.includes('mri') || problems.includes('imaging')) {
      return 'MRI';
    } else {
      return 'Medical';
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Partner-Id': this.partnerId,
      'Content-Type': 'application/json',
    };
  }
}
