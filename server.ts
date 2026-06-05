/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { StructuredDischargeSummary, WebhookEvent, PatientRecord } from "./src/types";

dotenv.config();

const app = express();
app.use(express.json());

// In-memory repositories to act as our live HMIS & EHR Sync Agent database
let webhookEvents: WebhookEvent[] = [];
let patientRecords: Map<string, PatientRecord> = new Map();

// Helper to seed initial patient database
function seedPatients() {
  const initialPatients: PatientRecord[] = [
    {
      mrn: "MRN-84920",
      name: "Arthur Pendelton",
      dob: "1962-04-12",
      gender: "Male",
      lastDischargeDate: "2026-05-10",
      diagnoses: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
      allergies: ["Penicillin - High severity hives", "Contrast Media - Moderate flushing"],
      prescriptionsCount: 3,
      history: []
    },
    {
      mrn: "MRN-15309",
      name: "Sophia Martinez",
      dob: "1994-09-21",
      gender: "Female",
      lastDischargeDate: "2026-06-01",
      diagnoses: ["Acute Bronchitis", "Asthma Flare up"],
      allergies: ["Sulfa Drugs - Moderate rash"],
      prescriptionsCount: 2,
      history: []
    }
  ];

  initialPatients.forEach(p => patientRecords.set(p.mrn, p));
}
seedPatients();

// Setup Lazy Gemini SDK Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): { ai: GoogleGenAI; isMock: boolean } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("MY_")) {
    console.warn("⚠️ GEMINI_API_KEY is not defined or is a placeholder. Using intelligent simulated clinical parser fallback.");
    // We will return a dummy but functional object or throw so the API is aware
    return { ai: null as any, isMock: true };
  }
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return { ai: aiClient, isMock: false };
}

// Generate an updated EHR Patient table row or insert a new patient
function syncToEHRDatabase(data: StructuredDischargeSummary): PatientRecord {
  const mrn = data.patientInfo.mrn || `MRN-${Math.floor(10000 + Math.random() * 90000)}`;
  // Ensure patientInfo has normalized MRN
  data.patientInfo.mrn = mrn;

  let existing = patientRecords.get(mrn);
  if (!existing) {
    existing = {
      mrn: mrn,
      name: data.patientInfo.name,
      dob: data.patientInfo.dob || "1980-01-01",
      gender: data.patientInfo.gender || "Other",
      lastDischargeDate: data.encounterInfo.dischargeDate || new Date().toISOString().split('T')[0],
      diagnoses: [],
      allergies: [],
      prescriptionsCount: 0,
      history: []
    };
  }

  // Update dates & basic details
  existing.lastDischargeDate = data.encounterInfo.dischargeDate || new Date().toISOString().split('T')[0];
  
  // Append new unique diagnoses
  const baseDiagnoses = data.diagnoses.map(d => `${d.description}${d.code ? ` (${d.code})` : ''}`);
  existing.diagnoses = Array.from(new Set([...existing.diagnoses, ...baseDiagnoses]));

  // Append new unique allergies
  const baseAllergies = data.allergies.map(a => `${a.substance} (${a.reaction})`);
  existing.allergies = Array.from(new Set([...existing.allergies, ...baseAllergies]));

  // Sum total unique medications active
  existing.prescriptionsCount = data.prescriptions.filter(p => p.status !== "Stopped").length;

  // Append discharge summary history record to the beginning 
  existing.history = [data, ...existing.history];

  patientRecords.set(mrn, existing);
  return existing;
}

// Schema for Gemini parse response
const dischargeParserSchema = {
  type: Type.OBJECT,
  description: "Extracted clinical discharge data package parsed into structured medical data formats analogous to HL7 FHIR standards.",
  properties: {
    patientInfo: {
      type: Type.OBJECT,
      description: "Patient basic registration data extracted or inferred from the record.",
      properties: {
        name: { type: Type.STRING, description: "Full name of patient. Titlecase." },
        age: { type: Type.INTEGER, description: "Age in years. Set 0 if unknown." },
        gender: { type: Type.STRING, description: "Gender identifier, e.g. Male, Female, Non-binary, Unknown." },
        mrn: { type: Type.STRING, description: "Medical Record Number (e.g. MRN-XXXXX). Inferred or generated dynamically if absent." },
        dob: { type: Type.STRING, description: "Date of Birth (YYYY-MM-DD), guess or set as '1960-01-01' using age against current date (2026) if missing." }
      },
      required: ["name"]
    },
    encounterInfo: {
      type: Type.OBJECT,
      description: "Clinical encounter metadata regarding hospitalization dates and care team.",
      properties: {
        admissionDate: { type: Type.STRING, description: "Date admitted in YYYY-MM-DD." },
        dischargeDate: { type: Type.STRING, description: "Date discharged in YYYY-MM-DD." },
        department: { type: Type.STRING, description: "Medical department or ward (e.g. Cardiology, Orthopedics, ICU)." },
        attendingPhysician: { type: Type.STRING, description: "Full name of the physician handling discharge." },
        facilityName: { type: Type.STRING, description: "Hospital name or clinic facility name" }
      },
      required: ["dischargeDate", "department"]
    },
    diagnoses: {
      type: Type.ARRAY,
      description: "List of clinical findings, principal/secondary diagnoses and relevant ICD-10 codings.",
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "ICD-10 clinical code if matching, e.g. I10, E11.9, J45.909." },
          description: { type: Type.STRING, description: "Primary diagnostic description or clinical condition." },
          classification: { type: Type.STRING, description: "Value of 'Primary' or 'Secondary'." },
          status: { type: Type.STRING, description: "Current progression status: Active, Resolved, Chronic." }
        },
        required: ["description", "classification"]
      }
    },
    procedures: {
      type: Type.ARRAY,
      description: "Procedures, surgeries, or major diagnostics performed during hospital stay.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of procedure or diagnostic surgery." },
          date: { type: Type.STRING, description: "Date performed YYYY-MM-DD." },
          description: { type: Type.STRING, description: "Brief procedural context or outcomes." }
        },
        required: ["name"]
      }
    },
    courseOfTreatment: {
      type: Type.STRING,
      description: "Paragraph reviewing clinical course, response to therapy, lab highlights, and state on discharge."
    },
    prescriptions: {
      type: Type.ARRAY,
      description: "Discharge medication list including newly prescribed items, modified dosage, or stopped medications.",
      items: {
        type: Type.OBJECT,
        properties: {
          drugName: { type: Type.STRING, description: "Brand or Generic drug name." },
          dosage: { type: Type.STRING, description: "Amount (e.g. 500mg, 5ml, 10 units)." },
          frequency: { type: Type.STRING, description: "Frequency rule (e.g. Daily, BID, QID, PRN as needed)." },
          route: { type: Type.STRING, description: "Administration route (e.g. Oral, Subcutaneous, Inhalation, IV)." },
          duration: { type: Type.STRING, description: "Duration of course (e.g. 7 days, 1 month, Chronic / Ongoing)." },
          status: { type: Type.STRING, description: "Status transition: 'New', 'Continued', 'Modified', or 'Stopped'." },
          indication: { type: Type.STRING, description: "Why the patient is taking it (e.g. High blood pressure, infection, pain)." }
        },
        required: ["drugName", "dosage", "frequency", "status"]
      }
    },
    allergies: {
      type: Type.ARRAY,
      description: "Allergic intolerances noted or active.",
      items: {
        type: Type.OBJECT,
        properties: {
          substance: { type: Type.STRING, description: "Name of medication, food item, or toxin." },
          type: { type: Type.STRING, description: "One value: Drug, Food, Environment, Other." },
          reaction: { type: Type.STRING, description: "Physical symptoms: e.g. Anaphylaxis, rash, swelling, nausea." },
          severity: { type: Type.STRING, description: "Severity grading: Low, Medium, High." }
        },
        required: ["substance", "type", "severity"]
      }
    },
    followUps: {
      type: Type.ARRAY,
      description: "Discharge appointments and secondary outpatient scheduling directions.",
      items: {
        type: Type.OBJECT,
        properties: {
          appointmentDate: { type: Type.STRING, description: "Date of appointment in format YYYY-MM-DD." },
          specialist: { type: Type.STRING, description: "Target clinic department or doctor (e.g. Cardiologist, PCP, Pulmonologist)." },
          location: { type: Type.STRING, description: "Where the patient should report." },
          notes: { type: Type.STRING, description: "Instruction notes/lab values required for the visit." }
        },
        required: ["specialist"]
      }
    },
    criticalAlerts: {
      type: Type.ARRAY,
      description: "Severe warnings, red flags, or monitoring rules if patient is unstable or needs immediate ER return.",
      items: {
        type: Type.OBJECT,
        properties: {
          alertType: { type: Type.STRING, description: "Category of emergency alert: 'Red Flag', 'Lab Action', 'Vital Monitoring', 'Other'." },
          description: { type: Type.STRING, description: "Symptoms triggering alert or lab thresholds requiring triage." },
          severity: { type: Type.STRING, description: "Alert grade: Moderate, Severe, Life-Threatening." }
        },
        required: ["alertType", "description", "severity"]
      }
    },
    clinicalNotesSummary: {
      type: Type.STRING,
      description: "A compact professional 2-3 sentence clinical summary suitable for transfer and hand-offs."
    }
  },
  required: [
    "patientInfo",
    "encounterInfo",
    "diagnoses",
    "courseOfTreatment",
    "prescriptions",
    "allergies",
    "followUps",
    "criticalAlerts",
    "clinicalNotesSummary"
  ]
};

// --- MOCK FALLBACK DATA GENERATOR ---
function getMockStructuredDischarge(text: string): StructuredDischargeSummary {
  const now = new Date().toISOString().split('T')[0];
  const normalizedText = text.toLowerCase();
  
  // Try to extract some names dynamically from text
  let patientName = "John Doe";
  let extractedMRN = "MRN-" + Math.floor(10000 + Math.random() * 90000);
  let department = "Internal Medicine";
  let age = 52;
  
  if (normalizedText.includes("arthur pendelton") || normalizedText.includes("arthur")) {
    patientName = "Arthur Pendelton";
    extractedMRN = "MRN-84920";
    department = "Cardiology";
    age = 64;
  } else if (normalizedText.includes("sophia martinez") || normalizedText.includes("sophia")) {
    patientName = "Sophia Martinez";
    extractedMRN = "MRN-15309";
    department = "Pulmonology";
    age = 31;
  } else {
    // Attempt simple regex for name
    const nameMatch = text.match(/(?:Patient Name|Name|Patient):\s*([A-Za-z\s]+)/i);
    if (nameMatch && nameMatch[1]) {
      patientName = nameMatch[1].trim().split('\n')[0];
    }
    const ageMatch = text.match(/(?:Age|Aged):\s*(\d+)/i);
    if (ageMatch && ageMatch[1]) {
      age = parseInt(ageMatch[1]);
    }
    const mrnMatch = text.match(/(?:MRN|Record Number|ID):\s*([A-Za-z0-9\-]+)/i);
    if (mrnMatch && mrnMatch[1]) {
      extractedMRN = mrnMatch[1].trim();
    }
  }

  // Choose diagnostic profile based on context
  if (normalizedText.includes("heart") || normalizedText.includes("cardiac") || normalizedText.includes("chf")) {
    return {
      patientInfo: { name: patientName, age: age, gender: "Male", mrn: extractedMRN, dob: "1962-04-12" },
      encounterInfo: { admissionDate: "2026-05-30", dischargeDate: now, department: "Cardiology", attendingPhysician: "Dr. Evelyn Vance, MD", facilityName: "Mercy General Hospital" },
      diagnoses: [
        { code: "I50.9", description: "Congestive Heart Failure, Unspecified", classification: "Primary", status: "Active" },
        { code: "I10", description: "Essential Hypertension", classification: "Secondary", status: "Chronic" }
      ],
      procedures: [
        { name: "Transthoracic Echocardiogram (TTE)", date: "2026-05-31", description: "EF measured at 42% with mild mitral valve regurgitation." }
      ],
      courseOfTreatment: "Patient admitted with 3+ pitting edema, bilateral rales, and orthopnea. Responded rapidly to intravenous Furosemide (Lasix). Weight decreased by 4.2 kg over 48 hours. Vitals stable at discharge.",
      prescriptions: [
        { drugName: "Furosemide (Lasix)", dosage: "40mg", frequency: "Daily", route: "Oral", duration: "Ongoing", status: "New", indication: "Edema and fluid retention stewardship" },
        { drugName: "Lisinopril", dosage: "10mg", frequency: "Daily", route: "Oral", duration: "Ongoing", status: "Continued", indication: "Blood pressure regulation" },
        { drugName: "Carvedilol", dosage: "6.25mg", frequency: "BID (Twice Daily)", route: "Oral", duration: "Ongoing", status: "New", indication: "Beta-blocker therapy for heart failure" }
      ],
      allergies: [
        { substance: "Penicillin", type: "Drug", reaction: "High severity severe hives and airway tightness", severity: "High" }
      ],
      followUps: [
        { appointmentDate: "2026-06-12", specialist: "Cardiology Outpatient Clinic", location: "Suite 302, Heart & Vascular Pavilion", notes: "Please bring daily weight log book and check BMP lab results before the appointment." }
      ],
      criticalAlerts: [
        { alertType: "Red Flag", description: "Sudden weight gain of > 3 lbs in 24 hours or 5 lbs in one week.", severity: "Severe" },
        { alertType: "Vital Monitoring", description: "Daily blood pressure recording; report systolic < 90 or pulse < 50.", severity: "Moderate" }
      ],
      clinicalNotesSummary: "64-year-old male with acute-on-chronic systolic heart failure, successfully stabilized with IV diuresis. Initiated carvedilol therapy, stabilized hypertension, discharged stable with close cardiology follow-up."
    };
  } else if (normalizedText.includes("asthma") || normalizedText.includes("bronchitis") || normalizedText.includes("copd")) {
    return {
      patientInfo: { name: patientName, age: age, gender: "Female", mrn: extractedMRN, dob: "1995-09-22" },
      encounterInfo: { admissionDate: "2026-06-02", dischargeDate: now, department: "Pulmonology", attendingPhysician: "Dr. Rachel Green, MD", facilityName: "Presbyterian Health Center" },
      diagnoses: [
        { code: "J45.901", description: "Acute Exacerbation of Moderate Persistent Asthma", classification: "Primary", status: "Active" },
        { code: "J20.9", description: "Acute Bronchitis, Unspecified", classification: "Secondary", status: "Resolved" }
      ],
      procedures: [
        { name: "Nebulizer Therapy", date: "2026-06-02", description: "Immediate Duoneb inhalation returned peak flow to 340 L/min." }
      ],
      courseOfTreatment: "Presented in respiratory distress. Administered IV Dexamethasone and repeated Albuterol nebulizers. Sputum clear, wheezing resolved on room air. Maintained SpO2 >95% for 24 hours.",
      prescriptions: [
        { drugName: "Prednisone taper", dosage: "40mg", frequency: "Daily for 5 days", route: "Oral", duration: "5 days", status: "New", indication: "Anti-inflammatory steroid treatment" },
        { drugName: "Albuterol Inhaler (Ventolin)", dosage: "2 puffs", frequency: "Every 4 hours as needed", route: "Inhalation", duration: "PRN", status: "Continued", indication: "Rescue bronchodilator" },
        { drugName: "Symbicort (Budesonide/Formoterol)", dosage: "160/4.5 mcg", frequency: "2 puffs BID", route: "Inhalation", duration: "Chronic", status: "New", indication: "Daily maintenance asthma controller" }
      ],
      allergies: [
        { substance: "Aspirin", type: "Drug", reaction: "Triggers bronchospasm", severity: "High" }
      ],
      followUps: [
        { appointmentDate: "2026-06-15", specialist: "Primary Care Provider", location: "Eastside Family Medicine", notes: "Review post-exacerbation Peak Flow readings and assess controller inhaler technique." }
      ],
      criticalAlerts: [
        { alertType: "Red Flag", description: "Inability to complete full sentences in one breath, or persistent cyanosis.", severity: "Life-Threatening" }
      ],
      clinicalNotesSummary: "31-year-old female admitted for acute severe asthma exacerbation secondary to viral bronchitis. Successfully stabilized with oral corticosteroids and bronchodilators."
    };
  } else {
    // Standard surgical procedural or generic medical discharge summary
    return {
      patientInfo: { name: patientName, age: age, gender: "Female", mrn: extractedMRN, dob: "1984-07-15" },
      encounterInfo: { admissionDate: "2026-06-03", dischargeDate: now, department: "General Surgery", attendingPhysician: "Dr. Marcus Marcus, FACS", facilityName: "St. Jude Hospital Center" },
      diagnoses: [
        { code: "K35.80", description: "Unspecified Acute Appendicitis", classification: "Primary", status: "Resolved" }
      ],
      procedures: [
        { name: "Laparoscopic Appendectomy", date: "2026-06-03", description: "Standard 3-port trocar surgical excision, clean specimen." }
      ],
      courseOfTreatment: "Admitted via ED with acute appendicitis. Operative course was uncomplicated. Tolerated soft oral diet. Ambulating well with well-controlled incisional pain.",
      prescriptions: [
        { drugName: "Acetaminophen/Codeine (Tylenol #3)", dosage: "300mg/30mg", frequency: "Every 6 hours as needed for pain", route: "Oral", duration: "3 days", status: "New", indication: "Post-operative acute pain stewardship" },
        { drugName: "Docusate Sodium (Colace)", dosage: "100mg", frequency: "Twice daily", route: "Oral", duration: "5 days", status: "New", indication: "Stool softener for colon relief" }
      ],
      allergies: [
        { substance: "Adhesive Tape", type: "Environment", reaction: "Contact dermatitis / local blistering", severity: "Low" }
      ],
      followUps: [
        { appointmentDate: "2026-06-19", specialist: "General Surgery Clinic", location: "Outpatient Pavilion Suite B", notes: "Surgical wound inspection and suture removal assessment." }
      ],
      criticalAlerts: [
        { alertType: "Red Flag", description: "Fever exceeding 101.5°F, purulent discharge, or widening redness around incision.", severity: "Severe" }
      ],
      clinicalNotesSummary: "Adult female presenting with lower right quadrant pain. Diagnostic ultrasound verified acute appendicitis. Completed uncomplicated laparoscopic appendectomy."
    };
  }
}

// --- API ENDPOINT: PARSE DISCHARGE SUMMARY ---
app.post("/api/discharge-parse", async (req: Request, res: Response) => {
  const { dischargeText, sourceSystem } = req.body;

  if (!dischargeText || typeof dischargeText !== "string" || dischargeText.trim() === "") {
    return res.status(400).json({ error: "dischargeText parameter is required." });
  }

  const cleanSystem = sourceSystem || "Manual Input Entry";
  const eventId = `EVT-${Math.floor(100000 + Math.random() * 900000)}`;
  const timestamp = new Date().toISOString();

  // Create temporary Log of webhook
  let newEvent: WebhookEvent = {
    id: eventId,
    timestamp,
    sourceSystem: cleanSystem,
    eventType: "DISCHARGE_COMPLETED",
    status: "Pending",
    rawText: dischargeText
  };

  try {
    const { ai, isMock } = getGeminiClient();

    let structuredOutput: StructuredDischargeSummary;

    if (isMock) {
      // Use fallback
      structuredOutput = getMockStructuredDischarge(dischargeText);
    } else {
      console.log(`📡 Querying Gemini (gemini-3.5-flash) to structure HMIS record for ${cleanSystem}...`);
      
      const payloadPrompt = `
      You are an expert full-stack hospital Clinical Informatics agent.
      Below is an unstructured raw patient discharge summary transmitted from an Epic/Cerner HMIS.
      Analyze the text carefully and extract the clinical variables. Normalize names, make safe inferences where required.
      Conform strictly to the JSON schema specified.
      
      If dates are relative or absent:
         - Present Date is: 2026-06-05.
         - Date of birth can be calculated using the age from the year 2026.
         - Ensure dates match YYYY-MM-DD.
         
      Raw Discharge Summary Text:
      "${dischargeText}"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: payloadPrompt,
        config: {
          systemInstruction: "You are a state-of-the-art Clinical NLP parser. Map unstructured medical voice or textual summaries into a highly accurate HL7/FHIR-like JSON representation.",
          responseMimeType: "application/json",
          responseSchema: dischargeParserSchema,
          temperature: 0.2
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No payload text received from Gemini server response.");
      }
      
      structuredOutput = JSON.parse(responseText.trim());
    }

    // Successfully parsed! Let's synchronize with our active EHR Database
    const patientRecord = syncToEHRDatabase(structuredOutput);

    // Update log
    newEvent.status = "Success_Synced";
    newEvent.processedRecord = structuredOutput;
    
    // Add to webhook logs
    webhookEvents = [newEvent, ...webhookEvents];

    return res.json({
      success: true,
      eventId: eventId,
      sourceSystem: cleanSystem,
      status: "Synced",
      aiInformed: !isMock,
      patientRecord,
      parsedData: structuredOutput
    });

  } catch (err: any) {
    console.error("❌ HMIS Clinical Link - Error structuring transcript:", err);
    newEvent.status = "Failed_Parsing";
    newEvent.errorMessage = err.message || "Failed parsing transcript using Gemini NLP service.";
    webhookEvents = [newEvent, ...webhookEvents];

    return res.status(500).json({
      success: false,
      eventId: eventId,
      error: "Failed to parse discharge summary record.",
      detail: err.message
    });
  }
});

// --- API ENDPOINT: WEBHOOK SIMULATOR TRIGGER ---
app.post("/api/simulate-webhook", (req: Request, res: Response) => {
  const { textProfile, sourceSystem } = req.body;
  if (!textProfile) {
    return res.status(400).json({ error: "textProfile profile note is required." });
  }

  // Redirect to parse endpoint internally or trigger directly
  // This simulates an external hospital HMIS system hitting our webhook endpoint.
  // We'll process it immediately.
  res.redirect(307, "/api/discharge-parse");
});

// --- API ENDPOINT: GET WORKSPACE HMIS DATA ---
app.get("/api/dashboard-summary", (req: Request, res: Response) => {
  // Return system status
  const patientList = Array.from(patientRecords.values());
  res.json({
    totalSyncedRecords: webhookEvents.filter(e => e.status === "Success_Synced").length,
    activePatientsCount: patientRecords.size,
    webhookHistory: webhookEvents,
    patients: patientList,
    systemOperational: true,
    geminiStatus: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" ? "Operational" : "Demo Mode / Fallback Active"
  });
});

// --- API ENDPOINT: RESET IN-MEMORY STATE ---
app.post("/api/reset-database", (req: Request, res: Response) => {
  webhookEvents = [];
  patientRecords.clear();
  seedPatients();
  res.json({ success: true, message: "In-memory EHR sandbox database reset successfully." });
});

// Start full-stack Node server with Vite Middleware for dev or express static for prod
async function startServer() {
  const PORT = 3000;

  // Serve Vite app in non-production mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🏥 HMIS Discharge Sync running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
