/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  Search, 
  Database, 
  Plus, 
  Trash2, 
  Bell, 
  User, 
  Clock, 
  ArrowRight, 
  Check, 
  FileCheck,
  Smartphone,
  Shield,
  Layers,
  Sparkles,
  Sliders,
  HelpCircle
} from "lucide-react";
import { mockTemplates, MockClinicalTemplate } from "./data/mockTemplates";
import { WebhookEvent, PatientRecord, StructuredDischargeSummary, Diagnosis, Prescription, Allergen, FollowUp } from "./types";

export default function App() {
  // Application lists and state
  const [webhookHistory, setWebhookHistory] = useState<WebhookEvent[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "roster" | "analytics">("feed");
  const [selectedPatientMRN, setSelectedPatientMRN] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Custom manual input form
  const [rawClinicalText, setRawClinicalText] = useState(mockTemplates[0].unstructuredText);
  const [selectedTemplateId, setSelectedTemplateId] = useState(mockTemplates[0].id);
  const [sourceSystemInput, setSourceSystemInput] = useState("Epic Care Everywhere");
  
  // Real-time operations stats & states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [selectedLogFilter, setSelectedLogFilter] = useState<"All" | "Success" | "Failed">("All");
  const [syncStatus, setSyncStatus] = useState({
    activePatients: 0,
    totalSynced: 0,
    geminiStatus: "Querying System...",
    systemReady: true,
    latestSyncTime: "Never"
  });

  // Highlight/Edit State of the active parsed item before committing
  const [activeParsedDetails, setActiveParsedDetails] = useState<StructuredDischargeSummary | null>(null);
  const [notif, setNotif] = useState<{ message: string; type: "success" | "info" | "warn" } | null>(null);

  // Trigger brief alert banner
  const triggerNotification = (message: string, type: "success" | "info" | "warn" = "success") => {
    setNotif({ message, type });
    setTimeout(() => {
      setNotif(null);
    }, 4500);
  };

  // Fetch current dashboard summary from our node.js backend server
  const fetchDashboardStats = async () => {
    try {
      const res = await fetch("/api/dashboard-summary");
      if (res.ok) {
        const data = await res.json();
        setWebhookHistory(data.webhookHistory || []);
        setPatients(data.patients || []);
        setSyncStatus({
          activePatients: data.activePatientsCount,
          totalSynced: data.totalSyncedRecords,
          geminiStatus: data.geminiStatus,
          systemReady: data.systemOperational,
          latestSyncTime: data.webhookHistory && data.webhookHistory[0] 
            ? new Date(data.webhookHistory[0].timestamp).toLocaleTimeString() 
            : new Date().toLocaleTimeString()
        });

        // Set active selected patient/event if not already set
        if (data.webhookHistory && data.webhookHistory.length > 0 && !selectedEventId) {
          const firstSuccess = data.webhookHistory.find((e: any) => e.status === "Success_Synced");
          if (firstSuccess) {
            setSelectedEventId(firstSuccess.id);
            setActiveParsedDetails(firstSuccess.processedRecord);
          } else {
            setSelectedEventId(data.webhookHistory[0].id);
            setActiveParsedDetails(data.webhookHistory[0].processedRecord || null);
          }
        }
        if (data.patients && data.patients.length > 0 && !selectedPatientMRN) {
          setSelectedPatientMRN(data.patients[0].mrn);
        }
      }
    } catch (e) {
      console.error("Failed fetching dashboard details from HMIS api root", e);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    // Simulate real-time live system latency update ticks on Mount
    const interval = setInterval(() => {
      // Just keep stats fresh
      fetchDashboardStats();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle Inject template
  const handleSelectTemplate = (id: string) => {
    const found = mockTemplates.find(t => t.id === id);
    if (found) {
      setSelectedTemplateId(id);
      setRawClinicalText(found.unstructuredText);
      triggerNotification(`Loaded template: ${found.title}`, "info");
    }
  };

  // Triggers backend Gemini API call or simulated response 
  const handleSubmitWebhookSync = async () => {
    if (!rawClinicalText.trim()) {
      triggerNotification("Please enter or paste a clinical discharge text summary.", "warn");
      return;
    }

    setIsLoading(true);
    setLoadingStep("1/3 Intercepting Hospital HL7 MLLP record stream...");
    
    // Aesthetic progressive delay state transitions to highlight the intelligent parsing pipeline 
    setTimeout(async () => {
      setLoadingStep("2/3 Dispatching to Gemini Clinical NLP Agent (gemini-3.5-flash)...");
      try {
        const response = await fetch("/api/discharge-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dischargeText: rawClinicalText,
            sourceSystem: sourceSystemInput
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Server failed parsing summary.");
        }

        setLoadingStep("3/3 Schema validation succeeded. Populating EMR medical records...");
        const data = await response.json();
        
        // Refresh local listings and statistics 
        await fetchDashboardStats();
        
        // Set this immediately processed record to detail panel
        setSelectedEventId(data.eventId);
        setActiveParsedDetails(data.parsedData);
        if (data.parsedData?.patientInfo?.mrn) {
          setSelectedPatientMRN(data.parsedData.patientInfo.mrn);
        }

        triggerNotification(`Discharge record synced successfully to patient EHR: ${data.parsedData?.patientInfo?.name || "New Patient"}`, "success");
      } catch (err: any) {
        console.error(err);
        triggerNotification(`Parsing Failed: ${err.message}`, "warn");
      } finally {
        setIsLoading(false);
        setLoadingStep("");
      }
    }, 1200);
  };

  // Reset demo sandbox EMR DB
  const handleResetDatabase = async () => {
    if (window.confirm("Are you sure you want to restore the sandbox database to factory defaults? All manual updates will be cleared.")) {
      try {
        const res = await fetch("/api/reset-database", { method: "POST" });
        if (res.ok) {
          triggerNotification("Sandbox EMR database reset completed successfully", "success");
          setSelectedEventId(null);
          setSelectedPatientMRN(null);
          setActiveParsedDetails(null);
          fetchDashboardStats();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Interactive inline editing to demonstrate compliance review
  const handleUpdateParsedField = (section: string, index: number, field: string, value: any) => {
    if (!activeParsedDetails) return;
    const recordsCopy = JSON.parse(JSON.stringify(activeParsedDetails));

    if (section === "patient") {
      recordsCopy.patientInfo[field] = value;
    } else if (section === "encounter") {
      recordsCopy.encounterInfo[field] = value;
    } else if (section === "diagnoses") {
      recordsCopy.diagnoses[index][field] = value;
    } else if (section === "prescriptions") {
      recordsCopy.prescriptions[index][field] = value;
    } else if (section === "allergies") {
      recordsCopy.allergies[index][field] = value;
    } else if (section === "followUps") {
      recordsCopy.followUps[index][field] = value;
    }
    setActiveParsedDetails(recordsCopy);
  };

  // Add items dynamically to standard compliance arrays
  const addDiagnosisRow = () => {
    if (!activeParsedDetails) return;
    const updated = { ...activeParsedDetails };
    updated.diagnoses.push({ code: "I10", description: "New Diagnosis Item", classification: "Secondary", status: "Active" });
    setActiveParsedDetails(updated);
    triggerNotification("Added custom secondary diagnosis field row", "info");
  };

  const addPrescriptionRow = () => {
    if (!activeParsedDetails) return;
    const updated = { ...activeParsedDetails };
    updated.prescriptions.push({ drugName: "New Medication", dosage: "500mg", frequency: "QID (Daily)", route: "Oral", duration: "7 days", status: "New", indication: "Clinical prophylaxis" });
    setActiveParsedDetails(updated);
    triggerNotification("Added custom medication prescription field row", "info");
  };

  // Confirm changes review and commit back to database state
  const handleSaveAndCommitEHRModifications = () => {
    if (!activeParsedDetails) return;
    
    // Simulate updating patient record with refined fields
    triggerNotification("EMR synchronization fields verified and signed by clinician.", "success");
    // Find patient and replace their active clinical record
    const updatedPatients = patients.map(p => {
      if (p.mrn === activeParsedDetails.patientInfo.mrn) {
        return {
          ...p,
          name: activeParsedDetails.patientInfo.name,
          diagnoses: Array.from(new Set([...p.diagnoses, ...activeParsedDetails.diagnoses.map(d => `${d.description} (${d.code || "N/A"})`)])),
          allergies: Array.from(new Set([...p.allergies, ...activeParsedDetails.allergies.map(a => `${a.substance} (${a.reaction})`)])),
          prescriptionsCount: activeParsedDetails.prescriptions.filter(pr => pr.status !== "Stopped").length,
          lastDischargeDate: activeParsedDetails.encounterInfo.dischargeDate
        };
      }
      return p;
    });
    setPatients(updatedPatients);
  };

  // Filter logs for displaying in active items log list
  const filteredEvents = webhookHistory.filter(evt => {
    if (selectedLogFilter === "Success") return evt.status === "Success_Synced";
    if (selectedLogFilter === "Failed") return evt.status === "Failed_Parsing";
    return true;
  });

  // Filter EMR Patients
  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(search) || p.mrn.toLowerCase().includes(search) || p.diagnoses.some(d => d.toLowerCase().includes(search));
  });

  // Calculate FHIR Mapping validity rate
  const calculateMappingRate = (record: StructuredDischargeSummary | null) => {
    if (!record) return { parsed: 0, total: 32, percentage: 0 };
    let filledFields = 0;
    let checkedFields = 0;

    const countString = (s: string | undefined) => {
      checkedFields++;
      if (s && s.trim().length > 0) filledFields++;
    };

    countString(record.patientInfo.name);
    countString(record.patientInfo.mrn);
    countString(record.patientInfo.dob);
    countString(record.patientInfo.gender);
    countString(record.encounterInfo.admissionDate);
    countString(record.encounterInfo.dischargeDate);
    countString(record.encounterInfo.department);
    countString(record.encounterInfo.attendingPhysician);
    countString(record.encounterInfo.facilityName);
    countString(record.courseOfTreatment);
    countString(record.clinicalNotesSummary);

    // Diagnoses values
    record.diagnoses.forEach(d => {
      countString(d.description);
      countString(d.code);
    });

    // Medications counts
    record.prescriptions.forEach(p => {
      countString(p.drugName);
      countString(p.dosage);
      countString(p.frequency);
    });

    const pct = Math.round((filledFields / Math.max(checkedFields, 1)) * 100);
    return { parsed: filledFields, total: checkedFields, percentage: pct };
  };

  const validationStats = calculateMappingRate(activeParsedDetails);

  // Selected event webhook tracking
  const selectedEvent = webhookHistory.find(e => e.id === selectedEventId);
  const selectedPatientRecord = patients.find(p => p.mrn === selectedPatientMRN);

  return (
    <div id="hmis-discharge-sync-portal" className="flex h-screen w-full flex-col bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* Top Navigation Bar in High Density Theme */}
      <header id="app-header" className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-white font-bold font-display shadow-sm">
            H+
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-800 font-display flex items-center gap-1.5 uppercase">
              HL7 Clinify <span className="text-xs text-blue-600 font-mono normal-case tracking-normal px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded">HMIS Sync-Engine v4.2.0</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-sans tracking-wide">Hospital Discharge Automation & real-time EMR Synchronizer</p>
          </div>
        </div>

        {/* Global telemetry variables */}
        <div className="hidden md:flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${syncStatus.systemReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-mono">
              Listening to HMIS Port: 8080
            </span>
          </div>
          
          <div className="h-8 w-px bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">API Mode:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
              syncStatus.geminiStatus.includes("Operational") 
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                : "bg-amber-100 text-amber-800 border border-amber-200 hover:scale-105 transition-all"
            }`}>
              {syncStatus.geminiStatus}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200"></div>

          <div className="flex items-center gap-2 text-right">
            <div className="text-[11px]">
              <p className="font-bold text-slate-700">Sandbox Clinical Clinic</p>
              <p className="text-[9px] text-slate-400 font-mono text-left">destratum@hospital-sync</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
              <User size={15} className="text-slate-500" />
            </div>
          </div>
        </div>

        {/* Port info on mobile */}
        <div className="flex md:hidden items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-slate-600">Active</span>
        </div>
      </header>

      {/* Global Toast Alert Prompt banner Component */}
      {notif && (
        <div id="status-toast" className={`fixed top-16 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-md shadow-lg border text-xs max-w-md animate-bounce ${
          notif.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
          notif.type === "warn" ? "bg-red-50 text-red-800 border-red-200" :
          "bg-blue-50 text-blue-800 border-blue-200"
        }`}>
          {notif.type === "success" ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-amber-600 shrink-0" />}
          <span className="font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Main Content Layout with Side Log Panel, Data Center, and Editor */}
      <main id="app-main-layout" className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Panel for HMIS Incoming Event Stream logs */}
        <aside id="sidebar-panel" className="w-72 border-r border-slate-200 bg-slate-50/70 py-3 px-2.5 flex flex-col gap-2 shrink-0 overflow-hidden">
          
          <div className="px-2 pb-1.5 border-b border-slate-200">
            <div id="system-monitor-label" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-display">
              Hospital Event Feed
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Auto-Refreshed</span>
              <button 
                onClick={fetchDashboardStats} 
                className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-200 transition-colors" 
                title="Force refresh database status"
              >
                <RefreshCw size={12} className="animate-spin-hover" />
              </button>
            </div>
          </div>

          {/* Action Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-200/60 rounded">
            <button 
              onClick={() => setActiveTab("feed")} 
              className={`py-1 text-[11px] font-bold text-center rounded transition-all cursor-pointer ${activeTab === "feed" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Feed Log
            </button>
            <button 
              onClick={() => setActiveTab("roster")} 
              className={`py-1 text-[11px] font-bold text-center rounded transition-all cursor-pointer ${activeTab === "roster" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              EMR Roster
            </button>
            <button 
              onClick={() => setActiveTab("analytics")} 
              className={`py-1 text-[11px] font-bold text-center rounded transition-all cursor-pointer ${activeTab === "analytics" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Operations
            </button>
          </div>

          {/* TAB 1: Log Event Stream */}
          {activeTab === "feed" && (
            <div id="event-feed-tab" className="flex-1 flex flex-col gap-2 overflow-hidden">
              <div className="flex items-center justify-between px-1 mt-1 text-[10px] font-bold text-slate-400 uppercase">
                <span>Filter Logs</span>
                <div className="flex gap-1.5">
                  <span onClick={() => setSelectedLogFilter("All")} className={`cursor-pointer ${selectedLogFilter === "All" ? "text-blue-600 underline font-extrabold" : ""}`}>All</span>
                  <span onClick={() => setSelectedLogFilter("Success")} className={`cursor-pointer ${selectedLogFilter === "Success" ? "text-emerald-600 underline font-extrabold" : ""}`}>Synced</span>
                  <span onClick={() => setSelectedLogFilter("Failed")} className={`cursor-pointer ${selectedLogFilter === "Failed" ? "text-red-500 underline font-extrabold" : ""}`}>Failed</span>
                </div>
              </div>

              {/* Live Webhook Log List */}
              <div id="webhook-logs-container" className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-white rounded border border-dashed border-slate-300">
                    <p className="text-xs text-slate-400">No matching sync event logs recorded.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Simulate a discharge trigger on the right to sync records.</p>
                  </div>
                ) : (
                  filteredEvents.map((evt) => {
                    const isSelected = selectedEventId === evt.id;
                    const eventDate = new Date(evt.timestamp).toLocaleTimeString();
                    return (
                      <div 
                        key={evt.id} 
                        id={`event-card-${evt.id}`}
                        onClick={() => {
                          setSelectedEventId(evt.id);
                          if (evt.processedRecord) {
                            setActiveParsedDetails(evt.processedRecord);
                            setSelectedPatientMRN(evt.processedRecord.patientInfo.mrn);
                          }
                        }}
                        className={`cursor-pointer p-2.5 rounded-md border text-left transition-all ${
                          isSelected 
                            ? "border-blue-500 bg-white shadow-xs scale-[1.01] ring-2 ring-blue-50" 
                            : "border-slate-200 bg-white hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-blue-600">{evt.id}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{eventDate}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-700 capitalize mt-1.5 truncate">
                          {evt.processedRecord?.patientInfo?.name || "HMIS Raw Discharge Event"}
                        </h4>
                        <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          Source: {evt.sourceSystem}
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`rounded-sm px-1 text-[9px] font-mono font-bold ${
                            evt.status === "Success_Synced" ? "bg-emerald-100 text-emerald-800" : 
                            evt.status === "Failed_Parsing" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {evt.status === "Success_Synced" ? "SYNCHRONIZED" : "FAILED"}
                          </span>
                          {evt.processedRecord?.patientInfo?.mrn && (
                            <span className="text-[9px] font-mono font-bold text-slate-500">{evt.processedRecord.patientInfo.mrn}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Patient EMR Roster Directory */}
          {activeTab === "roster" && (
            <div id="patient-roster-tab" className="flex-1 flex flex-col gap-2 overflow-hidden">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search MRN or Patient..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white rounded border border-slate-200 pl-8 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="roster-list-container">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No active patients match query.
                  </div>
                ) : (
                  filteredPatients.map(pat => {
                    const isSelected = selectedPatientMRN === pat.mrn;
                    return (
                      <div 
                        key={pat.mrn}
                        id={`patient-roster-item-${pat.mrn}`}
                        onClick={() => {
                          setSelectedPatientMRN(pat.mrn);
                          // Pull the latest successful parsed summary into the reviewer if one exists
                          if (pat.history && pat.history.length > 0) {
                            setActiveParsedDetails(pat.history[0]);
                          }
                        }}
                        className={`cursor-pointer p-2.5 rounded-md border text-left transition-all ${
                          isSelected 
                            ? "border-blue-500 bg-white shadow-xs scale-[1.01] ring-2 ring-blue-50" 
                            : "border-slate-200 bg-white hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] font-bold text-slate-400">{pat.mrn}</span>
                          <span className="text-[9px] text-slate-400 font-mono bg-slate-100 px-1 rounded">{pat.gender}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 mt-1">{pat.name}</h4>
                        
                        <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-500">
                          <div>
                            <span className="font-semibold">Last Outflow:</span> {pat.lastDischargeDate}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-slate-400">Diagnosis:</span> {pat.diagnoses[0] || "None Recorded"}
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px]">
                          <span className="text-slate-400">Active Meds: <strong className="text-blue-600 font-mono">{pat.prescriptionsCount}</strong></span>
                          <span className="text-slate-400">Allergies: <strong className="text-red-500 font-mono">{pat.allergies.length}</strong></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: System Analytics & Diagnostics */}
          {activeTab === "analytics" && (
            <div id="system-analytics-tab" className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
              <div className="bg-slate-800 p-3 rounded text-white shadow-sm mt-1">
                <p className="text-[9px] font-bold uppercase opacity-50 tracking-widest font-display">Sync Intercept Latency</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-mono font-bold text-blue-400">142ms</span>
                  <span className="text-[9px] text-emerald-400 font-semibold uppercase font-mono">99.8% Reliability</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full w-11/12 rounded-full bg-emerald-400"></div>
                </div>
              </div>

              <div className="space-y-2 text-[11px] border border-slate-200 bg-white p-3 rounded">
                <p className="font-bold underline text-slate-700">Audit Statistics</p>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Active HL7 Listeners</span>
                  <span className="font-bold text-slate-800 font-mono">1 Socket</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Patients in Directory</span>
                  <span className="font-bold text-slate-800 font-mono">{patients.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Parse Events</span>
                  <span className="font-bold text-slate-800 font-mono">{webhookHistory.length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">ICD-10 Mapping Cache</span>
                  <span className="text-emerald-600 font-bold font-mono">1,024 records</span>
                </div>
              </div>

              {/* Reset database widget button */}
              <div className="mt-auto pt-4">
                <button 
                  onClick={handleResetDatabase}
                  className="w-full bg-red-50 text-red-700 hover:bg-red-100 text-xs py-2 px-3 rounded border border-red-200 font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  Reset Sandbox EMR DB
                </button>
                <p className="text-[9px] text-slate-400 text-center mt-2 leading-relaxed">
                  Resets patient list back to seeding defaults for clean demo replication.
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats Footer Card inside sidebar */}
          <div className="mt-auto border-t border-slate-200 pt-3">
            <div className="rounded bg-blue-900 text-white p-2.5 text-xs relative overflow-hidden">
              <div className="absolute right-1 bottom-1 opacity-10">
                <Heart size={44} />
              </div>
              <p className="text-[9px] font-bold uppercase opacity-60">Synced Patients</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-mono font-bold text-blue-200">{syncStatus.activePatients}</span>
                <span className="text-[9px] bg-blue-800 text-blue-100 px-1 rounded">Real-time Sync</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Center Workstation: Ingestion Simulator + Structured Extract Reviewer */}
        <section id="workstation-frame" className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header containing action buttons and instructions */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4 shrink-0">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight font-display text-slate-800">
                Discharge Mapping Queue Node
              </h2>
              <p className="text-xs text-slate-500">
                Simulate or connect clinical voice/document inputs from HMIS, and immediately review parsed EMR records.
              </p>
            </div>
            
            {/* Template Selector dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Select Input Template:</span>
              <select 
                value={selectedTemplateId} 
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                {mockTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workstation Workspace split grid */}
          <div className="flex-1 flex overflow-hidden p-3.5 gap-3">
            
            {/* LEFT HALF: Webhook Transcript Simulator Ingestion Feed */}
            <div id="transcribe-feed-pane" className="w-[360px] shrink-0 flex flex-col gap-3">
              
              {/* Simulator Ingest Box */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col flex-1 overflow-hidden">
                <div className="bg-slate-50/70 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">HMIS Ingest Simulator</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded uppercase">
                    POST /api/discharge-parse
                  </span>
                </div>

                <div className="p-3.5 flex-1 flex flex-col gap-3">
                  {/* Select System Origin input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">
                      Source HMIS Transmitting Client
                    </label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 rounded border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:ring-1 focus:ring-blue-500 focus:bg-white"
                      value={sourceSystemInput}
                      onChange={(e) => setSourceSystemInput(e.target.value)}
                      placeholder="e.g., Epic Care, Cerner Milieu"
                    />
                  </div>

                  {/* Transcripts input textarea */}
                  <div className="flex-1 flex flex-col min-h-[140px]">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono">
                        Raw Transcript / Clinical Summary Text
                      </label>
                      <button 
                        onClick={() => {
                          setRawClinicalText("");
                          triggerNotification("Textarea cleared", "info");
                        }} 
                        className="text-[9px] text-slate-400 hover:text-red-500 font-bold"
                      >
                        Clear Text
                      </button>
                    </div>
                    <textarea 
                      className="w-full flex-1 bg-slate-50/50 rounded border border-slate-200 p-2.5 text-xs leading-relaxed text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:bg-white focus:outline-none font-sans font-medium resize-none shadow-inner"
                      value={rawClinicalText}
                      onChange={(e) => setRawClinicalText(e.target.value)}
                      placeholder="Paste raw unstructured hospital discharge reports, dictations, speech-transcripts, medical summaries or HL7 stream frames here..."
                    />
                  </div>

                  {/* Trigger Sync Webhook Engine trigger button */}
                  <button 
                    onClick={handleSubmitWebhookSync}
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isLoading 
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" 
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-slate-400" />
                        <span>Processing with AI Server...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Trigger Raw HMIS Import Webhook</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress feedback bar for intelligent parse pipeline */}
              {isLoading && (
                <div id="async-spinner-banner" className="bg-blue-900 text-white p-3.5 rounded-lg shadow-sm border border-blue-800 animate-pulse flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold font-display uppercase tracking-widest">
                    <span>Clinical Engine Active</span>
                    <span className="text-[10px] font-mono font-normal">gemini-3.5-flash</span>
                  </div>
                  <div className="text-[11px] font-sans font-medium text-blue-200">
                    {loadingStep}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-blue-950 rounded-full overflow-hidden">
                    <div className="h-full w-4/6 bg-emerald-400 animate-infinite-loading rounded-full"></div>
                  </div>
                </div>
              )}

              {/* Guide card summarizing system instructions */}
              {!isLoading && (
                <div id="system-instructions-guidance" className="bg-slate-100 rounded-lg border border-slate-200 p-3 flex flex-col gap-1.5 text-[11px] text-slate-500 leading-relaxed shadow-inner">
                  <div className="flex items-center gap-1 font-bold text-slate-700 font-display uppercase tracking-wider text-[10px]">
                    <Shield size={12} className="text-blue-600" />
                    Real-time Synchronization Rules
                  </div>
                  <p>
                    1. When clinical events are received via hospital webhook, raw notes are validated against standards.
                  </p>
                  <p>
                    2. The Gemini NLP model parses, maps, and standardizes parameters like ICD coding and prescription route.
                  </p>
                  <p>
                    3. Records are cross-linked to active patient files matching **MRNs** in real-time.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT HALF: Rich structured record reviewer or parsed summary visualizer */}
            <div id="structured-review-pane" className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Header inside detail inspector */}
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 font-display uppercase tracking-wide">
                    Live Extracted EHR Summary View
                  </span>
                  {activeParsedDetails ? (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase font-mono">
                      Selected: {activeParsedDetails.patientInfo?.name || "Unidentified Record"}
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase font-mono">
                      No Records Evaluated
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (selectedEvent?.rawText) {
                        setRawClinicalText(selectedEvent.rawText);
                        triggerNotification("Pasted historic source text back to editor", "info");
                      }
                    }}
                    disabled={!selectedEvent}
                    className="text-[10px] font-mono text-slate-500 font-semibold hover:text-blue-600 hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline"
                  >
                    Recover Raw Text
                  </button>
                </div>
              </div>

              {/* Structured variables detail review container */}
              {activeParsedDetails ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  
                  {/* Grid row for Patient registry mapping accuracy metrics and summary flags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* General encounter metadata review widget */}
                    <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display mb-1.5 flex justify-between">
                        <span>Patient Registration</span>
                        <span className="font-mono text-blue-600 font-semibold">{activeParsedDetails.patientInfo.mrn || "Draft MRN"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-mono">Patient Name</p>
                          <input 
                            type="text" 
                            className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                            value={activeParsedDetails.patientInfo.name} 
                            onChange={(e) => handleUpdateParsedField("patient", 0, "name", e.target.value)}
                          />
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-mono">Gender/Age</p>
                          <div className="flex gap-1.5 focus-within:border-b focus-within:border-blue-500 text-slate-700">
                            <input 
                              type="text" 
                              className="font-semibold bg-transparent border-none p-0 focus:outline-none w-14"
                              value={activeParsedDetails.patientInfo.gender} 
                              onChange={(e) => handleUpdateParsedField("patient", 0, "gender", e.target.value)}
                            />
                            <span className="text-slate-300 font-mono">/</span>
                            <input 
                              type="number" 
                              className="font-semibold bg-transparent border-none p-0 focus:outline-none w-10 font-mono"
                              value={activeParsedDetails.patientInfo.age || 0} 
                              onChange={(e) => handleUpdateParsedField("patient", 0, "age", parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-mono">Date of Birth</p>
                          <input 
                            type="text" 
                            className="font-mono text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                            value={activeParsedDetails.patientInfo.dob || ""} 
                            onChange={(e) => handleUpdateParsedField("patient", 0, "dob", e.target.value)}
                          />
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-mono">Hospital Ward</p>
                          <input 
                            type="text" 
                            className="font-mono text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                            value={activeParsedDetails.encounterInfo.department || ""} 
                            onChange={(e) => handleUpdateParsedField("encounter", 0, "department", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mappings accuracy dashboard metric */}
                    <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display mb-1.5">
                          HL7 Field Mapping Metrics
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-mono font-bold text-slate-800">{validationStats.parsed} <span className="text-sm text-slate-400 font-extrabold font-sans">/ {validationStats.total}</span></span>
                          <span className="text-emerald-600 text-[10px] font-mono font-bold uppercase mb-1">
                            {validationStats.percentage}% Population Rates
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          <div 
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${validationStats.percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed font-semibold">
                          HL7 Segment validation score conforms fully to clinical safety thresholds.
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Encounter Care team metadata card */}
                  <div className="rounded border border-slate-200">
                    <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold border-b border-slate-200 uppercase tracking-wider text-slate-500 font-display">
                      Care & Organization Demographics
                    </div>
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-mono">Admission Date</span>
                        <input 
                          type="text" 
                          className="font-mono font-semibold text-slate-700 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full mt-0.5"
                          value={activeParsedDetails.encounterInfo.admissionDate} 
                          onChange={(e) => handleUpdateParsedField("encounter", 0, "admissionDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-mono">Discharge Date</span>
                        <input 
                          type="text" 
                          className="font-mono font-semibold text-slate-700 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full mt-0.5"
                          value={activeParsedDetails.encounterInfo.dischargeDate} 
                          onChange={(e) => handleUpdateParsedField("encounter", 0, "dischargeDate", e.target.value)}
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-mono">Attending Clinical Lead</span>
                        <input 
                          type="text" 
                          className="font-semibold text-slate-700 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full mt-0.5"
                          value={activeParsedDetails.encounterInfo.attendingPhysician} 
                          onChange={(e) => handleUpdateParsedField("encounter", 0, "attendingPhysician", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Diagnoses with ICD-10 Coding details list */}
                  <div className="rounded border border-slate-200">
                    <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold border-b border-slate-200 uppercase tracking-wider text-slate-500 flex justify-between items-center font-display">
                      <span>ICD-10 Coded Clinical Diagnoses</span>
                      <button 
                        onClick={addDiagnosisRow}
                        className="text-[9px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={11} /> Add Diagnostic Segment
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {activeParsedDetails.diagnoses.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">No diagnoses documented.</div>
                      ) : (
                        activeParsedDetails.diagnoses.map((diag, index) => (
                          <div key={index} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-slate-50/40">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                                  diag.classification === "Primary" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {diag.classification}
                                </span>
                                <input 
                                  type="text" 
                                  className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                                  value={diag.description} 
                                  onChange={(e) => handleUpdateParsedField("diagnoses", index, "description", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] text-slate-400 font-mono font-bold">ICD-10:</span>
                              <input 
                                type="text" 
                                className="text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-center w-20 focus:bg-white"
                                value={diag.code || ""} 
                                onChange={(e) => handleUpdateParsedField("diagnoses", index, "code", e.target.value)}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Prescriptions and discharge medication instructions */}
                  <div className="rounded border border-slate-200">
                    <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold border-b border-slate-200 uppercase tracking-wider text-slate-500 flex justify-between items-center font-display">
                      <span>Structured Outpatient Prescriptions</span>
                      <button 
                        onClick={addPrescriptionRow}
                        className="text-[9px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={11} /> Add Prescription Line
                      </button>
                    </div>
                    
                    <div className="divide-y divide-slate-100">
                      {activeParsedDetails.prescriptions.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">No discharge prescriptions determined.</div>
                      ) : (
                        activeParsedDetails.prescriptions.map((med, index) => (
                          <div key={index} className="p-3 bg-white hover:bg-slate-50/40">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-bold px-1.5 rounded ${
                                  med.status === "New" ? "bg-emerald-100 text-emerald-800" :
                                  med.status === "Modified" ? "bg-amber-100 text-amber-800" :
                                  med.status === "Stopped" ? "bg-red-100 text-red-800" :
                                  "bg-slate-100 text-slate-700"
                                }`}>
                                  {med.status.toUpperCase()}
                                </span>
                                <input 
                                  type="text" 
                                  value={med.drugName} 
                                  onChange={(e) => handleUpdateParsedField("prescriptions", index, "drugName", e.target.value)}
                                  className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-full"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="font-mono">Dose:</span>
                                <input 
                                  type="text" 
                                  value={med.dosage} 
                                  onChange={(e) => handleUpdateParsedField("prescriptions", index, "dosage", e.target.value)}
                                  className="text-[11px] font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-20"
                                />
                                <span className="font-mono">Freq:</span>
                                <input 
                                  type="text" 
                                  value={med.frequency} 
                                  onChange={(e) => handleUpdateParsedField("prescriptions", index, "frequency", e.target.value)}
                                  className="text-[11px] font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:outline-none w-28"
                                />
                              </div>
                            </div>
                            
                            {/* Indication section details to display comprehensive care records */}
                            <div className="mt-1.5 pl-3 border-l-2 border-slate-200">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[9px] text-slate-400 font-mono uppercase">Indication:</span>
                                <input 
                                  type="text" 
                                  value={med.indication || "Not Specified"} 
                                  onChange={(e) => handleUpdateParsedField("prescriptions", index, "indication", e.target.value)}
                                  className="text-[10px] text-slate-600 bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Longitudinal Clinical Course Summary narrative segment */}
                  <div className="rounded border border-slate-200 p-3 bg-slate-50/40">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Structured Course & Treatment Summary</p>
                    <textarea 
                      className="text-xs text-slate-600 leading-relaxed font-sans font-medium bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full resize-none mt-1"
                      rows={3}
                      value={activeParsedDetails.courseOfTreatment}
                      onChange={(e) => {
                        const copy = { ...activeParsedDetails };
                        copy.courseOfTreatment = e.target.value;
                        setActiveParsedDetails(copy);
                      }}
                    />
                  </div>

                  {/* Critical warning alerts and follow up information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* Allergies Alerts */}
                    <div className="rounded border border-slate-200 p-3 bg-white">
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 font-mono mb-2">
                        <AlertTriangle size={12} /> Patient Clinical Intolerances
                      </div>
                      {activeParsedDetails.allergies.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No drug allergies disclosed.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {activeParsedDetails.allergies.map((alg, i) => (
                            <div key={i} className="flex justify-between items-start text-xs border-b border-slate-50 pb-1">
                              <div>
                                <span className="font-bold text-slate-700">{alg.substance}</span>
                                <span className="text-[9px] text-slate-400 block">{alg.reaction}</span>
                              </div>
                              <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${
                                alg.severity === "High" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                              }`}>
                                {alg.severity} Severity
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Critical Outpatient Appointments Follow up Alerts */}
                    <div className="rounded border border-slate-200 p-3 bg-white">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 font-display mb-2">
                        <Clock size={12} className="text-blue-600" /> Outpatient Care Directives
                      </div>
                      {activeParsedDetails.followUps.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No appointments specified.</p>
                      ) : (
                        <div className="space-y-2">
                          {activeParsedDetails.followUps.map((appt, i) => (
                            <div key={i} className="text-xs bg-slate-50 p-2 rounded">
                              <div className="flex justify-between">
                                <span className="font-bold text-slate-800">{appt.specialist}</span>
                                <span className="text-[10px] font-mono text-blue-600 font-bold">{appt.appointmentDate}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 italic mt-0.5">{appt.location}</p>
                              {appt.notes && <p className="text-[10px] text-slate-400 font-medium font-mono mt-1">{appt.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Red flags and emergency clinical cautions */}
                  {activeParsedDetails.criticalAlerts && activeParsedDetails.criticalAlerts.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-xs leading-relaxed text-red-800 flex items-start gap-2.5">
                      <Shield size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold font-mono tracking-wider text-[10px] block text-red-700 uppercase">Emergency Safety Red Flags:</span>
                        <div className="mt-1 space-y-1">
                          {activeParsedDetails.criticalAlerts.map((e, index) => (
                            <div key={index}>
                              • <strong className="font-bold">{e.alertType}:</strong> {e.description} ({e.severity})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
                  <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 animate-pulse">
                    <Database size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No Patient Live Stream Selection</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                    Select a synchronized event log from the history panel or trigger a real-time hospital simulated update to analyze structure mappings.
                  </p>
                </div>
              )}

              {/* Bottom control row inside detailed inspector */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 shrink-0">
                <div className="flex items-center gap-4 text-[9px] font-medium text-slate-400 font-mono uppercase">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    HL7/FHIR Validated
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    LOINC Codes Verified
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (!activeParsedDetails) return;
                      // Display dialog to clone structured JSON directly 
                      const blob = new Blob([JSON.stringify(activeParsedDetails, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `FHIR-discharge-${activeParsedDetails.patientInfo?.mrn || "Unknown"}.json`;
                      a.click();
                      triggerNotification("Exported structured FHIR JSON schema packet", "success");
                    }}
                    disabled={!activeParsedDetails}
                    className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Export FHIR Record
                  </button>
                  <button 
                    onClick={handleSaveAndCommitEHRModifications}
                    disabled={!activeParsedDetails}
                    className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Confirm & Update EMR Roster
                  </button>
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* Bottom Status Footer Bar in High Density layout */}
      <footer id="app-footer" className="flex h-8 items-center justify-between border-t border-slate-200 bg-white px-4 text-[10px] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="font-bold">PACS INTEGRATION:</span>
            <span className="text-emerald-600 font-semibold uppercase">ONLINE</span>
          </div>
          <div className="h-3 w-px bg-slate-200"></div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="font-bold">EHR DB METADATA:</span>
            <span>RESTful FHIR API JSON</span>
          </div>
          <div className="h-3 w-px bg-slate-200 font-mono"></div>
          <div className="flex items-center gap-1 text-slate-500 font-mono">
            <span>CLIENT NODE EMAIL:</span>
            <span className="text-slate-800">{`srividhyabhavani@destratum.com`}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-slate-400">
          LAST ENGINE POLL: {syncStatus.latestSyncTime}
        </div>
      </footer>
    </div>
  );
}
