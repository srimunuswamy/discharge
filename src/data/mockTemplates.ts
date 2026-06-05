/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MockClinicalTemplate {
  id: string;
  title: string;
  department: string;
  estimatedAge: string;
  summarySummary: string;
  unstructuredText: string;
}

export const mockTemplates: MockClinicalTemplate[] = [
  {
    id: "cardio-chf",
    title: "Cardiology: Acute Heart Failure Exacerbation",
    department: "Cardiology",
    estimatedAge: "64 yo Male",
    summarySummary: "Volume overload case treated with IV diuresis. Transitioned to Carvedilol and daily monitor rules.",
    unstructuredText: `MERCY GENERAL HOSPITAL
DISCHARGE REPORT
PATIENT: Arthur Pendelton
AGE: 64 | GENDER: Male | MRN: MRN-84920
DOB: 1962-04-12
ATTENDING: Dr. Evelyn Vance, MD
DEPARTMENT: Cardiology Service

This patient was admitted on May 30, 2026, presenting with acute-on-chronic decompensated systolic heart failure. Principal symptoms included significant 3+ bilateral pitting edema up to the mid-calf, marked bibasilar crackles (rales), and worsening orthopnea requiring sleeping in a recliner chair.

HOSPITAL COURSE: 
Rapid diuresis was initiated using IV Furosemide (Lasix) 40mg twice daily. Patient showed excellent response, with a total net negative fluid balance of approximately 4.5 liters and a weight loss of 4.2 kg over 48 hours. Symptoms of orthopnea have fully resolved. Lung fields are now completely clear to auscultation bilaterally. Cardiac rhythm remained stable in normal sinus rhythm throughout the course.

PROCEDURES COMPLETED:
A Transthoracic Echocardiogram (TTE) was performed on May 31, showing a left ventricular ejection fraction (LVEF) of approximately 42%, global hypokinesis, and mild-to-moderate mitral valve regurgitation.

DISCHARGE MEDICATION INSTRUCTIONS:
1. Furosemide (Lasix) 40mg PO daily. This is a NEW dosage strategy to manage chronic volume loading. Take in the morning to prevent nocturia.
2. Continued Lisinopril 10mg PO daily for hypertension management.
3. INITIATED Carvedilol (Coreg) 6.25mg PO BID (twice daily). This is a NEW beta-blocker addition to support myocardial remodeling. Monitor heart rate.
4. DISCONTINUE earlier home prescription of Ibuprofen, as NSAIDs can worsen heart failure fluid retention.

ALLERGIES:
The patient experienced emergency drug reaction to Penicillin in the past, leading to widespread hives and transient breathing difficulty (High severity).

FOLLOW-UP APPOINTMENT:
Patient must follow up in the Cardiology Outpatient Clinic with Dr. Vance in 7 days (by June 12, 2026), located at the Heart & Vascular Pavilion, Suite 302. Please obtain a Basic Metabolic Panel (BMP) to check electrolytes and kidney function 24 hours prior to the clinic visit.

RED FLAGS & CRITICAL ALERTS:
Contact the heart failure hotline immediately if patient experiences:
- Sudden weight gain of more than 3 pounds in 24 hours or 5 pounds in a single week.
- Worsening shortness of breath at rest, or if unable to sleep flat in bed.
- Systolic Blood Pressure drops below 90 mmHg or heart rate drops below 50 bpm.`
  },
  {
    id: "pulm-asthma",
    title: "Pulmonology: Acute Severe Asthma + Bronchitis",
    department: "Pulmonology",
    estimatedAge: "31 yo Female",
    summarySummary: "Respiratory distress secondary to viral bronchitis. Discharged with Prednisone tapering, Duoneb rescue, and daily inhaler controller.",
    unstructuredText: `PRESBYTERIAN HEALTH CENTER
CLINICAL DISCHARGE SUMMARY
PATIENT: Sophia Martinez
DOB: 1994-09-21 | GENDER: Female | MRN: MRN-15309
ADMISSION DATE: June 2, 2026
DISCHARGE DATE: June 5, 2026
ATTENDING PHYSICIAN: Dr. Rachel Green, MD
DIV: Pulmonology / Respiratory Medicine

ADMISSION REASON:
31-year-old female with a long history of persistent asthma presented to the Emergency Department in moderate-to-severe respiratory distress with acute bronchospasm, triggered by an upper respiratory viral illness/acute bronchitis. Initial peak expiratory flow (PEF) was depleted at 185 L/min (approx. 45% of baseline) with severe widespread expiratory wheezing.

SUMMARY OF TREATMENT:
The patient was aggressively treated in the ED and medical ward with continuous nebulized Albuterol and Ipratropium (Duoneb) every 20 minutes for 3 doses, then stepped down to every 4 hours. Intravenous Dexamethasone 10mg was administered initially, followed by transition to oral corticosteroids. 
At discharge, the patient's breathing is stable on room air. Peak Flow has successfully returned to 340 L/min. Sputum cultures were negative; viral bronchitis diagnosed. No active fever. Wheezing is entirely resolved.

PROCEDURE PERFORMED:
Duoneb continuous nebulizer rescue inhalation therapy was completed on admission. Peak flow trends tracked daily.

MEDICATIONS PRESCRIBED ON DISCHARGE:
1. Prednisone 40mg daily by mouth for 5 days. This is a NEW temporary oral steroid taper. Do not halt prematurely. Take with breakfast to minimize GI upset.
2. Continue Albuterol HFA rescue inhaler (Ventolin) - 2 puffs by mouth every 4 to 6 hours only as needed for sudden chest tightness or wheezing.
3. INITIATE Symbicort (Budesonide/Formoterol) 160/4.5 mcg inhaler - 2 puffs twice daily. This is a NEW long-term daily maintenance controller to prevent future hospitalization. Ensure mouth is rinsed with warm water after each use to prevent oral thrush.

ADDITIONAL ALLERGEN NOTICE:
The patient has severe documentation of Aspirin Allergy. Aspirin or other NSAIDs can trigger life-threatening bronchospasm/asthma attacks. Maintain complete avoidance.

OUTPATIENT FOLLOW-UP:
Follow up with her Primary Care Provider, Dr. Jane Foster, at Eastside Family Medicine, within 10 days (by June 15, 2026). Please bring your peak flow diary and all active inhalers to review inhalation technique.

EMERGENCY CRITICAL WARNINGS:
Go to the nearest emergency department or call 911 immediately if you experience:
- Extreme struggle to breathe, retraction of chest/neck muscles, or blue tint to lips or fingernails.
- Inability to speak full continuous sentences in a single breath.
- Peak flow drops below 200 L/min despite using your Albuterol rescue inhaler.`
  },
  {
    id: "gastro-surgery",
    title: "General Surgery: Laparoscopic Appendectomy",
    department: "Surgery",
    estimatedAge: "41 yo Female",
    summarySummary: "Acute appendicitis with uncomplicated surgical removal. Discharged with pain stewardship and surgical wound suture follow-up.",
    unstructuredText: `ST. JUDE HOSPITAL CENTER
SURGICAL SERVICE DISCHARGE INST
PATIENT: Amanda Vance
AGE: 41 | GENDER: Female | MRN: MRN-62841
DOB: 1985-02-14
FACILITY: St. Jude Hospital, Operating Room 4
ATTENDING SURGEON: Dr. Marcus Vance, FACS
DATE OF SURGERY: June 3, 2026
DATE OF DISCHARGE: June 5, 2026

DIAGNOSIS:
Uncomplicated acute appendicitis (ICD-10: K35.80).

Surgical Procedure Performed:
Laparoscopic Appendectomy (minimally invasive) with abdominal washout. Done under general anesthesia. Specimen was intact and sent to pathology.

HOSPITAL COURSE:
Patient presented with a 24-hour history of acute right lower quadrant abdominal pain, nausea, and low-grade pyrexia. Surgical consultation was immediately obtained, and she was brought to the OR. The procedure was completed without complication. Post-operatively, her pain was well-managed. She responded well to clear liquids and has now been advanced to a soft regular diet which she is tolerating well. She is fully ambulating, voiding spontaneously, and vitals are normal.

POST-OPERATIVE DRUG PLAN:
1. Acetaminophen/Codeine (Tylenol #3) 300mg/30mg tablets - Take 1 tablet orally every 6 hours as needed for severe incision pain. Limit use. (NEW, restrict to maximum 3 days).
2. Docusate Sodium (Colace) 100mg capsules - 1 capsule orally twice daily. (NEW, use for 5 days to prevent post-surgical constipation caused by anesthesia and opioids).
3. Resume home medications for gastric reflux (Omeprazole 20mg daily) as previously scheduled.

CONFINEMENTS AND WOUND CARE:
Keep laparoscopic incisions clean and dry. You may shower after 48 hours but do not scrub the surgical glue or dressings. Strictly no tub baths or swimming for 2 weeks. No heavy lifting greater than 10 lbs for 4 weeks to prevent incisional hernia.

ALLERGIES:
Highly sensitive to adhesive tape and surgical glue adhesives (causes local blistering/contact dermatitis; Low severity).

FOLLOW-UP SCHEDULING:
Scheduled for a post-operative incision inspection and healing assessment with Dr. Marcus Vance in the General Surgery Outpatient Suite B in 14 days (June 19, 2026).

EMERGENCY RETURN INSTRUCTIONS:
Seek emergency surgical care if you develop:
- High fever exceeding 101.5°F (38.6°C).
- Worsening, severe abdominal pain that is not relieved by pain medications.
- Spreading redness, extreme tenderness, or foul-smelling yellow drainage around any of the incision sites.
- Persistent vomiting or inability to keep fluids down.`
  },
  {
    id: "endocrine-dka",
    title: "Endocrinology: Diabetic Ketoacidosis (DKA) Resolution",
    department: "Endocrinology",
    estimatedAge: "22 yo Male",
    summarySummary: "DKA crisis due to insulin non-compliance. Resolved with insulin drip. Discharged with intense endocrinology and basal/bolus regimen.",
    unstructuredText: `WESTSIDE METROPOLITAN HOSPITAL
ENDOCRINOLOGY ADMISSION DISCHARGE NOTE
PATIENT: Kevin Zhao
AGE: 22 | GENDER: Male | MRN: MRN-39401
DOB: 2004-11-30
ADMITTED: June 1, 2026
DISCHARGED: June 5, 2026
ATTENDING ENDOCRINOLOGIST: Dr. Sarah Lin, MD

REASON FOR ADMISSION:
A 22-year-old male with Type 1 Diabetes Mellitus presented to emergency services in severe Diabetic Ketoacidosis (DKA). Initial labs highlighted: Blood glucose 542 mg/dL, arterial pH 7.12, serum bicarbonate 8 mEq/L, and heavy positive serum/urine ketones. Secondary to insulin non-compliance due to gastrointestinal virus.

THERAPEUTIC INTERVENTION:
The standard DKA treatment protocol was activated immediately, including aggressive isotonic fluid resuscitation, intravenous insulin infusion at 0.1 units/kg/hr, and electrolyte replacement (potassium correction). Anion gap closed successfully within 18 hours. Patient transitioned from IV insulin to subcutaneous administration. Tolerating diabetic diet well.

PROCEDURE WORKUP:
Continuous ECG telemetry monitor was kept for potassium shift monitoring. Serial arterial blood gas assays.

DISCHARGE INSULIN TREATMENT SCHEDULE (BASAL-BOLUS):
1. Insulin Glargine (Lantus / Long-acting Basal) - 22 Units subcutaneously once daily, strictly at 9:00 PM. (MODIFIED dosage to optimize safety).
2. Insulin Lispro (Humalog / Short-acting Bolus) - 1 Unit subcutaneously per 10 grams of carbohydrates eaten, plus correction scale factor. (CONTINUED strategy).
3. Check fingerstick blood glucose levels (or continuous glucose monitor) before every meal and at bedtime.

ALLERGIES:
No known drug or environmental allergies (NKDA).

OUTPATIENT CLINIC DIRECTIONS:
Must follow up with Dr. Sarah Lin at the Westside Diabetes Center in 5 days (June 10, 2026) for intensive glucose log analysis and Continuous Glucose Monitor (CGM) calibration.

CRITICAL MONITORING & RED FLAGS:
- Check urine ketones immediately if any single fingerstick blood glucose exceeds 250 mg/dL.
- Return to ED immediately if patient develops vomiting, sweet fruity breath odor, rapid deep breathing, or ketones remain moderate-to-high after correction insulin doses.`
  }
];
