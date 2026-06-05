/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PatientInfo {
  name: string;
  age: number;
  gender: string;
  mrn: string; // Medical Record Number
  dob: string;
  phone?: string;
  contactPerson?: string;
}

export interface EncounterInfo {
  admissionDate: string;
  dischargeDate: string;
  department: string;
  attendingPhysician: string;
  facilityName: string;
}

export interface Diagnosis {
  code: string; // ICD-10
  description: string;
  classification: "Primary" | "Secondary";
  status: "Active" | "Resolved" | "Chronic";
}

export interface Procedure {
  name: string;
  date: string;
  description: string;
}

export interface Prescription {
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  status: "New" | "Continued" | "Modified" | "Stopped";
  indication?: string;
}

export interface Allergen {
  substance: string;
  type: "Drug" | "Food" | "Environment" | "Other";
  reaction: string;
  severity: "Low" | "Medium" | "High";
}

export interface FollowUp {
  appointmentDate: string;
  specialist: string;
  location: string;
  notes: string;
}

export interface CriticalAlert {
  alertType: "Red Flag" | "Lab Action" | "Vital Monitoring" | "Other";
  description: string;
  severity: "Moderate" | "Severe" | "Life-Threatening";
}

export interface StructuredDischargeSummary {
  patientInfo: PatientInfo;
  encounterInfo: EncounterInfo;
  diagnoses: Diagnosis[];
  procedures: Procedure[];
  courseOfTreatment: string;
  prescriptions: Prescription[];
  allergies: Allergen[];
  followUps: FollowUp[];
  criticalAlerts: CriticalAlert[];
  clinicalNotesSummary: string;
}

export interface WebhookEvent {
  id: string;
  timestamp: string;
  sourceSystem: string; // e.g., "Epic Systems", "Cerner Milieu", "HMIS Webhook Simulator"
  eventType: "DISCHARGE_COMPLETED" | "DISCHARGE_AMENDED" | "ADMISSION_RECORDED";
  status: "Pending" | "Parsed_Updating" | "Success_Synced" | "Failed_Parsing";
  rawText: string;
  processedRecord?: StructuredDischargeSummary;
  errorMessage?: string;
}

export interface PatientRecord {
  mrn: string;
  name: string;
  dob: string;
  gender: string;
  lastDischargeDate: string;
  diagnoses: string[];
  allergies: string[];
  prescriptionsCount: number;
  history: StructuredDischargeSummary[];
}
