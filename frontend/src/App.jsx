import { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { API, TOKEN_KEY, storedUser, saveSession, clearSession } from "./api";
import { C, applyTheme } from "./theme";
import {
  Card, SectionTitle, Badge, StatusBadge, ProgressBar, KPICard, Table,
  inputSt, labelSt, FInput, FSelect, FTextarea,
} from "./ui";
import { GaugeRing, DonutChart, KPICardPro, StackedBar, RadarChart, HeatGrid, Sparkline } from "./charts";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// API base, auth session and the fetch interceptor now live in ./api.js


// ─── PERIOD CONTEXT ───────────────────────────────────────────────────────────
// Lets any module read the globally-selected reporting period via usePeriod().
// Modules that don't need it simply ignore it — no prop-drilling required.
const PeriodContext = createContext("Q2-2627");
function usePeriod() { return useContext(PeriodContext); }

// ─── AUDIT LOG HELPER ─────────────────────────────────────────────────────────
async function logAudit({ module, action, recordId, description, before=null, after=null, meta={} }) {
  try {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!Array.isArray(data.auditLog)) data.auditLog = [];
    data.auditLog.push({
      timestamp: new Date().toISOString(),
      module, action, recordId, description,
      before, after, meta,
    });
    // Keep last 500 entries
    if (data.auditLog.length > 500) data.auditLog = data.auditLog.slice(-500);
    await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
  } catch(e) { console.warn("Audit log failed:", e.message); }
}

// Colour tokens (C, applyTheme) now live in ./theme.js


// ─── STATIC FALLBACK DATA ─────────────────────────────────────────────────────
const STATIC_RISKS = [
  { id:"SR-001", title:"Limited and Undivided Mandate",        category:"Strategic Risk", inherentRating:16, residualRating:12, currentStatus:"Outside Tolerance", owner:"CEO",         appetite:"Low",  response:"Treat", department:"Office of the CEO",  reviewDate:"2026-09-30" },
  { id:"SR-002", title:"Inadequate Stakeholder Engagement",    category:"Strategic Risk", inherentRating:12, residualRating:9,  currentStatus:"Within Tolerance",  owner:"COO",         appetite:"Low",  response:"Treat", department:"Office of the COO",  reviewDate:"2026-09-30" },
  { id:"SR-003", title:"Cyber & Information Security Threat",  category:"Strategic Risk", inherentRating:10, residualRating:8,  currentStatus:"Outside Tolerance", owner:"CIO",         appetite:"Medium",response:"Treat",department:"ICT",               reviewDate:"2026-09-30" },
  { id:"SR-004", title:"Erosion of Organisational Integrity",  category:"Strategic Risk", inherentRating:14, residualRating:10, currentStatus:"Outside Tolerance", owner:"CFO",         appetite:"Zero", response:"Avoid", department:"Finance",            reviewDate:"2026-09-30" },
  { id:"SR-005", title:"Threat to Information Assets",         category:"Strategic Risk", inherentRating:18, residualRating:14, currentStatus:"Outside Tolerance", owner:"CIO",         appetite:"Low",  response:"Treat", department:"ICT",               reviewDate:"2026-09-30" },
  { id:"COMP-001",title:"Non-Compliance with Legislation",     category:"Compliance Risk",inherentRating:15, residualRating:11, currentStatus:"Outside Tolerance", owner:"Legal",       appetite:"Zero", response:"Avoid", department:"Legal",              reviewDate:"2026-09-30" },
  { id:"COMP-002",title:"Skills Development Delivery Failure", category:"Compliance Risk",inherentRating:9,  residualRating:6,  currentStatus:"Within Tolerance",  owner:"ETQA Manager",appetite:"Low",  response:"Treat", department:"ETQA",              reviewDate:"2026-09-30" },
  { id:"OP-001",  title:"Financial Sustainability Risk",       category:"Operational Risk",inherentRating:12, residualRating:8,  currentStatus:"Within Tolerance",  owner:"CFO",         appetite:"Low",  response:"Treat", department:"Finance",            reviewDate:"2026-09-30" },
  { id:"OP-002",  title:"SCM Procurement Irregularities",      category:"Operational Risk",inherentRating:16, residualRating:12, currentStatus:"Outside Tolerance", owner:"SCM Manager", appetite:"Zero", response:"Avoid", department:"SCM",               reviewDate:"2026-09-30" },
  { id:"OP-003",  title:"Human Capital Instability",           category:"Operational Risk",inherentRating:9,  residualRating:7,  currentStatus:"Within Tolerance",  owner:"HR Manager",  appetite:"Low",  response:"Treat", department:"Human Resources",    reviewDate:"2026-09-30" },
];

const STATIC_KRIS = [
  { id:"KRI-001", indicator:"Levy Income vs Budget",        currentPeriodValue:"94%",  target:"95%",  currentStatus:"Outside Tolerance", trend:"Declining" },
  { id:"KRI-002", indicator:"DG Disbursement Rate",         currentPeriodValue:"78%",  target:"80%",  currentStatus:"Within Tolerance",  trend:"Improving" },
  { id:"KRI-003", indicator:"Audit Findings (Material)",    currentPeriodValue:"3",    target:"2",    currentStatus:"Outside Tolerance", trend:"Stable"    },
  { id:"KRI-004", indicator:"Treatment Action Completion",  currentPeriodValue:"72%",  target:"85%",  currentStatus:"Outside Tolerance", trend:"Improving" },
  { id:"KRI-005", indicator:"UIFW as % of Budget",          currentPeriodValue:"4.2%", target:"2%",   currentStatus:"Outside Tolerance", trend:"Declining" },
  { id:"KRI-006", indicator:"Stakeholder Satisfaction",     currentPeriodValue:"68%",  target:"75%",  currentStatus:"Outside Tolerance", trend:"Improving" },
  { id:"KRI-007", indicator:"BCM Test Success Rate",        currentPeriodValue:"88%",  target:"90%",  currentStatus:"Within Tolerance",  trend:"Stable"    },
  { id:"KRI-008", indicator:"Fraud Cases Reported",         currentPeriodValue:"2",    target:"0",    currentStatus:"Outside Tolerance", trend:"Declining" },
];

const STATIC_TREATMENTS = [
  { id:"TA-001", riskId:"SR-005", action:"Implement ISMS aligned to ISO 27001",      owner:"CIO",         dueDate:"2026-09-30", progress:65,  status:"In Progress"   },
  { id:"TA-002", riskId:"SR-001", action:"Engage DHET on mandate clarification",      owner:"CEO",         dueDate:"2026-07-31", progress:40,  status:"In Progress"   },
  { id:"TA-003", riskId:"OP-002", action:"Strengthen SCM oversight committee",        owner:"SCM Manager", dueDate:"2026-06-30", progress:90,  status:"Near Complete" },
  { id:"TA-004", riskId:"COMP-001",action:"Legal compliance calendar implementation", owner:"Legal",       dueDate:"2026-08-31", progress:55,  status:"In Progress"   },
  { id:"TA-005", riskId:"SR-004", action:"Ethics hotline and awareness campaign",     owner:"HR Manager",  dueDate:"2026-07-15", progress:80,  status:"In Progress"   },
  { id:"TA-006", riskId:"KRI-008",action:"Fraud risk assessment and controls review", owner:"IA",          dueDate:"2026-09-30", progress:25,  status:"Not Started"   },
  { id:"TA-007", riskId:"SR-003", action:"Penetration testing and patch management",  owner:"CIO",         dueDate:"2026-06-30", progress:100, status:"Complete"      },
  { id:"TA-008", riskId:"OP-001", action:"Five-year financial sustainability plan",   owner:"CFO",         dueDate:"2026-10-31", progress:30,  status:"In Progress"   },
];

const STATIC_UIFW = [
  { id:"UIFW-001", type:"Irregular",        amount:8500000, department:"SCM",        description:"Awards without competitive bidding",  status:"Under Investigation" },
  { id:"UIFW-002", type:"Irregular",        amount:3200000, department:"Finance",    description:"Payment without valid PO",             status:"Condoned"            },
  { id:"UIFW-003", type:"Fruitless & Wasteful",amount:1800000,department:"HR",       description:"Training cancellation penalties",      status:"Open"                },
  { id:"UIFW-004", type:"Fruitless & Wasteful",amount:950000, department:"Operations",description:"Duplicate payments",                 status:"Recovered"           },
  { id:"UIFW-005", type:"Irregular",        amount:4200000, department:"Projects",   description:"Non-compliant variation orders",       status:"Under Investigation" },
  { id:"UIFW-006", type:"Fruitless & Wasteful",amount:1250000,department:"SCM",      description:"Expired contract renewals",            status:"Open"                },
];

const STATIC_FRAUD = [
  { id:"FC-001", category:"Procurement Fraud",    description:"Fictitious supplier payments",  amount:2100000, status:"Under Investigation", reported:"2026-03-15", source:"Hotline"    },
  { id:"FC-002", category:"Misappropriation",     description:"Petty cash irregularities",     amount:45000,   status:"Resolved",            reported:"2026-01-10", source:"Internal"   },
  { id:"FC-003", category:"Conflict of Interest", description:"Undisclosed business interest", amount:0,       status:"Disciplinary Action", reported:"2026-04-02", source:"Disclosure" },
];

const STATIC_DEPTS = [
  { name:"Finance",    risks:8,  critical:2, treatment:75, uifw:3200000  },
  { name:"SCM",        risks:12, critical:4, treatment:60, uifw:8500000  },
  { name:"HR",         risks:6,  critical:1, treatment:85, uifw:1800000  },
  { name:"Operations", risks:9,  critical:2, treatment:70, uifw:950000   },
  { name:"Projects",   risks:10, critical:3, treatment:65, uifw:4200000  },
  { name:"Legal",      risks:5,  critical:2, treatment:80, uifw:0        },
  { name:"IT",         risks:7,  critical:2, treatment:55, uifw:0        },
  { name:"ETQA",       risks:6,  critical:1, treatment:90, uifw:0        },
];

// Organisational portfolio → unit hierarchy
const STATIC_PORTFOLIOS = [
  { name:"CFO Office",           units:["SCM","Finance & Reporting"] },
  { name:"Corporate Services",   units:["ICT","Communications & Marketing","Human Resources","Facilities/Fleet/Security"] },
  { name:"COO Office",           units:["Project Management","Provincial Offices","ETQA"] },
  { name:"CEO Office",           units:["Governance","Stakeholders & Partnerships","Legal & Compliance"] },
  { name:"Strategy & Planning",  units:["Research & Innovation","Monitoring & Evaluation","SSP"] },
  { name:"Internal Audit",       units:["Internal Audit"] },
];

// Operational risk register — tagged by portfolio + unit, with full rating profile
const STATIC_OPRISKS = [
  { id:"OR-001", portfolio:"CFO Office", unit:"SCM", name:"Irregular procurement / non-compliant bids", inherent:20, residual:15, current:15, target:8,  appetite:"Low",    trend:"Improving", owner:"SCM Manager", description:"Procurement processes deviating from PFMA/Treasury regulations leading to irregular expenditure." },
  { id:"OR-002", portfolio:"CFO Office", unit:"SCM", name:"Supplier concentration & dependency", inherent:16, residual:12, current:12, target:8,  appetite:"Medium", trend:"Stable",    owner:"SCM Manager", description:"Over-reliance on a small pool of suppliers creating delivery and pricing risk." },
  { id:"OR-003", portfolio:"CFO Office", unit:"Finance & Reporting", name:"Material misstatement in AFS", inherent:18, residual:10, current:10, target:6,  appetite:"Zero",   trend:"Improving", owner:"CFO", description:"Errors or omissions in annual financial statements affecting audit outcome." },
  { id:"OR-004", portfolio:"CFO Office", unit:"Finance & Reporting", name:"Cash flow & levy income volatility", inherent:15, residual:11, current:12, target:8,  appetite:"Medium", trend:"Declining", owner:"CFO", description:"Fluctuations in levy income undermining budget execution." },
  { id:"OR-005", portfolio:"Corporate Services", unit:"ICT", name:"Cybersecurity breach / ransomware", inherent:25, residual:18, current:18, target:10, appetite:"Low",    trend:"Declining", owner:"CIO", description:"External attack compromising systems, data integrity and availability." },
  { id:"OR-006", portfolio:"Corporate Services", unit:"ICT", name:"Legacy systems & technical debt", inherent:16, residual:13, current:13, target:8,  appetite:"Medium", trend:"Stable",    owner:"CIO", description:"Ageing infrastructure increasing downtime and maintenance cost." },
  { id:"OR-007", portfolio:"Corporate Services", unit:"Communications & Marketing", name:"Reputational damage / negative media", inherent:14, residual:10, current:10, target:6,  appetite:"Low",    trend:"Stable",    owner:"Comms Manager", description:"Adverse publicity eroding stakeholder confidence." },
  { id:"OR-008", portfolio:"Corporate Services", unit:"Human Resources", name:"Critical skills vacancy & turnover", inherent:16, residual:12, current:13, target:8,  appetite:"Medium", trend:"Declining", owner:"HR Manager", description:"Inability to attract/retain scarce skills affecting delivery." },
  { id:"OR-009", portfolio:"Corporate Services", unit:"Facilities/Fleet/Security", name:"Physical security & asset loss", inherent:12, residual:9,  current:9,  target:5,  appetite:"Low",    trend:"Improving", owner:"Facilities Manager", description:"Theft, damage or unauthorised access to premises and assets." },
  { id:"OR-010", portfolio:"COO Office", unit:"Project Management", name:"Project delivery delays & overruns", inherent:18, residual:14, current:14, target:8,  appetite:"Medium", trend:"Stable",    owner:"PMO Lead", description:"Discretionary grant projects missing milestones and budgets." },
  { id:"OR-011", portfolio:"COO Office", unit:"Provincial Offices", name:"Inconsistent service delivery across provinces", inherent:15, residual:11, current:11, target:7,  appetite:"Medium", trend:"Improving", owner:"COO", description:"Variability in provincial office performance and compliance." },
  { id:"OR-012", portfolio:"COO Office", unit:"ETQA", name:"Accreditation & quality assurance lapses", inherent:16, residual:10, current:10, target:6,  appetite:"Low",    trend:"Improving", owner:"ETQA Manager", description:"Provider accreditation or learner certification quality failures." },
  { id:"OR-013", portfolio:"CEO Office", unit:"Governance", name:"Governance / board oversight gaps", inherent:14, residual:9,  current:9,  target:5,  appetite:"Zero",   trend:"Stable",    owner:"Company Secretary", description:"Weak committee functioning or oversight undermining accountability." },
  { id:"OR-014", portfolio:"CEO Office", unit:"Stakeholders & Partnerships", name:"Partnership / MOU non-delivery", inherent:13, residual:10, current:10, target:6,  appetite:"Medium", trend:"Stable",    owner:"Partnerships Lead", description:"Key partners failing to meet commitments under agreements." },
  { id:"OR-015", portfolio:"CEO Office", unit:"Legal & Compliance", name:"Regulatory non-compliance / litigation", inherent:18, residual:12, current:12, target:7,  appetite:"Zero",   trend:"Improving", owner:"Legal Manager", description:"Breaches of statutory obligations exposing the entity to penalties or litigation." },
  { id:"OR-016", portfolio:"Strategy & Planning", unit:"Research & Innovation", name:"Research outputs not informing strategy", inherent:11, residual:8,  current:8,  target:5,  appetite:"Medium", trend:"Stable",    owner:"Research Lead", description:"Insufficient uptake of research into planning decisions." },
  { id:"OR-017", portfolio:"Strategy & Planning", unit:"Monitoring & Evaluation", name:"Poor data quality in M&E reporting", inherent:15, residual:11, current:11, target:7,  appetite:"Low",    trend:"Improving", owner:"M&E Manager", description:"Unreliable performance data undermining decision-making and audit." },
  { id:"OR-018", portfolio:"Strategy & Planning", unit:"SSP", name:"Sector Skills Plan misalignment", inherent:13, residual:10, current:10, target:6,  appetite:"Medium", trend:"Stable",    owner:"SSP Lead", description:"SSP not reflecting actual sector skills demand." },
  { id:"OR-019", portfolio:"Internal Audit", unit:"Internal Audit", name:"Inadequate audit coverage of key risks", inherent:14, residual:9,  current:9,  target:5,  appetite:"Low",    trend:"Improving", owner:"CAE", description:"Audit plan not covering highest-priority risk areas." },
  { id:"OR-020", portfolio:"Internal Audit", unit:"Internal Audit", name:"Slow management action on findings", inherent:13, residual:11, current:11, target:6,  appetite:"Low",    trend:"Declining", owner:"CAE", description:"Audit findings not remediated within agreed timeframes." },
];

const STATIC_THIRD = [
  { id:"TP-001", name:"Deloitte SA",       type:"Auditor",    risk:"Low",    contract:"2027-03-31", score:88, status:"Active" },
  { id:"TP-002", name:"Bytes Technology",  type:"ICT",        risk:"Medium", contract:"2026-09-30", score:72, status:"Active" },
  { id:"TP-003", name:"Tsebo Facilities",  type:"Facilities", risk:"Low",    contract:"2026-12-31", score:81, status:"Active" },
  { id:"TP-004", name:"SAICA Training Co", type:"Training",   risk:"High",   contract:"2026-06-30", score:58, status:"Review" },
  { id:"TP-005", name:"Standard Bank",     type:"Banking",    risk:"Low",    contract:"Ongoing",    score:95, status:"Active" },
  { id:"TP-006", name:"Lekota Security",   type:"Security",   risk:"Medium", contract:"2026-08-31", score:67, status:"Active" },
];

const STATIC_APP = [
  { ref:"APP 1.1", objective:"Increase learnership registrations by 15%", target:15,  actual:12,  status:"Behind",      quarter:"Q2" },
  { ref:"APP 1.2", objective:"Disburse 90% of DG budget",                 target:90,  actual:78,  status:"Behind",      quarter:"Q2" },
  { ref:"APP 2.1", objective:"Achieve clean audit opinion",                target:100, actual:100, status:"On Track",    quarter:"Q4" },
  { ref:"APP 2.2", objective:"Reduce UIFW below 2% of budget",            target:2,   actual:4.2, status:"Behind",      quarter:"Q2" },
  { ref:"APP 3.1", objective:"Complete ICT master plan",                   target:100, actual:60,  status:"In Progress", quarter:"Q3" },
  { ref:"APP 3.2", objective:"Stakeholder satisfaction above 75%",         target:75,  actual:68,  status:"Behind",      quarter:"Q2" },
  { ref:"APP 4.1", objective:"Fill all critical vacancies",                target:100, actual:85,  status:"In Progress", quarter:"Q3" },
];

const STATIC_EMERGING = [
  { id:"ER-001", name:"AI Displacement of Skills Dev",       likelihood:4, impact:4, horizon:"12-24 months", category:"Technology",  action:"Monitor"  },
  { id:"ER-002", name:"Geopolitical Trade Disruptions",      likelihood:3, impact:3, horizon:"6-12 months",  category:"Economic",    action:"Watch"    },
  { id:"ER-003", name:"Regulatory Overhaul (SETA landscape)",likelihood:4, impact:5, horizon:"12-18 months", category:"Regulatory",  action:"Escalate" },
  { id:"ER-004", name:"Cybersecurity — Ransomware",          likelihood:4, impact:4, horizon:"Immediate",    category:"Technology",  action:"Mitigate" },
  { id:"ER-005", name:"Climate Risk to Operations",          likelihood:2, impact:3, horizon:"24+ months",   category:"Environment", action:"Monitor"  },
];

const STATIC_OPP = [
  { id:"OPP-001", name:"Digital Skills Grant Expansion", score:18, benefit:"R15M additional levy income",   status:"Active",   owner:"CEO"  },
  { id:"OPP-002", name:"Inter-SETA Collaboration",       score:12, benefit:"Shared infrastructure savings", status:"Proposed", owner:"COO"  },
  { id:"OPP-003", name:"Green Skills Programme",          score:15, benefit:"New funding stream",            status:"Active",   owner:"ETQA" },
  { id:"OPP-004", name:"AI-Enhanced M&E Platform",       score:14, benefit:"30% reporting efficiency gain", status:"Proposed", owner:"CIO"  },
  { id:"OPP-005", name:"Expanded RPL Assessments",       score:10, benefit:"R5M additional revenue",        status:"Active",   owner:"ETQA" },
];

const STATIC_APPETITE = [
  { category:"Financial",    appetite:"Low",    current:12.4, max:8,  unit:"score"    },
  { category:"Compliance",   appetite:"Zero",   current:3,    max:0,  unit:"findings" },
  { category:"Operational",  appetite:"Medium", current:9.2,  max:12, unit:"score"    },
  { category:"Reputational", appetite:"Low",    current:6.1,  max:5,  unit:"score"    },
  { category:"Strategic",    appetite:"Low",    current:14.2, max:10, unit:"score"    },
  { category:"Technology",   appetite:"Medium", current:8.8,  max:12, unit:"score"    },
];

const STATIC_ASSURANCE = [
  { risk:"SR-005",  assurer1:"IA-Covered",  assurer2:"Ext Audit-Flagged", assurer3:"AGSA-Reported", gap:"Partially covered", level:"Reasonable" },
  { risk:"OP-002",  assurer1:"IA-Covered",  assurer2:"Ext Audit-Flagged", assurer3:"AGSA-Reported", gap:"Coverage gap",      level:"Limited"    },
  { risk:"COMP-001",assurer1:"IA-Covered",  assurer2:"Legal-Reviewed",    assurer3:"AGSA-Clean",    gap:"None",              level:"Full"       },
  { risk:"SR-001",  assurer1:"Board-Noted", assurer2:"Ext Audit-Clean",   assurer3:"AGSA-Clean",    gap:"None",              level:"Reasonable" },
];

const STATIC_BCM = {
  overview:  { biaComplete:85, plansTested:6, plansTotal:8, rto:"4 hours", rpo:"2 hours", lastTest:"2026-04-15", nextTest:"2026-10-15", criticalProcesses:12, processesWithBCP:10 },
  incidents: [
    { id:"INC-001", date:"2026-02-10", type:"IT Outage",          duration:"3.5 hrs", impact:"Medium", resolution:"Resolved",  rtoMet:true  },
    { id:"INC-002", date:"2026-04-05", type:"Power Failure",      duration:"1.2 hrs", impact:"Low",    resolution:"Resolved",  rtoMet:true  },
    { id:"INC-003", date:"2026-05-20", type:"Data Breach Attempt",duration:"N/A",     impact:"High",   resolution:"Contained", rtoMet:false },
  ],
};

// Shared UI primitives now live in ./ui.jsx
// ─── STRATEGIC RISKS FORM ─────────────────────────────────────────────────────
const EMPTY_RISK = {
  id:"", title:"", category:"Strategic Risk", description:"", cause:"", consequence:"",
  inherentRating:"", residualRating:"", currentRating:"", targetRating:"",
  currentStatus:"Outside Tolerance", appetite:"Low", tolerance:"Outside Tolerance",
  owner:"", department:"", response:"Treat", controlEffectiveness:"Partially Effective",
  trend:"Stable", treatmentAction:"", reviewDate:"", assuranceProvider:"Internal Audit",
};

function RiskForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_RISK, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit Risk — ${initial.id}` : "Add New Risk"}
      </h3>

      {/* Row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="Risk ID"       value={f.id}       onChange={set("id")}       required placeholder="SR-011" />
        <FInput label="Risk Title"    value={f.title}    onChange={set("title")}    required placeholder="e.g. Inadequate IT Governance" />
      </div>

      {/* Row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Category" value={f.category} onChange={set("category")} options={["Strategic Risk","Compliance Risk","Operational Risk","Financial Risk","Reputational Risk","Technology Risk"]} required />
        <FSelect label="Risk Appetite" value={f.appetite} onChange={set("appetite")} options={["Zero","Low","Medium","High"]} />
        <FSelect label="Current Status" value={f.currentStatus} onChange={set("currentStatus")} options={["Outside Tolerance","Within Tolerance","Emerging","Closed"]} required />
      </div>

      {/* Row 3 — Ratings */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Inherent Rating (1-25)" value={f.inherentRating} onChange={set("inherentRating")} type="number" placeholder="16" />
        <FInput label="Residual Rating (1-25)" value={f.residualRating} onChange={set("residualRating")} type="number" placeholder="12" />
        <FInput label="Current Rating"  value={f.currentRating}  onChange={set("currentRating")}  type="number" placeholder="12" />
        <FInput label="Target Rating"   value={f.targetRating}   onChange={set("targetRating")}   type="number" placeholder="6"  />
      </div>

      {/* Row 4 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Risk Owner"   value={f.owner}      onChange={set("owner")}      placeholder="e.g. CFO" />
        <FInput label="Department"   value={f.department} onChange={set("department")} placeholder="e.g. Finance" />
      </div>

      {/* Row 5 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Response Strategy" value={f.response} onChange={set("response")} options={["Treat","Tolerate","Transfer","Avoid","Exploit"]} />
        <FSelect label="Control Effectiveness" value={f.controlEffectiveness} onChange={set("controlEffectiveness")} options={["Effective","Partially Effective","Ineffective","Not Assessed"]} />
        <FSelect label="Trend" value={f.trend} onChange={set("trend")} options={["Improving","Stable","Declining","Unknown"]} />
      </div>

      {/* Textareas */}
      <FTextarea label="Description"     value={f.description}    onChange={set("description")}    placeholder="Describe the risk…" />
      <FTextarea label="Cause"           value={f.cause}          onChange={set("cause")}          placeholder="What causes this risk?" />
      <FTextarea label="Consequence"     value={f.consequence}    onChange={set("consequence")}    placeholder="What is the potential impact?" />
      <FTextarea label="Treatment Action Summary" value={f.treatmentAction} onChange={set("treatmentAction")} placeholder="Brief summary of treatment approach…" />

      {/* Row 6 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Review Date"         value={f.reviewDate}        onChange={set("reviewDate")}        type="date" />
        <FInput label="Assurance Provider"  value={f.assuranceProvider} onChange={set("assuranceProvider")} placeholder="e.g. Internal Audit" />
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Risk" : "Add Risk"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── STRATEGIC RISKS ADMIN PANEL ──────────────────────────────────────────────
function StrategicRisksAdmin() {
  const [risks, setRisks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null); // null | "add" | {risk}
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/risks`);
      const data = await res.json();
      setRisks(Array.isArray(data) && data.length > 0 ? data : STATIC_RISKS);
    } catch { setRisks(STATIC_RISKS); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.title) { showToast("Risk ID and Title are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const url    = isEdit ? `${API}/api/risks/${f.id}` : `${API}/api/risks`;
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(f) });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(isEdit ? `✅ ${f.id} updated successfully.` : `✅ ${f.id} added successfully.`);
      setMode(null);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/risks/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(`🗑 ${id} deleted.`);
      setConfirmDel(null);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = risks.filter(r =>
    (r.title||r.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (r.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (r.owner||"").toLowerCase().includes(search.toLowerCase())
  );

  const scoreColor = v => Number(v)>=15?C.red:Number(v)>=10?"#e36209":Number(v)>=6?C.amber:C.green;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem", maxWidth:360 }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Risk</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Are you sure you want to delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Strategic Risk Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{risks.length} risks · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search risks…"
            style={{ ...inputSt, width:200 }} />
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", whiteSpace:"nowrap", opacity:mode?0.5:1 }}>
            + Add Risk
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {mode === "add" && <RiskForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode !== "add" && <RiskForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading risks from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Title","Category","Inherent","Residual","Status","Owner","Appetite","Actions"]}
            rows={filtered.map(r => {
              const name = r.title || r.name || "—";
              return [
                <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{r.id}</span>,
                <span style={{ maxWidth:240, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={name}>{name}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.category}</span>,
                <span style={{ color:scoreColor(r.inherentRating||r.inherent), fontWeight:700 }}>{r.inherentRating||r.inherent||"—"}</span>,
                <span style={{ color:scoreColor(r.residualRating||r.residual), fontWeight:700 }}>{r.residualRating||r.residual||"—"}</span>,
                <StatusBadge status={r.currentStatus||r.status} />,
                <span style={{ whiteSpace:"nowrap" }}>{r.owner||"—"}</span>,
                r.appetite||"—",
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...r })} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Edit
                  </button>
                  <button onClick={()=>setConfirmDel(r.id)} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Delete
                  </button>
                </div>,
              ];
            })}
          />
          {filtered.length === 0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No risks match your search.</p>}
        </Card>
      )}
    </div>
  );
}

// SVG chart primitives now live in ./charts.jsx
function ExecutiveOverview() {
  const period = usePeriod();
  const periodLabel = (PERIODS.find(p=>p.value===period)||{}).label || "Q2 2026/27";
  const [risks, setRisks] = useState(STATIC_RISKS);
  useEffect(()=>{
    fetch(`${API}/api/risks`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setRisks(d); }).catch(()=>{});
  },[]);

  const outside = risks.filter(r=>(r.currentStatus||r.status||"").includes("Outside")).length;
  const within  = risks.filter(r=>(r.currentStatus||r.status||"").includes("Within")).length;
  const totalUifw = STATIC_UIFW.reduce((s,u)=>s+u.amount,0);
  const avgResidual = risks.length ? (risks.reduce((s,r)=>s+(Number(r.residualRating||r.residual)||0),0)/risks.length) : 0;
  // Overall risk posture: % of risks within tolerance
  const posturePct = risks.length ? Math.round((within/risks.length)*100) : 0;
  const heatColor = s => s>=15?C.red:s>=10?"#e36209":s>=6?C.amber:s>=3?C.green:"#1a3d2b";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Executive Overview</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Reporting Period: {periodLabel} | Report Date: 2026-06-14</p>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          <Badge label={`● ${outside} Outside Tolerance`} color="red" />
          <Badge label="⚠ 7 Overdue Actions" color="amber" />
          <span style={{ color:C.muted, fontSize:"0.78rem", alignSelf:"center" }}>Next Review: 2026-09-30</span>
        </div>
      </div>

      {/* Enhanced KPI strip with sparklines + deltas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:"0.85rem" }}>
        <KPICardPro label="Total Risks"           value={risks.length} sub="+4 emerging"              color={C.blue}   delta={2}    deltaGood={false} spark={[8,9,9,10,10,risks.length]} />
        <KPICardPro label="Outside Tolerance"     value={outside}      sub="Immediate action"         color={C.red}    delta={-1}   deltaGood={true}  spark={[9,8,8,7,7,outside]} />
        <KPICardPro label="Treatment Completion"  value="72%"          sub="89 of 124 actions"        color={C.green}  delta={11}   deltaGood={true}  spark={[55,58,62,66,69,72]} />
        <KPICardPro label="Overall Risk Exposure" value={avgResidual.toFixed(1)} sub="avg residual"    color={C.amber}  delta={-1.2} deltaGood={true}  spark={[13.6,13.2,12.8,12.1,11.8,avgResidual]} />
        <KPICardPro label="Material Findings"      value="3"            sub="from assurance reviews"   color={C.purple} delta={0}    deltaGood={true}  spark={[5,4,4,3,3,3]} />
      </div>

      {/* Posture gauge + UIFW exposure */}
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Risk Posture</SectionTitle>
          <div style={{ display:"flex", justifyContent:"center", paddingTop:8 }}>
            <GaugeRing value={posturePct} max={100} label="Within Tolerance"
              sublabel={`${within} of ${risks.length} risks`}
              color={posturePct>=70?C.green:posturePct>=50?C.amber:C.red} size={150}/>
          </div>
        </Card>
        <Card style={{ borderLeft:`4px solid ${C.red}`, display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
              <span style={{ fontSize:"1.5rem" }}>⚠</span>
              <div>
                <div style={{ color:C.red, fontSize:"1.6rem", fontWeight:800 }}>R{(totalUifw/1e6).toFixed(1)}M</div>
                <div style={{ color:C.text, fontWeight:600 }}>UIFW Exposure</div>
                <div style={{ color:C.muted, fontSize:"0.8rem" }}>14 open cases across {new Set(STATIC_UIFW.map(u=>u.department)).size} departments</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:"1.5rem", marginLeft:"auto" }}>
              <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Irregular</div><div style={{ color:C.amber, fontSize:"1.2rem", fontWeight:800 }}>R{(STATIC_UIFW.filter(u=>u.type==="Irregular").reduce((s,u)=>s+u.amount,0)/1e6).toFixed(1)}M</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Fruitless</div><div style={{ color:C.amber, fontSize:"1.2rem", fontWeight:800 }}>R{(STATIC_UIFW.filter(u=>u.type!=="Irregular").reduce((s,u)=>s+u.amount,0)/1e6).toFixed(1)}M</div></div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Risk Heatmap — Inherent Risk Matrix</SectionTitle>
          {(()=>{
            // Decompose each risk's inherent rating into impact(row) × likelihood(col) on a 5×5 grid.
            const factor = score => {
              const s = Math.max(1, Math.min(25, Number(score)||1));
              let best=[1,1], bestDiff=99;
              for (let imp=1; imp<=5; imp++) for (let lik=1; lik<=5; lik++){
                const diff=Math.abs(imp*lik - s);
                if (diff<bestDiff || (diff===bestDiff && imp>=best[0])) { bestDiff=diff; best=[imp,lik]; }
              }
              return best; // [impact, likelihood]
            };
            const cellRisks = {};
            risks.forEach(r=>{
              const [imp,lik]=factor(r.inherentRating||r.inherent);
              const key=`${imp}-${lik}`;
              (cellRisks[key]=cellRisks[key]||[]).push(r.id);
            });
            return (
              <div style={{ display:"flex", gap:4 }}>
                {[1,2,3,4,5].map(lik=>(
                  <div key={lik} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {[5,4,3,2,1].map(imp=>{
                      const score=imp*lik;
                      const ids=cellRisks[`${imp}-${lik}`]||[];
                      return (
                        <div key={imp} title={ids.length?`Risk ${score}: ${ids.join(", ")}`:`Risk score ${score}`}
                          style={{ width:50, height:40, background:heatColor(score), borderRadius:4, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
                          <span style={{ color:"#fff", fontSize:"0.72rem", fontWeight:700 }}>{score}</span>
                          {ids.length>0 && <span style={{ color:"#fff", fontSize:"0.54rem", fontWeight:600, lineHeight:1, maxWidth:46, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ids.length===1?ids[0]:`${ids.length} risks`}</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ color:C.muted, fontSize:"0.6rem" }}>← Likelihood →</span>
            <span style={{ color:C.muted, fontSize:"0.6rem" }}>Impact ↓</span>
          </div>
          <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem", flexWrap:"wrap" }}>
            {[["≥15","Critical",C.red],[">9","High","#e36209"],[">5","Medium",C.amber],["≤5","Low",C.green]].map(([v,l,c])=>(
              <span key={l} style={{ color:c, fontSize:"0.7rem" }}>■ {l}</span>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Risk Status Breakdown</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[
                { name:"Outside Tolerance", value:outside },
                { name:"Within Tolerance",  value:within },
                { name:"Emerging",          value:4 },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {[C.red,C.amber,C.blue].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
              <Legend wrapperStyle={{ fontSize:"0.75rem", color:C.muted }}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle>Top 5 Critical Risks</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {[...risks].sort((a,b)=>(b.inherentRating||b.inherent||0)-(a.inherentRating||a.inherent||0)).slice(0,5).map(r=>(
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{r.id}</div>
                  <div style={{ color:C.text, fontSize:"0.8rem", fontWeight:500 }}>{(r.title||r.name||"").slice(0,22)}…</div>
                </div>
                <span style={{ color:C.red, fontWeight:800, fontSize:"1rem", minWidth:24, textAlign:"right" }}>{r.inherentRating||r.inherent}</span>
                <StatusBadge status={r.currentStatus||r.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── MODULE: RISK APPETITE ────────────────────────────────────────────────────
// Six-level appetite framework (matches Appetite Alignment Matrix screenshot)
const APPETITE_LEVELS = [
  { key:"Zero Tolerance", sub:"Non-Negotiable", color:C.red    },
  { key:"Averse",         sub:"Avoidance",      color:C.red    },
  { key:"Minimalist",     sub:"Conservative",   color:C.amber  },
  { key:"Cautious",       sub:"Balanced",       color:C.amber  },
  { key:"Open",           sub:"Receptive",      color:C.green  },
  { key:"Hungry",         sub:"Aggressive",     color:C.green  },
];
const APPETITE_AREAS = [
  { area:"Financial Sustainability",   level:"Cautious"       },
  { area:"Operational Excellence",     level:"Open"           },
  { area:"Digital Transformation",     level:"Hungry"         },
  { area:"Governance & Compliance",    level:"Zero Tolerance" },
  { area:"Stakeholder Relations",      level:"Minimalist"     },
  { area:"Skills Innovation",          level:"Open"           },
];
// Counts that drive the distribution donut + framework list
const APPETITE_COUNTS = {
  "Zero Tolerance":5, "Averse":8, "Minimalist":12, "Cautious":22, "Open":18, "Hungry":5,
};
// Appetite vs actual exposure by category (bar chart)
const APPETITE_EXPOSURE = [
  { category:"Strategic",   appetite:12, exposure:14 },
  { category:"Operational", appetite:18, exposure:16 },
  { category:"Compliance",  appetite:8,  exposure:15 },
  { category:"Financial",   appetite:10, exposure:16 },
  { category:"Reputation",  appetite:6,  exposure:14 },
  { category:"Technology",  appetite:14, exposure:18 },
];

function RiskAppetite() {
  const [period, setPeriod] = useState("current");

  const donutSegments = APPETITE_LEVELS.map(l=>({ name:l.key, color:l.color, value:APPETITE_COUNTS[l.key]||0 }));
  const totalRisks = donutSegments.reduce((s,x)=>s+x.value,0);
  const levelColor = lvl => (APPETITE_LEVELS.find(l=>l.key===lvl)||{}).color || C.muted;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Risk Appetite</h1>
        <div style={{ display:"flex", gap:6, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:3 }}>
          {[["current","Current Period"],["previous","Previous Period"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)}
              style={{ border:"none", cursor:"pointer", borderRadius:6, padding:"0.35rem 0.9rem", fontSize:"0.78rem", fontWeight:600,
                background:period===v?C.green:"transparent", color:period===v?"#0d1117":C.muted }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Row 1: Alignment Matrix + Distribution donut */}
      <div style={{ display:"grid", gridTemplateColumns:"1.55fr 1fr", gap:"1rem", alignItems:"start" }}>
        <Card>
          <SectionTitle>Appetite Alignment Matrix</SectionTitle>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.74rem", minWidth:620 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", padding:"0.5rem 0.6rem", color:C.muted, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>STRATEGIC<br/>AREA</th>
                  {APPETITE_LEVELS.map(l=>(
                    <th key={l.key} style={{ padding:"0.5rem 0.4rem", borderBottom:`1px solid ${C.border}`, textAlign:"center", verticalAlign:"top" }}>
                      <div style={{ color:l.color, fontWeight:700, fontSize:"0.68rem", textTransform:"uppercase" }}>{l.key}</div>
                      <div style={{ color:C.muted, fontSize:"0.58rem", textTransform:"uppercase" }}>{l.sub}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {APPETITE_AREAS.map(a=>(
                  <tr key={a.area}>
                    <td style={{ padding:"0.7rem 0.6rem", color:C.text, fontWeight:600, borderBottom:`1px solid ${C.border}` }}>{a.area}</td>
                    {APPETITE_LEVELS.map(l=>{
                      const on = l.key===a.level;
                      return (
                        <td key={l.key} style={{ padding:"0.5rem", textAlign:"center", borderBottom:`1px solid ${C.border}` }}>
                          {on && <div title={`${a.area}: ${l.key}`} style={{ width:16, height:16, borderRadius:"50%", background:l.color, margin:"0 auto", boxShadow:`0 0 0 4px ${l.color}22` }}/>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionTitle>Appetite Distribution</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.75rem" }}>
            <DonutChart segments={donutSegments} size={210} thickness={30} centerValue={totalRisks} centerLabel="total risks"/>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem 0.9rem", justifyContent:"center" }}>
              {APPETITE_LEVELS.map(l=>(
                <div key={l.key} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:9, height:9, borderRadius:"50%", background:l.color }}/>
                  <span style={{ color:C.muted, fontSize:"0.7rem" }}>{l.key}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Exposure bars + Framework list */}
      <div style={{ display:"grid", gridTemplateColumns:"1.55fr 1fr", gap:"1rem", alignItems:"start" }}>
        <Card>
          <SectionTitle>Appetite vs Actual Exposure by Risk Category</SectionTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={APPETITE_EXPOSURE} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="category" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
              <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }} domain={[0,20]}/>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }} cursor={{ fill:"rgba(255,255,255,0.04)" }}/>
              <Legend wrapperStyle={{ fontSize:"0.75rem" }}/>
              <Bar dataKey="appetite" name="Appetite"        fill="#5b6b86" radius={[3,3,0,0]}/>
              <Bar dataKey="exposure" name="Exceeds Appetite" fill={C.red}    radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Risk Appetite Framework</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {APPETITE_LEVELS.map((l,i)=>(
              <div key={l.key} style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.7rem 0.2rem",
                borderBottom:i<APPETITE_LEVELS.length-1?`1px solid ${C.border}`:"none" }}>
                <span style={{ width:12, height:12, borderRadius:3, background:l.color, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontWeight:700, fontSize:"0.85rem" }}>{l.key}</div>
                  <div style={{ color:C.muted, fontSize:"0.72rem" }}>{l.sub}</div>
                </div>
                <div style={{ color:C.text, fontWeight:700, fontSize:"0.85rem" }}>{APPETITE_COUNTS[l.key]} <span style={{ color:C.muted, fontWeight:400, fontSize:"0.72rem" }}>risks</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Appetite Statement</SectionTitle>
        <p style={{ color:C.muted, lineHeight:1.7, fontSize:"0.88rem", margin:0 }}>
          LGSETA maintains a <strong style={{ color:C.text }}>Zero Tolerance</strong> stance for governance and compliance breaches,
          a <strong style={{ color:C.text }}>Cautious</strong> position on financial sustainability, and an <strong style={{ color:C.text }}>Open</strong> to
          <strong style={{ color:C.text }}> Hungry</strong> appetite for operational excellence, skills innovation and digital transformation where pursuing opportunity creates sector value.
        </p>
      </Card>
    </div>
  );
}

// ─── MODULE: STRATEGIC RISKS (VIEW) ──────────────────────────────────────────
function StrategicRisks() {
  const [risks, setRisks] = useState(STATIC_RISKS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  useEffect(()=>{
    fetch(`${API}/api/risks`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setRisks(d); }).catch(()=>{});
  },[]);
  const filtered = risks.filter(r=>(r.title||r.name||"").toLowerCase().includes(search.toLowerCase())||(r.id||"").toLowerCase().includes(search.toLowerCase()));
  const sc = v=>Number(v)>=15?C.red:Number(v)>=10?"#e36209":Number(v)>=6?C.amber:C.green;
  const sel = selected || filtered[0] || risks[0];

  // Build a simulated treatment-progress trend for the selected risk (toward target)
  const trendData = (()=>{
    if (!sel) return [];
    const start = Number(sel.inherentRating||sel.inherent)||20;
    const end   = Number(sel.residualRating||sel.residual)||12;
    const months = ["Aug","Sep","Oct","Nov","Dec","Jan"];
    return months.map((m,i)=>({ m, v:+(start + (end-start)*(i/(months.length-1))).toFixed(1) }));
  })();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Strategic Risk Register</h1>
        <input placeholder="Search risks…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ ...inputSt, width:220 }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Total Risks"        value={risks.length} color={C.blue} spark={[8,9,9,10,10,risks.length]}/>
        <KPICardPro label="Outside Tolerance"  value={risks.filter(r=>(r.currentStatus||r.status||"").includes("Outside")).length} color={C.red} delta={-1} deltaGood={true}/>
        <KPICardPro label="Avg Residual Score" value={(risks.reduce((s,r)=>s+(Number(r.residualRating||r.residual)||0),0)/risks.length).toFixed(1)} color={C.amber} delta={-0.8} deltaGood={true}/>
      </div>

      {/* Master-detail split */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"1.25rem", alignItems:"start" }}>
        {/* Master table */}
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.83rem" }}>
              <thead>
                <tr>{["Risk ID","Risk Name","Inherent","Residual","Current","Target","Appetite","Trend"].map((h,i)=>
                  <th key={i} style={{ color:C.muted, fontWeight:600, padding:"0.6rem 0.75rem", textAlign:"left", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(r=>{
                  const isSel = sel && r.id===sel.id;
                  const trend = (r.trend||"").toLowerCase();
                  const tIcon = trend==="improving"?"↗":trend==="declining"?"↘":"—";
                  const tColor = trend==="improving"?C.green:trend==="declining"?C.red:C.muted;
                  return (
                    <tr key={r.id} onClick={()=>setSelected(r)}
                      style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                        background:isSel?"rgba(88,166,255,0.12)":"transparent",
                        borderLeft:`3px solid ${isSel?C.blue:"transparent"}` }}
                      onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background=C.surface; }}
                      onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="transparent"; }}>
                      <td style={{ padding:"0.55rem 0.75rem", color:C.muted, fontWeight:700, whiteSpace:"nowrap" }}>{r.id}</td>
                      <td style={{ padding:"0.55rem 0.75rem", color:C.text, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.title||r.name}>{r.title||r.name||"—"}</td>
                      <td style={{ padding:"0.55rem 0.75rem", color:sc(r.inherentRating||r.inherent), fontWeight:700 }}>{r.inherentRating||r.inherent||"—"}</td>
                      <td style={{ padding:"0.55rem 0.75rem", color:sc(r.residualRating||r.residual), fontWeight:700 }}>{r.residualRating||r.residual||"—"}</td>
                      <td style={{ padding:"0.55rem 0.75rem", color:sc(r.currentRating||r.residualRating||r.residual), fontWeight:700 }}>{r.currentRating||r.residualRating||r.residual||"—"}</td>
                      <td style={{ padding:"0.55rem 0.75rem", color:C.green, fontWeight:700 }}>{r.targetRating||"—"}</td>
                      <td style={{ padding:"0.55rem 0.75rem" }}><StatusBadge status={r.currentStatus||r.status}/></td>
                      <td style={{ padding:"0.55rem 0.75rem", color:tColor, fontWeight:700 }}>{tIcon}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No risks match your search.</p>}
        </Card>

        {/* Detail panel */}
        {sel && (
          <Card style={{ position:"sticky", top:0 }}>
            <div style={{ color:C.muted, fontSize:"0.75rem", fontWeight:700 }}>{sel.id}</div>
            <h3 style={{ color:C.text, fontSize:"1.05rem", fontWeight:700, margin:"0.2rem 0 0.5rem" }}>{sel.title||sel.name}</h3>
            <p style={{ color:C.muted, fontSize:"0.82rem", lineHeight:1.6, margin:"0 0 1rem" }}>{sel.description||sel.cause||"Strategic risk under active management and monitoring."}</p>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.5rem", marginBottom:"1rem" }}>
              {[["Inherent",sel.inherentRating||sel.inherent,sc(sel.inherentRating||sel.inherent)],
                ["Residual",sel.residualRating||sel.residual,sc(sel.residualRating||sel.residual)],
                ["Current",sel.currentRating||sel.residualRating||sel.residual,sc(sel.currentRating||sel.residualRating||sel.residual)],
                ["Target",sel.targetRating||"—",C.green]].map(([l,v,c])=>(
                <div key={l} style={{ background:C.surface, borderRadius:7, padding:"0.5rem", textAlign:"center" }}>
                  <div style={{ color:c, fontSize:"1.3rem", fontWeight:800 }}>{v||"—"}</div>
                  <div style={{ color:C.muted, fontSize:"0.65rem" }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1rem" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:C.surface, display:"flex", alignItems:"center", justifyContent:"center", color:C.blue, fontWeight:700, fontSize:"0.78rem" }}>
                {(sel.owner||"NA").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ color:C.text, fontSize:"0.85rem", fontWeight:600 }}>{sel.owner||"—"}</div>
                <div style={{ display:"flex", gap:6, marginTop:2 }}>
                  <StatusBadge status={sel.currentStatus||sel.status}/>
                  {sel.trend && <Badge label={sel.trend} color={(sel.trend||"").toLowerCase()==="improving"?"green":(sel.trend||"").toLowerCase()==="declining"?"red":"amber"}/>}
                </div>
              </div>
            </div>

            <SectionTitle>Treatment Progress</SectionTitle>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="m" stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }}/>
                <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }} width={24}/>
                <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
                <Line type="monotone" dataKey="v" stroke={C.green} strokeWidth={2} dot={{ r:3 }} name="Residual score"/>
              </LineChart>
            </ResponsiveContainer>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem", marginTop:"0.75rem" }}>
              <div><div style={{ color:C.muted, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:700 }}>Appetite</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{sel.appetite||"—"}</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:700 }}>Response</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{sel.response||sel.treatment||"—"}</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:700 }}>Department</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{sel.department||"—"}</div></div>
              <div><div style={{ color:C.muted, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:700 }}>Review Date</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{sel.reviewDate||"—"}</div></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── MODULE: KRI MONITORING ───────────────────────────────────────────────────
function KRIMonitoring() {
  const [kris, setKris] = useState(STATIC_KRIS);
  const [selectedKRI, setSelectedKRI] = useState(null);
  useEffect(()=>{ fetch(`${API}/api/kris`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setKris(d); }).catch(()=>{}); },[]);

  const num = v => parseFloat(String(v).replace(/[^0-9.\-]/g,""))||0;
  // RAG status: Red if outside tolerance, Amber if within ~10% of target, else Green
  const rag = k => {
    if ((k.currentStatus||"").includes("Outside")) {
      const a=num(k.currentPeriodValue), t=num(k.target);
      return (t>0 && Math.abs(a-t)/t<=0.15) ? "Amber" : "Red";
    }
    return "Green";
  };
  const ragColor = s => s==="Red"?C.red:s==="Amber"?C.amber:C.green;

  const red   = kris.filter(k=>rag(k)==="Red").length;
  const amber = kris.filter(k=>rag(k)==="Amber").length;
  const green = kris.filter(k=>rag(k)==="Green").length;

  // Top 3 indicators (worst breaches first) → trend chart
  const months = ["Aug","Sep","Oct","Nov","Dec","Jan"];
  const lineColors = [C.amber, C.blue, C.red];
  const top3 = [...kris].sort((a,b)=>{
    const order={Red:0,Amber:1,Green:2}; return order[rag(a)]-order[rag(b)];
  }).slice(0,3);
  const trendData = months.map((m,i)=>{
    const row={ m };
    top3.forEach((k,ki)=>{
      const cur=num(k.currentPeriodValue), tgt=num(k.target);
      const start=tgt + (cur-tgt)*0.4;
      row[k.id]=+(start + (cur-start)*(i/(months.length-1))).toFixed(1);
    });
    return row;
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      {selectedKRI && <KRITrendModal kri={selectedKRI} onClose={()=>setSelectedKRI(null)}/>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>KRI Monitoring</h1>
        <div style={{ display:"flex", gap:"0.5rem" }}>
          {[["Red",red],["Amber",amber],["Green",green]].map(([s,n])=>(
            <div key={s} style={{ display:"flex", alignItems:"center", gap:5, background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:"0.3rem 0.7rem" }}>
              <span style={{ width:9, height:9, borderRadius:"50%", background:ragColor(s) }}/>
              <span style={{ color:C.text, fontWeight:700, fontSize:"0.8rem" }}>{n}</span>
              <span style={{ color:C.muted, fontSize:"0.72rem" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", alignItems:"start" }}>
        {/* Traffic Light Dashboard */}
        <Card>
          <SectionTitle>KRI Traffic Light Dashboard</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>
            {kris.map(k=>{
              const status=rag(k), col=ragColor(status);
              const actual=num(k.currentPeriodValue), target=num(k.target);
              const pctMax=Math.max(actual,target,1)*1.25;
              const isPct=String(k.currentPeriodValue).includes("%");
              return (
                <div key={k.id} onClick={()=>setSelectedKRI(k)}
                  style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.7rem 0.85rem", cursor:"pointer",
                    borderLeft:`3px solid ${col}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.55rem" }}>
                    <div>
                      <div style={{ color:C.text, fontWeight:700, fontSize:"0.85rem" }}>{k.indicator||k.name}</div>
                      <div style={{ color:C.muted, fontSize:"0.7rem" }}>{k.subtitle||k.category||"Key Risk Indicator"}</div>
                    </div>
                    <span style={{ background:col, color:"#0d1117", fontWeight:800, fontSize:"0.68rem", padding:"2px 10px", borderRadius:5 }}>{status}</span>
                  </div>
                  <div style={{ position:"relative", height:18, background:`${col}22`, borderRadius:9, overflow:"hidden" }}>
                    <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${Math.min(100,(actual/pctMax)*100)}%`, background:col, borderRadius:9, transition:"width 0.5s ease" }}/>
                    <span style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", color:C.text, fontSize:"0.68rem", fontWeight:700 }}>
                      {k.currentPeriodValue||k.actual}
                    </span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                    <span style={{ color:C.muted, fontSize:"0.64rem" }}>{isPct?`${Math.round(actual*0.6)}%`:""}</span>
                    <span style={{ color:C.muted, fontSize:"0.64rem" }}>Target: {k.target}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Trend analysis — top 3 */}
        <Card>
          <SectionTitle>KRI Trend Analysis — Top 3 Indicators</SectionTitle>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="m" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
              <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
              <Legend wrapperStyle={{ fontSize:"0.72rem" }}/>
              {top3.map((k,i)=>(
                <Line key={k.id} type="monotone" dataKey={k.id} name={`${k.id} ${k.indicator||k.name}`.slice(0,28)}
                  stroke={lineColors[i%lineColors.length]} strokeWidth={2} dot={{ r:3 }}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p style={{ color:C.muted, fontSize:"0.72rem", margin:"0.5rem 0 0" }}>Click any indicator on the left to open its full trend history.</p>
        </Card>
      </div>
    </div>
  );
}

// ─── MODULE: OPPORTUNITIES ────────────────────────────────────────────────────
function Opportunities() {
  const [opps, setOpps] = useState(STATIC_OPP);
  useEffect(()=>{
    fetch(`${API}/api/opportunities`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setOpps(d); }).catch(()=>{});
  },[]);

  // Parse R-values out of benefit strings for pipeline value (fallback to score*1M)
  const parseValue = o => {
    const m = (o.benefit||"").match(/R\s?([\d.]+)\s?M/i);
    return m ? parseFloat(m[1])*1e6 : (Number(o.score)||0)*1e6;
  };
  const totalValue = opps.reduce((s,o)=>s+parseValue(o),0);
  const realisedValue = opps.filter(o=>o.status==="Active").reduce((s,o)=>s+parseValue(o)*0.25,0);
  const avgScore = opps.length ? (opps.reduce((s,o)=>s+(Number(o.score)||0),0)/opps.length).toFixed(1) : 0;
  const categories = new Set(opps.map(o=>o.category||"Strategic")).size;

  // Heatmap colour by score bucket
  const heatColor = s => s>=21?"#1a7d3f":s>=16?C.green:s>=11?C.amber:s>=6?"#e36209":C.red;
  // Impact(row) × probability(col) — place each opportunity into a real cell.
  const impacts = ["Very High","High","Medium","Low"];   // impact 5,4,3,2..1
  const probs   = ["Critical","Major","Moderate","Minor"]; // probability 5,4,3,2..1
  const impactBand = imp => imp>=5?"Very High":imp>=4?"High":imp>=3?"Medium":"Low";
  const probBand   = pr  => pr>=5?"Critical":pr>=4?"Major":pr>=3?"Moderate":"Minor";
  // Derive impact/probability from each opp (matching the register logic)
  const oppCell = {};
  opps.forEach(o=>{
    const score = Number(o.score)||0;
    let impact = Number(o.impact) || Math.min(5, Math.max(1, Math.round(score/5)));
    impact = Math.min(5, Math.max(1, impact));
    let prob = Number(o.probability) || Math.min(5, Math.max(1, Math.round(score/impact)||3));
    prob = Math.min(5, Math.max(1, prob));
    const key = `${impactBand(impact)}|${probBand(prob)}`;
    (oppCell[key]=oppCell[key]||[]).push(o);
  });
  const repScore = { "Very High":{Critical:16,Major:12,Moderate:8,Minor:4},
                     "High":{Critical:12,Major:9,Moderate:6,Minor:3},
                     "Medium":{Critical:8,Major:6,Moderate:4,Minor:2},
                     "Low":{Critical:4,Major:3,Moderate:2,Minor:1} };

  // Pipeline funnel — staged counts
  const n = opps.length;
  const pipeline = [
    { stage:"Identification", count:n,                    color:C.muted },
    { stage:"Assessment",     count:Math.round(n*0.83),    color:C.blue  },
    { stage:"Approval",       count:Math.round(n*0.67),    color:C.purple },
    { stage:"Implementation", count:Math.round(n*0.5),     color:C.amber },
    { stage:"Realisation",    count:opps.filter(o=>o.status==="Active").length, color:C.green },
  ];

  const benefitTrend = [
    { m:"Jul", v:5 },{ m:"Aug", v:5 },{ m:"Sep", v:6 },
    { m:"Oct", v:6 },{ m:"Nov", v:7 },{ m:"Dec", v:opps.filter(o=>o.status==="Active").length },
  ];

  const appetiteColor = a => a==="Pursue"?"green":a==="Enhance"?"amber":a==="Exploit"?"blue":"green";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Strategic Opportunities Register</h1>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Total Opportunities"     value={opps.length}                  sub={`across ${categories} categories`} color={C.blue}   delta={2} deltaGood={true}/>
        <KPICardPro label="Pipeline Value"          value={`R${(totalValue/1e6).toFixed(1)}M`} sub="estimated gross value"        color={C.purple}/>
        <KPICardPro label="Realised Benefits"       value={`R${(realisedValue/1e6).toFixed(1)}M`} sub={`${Math.round((realisedValue/(totalValue||1))*100)}% of pipeline`} color={C.green} delta={0.8} deltaGood={true}/>
        <KPICardPro label="Avg Opportunity Score"   value={avgScore}                      sub="out of 25 maximum"           color={C.amber} spark={[13,14,15,15,16,Number(avgScore)]}/>
      </div>

      {/* Heatmap + pipeline */}
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Opportunity Heatmap — Impact × Probability</SectionTitle>
          <HeatGrid
            rows={impacts} cols={probs}
            cellW={108} cellH={62} rowLabelW={70}
            cell={(imp,prob)=>{
              const list = oppCell[`${imp}|${prob}`]||[];
              const sc = (repScore[imp] && repScore[imp][prob]) || 0;
              const firstName = list[0] && (list[0].name || list[0].title || "Opportunity");
              const label = list.length===0 ? null : (list.length===1 ? String(firstName).slice(0,24) : `${list.length} opportunities`);
              return { value:list.length>0?list.length:sc, color:heatColor(sc), label };
            }}
          />
          <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.75rem", flexWrap:"wrap" }}>
            {[["21-25","#1a7d3f"],["16-20",C.green],["11-15",C.amber],["6-10","#e36209"],["1-5",C.red]].map(([l,c])=>(
              <span key={l} style={{ color:c, fontSize:"0.7rem" }}>● {l}</span>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Opportunity Pipeline</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.9rem", marginTop:"0.25rem" }}>
            {pipeline.map(p=>(
              <div key={p.stage}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ color:C.text, fontSize:"0.82rem", fontWeight:600 }}>{p.stage}</span>
                  <span style={{ color:C.muted, fontSize:"0.78rem" }}>{p.count}/{n}</span>
                </div>
                <div style={{ background:C.border, borderRadius:6, height:18, position:"relative", overflow:"hidden" }}>
                  <div style={{ width:`${(p.count/Math.max(n,1))*100}%`, height:"100%", background:p.color, borderRadius:6,
                    display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:6, transition:"width 0.5s" }}>
                    <span style={{ color:"#fff", fontSize:"0.68rem", fontWeight:700 }}>{p.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Benefit realisation trend */}
      <Card>
        <SectionTitle>Benefit Realisation Trend</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={benefitTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="m" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
            <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
            <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
            <Bar dataKey="v" fill={C.green} name="Active opportunities" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Register */}
      <Card>
        <SectionTitle>Opportunity Register</SectionTitle>
        <Table
          headers={["Opportunity","Category","Impact","Probability","Score","Appetite","Strategy","Est. Value","Realised","Status"]}
          rows={opps.map(o=>{
            // Derive impact/probability from score if not explicitly set
            const score = Number(o.score)||0;
            let impact = Number(o.impact) || Math.min(5, Math.max(1, Math.round(score/5)));
            impact = Math.min(5, Math.max(1, impact));
            let prob = Number(o.probability) || Math.min(5, Math.max(1, Math.round(score/impact)||3));
            prob = Math.min(5, Math.max(1, prob));
            const appetite = o.appetite || (score>=18?"Pursue":score>=14?"Enhance":score>=10?"Pursue":"Exploit");
            const realised = o.realised!=null ? o.realised : (o.status==="Active"?parseValue(o)*0.25:0);
            const appColor = appetite==="Pursue"?"green":appetite==="Enhance"?"amber":"blue";
            return [
              <span style={{ fontWeight:700, color:C.text }}>{o.name||o.title||"—"}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{o.category||"Strategic"}</span>,
              <span style={{ color:C.text, fontWeight:700 }}>{impact}</span>,
              <span style={{ color:C.text, fontWeight:700 }}>{prob}</span>,
              <span style={{ color:(o.score>=16?C.green:o.score>=11?C.amber:C.red), fontWeight:800 }}>{o.score}</span>,
              <Badge label={appetite} color={appColor}/>,
              <span style={{ color:C.muted, fontSize:"0.78rem", maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={o.strategy||o.benefit}>{o.strategy||o.benefit||"—"}</span>,
              <span style={{ color:C.green, fontWeight:700 }}>R{(parseValue(o)/1e6).toFixed(1)}M</span>,
              <span style={{ color:realised>0?C.green:C.muted, fontWeight:realised>0?700:400 }}>R{(realised/1e6).toFixed(1)}M</span>,
              <StatusBadge status={o.status}/>,
            ];
          })}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: EMERGING RISKS ───────────────────────────────────────────────────
function EmergingRisks() {
  const [risks, setRisks] = useState(STATIC_EMERGING);
  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{ if(Array.isArray(d.emergingRisks)&&d.emergingRisks.length) setRisks(d.emergingRisks); }).catch(()=>{});
  },[]);

  const total = risks.length;
  const highCrit = risks.filter(r=>(Number(r.likelihood)||0)*(Number(r.impact)||0)>=16).length;
  const escalated = risks.filter(r=>r.action==="Escalate").length;
  const newThisQ = Math.min(total, 4);

  // PESTLE categories — map the module's categories onto a 7-axis PESTLE-style radar
  const PESTLE = ["Political","Economic","Social","Technological","Legal","Environmental","Sectoral"];
  const catMap = { Regulatory:"Legal", Technology:"Technological", Economic:"Economic", Environment:"Environmental", Political:"Political", Social:"Social" };
  const axisScore = axis => {
    const matching = risks.filter(r=>(catMap[r.category]||r.category)===axis);
    if (!matching.length) return 20; // baseline
    const avg = matching.reduce((s,r)=>s+(Number(r.likelihood)||0)*(Number(r.impact)||0),0)/matching.length;
    return Math.min(100, (avg/25)*100);
  };
  const axes = PESTLE.map(a=>({ label:a, value:axisScore(a), max:100 }));
  const prevSeries = axes.map(a=>Math.max(15, a.value*0.7)); // simulated previous period

  // Category bar counts
  const catCounts = PESTLE.map(a=>({
    cat:a,
    count:risks.filter(r=>(catMap[r.category]||r.category)===a).length,
  }));
  const catMax = Math.max(1, ...catCounts.map(c=>c.count));
  const catColor = { Political:C.purple, Economic:C.amber, Social:C.blue, Technological:C.cyan, Legal:C.red, Environmental:C.green, Sectoral:"#d147a3" };

  const actionColor = a => a==="Escalate"?"red":a==="Mitigate"?"amber":a==="Watch"?"amber":"blue";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Emerging Risk Radar</h1>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Emerging Risks Identified" value={total}     sub="across PESTLE categories" color={C.blue}   delta={4} deltaGood={false}/>
        <KPICardPro label="High Criticality"          value={highCrit}  sub="requires attention"       color={C.red}/>
        <KPICardPro label="New This Quarter"          value={newThisQ}  sub="newly identified"         color={C.amber}  delta={2} deltaGood={false}/>
        <KPICardPro label="Escalated to EXCO/ARC"     value={escalated} sub="under active escalation"  color={C.purple}/>
      </div>

      {/* Radar + category bars */}
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Emerging Risk Radar — PESTLE Analysis</SectionTitle>
          <div style={{ display:"flex", justifyContent:"center", paddingTop:8 }}>
            <RadarChart axes={axes} series2={prevSeries} size={340} color={C.purple} color2={C.cyan}/>
          </div>
          <div style={{ display:"flex", gap:"1.25rem", justifyContent:"center", marginTop:"0.5rem" }}>
            <span style={{ color:C.purple, fontSize:"0.72rem" }}>━ Current Period</span>
            <span style={{ color:C.cyan, fontSize:"0.72rem" }}>┄ Previous Period</span>
          </div>
        </Card>

        <Card>
          <SectionTitle>Risks by PESTLE Category</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem", marginTop:"0.5rem" }}>
            {catCounts.map(c=>(
              <div key={c.cat} style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                <div style={{ width:96, color:C.muted, fontSize:"0.75rem", textAlign:"right" }}>{c.cat}</div>
                <div style={{ flex:1, background:C.border, borderRadius:5, height:16, overflow:"hidden" }}>
                  <div style={{ width:`${(c.count/catMax)*100}%`, height:"100%", background:catColor[c.cat]||C.blue, borderRadius:5, transition:"width 0.5s" }}/>
                </div>
                <div style={{ color:C.text, fontSize:"0.78rem", fontWeight:700, minWidth:18, textAlign:"right" }}>{c.count}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Horizon scanning */}
      <Card>
        <SectionTitle>Horizon Scanning — Latest Emerging Risks</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
          {risks.map(r=>{
            const score=(Number(r.likelihood)||0)*(Number(r.impact)||0);
            const crit = score>=16?"High":score>=9?"Medium":"Low";
            return (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.6rem 0.75rem",
                background:C.surface, borderRadius:8, borderLeft:`3px solid ${catColor[catMap[r.category]||r.category]||C.blue}` }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:catColor[catMap[r.category]||r.category]||C.blue, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontWeight:600, fontSize:"0.85rem" }}>{r.name}</div>
                  <div style={{ color:C.muted, fontSize:"0.72rem" }}>{r.category} · Horizon: {r.horizon}</div>
                </div>
                <Badge label={crit} color={crit==="High"?"red":crit==="Medium"?"amber":"green"}/>
                <Badge label={r.action} color={actionColor(r.action)}/>
                <div style={{ display:"flex", gap:"0.75rem", minWidth:120 }}>
                  <div style={{ textAlign:"center" }}><div style={{ color:C.muted, fontSize:"0.62rem" }}>L</div><div style={{ color:C.amber, fontWeight:700, fontSize:"0.82rem" }}>{r.likelihood}</div></div>
                  <div style={{ textAlign:"center" }}><div style={{ color:C.muted, fontSize:"0.62rem" }}>I</div><div style={{ color:C.red, fontWeight:700, fontSize:"0.82rem" }}>{r.impact}</div></div>
                  <div style={{ textAlign:"center" }}><div style={{ color:C.muted, fontSize:"0.62rem" }}>Score</div><div style={{ color:score>=16?C.red:score>=9?C.amber:C.green, fontWeight:800, fontSize:"0.82rem" }}>{score}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* SWOT Analysis */}
      <Card>
        <SectionTitle>SWOT Analysis — Strategic Position</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.85rem" }}>
          {[
            { key:"Strengths",     color:C.green,  bg:"rgba(63,185,80,0.07)",  items:["Established SETA mandate and levy income base","Strong governance and ARC oversight","Skilled internal audit and risk functions","Digital GRC platform enabling real-time monitoring"] },
            { key:"Weaknesses",    color:C.red,    bg:"rgba(248,81,73,0.07)",  items:["Cybersecurity maturity below target","Dependency on single ICT service provider","UIFW exposure above tolerance","Slow discretionary grant disbursement rate"] },
            { key:"Opportunities", color:C.blue,   bg:"rgba(88,166,255,0.07)", items:["Digital skills grant expansion (R15M potential)","Inter-SETA collaboration and shared services","Green skills programme funding stream","AI-enhanced M&E and reporting efficiency"] },
            { key:"Threats",       color:C.amber,  bg:"rgba(227,179,65,0.07)", items:["Regulatory overhaul of SETA landscape","Ransomware and cyber-attack escalation","Geopolitical and economic funding pressures","Climate risk to operational continuity"] },
          ].map(q=>(
            <div key={q.key} style={{ background:q.bg, border:`1px solid ${q.color}`, borderRadius:9, padding:"0.85rem 1rem" }}>
              <div style={{ color:q.color, fontWeight:700, fontSize:"0.9rem", marginBottom:"0.5rem" }}>{q.key}</div>
              <ul style={{ margin:0, paddingLeft:"1.1rem", display:"flex", flexDirection:"column", gap:"0.3rem" }}>
                {q.items.map((it,i)=>(
                  <li key={i} style={{ color:C.text, fontSize:"0.78rem", lineHeight:1.5 }}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Emerging Risk Register */}
      <Card>
        <SectionTitle>Emerging Risk Register</SectionTitle>
        <Table
          headers={["Risk ID","Risk Name","Category","Criticality","Status","Velocity","Potential Impact","Date Identified"]}
          rows={risks.map(r=>{
            const score=(Number(r.likelihood)||0)*(Number(r.impact)||0);
            const crit = score>=16?"High":score>=9?"Medium":"Low";
            const velocity = r.velocity || (score>=16?"Fast":score>=9?"Medium":"Slow");
            const velColor = velocity==="Fast"?C.red:velocity==="Medium"?C.amber:C.green;
            const statusLabel = r.action==="Escalate"?"Escalated":r.action==="Mitigate"?"Mitigating":r.action==="Watch"?"Watching":"New";
            const statusColor = statusLabel==="Escalated"?"red":statusLabel==="New"?"purple":"amber";
            return [
              <span style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{r.id}</span>,
              <span style={{ fontWeight:700, color:C.text }}>{r.name}</span>,
              <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:catColor[catMap[r.category]||r.category]||C.blue, display:"inline-block" }}/>
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.category}</span>
              </span>,
              <Badge label={crit} color={crit==="High"?"red":crit==="Medium"?"amber":"green"}/>,
              <Badge label={statusLabel} color={statusColor}/>,
              <span style={{ color:velColor, fontWeight:700, fontSize:"0.78rem" }}>{velocity}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.potentialImpact||r.description}>{r.potentialImpact||r.description||`Potential disruption to ${r.category.toLowerCase()} objectives`}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.dateIdentified||r.reviewDate||"2026-01-15"}</span>,
            ];
          })}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: TREATMENT ACTIONS ────────────────────────────────────────────────
function TreatmentActions() {
  const [actions, setActions] = useState(STATIC_TREATMENTS);
  useEffect(()=>{ fetch(`${API}/api/treatments`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setActions(d); }).catch(()=>{}); },[]);

  const done    = actions.filter(a=>a.status==="Complete").length;
  const prog    = actions.filter(a=>["In Progress","Near Complete"].includes(a.status)).length;
  const notStarted = actions.filter(a=>a.status==="Not Started").length;
  const overdue = actions.filter(a=>a.status!=="Complete" && a.dueDate && new Date(a.dueDate)<new Date()).length;
  const total   = actions.length;
  const completionPct = total ? Math.round((done/total)*100) : 0;

  // Owner accountability: group actions by owner, split done vs outstanding
  const owners = (()=>{
    const map = {};
    actions.forEach(a=>{
      const o = a.owner || "Unassigned";
      if (!map[o]) map[o] = { owner:o, done:0, open:0 };
      if (a.status==="Complete") map[o].done++; else map[o].open++;
    });
    return Object.values(map).sort((a,b)=>(b.done+b.open)-(a.done+a.open));
  })();
  const ownerMax = Math.max(1, ...owners.map(o=>o.done+o.open));
  const initials = name => name.split(/[\s.]+/).filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase();

  const trend = [
    { m:"Aug", v:68 },{ m:"Sep", v:72 },{ m:"Oct", v:76 },
    { m:"Nov", v:80 },{ m:"Dec", v:85 },{ m:"Jan", v:completionPct },
  ];

  const overdueActions = actions.filter(a=>a.status!=="Complete" && a.dueDate && new Date(a.dueDate)<new Date());

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Treatment Action Tracker</h1>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Total Actions" value={total}      sub="this period"      color={C.blue}  delta={6}  deltaGood={true}/>
        <KPICardPro label="Completed"     value={done}       sub={`${completionPct}% rate`} color={C.green} delta={11} deltaGood={true} spark={[55,58,62,66,69,completionPct]}/>
        <KPICardPro label="In Progress"   value={prog}       sub="being executed"   color={C.amber}/>
        <KPICardPro label="Not Started"   value={notStarted} sub="awaiting kickoff" color={C.muted}/>
        <KPICardPro label="Overdue"       value={overdue}    sub="needs escalation" color={C.red}   delta={-3} deltaGood={true}/>
      </div>

      {/* Donut + owner bars + trend */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Overall Treatment Completion</SectionTitle>
          <div style={{ display:"flex", justifyContent:"center", padding:"0.5rem 0" }}>
            <DonutChart
              segments={[
                { label:"Done", value:done, color:C.green },
                { label:"In Progress", value:prog, color:C.blue },
                { label:"Not Started", value:notStarted, color:C.muted },
                { label:"Overdue", value:overdue, color:C.red },
              ]}
              size={170} thickness={20}
              centerValue={`${completionPct}%`} centerLabel="Completion"/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-around", marginTop:"0.5rem", flexWrap:"wrap", gap:"0.5rem" }}>
            {[["Done",done,C.green],["Active",prog,C.blue],["Pending",notStarted,C.muted],["Overdue",overdue,C.red]].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ color:c, fontWeight:800, fontSize:"1.1rem" }}>{v}</div>
                <div style={{ color:C.muted, fontSize:"0.7rem" }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Owner Accountability</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem", marginTop:"0.25rem" }}>
            {owners.map(o=>(
              <div key={o.owner} style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:C.surface, color:C.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.68rem", fontWeight:700, flexShrink:0 }} title={o.owner}>{initials(o.owner)}</div>
                <div style={{ flex:1 }}>
                  <StackedBar max={ownerMax} segments={[{ label:"Done", value:o.done, color:C.green },{ label:"Open", value:o.open, color:C.red }]}/>
                </div>
                <div style={{ color:C.muted, fontSize:"0.72rem", minWidth:34, textAlign:"right" }}>{o.done}/{o.done+o.open}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"1rem", marginTop:"0.75rem" }}>
            <span style={{ color:C.green, fontSize:"0.7rem" }}>■ Completed</span>
            <span style={{ color:C.red, fontSize:"0.7rem" }}>■ Outstanding</span>
          </div>
        </Card>

        <Card>
          <SectionTitle>Treatment Action Trend</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="m" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
              <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }} domain={[0,100]}/>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
              <Bar dataKey="v" fill={C.green} name="Completion %" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Overdue tracker (highlighted) */}
      {overdueActions.length>0 && (
        <Card style={{ borderLeft:`4px solid ${C.red}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"0.75rem" }}>
            <span style={{ fontSize:"1.1rem" }}>⚠</span>
            <h3 style={{ color:C.text, fontSize:"0.95rem", fontWeight:700, margin:0 }}>Overdue Action Tracker</h3>
          </div>
          <Table
            headers={["Action ID","Description","Risk","Owner","Due Date","Priority","Progress"]}
            rows={overdueActions.map(a=>[
              <span style={{ color:C.red, fontWeight:700 }}>{a.id}</span>,
              <span style={{ maxWidth:260, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.action}>{a.action}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{a.riskId||a.risk||"—"}</span>,
              <span style={{ display:"inline-flex", width:26, height:26, borderRadius:"50%", background:C.surface, color:C.blue, alignItems:"center", justifyContent:"center", fontSize:"0.64rem", fontWeight:700 }} title={a.owner}>{initials(a.owner||"NA")}</span>,
              <span style={{ color:C.red, fontWeight:700 }}>{a.dueDate||a.due||"—"}</span>,
              <Badge label={a.priority||"High"} color={a.priority==="Critical"?"red":a.priority==="Low"?"green":"amber"}/>,
              <div style={{ minWidth:110 }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", marginBottom:3 }}>{a.progress}%</div>
                <ProgressBar value={Number(a.progress)||0} color={C.red}/>
              </div>,
            ])}
          />
        </Card>
      )}

      {/* Full register */}
      <Card>
        <SectionTitle>All Treatment Actions</SectionTitle>
        <Table
          headers={["ID","Risk","Action","Owner","Due Date","Progress","Status"]}
          rows={actions.map(a=>[
            <span style={{ color:C.blue, fontWeight:700 }}>{a.id}</span>,
            a.riskId||a.risk||"—",
            <span style={{ maxWidth:240, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.action}>{a.action}</span>,
            a.owner||"—",
            a.dueDate||a.due||"—",
            <div style={{ minWidth:120 }}>
              <div style={{ color:C.muted, fontSize:"0.72rem", marginBottom:3 }}>{a.progress}%</div>
              <ProgressBar value={Number(a.progress)||0}/>
            </div>,
            <StatusBadge status={a.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: COMBINED ASSURANCE ───────────────────────────────────────────────
function CombinedAssurance() {
  const [data, setData] = useState(STATIC_ASSURANCE);
  const [risks, setRisks] = useState(STATIC_RISKS);
  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{ if(d.combinedAssurance?.map?.length) setData(d.combinedAssurance.map); }).catch(()=>{});
    fetch(`${API}/api/risks`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setRisks(d); }).catch(()=>{});
  },[]);

  // Providers grouped by line of defence (demo, mirrors reference).
  const providers = [
    { name:"Business Management",          line:"1st Line",     coverage:75, effectiveness:"Partial",   findings:12 },
    { name:"Enterprise Risk Management",   line:"2nd Line",     coverage:85, effectiveness:"Effective",  findings:5  },
    { name:"Compliance",                   line:"2nd Line",     coverage:90, effectiveness:"Effective",  findings:3  },
    { name:"Fraud Risk Management",        line:"2nd Line",     coverage:80, effectiveness:"Partial",    findings:6  },
    { name:"Business Continuity Management",line:"2nd Line",    coverage:60, effectiveness:"Partial",    findings:8  },
    { name:"ICT Security",                 line:"2nd Line",     coverage:70, effectiveness:"Partial",    findings:7  },
    { name:"Facilities & Security",        line:"2nd Line",     coverage:85, effectiveness:"Effective",  findings:2  },
    { name:"Legal Services",               line:"2nd Line",     coverage:95, effectiveness:"Effective",  findings:1  },
    { name:"Monitoring & Evaluation",      line:"2nd Line",     coverage:65, effectiveness:"Partial",    findings:4  },
    { name:"Internal Audit",               line:"3rd Line",     coverage:92, effectiveness:"Effective",  findings:4  },
    { name:"AGSA",                         line:"Independent",  coverage:100,effectiveness:"Effective",  findings:2  },
    { name:"Risk Management Committee",    line:"Independent",  coverage:88, effectiveness:"Effective",  findings:3  },
    { name:"Audit & Risk Committee",       line:"Independent",  coverage:95, effectiveness:"Effective",  findings:1  },
    { name:"Administrator / Board",        line:"Independent",  coverage:90, effectiveness:"Effective",  findings:0  },
  ];
  const avgCoverage   = Math.round(providers.reduce((s,p)=>s+p.coverage,0)/providers.length);
  const assuranceGaps = providers.filter(p=>p.coverage<80).length;
  const overlaps      = 3; // duplicate coverage areas (demo)
  const totalFindings = providers.reduce((s,p)=>s+p.findings,0);

  const LINES = [
    { key:"1st Line",    icon:"🛡", color:C.blue },
    { key:"2nd Line",    icon:"🔵", color:C.purple },
    { key:"3rd Line",    icon:"🟡", color:C.amber },
    { key:"Independent", icon:"👁", color:C.green },
  ];
  const effBadge = e => e==="Effective"?"green":e==="Partial"?"amber":"red";

  // Coverage heatmap: REAL risks (rows) × assurance lines (cols), coverage % per cell.
  // Rows reflect the live risk register and reposition/relabel as risks change.
  const lines = ["AGSA","1st Line","ERM","Compliance","Fraud","BCM","3rd Line"];
  // Take the highest-rated risks so the most material ones surface in the matrix.
  const topRisks = [...risks]
    .sort((a,b)=>(Number(b.currentRating||b.residualRating||b.residual||b.inherentRating||0))-(Number(a.currentRating||a.residualRating||a.residual||a.inherentRating||0)))
    .slice(0,6);
  const riskRows = topRisks.map(r=>`${r.id} — ${(r.title||r.name||"").slice(0,16)}`);
  // Deterministic coverage seeded by risk rating + line, so it's stable yet risk-reflective.
  const seededCov = (rating, li) => {
    const base = 100 - Math.min(45, (Number(rating)||10)*1.8);   // higher risk → lower baseline coverage
    const wobble = ((li*37 + (Number(rating)||10)*13) % 30) - 12; // stable per (risk,line)
    return Math.max(45, Math.min(100, Math.round(base + wobble)));
  };
  const cov = {};
  topRisks.forEach(r=>{
    const rating = Number(r.currentRating||r.residualRating||r.residual||r.inherentRating||10);
    const row = `${r.id} — ${(r.title||r.name||"").slice(0,16)}`;
    cov[row] = {};
    lines.forEach((ln,li)=>{ cov[row][ln] = seededCov(rating, li); });
  });
  const covColor = v => v>=90?"#1a7d3f":v>=75?"#2d5a3d":v>=60?"#5a4a2d":"#5a2d2d";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Combined Assurance</h1>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        <Card style={{ borderTop:`3px solid ${C.green}` }}>
          <div style={{ color:C.muted, fontSize:"0.72rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Overall Coverage</div>
          <div style={{ color:C.green, fontSize:"1.8rem", fontWeight:800, margin:"4px 0 8px" }}>{avgCoverage}%</div>
          <ProgressBar value={avgCoverage} color={C.green}/>
        </Card>
        <KPICardPro label="Assurance Gaps"     value={assuranceGaps} sub="providers below 80% coverage" color={C.red}/>
        <KPICardPro label="Assurance Overlaps" value={overlaps}      sub="duplicate coverage areas"     color={C.amber}/>
        <KPICardPro label="Total Findings"     value={totalFindings} sub="across all assurance lines"   color={C.purple}/>
      </div>

      {/* Provider cards grouped by line of defence */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 1fr 1fr", gap:"1rem", alignItems:"start" }}>
        {LINES.map(L=>{
          const group = providers.filter(p=>p.line===L.key);
          return (
            <Card key={L.key}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.85rem" }}>
                <span style={{ color:C.text, fontWeight:700, fontSize:"0.95rem" }}>{L.icon} {L.key}</span>
                <span style={{ color:C.muted, fontSize:"0.72rem" }}>{group.length} provider{group.length!==1?"s":""}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem" }}>
                {group.map(p=>(
                  <div key={p.name} style={{ background:C.surface, border:`1px solid ${p.effectiveness==="Effective"?C.green:C.amber}`, borderRadius:9, padding:"0.75rem 0.9rem" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:6, marginBottom:"0.5rem" }}>
                      <span style={{ color:C.text, fontWeight:700, fontSize:"0.8rem", lineHeight:1.25 }}>{p.name}</span>
                      <Badge label={p.effectiveness} color={effBadge(p.effectiveness)}/>
                    </div>
                    <ProgressBar value={p.coverage} color={p.effectiveness==="Effective"?C.green:C.purple}/>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.4rem" }}>
                      <span style={{ color:C.muted, fontSize:"0.73rem" }}>{p.coverage}% coverage</span>
                      <span style={{ color:p.findings>5?C.red:C.muted, fontSize:"0.73rem", fontWeight:p.findings>5?700:400 }}>{p.findings} findings</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Coverage heatmap matrix */}
      <Card>
        <SectionTitle>Assurance Coverage Heatmap — Risk Coverage by Provider</SectionTitle>
        <HeatGrid
          rows={riskRows} cols={lines}
          cellW={92} cellH={48} rowLabelW={170}
          cell={(rw,cl)=>{ const v=cov[rw]?.[cl] ?? 0; return { value:`${v}%`, color:covColor(v) }; }}
        />
        <div style={{ display:"flex", gap:"1rem", marginTop:"0.75rem", flexWrap:"wrap" }}>
          {[["≥90% Full",C.green],["75-89% Strong","#2d5a3d"],["60-74% Partial",C.amber],["<60% Gap",C.red]].map(([l,c])=>(
            <span key={l} style={{ color:c, fontSize:"0.7rem" }}>■ {l}</span>
          ))}
        </div>
      </Card>

      {/* Combined assurance map table */}
      <Card>
        <SectionTitle>Combined Assurance Map — by Risk</SectionTitle>
        <Table
          headers={["Risk Ref","1st Line","2nd Line","3rd Line","Gap","Assurance Level"]}
          rows={data.map(r=>[
            <span style={{ color:C.blue, fontWeight:700 }}>{r.risk}</span>,
            r.assurer1,r.assurer2,r.assurer3,
            <span style={{ color:r.gap==="None"?C.green:r.gap.includes("gap")?C.red:C.amber, fontSize:"0.8rem" }}>{r.gap}</span>,
            <StatusBadge status={r.level}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: BCM RESILIENCE ───────────────────────────────────────────────────
function BCMResilience() {
  const [sub, setSub] = useState("overview");
  const [data, setData] = useState(STATIC_BCM);
  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{ if(d.bcmResilience) setData({ ...STATIC_BCM, ...d.bcmResilience }); }).catch(()=>{});
  },[]);
  const ov = data.overview || STATIC_BCM.overview;
  const incidents = data.incidents || STATIC_BCM.incidents;

  const tabs=["overview","incidents","plans","crisis","recovery","communications","testing","suppliers","dependencies","it-dr","training"];

  // Resilience metric gauges — RTO/RPO compliance, MTTR, MBCO, RSL, MTPD maturity
  const gauges = [
    { label:"RTO Compliance",  sublabel:"4-hour target",       value:78, color:C.green },
    { label:"RPO Compliance",  sublabel:"2-hour target",       value:65, color:C.amber },
    { label:"MTTR",            sublabel:"Mean Time to Recovery",value:72, color:C.blue  },
    { label:"MBCO",            sublabel:"Min Continuity Obj.",  value:60, color:C.purple },
    { label:"RSL",             sublabel:"Recovery Service Lvl", value:82, color:C.green },
    { label:"MTPD Maturity",   sublabel:"Max Tolerable Disrupt",value:62, color:C.amber },
  ];

  // BCM Readiness index — composite from BIA + plans tested + processes with BCP
  const readiness = Math.round(((ov.biaComplete||0) + ((ov.plansTested/Math.max(ov.plansTotal,1))*100) + ((ov.processesWithBCP/Math.max(ov.criticalProcesses,1))*100))/3);
  const readinessLabel = readiness>=80?"Strong":readiness>=60?"Moderate":"Weak";

  // Critical processes (demo, mirrors reference) with RTO/RPO/maturity/test result
  const criticalProcs = [
    { name:"Payroll Processing",        rto:"4 hours",  rpo:"1 hour",  lastTest:"2026-02-15", maturity:4.2, result:"Passed" },
    { name:"Levy Collection & Mgmt",    rto:"8 hours",  rpo:"2 hours", lastTest:"2026-01-20", maturity:3.8, result:"Passed" },
    { name:"Grant Disbursement",        rto:"24 hours", rpo:"4 hours", lastTest:"2026-02-28", maturity:2.5, result:"Failed" },
    { name:"ICT Core Infrastructure",   rto:"2 hours",  rpo:"1 hour",  lastTest:"2026-03-10", maturity:3.5, result:"Passed" },
  ];
  const testStatus = { Passed:criticalProcs.filter(p=>p.result==="Passed").length, Failed:criticalProcs.filter(p=>p.result==="Failed").length, Pending:1, "Not Tested":0 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>BCM & Resilience</h1>
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setSub(t)}
            style={{ padding:"0.45rem 0.9rem", border:"none", background:"transparent", cursor:"pointer", fontSize:"0.78rem", fontWeight:600,
              color:sub===t?C.blue:C.muted, borderBottom:sub===t?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap", textTransform:"capitalize" }}>
            {t.replace("-"," ")}
          </button>
        ))}
      </div>

      {sub==="overview"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          {/* Resilience metric gauges */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:"0.85rem" }}>
            {gauges.map(g=>(
              <Card key={g.label} style={{ display:"flex", justifyContent:"center" }}>
                <GaugeRing value={g.value} max={100} label={g.label} sublabel={g.sublabel} color={g.color} size={120}/>
              </Card>
            ))}
          </div>

          {/* Readiness donut + critical processes + test status */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr", gap:"1rem" }}>
            <Card>
              <SectionTitle>BCM Readiness Index</SectionTitle>
              <div style={{ display:"flex", justifyContent:"center", padding:"0.5rem 0" }}>
                <DonutChart
                  segments={[{ label:"Ready", value:readiness, color:readiness>=80?C.green:readiness>=60?C.amber:C.red },{ label:"Gap", value:100-readiness, color:C.border }]}
                  size={170} thickness={20}
                  centerValue={`${readiness}%`} centerLabel={readinessLabel}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-around", marginTop:"0.5rem" }}>
                {[["Compliant",criticalProcs.filter(p=>p.result==="Passed").length,C.green],["Partial",1,C.amber],["Non-Compliant",criticalProcs.filter(p=>p.result==="Failed").length,C.red]].map(([l,v,c])=>(
                  <div key={l} style={{ textAlign:"center" }}>
                    <div style={{ color:c, fontWeight:800, fontSize:"1.1rem" }}>{v}</div>
                    <div style={{ color:C.muted, fontSize:"0.65rem" }}>{l}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle>Critical Processes</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                {criticalProcs.map(p=>(
                  <div key={p.name} style={{ background:C.surface, borderRadius:8, padding:"0.65rem 0.85rem", border:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
                      <span style={{ color:C.text, fontWeight:600, fontSize:"0.85rem" }}>● {p.name}</span>
                      <Badge label={p.result} color={p.result==="Passed"?"green":"red"}/>
                    </div>
                    <div style={{ display:"flex", gap:"1.5rem", marginBottom:"0.4rem" }}>
                      <div><div style={{ color:C.muted, fontSize:"0.62rem" }}>RTO</div><div style={{ color:C.blue, fontSize:"0.82rem", fontWeight:700 }}>{p.rto}</div></div>
                      <div><div style={{ color:C.muted, fontSize:"0.62rem" }}>RPO</div><div style={{ color:C.blue, fontSize:"0.82rem", fontWeight:700 }}>{p.rpo}</div></div>
                      <div style={{ marginLeft:"auto", textAlign:"right" }}><div style={{ color:C.muted, fontSize:"0.62rem" }}>Last Tested</div><div style={{ color:C.text, fontSize:"0.82rem" }}>{p.lastTest}</div></div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                      <span style={{ color:C.muted, fontSize:"0.62rem" }}>Maturity</span>
                      <div style={{ flex:1 }}><ProgressBar value={p.maturity} max={5} color={p.maturity>=4?C.green:p.maturity>=3?C.amber:C.red}/></div>
                      <span style={{ color:C.text, fontSize:"0.75rem", fontWeight:700 }}>{p.maturity}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle>Test Status</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem", marginTop:"0.5rem" }}>
                {[["Passed",testStatus.Passed,C.green],["Failed",testStatus.Failed,C.red],["Pending",testStatus.Pending,C.amber],["Not Tested",testStatus["Not Tested"],C.muted]].map(([l,v,c])=>(
                  <div key={l} style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:c, flexShrink:0 }}/>
                    <span style={{ flex:1, color:C.text, fontSize:"0.85rem" }}>{l}</span>
                    <span style={{ color:c, fontWeight:800, fontSize:"1rem" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:"1.25rem" }}>
                <SectionTitle>Key Targets</SectionTitle>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                  {[["BIA Complete",`${ov.biaComplete}%`],["Plans Tested",`${ov.plansTested}/${ov.plansTotal}`],["RTO",ov.rto],["RPO",ov.rpo],["Critical Procs",ov.criticalProcesses],["With BCP",ov.processesWithBCP]].map(([l,v])=>(
                    <div key={l} style={{ background:C.surface, borderRadius:6, padding:"0.4rem 0.6rem" }}>
                      <div style={{ color:C.muted, fontSize:"0.6rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
                      <div style={{ color:C.text, fontSize:"0.9rem", fontWeight:700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {sub==="incidents"&&(
        <Card>
          <Table
            headers={["ID","Date","Type","Duration","Impact","RTO Met","Resolution"]}
            rows={incidents.map(i=>[
              i.id,i.date,i.type,i.duration,
              <StatusBadge status={i.impact}/>,
              (i.rtoMet&&i.rtoBreached!=="Yes")?<Badge label="Yes" color="green"/>:<Badge label="No" color="red"/>,
              i.resolution||i.status,
            ])}
          />
        </Card>
      )}
      {!["overview","incidents"].includes(sub)&&(
        <Card><p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>{sub.replace("-"," ").replace(/\b\w/g,c=>c.toUpperCase())} — Phase 2 build coming next.</p></Card>
      )}
    </div>
  );
}

// ─── MODULE: FRAUD & ETHICS ───────────────────────────────────────────────────
function FraudEthics() {
  const [cases, setCases] = useState(STATIC_FRAUD);
  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      const f = d.fraudEthics?.cases || d.fraudCases;
      if (Array.isArray(f) && f.length) setCases(f);
    }).catch(()=>{});
  },[]);

  const total = cases.length;
  const underInv = cases.filter(f=>f.status==="Under Investigation").length;
  const open = cases.filter(f=>!["Resolved","Closed","Written Off"].includes(f.status)).length;
  const exposure = cases.reduce((s,f)=>s+(Number(f.amount)||0),0);

  // 12-month fraud trend (demo)
  const fraudTrend = [
    { m:"Jan",v:4 },{ m:"Feb",v:3 },{ m:"Mar",v:5 },{ m:"Apr",v:2 },{ m:"May",v:3 },{ m:"Jun",v:4 },
    { m:"Jul",v:2 },{ m:"Aug",v:3 },{ m:"Sep",v:2 },{ m:"Oct",v:1 },{ m:"Nov",v:3 },{ m:"Dec",v:2 },
  ];
  const rollingAvg = (fraudTrend.reduce((s,x)=>s+x.v,0)/fraudTrend.length).toFixed(1);

  // Ethics category breakdown donut (derive from cases + demo categories)
  const ethicsCats = [
    { label:"Conflict of Interest", value:12, color:C.purple },
    { label:"Gifts & Hospitality",  value:8,  color:C.blue   },
    { label:"Bullying & Harassment",value:5,  color:C.amber  },
    { label:"Discrimination",       value:3,  color:C.red    },
    { label:"Other",                value:4,  color:C.green  },
  ];
  const ethicsTotal = ethicsCats.reduce((s,c)=>s+c.value,0);

  // Compliance breaches feed (demo, mirrors reference)
  const breaches = [
    { title:"SDL Act Breach",       status:"Open",          desc:"Failure to submit mandatory quarterly reports to DHET within stipulated timeframe", date:"2026-01-30", owner:"Compliance Office" },
    { title:"POPIA Non-Compliance", status:"Investigating", desc:"Learner personal information stored without adequate encryption",                    date:"2026-02-10", owner:"ICT Security" },
    { title:"PFMA Breach",          status:"Investigating", desc:"Irregular expenditure identified in Q3 financial statements",                        date:"2026-02-25", owner:"CFO Office" },
  ];
  const breachColor = s => s==="Open"?"amber":s==="Investigating"?"blue":s==="Resolved"?"green":"red";

  const typeColor = t => /fraud/i.test(t)?C.red:/ethics/i.test(t)?C.purple:C.amber;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Fraud & Ethics Register</h1>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Fraud Cases"          value={total}     sub={`${open} open`}            color={C.red}    delta={-1} deltaGood={true}/>
        <KPICardPro label="Ethics Cases"         value={ethicsCats.length} sub="categories tracked" color={C.purple}/>
        <KPICardPro label="Compliance Breaches"  value={breaches.length}   sub={`${breaches.filter(b=>b.status==="Open").length} open`} color={C.amber}/>
        <KPICardPro label="Active Investigations" value={underInv}  sub="being investigated"        color={C.amber}/>
        <KPICardPro label="Total Exposure"       value={`R${(exposure/1e6).toFixed(2)}M`} sub="financial loss" color={C.red}/>
      </div>

      {/* Trend + ethics donut + breaches */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Fraud Trend (12-month)</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fraudTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="m" stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }}/>
              <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }} width={20}/>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
              <Bar dataKey="v" fill={C.red} name="Cases" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ color:C.muted, fontSize:"0.75rem", textAlign:"center", marginTop:"0.25rem" }}>
            12-month rolling average: <span style={{ color:C.red, fontWeight:700 }}>{rollingAvg} cases/month</span>
          </div>
        </Card>

        <Card>
          <SectionTitle>Ethics Dashboard</SectionTitle>
          <div style={{ display:"flex", justifyContent:"center", padding:"0.25rem 0" }}>
            <DonutChart segments={ethicsCats} size={160} thickness={20} centerValue={ethicsTotal} centerLabel="cases"/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem", marginTop:"0.5rem" }}>
            {ethicsCats.map(c=>(
              <div key={c.label} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:c.color, flexShrink:0 }}/>
                <span style={{ flex:1, color:C.muted, fontSize:"0.78rem" }}>{c.label}</span>
                <span style={{ color:C.text, fontWeight:700, fontSize:"0.8rem" }}>{c.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Compliance Breaches</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {breaches.map(b=>(
              <div key={b.title} style={{ background:C.surface, borderRadius:8, padding:"0.65rem 0.85rem", border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.3rem" }}>
                  <span style={{ color:C.text, fontWeight:700, fontSize:"0.82rem" }}>● {b.title}</span>
                  <Badge label={b.status} color={breachColor(b.status)}/>
                </div>
                <div style={{ color:C.muted, fontSize:"0.75rem", lineHeight:1.5, marginBottom:"0.3rem" }}>{b.desc}</div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:C.muted, fontSize:"0.7rem" }}>{b.date}</span>
                  <span style={{ color:C.muted, fontSize:"0.7rem" }}>{b.owner}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Register */}
      <Card>
        <SectionTitle>Fraud, Ethics & Compliance Register</SectionTitle>
        <Table
          headers={["Case ID","Category","Description","Amount","Severity","Source","Reported","Status"]}
          rows={cases.map(f=>[
            <span style={{ color:typeColor(f.category), fontWeight:700 }}>{f.id}</span>,
            f.category,
            <span style={{ maxWidth:240, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={f.description}>{f.description}</span>,
            Number(f.amount)>0?<span style={{ color:C.red, fontWeight:700 }}>R{Number(f.amount).toLocaleString()}</span>:<span style={{ color:C.muted }}>—</span>,
            <Badge label={Number(f.amount)>1e6?"High":Number(f.amount)>1e5?"Medium":"Low"} color={Number(f.amount)>1e6?"red":Number(f.amount)>1e5?"amber":"green"}/>,
            <span style={{ color:C.muted, fontSize:"0.78rem" }}>{f.source||"—"}</span>,
            <span style={{ color:C.muted, fontSize:"0.78rem" }}>{f.reported||"—"}</span>,
            <StatusBadge status={f.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: DEPARTMENTAL RISKS ───────────────────────────────────────────────
function DepartmentalRisks() {
  const [oprisks, setOprisks] = useState(STATIC_OPRISKS);
  const [portfolioFilter, setPortfolioFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    fetch(`${API}/api/oprisks`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)&&d.length) setOprisks(d); }).catch(()=>{});
  },[]);

  const sc = v => Number(v)>=15?C.red:Number(v)>=10?"#e36209":Number(v)>=6?C.amber:C.green;

  // Portfolio rollups
  const portfolios = STATIC_PORTFOLIOS.map(p=>{
    const risks = oprisks.filter(r=>r.portfolio===p.name);
    const critical = risks.filter(r=>r.current>=15).length;
    const avgResidual = risks.length ? (risks.reduce((s,r)=>s+r.residual,0)/risks.length) : 0;
    return { ...p, count:risks.length, critical, avgResidual };
  });

  const filtered = oprisks.filter(r=>
    (portfolioFilter==="All" || r.portfolio===portfolioFilter) &&
    ((r.name||"").toLowerCase().includes(search.toLowerCase()) || (r.id||"").toLowerCase().includes(search.toLowerCase()) || (r.unit||"").toLowerCase().includes(search.toLowerCase()))
  );
  const sel = selected || filtered[0] || oprisks[0];

  // Per-risk progress trend (inherent → current trajectory)
  const trendData = (()=>{
    if (!sel) return [];
    const start = sel.inherent, end = sel.current;
    const months = ["Aug","Sep","Oct","Nov","Dec","Jan"];
    return months.map((m,i)=>({ m, v:+(start + (end-start)*(i/(months.length-1))).toFixed(1) }));
  })();

  const totalRisks = oprisks.length;
  const totalCritical = oprisks.filter(r=>r.current>=15).length;
  const avgResidual = (oprisks.reduce((s,r)=>s+r.residual,0)/oprisks.length).toFixed(1);
  const trendIcon = t => t==="Improving"?"↗":t==="Declining"?"↘":"—";
  const trendColor = t => t==="Improving"?C.green:t==="Declining"?C.red:C.muted;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Departmental Risk Summary</h1>
        <input placeholder="Search operational risks…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:240 }}/>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Operational Risks" value={totalRisks}    sub={`across ${STATIC_PORTFOLIOS.length} portfolios`} color={C.blue}/>
        <KPICardPro label="Critical (≥15)"    value={totalCritical} sub="current rating"      color={C.red}/>
        <KPICardPro label="Avg Residual"      value={avgResidual}   sub="across all risks"    color={C.amber} spark={[14,13,13,12,12,Number(avgResidual)]}/>
        <KPICardPro label="Improving"         value={oprisks.filter(r=>r.trend==="Improving").length} sub="positive trend" color={C.green}/>
      </div>

      {/* Portfolio filter cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:"0.85rem" }}>
        <div onClick={()=>{ setPortfolioFilter("All"); setSelected(null); }}
          style={{ cursor:"pointer", background:portfolioFilter==="All"?"rgba(88,166,255,0.12)":C.card, border:`1px solid ${portfolioFilter==="All"?C.blue:C.border}`, borderRadius:10, padding:"0.85rem 1rem" }}>
          <div style={{ color:C.text, fontWeight:700, fontSize:"0.85rem" }}>All Portfolios</div>
          <div style={{ color:C.blue, fontSize:"1.5rem", fontWeight:800 }}>{totalRisks}</div>
          <div style={{ color:C.muted, fontSize:"0.7rem" }}>{totalCritical} critical</div>
        </div>
        {portfolios.map(p=>{
          const active = portfolioFilter===p.name;
          return (
            <div key={p.name} onClick={()=>{ setPortfolioFilter(p.name); setSelected(null); }}
              style={{ cursor:"pointer", background:active?"rgba(88,166,255,0.12)":C.card, border:`1px solid ${active?C.blue:C.border}`, borderRadius:10, padding:"0.85rem 1rem" }}>
              <div style={{ color:C.text, fontWeight:700, fontSize:"0.85rem", lineHeight:1.2, marginBottom:4 }}>{p.name}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ color:sc(p.avgResidual), fontSize:"1.5rem", fontWeight:800 }}>{p.count}</span>
                <span style={{ color:C.muted, fontSize:"0.7rem" }}>risks</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
                <span style={{ color:C.muted, fontSize:"0.68rem" }}>{p.units.length} unit{p.units.length!==1?"s":""}</span>
                {p.critical>0 && <span style={{ color:C.red, fontSize:"0.68rem", fontWeight:700 }}>{p.critical} critical</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational risk register + detail */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"1.25rem", alignItems:"start" }}>
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"0.85rem 1.1rem", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:"0.95rem" }}>Operational Risk Register</span>
            <span style={{ color:C.muted, fontSize:"0.78rem", marginLeft:8 }}>{portfolioFilter==="All"?"All portfolios":portfolioFilter} · {filtered.length} risks</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
              <thead>
                <tr>{["Risk ID","Risk Name","Inherent","Residual","Current","Target","Appetite","Trend"].map((h,i)=>
                  <th key={i} style={{ color:C.muted, fontWeight:600, padding:"0.6rem 0.7rem", textAlign:"left", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(r=>{
                  const isSel = sel && r.id===sel.id;
                  return (
                    <tr key={r.id} onClick={()=>setSelected(r)}
                      style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                        background:isSel?"rgba(88,166,255,0.12)":"transparent",
                        borderLeft:`3px solid ${isSel?C.blue:"transparent"}` }}
                      onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background=C.surface; }}
                      onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="transparent"; }}>
                      <td style={{ padding:"0.55rem 0.7rem", color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{r.id}</td>
                      <td style={{ padding:"0.55rem 0.7rem", color:C.text, maxWidth:230 }}>
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.name}>{r.name}</div>
                        <div style={{ color:C.muted, fontSize:"0.68rem" }}>{r.unit}</div>
                      </td>
                      <td style={{ padding:"0.55rem 0.7rem", color:sc(r.inherent), fontWeight:700 }}>{r.inherent}</td>
                      <td style={{ padding:"0.55rem 0.7rem", color:sc(r.residual), fontWeight:700 }}>{r.residual}</td>
                      <td style={{ padding:"0.55rem 0.7rem", color:sc(r.current), fontWeight:700 }}>{r.current}</td>
                      <td style={{ padding:"0.55rem 0.7rem", color:C.green, fontWeight:700 }}>{r.target}</td>
                      <td style={{ padding:"0.55rem 0.7rem", color:C.muted, fontSize:"0.78rem" }}>{r.appetite}</td>
                      <td style={{ padding:"0.55rem 0.7rem", color:trendColor(r.trend), fontWeight:700 }}>{trendIcon(r.trend)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No operational risks match.</p>}
        </Card>

        {/* Detail panel */}
        {sel && (
          <Card style={{ position:"sticky", top:0 }}>
            <div style={{ color:C.muted, fontSize:"0.72rem", fontWeight:700 }}>{sel.id} · {sel.portfolio} / {sel.unit}</div>
            <h3 style={{ color:C.text, fontSize:"1.02rem", fontWeight:700, margin:"0.2rem 0 0.5rem" }}>{sel.name}</h3>
            <p style={{ color:C.muted, fontSize:"0.8rem", lineHeight:1.6, margin:"0 0 1rem" }}>{sel.description}</p>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.5rem", marginBottom:"1rem" }}>
              {[["Inherent",sel.inherent,sc(sel.inherent)],["Residual",sel.residual,sc(sel.residual)],["Current",sel.current,sc(sel.current)],["Target",sel.target,C.green]].map(([l,v,c])=>(
                <div key={l} style={{ background:C.surface, borderRadius:7, padding:"0.5rem", textAlign:"center" }}>
                  <div style={{ color:c, fontSize:"1.3rem", fontWeight:800 }}>{v}</div>
                  <div style={{ color:C.muted, fontSize:"0.62rem" }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1rem" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:C.surface, display:"flex", alignItems:"center", justifyContent:"center", color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>
                {(sel.owner||"NA").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ color:C.text, fontSize:"0.85rem", fontWeight:600 }}>{sel.owner}</div>
                <div style={{ display:"flex", gap:6, marginTop:2 }}>
                  <Badge label={sel.trend} color={sel.trend==="Improving"?"green":sel.trend==="Declining"?"red":"amber"}/>
                  <Badge label={`Appetite: ${sel.appetite}`} color="blue"/>
                </div>
              </div>
            </div>

            <SectionTitle>Progress Trend</SectionTitle>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="m" stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }}/>
                <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }} width={24}/>
                <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
                <Line type="monotone" dataKey="v" stroke={sc(sel.current)} strokeWidth={2} dot={{ r:3 }} name="Risk rating"/>
              </LineChart>
            </ResponsiveContainer>

            <div style={{ marginTop:"0.75rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Reduction to Target</span>
                <span style={{ color:C.text, fontSize:"0.78rem", fontWeight:700 }}>{sel.current} → {sel.target}</span>
              </div>
              <ProgressBar value={Math.max(0, sel.inherent-sel.current)} max={Math.max(1, sel.inherent-sel.target)} color={C.green}/>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── MODULE: UIFW ─────────────────────────────────────────────────────────────
function UIFWExpenditure() {
  const total=STATIC_UIFW.reduce((s,u)=>s+u.amount,0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>UIFW Expenditure Register</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.85rem" }}>
        <KPICard label="Total UIFW"  value={`R${(total/1e6).toFixed(1)}M`} color={C.red}/>
        <KPICard label="Irregular"   value={`R${(STATIC_UIFW.filter(u=>u.type==="Irregular").reduce((s,u)=>s+u.amount,0)/1e6).toFixed(1)}M`} color={C.amber}/>
        <KPICard label="Open Cases"  value={STATIC_UIFW.filter(u=>u.status==="Open"||u.status==="Under Investigation").length} color={C.red}/>
      </div>
      <Card>
        <Table
          headers={["ID","Type","Department","Description","Amount","Status"]}
          rows={STATIC_UIFW.map(u=>[
            <span style={{ color:C.amber, fontWeight:700 }}>{u.id}</span>,
            <Badge label={u.type} color={u.type==="Irregular"?"red":u.type==="Fruitless & Wasteful"?"amber":"blue"}/>,
            u.department,u.description,
            <span style={{ color:C.red, fontWeight:700 }}>R{u.amount.toLocaleString()}</span>,
            <StatusBadge status={u.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: THIRD-PARTY RISK ─────────────────────────────────────────────────
function ThirdPartyRisk() {
  const [vendors] = useState(STATIC_THIRD);

  const total = vendors.length;
  const highRisk = vendors.filter(v=>v.risk==="High").length;
  const avgScore = Math.round(vendors.reduce((s,v)=>s+(Number(v.score)||0),0)/vendors.length);
  const underReview = vendors.filter(v=>v.status==="Review").length;
  const scoreColor = s => s>=80?C.green:s>=65?C.amber:C.red;
  const riskColor  = r => r==="High"?C.red:r==="Medium"?C.amber:C.green;

  // Risk-tier distribution
  const tiers = ["High","Medium","Low"];
  const tierCounts = tiers.map(t=>({ tier:t, count:vendors.filter(v=>v.risk===t).length, color:riskColor(t) }));
  const tierMax = Math.max(1, ...tierCounts.map(t=>t.count));

  // Contract expiry awareness: flag contracts within ~90 days of a reference date
  const soonExpiry = vendors.filter(v=>{
    if (!v.contract || v.contract==="Ongoing") return false;
    const d = new Date(v.contract); const now = new Date("2026-06-19");
    const days = (d-now)/(1000*60*60*24);
    return days>=0 && days<=120;
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Third-Party Risk Register</h1>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Total Vendors"    value={total}      sub="under management"        color={C.blue}/>
        <KPICardPro label="High Risk"        value={highRisk}   sub="require close monitoring" color={C.red}/>
        <KPICardPro label="Avg Risk Score"   value={avgScore}   sub="out of 100"               color={scoreColor(avgScore)} spark={[70,72,74,73,75,avgScore]}/>
        <KPICardPro label="Under Review"     value={underReview} sub="contract/risk review"    color={C.amber}/>
      </div>

      {/* Risk distribution + contract expiry */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>Risk Tier Distribution</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem", marginTop:"0.5rem" }}>
            {tierCounts.map(t=>(
              <div key={t.tier} style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                <div style={{ width:60, color:C.muted, fontSize:"0.8rem", fontWeight:600 }}>{t.tier}</div>
                <div style={{ flex:1, background:C.border, borderRadius:6, height:22, overflow:"hidden" }}>
                  <div style={{ width:`${(t.count/tierMax)*100}%`, height:"100%", background:t.color, borderRadius:6,
                    display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:8, transition:"width 0.5s" }}>
                    <span style={{ color:"#fff", fontSize:"0.72rem", fontWeight:700 }}>{t.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"1.25rem" }}>
            <SectionTitle>Vendor Score Ranking</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.55rem" }}>
              {[...vendors].sort((a,b)=>b.score-a.score).map(v=>(
                <div key={v.id} style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                  <div style={{ width:110, color:C.text, fontSize:"0.78rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={v.name}>{v.name}</div>
                  <div style={{ flex:1 }}><ProgressBar value={v.score} color={scoreColor(v.score)}/></div>
                  <span style={{ color:scoreColor(v.score), fontSize:"0.78rem", fontWeight:700, minWidth:24, textAlign:"right" }}>{v.score}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>⚠ Contract Renewals — Next 120 Days</SectionTitle>
          {soonExpiry.length>0 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
              {soonExpiry.map(v=>(
                <div key={v.id} style={{ background:C.surface, borderRadius:8, padding:"0.65rem 0.85rem", borderLeft:`3px solid ${riskColor(v.risk)}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ color:C.text, fontWeight:700, fontSize:"0.85rem" }}>{v.name}</span>
                    <Badge label={v.risk} color={v.risk==="High"?"red":v.risk==="Medium"?"amber":"green"}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.3rem" }}>
                    <span style={{ color:C.muted, fontSize:"0.75rem" }}>{v.type}</span>
                    <span style={{ color:C.amber, fontSize:"0.78rem", fontWeight:700 }}>Expires {v.contract}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color:C.muted, fontSize:"0.82rem" }}>No contracts expiring within the next 120 days.</p>
          )}
          <div style={{ marginTop:"1rem", padding:"0.85rem", background:C.surface, borderRadius:8 }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>Portfolio Health</div>
            <div style={{ display:"flex", gap:"1.25rem" }}>
              <div><div style={{ color:C.green, fontSize:"1.4rem", fontWeight:800 }}>{vendors.filter(v=>v.score>=80).length}</div><div style={{ color:C.muted, fontSize:"0.68rem" }}>Strong (80+)</div></div>
              <div><div style={{ color:C.amber, fontSize:"1.4rem", fontWeight:800 }}>{vendors.filter(v=>v.score>=65&&v.score<80).length}</div><div style={{ color:C.muted, fontSize:"0.68rem" }}>Adequate</div></div>
              <div><div style={{ color:C.red, fontSize:"1.4rem", fontWeight:800 }}>{vendors.filter(v=>v.score<65).length}</div><div style={{ color:C.muted, fontSize:"0.68rem" }}>Weak (&lt;65)</div></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed register */}
      <Card>
        <SectionTitle>Third-Party Register</SectionTitle>
        <Table
          headers={["ID","Vendor","Type","Risk Tier","Score","Contract Expiry","Status"]}
          rows={vendors.map(v=>[
            <span style={{ color:C.blue, fontWeight:700 }}>{v.id}</span>,
            <span style={{ fontWeight:700, color:C.text }}>{v.name}</span>,
            <span style={{ color:C.muted, fontSize:"0.78rem" }}>{v.type}</span>,
            <Badge label={v.risk} color={v.risk==="High"?"red":v.risk==="Medium"?"amber":"green"}/>,
            <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:90 }}>
              <div style={{ flex:1 }}><ProgressBar value={v.score} color={scoreColor(v.score)}/></div>
              <span style={{ color:scoreColor(v.score), fontWeight:700, fontSize:"0.78rem" }}>{v.score}</span>
            </div>,
            <span style={{ color:soonExpiry.includes(v)?C.amber:C.text, fontWeight:soonExpiry.includes(v)?700:400, fontSize:"0.82rem" }}>{v.contract}</span>,
            <StatusBadge status={v.status}/>,
          ])}
        />
      </Card>
    </div>
  );
}

// ─── MODULE: APP ALIGNMENT ────────────────────────────────────────────────────
function APPAlignment() {
  const [apps] = useState(STATIC_APP);

  // Group APP items under strategic objectives (derived from ref prefix)
  const objectives = [
    { code:"SO 1", name:"Financial Sustainability & Skills Funding", color:C.blue },
    { code:"SO 2", name:"Clean Governance & Compliance",            color:C.green },
    { code:"SO 3", name:"Digital Transformation & Systems",         color:C.purple },
    { code:"SO 4", name:"Human Capital & Capability",               color:C.amber },
  ];
  const objOf = ref => "SO " + (ref.match(/APP (\d)/)?.[1] || "1");

  // Previous-period values (demo) keyed by ref
  const prev = { "APP 1.1":10,"APP 1.2":72,"APP 2.1":98,"APP 2.2":5.1,"APP 3.1":45,"APP 3.2":63,"APP 4.1":72 };

  const onTrack = apps.filter(a=>a.status==="On Track").length;
  const behind  = apps.filter(a=>a.status==="Behind").length;
  const inProg  = apps.filter(a=>a.status==="In Progress").length;
  const avgAchievement = Math.round(apps.reduce((s,a)=>s+Math.min(100,(a.actual/Math.max(a.target,0.01))*100),0)/apps.length);

  // KRI / KPI trend series — current vs previous reporting period (demo)
  const kpiTrend = [
    { period:"Q1 (Prev)", achievement:62, kriBreaches:7, compliance:74 },
    { period:"Q2 (Prev)", achievement:66, kriBreaches:6, compliance:78 },
    { period:"Q3 (Prev)", achievement:70, kriBreaches:6, compliance:80 },
    { period:"Q4 (Prev)", achievement:73, kriBreaches:5, compliance:83 },
    { period:"Q1 (Curr)", achievement:76, kriBreaches:4, compliance:86 },
    { period:"Q2 (Curr)", achievement:avgAchievement, kriBreaches:3, compliance:88 },
  ];

  const variance = a => +(a.actual - a.target).toFixed(1);
  const varColor = v => v>=0?C.green:v<=-10?C.red:C.amber;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Annual Performance Plan Alignment</h1>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        <KPICardPro label="Strategic Objectives" value={objectives.length} sub="aligned to APP"          color={C.blue}/>
        <KPICardPro label="KPIs Tracked"          value={apps.length}        sub={`${onTrack} on track`} color={C.green}/>
        <KPICardPro label="Avg Achievement"       value={`${avgAchievement}%`} sub="of target"           color={avgAchievement>=80?C.green:avgAchievement>=60?C.amber:C.red} spark={[62,66,70,73,76,avgAchievement]}/>
        <KPICardPro label="Behind Target"         value={behind}             sub="require intervention"  color={C.red}/>
      </div>

      {/* Strategic objectives breakdown */}
      <Card>
        <SectionTitle>Strategic Objectives — APP Performance</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"0.85rem" }}>
          {objectives.map(o=>{
            const items = apps.filter(a=>objOf(a.ref)===o.code);
            const objAch = items.length ? Math.round(items.reduce((s,a)=>s+Math.min(100,(a.actual/Math.max(a.target,0.01))*100),0)/items.length) : 0;
            return (
              <div key={o.code} style={{ background:C.surface, borderRadius:9, padding:"0.9rem 1rem", borderTop:`3px solid ${o.color}` }}>
                <div style={{ color:C.muted, fontSize:"0.68rem", fontWeight:700 }}>{o.code}</div>
                <div style={{ color:C.text, fontWeight:700, fontSize:"0.85rem", lineHeight:1.3, marginBottom:"0.5rem", minHeight:34 }}>{o.name}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:6 }}>
                  <span style={{ color:o.color, fontSize:"1.5rem", fontWeight:800 }}>{objAch}%</span>
                  <span style={{ color:C.muted, fontSize:"0.7rem" }}>avg achievement</span>
                </div>
                <ProgressBar value={objAch} color={o.color}/>
                <div style={{ color:C.muted, fontSize:"0.7rem", marginTop:6 }}>{items.length} KPI{items.length!==1?"s":""}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Targeted vs achieved + variance table */}
      <Card>
        <SectionTitle>APP Targets — Targeted vs Achieved & Variance</SectionTitle>
        <Table
          headers={["Ref","Objective","Strategic Obj.","Target","Achieved","Variance","Prev. Period","Status"]}
          rows={apps.map(a=>{
            const v = variance(a);
            const p = prev[a.ref];
            const pDelta = p!=null ? +(a.actual - p).toFixed(1) : null;
            return [
              <span style={{ color:C.blue, fontWeight:700 }}>{a.ref}</span>,
              <span style={{ maxWidth:260, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.objective}>{a.objective}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{objOf(a.ref)}</span>,
              <span style={{ color:C.text, fontWeight:600 }}>{a.target}{a.target<=10?"":"%"}</span>,
              <span style={{ color:C.text, fontWeight:700 }}>{a.actual}{a.target<=10?"":"%"}</span>,
              <span style={{ color:varColor(v), fontWeight:700 }}>{v>=0?"+":""}{v}</span>,
              <span style={{ color:pDelta>=0?C.green:C.red, fontSize:"0.8rem" }}>{p!=null?`${p} (${pDelta>=0?"+":""}${pDelta})`:"—"}</span>,
              <StatusBadge status={a.status}/>,
            ];
          })}
        />
      </Card>

      {/* KRI / KPI trends current vs previous period */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>KPI Achievement Trend — Current vs Previous</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={kpiTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="period" stroke={C.muted} tick={{ fill:C.muted, fontSize:9 }}/>
              <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }} domain={[0,100]}/>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
              <Legend wrapperStyle={{ fontSize:"0.72rem", color:C.muted }}/>
              <Line type="monotone" dataKey="achievement" stroke={C.green} strokeWidth={2} dot={{ r:3 }} name="KPI Achievement %"/>
              <Line type="monotone" dataKey="compliance"  stroke={C.blue}  strokeWidth={2} dot={{ r:3 }} name="Compliance %"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle>KRI Breach Trend — Current vs Previous</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kpiTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="period" stroke={C.muted} tick={{ fill:C.muted, fontSize:9 }}/>
              <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:10 }} allowDecimals={false}/>
              <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
              <Bar dataKey="kriBreaches" fill={C.red} name="KRI Breaches" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── MODULE: PREDICTIVE INTEL ─────────────────────────────────────────────────
function PredictiveIntel() {
  // Historical + forecast with confidence band (lower/upper for forecast zone)
  const data = [
    { month:"Jan", actual:38.5, forecast:null, lo:null, hi:null },
    { month:"Feb", actual:39.2, forecast:null, lo:null, hi:null },
    { month:"Mar", actual:40.1, forecast:null, lo:null, hi:null },
    { month:"Apr", actual:40.8, forecast:null, lo:null, hi:null },
    { month:"May", actual:41.5, forecast:null, lo:null, hi:null },
    { month:"Jun", actual:42.0, forecast:42.0, lo:42.0, hi:42.0 },
    { month:"Jul", actual:null, forecast:42.6, lo:41.5, hi:43.7 },
    { month:"Aug", actual:null, forecast:43.1, lo:41.6, hi:44.6 },
    { month:"Sep", actual:null, forecast:43.5, lo:41.5, hi:45.5 },
    { month:"Oct", actual:null, forecast:44.0, lo:41.6, hi:46.4 },
    { month:"Nov", actual:null, forecast:44.6, lo:41.8, hi:47.4 },
    { month:"Dec", actual:null, forecast:45.2, lo:41.9, hi:48.5 },
  ];

  const kpis = [
    { label:"Predicted KRI Breaches", value:3,    sub:"-2 from previous", color:C.green,  delta:-2, good:true,  spark:[5,5,4,4,3,3] },
    { label:"Predicted Overdue Actions", value:5, sub:"-3 from previous", color:C.green,  delta:-3, good:true,  spark:[9,8,7,6,6,5] },
    { label:"Predicted Risk Exposure", value:43.5, sub:"+1.5 from previous", color:C.amber, delta:1.5, good:false, spark:[40,41,41,42,42,43.5] },
    { label:"Opportunity Realisation %", value:68, sub:"+5 from previous", color:C.green, delta:5, good:true, spark:[58,60,62,64,66,68] },
  ];

  const modelConfidence = [
    { label:"Risk Exposure Forecast", value:92 },
    { label:"KRI Breach Prediction",  value:85 },
    { label:"Treatment Delay Forecast", value:78 },
    { label:"Opportunity Realisation", value:72 },
  ];

  const velocityAlerts = [
    { title:"Cybersecurity Maturity", note:"Projected to reach Red threshold by March", color:C.red },
    { title:"BCP Test Success", note:"Expected improvement to 75% next quarter", color:C.amber },
    { title:"Employee Engagement", note:"Steady upward trend projected", color:C.green },
  ];

  const recommendations = [
    "Accelerate cybersecurity framework deployment by 4 weeks",
    "Prioritise BCP testing for Grant Disbursement and IT Service Management",
    "Increase monitoring frequency for KRI-005 (Cyber Maturity) to weekly",
    "Fast-track Municipal Finance Skills Academy for Q2 benefit realisation",
    "Escalate SETA consolidation risk to ARC for strategic response planning",
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div>
        <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Predictive Risk Intelligence</h1>
        <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>AI-powered forecasting based on historical trend analysis</p>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.85rem" }}>
        {kpis.map(k=>(
          <KPICardPro key={k.label} label={k.label} value={k.value} sub={k.sub} color={k.color} delta={k.delta} deltaGood={k.good} spark={k.spark}/>
        ))}
      </div>

      {/* Forecast with confidence band */}
      <Card>
        <SectionTitle>Future Risk Exposure Forecast</SectionTitle>
        <div style={{ display:"flex", gap:"1.25rem", marginBottom:"0.5rem" }}>
          <span style={{ color:C.red, fontSize:"0.72rem" }}>━ Historical</span>
          <span style={{ color:C.purple, fontSize:"0.72rem" }}>┅ AI Forecast</span>
          <span style={{ color:C.muted, fontSize:"0.72rem" }}>▒ Confidence Band</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.purple} stopOpacity={0.25}/>
                <stop offset="100%" stopColor={C.purple} stopOpacity={0.04}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="month" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
            <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }} domain={[36,50]}/>
            <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
            <Area type="monotone" dataKey="hi" stroke="none" fill="url(#confBand)" name="Upper bound"/>
            <Area type="monotone" dataKey="lo" stroke="none" fill={C.card} fillOpacity={1} name="Lower bound"/>
            <Line type="monotone" dataKey="actual"   stroke={C.red}    strokeWidth={2.5} dot={{ r:3 }} name="Historical" connectNulls/>
            <Line type="monotone" dataKey="forecast" stroke={C.purple} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r:3 }} name="AI Forecast" connectNulls/>
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ textAlign:"right", marginTop:"0.25rem" }}>
          <span style={{ background:"rgba(163,113,247,0.12)", border:`1px solid ${C.purple}`, borderRadius:6, padding:"3px 10px", color:C.purple, fontSize:"0.72rem", fontWeight:600 }}>FORECAST ZONE — AI Generated Predictions</span>
        </div>
      </Card>

      {/* Velocity alerts + model confidence + recommendations */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <Card>
          <SectionTitle>⚡ Risk Velocity Alerts</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {velocityAlerts.map(a=>(
              <div key={a.title} style={{ background:C.surface, borderRadius:8, padding:"0.65rem 0.85rem", borderLeft:`3px solid ${a.color}` }}>
                <div style={{ color:C.text, fontWeight:700, fontSize:"0.83rem" }}>{a.title}</div>
                <div style={{ color:a.color, fontSize:"0.76rem", marginTop:2 }}>{a.note}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>🎯 Model Confidence</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.9rem", marginTop:"0.25rem" }}>
            {modelConfidence.map(m=>(
              <div key={m.label}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ color:C.text, fontSize:"0.8rem" }}>{m.label}</span>
                  <span style={{ color:C.cyan, fontSize:"0.8rem", fontWeight:700 }}>{m.value}%</span>
                </div>
                <ProgressBar value={m.value} color={C.cyan}/>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>🧠 Recommended Actions</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {recommendations.map((rec,i)=>(
              <div key={i} style={{ display:"flex", gap:"0.6rem", alignItems:"flex-start" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(163,113,247,0.15)", color:C.purple, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.68rem", fontWeight:700, flexShrink:0 }}>{i+1}</div>
                <span style={{ color:C.text, fontSize:"0.8rem", lineHeight:1.5 }}>{rec}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
// ─── KRI MONITORING ADMIN ────────────────────────────────────────────────────
const EMPTY_KRI = {
  id:"", indicator:"", linkedRisk:"", category:"Strategic Performance",
  target:"", currentPeriodValue:"", previousPeriodValue:"",
  currentStatus:"Outside Tolerance", previousStatus:"Within Tolerance",
  trend:"Stable", greenThreshold:"", amberThreshold:"", redThreshold:"",
};

function KRIForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_KRI, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit KRI — ${initial.id}` : "Add New KRI"}
      </h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="KRI ID"        value={f.id}        onChange={set("id")}        required placeholder="KRI-009" />
        <FInput label="Indicator Name" value={f.indicator} onChange={set("indicator")} required placeholder="e.g. Levy Income vs Budget" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Linked Risk ID"  value={f.linkedRisk} onChange={set("linkedRisk")} placeholder="e.g. SR-001" />
        <FSelect label="Category"        value={f.category}   onChange={set("category")}
          options={["Strategic Performance","Financial Performance","Operational Performance","Compliance","Human Capital","Technology","Stakeholder"]} />
        <FSelect label="Trend"           value={f.trend}      onChange={set("trend")}
          options={["Improving","Stable","Declining","Unknown"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Target"                value={f.target}              onChange={set("target")}              placeholder="e.g. 95%" />
        <FInput label="Current Period Value"  value={f.currentPeriodValue}  onChange={set("currentPeriodValue")}  placeholder="e.g. 88%" />
        <FInput label="Previous Period Value" value={f.previousPeriodValue} onChange={set("previousPeriodValue")} placeholder="e.g. 82%" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FSelect label="Current Status"  value={f.currentStatus}  onChange={set("currentStatus")}
          options={["Outside Tolerance","Within Tolerance","Critical","Closed"]} required />
        <FSelect label="Previous Status" value={f.previousStatus} onChange={set("previousStatus")}
          options={["Outside Tolerance","Within Tolerance","Critical","Closed"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Green Threshold (e.g. 95%-100%)" value={f.greenThreshold} onChange={set("greenThreshold")} placeholder="95%-100%" />
        <FInput label="Amber Threshold (e.g. 85%-94%)" value={f.amberThreshold} onChange={set("amberThreshold")} placeholder="85%-94%"  />
        <FInput label="Red Threshold (e.g. Below 85%)"  value={f.redThreshold}  onChange={set("redThreshold")}  placeholder="Below 85%" />
      </div>
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update KRI" : "Add KRI"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function KRIMonitoringAdmin() {
  const [kris, setKris]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/kris`);
      const data = await res.json();
      setKris(Array.isArray(data) && data.length > 0 ? data : STATIC_KRIS);
    } catch { setKris(STATIC_KRIS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.indicator) { showToast("KRI ID and Indicator Name are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const res = await fetch(
        isEdit ? `${API}/api/kris/${f.id}` : `${API}/api/kris`,
        { method: isEdit ? "PUT" : "POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(f) }
      );
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/kris/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = kris.filter(k =>
    (k.indicator||k.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (k.id||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete KRI</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>KRI Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{kris.length} indicators · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search KRIs…" style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add KRI
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Form */}
      {mode==="add"        && <KRIForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add"&& <KRIForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading KRIs from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Indicator","Category","Current Value","Target","Trend","Status","Actions"]}
            rows={filtered.map(k=>{
              const breach=(k.currentStatus||"").includes("Outside");
              return [
                <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{k.id}</span>,
                <span style={{ maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={k.indicator||k.name}>{k.indicator||k.name||"—"}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{k.category||"—"}</span>,
                <span style={{ color:breach?C.red:C.green, fontWeight:700 }}>{k.currentPeriodValue||k.actual||"—"}</span>,
                <span style={{ color:C.text }}>{k.target||"—"}</span>,
                <span style={{ color:(k.trend||"").toLowerCase()==="improving"?C.green:(k.trend||"").toLowerCase()==="declining"?C.red:C.muted }}>
                  {(k.trend||"").toLowerCase()==="improving"?"↑ Improving":(k.trend||"").toLowerCase()==="declining"?"↓ Declining":"→ Stable"}
                </span>,
                <StatusBadge status={k.currentStatus||k.status}/>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...k })} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Edit
                  </button>
                  <button onClick={()=>setConfirmDel(k.id)} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Delete
                  </button>
                </div>,
              ];
            })}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No KRIs match your search.</p>}
        </Card>
      )}
    </div>
  );
}

// ─── TREATMENT ACTIONS ADMIN ──────────────────────────────────────────────────
const EMPTY_TREATMENT = {
  id:"", riskId:"", action:"", owner:"", dueDate:"",
  status:"Not Started", priority:"Medium", progress:0, budget:"",
};

function TreatmentForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_TREATMENT, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit Action — ${initial.id}` : "Add New Treatment Action"}
      </h3>

      {/* Row 1 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Action ID"   value={f.id}     onChange={set("id")}     required placeholder="TA-009" />
        <FInput label="Linked Risk" value={f.riskId} onChange={set("riskId")} required placeholder="e.g. SR-001" />
      </div>

      {/* Action description */}
      <FTextarea label="Action Description" value={f.action} onChange={set("action")} rows={2} placeholder="Describe the treatment action…" />

      {/* Row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Owner"    value={f.owner}   onChange={set("owner")}   placeholder="e.g. CIO" />
        <FInput  label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date" />
        <FInput  label="Budget (R)" value={f.budget} onChange={set("budget")} type="number" placeholder="e.g. 100000" />
      </div>

      {/* Row 3 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FSelect label="Status" value={f.status} onChange={set("status")} required
          options={["Not Started","In Progress","Near Complete","Complete","Overdue","On Hold"]} />
        <FSelect label="Priority" value={f.priority} onChange={set("priority")}
          options={["Critical","High","Medium","Low"]} />
      </div>

      {/* Progress slider */}
      <div style={{ marginBottom:"0.85rem" }}>
        <label style={{ ...labelSt, display:"flex", justifyContent:"space-between" }}>
          <span>Progress</span>
          <span style={{ color:C.blue, fontWeight:700 }}>{f.progress}%</span>
        </label>
        <input type="range" min={0} max={100} step={5} value={f.progress}
          onChange={e=>set("progress")(Number(e.target.value))}
          style={{ width:"100%", accentColor:C.blue, cursor:"pointer" }} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          {[0,25,50,75,100].map(v=>(
            <span key={v} style={{ color:C.muted, fontSize:"0.7rem" }}>{v}%</span>
          ))}
        </div>
        {/* Visual bar */}
        <div style={{ marginTop:6 }}>
          <ProgressBar value={Number(f.progress)} color={Number(f.progress)===100?C.green:Number(f.progress)>=75?C.amber:C.blue} />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Action" : "Add Action"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function TreatmentActionsAdmin() {
  const [actions, setActions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/treatments`);
      const data = await res.json();
      setActions(Array.isArray(data) && data.length > 0 ? data : STATIC_TREATMENTS);
    } catch { setActions(STATIC_TREATMENTS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.action) { showToast("Action ID and Description are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const body   = { ...f, progress: Number(f.progress)||0, budget: Number(f.budget)||0 };
      const res = await fetch(
        isEdit ? `${API}/api/treatments/${f.id}` : `${API}/api/treatments`,
        { method: isEdit?"PUT":"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) }
      );
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/treatments/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Server error");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = actions.filter(a =>
    (a.action||"").toLowerCase().includes(search.toLowerCase()) ||
    (a.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (a.riskId||a.risk||"").toLowerCase().includes(search.toLowerCase()) ||
    (a.owner||"").toLowerCase().includes(search.toLowerCase())
  );

  const priorityColor = p => p==="Critical"?C.red:p==="High"?"#e36209":p==="Medium"?C.amber:C.green;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Treatment Action</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Treatment Actions — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>
            {actions.length} actions · {actions.filter(a=>a.status==="Complete").length} complete ·{" "}
            {actions.filter(a=>a.status==="Not Started").length} not started
          </p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search actions…"
            style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.green, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add Action
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.75rem", marginBottom:"1.25rem" }}>
        {[
          ["Total",        actions.length,                                              C.blue  ],
          ["Complete",     actions.filter(a=>a.status==="Complete").length,             C.green ],
          ["In Progress",  actions.filter(a=>["In Progress","Near Complete"].includes(a.status)).length, C.amber ],
          ["Not Started",  actions.filter(a=>a.status==="Not Started").length,          C.muted ],
          ["Overdue",      actions.filter(a=>a.status==="Overdue"||
            (a.status!=="Complete"&&a.dueDate&&new Date(a.dueDate)<new Date())).length, C.red   ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {mode==="add"         && <TreatmentForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <TreatmentForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading actions from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Risk","Action","Owner","Due Date","Priority","Progress","Status","Actions"]}
            rows={filtered.map(a=>{
              const pct    = Number(a.progress)||0;
              const overdue= a.status!=="Complete" && a.dueDate && new Date(a.dueDate) < new Date();
              return [
                <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{a.id}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{a.riskId||a.risk||"—"}</span>,
                <span style={{ maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.action}>{a.action}</span>,
                <span style={{ whiteSpace:"nowrap" }}>{a.owner||"—"}</span>,
                <span style={{ color:overdue?C.red:C.text, whiteSpace:"nowrap", fontWeight:overdue?700:400 }}>
                  {overdue?"⚠ ":""}{a.dueDate||a.due||"—"}
                </span>,
                <span style={{ color:priorityColor(a.priority), fontWeight:700, fontSize:"0.78rem" }}>{a.priority||"—"}</span>,
                <div style={{ minWidth:130 }}>
                  <div style={{ color:pct===100?C.green:pct>=75?C.amber:C.blue, fontSize:"0.72rem", fontWeight:700, marginBottom:3 }}>{pct}%</div>
                  <ProgressBar value={pct} color={pct===100?C.green:pct>=75?C.amber:C.blue} />
                </div>,
                <StatusBadge status={a.status}/>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...a })} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Edit
                  </button>
                  <button onClick={()=>setConfirmDel(a.id)} disabled={!!mode}
                    style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                    Delete
                  </button>
                </div>,
              ];
            })}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No actions match your search.</p>}
        </Card>
      )}
    </div>
  );
}

// ─── UIFW EXPENDITURE ADMIN ───────────────────────────────────────────────────
const EMPTY_UIFW = {
  id:"", type:"Irregular", description:"", amount:"", department:"",
  dateIdentified:"", status:"Open", responsibleOfficer:"",
  condoned:"false", recoverable:"true", referredTo:"Internal Audit",
};

function UIFWForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_UIFW, ...initial, amount: initial.amount||"" });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.red}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.red, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit UIFW Case — ${initial.id}` : "Add New UIFW Case"}
      </h3>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput   label="Case ID"   value={f.id}   onChange={set("id")}   required placeholder="UIFW-009" />
        <FSelect  label="Type"      value={f.type} onChange={set("type")}  required
          options={["Irregular","Unauthorised","Fruitless & Wasteful"]} />
        <FInput   label="Department" value={f.department} onChange={set("department")} placeholder="e.g. Finance" />
      </div>

      <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2}
        placeholder="Describe the UIFW expenditure…" />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <div style={{ marginBottom:"0.85rem" }}>
          <label style={labelSt}>Amount (R) <span style={{ color:C.red }}>*</span></label>
          <input type="number" value={f.amount} onChange={e=>set("amount")(e.target.value)}
            placeholder="e.g. 500000" style={inputSt}/>
          {f.amount && <div style={{ color:C.red, fontSize:"0.75rem", marginTop:3 }}>
            = R{Number(f.amount).toLocaleString()}
          </div>}
        </div>
        <FInput  label="Date Identified" value={f.dateIdentified} onChange={set("dateIdentified")} type="date" />
        <FSelect label="Status" value={f.status} onChange={set("status")} required
          options={["Open","Under Investigation","Condoned","Recovered","Written Off","Closed"]} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Responsible Officer" value={f.responsibleOfficer} onChange={set("responsibleOfficer")} placeholder="e.g. Finance Manager" />
        <FSelect label="Condoned"   value={String(f.condoned)}   onChange={set("condoned")}   options={["false","true"]} />
        <FSelect label="Recoverable" value={String(f.recoverable)} onChange={set("recoverable")} options={["true","false"]} />
      </div>

      <FInput label="Referred To" value={f.referredTo} onChange={set("referredTo")} placeholder="e.g. Internal Audit, AGSA, NPA" />

      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.red, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Case" : "Add Case"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function UIFWAdmin() {
  const [cases, setCases]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/uifw`);
      const data = await res.json();
      setCases(Array.isArray(data) && data.length > 0 ? data : STATIC_UIFW);
    } catch { setCases(STATIC_UIFW); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.amount) { showToast("Case ID and Amount are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const body   = { ...f, amount:Number(f.amount)||0,
        condoned:   f.condoned==="true"||f.condoned===true,
        recoverable:f.recoverable==="true"||f.recoverable===true };
      const res = await fetch(
        isEdit ? `${API}/api/uifw/${f.id}` : `${API}/api/uifw`,
        { method:isEdit?"PUT":"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) }
      );
      if (!res.ok) throw new Error((await res.json()).message||"Server error");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/uifw/${id}`, { method:"DELETE" });
      if (!res.ok) throw new Error((await res.json()).message||"Server error");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = cases.filter(c =>
    (c.description||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.department||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.type||"").toLowerCase().includes(search.toLowerCase())
  );

  const total     = cases.reduce((s,c)=>s+(Number(c.amount)||0), 0);
  const openTotal = cases.filter(c=>["Open","Under Investigation"].includes(c.status)).reduce((s,c)=>s+(Number(c.amount)||0),0);

  const typeColor = t => t==="Irregular"?C.red:t==="Unauthorised"?C.purple:C.amber;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete UIFW Case</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>UIFW Expenditure — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{cases.length} cases · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cases…"
            style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.red, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add Case
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1.25rem" }}>
        {[
          ["Total Cases",    cases.length,                                                              C.blue  ],
          ["Total UIFW",     `R${(total/1e6).toFixed(2)}M`,                                            C.red   ],
          ["Open / Under Inv",cases.filter(c=>["Open","Under Investigation"].includes(c.status)).length,C.amber ],
          ["Open Exposure",  `R${(openTotal/1e6).toFixed(2)}M`,                                        C.red   ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.4rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {mode==="add"         && <UIFWForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <UIFWForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading UIFW cases from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Type","Department","Description","Amount","Date","Status","Actions"]}
            rows={filtered.map(c=>[
              <span style={{ color:C.amber, fontWeight:700, whiteSpace:"nowrap" }}>{c.id}</span>,
              <Badge label={c.type} color={c.type==="Irregular"?"red":c.type==="Unauthorised"?"blue":"amber"}/>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.department||"—"}</span>,
              <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.description}>{c.description||"—"}</span>,
              <span style={{ color:C.red, fontWeight:700, whiteSpace:"nowrap" }}>R{(Number(c.amount)||0).toLocaleString()}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{c.dateIdentified||"—"}</span>,
              <StatusBadge status={c.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...c })} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                  Edit
                </button>
                <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>
                  Delete
                </button>
              </div>,
            ])}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No cases match your search.</p>}
        </Card>
      )}
    </div>
  );
}

// ─── FRAUD & ETHICS ADMIN ─────────────────────────────────────────────────────
const EMPTY_FRAUD = {
  id:"", category:"Procurement Fraud", description:"", amount:"",
  status:"Open", reported:"", source:"Hotline", responsiblePerson:"",
  investigator:"", resolutionDate:"", outcome:"", referredTo:"",
};

function FraudForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_FRAUD, ...initial, amount:initial.amount||"" });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.purple}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.purple, fontWeight:700, margin:"0 0 1.25rem" }}>
        {initial.id ? `Edit Case — ${initial.id}` : "Add New Fraud / Ethics Case"}
      </h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Case ID"  value={f.id}       onChange={set("id")}       required placeholder="FC-004" />
        <FSelect label="Category" value={f.category} onChange={set("category")} required
          options={["Procurement Fraud","Misappropriation","Conflict of Interest","Bribery & Corruption","Financial Misconduct","Dishonesty","Ethics Violation","Other"]} />
        <FSelect label="Source"   value={f.source}   onChange={set("source")}
          options={["Hotline","Internal","Disclosure","External Tip","Audit Finding","Management","Anonymous"]} />
      </div>
      <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the fraud or ethics case…" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <div style={{ marginBottom:"0.85rem" }}>
          <label style={labelSt}>Financial Loss (R)</label>
          <input type="number" value={f.amount} onChange={e=>set("amount")(e.target.value)} placeholder="0 if no financial loss" style={inputSt} />
          {Number(f.amount) > 0 && <div style={{ color:C.red, fontSize:"0.75rem", marginTop:3 }}>= R{Number(f.amount).toLocaleString()}</div>}
        </div>
        <FInput  label="Date Reported" value={f.reported} onChange={set("reported")} type="date" />
        <FSelect label="Status" value={f.status} onChange={set("status")} required
          options={["Open","Under Investigation","Disciplinary Action","Resolved","Closed","Referred to NPA","Written Off"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Responsible Person" value={f.responsiblePerson} onChange={set("responsiblePerson")} placeholder="Name of implicated person" />
        <FInput label="Investigator"       value={f.investigator}      onChange={set("investigator")}      placeholder="e.g. Internal Audit / SAPS" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Referred To"     value={f.referredTo}     onChange={set("referredTo")}     placeholder="e.g. NPA, DPCI, Internal Disciplinary" />
        <FInput label="Resolution Date" value={f.resolutionDate} onChange={set("resolutionDate")} type="date" />
      </div>
      <FTextarea label="Outcome / Resolution" value={f.outcome} onChange={set("outcome")} rows={2} placeholder="Describe the outcome or current resolution status…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving ? "Saving…" : initial.id ? "Update Case" : "Add Case"}
        </button>
        <button onClick={onCancel}
          style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function FraudEthicsAdmin() {
  const [cases, setCases]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const fraud = data.fraudEthics?.cases || data.fraudCases || [];
      setCases(fraud.length > 0 ? fraud : STATIC_FRAUD);
    } catch { setCases(STATIC_FRAUD); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.description) { showToast("Case ID and Description are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.fraudEthics) data.fraudEthics = { cases:[] };
      if (!data.fraudEthics.cases) data.fraudEthics.cases = [];
      const body   = { ...f, amount:Number(f.amount)||0 };
      const isEdit = mode?.id;
      const idx    = data.fraudEthics.cases.findIndex(c => c.id === f.id);
      if (isEdit && idx >= 0) {
        data.fraudEthics.cases[idx] = { ...data.fraudEthics.cases[idx], ...body, updatedAt:new Date().toISOString() };
      } else {
        data.fraudEthics.cases.push({ ...body, createdAt:new Date().toISOString() });
      }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.fraudEthics?.cases) data.fraudEthics.cases = data.fraudEthics.cases.filter(c => c.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = cases.filter(c =>
    (c.description||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.category||"").toLowerCase().includes(search.toLowerCase())
  );

  const totalLoss = cases.reduce((s,c)=>s+(Number(c.amount)||0),0);
  const openCases = cases.filter(c=>!["Resolved","Closed","Written Off"].includes(c.status)).length;

  return (
    <div>
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(163,113,247,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.purple:C.red}`,
          color:toast.type==="ok"?C.purple:C.red, fontWeight:600, fontSize:"0.88rem" }}>
          {toast.msg}
        </div>
      )}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Case</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving}
                style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
                {saving?"Deleting…":"Yes, Delete"}
              </button>
              <button onClick={()=>setConfirmDel(null)}
                style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Fraud & Ethics Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{cases.length} cases · changes save directly to the server</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cases…" style={{ ...inputSt, width:200 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode}
            style={{ padding:"0.6rem 1.25rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>
            + Add Case
          </button>
          <button onClick={load}
            style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>
            ↻ Refresh
          </button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem", marginBottom:"1.25rem" }}>
        {[
          ["Total Cases",       cases.length,                                                         C.purple],
          ["Open / Active",     openCases,                                                            C.red   ],
          ["Resolved / Closed", cases.filter(c=>["Resolved","Closed"].includes(c.status)).length,    C.green ],
          ["Total Loss",        totalLoss>0?`R${(totalLoss/1e6).toFixed(2)}M`:"R0",                  C.red   ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.4rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>
      {mode==="add"         && <FraudForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FraudForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading cases from server…</div>
      ) : (
        <Card>
          <Table
            headers={["ID","Category","Description","Amount","Source","Reported","Status","Actions"]}
            rows={filtered.map(c=>[
              <span style={{ color:C.purple, fontWeight:700, whiteSpace:"nowrap" }}>{c.id}</span>,
              <Badge label={c.category} color="blue"/>,
              <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.description}>{c.description||"—"}</span>,
              <span style={{ color:Number(c.amount)>0?C.red:C.muted, fontWeight:Number(c.amount)>0?700:400 }}>
                {Number(c.amount)>0?`R${Number(c.amount).toLocaleString()}`:"—"}
              </span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.source||"—"}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{c.reported||"—"}</span>,
              <StatusBadge status={c.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...c })} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode}
                  style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
          {filtered.length===0 && <p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>No cases match your search.</p>}
        </Card>
      )}
    </div>
  );
}


// ─── DEPARTMENTAL RISKS ADMIN ─────────────────────────────────────────────────
const EMPTY_DEPT = {
  id:"", name:"", risks:"", critical:"", treatment:"", uifw:"",
  riskOwner:"", department:"", notes:"",
};

function DeptForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_DEPT, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.name ? `Edit — ${initial.name}` : "Add Department"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Department Name" value={f.name}       onChange={set("name")}       required placeholder="e.g. Finance" />
        <FInput label="Risk Owner"      value={f.riskOwner}  onChange={set("riskOwner")}  placeholder="e.g. CFO" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Total Risks"      value={f.risks}     onChange={set("risks")}     type="number" placeholder="8" />
        <FInput label="Critical Risks"   value={f.critical}  onChange={set("critical")}  type="number" placeholder="2" />
        <FInput label="Treatment % "     value={f.treatment} onChange={set("treatment")} type="number" placeholder="75" />
        <FInput label="UIFW Exposure (R)"value={f.uifw}      onChange={set("uifw")}      type="number" placeholder="0" />
      </div>
      <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Any additional notes…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.name?"Update Department":"Add Department"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function DepartmentalRisksAdmin() {
  const [depts, setDepts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const d = data.departmentalRisks || data.departments || [];
      setDepts(d.length > 0 ? d : STATIC_DEPTS);
    } catch { setDepts(STATIC_DEPTS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.name) { showToast("Department Name is required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.departmentalRisks) data.departmentalRisks = [];
      const body = { ...f, risks:Number(f.risks)||0, critical:Number(f.critical)||0, treatment:Number(f.treatment)||0, uifw:Number(f.uifw)||0 };
      const isEdit = mode?.name;
      const idx    = data.departmentalRisks.findIndex(d => d.name === f.name);
      if (isEdit && idx >= 0) { data.departmentalRisks[idx] = { ...data.departmentalRisks[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.departmentalRisks.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.name} updated.` : `✅ ${f.name} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(name) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.departmentalRisks) data.departmentalRisks = data.departmentalRisks.filter(d => d.name !== name);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${name} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Department</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Departmental Risks — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{depts.length} departments</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add Department</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <DeptForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <DeptForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["Department","Risk Owner","Total Risks","Critical","Treatment %","UIFW Exposure","Actions"]}
            rows={depts.map(d=>[
              <span style={{ color:C.text, fontWeight:700 }}>{d.name}</span>,
              d.riskOwner||"—",
              <span style={{ color:C.blue, fontWeight:700 }}>{d.risks||0}</span>,
              <span style={{ color:C.red, fontWeight:700 }}>{d.critical||0}</span>,
              <div style={{ minWidth:120 }}>
                <div style={{ color:Number(d.treatment)>=80?C.green:Number(d.treatment)>=60?C.amber:C.red, fontSize:"0.78rem", fontWeight:700, marginBottom:3 }}>{d.treatment||0}%</div>
                <ProgressBar value={Number(d.treatment)||0} color={Number(d.treatment)>=80?C.green:Number(d.treatment)>=60?C.amber:C.red}/>
              </div>,
              <span style={{ color:Number(d.uifw)>0?C.red:C.muted, fontWeight:Number(d.uifw)>0?700:400 }}>{Number(d.uifw)>0?`R${Number(d.uifw).toLocaleString()}`:"—"}</span>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...d })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(d.name)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── OPERATIONAL RISK ADMIN ───────────────────────────────────────────────────
const EMPTY_OPRISK = {
  id:"", portfolio:"CFO Office", unit:"", name:"",
  inherent:"", residual:"", current:"", target:"",
  appetite:"Medium", trend:"Stable", owner:"", description:"",
};

function OperationalRiskForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_OPRISK, ...initial });
  const set = k => v => setF(p=>{
    const next = { ...p, [k]:v };
    // When portfolio changes, reset unit to that portfolio's first unit
    if (k==="portfolio") {
      const port = STATIC_PORTFOLIOS.find(x=>x.name===v);
      next.unit = port ? port.units[0] : "";
    }
    return next;
  });
  const units = (STATIC_PORTFOLIOS.find(x=>x.name===f.portfolio)?.units) || [];
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.id}` : "Add Operational Risk"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Risk ID" value={f.id} onChange={set("id")} required placeholder="OR-021" />
        <FSelect label="Portfolio" value={f.portfolio} onChange={set("portfolio")} options={STATIC_PORTFOLIOS.map(p=>p.name)} />
        <FSelect label="Unit" value={f.unit} onChange={set("unit")} options={units.length?units:["—"]} />
      </div>
      <FInput label="Risk Name" value={f.name} onChange={set("name")} required placeholder="e.g. Irregular procurement / non-compliant bids" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput label="Inherent (1-25)" value={f.inherent} onChange={set("inherent")} type="number" placeholder="20" />
        <FInput label="Residual (1-25)" value={f.residual} onChange={set("residual")} type="number" placeholder="15" />
        <FInput label="Current (1-25)"  value={f.current}  onChange={set("current")}  type="number" placeholder="15" />
        <FInput label="Target (1-25)"   value={f.target}   onChange={set("target")}   type="number" placeholder="8" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Appetite" value={f.appetite} onChange={set("appetite")} options={["Zero","Low","Medium","High"]} />
        <FSelect label="Trend"    value={f.trend}    onChange={set("trend")}    options={["Improving","Stable","Declining"]} />
        <FInput  label="Owner"    value={f.owner}    onChange={set("owner")}    placeholder="e.g. SCM Manager" />
      </div>
      <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the operational risk…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Risk":"Add Risk"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function OperationalRiskAdmin() {
  const [risks, setRisks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/oprisks`);
      const d = await res.json();
      setRisks(Array.isArray(d) && d.length ? d : STATIC_OPRISKS);
    } catch { setRisks(STATIC_OPRISKS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id)   { showToast("Risk ID is required.", "err"); return; }
    if (!f.name) { showToast("Risk Name is required.", "err"); return; }
    setSaving(true);
    const isEdit = !!mode?.id;
    const body = {
      ...f,
      inherent:Number(f.inherent)||0, residual:Number(f.residual)||0,
      current:Number(f.current)||0,   target:Number(f.target)||0,
    };
    try {
      const res = await fetch(`${API}/api/oprisks${isEdit?`/${encodeURIComponent(f.id)}`:""}`, {
        method: isEdit ? "PUT" : "POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      await logAudit({ module:"Operational Risks", action:isEdit?"Edit":"Add", recordId:f.id,
        description:`${isEdit?"Updated":"Added"} operational risk ${f.id} — ${f.name} (${f.portfolio}/${f.unit})`, after:body });
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/oprisks/${encodeURIComponent(id)}`, { method:"DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await logAudit({ module:"Operational Risks", action:"Delete", recordId:id, description:`Deleted operational risk ${id}` });
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const sc = v => Number(v)>=15?C.red:Number(v)>=10?"#e36209":Number(v)>=6?C.amber:C.green;

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Operational Risk</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Operational Risks — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{risks.length} operational risks across {STATIC_PORTFOLIOS.length} portfolios</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add Operational Risk</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <OperationalRiskForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <OperationalRiskForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["Risk ID","Name","Portfolio / Unit","Inh.","Res.","Cur.","Tgt.","Trend","Actions"]}
            rows={risks.map(r=>[
              <span style={{ color:C.blue, fontWeight:700 }}>{r.id}</span>,
              <span style={{ color:C.text, maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.name}>{r.name}</span>,
              <span style={{ color:C.muted, fontSize:"0.76rem" }}>{r.portfolio} / {r.unit}</span>,
              <span style={{ color:sc(r.inherent), fontWeight:700 }}>{r.inherent}</span>,
              <span style={{ color:sc(r.residual), fontWeight:700 }}>{r.residual}</span>,
              <span style={{ color:sc(r.current), fontWeight:700 }}>{r.current}</span>,
              <span style={{ color:C.green, fontWeight:700 }}>{r.target}</span>,
              <span style={{ color:r.trend==="Improving"?C.green:r.trend==="Declining"?C.red:C.muted, fontSize:"0.78rem" }}>{r.trend}</span>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...r })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(r.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── THIRD-PARTY RISK ADMIN ───────────────────────────────────────────────────
const EMPTY_TP = {
  id:"", name:"", type:"ICT", risk:"Medium", contract:"", score:"",
  status:"Active", contactPerson:"", reviewDate:"", notes:"",
};

function ThirdPartyForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_TP, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.name}` : "Add Third Party"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput  label="ID"   value={f.id}   onChange={set("id")}   required placeholder="TP-007" />
        <FInput  label="Name" value={f.name} onChange={set("name")} required placeholder="e.g. Acme Technology" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Type"   value={f.type}   onChange={set("type")}
          options={["ICT","Auditor","Training","Facilities","Banking","Security","Legal","Consulting","Other"]} />
        <FSelect label="Risk"   value={f.risk}   onChange={set("risk")}
          options={["Low","Medium","High","Critical"]} />
        <FSelect label="Status" value={f.status} onChange={set("status")}
          options={["Active","Review","Suspended","Terminated","Pending"]} />
        <FInput  label="Score (0-100)" value={f.score} onChange={set("score")} type="number" placeholder="85" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Contract End Date" value={f.contract}     onChange={set("contract")}     type="date" />
        <FInput label="Review Date"       value={f.reviewDate}   onChange={set("reviewDate")}   type="date" />
      </div>
      <FInput label="Contact Person" value={f.contactPerson} onChange={set("contactPerson")} placeholder="Primary contact at the third party" />
      <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Any additional risk notes…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Third Party":"Add Third Party"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function ThirdPartyRiskAdmin() {
  const [parties, setParties]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [search, setSearch]     = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const tp = data.thirdPartyRisk || data.thirdParties || [];
      setParties(tp.length > 0 ? tp : STATIC_THIRD);
    } catch { setParties(STATIC_THIRD); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.name) { showToast("ID and Name are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.thirdPartyRisk) data.thirdPartyRisk = [];
      const body = { ...f, score:Number(f.score)||0 };
      const isEdit = mode?.id;
      const idx    = data.thirdPartyRisk.findIndex(t => t.id === f.id);
      if (isEdit && idx >= 0) { data.thirdPartyRisk[idx] = { ...data.thirdPartyRisk[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.thirdPartyRisk.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.name} updated.` : `✅ ${f.name} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.thirdPartyRisk) data.thirdPartyRisk = data.thirdPartyRisk.filter(t => t.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const filtered = parties.filter(p =>
    (p.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.id||"").toLowerCase().includes(search.toLowerCase()) ||
    (p.type||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(57,211,83,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.cyan:C.red}`, color:toast.type==="ok"?C.cyan:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Third Party</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Third-Party Risk Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{parties.length} third parties · {parties.filter(p=>p.risk==="High"||p.risk==="Critical").length} high/critical risk</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ ...inputSt, width:180 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻</button>
        </div>
      </div>
      {mode==="add"         && <ThirdPartyForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <ThirdPartyForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Name","Type","Risk","Score","Contract End","Status","Actions"]}
            rows={filtered.map(p=>[
              <span style={{ color:C.cyan, fontWeight:700 }}>{p.id}</span>,
              <span style={{ fontWeight:600 }}>{p.name}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{p.type}</span>,
              <Badge label={p.risk} color={p.risk==="High"||p.risk==="Critical"?"red":p.risk==="Medium"?"amber":"green"}/>,
              <span style={{ color:Number(p.score)>=80?C.green:Number(p.score)>=65?C.amber:C.red, fontWeight:700 }}>{p.score||"—"}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{p.contract||"Ongoing"}</span>,
              <StatusBadge status={p.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── OPPORTUNITIES ADMIN ──────────────────────────────────────────────────────
const EMPTY_OPP_FORM = {
  id:"", name:"", benefit:"", score:"", status:"Proposed", owner:"",
  horizon:"", category:"Strategic", notes:"",
};

function OpportunityForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_OPP_FORM, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.id}` : "Add Opportunity"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="ID"   value={f.id}   onChange={set("id")}   required placeholder="OPP-006" />
        <FInput label="Name" value={f.name} onChange={set("name")} required placeholder="Opportunity name" />
      </div>
      <FTextarea label="Benefit / Value" value={f.benefit} onChange={set("benefit")} rows={2} placeholder="Describe the strategic benefit…" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Opportunity Score" value={f.score}   onChange={set("score")}   type="number" placeholder="15" />
        <FSelect label="Status"            value={f.status}  onChange={set("status")}  options={["Proposed","Active","Under Review","Approved","Closed"]} />
        <FInput  label="Owner"             value={f.owner}   onChange={set("owner")}   placeholder="e.g. CEO" />
        <FSelect label="Category"          value={f.category}onChange={set("category")}options={["Strategic","Financial","Operational","Technology","Stakeholder","Skills Development"]} />
      </div>
      <FInput label="Time Horizon" value={f.horizon} onChange={set("horizon")} placeholder="e.g. 6-12 months" />
      <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Additional notes…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Opportunity":"Add Opportunity"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function OpportunitiesAdmin() {
  const [opps, setOpps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/opportunities`);
      const data = await res.json();
      setOpps(Array.isArray(data) && data.length > 0 ? data : STATIC_OPP);
    } catch { setOpps(STATIC_OPP); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.name) { showToast("ID and Name are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.opportunityRisks) data.opportunityRisks = [];
      const body = { ...f, score:Number(f.score)||0 };
      const isEdit = mode?.id;
      const idx    = data.opportunityRisks.findIndex(o => o.id === f.id);
      if (isEdit && idx >= 0) { data.opportunityRisks[idx] = { ...data.opportunityRisks[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.opportunityRisks.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.opportunityRisks) data.opportunityRisks = data.opportunityRisks.filter(o => o.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(57,211,83,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.cyan:C.red}`, color:toast.type==="ok"?C.cyan:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Opportunity</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Opportunities Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{opps.length} opportunities · {opps.filter(o=>o.status==="Active").length} active</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <OpportunityForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <OpportunityForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Name","Category","Score","Owner","Status","Actions"]}
            rows={opps.map(o=>[
              <span style={{ color:C.cyan, fontWeight:700 }}>{o.id}</span>,
              <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={o.name}>{o.name}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{o.category||"—"}</span>,
              <span style={{ color:C.amber, fontWeight:700 }}>{o.score||"—"}</span>,
              o.owner||"—",
              <StatusBadge status={o.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...o })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(o.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── EMERGING RISKS ADMIN ─────────────────────────────────────────────────────
const EMPTY_ER = {
  id:"", name:"", category:"Technology", likelihood:"3", impact:"3",
  horizon:"12-24 months", action:"Monitor", description:"", owner:"",
};

function EmergingRiskForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_ER, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.amber}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.amber, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.id}` : "Add Emerging Risk"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="ID"   value={f.id}   onChange={set("id")}   required placeholder="ER-006" />
        <FInput label="Name" value={f.name} onChange={set("name")} required placeholder="Emerging risk name" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FSelect label="Category"   value={f.category}   onChange={set("category")}
          options={["Technology","Economic","Regulatory","Environment","Social","Political","Health","Other"]} />
        <FSelect label="Likelihood (1-5)" value={String(f.likelihood)} onChange={set("likelihood")}
          options={["1","2","3","4","5"]} />
        <FSelect label="Impact (1-5)"     value={String(f.impact)}     onChange={set("impact")}
          options={["1","2","3","4","5"]} />
        <FSelect label="Action"           value={f.action}             onChange={set("action")}
          options={["Monitor","Watch","Escalate","Mitigate","Accept"]} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
        <FInput label="Time Horizon" value={f.horizon} onChange={set("horizon")} placeholder="e.g. 12-24 months" />
        <FInput label="Owner"        value={f.owner}   onChange={set("owner")}   placeholder="e.g. CRO" />
      </div>
      <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the emerging risk…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.amber, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Risk":"Add Risk"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function EmergingRisksAdmin() {
  const [risks, setRisks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const er = data.emergingRisks || [];
      setRisks(er.length > 0 ? er : STATIC_EMERGING);
    } catch { setRisks(STATIC_EMERGING); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.name) { showToast("ID and Name are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.emergingRisks) data.emergingRisks = [];
      const body = { ...f, likelihood:Number(f.likelihood)||3, impact:Number(f.impact)||3 };
      const isEdit = mode?.id;
      const idx    = data.emergingRisks.findIndex(r => r.id === f.id);
      if (isEdit && idx >= 0) { data.emergingRisks[idx] = { ...data.emergingRisks[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.emergingRisks.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.emergingRisks) data.emergingRisks = data.emergingRisks.filter(r => r.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(227,179,65,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.amber:C.red}`, color:toast.type==="ok"?C.amber:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Emerging Risk</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Emerging Risks — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{risks.length} emerging risks · {risks.filter(r=>r.action==="Escalate").length} escalated</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.amber, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <EmergingRiskForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <EmergingRiskForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Name","Category","Likelihood","Impact","Score","Horizon","Action","Actions"]}
            rows={risks.map(r=>{
              const score = (Number(r.likelihood)||0) * (Number(r.impact)||0);
              return [
                <span style={{ color:C.amber, fontWeight:700 }}>{r.id}</span>,
                <span style={{ maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.name}>{r.name}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.category}</span>,
                <span style={{ color:C.amber, fontWeight:700 }}>{r.likelihood}/5</span>,
                <span style={{ color:C.red, fontWeight:700 }}>{r.impact}/5</span>,
                <span style={{ color:score>=15?C.red:score>=9?C.amber:C.green, fontWeight:800 }}>{score}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{r.horizon}</span>,
                <Badge label={r.action} color={r.action==="Escalate"?"red":r.action==="Mitigate"?"amber":"blue"}/>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...r })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(r.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}

// ─── APP ALIGNMENT ADMIN ──────────────────────────────────────────────────────
const EMPTY_APP_ITEM = {
  ref:"", objective:"", target:"", actual:"", status:"In Progress", quarter:"Q2",
};

function APPItemForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_APP_ITEM, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.ref ? `Edit — ${initial.ref}` : "Add APP Item"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
        <FInput label="APP Ref"    value={f.ref}       onChange={set("ref")}       required placeholder="APP 1.1" />
        <FInput label="Objective"  value={f.objective} onChange={set("objective")} required placeholder="Performance objective description" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Target (%)"  value={f.target} onChange={set("target")} type="number" placeholder="95" />
        <FInput  label="Actual (%)"  value={f.actual} onChange={set("actual")} type="number" placeholder="88" />
        <FSelect label="Quarter"     value={f.quarter} onChange={set("quarter")} options={["Q1","Q2","Q3","Q4"]} />
        <FSelect label="Status"      value={f.status}  onChange={set("status")}
          options={["On Track","In Progress","Behind","Not Started","Complete"]} />
      </div>
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.ref?"Update Item":"Add Item"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function APPAlignmentAdmin() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [mode, setMode]         = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      const ap = data.appAlignment || data.annualPerformancePlan || [];
      setItems(ap.length > 0 ? ap : STATIC_APP);
    } catch { setItems(STATIC_APP); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.ref || !f.objective) { showToast("Ref and Objective are required.", "err"); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (!data.appAlignment) data.appAlignment = [];
      const body = { ...f, target:Number(f.target)||0, actual:Number(f.actual)||0 };
      const isEdit = mode?.ref;
      const idx    = data.appAlignment.findIndex(a => a.ref === f.ref);
      if (isEdit && idx >= 0) { data.appAlignment[idx] = { ...data.appAlignment[idx], ...body, updatedAt:new Date().toISOString() }; }
      else { data.appAlignment.push({ ...body, createdAt:new Date().toISOString() }); }
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to save");
      showToast(isEdit ? `✅ ${f.ref} updated.` : `✅ ${f.ref} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(ref) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.appAlignment) data.appAlignment = data.appAlignment.filter(a => a.ref !== ref);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${ref} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete APP Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>APP Alignment — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items · {items.filter(a=>a.status==="On Track"||a.status==="Complete").length} on track</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add Item</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <APPItemForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <APPItemForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["Ref","Objective","Target","Actual","Progress","Quarter","Status","Actions"]}
            rows={items.map(a=>[
              <span style={{ color:C.blue, fontWeight:700, whiteSpace:"nowrap" }}>{a.ref}</span>,
              <span style={{ maxWidth:220, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.objective}>{a.objective}</span>,
              `${a.target}%`,
              <span style={{ color:Number(a.actual)>=Number(a.target)?C.green:C.red, fontWeight:700 }}>{a.actual}%</span>,
              <div style={{ minWidth:100 }}>
                <ProgressBar value={Number(a.actual)||0} max={Number(a.target)||100} color={Number(a.actual)>=Number(a.target)?C.green:C.red}/>
              </div>,
              <Badge label={a.quarter} color="blue"/>,
              <StatusBadge status={a.status}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...a })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(a.ref)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── BCM RESILIENCE ADMIN ─────────────────────────────────────────────────────
const EMPTY_INCIDENT = {
  id:"", title:"", date:"", type:"ICT System Outage", affectedUnit:"",
  severity:"Medium", duration:"", rtoBreached:"No", rpoBreached:"No",
  impact:"", actionsTaken:"", lessonsLearned:"", status:"Open",
};

function BCMIncidentForm({ initial={}, onSave, onCancel, saving }) {
  const [f, setF] = useState({ ...EMPTY_INCIDENT, ...initial });
  const set = k => v => setF(p=>({ ...p, [k]:v }));
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.green}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
      <h3 style={{ color:C.green, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id ? `Edit — ${initial.id}` : "Add BCM Incident"}</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
        <FInput label="Incident ID" value={f.id}    onChange={set("id")}    required placeholder="INC-004" />
        <FInput label="Title"       value={f.title} onChange={set("title")} required placeholder="Brief incident title" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Date"          value={f.date}         onChange={set("date")}         type="date" />
        <FSelect label="Type"          value={f.type}         onChange={set("type")}
          options={["ICT System Outage","Power Failure","Data Breach Attempt","Network Failure","Physical Security","Pandemic/Health","Natural Disaster","Supplier Failure","Other"]} />
        <FSelect label="Severity"      value={f.severity}     onChange={set("severity")}     options={["Low","Medium","High","Critical"]} />
        <FInput  label="Duration"      value={f.duration}     onChange={set("duration")}     placeholder="e.g. 4 hours" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
        <FInput  label="Affected Unit"  value={f.affectedUnit}  onChange={set("affectedUnit")}  placeholder="e.g. All Departments" />
        <FSelect label="RTO Breached"   value={f.rtoBreached}   onChange={set("rtoBreached")}   options={["No","Yes"]} />
        <FSelect label="RPO Breached"   value={f.rpoBreached}   onChange={set("rpoBreached")}   options={["No","Yes"]} />
        <FSelect label="Status"         value={f.status}        onChange={set("status")}        options={["Open","Contained","Resolved","Closed","Under Review"]} />
      </div>
      <FTextarea label="Impact Description" value={f.impact}        onChange={set("impact")}        rows={2} placeholder="Describe the business impact…" />
      <FTextarea label="Actions Taken"      value={f.actionsTaken}  onChange={set("actionsTaken")}  rows={2} placeholder="What was done to resolve the incident…" />
      <FTextarea label="Lessons Learned"    value={f.lessonsLearned}onChange={set("lessonsLearned")}rows={2} placeholder="Key learnings and recommendations…" />
      <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
        <button onClick={()=>onSave(f)} disabled={saving}
          style={{ padding:"0.65rem 1.75rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", opacity:saving?0.6:1 }}>
          {saving?"Saving…":initial.id?"Update Incident":"Log Incident"}
        </button>
        <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, fontWeight:600, fontSize:"0.9rem", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function BCMResilienceAdmin() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);
  const [mode, setMode]           = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/bcm/incidents`);
      const data = await res.json();
      setIncidents(Array.isArray(data) && data.length > 0 ? data : STATIC_BCM.incidents);
    } catch { setIncidents(STATIC_BCM.incidents); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function handleSave(f) {
    if (!f.id || !f.title) { showToast("Incident ID and Title are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      if (isEdit) {
        const res  = await fetch(`${API}/api/dashboard`);
        const data = await res.json();
        if (!data.bcmResilience) data.bcmResilience = { incidents:[] };
        if (!data.bcmResilience.incidents) data.bcmResilience.incidents = [];
        const idx = data.bcmResilience.incidents.findIndex(i => i.id === f.id);
        if (idx >= 0) { data.bcmResilience.incidents[idx] = { ...data.bcmResilience.incidents[idx], ...f, updatedAt:new Date().toISOString() }; }
        const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
        if (!saveRes.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch(`${API}/api/bcm/incidents`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(f) });
        if (!res.ok) throw new Error((await res.json()).message||"Failed to add");
      }
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} logged.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      if (data.bcmResilience?.incidents) data.bcmResilience.incidents = data.bcmResilience.incidents.filter(i => i.id !== id);
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to delete");
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Incident</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>BCM Incidents — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{incidents.length} incidents · {incidents.filter(i=>i.status==="Open").length} open</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Log Incident</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>
      {mode==="add"         && <BCMIncidentForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <BCMIncidentForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Title","Date","Type","Severity","Duration","RTO Breached","Status","Actions"]}
            rows={incidents.map(i=>[
              <span style={{ color:C.green, fontWeight:700, whiteSpace:"nowrap" }}>{i.id}</span>,
              <span style={{ maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={i.title||i.type}>{i.title||i.type}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", whiteSpace:"nowrap" }}>{i.date}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{i.type}</span>,
              <Badge label={i.severity||i.impact} color={i.severity==="Critical"||i.severity==="High"||i.impact==="High"?"red":i.severity==="Medium"||i.impact==="Medium"?"amber":"green"}/>,
              i.duration||"—",
              i.rtoBreached==="Yes"||i.rtoMet===false ? <Badge label="Yes" color="red"/> : <Badge label="No" color="green"/>,
              <StatusBadge status={i.status||i.resolution}/>,
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button onClick={()=>setMode({ ...i })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(i.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

const MODULE_OPTIONS = [
  { value:"strategic",    label:"Strategic Risks",    component: StrategicRisksAdmin },
  { value:"kri",          label:"KRI Monitoring",     component: KRIMonitoringAdmin },
  { value:"treatment",    label:"Treatment Actions",  component: TreatmentActionsAdmin },
  { value:"uifw",         label:"UIFW Expenditure",   component: UIFWAdmin },
  { value:"fraud",        label:"Fraud & Ethics",     component: FraudEthicsAdmin },
  { value:"departmental", label:"Departmental Risks", component: DepartmentalRisksAdmin },
  { value:"oprisks",      label:"Operational Risks",  component: OperationalRiskAdmin },
  { value:"thirdparty",   label:"Third-Party Risk",   component: ThirdPartyRiskAdmin },
  { value:"opportunities",label:"Opportunities",      component: OpportunitiesAdmin },
  { value:"emerging",     label:"Emerging Risks",     component: EmergingRisksAdmin },
  { value:"app",          label:"APP Alignment",      component: APPAlignmentAdmin },
  { value:"bcm",          label:"BCM Resilience",     component: BCMResilienceAdmin },
  { value:"compliance",   label:"Compliance",         component: ComplianceAdmin },
  { value:"iam",          label:"Identity & Access",    component: IAMAdmin },
  { value:"internalaudit", label:"Internal Audit",       component: InternalAuditAdmin },
  { value:"policy",       label:"Policy & Process",     component: PolicyAdmin },
  { value:"projects",     label:"Projects & Contracts",component: ProjectsAdmin },
  { value:"declarations", label:"Declarations",         component: DeclarationsAdmin },
];

function UploadSection() {
  const [module, setModule]     = useState("risks");
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState({ msg:"", type:"" });
  const [dragging, setDragging] = useState(false);

  function pickFile(f) {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) { setStatus({ msg:"Only .xlsx or .xls files accepted.", type:"err" }); return; }
    setFile(f); setStatus({ msg:"", type:"" });
  }

  async function handleUpload() {
    if (!file) { setStatus({ msg:"Please select an Excel file first.", type:"err" }); return; }
    setStatus({ msg:"Uploading — please wait…", type:"loading" });
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch(`${API}/api/upload/${module}`, { method:"POST", body:form });
      const data = await res.json();
      if (res.ok) { setStatus({ msg:`✅ ${data.message} (added: ${data.added}, updated: ${data.updated})`, type:"ok" }); setFile(null); }
      else          { setStatus({ msg:`❌ ${data.message||"Upload failed"}`, type:"err" }); }
    } catch(e)   { setStatus({ msg:`❌ Network error: ${e.message}`, type:"err" }); }
  }

  const borderColor = dragging?C.blue:file?C.green:C.border;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.75rem 2rem" }}>
      <h3 style={{ color:C.text, margin:"0 0 0.35rem", fontWeight:700 }}>Upload Excel data</h3>
      <p style={{ color:C.muted, fontSize:"0.88rem", marginBottom:"1.4rem" }}>
        Choose the target module, upload your <code style={{ color:C.blue }}>.xlsx</code> file. Download templates from{" "}
        <a href={`${API}/api/templates/risks`} style={{ color:C.blue }} target="_blank" rel="noreferrer">here</a>.
      </p>
      <div style={{ marginBottom:"1.1rem" }}>
        <label style={{ ...labelSt, display:"block", marginBottom:"0.4rem" }}>Target module</label>
        <select value={module} onChange={e=>setModule(e.target.value)} style={{ ...inputSt, maxWidth:360 }}>
          {[["risks","Strategic Risks"],["treatments","Treatment Actions"],["kris","KRI Monitoring"],["uifw","UIFW Expenditure"],["incidents","BCM Incidents"]].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);pickFile(e.dataTransfer.files[0])}}
        onClick={()=>document.getElementById("admin-file-inp").click()}
        style={{ border:`2px dashed ${borderColor}`, borderRadius:10, padding:"2rem", textAlign:"center",
          cursor:"pointer", marginBottom:"1.2rem", transition:"all 0.15s",
          background:dragging?"rgba(88,166,255,0.05)":file?"rgba(63,185,80,0.05)":"transparent" }}>
        <input id="admin-file-inp" type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e=>pickFile(e.target.files[0])}/>
        <div style={{ fontSize:"2rem", marginBottom:"0.4rem" }}>{file?"📄":"📂"}</div>
        {file
          ? <><div style={{ color:C.green, fontWeight:700 }}>{file.name}</div><div style={{ color:C.muted, fontSize:"0.78rem" }}>{(file.size/1024).toFixed(1)} KB · click to change</div></>
          : <div style={{ color:C.muted, fontSize:"0.88rem" }}>Drag & drop your .xlsx here, or click to browse</div>}
      </div>
      <button onClick={handleUpload} disabled={status.type==="loading"}
        style={{ padding:"0.65rem 2rem", background:C.blue, color:"#fff", border:"none", borderRadius:8,
          fontSize:"0.9rem", fontWeight:700, cursor:"pointer", opacity:status.type==="loading"?0.6:1, marginBottom:"1rem" }}>
        {status.type==="loading"?"Uploading…":"Upload to server"}
      </button>
      {status.msg&&(
        <div style={{ padding:"0.6rem 0.9rem", borderRadius:6, fontSize:"0.88rem",
          background:status.type==="ok"?"rgba(63,185,80,0.1)":status.type==="err"?"rgba(248,81,73,0.1)":"rgba(88,166,255,0.1)",
          borderLeft:`4px solid ${status.type==="ok"?C.green:status.type==="err"?C.red:C.blue}`,
          color:status.type==="ok"?C.green:status.type==="err"?C.red:C.blue }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const [generating, setGenerating] = useState(null); // null | "excom"|"arc"|"board"
  const [toast, setToast]           = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 5000); }

  async function generateReport(type) {
    setGenerating(type);
    try {
      const res = await fetch(`${API}/api/reports/${type}`, { method:"POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message||"Generation failed");
      }
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      const date     = new Date().toISOString().slice(0,10);
      const labels   = { excom:"EXCOM", arc:"ARC", board:"Board" };
      a.href         = url;
      a.download     = `LGSETA_${labels[type]}_GRC_Report_${date}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`✅ ${labels[type]} report downloaded successfully!`);
    } catch(e) {
      showToast(`❌ ${e.message}`, "err");
    } finally {
      setGenerating(null);
    }
  }

  const reports = [
    {
      type:     "excom",
      label:    "EXCOM Report",
      audience: "Executive Committee",
      color:    C.blue,
      icon:     "🏛",
      sections: ["Executive Summary & KPIs","Top 10 Strategic Risks","Operational Risk Register","Treatment Action Status","UIFW Exposure Summary","Project & Contract Performance"],
      desc:     "High-level GRC overview for the Executive Committee. Focuses on key metrics, critical risks, action status and project/contract performance.",
    },
    {
      type:     "arc",
      label:    "ARC Report",
      audience: "Audit & Risk Committee",
      color:    C.amber,
      icon:     "⚖",
      sections: ["Executive Summary & KPIs","Top 10 Strategic Risks","Operational Risk Register","Treatment Action Status","UIFW Exposure","Fraud & Ethics Register","BCM Status","Compliance","Project & Contract Performance","Identity & Access Management","Policy & Process Manual","Internal Audit"],
      desc:     "Detailed GRC report for the Audit & Risk Committee. Includes fraud, BCM and full UIFW analysis.",
    },
    {
      type:     "board",
      label:    "Board Report",
      audience: "Board of Directors",
      color:    C.purple,
      icon:     "🎯",
      sections: ["Executive Summary & KPIs","Top 10 Strategic Risks","Operational Risk Register","Treatment Action Status","UIFW Exposure","Fraud & Ethics Register","BCM Status","APP Alignment","Compliance","Project & Contract Performance","Identity & Access Management","Policy & Process Manual","Internal Audit"],
      desc:     "Full GRC overview for the Board. All sections included with APP performance alignment.",
    },
  ];

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.5rem", borderRadius:8,
          background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)",
          border:`1px solid ${toast.type==="ok"?C.green:C.red}`,
          color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.9rem", maxWidth:400 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ color:C.text, fontSize:"1.4rem", fontWeight:700, margin:"0 0 0.2rem" }}>📄 Quarterly Report Generator</h2>
        <p style={{ color:C.muted, fontSize:"0.9rem", margin:0 }}>
          Generate Word (.docx) reports from live dashboard data. Reports include all current data from the server.
        </p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
        {reports.map(r => (
          <div key={r.type} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"1.5rem",
            borderLeft:`4px solid ${r.color}`, display:"flex", alignItems:"flex-start", gap:"1.5rem", flexWrap:"wrap" }}>

            {/* Icon + label */}
            <div style={{ minWidth:160 }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.3rem" }}>{r.icon}</div>
              <div style={{ color:r.color, fontWeight:800, fontSize:"1.1rem" }}>{r.label}</div>
              <div style={{ color:C.muted, fontSize:"0.78rem" }}>{r.audience}</div>
            </div>

            {/* Description + sections */}
            <div style={{ flex:1 }}>
              <p style={{ color:C.muted, fontSize:"0.85rem", margin:"0 0 0.75rem", lineHeight:1.6 }}>{r.desc}</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {r.sections.map(s => (
                  <span key={s} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
                    padding:"2px 8px", fontSize:"0.72rem", color:C.muted }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", alignItems:"flex-end", minWidth:160 }}>
              <button
                onClick={()=>generateReport(r.type)}
                disabled={!!generating}
                style={{ padding:"0.7rem 1.5rem", background:generating===r.type?C.surface:r.color,
                  color:generating===r.type?C.muted:"#fff", border:`1px solid ${r.color}`,
                  borderRadius:8, fontWeight:700, fontSize:"0.9rem", cursor:generating?"not-allowed":"pointer",
                  whiteSpace:"nowrap", transition:"all 0.15s", minWidth:160, textAlign:"center" }}>
                {generating===r.type ? "⏳ Generating…" : "⬇ Download .docx"}
              </button>
              {generating===r.type && (
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>Fetching live data…</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:"1.5rem", padding:"1rem 1.25rem", background:"rgba(88,166,255,0.08)",
        border:`1px solid rgba(88,166,255,0.2)`, borderRadius:8, fontSize:"0.83rem", color:C.blue, lineHeight:1.65 }}>
        <strong>How it works:</strong> Each report fetches live data from your Render server, builds a professionally
        formatted Word document with your LGSETA branding, and downloads it directly. Open in Microsoft Word or
        Google Docs, then share with your stakeholders.
      </div>
    </div>
  );
}

function AdminTab() {
  const [view, setView]       = useState("upload");   // "upload" | "edit" | "reports"
  const [editModule, setEditModule] = useState(null); // null | module value

  const chosen = MODULE_OPTIONS.find(m=>m.value===editModule);

  return (
    <div style={{ maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:"1.25rem" }}>
        <h2 style={{ color:C.text, fontSize:"1.4rem", fontWeight:700, margin:"0 0 0.2rem" }}>Admin Panel</h2>
        <p style={{ color:C.muted, fontSize:"0.9rem", margin:0 }}>Upload Excel data or edit records manually — changes save to the server instantly.</p>
      </div>

      {/* Sub-tab switcher */}
      <div style={{ display:"flex", borderBottom:`2px solid ${C.border}`, marginBottom:"1.5rem" }}>
        {[["upload","📤 Excel Upload"],["edit","✏️ Manual Edit"],["reports","📄 Reports"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setEditModule(null); }}
            style={{ padding:"0.55rem 1.4rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.88rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`3px solid ${C.blue}`:"3px solid transparent", marginBottom:-2 }}>
            {l}
          </button>
        ))}
      </div>

      {view==="upload"  && <UploadSection/>}
      {view==="reports" && <ReportsTab/>}

      {view==="edit" && !editModule && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"1.75rem 2rem" }}>
          <h3 style={{ color:C.text, margin:"0 0 0.35rem", fontWeight:700 }}>Select a module to edit</h3>
          <p style={{ color:C.muted, fontSize:"0.88rem", marginBottom:"1.4rem" }}>Click a module card to open its data entry form.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:"0.7rem" }}>
            {MODULE_OPTIONS.map(m=>(
              <button key={m.value} onClick={()=>setEditModule(m.value)}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.85rem 1rem",
                  background:C.surface, border:`1px solid ${m.component?C.blue:C.border}`,
                  borderRadius:8, cursor:"pointer", color:C.text, fontSize:"0.88rem", textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#1a2744"}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.surface}}>
                <span style={{ fontWeight:500 }}>{m.label}</span>
                <span style={{ color:m.component?C.blue:C.muted, fontSize:"0.75rem" }}>{m.component?"✏️ Ready":"🔜 Soon"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view==="edit" && editModule && (
        <div>
          <button onClick={()=>setEditModule(null)}
            style={{ display:"flex", alignItems:"center", gap:"0.4rem", background:"transparent", border:"none",
              color:C.muted, cursor:"pointer", fontSize:"0.85rem", marginBottom:"1rem", padding:0 }}>
            ← Back to module list
          </button>
          {chosen?.component
            ? <chosen.component/>
            : <Card><p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>Form for <strong style={{ color:C.text }}>{chosen?.label}</strong> is coming in the next build.</p></Card>
          }
        </div>
      )}
    </div>
  );
}


// ─── COMPLIANCE DATA ──────────────────────────────────────────────────────────
const STATIC_COMPLIANCE = {
  universe: [
    { id:"CU-001", legislation:"Public Finance Management Act (PFMA)", act:"Act 1 of 1999", category:"Financial", owner:"CFO", riskRating:"High", complianceStatus:"Partial", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:2, notes:"Section 38 & 51 requirements partially met" },
    { id:"CU-002", legislation:"Skills Development Levies Act (SDL)", act:"Act 9 of 1999", category:"Core Mandate", owner:"CEO", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:0, notes:"Levy collection and disbursement on track" },
    { id:"CU-003", legislation:"Skills Development Act (SDA)", act:"Act 97 of 1998", category:"Core Mandate", owner:"COO", riskRating:"High", complianceStatus:"Partial", lastReview:"2026-02-28", nextReview:"2026-08-31", findings:1, notes:"SETA functions per Section 10 — APP targets behind" },
    { id:"CU-004", legislation:"Protection of Personal Information Act (POPIA)", act:"Act 4 of 2013", category:"Data Protection", owner:"CIO", riskRating:"High", complianceStatus:"Partial", lastReview:"2026-04-15", nextReview:"2026-10-15", findings:3, notes:"Information Officer designated; PAIA manual outdated" },
    { id:"CU-005", legislation:"King IV Report on Corporate Governance", act:"King IV 2016", category:"Governance", owner:"CEO", riskRating:"Medium", complianceStatus:"Partial", lastReview:"2026-03-01", nextReview:"2026-09-01", findings:2, notes:"16 of 17 principles applied; Principle 13 in progress" },
    { id:"CU-006", legislation:"DHET Sector Skills Plan Directive", act:"DHET 2025/26", category:"Regulatory", owner:"COO", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-01-31", nextReview:"2026-07-31", findings:0, notes:"SSP submitted and approved by DHET" },
    { id:"CU-007", legislation:"Labour Relations Act (LRA)", act:"Act 66 of 1995", category:"Human Resources", owner:"HR Executive", riskRating:"Medium", complianceStatus:"Compliant", lastReview:"2026-02-15", nextReview:"2026-08-15", findings:0, notes:"Employment contracts and disciplinary procedures aligned" },
    { id:"CU-008", legislation:"Basic Conditions of Employment Act (BCEA)", act:"Act 75 of 1997", category:"Human Resources", owner:"HR Executive", riskRating:"Low", complianceStatus:"Compliant", lastReview:"2026-02-15", nextReview:"2026-08-15", findings:0, notes:"Leave policies and working hours compliant" },
    { id:"CU-009", legislation:"B-BBEE Act", act:"Act 53 of 2003", category:"Transformation", owner:"CEO", riskRating:"Medium", complianceStatus:"Compliant", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:0, notes:"Level 2 verification current" },
    { id:"CU-010", legislation:"Prevention & Combating of Corrupt Activities Act", act:"Act 12 of 2004", category:"Fraud & Ethics", owner:"Legal", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-03-01", nextReview:"2026-09-01", findings:0, notes:"Fraud prevention plan in place; hotline operational" },
    { id:"CU-011", legislation:"Promotion of Access to Information Act (PAIA)", act:"Act 2 of 2000", category:"Data Protection", owner:"Legal", riskRating:"Low", complianceStatus:"Non-Compliant", lastReview:"2025-12-31", nextReview:"2026-06-30", findings:1, notes:"PAIA manual overdue for update" },
    { id:"CU-012", legislation:"Public Audit Act", act:"Act 25 of 2004", category:"Governance", owner:"CFO", riskRating:"High", complianceStatus:"Compliant", lastReview:"2026-03-31", nextReview:"2026-09-30", findings:0, notes:"AGSA access and cooperation maintained" },
  ],
  calendar: [
    { id:"CC-001", obligation:"Annual Report submission to DHET", legislation:"SDL Act / PFMA", dueDate:"2026-07-31", owner:"CEO", status:"Upcoming", priority:"Critical", category:"Reporting", notes:"Full annual report including AFS" },
    { id:"CC-002", obligation:"Quarterly Performance Report Q2", legislation:"PFMA / APP", dueDate:"2026-07-15", owner:"COO", status:"Upcoming", priority:"High", category:"Reporting", notes:"Submit to DHET within 30 days of quarter end" },
    { id:"CC-003", obligation:"PAIA Manual Review & Update", legislation:"PAIA Act 2 of 2000", dueDate:"2026-06-30", owner:"Legal", status:"Overdue", priority:"High", category:"Regulatory", notes:"Manual not updated since 2024" },
    { id:"CC-004", obligation:"B-BBEE Verification Certificate Renewal", legislation:"B-BBEE Act", dueDate:"2026-09-30", owner:"CEO", status:"Upcoming", priority:"Medium", category:"Compliance", notes:"Current certificate expires September 2026" },
    { id:"CC-005", obligation:"POPIA Compliance Audit", legislation:"POPIA Act 4 of 2013", dueDate:"2026-08-31", owner:"CIO", status:"Upcoming", priority:"High", category:"Data Protection", notes:"Annual internal POPIA audit" },
    { id:"CC-006", obligation:"Tax Clearance Certificate Renewal", legislation:"SARS / PFMA", dueDate:"2026-07-31", owner:"CFO", status:"Upcoming", priority:"High", category:"Financial", notes:"Required for procurement above threshold" },
    { id:"CC-007", obligation:"Board Self-Assessment (King IV)", legislation:"King IV 2016", dueDate:"2026-09-30", owner:"CEO", status:"Upcoming", priority:"Medium", category:"Governance", notes:"Annual board effectiveness assessment" },
    { id:"CC-008", obligation:"Sector Skills Plan (SSP) Update", legislation:"SDL Act / SDA", dueDate:"2026-09-30", owner:"COO", status:"Upcoming", priority:"High", category:"Core Mandate", notes:"Annual SSP update submission to DHET" },
    { id:"CC-009", obligation:"Interim Financial Statements", legislation:"PFMA Section 55", dueDate:"2026-07-31", owner:"CFO", status:"Upcoming", priority:"Critical", category:"Financial", notes:"Six-month interim statements to National Treasury" },
    { id:"CC-010", obligation:"Employment Equity Report", legislation:"Employment Equity Act", dueDate:"2026-10-01", owner:"HR Executive", status:"Upcoming", priority:"Medium", category:"Human Resources", notes:"Annual EE report to Department of Labour" },
    { id:"CC-011", obligation:"Workplace Skills Plan (WSP) Submission", legislation:"SDL Act", dueDate:"2026-06-30", owner:"HR Executive", status:"Overdue", priority:"High", category:"Core Mandate", notes:"Annual WSP and ATR submission — currently overdue" },
    { id:"CC-012", obligation:"AGSA Engagement — Interim Audit", legislation:"PFMA / PAA", dueDate:"2026-08-15", owner:"CFO", status:"Upcoming", priority:"Critical", category:"Audit", notes:"Prepare for AGSA interim audit fieldwork" },
  ],
  monitoring: [
    { id:"CM-001", requirement:"PFMA Section 38 — Internal Controls", legislation:"PFMA", status:"Partial", evidence:"Internal audit reports", lastChecked:"2026-05-31", nextCheck:"2026-08-31", owner:"CFO", riskLevel:"High", actionRequired:"Strengthen SCM and payment controls" },
    { id:"CM-002", requirement:"PFMA Section 55 — Annual Report", legislation:"PFMA", status:"In Progress", evidence:"Draft annual report", lastChecked:"2026-06-01", nextCheck:"2026-07-31", owner:"CEO", riskLevel:"High", actionRequired:"Finalise AFS and performance report" },
    { id:"CM-003", requirement:"SDL Act — Levy Disbursement (mandatory grants)", legislation:"SDL Act", status:"Compliant", evidence:"Payment records", lastChecked:"2026-05-31", nextCheck:"2026-08-31", owner:"COO", riskLevel:"Low", actionRequired:"None — maintain current controls" },
    { id:"CM-004", requirement:"SDL Act — Discretionary Grant Allocation", legislation:"SDL Act", status:"Partial", evidence:"Grant agreements", lastChecked:"2026-05-31", nextCheck:"2026-08-31", owner:"COO", riskLevel:"Medium", actionRequired:"Accelerate DG commitments to meet 90% target" },
    { id:"CM-005", requirement:"POPIA — Information Officer Designation", legislation:"POPIA", status:"Compliant", evidence:"POPIA registration", lastChecked:"2026-04-30", nextCheck:"2026-10-31", owner:"CIO", riskLevel:"Low", actionRequired:"None" },
    { id:"CM-006", requirement:"POPIA — Privacy Notices & Consent", legislation:"POPIA", status:"Partial", evidence:"Website privacy policy", lastChecked:"2026-04-30", nextCheck:"2026-07-31", owner:"CIO", riskLevel:"High", actionRequired:"Update learner consent forms and supplier agreements" },
    { id:"CM-007", requirement:"King IV — Board Composition", legislation:"King IV", status:"Compliant", evidence:"Board charter", lastChecked:"2026-03-31", nextCheck:"2026-09-30", owner:"CEO", riskLevel:"Low", actionRequired:"None" },
    { id:"CM-008", requirement:"King IV — Risk Governance (Principle 11)", legislation:"King IV", status:"Compliant", evidence:"Risk committee TOR", lastChecked:"2026-03-31", nextCheck:"2026-09-30", owner:"CEO", riskLevel:"Low", actionRequired:"None" },
    { id:"CM-009", requirement:"DHET Directive — Quarterly Reporting", legislation:"DHET", status:"In Progress", evidence:"Q2 report draft", lastChecked:"2026-06-14", nextCheck:"2026-07-15", owner:"COO", riskLevel:"High", actionRequired:"Finalise Q2 report by 15 July" },
    { id:"CM-010", requirement:"LRA — Disciplinary Procedures", legislation:"LRA", status:"Compliant", evidence:"HR policy manual", lastChecked:"2026-02-28", nextCheck:"2026-08-31", owner:"HR Executive", riskLevel:"Low", actionRequired:"None" },
  ],
};

// ─── COMPLIANCE VIEW MODULE ───────────────────────────────────────────────────
function ComplianceModule() {
  const [sub, setSub]       = useState("universe");
  const [search, setSearch] = useState("");
  const [data, setData]     = useState(STATIC_COMPLIANCE);
  const [policyData, setPolicyData] = useState(STATIC_POLICY.policies);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.compliance) setData({ ...STATIC_COMPLIANCE, ...d.compliance });
      if (d.policyManual?.policies) setPolicyData(d.policyManual.policies);
    }).catch(()=>{});
  },[]);

  const univ = data.universe  || [];
  const cal  = data.calendar  || [];
  const mon  = data.monitoring || [];

  const compliant    = univ.filter(u=>u.complianceStatus==="Compliant").length;
  const nonCompliant = univ.filter(u=>u.complianceStatus==="Non-Compliant").length;
  const partial      = univ.filter(u=>u.complianceStatus==="Partial").length;
  const overdue      = cal.filter(c=>c.status==="Overdue").length;
  const totalFindings= univ.reduce((s,u)=>s+(Number(u.findings)||0),0);

  const sc = s => {
    const v=(s||"").toLowerCase();
    return v==="compliant"?C.green:v.includes("non")||v==="overdue"?C.red:v==="partial"||v.includes("progress")||v==="upcoming"?C.amber:C.muted;
  };

  const filtered = arr => arr.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Compliance Management</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Universe · Calendar · Monitoring — Q2 2026/27</p>
        </div>
        <input placeholder="Search compliance…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:220 }}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[["Total Laws",univ.length,C.blue],["Compliant",compliant,C.green],["Partial",partial,C.amber],
          ["Non-Compliant",nonCompliant,C.red],["Findings",totalFindings,totalFindings>0?C.red:C.green],["Overdue",overdue,overdue>0?C.red:C.green]
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[["universe","📋 Compliance Universe"],["calendar","📅 Compliance Calendar"],["monitoring","✅ Compliance Monitoring"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {sub==="universe" && (
        <Card>
          <Table
            headers={["ID","Legislation","Category","Owner","Risk","Status","Findings","Next Review","Linked Policies"]}
            rows={filtered(univ).map(u=>[
              <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
              <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{u.legislation}</div>
                <div style={{ color:C.muted, fontSize:"0.7rem" }}>{u.notes}</div></div>,
              <Badge label={u.category} color="blue"/>,
              u.owner,
              <Badge label={u.riskRating} color={u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
              <span style={{ color:sc(u.complianceStatus), fontWeight:700, fontSize:"0.8rem" }}>{u.complianceStatus}</span>,
              <span style={{ color:Number(u.findings)>0?C.red:C.green, fontWeight:700 }}>{u.findings}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{u.nextReview}</span>,
            ])}
          />
        </Card>
      )}

      {sub==="calendar" && (
        <Card>
          <Table
            headers={["ID","Obligation","Legislation","Due Date","Owner","Priority","Status"]}
            rows={filtered([...cal].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))).map(c=>{
              const isOverdue = c.status==="Overdue" || new Date(c.dueDate)<new Date();
              const days = Math.ceil((new Date(c.dueDate)-new Date())/(1000*60*60*24));
              return [
                <span style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{c.obligation}</div>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{c.notes}</div></div>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.legislation}</span>,
                <div>
                  <div style={{ color:isOverdue?C.red:days<=14?C.amber:C.text, fontWeight:700, fontSize:"0.82rem" }}>{c.dueDate}</div>
                  {!isOverdue&&<div style={{ color:days<=14?C.amber:C.muted, fontSize:"0.7rem" }}>{days} days left</div>}
                  {isOverdue && <div style={{ color:C.red, fontSize:"0.7rem", fontWeight:700 }}>OVERDUE</div>}
                </div>,
                c.owner,
                <Badge label={c.priority} color={c.priority==="Critical"?"red":c.priority==="High"?"amber":"blue"}/>,
                <span style={{ color:sc(c.status), fontWeight:700, fontSize:"0.8rem" }}>{c.status}</span>,
              ];
            })}
          />
        </Card>
      )}

      {sub==="monitoring" && (
        <Card>
          <Table
            headers={["ID","Requirement","Legislation","Owner","Risk","Status","Action Required","Next Check"]}
            rows={filtered(mon).map(m=>[
              <span style={{ color:C.green, fontWeight:700, fontSize:"0.75rem" }}>{m.id}</span>,
              <span style={{ color:C.text, fontWeight:600, fontSize:"0.82rem", maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.requirement}>{m.requirement}</span>,
              <Badge label={m.legislation} color="blue"/>,
              m.owner,
              <Badge label={m.riskLevel} color={m.riskLevel==="High"?"red":m.riskLevel==="Medium"?"amber":"green"}/>,
              <span style={{ color:sc(m.status), fontWeight:700, fontSize:"0.8rem" }}>{m.status}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem", maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.actionRequired}>{m.actionRequired}</span>,
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>{m.nextCheck}</span>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── COMPLIANCE ADMIN ─────────────────────────────────────────────────────────
function ComplianceAdmin() {
  const [view, setView]     = useState("universe");
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { universe:STATIC_COMPLIANCE.universe, calendar:STATIC_COMPLIANCE.calendar, monitoring:STATIC_COMPLIANCE.monitoring };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.compliance?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.compliance) data.compliance = {};
    data.compliance[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.compliance = {
        universe:   STATIC_COMPLIANCE.universe,
        calendar:   STATIC_COMPLIANCE.calendar,
        monitoring: STATIC_COMPLIANCE.monitoring,
      };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed data");
      await logAudit({ module:"Compliance", action:"Seed", description:`Seeded compliance demo data (${STATIC_COMPLIANCE.universe.length} legislation, ${STATIC_COMPLIANCE.calendar.length} calendar, ${STATIC_COMPLIANCE.monitoring.length} monitoring items)` });
      showToast(`✅ Seeded ${STATIC_COMPLIANCE.universe.length} legislation items, ${STATIC_COMPLIANCE.calendar.length} calendar items, ${STATIC_COMPLIANCE.monitoring.length} monitoring items to server.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  const idField = view==="calendar"?"id":view==="monitoring"?"id":"id";

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i => i.id !== id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function UniverseForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", legislation:"", act:"", category:"Financial", owner:"", riskRating:"Medium", complianceStatus:"Partial", lastReview:"", nextReview:"", findings:"0", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Legislation":"Add Legislation"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CU-013"/>
          <FInput label="Legislation Name" value={f.legislation} onChange={set("legislation")} required placeholder="e.g. Public Audit Act"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Act / Reference" value={f.act} onChange={set("act")} placeholder="e.g. Act 25 of 2004"/>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Financial","Core Mandate","Data Protection","Governance","Regulatory","Human Resources","Transformation","Fraud & Ethics"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CFO"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["High","Medium","Low"]}/>
          <FSelect label="Status" value={f.complianceStatus} onChange={set("complianceStatus")} options={["Compliant","Partial","Non-Compliant","Not Assessed"]}/>
          <FInput label="Findings" value={f.findings} onChange={set("findings")} type="number" placeholder="0"/>
          <FInput label="Next Review" value={f.nextReview} onChange={set("nextReview")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Key compliance notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function CalendarForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", obligation:"", legislation:"", dueDate:"", owner:"", status:"Upcoming", priority:"High", category:"Reporting", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.amber}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.amber, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Item":"Add Calendar Item"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CC-013"/>
          <FInput label="Obligation" value={f.obligation} onChange={set("obligation")} required placeholder="e.g. Annual financial statements"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Legislation" value={f.legislation} onChange={set("legislation")} placeholder="e.g. PFMA"/>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CFO"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Upcoming","In Progress","Overdue","Complete"]}/>
          <FSelect label="Priority" value={f.priority} onChange={set("priority")} options={["Critical","High","Medium","Low"]}/>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Reporting","Regulatory","Financial","Audit","Governance","Data Protection","Core Mandate","Human Resources","Compliance"]}/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.amber, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function MonitoringForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", requirement:"", legislation:"", owner:"", riskLevel:"Medium", status:"Partial", evidence:"", lastChecked:"", nextCheck:"", actionRequired:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.green}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.green, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Monitoring Item":"Add Monitoring Item"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CM-011"/>
          <FInput label="Requirement" value={f.requirement} onChange={set("requirement")} required placeholder="e.g. PFMA Section 38 — Internal Controls"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Legislation" value={f.legislation} onChange={set("legislation")} placeholder="e.g. PFMA"/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CFO"/>
          <FSelect label="Risk Level" value={f.riskLevel} onChange={set("riskLevel")} options={["High","Medium","Low"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Compliant","Partial","Non-Compliant","In Progress","Not Assessed"]}/>
          <FInput label="Last Checked" value={f.lastChecked} onChange={set("lastChecked")} type="date"/>
          <FInput label="Next Check" value={f.nextCheck} onChange={set("nextCheck")} type="date"/>
        </div>
        <FInput label="Evidence" value={f.evidence} onChange={set("evidence")} placeholder="e.g. Internal audit report ref IA-2026-03"/>
        <FTextarea label="Action Required" value={f.actionRequired} onChange={set("actionRequired")} rows={2} placeholder="Describe action required…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="universe" ? UniverseForm : view==="calendar" ? CalendarForm : MonitoringForm;
  const addColor = view==="universe" ? C.blue : view==="calendar" ? C.amber : C.green;

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["universe","📋 Universe"],["calendar","📅 Calendar"],["monitoring","✅ Monitoring"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            Compliance {view.charAt(0).toUpperCase()+view.slice(1)} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.blue?"#fff":C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add Item</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} title="Push all 12 universe + 12 calendar + 10 monitoring demo items to the server"
            style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>
            🌱 Seed Demo Data
          </button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="universe" && (
            <Table
              headers={["ID","Legislation","Category","Risk","Status","Findings","Next Review","Actions"]}
              rows={items.map(u=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
                <span style={{ maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={u.legislation}>{u.legislation}</span>,
                <Badge label={u.category} color="blue"/>,
                <Badge label={u.riskRating} color={u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ color:u.complianceStatus==="Compliant"?C.green:u.complianceStatus==="Non-Compliant"?C.red:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{u.complianceStatus}</span>,
                <span style={{ color:Number(u.findings)>0?C.red:C.green, fontWeight:700 }}>{u.findings}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{u.nextReview}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...u })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(u.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="calendar" && (
            <Table
              headers={["ID","Obligation","Legislation","Due Date","Owner","Priority","Status","Actions"]}
              rows={[...items].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).map(c=>{
                const isOverdue = c.status==="Overdue"||new Date(c.dueDate)<new Date();
                return [
                  <span style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                  <span style={{ maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.obligation}>{c.obligation}</span>,
                  <span style={{ color:C.muted, fontSize:"0.78rem" }}>{c.legislation}</span>,
                  <span style={{ color:isOverdue?C.red:C.text, fontWeight:isOverdue?700:400 }}>{c.dueDate}{isOverdue?" ⚠":""}</span>,
                  c.owner,
                  <Badge label={c.priority} color={c.priority==="Critical"?"red":c.priority==="High"?"amber":"blue"}/>,
                  <span style={{ color:isOverdue?C.red:c.status==="Complete"?C.green:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{c.status}</span>,
                  <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button onClick={()=>setMode({ ...c })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                    <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                  </div>,
                ];
              })}
            />
          )}
          {view==="monitoring" && (
            <Table
              headers={["ID","Requirement","Legislation","Owner","Risk","Status","Action Required","Next Check","Actions"]}
              rows={items.map(m=>[
                <span style={{ color:C.green, fontWeight:700, fontSize:"0.75rem" }}>{m.id}</span>,
                <span style={{ maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.requirement}>{m.requirement}</span>,
                <Badge label={m.legislation} color="blue"/>,
                m.owner,
                <Badge label={m.riskLevel} color={m.riskLevel==="High"?"red":m.riskLevel==="Medium"?"amber":"green"}/>,
                <span style={{ color:m.status==="Compliant"?C.green:m.status==="Non-Compliant"?C.red:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{m.status}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem", maxWidth:140, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={m.actionRequired}>{m.actionRequired}</span>,
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{m.nextCheck}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...m })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(m.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── PROJECTS & CONTRACTS DATA ────────────────────────────────────────────────
const STATIC_PROJECTS = {
  projects: [
    { id:"PRJ-001", name:"Municipal Finance Skills Academy Rollout", type:"Discretionary Grant", department:"Learning Programmes", manager:"L. Dlamini", budget:15500000, spent:8200000, startDate:"2026-01-15", endDate:"2026-09-30", status:"In Progress", riskRating:"Medium", milestonesTotal:8, milestonesComplete:4, description:"Establish finance academy for municipal CFO pipeline" },
    { id:"PRJ-002", name:"AI Learner Placement Platform Pilot", type:"Internal/Capital", department:"ICT", manager:"J. Williams", budget:6200000, spent:1100000, startDate:"2026-03-01", endDate:"2027-03-31", status:"In Progress", riskRating:"High", milestonesTotal:6, milestonesComplete:1, description:"AI-powered learner-employer matching system" },
    { id:"PRJ-003", name:"Provincial Assessment Centre Expansion", type:"Discretionary Grant", department:"ETQA", manager:"T. Mokoena", budget:12000000, spent:4500000, startDate:"2025-10-01", endDate:"2026-12-31", status:"In Progress", riskRating:"Medium", milestonesTotal:10, milestonesComplete:4, description:"PPP expansion of assessment centres to 4 new provinces" },
    { id:"PRJ-004", name:"Core ICT Infrastructure Upgrade", type:"Internal/Capital", department:"ICT", manager:"J. Williams", budget:9800000, spent:7600000, startDate:"2025-08-01", endDate:"2026-08-31", status:"In Progress", riskRating:"High", milestonesTotal:5, milestonesComplete:3, description:"Cloud migration, DR upgrade and network resilience" },
    { id:"PRJ-005", name:"Municipal Skills Intelligence Hub", type:"Internal/Capital", department:"Research / ICT", manager:"N. Khumalo", budget:8500000, spent:2100000, startDate:"2026-02-01", endDate:"2026-12-31", status:"In Progress", riskRating:"Medium", milestonesTotal:7, milestonesComplete:2, description:"Real-time skills intelligence platform for 257 municipalities" },
    { id:"PRJ-006", name:"Head Office Accommodation Relocation", type:"Internal/Capital", department:"Facilities", manager:"P. van der Merwe", budget:4200000, spent:600000, startDate:"2026-06-01", endDate:"2027-01-31", status:"Planning", riskRating:"High", milestonesTotal:6, milestonesComplete:0, description:"Secure and fit out alternate office accommodation" },
    { id:"PRJ-007", name:"Discretionary Grant Cycle 2026/27", type:"Discretionary Grant", department:"Grants", manager:"G. Mahlangu", budget:45000000, spent:18500000, startDate:"2026-04-01", endDate:"2027-03-31", status:"In Progress", riskRating:"High", milestonesTotal:4, milestonesComplete:1, description:"Annual discretionary grant disbursement to providers and employers" },
    { id:"PRJ-008", name:"Learner Management System Modernisation", type:"Internal/Capital", department:"ICT / ETQA", manager:"T. Mokoena", budget:3600000, spent:3600000, startDate:"2025-04-01", endDate:"2026-03-31", status:"Complete", riskRating:"Low", milestonesTotal:5, milestonesComplete:5, description:"LMS platform upgrade and SAQA interface integration" },
  ],
  contracts: [
    { id:"CT-001", title:"ICT Infrastructure & Support Services", supplier:"TechSystems SA (Pty) Ltd", type:"ICT Services", value:8500000, startDate:"2024-01-01", endDate:"2026-12-31", status:"Active", slaCompliance:78, owner:"CIO", riskRating:"High", renewalStatus:"Review Required", notes:"Single point of failure; sub-contractor not vetted" },
    { id:"CT-002", title:"Municipal Finance Training Delivery", supplier:"LearnersFirst Training Academy", type:"Training Provider", value:4200000, startDate:"2025-04-01", endDate:"2026-09-30", status:"Under Review", slaCompliance:54, owner:"COO", riskRating:"High", renewalStatus:"Do Not Renew", notes:"Ghost learner allegations; financial distress signals" },
    { id:"CT-003", title:"Cloud Hosting & Data Services", supplier:"CloudSecure Data Solutions", type:"Cloud Services", value:3600000, startDate:"2025-01-01", endDate:"2026-11-30", status:"Active", slaCompliance:88, owner:"CIO", riskRating:"High", renewalStatus:"Renew with Conditions", notes:"POPIA compliance not fully verified; offshore storage" },
    { id:"CT-004", title:"Assessment Body Services — Regional", supplier:"MuniSkills Assessment Centre", type:"Assessment Body", value:2800000, startDate:"2025-04-01", endDate:"2027-03-31", status:"Active", slaCompliance:94, owner:"ETQA Manager", riskRating:"Medium", renewalStatus:"On Track", notes:"Assessor capacity constraints flagged for monitoring" },
    { id:"CT-005", title:"Provincial Training Consortium Agreement", supplier:"Provincial Skills Consortium", type:"Training Provider", value:6100000, startDate:"2025-04-01", endDate:"2027-03-31", status:"Active", slaCompliance:81, owner:"COO", riskRating:"Medium", renewalStatus:"On Track", notes:"Delivery delays reported in 3 provinces" },
    { id:"CT-006", title:"Physical Security Services", supplier:"FortressGuard Security Services", type:"Physical Security", value:1200000, startDate:"2025-07-01", endDate:"2027-06-30", status:"Active", slaCompliance:97, owner:"Facilities Manager", riskRating:"Low", renewalStatus:"On Track", notes:"No outstanding issues" },
    { id:"CT-007", title:"External Audit Support Services", supplier:"AGSA / Appointed Audit Firm", type:"Audit", value:1850000, startDate:"2025-04-01", endDate:"2026-03-31", status:"Expiring Soon", slaCompliance:100, owner:"CFO", riskRating:"Low", renewalStatus:"Renewal in Progress", notes:"Standard annual audit engagement renewal" },
    { id:"CT-008", title:"Legal Services Retainer", supplier:"External Legal Counsel", type:"Legal", value:950000, startDate:"2025-01-01", endDate:"2026-12-31", status:"Active", slaCompliance:91, owner:"Legal", riskRating:"Low", renewalStatus:"On Track", notes:"Litigation matters progressing as expected" },
  ],
};

// ─── PROJECTS & CONTRACTS — METRICS HELPERS ───────────────────────────────────
// Compute schedule/cost performance + health for one project. Pure + defensive
// so missing or malformed API fields can never crash the module.
function projectMetrics(p){
  const budget   = Number(p.budget)||0;
  const spent    = Number(p.spent)||0;
  const mTotal   = Number(p.milestonesTotal)||0;
  const mDone    = Number(p.milestonesComplete)||0;
  const milestonePct = mTotal>0 ? Math.round((mDone/mTotal)*100) : 0;
  const spentPct     = budget>0 ? Math.round((spent/budget)*100) : 0;

  // Timeline elapsed %
  const start = new Date(p.startDate), end = new Date(p.endDate), now = new Date();
  const validDates = !isNaN(start) && !isNaN(end) && end>start;
  const elapsedPct = validDates
    ? Math.min(100, Math.max(0, Math.round(((now-start)/(end-start))*100)))
    : 0;
  const daysRemaining = !isNaN(end) ? Math.ceil((end-now)/(1000*60*60*24)) : 0;

  // SPI = work done % ÷ time elapsed %  (>=1 = ahead/on schedule)
  const spi = elapsedPct>0 ? +(milestonePct/elapsedPct).toFixed(2) : (milestonePct>0?1.5:1);
  // CPI = work done % ÷ budget spent %  (>=1 = under budget for work done)
  const cpi = spentPct>0 ? +(milestonePct/spentPct).toFixed(2) : (milestonePct>0?1.5:1);

  const isComplete = (p.status||"").toLowerCase().includes("complete");
  const schedStatus = isComplete ? "On Schedule" : spi>=0.95 ? "On Schedule" : spi>=0.75 ? "Slight Delay" : "Delayed";
  const costStatus  = cpi>=0.85 ? "On/Under Budget" : cpi>=0.7 ? "Over Budget" : "Significantly Over";

  // Composite health 0-100: blend of schedule, cost and milestone progress
  const spiScore  = Math.min(1, spi) * 100;
  const cpiScore  = Math.min(1, cpi) * 100;
  const health    = Math.round((spiScore*0.4) + (cpiScore*0.35) + (milestonePct*0.25));
  const healthBand = isComplete ? "Healthy" : health>=75 ? "Healthy" : health>=55 ? "At Risk" : "Critical";

  return { budget, spent, mTotal, mDone, milestonePct, spentPct, elapsedPct,
           daysRemaining, spi, cpi, schedStatus, costStatus, health, healthBand, isComplete };
}
const healthColor = b => b==="Healthy"?C.green : b==="At Risk"?C.amber : C.red;
const healthDot   = b => b==="Healthy"?"🟢" : b==="At Risk"?"🟡" : "🔴";
const spiColor    = s => s>=0.95?C.green : s>=0.75?C.amber : C.red;
const cpiColor    = c => c>=0.85?C.green : c>=0.7?C.amber : C.red;

// ─── PROJECTS & CONTRACTS VIEW MODULE ─────────────────────────────────────────
function ProjectsModule() {
  const [sub, setSub]           = useState("portfolio");
  const [search, setSearch]     = useState("");
  const [data, setData]         = useState(STATIC_PROJECTS);
  const [expanded, setExpanded] = useState(null);   // Performance tab drill-down
  const [drill, setDrill]       = useState(null);   // Portfolio scorecard drill-down
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter]     = useState("All");

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.projectsContracts) setData({ ...STATIC_PROJECTS, ...d.projectsContracts });
    }).catch(()=>{});
  },[]);

  const projects  = data.projects  || [];
  const contracts = data.contracts || [];
  const metrics   = projects.map(p=>({ p, m:projectMetrics(p) }));

  const totalBudget   = projects.reduce((s,p)=>s+(Number(p.budget)||0),0);
  const totalSpent    = projects.reduce((s,p)=>s+(Number(p.spent)||0),0);
  const highRiskProj  = projects.filter(p=>p.riskRating==="High").length;
  const activeProj    = projects.filter(p=>p.status==="In Progress").length;
  const totalContractValue = contracts.reduce((s,c)=>s+(Number(c.value)||0),0);
  const expiringSoon  = contracts.filter(c=>c.status==="Expiring Soon"||c.renewalStatus==="Review Required"||c.renewalStatus==="Do Not Renew").length;
  const lowSLA        = contracts.filter(c=>Number(c.slaCompliance)<80).length;

  const sc = s => {
    const v=(s||"").toLowerCase();
    if (v.includes("complete")||v==="on track"||v==="active") return C.green;
    if (v.includes("review")||v==="planning"||v==="expiring soon") return C.amber;
    if (v.includes("do not renew")||v==="overdue") return C.red;
    return C.muted;
  };

  const filtered = arr => arr.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  // Portfolio status breakdown
  const STATUS_ORDER = [
    ["In Progress", C.blue],["Planning", C.purple],["Complete", C.green],
    ["On Hold", C.amber],["Cancelled", C.red],
  ];
  const statusCounts = STATUS_ORDER.map(([name,color])=>({
    name, color, value: projects.filter(p=>(p.status||"")===name).length,
  }));
  const donutSegments = statusCounts.filter(s=>s.value>0);

  // Performance efficiency summary
  const onSchedule  = metrics.filter(x=>x.m.schedStatus==="On Schedule").length;
  const slightDelay = metrics.filter(x=>x.m.schedStatus==="Slight Delay").length;
  const delayed     = metrics.filter(x=>x.m.schedStatus==="Delayed").length;
  const overBudget  = metrics.filter(x=>x.m.cpi<0.85).length;
  const avgCompletion = metrics.length ? Math.round(metrics.reduce((s,x)=>s+x.m.milestonePct,0)/metrics.length) : 0;

  const TABS = [
    ["portfolio","📊 Portfolio Overview"],
    ["performance","⚡ Performance & Efficiency"],
    ["projects","📁 Project Register"],
    ["contracts","📜 Contract Register"],
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Project & Contract Management</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Portfolio · Performance · Project & Contract Registers — Q2 2026/27</p>
        </div>
        {(sub==="projects"||sub==="contracts") &&
          <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:240 }}/>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Active Projects",   activeProj,                                  C.blue ],
          ["High Risk Projects",highRiskProj,                                 highRiskProj>0?C.red:C.green ],
          ["Project Budget",    `R${(totalBudget/1e6).toFixed(1)}M`,         C.purple ],
          ["Spent / Committed", `R${(totalSpent/1e6).toFixed(1)}M`,          C.amber ],
          ["Contract Value",    `R${(totalContractValue/1e6).toFixed(1)}M`, C.cyan ],
          ["Contracts at Risk", expiringSoon+lowSLA,                          (expiringSoon+lowSLA)>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.35rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" }}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1 — PORTFOLIO OVERVIEW ═══ */}
      {sub==="portfolio" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1.3fr", gap:"1rem" }}>
            <Card>
              <SectionTitle>Project Status Breakdown</SectionTitle>
              <div style={{ display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap" }}>
                <DonutChart segments={donutSegments} size={170} thickness={24}
                  centerValue={projects.length} centerLabel="projects"/>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.55rem", flex:1, minWidth:160 }}>
                  {statusCounts.map(s=>(
                    <div key={s.name}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                        <span style={{ color:C.text, fontSize:"0.78rem" }}>{s.name}</span>
                        <span style={{ color:s.color, fontSize:"0.78rem", fontWeight:700 }}>{s.value}</span>
                      </div>
                      <ProgressBar value={projects.length?Math.round((s.value/projects.length)*100):0} color={s.color}/>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle>Project Health Scorecard</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"0.6rem" }}>
                {metrics.map(({p,m})=>(
                  <button key={p.id} onClick={()=>setDrill(drill===p.id?null:p.id)}
                    style={{ textAlign:"left", cursor:"pointer", background:drill===p.id?"rgba(88,166,255,0.10)":C.surface,
                      border:`1px solid ${drill===p.id?C.blue:C.border}`, borderRadius:8, padding:"0.6rem 0.7rem" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ color:C.blue, fontSize:"0.72rem", fontWeight:700 }}>{p.id}</span>
                      <span style={{ fontSize:"0.95rem" }}>{healthDot(m.healthBand)}</span>
                    </div>
                    <div style={{ color:C.text, fontSize:"0.72rem", fontWeight:600, margin:"3px 0", lineHeight:1.25,
                      overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</div>
                    <div style={{ color:healthColor(m.healthBand), fontSize:"0.7rem", fontWeight:700 }}>{m.healthBand} · {m.health}</div>
                  </button>
                ))}
              </div>
              {drill && (()=>{ const x=metrics.find(z=>z.p.id===drill); if(!x) return null; const {p,m}=x; return (
                <div style={{ marginTop:"0.85rem", background:C.surface, border:`1px solid ${C.blue}`, borderRadius:8, padding:"0.85rem" }}>
                  <div style={{ color:C.text, fontWeight:700, fontSize:"0.85rem", marginBottom:6 }}>{healthDot(m.healthBand)} {p.id} — {p.name}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.5rem" }}>
                    {[["SPI",m.spi,spiColor(m.spi)],["CPI",m.cpi,cpiColor(m.cpi)],
                      ["Milestones",`${m.milestonePct}%`,C.blue],["Budget Spent",`${m.spentPct}%`,m.spentPct>90?C.red:C.amber]].map(([l,v,c])=>(
                      <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:"0.5rem" }}>
                        <div style={{ color:C.muted, fontSize:"0.62rem", textTransform:"uppercase" }}>{l}</div>
                        <div style={{ color:c, fontSize:"1.05rem", fontWeight:800 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.7rem", color:C.muted, marginBottom:2 }}>
                      <span>Timeline {m.elapsedPct}% elapsed</span>
                      <span style={{ color:m.daysRemaining<0?C.red:C.muted }}>{m.daysRemaining<0?`${Math.abs(m.daysRemaining)} days overdue`:`${m.daysRemaining} days remaining`}</span>
                    </div>
                    <ProgressBar value={m.elapsedPct} color={m.elapsedPct>m.milestonePct+15?C.red:C.green}/>
                  </div>
                </div>
              ); })()}
            </Card>
          </div>

          <Card>
            <SectionTitle>Budget vs Spend by Project</SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projects.map(p=>({ name:p.id, Budget:+(Number(p.budget)/1e6).toFixed(2), Spent:+(Number(p.spent)/1e6).toFixed(2) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="name" stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }}/>
                <YAxis stroke={C.muted} tick={{ fill:C.muted, fontSize:11 }} label={{ value:"R millions", angle:-90, position:"insideLeft", fill:C.muted, fontSize:11 }}/>
                <Tooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, fontSize:"0.78rem" }}/>
                <Legend wrapperStyle={{ fontSize:"0.75rem" }}/>
                <Bar dataKey="Budget" fill={C.blue}  radius={[3,3,0,0]}/>
                <Bar dataKey="Spent"  fill={C.amber} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionTitle>Contract Performance Summary</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.85rem" }}>
              {[
                ["Total Contracts", contracts.length, C.cyan],
                ["Avg SLA Compliance", `${contracts.length?Math.round(contracts.reduce((s,c)=>s+(Number(c.slaCompliance)||0),0)/contracts.length):0}%`, C.green],
                ["Total Contract Value", `R${(totalContractValue/1e6).toFixed(1)}M`, C.purple],
              ].map(([l,v,c])=>(
                <div key={l} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.85rem", borderLeft:`3px solid ${c}` }}>
                  <div style={{ color:C.muted, fontSize:"0.68rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
                  <div style={{ color:c, fontSize:"1.4rem", fontWeight:800 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ═══ TAB 2 — PERFORMANCE & EFFICIENCY ═══ */}
      {sub==="performance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.75rem" }}>
            {[
              ["On Schedule", onSchedule, C.green],
              ["Slight Delay", slightDelay, C.amber],
              ["Delayed", delayed, C.red],
              ["Avg Completion", `${avgCompletion}%`, C.blue],
              ["Over Budget", overBudget, overBudget>0?C.red:C.green],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
                <div style={{ color:C.muted, fontSize:"0.64rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</div>
                <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
              </div>
            ))}
          </div>

          <Card>
            <SectionTitle>Project Efficiency Metrics</SectionTitle>
            <Table
              headers={["ID","Project","SPI","Schedule","CPI","Cost","Milestone %","Budget Spent %","Days Remaining","Health"]}
              rows={metrics.map(({p,m})=>[
                <button onClick={()=>setExpanded(expanded===p.id?null:p.id)}
                  style={{ background:"transparent", border:"none", color:C.blue, fontWeight:700, fontSize:"0.75rem", cursor:"pointer", padding:0 }}>{p.id}</button>,
                <span style={{ color:C.text, fontSize:"0.78rem" }}>{p.name}</span>,
                <span style={{ color:spiColor(m.spi), fontWeight:800 }}>{m.spi.toFixed(2)}</span>,
                <span style={{ color:spiColor(m.spi), fontSize:"0.74rem", fontWeight:600 }}>{m.schedStatus}</span>,
                <span style={{ color:cpiColor(m.cpi), fontWeight:800 }}>{m.cpi.toFixed(2)}</span>,
                <span style={{ color:cpiColor(m.cpi), fontSize:"0.74rem", fontWeight:600 }}>{m.costStatus}</span>,
                <div style={{ minWidth:80 }}><ProgressBar value={m.milestonePct} color={m.milestonePct>=80?C.green:m.milestonePct>=40?C.amber:C.red}/>
                  <div style={{ fontSize:"0.68rem", color:C.muted, marginTop:1 }}>{m.milestonePct}%</div></div>,
                <span style={{ color:m.spentPct>90?C.red:m.spentPct>70?C.amber:C.green, fontWeight:700 }}>{m.spentPct}%</span>,
                <span style={{ color:m.daysRemaining<0?C.red:m.daysRemaining<30?C.amber:C.text, fontWeight:m.daysRemaining<30?700:400 }}>
                  {m.daysRemaining<0?`${Math.abs(m.daysRemaining)} overdue`:m.daysRemaining}</span>,
                <span style={{ color:healthColor(m.healthBand), fontWeight:800 }}>{healthDot(m.healthBand)} {m.health}</span>,
              ])}
            />
            {expanded && (()=>{ const x=metrics.find(z=>z.p.id===expanded); if(!x) return null; const {p,m}=x; return (
              <div style={{ marginTop:"0.85rem", background:C.surface, border:`1px solid ${C.blue}`, borderRadius:8, padding:"0.9rem" }}>
                <div style={{ color:C.text, fontWeight:700, fontSize:"0.88rem", marginBottom:8 }}>{healthDot(m.healthBand)} {p.id} — {p.name}</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.55rem" }}>
                  {[["SPI",m.spi.toFixed(2),spiColor(m.spi)],["CPI",m.cpi.toFixed(2),cpiColor(m.cpi)],
                    ["Budget Spent",`${m.spentPct}%`,m.spentPct>90?C.red:C.amber],["Milestone %",`${m.milestonePct}%`,C.blue]].map(([l,v,c])=>(
                    <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:"0.55rem" }}>
                      <div style={{ color:C.muted, fontSize:"0.62rem", textTransform:"uppercase" }}>{l}</div>
                      <div style={{ color:c, fontSize:"1.1rem", fontWeight:800 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", color:C.muted, marginBottom:3 }}>
                    <span>Timeline — {m.elapsedPct}% elapsed vs {m.milestonePct}% delivered</span>
                    <span style={{ color:m.daysRemaining<0?C.red:C.muted, fontWeight:600 }}>{m.daysRemaining<0?`${Math.abs(m.daysRemaining)} days overdue`:`${m.daysRemaining} days remaining`}</span>
                  </div>
                  <ProgressBar value={m.elapsedPct} color={m.elapsedPct>m.milestonePct+15?C.red:C.green}/>
                </div>
              </div>
            ); })()}
          </Card>
        </div>
      )}

      {/* ═══ TAB 3 — PROJECT REGISTER ═══ */}
      {sub==="projects" && (
        <Card>
          <div style={{ display:"flex", gap:"0.6rem", marginBottom:"0.75rem", flexWrap:"wrap" }}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ ...inputSt, width:"auto" }}>
              {["All","In Progress","Planning","Complete","On Hold","Cancelled"].map(o=><option key={o} value={o}>{o==="All"?"All Statuses":o}</option>)}
            </select>
            <select value={riskFilter} onChange={e=>setRiskFilter(e.target.value)} style={{ ...inputSt, width:"auto" }}>
              {["All","High","Medium","Low"].map(o=><option key={o} value={o}>{o==="All"?"All Risk Levels":o+" Risk"}</option>)}
            </select>
          </div>
          <Table
            headers={["ID","Project","Type","Manager","Budget","Spent","Progress","Risk","Status"]}
            rows={filtered(projects)
              .filter(p=>statusFilter==="All"||p.status===statusFilter)
              .filter(p=>riskFilter==="All"||p.riskRating===riskFilter)
              .map(p=>{
                const pct = Math.round(((Number(p.milestonesComplete)||0)/Math.max(Number(p.milestonesTotal)||0,1))*100);
                const spentPct = Math.round((Number(p.spent)/Math.max(Number(p.budget),1))*100);
                return [
                  <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                  <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{p.name}</div>
                    <div style={{ color:C.muted, fontSize:"0.7rem" }}>{p.department}</div></div>,
                  <Badge label={p.type} color={p.type==="Discretionary Grant"?"amber":"blue"}/>,
                  p.manager,
                  <span style={{ color:C.text, fontWeight:700 }}>R{(Number(p.budget)/1e6).toFixed(1)}M</span>,
                  <span style={{ color:spentPct>90?C.red:C.muted }}>R{(Number(p.spent)/1e6).toFixed(1)}M ({spentPct}%)</span>,
                  <div style={{ minWidth:90 }}>
                    <div style={{ fontSize:"0.72rem", color:C.muted, marginBottom:2 }}>{p.milestonesComplete}/{p.milestonesTotal} milestones</div>
                    <ProgressBar value={pct} color={pct>=80?C.green:pct>=40?C.amber:C.red}/>
                  </div>,
                  <Badge label={p.riskRating} color={p.riskRating==="High"?"red":p.riskRating==="Medium"?"amber":"green"}/>,
                  <span style={{ color:sc(p.status), fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
                ];
              })}
          />
        </Card>
      )}

      {/* ═══ TAB 4 — CONTRACT REGISTER ═══ */}
      {sub==="contracts" && (
        <Card>
          <Table
            headers={["ID","Contract","Supplier","Value","End Date","SLA Compliance","Risk","Renewal Status"]}
            rows={filtered(contracts).map(c=>{
              const daysLeft = Math.ceil((new Date(c.endDate)-new Date())/(1000*60*60*24));
              const expired  = !isNaN(daysLeft) && daysLeft<0;
              const sla = Number(c.slaCompliance)||0;
              return [
                <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                <div><div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{c.title}</div>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{c.type}</div></div>,
                c.supplier,
                <span style={{ color:C.text, fontWeight:700 }}>R{(Number(c.value)/1e6).toFixed(1)}M</span>,
                <div>
                  <div style={{ color:expired?C.red:daysLeft<90?C.amber:C.text, fontWeight:(expired||daysLeft<90)?700:400 }}>{c.endDate}</div>
                  {expired
                    ? <span style={{ background:C.red, color:"#fff", fontSize:"0.62rem", fontWeight:800, padding:"1px 6px", borderRadius:4 }}>EXPIRED</span>
                    : daysLeft<180 && <div style={{ color:daysLeft<90?C.red:C.amber, fontSize:"0.7rem" }}>{daysLeft} days left</div>}
                </div>,
                <div style={{ minWidth:100 }}>
                  <div style={{ fontSize:"0.72rem", color:sla>=90?C.green:sla>=75?C.amber:C.red, fontWeight:700, marginBottom:2 }}>{sla}%</div>
                  <ProgressBar value={sla} color={sla>=90?C.green:sla>=75?C.amber:C.red}/>
                </div>,
                <Badge label={c.riskRating} color={c.riskRating==="High"?"red":c.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ color:sc(c.renewalStatus), fontWeight:700, fontSize:"0.78rem" }}>{c.renewalStatus}</span>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}

// ─── PROJECTS & CONTRACTS ADMIN ───────────────────────────────────────────────
function ProjectsAdmin() {
  const [view, setView]       = useState("projects");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { projects:STATIC_PROJECTS.projects, contracts:STATIC_PROJECTS.contracts };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.projectsContracts?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.projectsContracts) data.projectsContracts = {};
    data.projectsContracts[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.projectsContracts = { projects:STATIC_PROJECTS.projects, contracts:STATIC_PROJECTS.contracts };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed data");
      showToast(`✅ Seeded ${STATIC_PROJECTS.projects.length} projects and ${STATIC_PROJECTS.contracts.length} contracts to server.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i => i.id !== id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function ProjectForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", name:"", type:"Discretionary Grant", department:"", manager:"", budget:"", spent:"", startDate:"", endDate:"", status:"Planning", riskRating:"Medium", milestonesTotal:"1", milestonesComplete:"0", description:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Project":"Add Project"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="PRJ-009"/>
          <FInput label="Project Name" value={f.name} onChange={set("name")} required placeholder="e.g. Digital Skills Programme"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Type" value={f.type} onChange={set("type")} options={["Discretionary Grant","Internal/Capital"]}/>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. ICT"/>
          <FInput label="Project Manager" value={f.manager} onChange={set("manager")} placeholder="e.g. J. Smith"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Budget (R)" value={f.budget} onChange={set("budget")} type="number" placeholder="5000000"/>
          <FInput label="Spent (R)" value={f.spent} onChange={set("spent")} type="number" placeholder="0"/>
          <FInput label="Start Date" value={f.startDate} onChange={set("startDate")} type="date"/>
          <FInput label="End Date" value={f.endDate} onChange={set("endDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Planning","In Progress","On Hold","Complete","Cancelled"]}/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["High","Medium","Low"]}/>
          <FInput label="Total Milestones" value={f.milestonesTotal} onChange={set("milestonesTotal")} type="number" placeholder="8"/>
          <FInput label="Milestones Complete" value={f.milestonesComplete} onChange={set("milestonesComplete")} type="number" placeholder="0"/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Brief project description…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add Project"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function ContractForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", supplier:"", type:"ICT Services", value:"", startDate:"", endDate:"", status:"Active", slaCompliance:"100", owner:"", riskRating:"Medium", renewalStatus:"On Track", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Contract":"Add Contract"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="ID" value={f.id} onChange={set("id")} required placeholder="CT-009"/>
          <FInput label="Contract Title" value={f.title} onChange={set("title")} required placeholder="e.g. ICT Support Services"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"1rem" }}>
          <FInput label="Supplier" value={f.supplier} onChange={set("supplier")} placeholder="e.g. Acme (Pty) Ltd"/>
          <FSelect label="Type" value={f.type} onChange={set("type")} options={["ICT Services","Training Provider","Assessment Body","Cloud Services","Physical Security","Audit","Legal","Consulting","Other"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Contract Value (R)" value={f.value} onChange={set("value")} type="number" placeholder="2000000"/>
          <FInput label="Start Date" value={f.startDate} onChange={set("startDate")} type="date"/>
          <FInput label="End Date" value={f.endDate} onChange={set("endDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Active","Under Review","Expiring Soon","Suspended","Terminated"]}/>
          <FInput label="SLA Compliance %" value={f.slaCompliance} onChange={set("slaCompliance")} type="number" placeholder="95"/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. CIO"/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["High","Medium","Low"]}/>
        </div>
        <FSelect label="Renewal Status" value={f.renewalStatus} onChange={set("renewalStatus")} options={["On Track","Renewal in Progress","Review Required","Renew with Conditions","Do Not Renew"]}/>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Key risk notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add Contract"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="projects" ? ProjectForm : ContractForm;
  const addColor = view==="projects" ? C.blue : C.cyan;

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["projects","📁 Project Portfolio"],["contracts","📜 Contract Register"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            {view==="projects"?"Project Portfolio":"Contract & Commitment Register"} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.blue?"#fff":C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Add {view==="projects"?"Project":"Contract"}</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} title="Push demo projects & contracts to server"
            style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>
            🌱 Seed Demo Data
          </button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="projects" && (
            <Table
              headers={["ID","Project","Type","Budget","Spent","Risk","Status","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.name}>{p.name}</span>,
                <Badge label={p.type} color={p.type==="Discretionary Grant"?"amber":"blue"}/>,
                <span>R{(Number(p.budget)/1e6).toFixed(1)}M</span>,
                <span>R{(Number(p.spent)/1e6).toFixed(1)}M</span>,
                <Badge label={p.riskRating} color={p.riskRating==="High"?"red":p.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="contracts" && (
            <Table
              headers={["ID","Contract","Supplier","Value","SLA %","Risk","Renewal","Actions"]}
              rows={items.map(c=>[
                <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem" }}>{c.id}</span>,
                <span style={{ maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.title}>{c.title}</span>,
                c.supplier,
                <span>R{(Number(c.value)/1e6).toFixed(1)}M</span>,
                <span style={{ color:Number(c.slaCompliance)>=90?C.green:Number(c.slaCompliance)>=75?C.amber:C.red, fontWeight:700 }}>{c.slaCompliance}%</span>,
                <Badge label={c.riskRating} color={c.riskRating==="High"?"red":c.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ fontWeight:700, fontSize:"0.78rem" }}>{c.renewalStatus}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...c })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(c.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── DECLARATIONS DATA ────────────────────────────────────────────────────────
const DECLARATION_CATEGORIES = [
  "Conflict of Interest","Outside Position","Personal Relationship",
  "Gift & Hospitality","Income & Financial Interest","Political & Campaign Activities",
  "Supplier / Vendor Relationship","Procurement Disclosure","Assets / Property Interest",
  "Related Party Disclosure","Annual / Ad Hoc Declarations",
];

const STATIC_DECLARATIONS = [
  { id:"DEC-001", type:"Conflict of Interest", employee:"T. Mokoena", department:"ETQA", description:"Board member of training provider receiving LGSETA grant funding", relatedParty:"MuniSkills Assessment Centre", financialValue:"", dateSubmitted:"2026-04-15", periodCovered:"2026/27", status:"Approved", riskLevel:"High", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Recused from all procurement decisions involving MuniSkills", dueDate:"", supportingDocs:"Declaration form signed", notes:"Annual renewal required" },
  { id:"DEC-002", type:"Gift & Hospitality", employee:"N. Khumalo", department:"Research / ICT", description:"Received conference sponsorship (flights + accommodation) from TechSystems SA", relatedParty:"TechSystems SA (Pty) Ltd", financialValue:"12500", dateSubmitted:"2026-03-20", periodCovered:"2026/27", status:"Approved", riskLevel:"Medium", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Disclosed and approved; no procurement role held", dueDate:"", supportingDocs:"Gift register entry", notes:"Below R15,000 threshold" },
  { id:"DEC-003", type:"Outside Position", employee:"G. Mahlangu", department:"Grants", description:"Director of family-owned training company not contracted to LGSETA", relatedParty:"Mahlangu Skills Academy (Pty) Ltd", financialValue:"", dateSubmitted:"2026-02-10", periodCovered:"2026/27", status:"Approved", riskLevel:"Medium", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Annual renewal; company must not apply for LGSETA grants", dueDate:"2027-02-10", supportingDocs:"CIPC registration certificate", notes:"No conflict currently; monitor annually" },
  { id:"DEC-004", type:"Income & Financial Interest", employee:"P. van der Merwe", department:"Facilities", description:"Spouse employed by facilities management company bidding on LGSETA contract", relatedParty:"Premier Facilities Group", financialValue:"", dateSubmitted:"2026-05-02", periodCovered:"2026/27", status:"Under Review", riskLevel:"High", managerReview:"Pending", complianceReview:"Pending", approvalStatus:"Pending", mitigationAction:"Recusal from tender evaluation committee pending", dueDate:"2026-07-15", supportingDocs:"Declaration form", notes:"Awaiting Legal review" },
  { id:"DEC-005", type:"Procurement Disclosure", employee:"T. Mahlangu", department:"SCM", description:"Previous employment with supplier currently on LGSETA preferred supplier list", relatedParty:"CapCity Consulting (Pty) Ltd", financialValue:"", dateSubmitted:"2026-01-15", periodCovered:"2026/27", status:"Approved", riskLevel:"High", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Recused from all CapCity evaluations and contract management", dueDate:"2027-01-15", supportingDocs:"Employment history confirmation", notes:"Permanent recusal in place" },
  { id:"DEC-006", type:"Personal Relationship", employee:"S. Nkosi", department:"HR", description:"Sibling applies for vacant HR Officer position", relatedParty:"Sibling — J. Nkosi", financialValue:"", dateSubmitted:"2026-06-01", periodCovered:"2026/27", status:"Approved", riskLevel:"Medium", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"Recused from recruitment panel; external HR to manage process", dueDate:"", supportingDocs:"Declaration form", notes:"Application in progress" },
  { id:"DEC-007", type:"Gift & Hospitality", employee:"L. Dlamini", department:"Learning Programmes", description:"Training provider offered tickets to PSL football match (value unknown)", relatedParty:"LearnersFirst Training Academy", financialValue:"2500", dateSubmitted:"2026-06-10", periodCovered:"2026/27", status:"Rejected", riskLevel:"High", managerReview:"Rejected", complianceReview:"Rejected", approvalStatus:"Rejected", mitigationAction:"Tickets returned; disciplinary warning issued", dueDate:"", supportingDocs:"Email evidence attached", notes:"Provider under investigation for ghost learners" },
  { id:"DEC-008", type:"Annual / Ad Hoc Declarations", employee:"J. Williams", department:"ICT", description:"Annual declaration — no conflicts or interests to declare", relatedParty:"None", financialValue:"", dateSubmitted:"2026-04-01", periodCovered:"2026/27", status:"Approved", riskLevel:"Low", managerReview:"Approved", complianceReview:"Approved", approvalStatus:"Approved", mitigationAction:"No action required", dueDate:"2027-04-01", supportingDocs:"Signed declaration form", notes:"Clean annual declaration" },
  { id:"DEC-009", type:"Supplier / Vendor Relationship", employee:"M. Sithole", department:"Finance", description:"Personal friend is owner of accounting firm submitting quotation for LGSETA audit", relatedParty:"Sithole & Associates", financialValue:"", dateSubmitted:"2026-05-20", periodCovered:"2026/27", status:"Under Review", riskLevel:"High", managerReview:"Pending", complianceReview:"Pending", approvalStatus:"Pending", mitigationAction:"Pending compliance review and recusal decision", dueDate:"2026-07-31", supportingDocs:"Declaration form", notes:"Urgent — quote evaluation imminent" },
  { id:"DEC-010", type:"Assets / Property Interest", employee:"C. Khumalo", department:"Corporate Services", description:"Owns property being considered for LGSETA provincial office lease", relatedParty:"CK Property Holdings", financialValue:"18000", dateSubmitted:"2026-03-10", periodCovered:"2026/27", status:"Rejected", riskLevel:"High", managerReview:"Rejected", complianceReview:"Rejected", approvalStatus:"Rejected", mitigationAction:"Property excluded from evaluation; disciplinary process initiated", dueDate:"", supportingDocs:"Title deed", notes:"Referred to Ethics Committee" },
];

// ─── DECLARATION WORKFLOW STATUS HELPERS ─────────────────────────────────────
function WorkflowBadge({ status }) {
  const map = {
    "Submitted":     { color:C.blue,   bg:"rgba(88,166,255,0.12)" },
    "Under Review":  { color:C.amber,  bg:"rgba(227,179,65,0.12)" },
    "Approved":      { color:C.green,  bg:"rgba(63,185,80,0.12)"  },
    "Rejected":      { color:C.red,    bg:"rgba(248,81,73,0.12)"  },
    "Pending":       { color:C.muted,  bg:"rgba(110,118,129,0.12)"},
    "Overdue":       { color:C.red,    bg:"rgba(248,81,73,0.12)"  },
  };
  const s = map[status] || map["Pending"];
  return (
    <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.color}`, borderRadius:4,
      padding:"2px 8px", fontSize:"0.75rem", fontWeight:700, whiteSpace:"nowrap" }}>
      {status}
    </span>
  );
}

function WorkflowPipeline({ status }) {
  const steps = ["Submitted","Under Review","Approved"];
  const idx   = steps.indexOf(status);
  const rejected = status === "Rejected";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"nowrap" }}>
      {steps.map((s, i) => {
        const done    = rejected ? false : i < idx;
        const current = rejected ? (s==="Under Review") : i===idx;
        const color   = rejected && s==="Approved" ? C.red : done ? C.green : current ? C.blue : C.border;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ fontSize:"0.65rem", fontWeight:700, color:done?C.green:current?C.blue:C.muted,
              whiteSpace:"nowrap", borderBottom:`2px solid ${color}`, paddingBottom:1 }}>
              {rejected && i===2 ? "Rejected" : s}
            </div>
            {i<steps.length-1 && <div style={{ color:C.border, fontSize:"0.7rem" }}>→</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── DECLARATION MODULE VIEW ──────────────────────────────────────────────────
function DeclarationsModule() {
  const [sub, setSub]         = useState("dashboard");
  const [search, setSearch]   = useState("");
  const [filterType, setFilterType]     = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selected, setSelected]         = useState(null);
  const [data, setData]       = useState(STATIC_DECLARATIONS);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.declarations?.length > 0) setData(d.declarations);
    }).catch(()=>{});
  },[]);

  const approved    = data.filter(d=>d.status==="Approved").length;
  const underReview = data.filter(d=>d.status==="Under Review").length;
  const rejected    = data.filter(d=>d.status==="Rejected").length;
  const highRisk    = data.filter(d=>d.riskLevel==="High").length;
  const pending     = data.filter(d=>d.approvalStatus==="Pending").length;
  const overdue     = data.filter(d=>d.dueDate && new Date(d.dueDate)<new Date() && d.status!=="Approved").length;

  const filtered = data.filter(d=>
    (filterType==="All" || d.type===filterType) &&
    (filterStatus==="All" || d.status===filterStatus) &&
    JSON.stringify(d).toLowerCase().includes(search.toLowerCase())
  );

  // Category breakdown
  const byCategory = DECLARATION_CATEGORIES.map(cat=>({
    cat, count:data.filter(d=>d.type===cat).length
  })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Declaration Dashboard</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Ethics & Conflict of Interest · Q2 2026/27</p>
        </div>
        <a href="https://venerable-tulumba-25bcd5.netlify.app/declare.html" target="_blank" rel="noopener"
          style={{ padding:"0.6rem 1.25rem", background:C.purple, color:"#fff", borderRadius:8,
            fontWeight:700, fontSize:"0.85rem", textDecoration:"none", whiteSpace:"nowrap" }}>
          📤 Submit a Declaration
        </a>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Total Declarations", data.length,    C.blue  ],
          ["Approved",           approved,        C.green ],
          ["Under Review",       underReview,     C.amber ],
          ["Rejected",           rejected,        C.red   ],
          ["High Risk",          highRisk,        C.red   ],
          ["Overdue Actions",    overdue,         overdue>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Sub tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[["dashboard","📊 Overview"],["register","📋 Declaration Register"],["pending","⏳ Pending Review"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ setSub(id); setSelected(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}{id==="pending"&&pending>0?<span style={{ marginLeft:5, background:C.red, color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:"0.65rem" }}>{pending}</span>:null}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {sub==="dashboard" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
          {/* By Category */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>Declarations by Category</h3>
            {byCategory.map(({ cat, count })=>(
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.6rem" }}>
                <div style={{ flex:1, color:C.muted, fontSize:"0.8rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{cat}</div>
                <div style={{ width:100 }}><ProgressBar value={count} max={data.length} color={C.blue}/></div>
                <div style={{ color:C.blue, fontWeight:700, fontSize:"0.85rem", minWidth:20, textAlign:"right" }}>{count}</div>
              </div>
            ))}
          </Card>

          {/* High Risk declarations */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>🔴 High Risk Declarations</h3>
            {data.filter(d=>d.riskLevel==="High").map(d=>(
              <div key={d.id} onClick={()=>{ setSub("register"); setSelected(d); }}
                style={{ padding:"0.75rem", background:C.surface, borderRadius:8, marginBottom:"0.5rem", cursor:"pointer",
                  border:`1px solid ${d.status==="Rejected"?C.red:d.status==="Approved"?C.green:C.amber}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</div>
                    <div style={{ color:C.text, fontWeight:600, fontSize:"0.82rem" }}>{d.employee}</div>
                    <div style={{ color:C.muted, fontSize:"0.75rem" }}>{d.type}</div>
                  </div>
                  <WorkflowBadge status={d.status}/>
                </div>
              </div>
            ))}
          </Card>

          {/* Status breakdown */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>Status Breakdown</h3>
            {[["Approved",approved,C.green],["Under Review",underReview,C.amber],["Rejected",rejected,C.red]].map(([l,v,c])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:c, flexShrink:0 }}/>
                <div style={{ flex:1, color:C.muted, fontSize:"0.82rem" }}>{l}</div>
                <div style={{ minWidth:80 }}><ProgressBar value={v} max={data.length} color={c}/></div>
                <div style={{ color:c, fontWeight:800, fontSize:"1rem", minWidth:24, textAlign:"right" }}>{v}</div>
              </div>
            ))}
          </Card>

          {/* Pending actions */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>⏳ Pending Review Actions</h3>
            {data.filter(d=>d.approvalStatus==="Pending").length===0
              ? <p style={{ color:C.green, fontSize:"0.85rem" }}>✅ No declarations pending review.</p>
              : data.filter(d=>d.approvalStatus==="Pending").map(d=>(
                  <div key={d.id} style={{ padding:"0.75rem", background:C.surface, borderRadius:8, marginBottom:"0.5rem", border:`1px solid ${C.amber}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.id} · {d.employee}</div>
                        <div style={{ color:C.muted, fontSize:"0.75rem" }}>{d.type}</div>
                      </div>
                      {d.dueDate && <div style={{ color:new Date(d.dueDate)<new Date()?C.red:C.amber, fontSize:"0.75rem", fontWeight:700 }}>Due: {d.dueDate}</div>}
                    </div>
                  </div>
                ))
            }
          </Card>
        </div>
      )}

      {/* REGISTER */}
      {sub==="register" && (
        <div>
          {/* Detail panel */}
          {selected && (
            <div style={{ background:C.card, border:`1px solid ${C.blue}`, borderRadius:12, padding:"1.5rem", marginBottom:"1.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
                <div>
                  <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", marginBottom:"0.3rem" }}>
                    <span style={{ color:C.blue, fontWeight:800, fontSize:"1rem" }}>{selected.id}</span>
                    <WorkflowBadge status={selected.status}/>
                    <Badge label={selected.riskLevel} color={selected.riskLevel==="High"?"red":selected.riskLevel==="Medium"?"amber":"green"}/>
                  </div>
                  <h3 style={{ color:C.text, margin:"0 0 0.25rem", fontWeight:700 }}>{selected.type}</h3>
                  <p style={{ color:C.muted, margin:0, fontSize:"0.85rem" }}>{selected.employee} · {selected.department}</p>
                </div>
                <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
              </div>
              <WorkflowPipeline status={selected.status}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", marginTop:"1rem" }}>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Related Party</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.relatedParty||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Financial Value</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.financialValue?`R${Number(selected.financialValue).toLocaleString()}`:"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Date Submitted</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.dateSubmitted||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Manager Review</div><div style={{ color:selected.managerReview==="Approved"?C.green:selected.managerReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.85rem" }}>{selected.managerReview||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Compliance/Legal Review</div><div style={{ color:selected.complianceReview==="Approved"?C.green:selected.complianceReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.85rem" }}>{selected.complianceReview||"—"}</div></div>
                <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Due Date</div><div style={{ color:selected.dueDate&&new Date(selected.dueDate)<new Date()?C.red:C.text, fontSize:"0.85rem" }}>{selected.dueDate||"—"}</div></div>
              </div>
              <div style={{ marginTop:"0.75rem" }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Description</div>
                <div style={{ color:C.text, fontSize:"0.85rem", lineHeight:1.6 }}>{selected.description}</div>
              </div>
              <div style={{ marginTop:"0.75rem" }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Mitigation Action</div>
                <div style={{ color:C.text, fontSize:"0.85rem", lineHeight:1.6, padding:"0.5rem 0.75rem", background:C.surface, borderRadius:6, borderLeft:`3px solid ${C.green}` }}>{selected.mitigationAction||"—"}</div>
              </div>
              {selected.notes && <div style={{ marginTop:"0.75rem" }}>
                <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Notes</div>
                <div style={{ color:C.muted, fontSize:"0.82rem" }}>{selected.notes}</div>
              </div>}
            </div>
          )}

          {/* Filters */}
          <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1rem", flexWrap:"wrap" }}>
            <input placeholder="Search declarations…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:200 }}/>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={inputSt}>
              <option value="All">All Types</option>
              {DECLARATION_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inputSt}>
              {["All","Approved","Under Review","Rejected"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <Card>
            <Table
              headers={["ID","Type","Employee","Department","Risk","Status","Workflow","Date"]}
              rows={filtered.map(d=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(d)}>{d.id}</span>,
                <span style={{ fontSize:"0.78rem", color:C.muted }}>{d.type}</span>,
                <span style={{ fontWeight:600 }}>{d.employee}</span>,
                d.department,
                <Badge label={d.riskLevel} color={d.riskLevel==="High"?"red":d.riskLevel==="Medium"?"amber":"green"}/>,
                <WorkflowBadge status={d.status}/>,
                <WorkflowPipeline status={d.status}/>,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{d.dateSubmitted}</span>,
              ])}
            />
          </Card>
        </div>
      )}

      {/* PENDING REVIEW */}
      {sub==="pending" && (
        <div>
          {data.filter(d=>d.approvalStatus==="Pending").length===0 ? (
            <Card><p style={{ color:C.green, textAlign:"center", padding:"2rem", fontWeight:700 }}>✅ No declarations pending review.</p></Card>
          ) : (
            <Card>
              <Table
                headers={["ID","Type","Employee","Department","Risk","Submitted","Due Date","Action Required"]}
                rows={data.filter(d=>d.approvalStatus==="Pending").map(d=>{
                  const isOverdue = d.dueDate && new Date(d.dueDate)<new Date();
                  return [
                    <span style={{ color:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</span>,
                    <span style={{ fontSize:"0.78rem" }}>{d.type}</span>,
                    <span style={{ fontWeight:600 }}>{d.employee}</span>,
                    d.department,
                    <Badge label={d.riskLevel} color={d.riskLevel==="High"?"red":d.riskLevel==="Medium"?"amber":"green"}/>,
                    d.dateSubmitted,
                    <span style={{ color:isOverdue?C.red:C.amber, fontWeight:700 }}>{d.dueDate||"ASAP"}{isOverdue?" ⚠":""}</span>,
                    <span style={{ color:C.muted, fontSize:"0.75rem", maxWidth:160, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.mitigationAction}>{d.mitigationAction||"Review required"}</span>,
                  ];
                })}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DECLARATIONS ADMIN ───────────────────────────────────────────────────────
function DeclarationsAdmin() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch]   = useState("");

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems(data.declarations?.length > 0 ? data.declarations : STATIC_DECLARATIONS);
    } catch { setItems(STATIC_DECLARATIONS); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    data.declarations = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.declarations = STATIC_DECLARATIONS;
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed");
      showToast(`✅ Seeded ${STATIC_DECLARATIONS.length} declarations to server.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    if (!f.id || !f.employee) { showToast("ID and Employee are required.", "err"); return; }
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const before = isEdit ? items.find(i=>i.id===f.id) : null;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      await logAudit({ module:"Declarations", action:isEdit?"Edit":"Add", recordId:f.id,
        description:`${isEdit?"Updated":"Added"} declaration for ${f.employee} (${f.type})`,
        before, after:f });
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const before = items.find(i=>i.id===id);
      await saveToServer(items.filter(i=>i.id!==id));
      await logAudit({ module:"Declarations", action:"Delete", recordId:id,
        description:`Deleted declaration ${id}`, before });
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function updateStatus(id, newStatus) {
    setSaving(true);
    try {
      const approvalStatus = newStatus==="Approved"||newStatus==="Rejected" ? newStatus : "Pending";
      const updated = items.map(i => i.id===id ? { ...i, status:newStatus, approvalStatus, managerReview:newStatus==="Approved"||newStatus==="Rejected"?newStatus:"Pending", complianceReview:newStatus==="Approved"||newStatus==="Rejected"?newStatus:"Pending", updatedAt:new Date().toISOString() } : i);
      await saveToServer(updated);
      showToast(`✅ ${id} status updated to ${newStatus}.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function DeclarationForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", type:"Conflict of Interest", employee:"", department:"", description:"", relatedParty:"", financialValue:"", dateSubmitted:"", periodCovered:"2026/27", status:"Submitted", riskLevel:"Medium", managerReview:"Pending", complianceReview:"Pending", approvalStatus:"Pending", mitigationAction:"", dueDate:"", supportingDocs:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.purple}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.purple, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Declaration":"Log New Declaration"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="Declaration ID" value={f.id} onChange={set("id")} required placeholder="DEC-011"/>
          <FSelect label="Declaration Type" value={f.type} onChange={set("type")} options={DECLARATION_CATEGORIES}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Employee / Official" value={f.employee} onChange={set("employee")} required placeholder="e.g. T. Mokoena"/>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. ETQA"/>
          <FInput label="Period Covered" value={f.periodCovered} onChange={set("periodCovered")} placeholder="e.g. 2026/27"/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the declaration in detail…"/>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"1rem" }}>
          <FInput label="Related Party" value={f.relatedParty} onChange={set("relatedParty")} placeholder="Name of related entity or person"/>
          <FInput label="Financial Value (R)" value={f.financialValue} onChange={set("financialValue")} type="number" placeholder="0"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Date Submitted" value={f.dateSubmitted} onChange={set("dateSubmitted")} type="date"/>
          <FSelect label="Risk Level" value={f.riskLevel} onChange={set("riskLevel")} options={["High","Medium","Low"]}/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Submitted","Under Review","Approved","Rejected"]}/>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Manager Review" value={f.managerReview} onChange={set("managerReview")} options={["Pending","Approved","Rejected"]}/>
          <FSelect label="Compliance/Legal Review" value={f.complianceReview} onChange={set("complianceReview")} options={["Pending","Approved","Rejected"]}/>
          <FSelect label="Approval Status" value={f.approvalStatus} onChange={set("approvalStatus")} options={["Pending","Approved","Rejected"]}/>
        </div>
        <FTextarea label="Mitigation Action" value={f.mitigationAction} onChange={set("mitigationAction")} rows={2} placeholder="Describe the mitigation or recusal action taken…"/>
        <FInput label="Supporting Documents" value={f.supportingDocs} onChange={set("supportingDocs")} placeholder="e.g. Signed declaration form, CIPC cert"/>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Log Declaration"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const filtered = items.filter(i=>JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(163,113,247,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.purple:C.red}`, color:toast.type==="ok"?C.purple:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Declaration</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>? This cannot be undone.</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>Declaration Register — Edit Mode</h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} declarations · {items.filter(i=>i.approvalStatus==="Pending").length} pending review</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ ...inputSt, width:180 }}/>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ Log Declaration</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>🌱 Seed Demo Data</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <DeclarationForm onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <DeclarationForm initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          <Table
            headers={["ID","Type","Employee","Dept","Risk","Status","Manager","Compliance/Legal","Actions"]}
            rows={filtered.map(d=>[
              <span style={{ color:C.purple, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</span>,
              <span style={{ fontSize:"0.75rem", color:C.muted, maxWidth:120, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.type}>{d.type}</span>,
              <span style={{ fontWeight:600, fontSize:"0.82rem" }}>{d.employee}</span>,
              <span style={{ fontSize:"0.78rem" }}>{d.department}</span>,
              <Badge label={d.riskLevel} color={d.riskLevel==="High"?"red":d.riskLevel==="Medium"?"amber":"green"}/>,
              <WorkflowBadge status={d.status}/>,
              <span style={{ color:d.managerReview==="Approved"?C.green:d.managerReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.managerReview}</span>,
              <span style={{ color:d.complianceReview==="Approved"?C.green:d.complianceReview==="Rejected"?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.complianceReview}</span>,
              <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
                {d.status==="Under Review" && (
                  <>
                    <button onClick={()=>updateStatus(d.id,"Approved")} disabled={saving} style={{ padding:"0.25rem 0.6rem", background:C.green, color:"#fff", border:"none", borderRadius:5, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>✓</button>
                    <button onClick={()=>updateStatus(d.id,"Rejected")} disabled={saving} style={{ padding:"0.25rem 0.6rem", background:C.red, color:"#fff", border:"none", borderRadius:5, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>✗</button>
                  </>
                )}
                {d.status==="Submitted" && (
                  <button onClick={()=>updateStatus(d.id,"Under Review")} disabled={saving} style={{ padding:"0.25rem 0.6rem", background:C.amber, color:C.bg, border:"none", borderRadius:5, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Review</button>
                )}
                <button onClick={()=>setMode({ ...d })} disabled={!!mode} style={{ padding:"0.25rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                <button onClick={()=>setConfirmDel(d.id)} disabled={!!mode} style={{ padding:"0.25rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
              </div>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}


// ─── IAM DATA ─────────────────────────────────────────────────────────────────
const STATIC_IAM = {
  users: [
    { id:"USR-001", name:"N. Khumalo", department:"Research / ICT", jobTitle:"ICT Manager", systems:["SAP HR","Financial System","Azure Portal","LMS","AGSA Portal"], accessLevel:"Admin", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2023-01-15", riskRating:"High", notes:"CIO delegate — full system access required" },
    { id:"USR-002", name:"T. Mokoena", department:"ETQA", jobTitle:"Senior Manager: ETQA", systems:["LMS","SAQA Interface","Grants System"], accessLevel:"Standard", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2022-06-01", riskRating:"Medium", notes:"" },
    { id:"USR-003", name:"G. Mahlangu", department:"Grants", jobTitle:"Grants Manager", systems:["Grants System","Financial System","Banking Portal"], accessLevel:"Elevated", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2021-03-10", riskRating:"High", notes:"Dual authorisation required for payments above R500k" },
    { id:"USR-004", name:"P. van der Merwe", department:"Facilities", jobTitle:"Facilities Manager", systems:["Facilities System","Email"], accessLevel:"Standard", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:false, accountCreated:"2020-08-20", riskRating:"Low", notes:"MFA not yet enrolled — action required" },
    { id:"USR-005", name:"T. Mahlangu", department:"SCM", jobTitle:"SCM Manager", systems:["SCM System","Supplier Portal","Financial System"], accessLevel:"Elevated", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2019-11-05", riskRating:"High", notes:"Segregation of duties review pending" },
    { id:"USR-006", name:"S. Nkosi", department:"HR", jobTitle:"HR Manager", systems:["SAP HR","Payroll System","Recruitment Portal"], accessLevel:"Elevated", status:"Active", lastReview:"2026-01-31", nextReview:"2026-07-31", mfaEnabled:true, accountCreated:"2021-07-15", riskRating:"Medium", notes:"" },
    { id:"USR-007", name:"L. Dlamini", department:"Learning Programmes", jobTitle:"Manager: Learning Programmes", systems:["LMS","Grants System","Email"], accessLevel:"Standard", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:true, accountCreated:"2022-02-28", riskRating:"Low", notes:"" },
    { id:"USR-008", name:"Former Employee", department:"Finance", jobTitle:"Finance Officer", systems:["Financial System","SAP HR"], accessLevel:"Standard", status:"Suspended", lastReview:"2026-05-01", nextReview:"2026-06-01", mfaEnabled:false, accountCreated:"2020-01-10", riskRating:"Critical", notes:"URGENT: Account not fully revoked — termination date 2026-04-30" },
    { id:"USR-009", name:"M. Sithole", department:"Finance", jobTitle:"Senior Finance Officer", systems:["Financial System","Banking Portal","SAP HR"], accessLevel:"Elevated", status:"Active", lastReview:"2026-01-31", nextReview:"2026-07-31", mfaEnabled:true, accountCreated:"2023-04-01", riskRating:"High", notes:"Overdue for access review" },
    { id:"USR-010", name:"Service Account: LMS-SYNC", department:"ICT", jobTitle:"System Service Account", systems:["LMS","SAQA Interface"], accessLevel:"Service", status:"Active", lastReview:"2026-03-31", nextReview:"2026-09-30", mfaEnabled:false, accountCreated:"2022-01-01", riskRating:"Medium", notes:"Non-human account — password rotation overdue" },
  ],
  privileged: [
    { id:"PAM-001", account:"sa_lgseta_admin", type:"Local Admin", system:"Windows Servers", owner:"N. Khumalo", department:"ICT", justification:"Server administration and patch management", lastPasswordChange:"2026-02-15", passwordExpiry:"2026-08-15", lastUsed:"2026-06-10", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"Password vault managed" },
    { id:"PAM-002", account:"azure_global_admin", type:"Cloud Admin", system:"Azure Portal", owner:"N. Khumalo", department:"ICT", justification:"Cloud infrastructure management", lastPasswordChange:"2026-01-10", passwordExpiry:"2026-07-10", lastUsed:"2026-06-12", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"MFA enforced; conditional access policy active" },
    { id:"PAM-003", account:"sap_basis_admin", type:"Application Admin", system:"SAP HR", owner:"N. Khumalo", department:"ICT", justification:"SAP basis administration and user management", lastPasswordChange:"2026-03-01", passwordExpiry:"2026-09-01", lastUsed:"2026-05-28", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"Shared account — individual accountability risk" },
    { id:"PAM-004", account:"fin_sys_super", type:"Application Admin", system:"Financial System", owner:"T. Mokoena", department:"Finance", justification:"Financial system configuration and year-end processing", lastPasswordChange:"2025-12-01", passwordExpiry:"2026-06-01", lastUsed:"2026-04-15", sessionRecorded:false, checkedOut:false, status:"Expired", riskRating:"Critical", notes:"PASSWORD EXPIRED — immediate rotation required" },
    { id:"PAM-005", account:"lms_admin", type:"Application Admin", system:"LMS Platform", owner:"T. Mokoena", department:"ETQA", justification:"LMS configuration, user management and reporting", lastPasswordChange:"2026-04-01", passwordExpiry:"2026-10-01", lastUsed:"2026-06-01", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"High", notes:"" },
    { id:"PAM-006", account:"network_admin", type:"Network Admin", system:"LAN/WAN Infrastructure", owner:"N. Khumalo", department:"ICT", justification:"Network configuration and monitoring", lastPasswordChange:"2026-03-15", passwordExpiry:"2026-09-15", lastUsed:"2026-06-08", sessionRecorded:true, checkedOut:false, status:"Active", riskRating:"Critical", notes:"" },
  ],
  reviews: [
    { id:"REV-001", reviewer:"CIO", reviewCycle:"Semi-Annual", system:"All Systems", scope:"Full user access review", startDate:"2026-04-01", dueDate:"2026-04-30", status:"Overdue", usersReviewed:47, usersTotal:68, actionsRaised:8, actionsResolved:3, findings:"5 accounts with excessive access; 2 terminated user accounts active", certifiedBy:"", certifiedDate:"", notes:"Extended deadline — CFO accounts still pending" },
    { id:"REV-002", reviewer:"Finance Manager", reviewCycle:"Quarterly", system:"Financial System", scope:"Financial system access certification", startDate:"2026-04-01", dueDate:"2026-04-15", status:"Complete", usersReviewed:12, usersTotal:12, actionsRaised:2, actionsResolved:2, findings:"1 access level downgrade; 1 user removed", certifiedBy:"CFO", certifiedDate:"2026-04-14", notes:"Clean certification — no critical findings" },
    { id:"REV-003", reviewer:"HR Executive", reviewCycle:"Semi-Annual", system:"SAP HR / Payroll", scope:"HR and payroll system access review", startDate:"2026-05-01", dueDate:"2026-05-31", status:"In Progress", usersReviewed:8, usersTotal:15, actionsRaised:1, actionsResolved:0, findings:"1 terminated employee account still active", certifiedBy:"", certifiedDate:"", notes:"Urgent: USR-008 account must be revoked immediately" },
    { id:"REV-004", reviewer:"SCM Manager", reviewCycle:"Quarterly", system:"SCM / Supplier Portal", scope:"Procurement system access review", startDate:"2026-06-01", dueDate:"2026-06-30", status:"In Progress", usersReviewed:4, usersTotal:8, actionsRaised:3, actionsResolved:1, findings:"Segregation of duties violations in SCM approval workflow", certifiedBy:"", certifiedDate:"", notes:"CFO to review and certify" },
    { id:"REV-005", reviewer:"CIO", reviewCycle:"Annual", system:"Azure / Cloud", scope:"Privileged cloud access review", startDate:"2026-03-01", dueDate:"2026-03-31", status:"Overdue", usersReviewed:3, usersTotal:6, actionsRaised:4, actionsResolved:2, findings:"2 orphaned service accounts; 1 expired PAM credential", certifiedBy:"", certifiedDate:"", notes:"PAM-004 critical finding unresolved" },
  ],
};

// ─── IAM MODULE VIEW ──────────────────────────────────────────────────────────
function IAMModule() {
  const [sub, setSub]       = useState("dashboard");
  const [search, setSearch] = useState("");
  const [data, setData]     = useState(STATIC_IAM);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.iam) setData({ ...STATIC_IAM, ...d.iam });
    }).catch(()=>{});
  },[]);

  const users     = data.users     || [];
  const privileged = data.privileged || [];
  const reviews   = data.reviews   || [];

  const activeUsers    = users.filter(u=>u.status==="Active").length;
  const suspendedUsers = users.filter(u=>u.status==="Suspended").length;
  const criticalUsers  = users.filter(u=>u.riskRating==="Critical"||u.riskRating==="High").length;
  const noMFA          = users.filter(u=>!u.mfaEnabled&&u.status==="Active").length;
  const expiredPAM     = privileged.filter(p=>p.status==="Expired").length;
  const overdueReviews = reviews.filter(r=>r.status==="Overdue").length;

  const sc = s => {
    const v=(s||"").toLowerCase();
    if (v==="active"||v==="complete") return C.green;
    if (v==="suspended"||v==="expired"||v==="overdue"||v==="critical") return C.red;
    if (v==="in progress"||v==="elevated") return C.amber;
    return C.muted;
  };

  const filtered = arr => arr.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Identity & Access Management</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>User Access · Privileged Accounts · Access Reviews — Q2 2026/27</p>
        </div>
        <input placeholder="Search IAM…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:220 }}/>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Total Users",       users.length,    C.blue  ],
          ["Active",            activeUsers,      C.green ],
          ["Suspended/Inactive",suspendedUsers,   suspendedUsers>0?C.red:C.green ],
          ["No MFA (Active)",   noMFA,            noMFA>0?C.red:C.green ],
          ["PAM Expired",       expiredPAM,       expiredPAM>0?C.red:C.green ],
          ["Overdue Reviews",   overdueReviews,   overdueReviews>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Alert banners for critical items */}
      {(suspendedUsers>0||expiredPAM>0||noMFA>0) && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {users.filter(u=>u.status==="Suspended"&&u.riskRating==="Critical").map(u=>(
            <div key={u.id} style={{ background:"rgba(248,81,73,0.1)", border:`1px solid ${C.red}`, borderRadius:8, padding:"0.75rem 1rem", fontSize:"0.82rem", color:C.red, fontWeight:600 }}>
              🚨 <strong>{u.id} — {u.name}</strong>: {u.notes}
            </div>
          ))}
          {privileged.filter(p=>p.status==="Expired").map(p=>(
            <div key={p.id} style={{ background:"rgba(248,81,73,0.1)", border:`1px solid ${C.red}`, borderRadius:8, padding:"0.75rem 1rem", fontSize:"0.82rem", color:C.red, fontWeight:600 }}>
              🔐 <strong>{p.id} — {p.account}</strong>: {p.notes}
            </div>
          ))}
        </div>
      )}

      {/* Sub tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[
          ["users","👤 User Access Register"],
          ["privileged","🔐 Privileged Access (PAM)"],
          ["reviews","📋 Access Reviews"],
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* USER ACCESS REGISTER */}
      {sub==="users" && (
        <Card>
          <Table
            headers={["ID","Name","Department","Systems","Access Level","MFA","Risk","Status","Next Review"]}
            rows={filtered(users).map(u=>[
              <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
              <div><div style={{ fontWeight:600, fontSize:"0.82rem" }}>{u.name}</div><div style={{ color:C.muted, fontSize:"0.7rem" }}>{u.jobTitle}</div></div>,
              u.department,
              <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                {(u.systems||[]).slice(0,3).map(s=>(
                  <span key={s} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:3, padding:"1px 5px", fontSize:"0.65rem", color:C.muted }}>{s}</span>
                ))}
                {u.systems?.length>3 && <span style={{ fontSize:"0.65rem", color:C.muted }}>+{u.systems.length-3}</span>}
              </div>,
              <Badge label={u.accessLevel} color={u.accessLevel==="Admin"||u.accessLevel==="Service"?"red":u.accessLevel==="Elevated"?"amber":"green"}/>,
              <span style={{ color:u.mfaEnabled?C.green:C.red, fontWeight:700, fontSize:"0.8rem" }}>{u.mfaEnabled?"✓ On":"✗ Off"}</span>,
              <Badge label={u.riskRating} color={u.riskRating==="Critical"||u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
              <span style={{ color:sc(u.status), fontWeight:700, fontSize:"0.8rem" }}>{u.status}</span>,
              <span style={{ color:new Date(u.nextReview)<new Date()?C.red:C.muted, fontSize:"0.75rem" }}>{u.nextReview}</span>,
            ])}
          />
        </Card>
      )}

      {/* PRIVILEGED ACCESS */}
      {sub==="privileged" && (
        <Card>
          <Table
            headers={["ID","Account","Type","System","Owner","Last Used","Expiry","Recorded","Status"]}
            rows={filtered(privileged).map(p=>[
              <span style={{ color:C.red, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
              <span style={{ fontFamily:"monospace", fontSize:"0.78rem", color:C.amber }}>{p.account}</span>,
              <Badge label={p.type} color="blue"/>,
              p.system,
              p.owner,
              <span style={{ color:C.muted, fontSize:"0.75rem" }}>{p.lastUsed}</span>,
              <span style={{ color:new Date(p.passwordExpiry)<new Date()?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.passwordExpiry}</span>,
              <span style={{ color:p.sessionRecorded?C.green:C.red, fontWeight:700, fontSize:"0.78rem" }}>{p.sessionRecorded?"✓":"✗"}</span>,
              <span style={{ color:sc(p.status), fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
            ])}
          />
        </Card>
      )}

      {/* ACCESS REVIEWS */}
      {sub==="reviews" && (
        <Card>
          <Table
            headers={["ID","System","Reviewer","Cycle","Due Date","Progress","Actions","Status","Certified By"]}
            rows={filtered(reviews).map(r=>{
              const pct = Math.round((r.usersReviewed/Math.max(r.usersTotal,1))*100);
              const isOverdue = r.status==="Overdue"||new Date(r.dueDate)<new Date();
              return [
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{r.id}</span>,
                <div><div style={{ fontWeight:600, fontSize:"0.82rem" }}>{r.system}</div><div style={{ color:C.muted, fontSize:"0.7rem" }}>{r.scope}</div></div>,
                r.reviewer,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{r.reviewCycle}</span>,
                <span style={{ color:isOverdue?C.red:C.text, fontWeight:isOverdue?700:400, fontSize:"0.78rem" }}>{r.dueDate}{isOverdue&&r.status!=="Complete"?" ⚠":""}</span>,
                <div style={{ minWidth:100 }}>
                  <div style={{ fontSize:"0.7rem", color:C.muted, marginBottom:2 }}>{r.usersReviewed}/{r.usersTotal} users</div>
                  <ProgressBar value={pct} color={pct===100?C.green:pct>50?C.amber:C.red}/>
                </div>,
                <span style={{ color:r.actionsRaised>r.actionsResolved?C.red:C.green, fontWeight:700, fontSize:"0.78rem" }}>{r.actionsResolved}/{r.actionsRaised} resolved</span>,
                <span style={{ color:sc(r.status), fontWeight:700, fontSize:"0.8rem" }}>{r.status}</span>,
                <span style={{ color:r.certifiedBy?C.green:C.muted, fontSize:"0.75rem" }}>{r.certifiedBy||"Pending"}</span>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}

// ─── IAM ADMIN ────────────────────────────────────────────────────────────────
function IAMAdmin() {
  const [view, setView]       = useState("users");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { users:STATIC_IAM.users, privileged:STATIC_IAM.privileged, reviews:STATIC_IAM.reviews };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.iam?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.iam) data.iam = {};
    data.iam[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.iam = { users:STATIC_IAM.users, privileged:STATIC_IAM.privileged, reviews:STATIC_IAM.reviews };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed");
      showToast(`✅ Seeded ${STATIC_IAM.users.length} users, ${STATIC_IAM.privileged.length} PAM accounts, ${STATIC_IAM.reviews.length} reviews.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i=>i.id!==id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function UserForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", name:"", department:"", jobTitle:"", systems:"", accessLevel:"Standard", status:"Active", lastReview:"", nextReview:"", mfaEnabled:false, accountCreated:"", riskRating:"Medium", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial, systems:Array.isArray(initial.systems)?initial.systems.join(", "):initial.systems||"" });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit User":"Add User"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="User ID" value={f.id} onChange={set("id")} required placeholder="USR-011"/>
          <FInput label="Full Name" value={f.name} onChange={set("name")} required placeholder="e.g. J. Smith"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. Finance"/>
          <FInput label="Job Title" value={f.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Finance Officer"/>
        </div>
        <FInput label="Systems Access (comma-separated)" value={f.systems} onChange={set("systems")} placeholder="e.g. Financial System, SAP HR, Email"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Access Level" value={f.accessLevel} onChange={set("accessLevel")} options={["Standard","Elevated","Admin","Service","Read-Only"]}/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Active","Suspended","Inactive","Locked"]}/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["Critical","High","Medium","Low"]}/>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>MFA Enabled</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="mfa" value={opt} checked={(f.mfaEnabled?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, mfaEnabled:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Account Created" value={f.accountCreated} onChange={set("accountCreated")} type="date"/>
          <FInput label="Last Review" value={f.lastReview} onChange={set("lastReview")} type="date"/>
          <FInput label="Next Review" value={f.nextReview} onChange={set("nextReview")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Access justification or risk notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave({ ...f, systems:f.systems.split(",").map(s=>s.trim()).filter(Boolean) })} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add User"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function PAMForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", account:"", type:"Local Admin", system:"", owner:"", department:"", justification:"", lastPasswordChange:"", passwordExpiry:"", lastUsed:"", sessionRecorded:false, checkedOut:false, status:"Active", riskRating:"Critical", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.red}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.red, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit PAM Account":"Add Privileged Account"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="PAM ID" value={f.id} onChange={set("id")} required placeholder="PAM-007"/>
          <FInput label="Account Name" value={f.account} onChange={set("account")} required placeholder="e.g. sa_backup_admin"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Account Type" value={f.type} onChange={set("type")} options={["Local Admin","Domain Admin","Cloud Admin","Application Admin","Network Admin","Database Admin","Service Account"]}/>
          <FInput label="System" value={f.system} onChange={set("system")} placeholder="e.g. Windows Servers"/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["Critical","High","Medium"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Account Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. N. Khumalo"/>
          <FInput label="Department" value={f.department} onChange={set("department")} placeholder="e.g. ICT"/>
        </div>
        <FTextarea label="Business Justification" value={f.justification} onChange={set("justification")} rows={2} placeholder="Why is this privileged account required?"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Last Password Change" value={f.lastPasswordChange} onChange={set("lastPasswordChange")} type="date"/>
          <FInput label="Password Expiry" value={f.passwordExpiry} onChange={set("passwordExpiry")} type="date"/>
          <FInput label="Last Used" value={f.lastUsed} onChange={set("lastUsed")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Active","Expired","Suspended","Decommissioned"]}/>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>Session Recorded</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="rec" value={opt} checked={(f.sessionRecorded?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, sessionRecorded:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <FTextarea label="Notes / Risk Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Security notes or action required…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.red, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add PAM Account"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function ReviewForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", reviewer:"", reviewCycle:"Quarterly", system:"", scope:"", startDate:"", dueDate:"", status:"In Progress", usersReviewed:"0", usersTotal:"0", actionsRaised:"0", actionsResolved:"0", findings:"", certifiedBy:"", certifiedDate:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.green}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.green, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Review":"Add Access Review"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:"1rem" }}>
          <FInput label="Review ID" value={f.id} onChange={set("id")} required placeholder="REV-006"/>
          <FInput label="System / Scope" value={f.system} onChange={set("system")} required placeholder="e.g. Financial System"/>
        </div>
        <FInput label="Review Scope Description" value={f.scope} onChange={set("scope")} placeholder="e.g. Full user access certification"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Reviewer" value={f.reviewer} onChange={set("reviewer")} placeholder="e.g. CIO"/>
          <FSelect label="Review Cycle" value={f.reviewCycle} onChange={set("reviewCycle")} options={["Monthly","Quarterly","Semi-Annual","Annual","Ad Hoc"]}/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Not Started","In Progress","Overdue","Complete"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Start Date" value={f.startDate} onChange={set("startDate")} type="date"/>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Users Reviewed" value={f.usersReviewed} onChange={set("usersReviewed")} type="number" placeholder="0"/>
          <FInput label="Total Users" value={f.usersTotal} onChange={set("usersTotal")} type="number" placeholder="0"/>
          <FInput label="Actions Raised" value={f.actionsRaised} onChange={set("actionsRaised")} type="number" placeholder="0"/>
          <FInput label="Actions Resolved" value={f.actionsResolved} onChange={set("actionsResolved")} type="number" placeholder="0"/>
        </div>
        <FTextarea label="Findings" value={f.findings} onChange={set("findings")} rows={2} placeholder="Key findings from the review…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Certified By" value={f.certifiedBy} onChange={set("certifiedBy")} placeholder="e.g. CFO"/>
          <FInput label="Certification Date" value={f.certifiedDate} onChange={set("certifiedDate")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Review"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="users" ? UserForm : view==="privileged" ? PAMForm : ReviewForm;
  const addColor = view==="users" ? C.blue : view==="privileged" ? C.red : C.green;
  const addLabel = view==="users" ? "Add User" : view==="privileged" ? "Add PAM Account" : "Add Review";

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["users","👤 Users"],["privileged","🔐 PAM"],["reviews","📋 Reviews"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            {view==="users"?"User Access Register":view==="privileged"?"Privileged Access (PAM)":"Access Reviews"} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.red||addColor===C.blue?"#fff":C.bg, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ {addLabel}</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>🌱 Seed Demo Data</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="users" && (
            <Table
              headers={["ID","Name","Department","Access Level","MFA","Risk","Status","Actions"]}
              rows={items.map(u=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{u.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem" }}>{u.name}</span>,
                u.department,
                <Badge label={u.accessLevel} color={u.accessLevel==="Admin"||u.accessLevel==="Service"?"red":u.accessLevel==="Elevated"?"amber":"green"}/>,
                <span style={{ color:u.mfaEnabled?C.green:C.red, fontWeight:700 }}>{u.mfaEnabled?"✓":"✗"}</span>,
                <Badge label={u.riskRating} color={u.riskRating==="Critical"||u.riskRating==="High"?"red":u.riskRating==="Medium"?"amber":"green"}/>,
                <span style={{ fontWeight:700, fontSize:"0.8rem" }}>{u.status}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...u })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(u.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="privileged" && (
            <Table
              headers={["ID","Account","Type","System","Owner","Expiry","Recorded","Status","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.red, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ fontFamily:"monospace", fontSize:"0.78rem", color:C.amber }}>{p.account}</span>,
                <Badge label={p.type} color="blue"/>,
                p.system,
                p.owner,
                <span style={{ color:new Date(p.passwordExpiry)<new Date()?C.red:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.passwordExpiry}</span>,
                <span style={{ color:p.sessionRecorded?C.green:C.red, fontWeight:700 }}>{p.sessionRecorded?"✓":"✗"}</span>,
                <span style={{ color:p.status==="Active"?C.green:C.red, fontWeight:700, fontSize:"0.8rem" }}>{p.status}</span>,
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                </div>,
              ])}
            />
          )}
          {view==="reviews" && (
            <Table
              headers={["ID","System","Reviewer","Cycle","Due Date","Progress","Status","Certified","Actions"]}
              rows={items.map(r=>{
                const pct = Math.round((Number(r.usersReviewed)/Math.max(Number(r.usersTotal),1))*100);
                return [
                  <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{r.id}</span>,
                  r.system,
                  r.reviewer,
                  r.reviewCycle,
                  <span style={{ color:r.status==="Overdue"?C.red:C.muted, fontSize:"0.78rem" }}>{r.dueDate}</span>,
                  <div style={{ minWidth:80 }}><ProgressBar value={pct} color={pct===100?C.green:pct>50?C.amber:C.red}/></div>,
                  <span style={{ color:r.status==="Complete"?C.green:r.status==="Overdue"?C.red:C.amber, fontWeight:700, fontSize:"0.8rem" }}>{r.status}</span>,
                  <span style={{ color:r.certifiedBy?C.green:C.muted, fontSize:"0.75rem" }}>{r.certifiedBy||"Pending"}</span>,
                  <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button onClick={()=>setMode({ ...r })} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                    <button onClick={()=>setConfirmDel(r.id)} disabled={!!mode} style={{ padding:"0.3rem 0.75rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:6, fontSize:"0.78rem", cursor:"pointer", opacity:mode?0.4:1 }}>Delete</button>
                  </div>,
                ];
              })}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── POLICY & PROCESS DATA ────────────────────────────────────────────────────
const STATIC_POLICY = {
  policies: [
    { id:"POL-001", title:"Risk Management Policy", complianceRef:["CU-001","CU-005"], category:"Governance", owner:"CRO", version:"v3.2", status:"Published", lifecycle:"Published", createdDate:"2024-03-01", reviewDate:"2026-03-01", nextReview:"2027-03-01", approvedBy:"Board", approvalDate:"2024-03-15", description:"Establishes LGSETA's enterprise risk management framework, appetite and tolerance levels.", linkedLegislation:"PFMA / King IV", tags:["Risk","ERM","Governance"], notes:"Next review aligned to Board cycle" },
    { id:"POL-002", title:"Fraud Prevention Policy", complianceRef:["CU-010","CU-011"], category:"Ethics & Integrity", owner:"Legal", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2023-06-01", reviewDate:"2025-06-01", nextReview:"2026-06-01", approvedBy:"Audit & Risk Committee", approvalDate:"2023-06-20", description:"Defines LGSETA's zero-tolerance approach to fraud, corruption and unethical conduct.", linkedLegislation:"PRECCA / PFMA", tags:["Fraud","Ethics","PRECCA"], notes:"Overdue for review — update required" },
    { id:"POL-003", title:"Information Security Policy", complianceRef:["CU-004","CU-011"], category:"ICT & Security", owner:"CIO", version:"v1.5", status:"Under Review", lifecycle:"Review", createdDate:"2022-01-15", reviewDate:"2025-01-15", nextReview:"2026-01-15", approvedBy:"", approvalDate:"", description:"Governs the protection of LGSETA information assets, cybersecurity controls and data classification.", linkedLegislation:"POPIA / King IV", tags:["ICT","Security","POPIA"], notes:"Being updated to align with POPIA compliance audit findings" },
    { id:"POL-004", title:"Supply Chain Management Policy", complianceRef:["CU-001","CU-006"], category:"Financial Management", owner:"CFO", version:"v4.0", status:"Published", lifecycle:"Published", createdDate:"2023-09-01", reviewDate:"2025-09-01", nextReview:"2026-09-01", approvedBy:"Accounting Authority", approvalDate:"2023-09-15", description:"Governs procurement, tender processes and SCM compliance with PFMA prescripts.", linkedLegislation:"PFMA / PPPFA / Treasury Regulations", tags:["SCM","Procurement","PFMA"], notes:"" },
    { id:"POL-005", title:"Human Resources Policy", complianceRef:["CU-007","CU-008"], category:"Human Resources", owner:"HR Executive", version:"v2.3", status:"Published", lifecycle:"Published", createdDate:"2023-01-10", reviewDate:"2025-01-10", nextReview:"2026-01-10", approvedBy:"CEO", approvalDate:"2023-01-25", description:"Covers recruitment, performance management, leave, discipline and grievance procedures.", linkedLegislation:"LRA / BCEA / Employment Equity Act", tags:["HR","Employees","LRA"], notes:"" },
    { id:"POL-006", title:"POPIA Compliance Policy", complianceRef:["CU-004","CU-011"], category:"Data Protection", owner:"CIO", version:"v1.0", status:"Draft", lifecycle:"Draft", createdDate:"2026-05-01", reviewDate:"", nextReview:"2026-09-30", approvedBy:"", approvalDate:"", description:"Defines LGSETA's obligations and controls under the Protection of Personal Information Act.", linkedLegislation:"POPIA Act 4 of 2013", tags:["POPIA","Data","Privacy"], notes:"First draft — awaiting CIO review" },
    { id:"POL-007", title:"Business Continuity Management Policy", complianceRef:["CU-001","CU-006"], category:"BCM", owner:"COO", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2024-03-15", reviewDate:"2026-03-15", nextReview:"2027-03-15", approvedBy:"Business Continuity Committee", approvalDate:"2024-03-20", description:"Establishes LGSETA's BCM framework, governance and minimum business continuity requirements.", linkedLegislation:"PFMA / DPSA BCM Framework / ISO 22301", tags:["BCM","Continuity","Resilience"], notes:"" },
    { id:"POL-008", title:"Declaration of Interest Policy", complianceRef:["CU-010","CU-005"], category:"Ethics & Integrity", owner:"Legal", version:"v1.2", status:"Published", lifecycle:"Published", createdDate:"2023-11-01", reviewDate:"2025-11-01", nextReview:"2026-11-01", approvedBy:"CEO", approvalDate:"2023-11-15", description:"Requires all officials to disclose conflicts of interest, gifts, outside positions and related party relationships.", linkedLegislation:"PRECCA / PFMA / King IV", tags:["Ethics","Declaration","COI"], notes:"" },
  ],
  processes: [
    { id:"PRC-001", title:"Grant Disbursement Process", category:"Grants Management", owner:"COO", version:"v3.0", status:"Published", lifecycle:"Published", processType:"Core Business", createdDate:"2023-04-01", reviewDate:"2025-04-01", nextReview:"2026-04-01", approvedBy:"COO", approvalDate:"2023-04-10", steps:8, hasFlowchart:true, hasSchema:true, relatedForms:["Grant Application Form","Provider Agreement","Disbursement Approval"], linkedPolicy:"POL-004", description:"End-to-end process for evaluating, approving and disbursing discretionary grants to training providers.", notes:"" },
    { id:"PRC-002", title:"Procurement & Tender Process", category:"Supply Chain", owner:"CFO", version:"v4.1", status:"Published", lifecycle:"Published", processType:"Compliance", createdDate:"2023-09-01", reviewDate:"2025-09-01", nextReview:"2026-09-01", approvedBy:"CFO", approvalDate:"2023-09-15", steps:12, hasFlowchart:true, hasSchema:true, relatedForms:["RFQ Form","Bid Evaluation Form","Award Recommendation"], linkedPolicy:"POL-004", description:"Full procurement lifecycle from needs identification through to contract award and management.", notes:"" },
    { id:"PRC-003", title:"Learner Registration & Certification", category:"ETQA", owner:"ETQA Manager", version:"v2.2", status:"Published", lifecycle:"Published", processType:"Core Business", createdDate:"2022-06-15", reviewDate:"2024-06-15", nextReview:"2026-06-15", approvedBy:"COO", approvalDate:"2022-06-20", steps:6, hasFlowchart:true, hasSchema:false, relatedForms:["Learner Registration Form","Assessment Record","Certificate Request"], linkedPolicy:"", description:"Process for registering learners, conducting assessments and issuing certificates via SAQA.", notes:"Overdue for review" },
    { id:"PRC-004", title:"Incident & Fraud Reporting Process", category:"Risk & Compliance", owner:"CRO", version:"v1.3", status:"Published", lifecycle:"Published", processType:"Compliance", createdDate:"2024-01-10", reviewDate:"2026-01-10", nextReview:"2027-01-10", approvedBy:"CEO", approvalDate:"2024-01-20", steps:7, hasFlowchart:true, hasSchema:false, relatedForms:["Incident Report Form","Fraud Hotline Form","Investigation Log"], linkedPolicy:"POL-002", description:"Process for reporting, investigating and resolving fraud, ethics violations and operational incidents.", notes:"" },
    { id:"PRC-005", title:"Annual Performance Plan (APP) Monitoring", category:"Strategy & Performance", owner:"CEO", version:"v2.0", status:"Published", lifecycle:"Published", processType:"Governance", createdDate:"2023-04-01", reviewDate:"2025-04-01", nextReview:"2026-04-01", approvedBy:"Board", approvalDate:"2023-04-15", steps:5, hasFlowchart:false, hasSchema:true, relatedForms:["Quarterly Report Template","Evidence Register","Deviation Report"], linkedPolicy:"", description:"Process for monitoring, reporting and escalating APP target performance on a quarterly basis.", notes:"" },
    { id:"PRC-006", title:"User Access Provisioning & Deprovisioning", category:"ICT & Security", owner:"CIO", version:"v1.1", status:"Under Review", lifecycle:"Review", processType:"Compliance", createdDate:"2023-08-01", reviewDate:"2025-08-01", nextReview:"2026-08-01", approvedBy:"", approvalDate:"", steps:8, hasFlowchart:true, hasSchema:true, relatedForms:["Access Request Form","Access Termination Form","PAM Checklist"], linkedPolicy:"POL-003", description:"Process for provisioning, modifying and revoking user access across all LGSETA systems.", notes:"Being updated following IAM review findings" },
  ],
  documents: [
    { id:"DOC-001", title:"Grant Application Form", category:"Forms", docType:"Form", owner:"COO", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2023-04-01", reviewDate:"2025-04-01", nextReview:"2026-04-01", format:"PDF / Word", linkedProcess:"PRC-001", description:"Standard application form for training providers applying for discretionary grants.", notes:"" },
    { id:"DOC-002", title:"Risk Register Schema", category:"Templates", docType:"Schema", owner:"CRO", version:"v3.0", status:"Published", lifecycle:"Published", createdDate:"2024-01-15", reviewDate:"2026-01-15", nextReview:"2027-01-15", format:"Excel", linkedProcess:"", description:"Standardised data schema for capturing and classifying risks across all LGSETA departments.", notes:"Aligned to ERM framework v3.2" },
    { id:"DOC-003", title:"Bid Evaluation Committee Template", category:"Templates", docType:"Template", owner:"CFO", version:"v1.5", status:"Published", lifecycle:"Published", createdDate:"2023-09-01", reviewDate:"2025-09-01", nextReview:"2026-09-01", format:"Word", linkedProcess:"PRC-002", description:"Standardised BEC scoring template ensuring consistency in tender evaluation.", notes:"" },
    { id:"DOC-004", title:"POPIA Privacy Notice Template", category:"Templates", docType:"Template", owner:"CIO", version:"v1.0", status:"Draft", lifecycle:"Draft", createdDate:"2026-05-15", reviewDate:"", nextReview:"2026-09-30", format:"Word", linkedProcess:"", description:"Template for staff and external stakeholder privacy notices in compliance with POPIA.", notes:"Awaiting POPIA policy approval before finalising" },
    { id:"DOC-005", title:"Board Resolution Template", category:"Governance", docType:"Template", owner:"CEO", version:"v2.0", status:"Published", lifecycle:"Published", createdDate:"2022-01-01", reviewDate:"2025-01-01", nextReview:"2026-01-01", format:"Word", linkedProcess:"", description:"Standard template for recording and circulating Board resolutions.", notes:"" },
    { id:"DOC-006", title:"Declaration of Interest Form", category:"Forms", docType:"Form", owner:"Legal", version:"v1.2", status:"Published", lifecycle:"Published", createdDate:"2023-11-01", reviewDate:"2025-11-01", nextReview:"2026-11-01", format:"PDF / Online", linkedProcess:"PRC-004", description:"Mandatory annual declaration form for all LGSETA officials.", notes:"Available via GRC portal" },
    { id:"DOC-007", title:"Business Impact Analysis Template", category:"Templates", docType:"Template", owner:"COO", version:"v2.1", status:"Published", lifecycle:"Published", createdDate:"2024-03-15", reviewDate:"2026-03-15", nextReview:"2027-03-15", format:"Excel", linkedProcess:"", description:"BIA template aligned to ISO 22301 for capturing critical process dependencies and recovery objectives.", notes:"" },
    { id:"DOC-008", title:"Incident Report Form", category:"Forms", docType:"Form", owner:"CRO", version:"v1.3", status:"Published", lifecycle:"Published", createdDate:"2024-01-10", reviewDate:"2026-01-10", nextReview:"2027-01-10", format:"PDF / Online", linkedProcess:"PRC-004", description:"Standardised form for reporting operational incidents, fraud and ethics violations.", notes:"" },
    { id:"DOC-009", title:"Data Flow Diagram — Learner Records", category:"Schemas", docType:"Schema", owner:"CIO", version:"v1.0", status:"Under Review", lifecycle:"Review", createdDate:"2026-04-01", reviewDate:"", nextReview:"2026-09-30", format:"Visio / PDF", linkedProcess:"PRC-003", description:"End-to-end data flow diagram showing how learner personal information is collected, stored and shared.", notes:"POPIA compliance review in progress" },
  ],
};

// ─── POLICY & PROCESS MODULE VIEW ────────────────────────────────────────────
function PolicyModule() {
  const [sub, setSub]       = useState("policies");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [data, setData]     = useState(STATIC_POLICY);

  const [complianceData, setComplianceData] = useState([]);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.policyManual) setData({ ...STATIC_POLICY, ...d.policyManual });
      if (d.compliance?.universe) setComplianceData(d.compliance.universe);
      else setComplianceData(STATIC_COMPLIANCE.universe);
    }).catch(()=>{});
  },[]);

  // Helper: get compliance status for a policy's linked legislation
  function getComplianceStatus(complianceRefs) {
    if (!complianceRefs?.length) return null;
    const linked = complianceData.filter(c => complianceRefs.includes(c.id));
    if (linked.some(c=>c.complianceStatus==="Non-Compliant")) return { status:"Non-Compliant", color:C.red };
    if (linked.some(c=>c.complianceStatus==="Partial")) return { status:"Partial", color:C.amber };
    if (linked.every(c=>c.complianceStatus==="Compliant")) return { status:"Compliant", color:C.green };
    return null;
  }

  const policies  = data.policies  || [];
  const processes = data.processes || [];
  const documents = data.documents || [];

  // Auto-flagged policies: linked legislation is Non-Compliant or Partial
  const flaggedPolicies = policies.filter(p => {
    const cs = getComplianceStatus(p.complianceRef);
    return cs && (cs.status==="Non-Compliant" || cs.status==="Partial");
  });

  const published = policies.filter(p=>p.lifecycle==="Published").length;
  const draft     = policies.filter(p=>p.lifecycle==="Draft").length;
  const review    = policies.filter(p=>p.lifecycle==="Review").length;
  const overdue   = [...policies,...processes,...documents].filter(d=>d.nextReview && new Date(d.nextReview)<new Date() && d.lifecycle==="Published").length;

  const LIFECYCLE_COLORS = {
    "Draft":    C.muted,
    "Review":   C.amber,
    "Approved": C.blue,
    "Published":C.green,
    "Archived": C.muted,
  };

  function LifecyclePill({ status }) {
    const c = LIFECYCLE_COLORS[status] || C.muted;
    return <span style={{ background:`${c}22`, color:c, border:`1px solid ${c}`, borderRadius:4, padding:"2px 8px", fontSize:"0.72rem", fontWeight:700 }}>{status}</span>;
  }

  function LifecycleBar({ status }) {
    const steps = ["Draft","Review","Approved","Published"];
    const idx   = steps.indexOf(status);
    return (
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        {steps.map((s,i)=>{
          const done    = i < idx;
          const current = i === idx;
          const c = done?C.green:current?C.blue:C.border;
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ fontSize:"0.6rem", fontWeight:700, color:done?C.green:current?C.blue:C.muted,
                borderBottom:`2px solid ${c}`, paddingBottom:1, whiteSpace:"nowrap" }}>{s}</div>
              {i<steps.length-1&&<div style={{ color:C.border, fontSize:"0.65rem" }}>→</div>}
            </div>
          );
        })}
      </div>
    );
  }

  const sc = s => {
    if (s==="Published") return C.green;
    if (s==="Draft") return C.muted;
    if (s==="Review"||s==="Under Review") return C.amber;
    if (s==="Archived") return C.red;
    return C.muted;
  };

  const filterFn = arr => arr.filter(d=>
    (filterStatus==="All" || d.lifecycle===filterStatus) &&
    JSON.stringify(d).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Policy & Process Manual</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Policy Register · Process Manual · Document Library — Q2 2026/27</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:200 }}/>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inputSt}>
            {["All","Draft","Review","Approved","Published","Archived"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"0.75rem" }}>
        {[
          ["Policies",    policies.length,  C.blue  ],
          ["Processes",   processes.length, C.purple ],
          ["Documents",   documents.length, C.cyan  ],
          ["Published",   published,        C.green ],
          ["Under Review",review,           C.amber ],
          ["Overdue Review",overdue,        overdue>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Compliance linkage alerts */}
      {flaggedPolicies.length > 0 && (
        <div style={{ background:"rgba(248,81,73,0.08)", border:`1px solid ${C.red}`, borderRadius:10, padding:"1rem 1.25rem" }}>
          <div style={{ color:C.red, fontWeight:700, fontSize:"0.85rem", marginBottom:"0.5rem" }}>
            ⚠ {flaggedPolicies.length} {flaggedPolicies.length===1?"policy requires":"policies require"} review due to compliance status changes
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
            {flaggedPolicies.map(p => {
              const cs = getComplianceStatus(p.complianceRef);
              return (
                <div key={p.id} onClick={()=>{ setSub("policies"); setSelected(p); }}
                  style={{ background:C.card, border:`1px solid ${cs.color}`, borderRadius:8, padding:"0.5rem 0.85rem", cursor:"pointer" }}>
                  <div style={{ color:cs.color, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</div>
                  <div style={{ color:C.text, fontSize:"0.8rem", fontWeight:600 }}>{p.title}</div>
                  <div style={{ color:cs.color, fontSize:"0.7rem" }}>Linked legislation: {cs.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[["policies","📜 Policy Register"],["processes","⚙ Process Manual"],["documents","📁 Document Library"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ setSub(id); setSelected(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background:C.card, border:`1px solid ${C.blue}`, borderRadius:12, padding:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
            <div>
              <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", marginBottom:"0.3rem" }}>
                <span style={{ color:C.blue, fontWeight:800 }}>{selected.id}</span>
                <LifecyclePill status={selected.lifecycle}/>
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>{selected.version}</span>
              </div>
              <h3 style={{ color:C.text, margin:"0 0 0.25rem", fontWeight:700 }}>{selected.title}</h3>
              <p style={{ color:C.muted, margin:0, fontSize:"0.82rem" }}>{selected.category} · Owner: {selected.owner}</p>
            </div>
            <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
          </div>
          <LifecycleBar status={selected.lifecycle}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem", marginTop:"1rem" }}>
            <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Approved By</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.approvedBy||"Pending"}</div></div>
            <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Approval Date</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.approvalDate||"—"}</div></div>
            <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Next Review</div><div style={{ color:selected.nextReview&&new Date(selected.nextReview)<new Date()?C.red:C.text, fontSize:"0.85rem", fontWeight:selected.nextReview&&new Date(selected.nextReview)<new Date()?700:400 }}>{selected.nextReview||"—"}</div></div>
            {selected.linkedLegislation && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Linked Legislation</div><div style={{ color:C.blue, fontSize:"0.85rem" }}>{selected.linkedLegislation}</div></div>}
            {selected.linkedProcess && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Linked Process</div><div style={{ color:C.blue, fontSize:"0.85rem" }}>{selected.linkedProcess}</div></div>}
            {selected.linkedPolicy && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Linked Policy</div><div style={{ color:C.blue, fontSize:"0.85rem" }}>{selected.linkedPolicy}</div></div>}
            {selected.steps && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Process Steps</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.steps}</div></div>}
            {selected.format && <div><div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700 }}>Format</div><div style={{ color:C.text, fontSize:"0.85rem" }}>{selected.format}</div></div>}
          </div>
          <div style={{ marginTop:"0.75rem" }}>
            <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>Description</div>
            <div style={{ color:C.text, fontSize:"0.85rem", lineHeight:1.65 }}>{selected.description}</div>
          </div>
          {selected.relatedForms?.length>0 && (
            <div style={{ marginTop:"0.75rem" }}>
              <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.4rem" }}>Related Forms / Templates</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {selected.relatedForms.map(f=>(
                  <span key={f} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 8px", fontSize:"0.75rem", color:C.muted }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {selected.tags?.length>0 && (
            <div style={{ marginTop:"0.75rem" }}>
              <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.4rem" }}>Tags</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
                {selected.tags.map(t=>(
                  <span key={t} style={{ background:"rgba(88,166,255,0.1)", border:`1px solid ${C.blue}`, borderRadius:4, padding:"2px 8px", fontSize:"0.75rem", color:C.blue }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {selected.notes && <div style={{ marginTop:"0.75rem", color:C.muted, fontSize:"0.82rem", padding:"0.5rem 0.75rem", background:C.surface, borderRadius:6, borderLeft:`3px solid ${C.amber}` }}>{selected.notes}</div>}

          {/* Live compliance status for linked legislation */}
          {selected.complianceRef?.length > 0 && (
            <div style={{ marginTop:"0.75rem" }}>
              <div style={{ color:C.muted, fontSize:"0.7rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.4rem" }}>Live Compliance Status (Linked Legislation)</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
                {complianceData.filter(c=>selected.complianceRef?.includes(c.id)).map(c=>(
                  <div key={c.id} style={{ background:C.surface, border:`1px solid ${c.complianceStatus==="Compliant"?C.green:c.complianceStatus==="Non-Compliant"?C.red:C.amber}`, borderRadius:6, padding:"0.4rem 0.75rem" }}>
                    <div style={{ color:C.blue, fontWeight:700, fontSize:"0.7rem" }}>{c.id}</div>
                    <div style={{ color:C.text, fontSize:"0.78rem", fontWeight:600 }}>{c.legislation}</div>
                    <div style={{ color:c.complianceStatus==="Compliant"?C.green:c.complianceStatus==="Non-Compliant"?C.red:C.amber, fontSize:"0.72rem", fontWeight:700 }}>{c.complianceStatus}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* POLICIES */}
      {sub==="policies" && (
        <Card>
          <Table
            headers={["ID","Title","Category","Owner","Version","Lifecycle","Legislation Status","Next Review"]}
            rows={filterFn(policies).map(p=>{
              const cs = getComplianceStatus(p.complianceRef);
              return [
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(p)}>{p.id}</span>,
                <div style={{ cursor:"pointer" }} onClick={()=>setSelected(p)}>
                  <div style={{ fontWeight:600, fontSize:"0.82rem", color:C.text }}>{p.title}</div>
                  <div style={{ color:C.muted, fontSize:"0.7rem" }}>{p.description?.slice(0,60)}…</div>
                </div>,
                <Badge label={p.category} color="blue"/>,
                p.owner,
                <span style={{ color:C.muted, fontSize:"0.75rem", fontFamily:"monospace" }}>{p.version}</span>,
                <span style={{ color:sc(p.lifecycle), fontWeight:700, fontSize:"0.78rem" }}>{p.lifecycle}</span>,
                cs ? (
                  <span style={{ color:cs.color, fontWeight:700, fontSize:"0.75rem", display:"flex", alignItems:"center", gap:3 }}>
                    {cs.status==="Non-Compliant"?"🔴":cs.status==="Partial"?"🟡":"🟢"} {cs.status}
                  </span>
                ) : <span style={{ color:C.muted, fontSize:"0.75rem" }}>—</span>,
                <span style={{ color:p.nextReview&&new Date(p.nextReview)<new Date()?C.red:C.muted, fontWeight:p.nextReview&&new Date(p.nextReview)<new Date()?700:400, fontSize:"0.75rem" }}>{p.nextReview||"—"}</span>,
              ];
            })}
          />
        </Card>
      )}

      {/* PROCESSES */}
      {sub==="processes" && (
        <Card>
          <Table
            headers={["ID","Title","Category","Owner","Type","Steps","Schema","Lifecycle","Next Review"]}
            rows={filterFn(processes).map(p=>[
              <span style={{ color:C.purple, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(p)}>{p.id}</span>,
              <div style={{ cursor:"pointer" }} onClick={()=>setSelected(p)}>
                <div style={{ fontWeight:600, fontSize:"0.82rem" }}>{p.title}</div>
              </div>,
              <Badge label={p.category} color="blue"/>,
              p.owner,
              <Badge label={p.processType} color={p.processType==="Compliance"?"amber":p.processType==="Governance"?"blue":"green"}/>,
              <span style={{ color:C.blue, fontWeight:700 }}>{p.steps}</span>,
              <span style={{ color:p.hasSchema?C.green:C.muted, fontWeight:700 }}>{p.hasSchema?"✓ Yes":"—"}</span>,
              <span style={{ color:sc(p.lifecycle), fontWeight:700, fontSize:"0.78rem" }}>{p.lifecycle}</span>,
              <span style={{ color:p.nextReview&&new Date(p.nextReview)<new Date()?C.red:C.muted, fontSize:"0.75rem" }}>{p.nextReview||"—"}</span>,
            ])}
          />
        </Card>
      )}

      {/* DOCUMENTS */}
      {sub==="documents" && (
        <Card>
          <Table
            headers={["ID","Title","Category","Type","Owner","Format","Version","Lifecycle"]}
            rows={filterFn(documents).map(d=>[
              <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }} onClick={()=>setSelected(d)}>{d.id}</span>,
              <div style={{ cursor:"pointer" }} onClick={()=>setSelected(d)}>
                <div style={{ fontWeight:600, fontSize:"0.82rem" }}>{d.title}</div>
              </div>,
              <Badge label={d.category} color="blue"/>,
              <Badge label={d.docType} color={d.docType==="Schema"?"purple":d.docType==="Template"?"amber":"green"}/>,
              d.owner,
              <span style={{ color:C.muted, fontSize:"0.75rem" }}>{d.format}</span>,
              <span style={{ fontFamily:"monospace", fontSize:"0.75rem", color:C.muted }}>{d.version}</span>,
              <span style={{ color:sc(d.lifecycle), fontWeight:700, fontSize:"0.78rem" }}>{d.lifecycle}</span>,
            ])}
          />
        </Card>
      )}
    </div>
  );
}

// ─── POLICY & PROCESS ADMIN ───────────────────────────────────────────────────
function PolicyAdmin() {
  const [view, setView]       = useState("policies");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }

  const DEFAULTS = { policies:STATIC_POLICY.policies, processes:STATIC_POLICY.processes, documents:STATIC_POLICY.documents };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.policyManual?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.policyManual) data.policyManual = {};
    data.policyManual[view] = updatedItems;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.policyManual = { policies:STATIC_POLICY.policies, processes:STATIC_POLICY.processes, documents:STATIC_POLICY.documents };
      const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      if (!saveRes.ok) throw new Error("Failed to seed");
      showToast(`✅ Seeded ${STATIC_POLICY.policies.length} policies, ${STATIC_POLICY.processes.length} processes, ${STATIC_POLICY.documents.length} documents.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await saveToServer(items.filter(i=>i.id!==id));
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function updateLifecycle(id, newLifecycle) {
    setSaving(true);
    try {
      const updated = items.map(i => i.id===id ? { ...i, lifecycle:newLifecycle, status:newLifecycle, updatedAt:new Date().toISOString(),
        ...(newLifecycle==="Published"?{ approvalDate:new Date().toISOString().split("T")[0] }:{}) } : i);
      await saveToServer(updated);
      showToast(`✅ ${id} moved to ${newLifecycle}.`); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function PolicyForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", category:"Governance", owner:"", version:"v1.0", lifecycle:"Draft", status:"Draft", description:"", linkedLegislation:"", tags:"", createdDate:"", reviewDate:"", nextReview:"", approvedBy:"", approvalDate:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial, tags:Array.isArray(initial.tags)?initial.tags.join(", "):initial.tags||"" });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Policy":"Add Policy"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
          <FInput label="Policy ID" value={f.id} onChange={set("id")} required placeholder="POL-009"/>
          <FInput label="Policy Title" value={f.title} onChange={set("title")} required placeholder="e.g. Leave Management Policy"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Governance","Ethics & Integrity","Financial Management","ICT & Security","Human Resources","Data Protection","BCM","Risk Management","Compliance","Operations"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. HR Executive"/>
          <FInput label="Version" value={f.version} onChange={set("version")} placeholder="v1.0"/>
          <FSelect label="Lifecycle Stage" value={f.lifecycle} onChange={set("lifecycle")} options={["Draft","Review","Approved","Published","Archived"]}/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Brief description of the policy purpose and scope…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Linked Legislation" value={f.linkedLegislation} onChange={set("linkedLegislation")} placeholder="e.g. PFMA / King IV"/>
          <FInput label="Tags (comma-separated)" value={f.tags} onChange={set("tags")} placeholder="e.g. Risk, Governance, PFMA"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Next Review Date" value={f.nextReview} onChange={set("nextReview")} type="date"/>
          <FInput label="Approved By" value={f.approvedBy} onChange={set("approvedBy")} placeholder="e.g. Board"/>
          <FInput label="Approval Date" value={f.approvalDate} onChange={set("approvalDate")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave({ ...f, tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean) })} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Policy"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function ProcessForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", category:"Operations", owner:"", version:"v1.0", lifecycle:"Draft", processType:"Core Business", description:"", steps:"5", hasFlowchart:false, hasSchema:false, relatedForms:"", linkedPolicy:"", nextReview:"", approvedBy:"", approvalDate:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial, relatedForms:Array.isArray(initial.relatedForms)?initial.relatedForms.join(", "):initial.relatedForms||"" });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.purple}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.purple, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Process":"Add Process"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
          <FInput label="Process ID" value={f.id} onChange={set("id")} required placeholder="PRC-007"/>
          <FInput label="Process Title" value={f.title} onChange={set("title")} required placeholder="e.g. Leave Application Process"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Grants Management","Supply Chain","ETQA","Risk & Compliance","Strategy & Performance","ICT & Security","Human Resources","Finance","Operations","Governance"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. HR Executive"/>
          <FSelect label="Process Type" value={f.processType} onChange={set("processType")} options={["Core Business","Compliance","Governance","Support"]}/>
          <FSelect label="Lifecycle Stage" value={f.lifecycle} onChange={set("lifecycle")} options={["Draft","Review","Approved","Published","Archived"]}/>
        </div>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Describe the process purpose and scope…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Number of Steps" value={f.steps} onChange={set("steps")} type="number" placeholder="5"/>
          <FInput label="Linked Policy ID" value={f.linkedPolicy} onChange={set("linkedPolicy")} placeholder="e.g. POL-005"/>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>Has Flowchart</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="fc" value={opt} checked={(f.hasFlowchart?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, hasFlowchart:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>Has Schema/Diagram</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="sc2" value={opt} checked={(f.hasSchema?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, hasSchema:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <FInput label="Related Forms (comma-separated)" value={f.relatedForms} onChange={set("relatedForms")} placeholder="e.g. Leave Form, Approval Form"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Next Review Date" value={f.nextReview} onChange={set("nextReview")} type="date"/>
          <FInput label="Approved By" value={f.approvedBy} onChange={set("approvedBy")} placeholder="e.g. CEO"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave({ ...f, relatedForms:f.relatedForms.split(",").map(t=>t.trim()).filter(Boolean) })} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.purple, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Process"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function DocumentForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", category:"Templates", docType:"Template", owner:"", version:"v1.0", lifecycle:"Draft", format:"Word", description:"", linkedProcess:"", nextReview:"", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.cyan}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.cyan, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Document":"Add Document"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
          <FInput label="Document ID" value={f.id} onChange={set("id")} required placeholder="DOC-010"/>
          <FInput label="Document Title" value={f.title} onChange={set("title")} required placeholder="e.g. Leave Application Form"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Forms","Templates","Schemas","Governance","Procedures","Checklists","Other"]}/>
          <FSelect label="Document Type" value={f.docType} onChange={set("docType")} options={["Form","Template","Schema","Checklist","Procedure","Guide","Report"]}/>
          <FInput label="Owner" value={f.owner} onChange={set("owner")} placeholder="e.g. HR"/>
          <FInput label="Version" value={f.version} onChange={set("version")} placeholder="v1.0"/>
          <FSelect label="Format" value={f.format} onChange={set("format")} options={["Word","Excel","PDF","PDF / Word","PDF / Online","Visio / PDF","PowerPoint","Other"]}/>
        </div>
        <FSelect label="Lifecycle Stage" value={f.lifecycle} onChange={set("lifecycle")} options={["Draft","Review","Approved","Published","Archived"]}/>
        <FTextarea label="Description" value={f.description} onChange={set("description")} rows={2} placeholder="Brief description…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <FInput label="Linked Process ID" value={f.linkedProcess} onChange={set("linkedProcess")} placeholder="e.g. PRC-001"/>
          <FInput label="Next Review Date" value={f.nextReview} onChange={set("nextReview")} type="date"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={1} placeholder="Additional notes…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving}
            style={{ padding:"0.65rem 1.75rem", background:C.cyan, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>
            {saving?"Saving…":initial.id?"Update":"Add Document"}
          </button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormComponent = view==="policies" ? PolicyForm : view==="processes" ? ProcessForm : DocumentForm;
  const addColor = view==="policies" ? C.blue : view==="processes" ? C.purple : C.cyan;
  const addLabel = view==="policies" ? "Add Policy" : view==="processes" ? "Add Process" : "Add Document";

  const LIFECYCLE_NEXT = { "Draft":"Review", "Review":"Approved", "Approved":"Published", "Published":"Archived" };

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["policies","📜 Policies"],["processes","⚙ Processes"],["documents","📁 Documents"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            {view==="policies"?"Policy Register":view==="processes"?"Process Manual":"Document Library"} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.cyan?C.bg:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ {addLabel}</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>🌱 Seed Demo Data</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving} />}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="policies" && (
            <Table
              headers={["ID","Title","Category","Owner","Version","Lifecycle","Next Review","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem", maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.title}>{p.title}</span>,
                <Badge label={p.category} color="blue"/>,
                p.owner,
                <span style={{ fontFamily:"monospace", fontSize:"0.75rem", color:C.muted }}>{p.version}</span>,
                <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
                  <span style={{ color:p.lifecycle==="Published"?C.green:p.lifecycle==="Draft"?C.muted:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.lifecycle}</span>
                  {LIFECYCLE_NEXT[p.lifecycle] && (
                    <button onClick={()=>updateLifecycle(p.id,LIFECYCLE_NEXT[p.lifecycle])} disabled={saving}
                      style={{ padding:"1px 6px", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:4, fontSize:"0.65rem", cursor:"pointer" }}>
                      → {LIFECYCLE_NEXT[p.lifecycle]}
                    </button>
                  )}
                </div>,
                <span style={{ color:p.nextReview&&new Date(p.nextReview)<new Date()?C.red:C.muted, fontSize:"0.75rem", fontWeight:p.nextReview&&new Date(p.nextReview)<new Date()?700:400 }}>{p.nextReview||"—"}</span>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
          {view==="processes" && (
            <Table
              headers={["ID","Title","Type","Steps","Lifecycle","Actions"]}
              rows={items.map(p=>[
                <span style={{ color:C.purple, fontWeight:700, fontSize:"0.75rem" }}>{p.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem" }}>{p.title}</span>,
                <Badge label={p.processType} color={p.processType==="Compliance"?"amber":p.processType==="Governance"?"blue":"green"}/>,
                <span style={{ color:C.blue, fontWeight:700 }}>{p.steps}</span>,
                <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
                  <span style={{ color:p.lifecycle==="Published"?C.green:p.lifecycle==="Draft"?C.muted:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{p.lifecycle}</span>
                  {LIFECYCLE_NEXT[p.lifecycle] && (
                    <button onClick={()=>updateLifecycle(p.id,LIFECYCLE_NEXT[p.lifecycle])} disabled={saving}
                      style={{ padding:"1px 6px", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:4, fontSize:"0.65rem", cursor:"pointer" }}>
                      → {LIFECYCLE_NEXT[p.lifecycle]}
                    </button>
                  )}
                </div>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...p })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(p.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
          {view==="documents" && (
            <Table
              headers={["ID","Title","Type","Format","Owner","Lifecycle","Actions"]}
              rows={items.map(d=>[
                <span style={{ color:C.cyan, fontWeight:700, fontSize:"0.75rem" }}>{d.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.82rem", maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.title}>{d.title}</span>,
                <Badge label={d.docType} color={d.docType==="Schema"?"purple":d.docType==="Template"?"amber":"green"}/>,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{d.format}</span>,
                d.owner,
                <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
                  <span style={{ color:d.lifecycle==="Published"?C.green:d.lifecycle==="Draft"?C.muted:C.amber, fontWeight:700, fontSize:"0.75rem" }}>{d.lifecycle}</span>
                  {LIFECYCLE_NEXT[d.lifecycle] && (
                    <button onClick={()=>updateLifecycle(d.id,LIFECYCLE_NEXT[d.lifecycle])} disabled={saving}
                      style={{ padding:"1px 6px", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:4, fontSize:"0.65rem", cursor:"pointer" }}>
                      → {LIFECYCLE_NEXT[d.lifecycle]}
                    </button>
                  )}
                </div>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...d })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(d.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
        </Card>
      )}
    </div>
  );
}


// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
function AuditLog() {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setLogs((data.auditLog || []).slice().reverse());
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  const modules = ["All", ...new Set(logs.map(l=>l.module).filter(Boolean))];
  const actions = ["All","Add","Edit","Delete","Status Change","Seed","Approve","Reject"];

  const filtered = logs.filter(l=>
    (filterModule==="All" || l.module===filterModule) &&
    (filterAction==="All" || l.action===filterAction) &&
    JSON.stringify(l).toLowerCase().includes(search.toLowerCase())
  );

  const actionColor = a => {
    if (a==="Add") return C.green;
    if (a==="Delete") return C.red;
    if (a==="Edit") return C.blue;
    if (a==="Approve") return C.green;
    if (a==="Reject") return C.red;
    if (a==="Seed") return C.purple;
    return C.amber;
  };

  const adds    = logs.filter(l=>l.action==="Add").length;
  const edits   = logs.filter(l=>l.action==="Edit").length;
  const deletes = logs.filter(l=>l.action==="Delete").length;
  const today   = logs.filter(l=>l.timestamp?.startsWith(new Date().toISOString().slice(0,10))).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Audit Log</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>All admin panel changes — immutable record</p>
        </div>
        <button onClick={load} style={{ padding:"0.5rem 1rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer", fontSize:"0.82rem" }}>↻ Refresh</button>
      </div>

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.75rem" }}>
        {[
          ["Total Entries", logs.length,  C.blue  ],
          ["Today",         today,         C.green ],
          ["Edits",         edits,         C.amber ],
          ["Deletions",     deletes,       deletes>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.75rem 1rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.65rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.5rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
        <input placeholder="Search audit log…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:220 }}/>
        <select value={filterModule} onChange={e=>setFilterModule(e.target.value)} style={inputSt}>
          {modules.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} style={inputSt}>
          {actions.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading audit log…</div>
      ) : filtered.length===0 ? (
        <Card><p style={{ color:C.muted, textAlign:"center", padding:"2rem" }}>
          {logs.length===0 ? "No audit entries yet. Make changes via the Admin Panel to start logging." : "No entries match your filters."}
        </p></Card>
      ) : (
        <Card>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {filtered.map((log, idx)=>(
              <div key={idx} style={{ borderBottom:idx<filtered.length-1?`1px solid ${C.border}`:"none",
                padding:"0.75rem 0" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem", cursor:"pointer" }}
                  onClick={()=>setExpanded(expanded===idx?null:idx)}>
                  {/* Action badge */}
                  <span style={{ background:`${actionColor(log.action)}22`, color:actionColor(log.action),
                    border:`1px solid ${actionColor(log.action)}`, borderRadius:4,
                    padding:"2px 8px", fontSize:"0.7rem", fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                    {log.action}
                  </span>
                  {/* Module */}
                  <span style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
                    padding:"2px 7px", fontSize:"0.7rem", color:C.blue, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                    {log.module}
                  </span>
                  {/* Description */}
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text, fontSize:"0.82rem", fontWeight:600 }}>{log.description}</div>
                    {log.recordId && <div style={{ color:C.muted, fontSize:"0.72rem" }}>Record: {log.recordId}</div>}
                  </div>
                  {/* Timestamp */}
                  <div style={{ color:C.muted, fontSize:"0.72rem", whiteSpace:"nowrap", flexShrink:0, textAlign:"right" }}>
                    <div>{log.timestamp ? new Date(log.timestamp).toLocaleDateString("en-ZA") : "—"}</div>
                    <div>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"}) : ""}</div>
                  </div>
                  <span style={{ color:C.muted, fontSize:"0.75rem" }}>{expanded===idx?"▲":"▼"}</span>
                </div>

                {/* Expanded detail */}
                {expanded===idx && (
                  <div style={{ marginTop:"0.75rem", marginLeft:"0.5rem", background:C.surface, borderRadius:8,
                    padding:"0.75rem 1rem", borderLeft:`3px solid ${actionColor(log.action)}` }}>
                    {log.before && (
                      <div style={{ marginBottom:"0.5rem" }}>
                        <div style={{ color:C.muted, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", marginBottom:"0.25rem" }}>Before</div>
                        <pre style={{ color:C.red, fontSize:"0.72rem", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <div style={{ color:C.muted, fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", marginBottom:"0.25rem" }}>After</div>
                        <pre style={{ color:C.green, fontSize:"0.72rem", margin:0, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.meta && (
                      <div style={{ marginTop:"0.5rem", color:C.muted, fontSize:"0.75rem" }}>
                        {Object.entries(log.meta).map(([k,v])=>(
                          <span key={k} style={{ marginRight:"1rem" }}><strong>{k}:</strong> {String(v)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


// Sparkline now lives in ./charts.jsx
// ─── KRI TREND CHART MODAL ────────────────────────────────────────────────────
function KRITrendModal({ kri, onClose }) {
  if (!kri) return null;
  const PERIODS_LABELS = ["Q2 24/25","Q3 24/25","Q4 24/25","Q1 25/26","Q2 25/26","Q3 25/26"];
  // Generate simulated trend data from current and previous values
  const current = parseFloat(kri.currentPeriodValue) || 0;
  const previous = parseFloat(kri.previousPeriodValue) || 0;
  const target  = parseFloat(kri.target) || 0;
  // Simulate 6 periods of data trending toward current
  const trendData = PERIODS_LABELS.map((_, i) => {
    const progress = i / (PERIODS_LABELS.length - 1);
    return +(previous + (current - previous) * progress * 0.8 + (Math.random() - 0.5) * Math.abs(current - previous) * 0.2).toFixed(1);
  });
  trendData[trendData.length - 1] = current;

  const min = Math.min(...trendData, target) * 0.9;
  const max = Math.max(...trendData, target) * 1.1;
  const range = max - min || 1;
  const W = 480; const H = 180; const PAD = 40;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const toX = i => PAD + (i / (trendData.length - 1)) * chartW;
  const toY = v => PAD + chartH - ((v - min) / range) * chartH;

  const pts = trendData.map((v,i)=>`${toX(i)},${toY(v)}`).join(" ");
  const targetY = toY(target);

  const statusColor = kri.currentStatus==="Red"?C.red:kri.currentStatus==="Amber"?C.amber:C.green;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
        padding:"1.75rem", width:560, maxWidth:"95vw" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem" }}>
          <div>
            <div style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{kri.id}</div>
            <h3 style={{ color:C.text, margin:"0.2rem 0 0.25rem", fontWeight:700 }}>{kri.indicator}</h3>
            <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
              <span style={{ color:statusColor, fontWeight:700, fontSize:"0.85rem" }}>{kri.currentPeriodValue}</span>
              <span style={{ color:C.muted, fontSize:"0.78rem" }}>Target: {kri.target}</span>
              <Badge label={kri.currentStatus} color={kri.currentStatus==="Red"?"red":kri.currentStatus==="Amber"?"amber":"green"}/>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.25rem" }}>✕</button>
        </div>

        {/* SVG Chart */}
        <svg width={W} height={H} style={{ width:"100%", height:"auto" }}>
          {/* Grid lines */}
          {[0,0.25,0.5,0.75,1].map(f=>(
            <line key={f} x1={PAD} y1={PAD+chartH*f} x2={PAD+chartW} y2={PAD+chartH*f}
              stroke={C.border} strokeWidth="1" strokeDasharray="3,3"/>
          ))}
          {/* Target line */}
          <line x1={PAD} y1={targetY} x2={PAD+chartW} y2={targetY}
            stroke={C.green} strokeWidth="1.5" strokeDasharray="6,3"/>
          <text x={PAD+chartW+4} y={targetY+4} fill={C.green} fontSize="10">Target</text>
          {/* Trend line */}
          <polyline points={pts} fill="none" stroke={statusColor} strokeWidth="2.5" strokeLinejoin="round"/>
          {/* Data points */}
          {trendData.map((v,i)=>(
            <circle key={i} cx={toX(i)} cy={toY(v)} r="4" fill={statusColor}/>
          ))}
          {/* X axis labels */}
          {PERIODS_LABELS.map((l,i)=>(
            <text key={l} x={toX(i)} y={H-8} textAnchor="middle" fill={C.muted} fontSize="9">{l}</text>
          ))}
          {/* Y axis labels */}
          {[0,0.5,1].map(f=>{
            const val = (min + range * (1-f)).toFixed(1);
            return <text key={f} x={PAD-5} y={PAD+chartH*f+4} textAnchor="end" fill={C.muted} fontSize="9">{val}</text>;
          })}
        </svg>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.75rem", marginTop:"1rem" }}>
          {[
            ["Current Value", kri.currentPeriodValue, statusColor],
            ["Previous Value", kri.previousPeriodValue, C.muted],
            ["Trend", kri.trend, kri.trend==="Improving"?C.green:kri.trend==="Declining"?C.red:C.amber],
          ].map(([l,v,c])=>(
            <div key={l} style={{ background:C.surface, borderRadius:7, padding:"0.6rem 0.85rem", textAlign:"center" }}>
              <div style={{ color:C.muted, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
              <div style={{ color:c, fontSize:"1rem", fontWeight:800 }}>{v}</div>
            </div>
          ))}
        </div>
        {kri.linkedRisk && <div style={{ marginTop:"0.75rem", color:C.muted, fontSize:"0.78rem" }}>Linked Risk: <span style={{ color:C.blue }}>{kri.linkedRisk}</span></div>}
      </div>
    </div>
  );
}


// ─── INTERNAL AUDIT DATA ──────────────────────────────────────────────────────
const STATIC_IA = {
  plan: {
    year: "2026/27",
    status: "Approved",
    approvedBy: "ARC",
    approvalDate: "2026-04-15",
    totalEngagements: 12,
    totalBudgetDays: 240,
    usedBudgetDays: 98,
    chiefAuditExecutive: "T. Nkosi",
    methodology: "Risk-Based Internal Auditing aligned to IIA Standards",
    coverage: [
      { area:"Financial Management & Reporting", riskRating:"High", plannedEngagements:3, status:"In Progress" },
      { area:"Supply Chain Management", riskRating:"High", plannedEngagements:2, status:"In Progress" },
      { area:"Grant Disbursement & Management", riskRating:"High", plannedEngagements:2, status:"Planned" },
      { area:"Information Technology & Cybersecurity", riskRating:"High", plannedEngagements:2, status:"Planned" },
      { area:"Human Resources & Payroll", riskRating:"Medium", plannedEngagements:1, status:"Complete" },
      { area:"Performance Management (APP)", riskRating:"Medium", plannedEngagements:1, status:"Planned" },
      { area:"Governance & Ethics", riskRating:"Medium", plannedEngagements:1, status:"Planned" },
    ]
  },
  engagements: [
    { id:"IAE-001", title:"Financial Statement Review Q1/Q2 2026/27", area:"Financial Management & Reporting", type:"Assurance", riskRating:"High", status:"Complete", phase:"Report Issued", auditor:"T. Nkosi", startDate:"2026-04-10", fieldworkEnd:"2026-05-15", reportDate:"2026-05-30", budgetDays:25, actualDays:28, opinion:"Qualified", findings:4, criticalFindings:1, recommendations:6, managementResponseDue:"2026-06-30", managementResponseStatus:"Received", notes:"Significant UIFW finding raised — referred to CFO and ARC." },
    { id:"IAE-002", title:"SCM & Procurement Compliance Audit", area:"Supply Chain Management", type:"Compliance", riskRating:"High", status:"In Progress", phase:"Fieldwork", auditor:"M. Dube", startDate:"2026-05-01", fieldworkEnd:"2026-06-30", reportDate:"2026-07-15", budgetDays:30, actualDays:18, opinion:"", findings:2, criticalFindings:1, recommendations:3, managementResponseDue:"2026-07-31", managementResponseStatus:"Pending", notes:"Irregular expenditure pattern identified — ongoing." },
    { id:"IAE-003", title:"Payroll & HR Compliance Review", area:"Human Resources & Payroll", type:"Assurance", riskRating:"Medium", status:"Complete", phase:"Follow-up", auditor:"S. Sithole", startDate:"2026-04-01", fieldworkEnd:"2026-04-25", reportDate:"2026-05-05", budgetDays:15, actualDays:14, opinion:"Unqualified", findings:2, criticalFindings:0, recommendations:4, managementResponseDue:"2026-06-05", managementResponseStatus:"Received", notes:"Good control environment. Minor payroll reconciliation gaps." },
    { id:"IAE-004", title:"IT General Controls & Cybersecurity Assessment", area:"Information Technology & Cybersecurity", type:"Assurance", riskRating:"High", status:"Planned", phase:"Planning", auditor:"T. Nkosi", startDate:"2026-07-01", fieldworkEnd:"2026-08-15", reportDate:"2026-09-01", budgetDays:30, actualDays:0, opinion:"", findings:0, criticalFindings:0, recommendations:0, managementResponseDue:"", managementResponseStatus:"N/A", notes:"Scope to include access management, backup, disaster recovery." },
    { id:"IAE-005", title:"Grant Disbursement Controls Audit", area:"Grant Disbursement & Management", type:"Assurance", riskRating:"High", status:"Planned", phase:"Planning", auditor:"M. Dube", startDate:"2026-08-01", fieldworkEnd:"2026-09-15", reportDate:"2026-10-01", budgetDays:35, actualDays:0, opinion:"", findings:0, criticalFindings:0, recommendations:0, managementResponseDue:"", managementResponseStatus:"N/A", notes:"Focus on discretionary grant disbursement controls and learner verification." },
    { id:"IAE-006", title:"Fraud Risk Assessment — Ethics Hotline Review", area:"Governance & Ethics", type:"Advisory", riskRating:"Medium", status:"Planned", phase:"Planning", auditor:"S. Sithole", startDate:"2026-09-01", fieldworkEnd:"2026-09-30", reportDate:"2026-10-15", budgetDays:20, actualDays:0, opinion:"", findings:0, criticalFindings:0, recommendations:0, managementResponseDue:"", managementResponseStatus:"N/A", notes:"Assess adequacy of fraud prevention controls and ethics hotline uptake." },
  ],
  findings: [
    { id:"IAF-001", engagementId:"IAE-001", title:"Unauthorised Expenditure — Budget Vote Overrun", category:"Financial Management", severity:"Critical", status:"Open", rootCause:"Inadequate budget monitoring controls and late budget variance reporting to CFO", recommendation:"Implement monthly budget-to-actual variance reports reviewed by CFO; establish expenditure threshold alerts in financial system", managementResponse:"CFO to implement monthly budget review process by 31 July 2026. System alerts to be configured by ICT by 30 August 2026.", responsiblePerson:"CFO", dueDate:"2026-07-31", implementationStatus:"In Progress", implementationEvidence:"", auditFollowUpDate:"2026-08-15", repeatedFinding:false, linkedRisk:"SR-001", linkedUIFW:"UIFW-001" },
    { id:"IAF-002", engagementId:"IAE-001", title:"UIFW — Irregular Expenditure: SCM Deviation Not Approved", category:"Supply Chain Management", severity:"High", status:"Open", rootCause:"SCM policy deviation approval process not followed; supplier appointed without AA approval", recommendation:"Strengthen SCM deviation approval controls; retrain SCM unit on policy requirements; implement dual authorisation for deviations", managementResponse:"SCM Manager to implement revised deviation approval register and training by 15 August 2026", responsiblePerson:"SCM Manager", dueDate:"2026-08-15", implementationStatus:"Not Started", implementationEvidence:"", auditFollowUpDate:"2026-08-31", repeatedFinding:true, linkedRisk:"SR-002", linkedUIFW:"UIFW-003" },
    { id:"IAF-003", engagementId:"IAE-001", title:"Financial Reporting — Incomplete Disclosure Notes", category:"Financial Management", severity:"Medium", status:"Resolved", rootCause:"Insufficient technical accounting expertise in finance team for GRAP compliance", recommendation:"Engage technical GRAP accounting support; include GRAP disclosure checklist in year-end close process", managementResponse:"CFO to appoint GRAP technical advisor by 30 June 2026. Checklist implemented for Q2 reporting.", responsiblePerson:"CFO", dueDate:"2026-06-30", implementationStatus:"Complete", implementationEvidence:"GRAP checklist adopted; technical advisor appointed — confirmed by CAE", auditFollowUpDate:"2026-07-15", repeatedFinding:false, linkedRisk:"", linkedUIFW:"" },
    { id:"IAF-004", engagementId:"IAE-001", title:"Petty Cash — Inadequate Custodian Controls", category:"Financial Management", severity:"Low", status:"Resolved", rootCause:"No formal petty cash policy; custodian changes not documented", recommendation:"Formalise petty cash policy; implement custodian handover register and monthly reconciliation sign-off", managementResponse:"Finance Manager to implement petty cash policy and reconciliation by 31 May 2026", responsiblePerson:"Finance Manager", dueDate:"2026-05-31", implementationStatus:"Complete", implementationEvidence:"Petty cash policy signed off 28 May 2026; reconciliations confirmed by CAE on 15 June 2026", auditFollowUpDate:"2026-06-15", repeatedFinding:false, linkedRisk:"", linkedUIFW:"" },
    { id:"IAF-005", engagementId:"IAE-002", title:"Bid Evaluation — Conflict of Interest Not Disclosed", category:"Supply Chain Management", severity:"Critical", status:"Open", rootCause:"BEC member failed to declare conflict of interest with bidding entity; no pre-evaluation COI screening process", recommendation:"Implement mandatory COI declaration before every BEC meeting; link to Declaration of Interest system; retrain all SCM officials", managementResponse:"SCM Manager and Legal to implement enhanced COI screening process by 31 July 2026. Disciplinary process initiated against implicated BEC member.", responsiblePerson:"SCM Manager", dueDate:"2026-07-31", implementationStatus:"In Progress", implementationEvidence:"Disciplinary process commenced — HR confirmation attached", auditFollowUpDate:"2026-08-15", repeatedFinding:false, linkedRisk:"SR-002", linkedUIFW:"UIFW-003" },
    { id:"IAF-006", engagementId:"IAE-002", title:"Contract Management — No SLA Monitoring Register", category:"Supply Chain Management", severity:"Medium", status:"Open", rootCause:"No formal contract register or SLA monitoring process in place for active contracts", recommendation:"Implement contract register in GRC system; assign contract managers; conduct quarterly SLA reviews", managementResponse:"CFO / SCM to implement contract register and quarterly SLA review process by 31 August 2026", responsiblePerson:"CFO", dueDate:"2026-08-31", implementationStatus:"Not Started", implementationEvidence:"", auditFollowUpDate:"2026-09-15", repeatedFinding:false, linkedRisk:"", linkedUIFW:"" },
    { id:"IAF-007", engagementId:"IAE-003", title:"Payroll — Terminated Employee Not Removed Timeously", category:"Human Resources & Payroll", severity:"High", status:"Open", rootCause:"HR-to-Payroll notification process breakdown; no automated termination trigger in HR system", recommendation:"Implement automated HR-to-Payroll notification; HR to confirm payroll removal within 3 days of termination; monthly exception report to CFO", managementResponse:"HR Executive to implement automated notification and monthly exception reporting by 30 June 2026", responsiblePerson:"HR Executive", dueDate:"2026-06-30", implementationStatus:"In Progress", implementationEvidence:"Automated notification process implemented — testing underway", auditFollowUpDate:"2026-07-15", repeatedFinding:true, linkedRisk:"", linkedUIFW:"UIFW-006" },
    { id:"IAF-008", engagementId:"IAE-003", title:"Leave Management — Excess Leave Balances Not Managed", category:"Human Resources & Payroll", severity:"Low", status:"Resolved", rootCause:"No leave reduction plan implemented despite DPSA guidelines requirement", recommendation:"Implement leave reduction plan; cap leave balances at 30 days; enforce mandatory leave periods", managementResponse:"HR Executive to implement leave management policy and enforce caps by 31 May 2026", responsiblePerson:"HR Executive", dueDate:"2026-05-31", implementationStatus:"Complete", implementationEvidence:"Leave management policy signed off; payroll system caps implemented", auditFollowUpDate:"2026-06-15", repeatedFinding:false, linkedRisk:"", linkedUIFW:"" },
  ],
  followUp: [
    { id:"FU-001", findingId:"IAF-001", engagementId:"IAE-001", title:"Budget Monitoring Controls", dueDate:"2026-07-31", reviewDate:"2026-08-15", status:"In Progress", progressNote:"CFO confirmed implementation of monthly budget review process. System alerts configuration 60% complete.", lastUpdated:"2026-06-15" },
    { id:"FU-002", findingId:"IAF-002", engagementId:"IAE-001", title:"SCM Deviation Controls", dueDate:"2026-08-15", reviewDate:"2026-08-31", status:"Not Started", progressNote:"No action taken. SCM Manager has not responded to CAE follow-up requests. Escalation required.", lastUpdated:"2026-06-10" },
    { id:"FU-003", findingId:"IAF-003", engagementId:"IAE-001", title:"GRAP Disclosure Notes", dueDate:"2026-06-30", reviewDate:"2026-07-15", status:"Closed", progressNote:"GRAP technical advisor appointed. Disclosure checklist implemented and verified by CAE.", lastUpdated:"2026-06-20" },
    { id:"FU-004", findingId:"IAF-004", engagementId:"IAE-001", title:"Petty Cash Controls", dueDate:"2026-05-31", reviewDate:"2026-06-15", status:"Closed", progressNote:"Policy signed off and reconciliations confirmed complete. Finding closed.", lastUpdated:"2026-06-15" },
    { id:"FU-005", findingId:"IAF-005", engagementId:"IAE-002", title:"BEC Conflict of Interest", dueDate:"2026-07-31", reviewDate:"2026-08-15", status:"In Progress", progressNote:"Disciplinary process underway. New COI declaration form drafted for BEC use.", lastUpdated:"2026-06-18" },
    { id:"FU-006", findingId:"IAF-006", engagementId:"IAE-002", title:"Contract Management Register", dueDate:"2026-08-31", reviewDate:"2026-09-15", status:"Not Started", progressNote:"No action taken. CFO to be notified of upcoming due date.", lastUpdated:"2026-06-01" },
    { id:"FU-007", findingId:"IAF-007", engagementId:"IAE-003", title:"Terminated Employee Payroll", dueDate:"2026-06-30", reviewDate:"2026-07-15", status:"In Progress", progressNote:"HR automated notification implemented. Testing phase. Removal verification still pending.", lastUpdated:"2026-06-18" },
    { id:"FU-008", findingId:"IAF-008", engagementId:"IAE-003", title:"Leave Balance Management", dueDate:"2026-05-31", reviewDate:"2026-06-15", status:"Closed", progressNote:"Leave caps implemented in payroll system. Policy signed off. Closed.", lastUpdated:"2026-06-15" },
  ],
};

// ─── IA HELPERS ───────────────────────────────────────────────────────────────
function IAOpinionBadge({ opinion }) {
  if (!opinion) return <span style={{ color:C.muted, fontSize:"0.75rem" }}>Pending</span>;
  const cfg = {
    "Unqualified":          { color:C.green, bg:"rgba(63,185,80,0.12)" },
    "Qualified":            { color:C.amber, bg:"rgba(227,179,65,0.12)" },
    "Adverse":              { color:C.red,   bg:"rgba(248,81,73,0.12)" },
    "Disclaimer":           { color:C.red,   bg:"rgba(248,81,73,0.12)" },
  };
  const s = cfg[opinion] || { color:C.muted, bg:"rgba(110,118,129,0.12)" };
  return <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.color}`, borderRadius:4, padding:"2px 8px", fontSize:"0.72rem", fontWeight:700 }}>{opinion}</span>;
}

function IASeverityBadge({ severity }) {
  const cfg = {
    "Critical": { color:C.red,    bg:"rgba(248,81,73,0.12)" },
    "High":     { color:C.amber,  bg:"rgba(227,179,65,0.12)" },
    "Medium":   { color:C.blue,   bg:"rgba(88,166,255,0.12)" },
    "Low":      { color:C.green,  bg:"rgba(63,185,80,0.12)" },
  };
  const s = cfg[severity] || { color:C.muted, bg:"rgba(110,118,129,0.12)" };
  return <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.color}`, borderRadius:4, padding:"2px 8px", fontSize:"0.72rem", fontWeight:700 }}>{severity}</span>;
}

function IAStatusBadge({ status }) {
  const cfg = {
    "Complete":    { color:C.green },
    "In Progress": { color:C.amber },
    "Planned":     { color:C.blue  },
    "Resolved":    { color:C.green },
    "Open":        { color:C.red   },
    "Closed":      { color:C.green },
    "Not Started": { color:C.muted },
    "Overdue":     { color:C.red   },
  };
  const c = (cfg[status]||{color:C.muted}).color;
  return <span style={{ color:c, fontWeight:700, fontSize:"0.78rem" }}>{status}</span>;
}

function IAPhasePipeline({ phase }) {
  const steps = ["Planning","Fieldwork","Reporting","Follow-up"];
  const idx   = steps.indexOf(phase);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:3 }}>
      {steps.map((s,i)=>{
        const done    = i < idx;
        const current = i === idx;
        const c = done?C.green:current?C.blue:C.border;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", gap:3 }}>
            <div style={{ fontSize:"0.6rem", fontWeight:700, color:done?C.green:current?C.blue:C.muted,
              borderBottom:`2px solid ${c}`, paddingBottom:1, whiteSpace:"nowrap" }}>{s}</div>
            {i<steps.length-1&&<div style={{ color:C.border, fontSize:"0.65rem" }}>→</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── INTERNAL AUDIT MODULE VIEW ────────────────────────────────────────────────
function InternalAuditModule() {
  const [sub, setSub]       = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev]       = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedEng, setSelectedEng]   = useState(null);
  const [selectedFind, setSelectedFind] = useState(null);
  const [data, setData] = useState(STATIC_IA);

  useEffect(()=>{
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(d=>{
      if (d.internalAudit) setData({ ...STATIC_IA, ...d.internalAudit });
    }).catch(()=>{});
  },[]);

  const plan        = data.plan        || STATIC_IA.plan;
  const engagements = data.engagements || [];
  const findings    = data.findings    || [];
  const followUp    = data.followUp    || [];

  // KPIs
  const totalFindings   = findings.length;
  const openFindings    = findings.filter(f=>f.status==="Open").length;
  const criticalOpen    = findings.filter(f=>f.severity==="Critical"&&f.status==="Open").length;
  const resolved        = findings.filter(f=>f.status==="Resolved"||f.status==="Closed").length;
  const overdueFollowUp = followUp.filter(f=>f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Closed").length;
  const repeatFindings  = findings.filter(f=>f.repeatedFinding).length;
  const budgetPct       = Math.round((plan.usedBudgetDays/plan.totalBudgetDays)*100);
  const completeEngs    = engagements.filter(e=>e.status==="Complete").length;

  const filterFn = arr => arr.filter(r=>
    (filterSev==="All"    || r.severity===filterSev) &&
    (filterStatus==="All" || r.status===filterStatus) &&
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h1 style={{ color:C.text, fontSize:"1.3rem", fontWeight:700, margin:0 }}>Internal Audit</h1>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:"2px 0 0" }}>Annual Plan · Engagements · Findings · Follow-up — {plan.year}</p>
        </div>
        <input placeholder="Search IA…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, width:220 }}/>
      </div>

      {/* Critical alerts */}
      {criticalOpen > 0 && (
        <div style={{ background:"rgba(248,81,73,0.08)", border:`1px solid ${C.red}`, borderRadius:10, padding:"0.85rem 1.25rem" }}>
          <span style={{ color:C.red, fontWeight:700, fontSize:"0.85rem" }}>
            🚨 {criticalOpen} Critical finding{criticalOpen>1?"s":""} outstanding — immediate management action required
          </span>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem", marginTop:"0.4rem" }}>
            {findings.filter(f=>f.severity==="Critical"&&f.status==="Open").map(f=>(
              <span key={f.id} onClick={()=>{ setSub("findings"); setSelectedFind(f); }}
                style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:6, padding:"3px 10px",
                  fontSize:"0.75rem", color:C.red, fontWeight:700, cursor:"pointer" }}>
                {f.id}: {f.title.slice(0,45)}…
              </span>
            ))}
          </div>
        </div>
      )}

      {overdueFollowUp > 0 && (
        <div style={{ background:"rgba(227,179,65,0.08)", border:`1px solid ${C.amber}`, borderRadius:10, padding:"0.75rem 1.25rem" }}>
          <span style={{ color:C.amber, fontWeight:700, fontSize:"0.85rem" }}>
            ⏰ {overdueFollowUp} follow-up action{overdueFollowUp>1?"s":""} overdue — management response required
          </span>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:"0.6rem" }}>
        {[
          ["Engagements",   engagements.length,   C.blue ],
          ["Complete",      completeEngs,          C.green],
          ["Total Findings",totalFindings,          C.blue ],
          ["Open Findings", openFindings,           openFindings>0?C.red:C.green ],
          ["Critical Open", criticalOpen,           criticalOpen>0?C.red:C.green ],
          ["Resolved",      resolved,               C.green],
          ["Overdue F/U",   overdueFollowUp,        overdueFollowUp>0?C.red:C.green ],
          ["Repeat Findings",repeatFindings,        repeatFindings>0?C.red:C.green ],
        ].map(([l,v,c])=>(
          <div key={l} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"0.6rem 0.75rem", borderTop:`3px solid ${c}` }}>
            <div style={{ color:C.muted, fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</div>
            <div style={{ color:c, fontSize:"1.3rem", fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Sub tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
        {[
          ["dashboard","📊 Overview"],
          ["plan","📋 Annual Plan"],
          ["engagements","🔍 Engagements"],
          ["findings","⚠️ Findings Register"],
          ["followup","✅ Follow-up & Monitoring"],
        ].map(([id,label])=>(
          <button key={id} onClick={()=>{ setSub(id); setSelectedEng(null); setSelectedFind(null); }}
            style={{ padding:"0.5rem 1.0rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.8rem", fontWeight:600, color:sub===id?C.text:C.muted,
              borderBottom:sub===id?`2px solid ${C.blue}`:"2px solid transparent", whiteSpace:"nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {sub==="dashboard" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
          {/* Annual Plan summary */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>📋 Annual Audit Plan {plan.year}</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", marginBottom:"1rem" }}>
              {[
                ["Status", plan.status, C.green],
                ["Approved By", plan.approvedBy, C.blue],
                ["CAE", plan.chiefAuditExecutive, C.text],
                ["Engagements", `${completeEngs}/${plan.totalEngagements} complete`, C.text],
              ].map(([l,v,c])=>(
                <div key={l}>
                  <div style={{ color:C.muted, fontSize:"0.68rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
                  <div style={{ color:c, fontSize:"0.85rem", fontWeight:600 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:"0.4rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.25rem" }}>
                <span style={{ color:C.muted, fontSize:"0.78rem" }}>Budget Utilisation</span>
                <span style={{ color:budgetPct>85?C.red:C.text, fontWeight:700, fontSize:"0.78rem" }}>{plan.usedBudgetDays}/{plan.totalBudgetDays} days ({budgetPct}%)</span>
              </div>
              <ProgressBar value={budgetPct} color={budgetPct>85?C.red:C.amber}/>
            </div>
            <div style={{ marginTop:"1rem" }}>
              {plan.coverage?.map(c=>(
                <div key={c.area} style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.4rem" }}>
                  <div style={{ flex:1, color:C.muted, fontSize:"0.75rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={c.area}>{c.area}</div>
                  <span style={{ color:c.status==="Complete"?C.green:c.status==="In Progress"?C.amber:C.blue, fontSize:"0.7rem", fontWeight:700, whiteSpace:"nowrap" }}>{c.status}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Findings by severity */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>⚠️ Findings by Severity</h3>
            {["Critical","High","Medium","Low"].map(sev=>{
              const total = findings.filter(f=>f.severity===sev).length;
              const open  = findings.filter(f=>f.severity===sev&&f.status==="Open").length;
              const col   = sev==="Critical"?C.red:sev==="High"?C.amber:sev==="Medium"?C.blue:C.green;
              return (
                <div key={sev} style={{ marginBottom:"0.85rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.2rem" }}>
                    <span style={{ color:col, fontWeight:700, fontSize:"0.82rem" }}>{sev}</span>
                    <span style={{ color:C.muted, fontSize:"0.78rem" }}>{open} open / {total} total</span>
                  </div>
                  <ProgressBar value={total===0?0:Math.round((open/total)*100)} color={col}/>
                </div>
              );
            })}
            <div style={{ marginTop:"1rem", padding:"0.75rem", background:C.surface, borderRadius:8, borderLeft:`3px solid ${C.amber}` }}>
              <div style={{ color:C.amber, fontWeight:700, fontSize:"0.78rem", marginBottom:"0.25rem" }}>Repeat Findings ({repeatFindings})</div>
              {findings.filter(f=>f.repeatedFinding).map(f=>(
                <div key={f.id} style={{ color:C.muted, fontSize:"0.75rem", marginBottom:"0.2rem" }}>⟳ {f.id}: {f.title.slice(0,50)}</div>
              ))}
            </div>
          </Card>

          {/* Engagement status */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>🔍 Engagement Status</h3>
            {engagements.map(e=>(
              <div key={e.id} onClick={()=>{ setSub("engagements"); setSelectedEng(e); }}
                style={{ padding:"0.6rem 0.75rem", background:C.surface, borderRadius:8, marginBottom:"0.4rem",
                  cursor:"pointer", border:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <span style={{ color:C.blue, fontWeight:700, fontSize:"0.72rem" }}>{e.id}</span>
                    <div style={{ color:C.text, fontSize:"0.8rem", fontWeight:600 }}>{e.title.slice(0,50)}</div>
                  </div>
                  <IAStatusBadge status={e.status}/>
                </div>
              </div>
            ))}
          </Card>

          {/* Follow-up status */}
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>✅ Follow-up Status</h3>
            {["Closed","In Progress","Not Started"].map(st=>{
              const cnt = followUp.filter(f=>f.status===st).length;
              const col = st==="Closed"?C.green:st==="In Progress"?C.amber:C.red;
              return (
                <div key={st} style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.75rem" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:col, flexShrink:0 }}/>
                  <div style={{ flex:1, color:C.muted, fontSize:"0.82rem" }}>{st}</div>
                  <ProgressBar value={followUp.length===0?0:Math.round((cnt/followUp.length)*100)} color={col}/>
                  <div style={{ color:col, fontWeight:800, minWidth:24, textAlign:"right" }}>{cnt}</div>
                </div>
              );
            })}
            {overdueFollowUp>0 && (
              <div style={{ marginTop:"0.75rem", padding:"0.5rem 0.75rem", background:"rgba(248,81,73,0.08)", borderRadius:6, border:`1px solid ${C.red}` }}>
                <div style={{ color:C.red, fontWeight:700, fontSize:"0.78rem" }}>⏰ {overdueFollowUp} overdue</div>
                {followUp.filter(f=>f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Closed").map(f=>(
                  <div key={f.id} style={{ color:C.muted, fontSize:"0.75rem", marginTop:"0.2rem" }}>• {f.id}: {f.title}</div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── ANNUAL PLAN ── */}
      {sub==="plan" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>Annual Audit Plan — {plan.year}</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem", marginBottom:"1rem" }}>
              {[
                ["Plan Status",     plan.status,                   C.green],
                ["Approved By",     plan.approvedBy,               C.blue ],
                ["Approval Date",   plan.approvalDate,             C.muted],
                ["CAE",             plan.chiefAuditExecutive,      C.text ],
                ["Total Engagements",String(plan.totalEngagements),C.blue ],
                ["Budget (Days)",   String(plan.totalBudgetDays),  C.text ],
                ["Used (Days)",     String(plan.usedBudgetDays),   budgetPct>85?C.red:C.amber],
                ["Budget Used",     `${budgetPct}%`,               budgetPct>85?C.red:C.amber],
              ].map(([l,v,c])=>(
                <div key={l} style={{ background:C.surface, borderRadius:8, padding:"0.6rem 0.85rem" }}>
                  <div style={{ color:C.muted, fontSize:"0.65rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
                  <div style={{ color:c, fontSize:"0.95rem", fontWeight:700 }}>{v||"—"}</div>
                </div>
              ))}
            </div>
            <div style={{ color:C.muted, fontSize:"0.78rem", marginBottom:"0.5rem", fontStyle:"italic" }}>{plan.methodology}</div>
          </Card>
          <Card>
            <h3 style={{ color:C.text, fontWeight:700, margin:"0 0 1rem", fontSize:"0.95rem" }}>Audit Coverage by Area</h3>
            <Table
              headers={["Audit Area","Risk Rating","Planned Engagements","Status"]}
              rows={(plan.coverage||[]).map(c=>[
                c.area,
                <Badge label={c.riskRating} color={c.riskRating==="High"?"red":c.riskRating==="Medium"?"amber":"green"}/>,
                c.plannedEngagements,
                <IAStatusBadge status={c.status}/>,
              ])}
            />
          </Card>
        </div>
      )}

      {/* ── ENGAGEMENTS ── */}
      {sub==="engagements" && (
        <div>
          {selectedEng && (
            <div style={{ background:C.card, border:`1px solid ${C.blue}`, borderRadius:12, padding:"1.5rem", marginBottom:"1.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
                <div>
                  <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", marginBottom:"0.3rem" }}>
                    <span style={{ color:C.blue, fontWeight:800 }}>{selectedEng.id}</span>
                    <IAOpinionBadge opinion={selectedEng.opinion}/>
                    <Badge label={selectedEng.type} color="blue"/>
                    <Badge label={selectedEng.riskRating} color={selectedEng.riskRating==="High"?"red":"amber"}/>
                  </div>
                  <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>{selectedEng.title}</h3>
                  <p style={{ color:C.muted, margin:0, fontSize:"0.82rem" }}>{selectedEng.area} · Auditor: {selectedEng.auditor}</p>
                </div>
                <button onClick={()=>setSelectedEng(null)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
              </div>
              <IAPhasePipeline phase={selectedEng.phase}/>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem", marginTop:"1rem" }}>
                {[
                  ["Start Date",      selectedEng.startDate],
                  ["Fieldwork End",   selectedEng.fieldworkEnd],
                  ["Report Date",     selectedEng.reportDate],
                  ["Budget/Actual",   `${selectedEng.budgetDays}/${selectedEng.actualDays} days`],
                  ["Findings",        selectedEng.findings],
                  ["Critical",        selectedEng.criticalFindings],
                  ["Recommendations", selectedEng.recommendations],
                  ["Mgmt Response",   selectedEng.managementResponseStatus],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ color:C.muted, fontSize:"0.68rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
                    <div style={{ color:C.text, fontSize:"0.85rem", fontWeight:600 }}>{String(v||"—")}</div>
                  </div>
                ))}
              </div>
              {selectedEng.notes && <div style={{ marginTop:"0.75rem", color:C.muted, fontSize:"0.82rem", padding:"0.5rem 0.75rem", background:C.surface, borderRadius:6, borderLeft:`3px solid ${C.blue}` }}>{selectedEng.notes}</div>}
              <div style={{ marginTop:"1rem" }}>
                <div style={{ color:C.muted, fontSize:"0.72rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.5rem" }}>Findings from this engagement</div>
                {findings.filter(f=>f.engagementId===selectedEng.id).map(f=>(
                  <div key={f.id} onClick={()=>{ setSub("findings"); setSelectedFind(f); }}
                    style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.5rem 0.75rem", background:C.surface, borderRadius:6, marginBottom:"0.35rem", cursor:"pointer", border:`1px solid ${C.border}` }}>
                    <IASeverityBadge severity={f.severity}/>
                    <span style={{ color:C.blue, fontWeight:700, fontSize:"0.75rem" }}>{f.id}</span>
                    <span style={{ color:C.text, fontSize:"0.82rem", flex:1 }}>{f.title}</span>
                    <IAStatusBadge status={f.status}/>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Card>
            <Table
              headers={["ID","Title","Area","Type","Phase","Opinion","Findings","Critical","Budget/Actual","Status"]}
              rows={engagements.filter(e=>JSON.stringify(e).toLowerCase().includes(search.toLowerCase())).map(e=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.72rem", cursor:"pointer" }} onClick={()=>setSelectedEng(e)}>{e.id}</span>,
                <div style={{ cursor:"pointer", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} onClick={()=>setSelectedEng(e)} title={e.title}><span style={{ fontWeight:600, fontSize:"0.8rem" }}>{e.title}</span></div>,
                <span style={{ fontSize:"0.75rem", color:C.muted }}>{e.area.split(" ")[0]}</span>,
                <Badge label={e.type} color="blue"/>,
                <IAPhasePipeline phase={e.phase}/>,
                <IAOpinionBadge opinion={e.opinion}/>,
                <span style={{ color:e.findings>0?C.amber:C.muted, fontWeight:700 }}>{e.findings}</span>,
                <span style={{ color:e.criticalFindings>0?C.red:C.muted, fontWeight:700 }}>{e.criticalFindings}</span>,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{e.budgetDays}/{e.actualDays}d</span>,
                <IAStatusBadge status={e.status}/>,
              ])}
            />
          </Card>
        </div>
      )}

      {/* ── FINDINGS REGISTER ── */}
      {sub==="findings" && (
        <div>
          <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1rem", flexWrap:"wrap" }}>
            <select value={filterSev} onChange={e=>setFilterSev(e.target.value)} style={inputSt}>
              {["All","Critical","High","Medium","Low"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inputSt}>
              {["All","Open","Resolved"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {selectedFind && (
            <div style={{ background:C.card, border:`1px solid ${C.amber}`, borderRadius:12, padding:"1.5rem", marginBottom:"1.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
                <div>
                  <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", marginBottom:"0.3rem" }}>
                    <span style={{ color:C.amber, fontWeight:800 }}>{selectedFind.id}</span>
                    <IASeverityBadge severity={selectedFind.severity}/>
                    <IAStatusBadge status={selectedFind.status}/>
                    {selectedFind.repeatedFinding && <span style={{ color:C.red, fontSize:"0.72rem", fontWeight:700, border:`1px solid ${C.red}`, borderRadius:4, padding:"1px 6px" }}>⟳ REPEAT</span>}
                  </div>
                  <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>{selectedFind.title}</h3>
                  <p style={{ color:C.muted, margin:0, fontSize:"0.82rem" }}>{selectedFind.category} · Engagement: {selectedFind.engagementId}</p>
                </div>
                <button onClick={()=>setSelectedFind(null)} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
              </div>
              {[
                ["Root Cause",          selectedFind.rootCause,          C.red   ],
                ["Recommendation",      selectedFind.recommendation,     C.blue  ],
                ["Management Response", selectedFind.managementResponse, C.text  ],
                ["Implementation Evidence", selectedFind.implementationEvidence||"No evidence recorded yet.", C.green],
              ].map(([label, val, col])=>(
                <div key={label} style={{ marginBottom:"0.85rem" }}>
                  <div style={{ color:C.muted, fontSize:"0.68rem", textTransform:"uppercase", fontWeight:700, marginBottom:"0.25rem" }}>{label}</div>
                  <div style={{ color:C.text, fontSize:"0.83rem", lineHeight:1.65, padding:"0.5rem 0.75rem", background:C.surface, borderRadius:6, borderLeft:`3px solid ${col}` }}>{val}</div>
                </div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem" }}>
                {[
                  ["Responsible", selectedFind.responsiblePerson],
                  ["Due Date",    selectedFind.dueDate],
                  ["Follow-up",   selectedFind.auditFollowUpDate],
                  ["Linked Risk", selectedFind.linkedRisk||"—"],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ color:C.muted, fontSize:"0.68rem", textTransform:"uppercase", fontWeight:700 }}>{l}</div>
                    <div style={{ color:C.text, fontSize:"0.85rem" }}>{v||"—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card>
            <Table
              headers={["ID","Title","Category","Severity","Status","Responsible","Due Date","Repeat","Linked Risk"]}
              rows={filterFn(findings).map(f=>[
                <span style={{ color:C.amber, fontWeight:700, fontSize:"0.72rem", cursor:"pointer" }} onClick={()=>setSelectedFind(f)}>{f.id}</span>,
                <div style={{ cursor:"pointer", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} onClick={()=>setSelectedFind(f)} title={f.title}><span style={{ fontWeight:600, fontSize:"0.8rem" }}>{f.title}</span></div>,
                <span style={{ fontSize:"0.75rem", color:C.muted }}>{f.category}</span>,
                <IASeverityBadge severity={f.severity}/>,
                <IAStatusBadge status={f.status}/>,
                f.responsiblePerson,
                <span style={{ color:f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Resolved"?C.red:C.muted, fontSize:"0.75rem", fontWeight:f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Resolved"?700:400 }}>{f.dueDate||"—"}</span>,
                f.repeatedFinding?<span style={{ color:C.red, fontWeight:700, fontSize:"0.72rem" }}>⟳ Yes</span>:<span style={{ color:C.muted, fontSize:"0.75rem" }}>No</span>,
                <span style={{ color:C.blue, fontSize:"0.75rem" }}>{f.linkedRisk||"—"}</span>,
              ])}
            />
          </Card>
        </div>
      )}

      {/* ── FOLLOW-UP ── */}
      {sub==="followup" && (
        <Card>
          <Table
            headers={["ID","Finding","Due Date","Review Date","Status","Progress Note","Last Updated"]}
            rows={followUp.filter(f=>JSON.stringify(f).toLowerCase().includes(search.toLowerCase())).map(f=>{
              const isOverdue = f.dueDate && new Date(f.dueDate)<new Date() && f.status!=="Closed";
              return [
                <span style={{ color:C.green, fontWeight:700, fontSize:"0.72rem" }}>{f.id}</span>,
                <div>
                  <div style={{ color:C.blue, fontSize:"0.72rem", fontWeight:700 }}>{f.findingId}</div>
                  <div style={{ fontSize:"0.8rem", color:C.text, fontWeight:600 }}>{f.title}</div>
                </div>,
                <span style={{ color:isOverdue?C.red:C.muted, fontWeight:isOverdue?700:400, fontSize:"0.75rem" }}>{f.dueDate}{isOverdue?" ⚠":""}</span>,
                <span style={{ color:C.muted, fontSize:"0.75rem" }}>{f.reviewDate||"—"}</span>,
                <IAStatusBadge status={f.status}/>,
                <span style={{ fontSize:"0.75rem", color:C.muted, maxWidth:200, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={f.progressNote}>{f.progressNote}</span>,
                <span style={{ color:C.muted, fontSize:"0.72rem" }}>{f.lastUpdated}</span>,
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}

// ─── INTERNAL AUDIT ADMIN ─────────────────────────────────────────────────────
function InternalAuditAdmin() {
  const [view, setView]       = useState("engagements");
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [mode, setMode]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  function showToast(msg, type="ok") { setToast({ msg, type }); setTimeout(()=>setToast(null), 3500); }
  const DEFAULTS = { engagements:STATIC_IA.engagements, findings:STATIC_IA.findings, followUp:STATIC_IA.followUp };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      setItems((data.internalAudit?.[view]) || DEFAULTS[view]);
    } catch { setItems(DEFAULTS[view]); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(()=>{ load(); }, [load]);

  async function saveToServer(updatedItems) {
    const res  = await fetch(`${API}/api/dashboard`);
    const data = await res.json();
    if (!data.internalAudit) data.internalAudit = {};
    data.internalAudit[view] = updatedItems;
    // also persist plan
    if (!data.internalAudit.plan) data.internalAudit.plan = STATIC_IA.plan;
    const saveRes = await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!saveRes.ok) throw new Error("Failed to save");
  }

  async function seedDemoData() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/api/dashboard`);
      const data = await res.json();
      data.internalAudit = {
        plan: STATIC_IA.plan,
        engagements: STATIC_IA.engagements,
        findings: STATIC_IA.findings,
        followUp: STATIC_IA.followUp,
      };
      await fetch(`${API}/api/dashboard`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
      showToast(`✅ Seeded ${STATIC_IA.engagements.length} engagements, ${STATIC_IA.findings.length} findings, ${STATIC_IA.followUp.length} follow-ups.`);
      load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const isEdit = mode?.id;
      const before = isEdit ? items.find(i=>i.id===f.id) : null;
      const updated = isEdit
        ? items.map(i => i.id===f.id ? { ...i, ...f, updatedAt:new Date().toISOString() } : i)
        : [...items, { ...f, createdAt:new Date().toISOString() }];
      await saveToServer(updated);
      await logAudit({ module:"Internal Audit", action:isEdit?"Edit":"Add", recordId:f.id,
        description:`${isEdit?"Updated":"Added"} IA ${view.slice(0,-1)}: ${f.title||f.id}`, before, after:f });
      showToast(isEdit ? `✅ ${f.id} updated.` : `✅ ${f.id} added.`);
      setMode(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      const before = items.find(i=>i.id===id);
      await saveToServer(items.filter(i=>i.id!==id));
      await logAudit({ module:"Internal Audit", action:"Delete", recordId:id, description:`Deleted IA ${view.slice(0,-1)} ${id}`, before });
      showToast(`🗑 ${id} deleted.`); setConfirmDel(null); load();
    } catch(e) { showToast(`❌ ${e.message}`, "err"); }
    finally { setSaving(false); }
  }

  function EngagementForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", title:"", area:"Financial Management & Reporting", type:"Assurance", riskRating:"High", status:"Planned", phase:"Planning", auditor:"", startDate:"", fieldworkEnd:"", reportDate:"", budgetDays:"20", actualDays:"0", opinion:"", findings:"0", criticalFindings:"0", recommendations:"0", managementResponseDue:"", managementResponseStatus:"Pending", notes:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.blue}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.blue, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Engagement":"Add Engagement"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr", gap:"1rem" }}>
          <FInput label="Engagement ID" value={f.id} onChange={set("id")} required placeholder="IAE-007"/>
          <FInput label="Engagement Title" value={f.title} onChange={set("title")} required placeholder="e.g. SCM Compliance Audit"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Audit Area" value={f.area} onChange={set("area")} options={["Financial Management & Reporting","Supply Chain Management","Grant Disbursement & Management","Information Technology & Cybersecurity","Human Resources & Payroll","Performance Management (APP)","Governance & Ethics","Risk Management","Compliance"]}/>
          <FSelect label="Type" value={f.type} onChange={set("type")} options={["Assurance","Compliance","Advisory","Investigation"]}/>
          <FSelect label="Risk Rating" value={f.riskRating} onChange={set("riskRating")} options={["High","Medium","Low"]}/>
          <FSelect label="Phase" value={f.phase} onChange={set("phase")} options={["Planning","Fieldwork","Reporting","Follow-up"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Planned","In Progress","Complete","Cancelled"]}/>
          <FInput label="Auditor" value={f.auditor} onChange={set("auditor")} placeholder="e.g. T. Nkosi"/>
          <FSelect label="Audit Opinion" value={f.opinion} onChange={set("opinion")} options={["","Unqualified","Qualified","Adverse","Disclaimer"]}/>
          <FSelect label="Mgmt Response" value={f.managementResponseStatus} onChange={set("managementResponseStatus")} options={["N/A","Pending","Received","Overdue"]}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Start Date" value={f.startDate} onChange={set("startDate")} type="date"/>
          <FInput label="Fieldwork End" value={f.fieldworkEnd} onChange={set("fieldworkEnd")} type="date"/>
          <FInput label="Report Date" value={f.reportDate} onChange={set("reportDate")} type="date"/>
          <FInput label="Budget Days" value={f.budgetDays} onChange={set("budgetDays")} type="number"/>
          <FInput label="Actual Days" value={f.actualDays} onChange={set("actualDays")} type="number"/>
          <FInput label="Findings #" value={f.findings} onChange={set("findings")} type="number"/>
        </div>
        <FTextarea label="Notes" value={f.notes} onChange={set("notes")} rows={2} placeholder="Scope, key focus areas, or significant matters…"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.blue, color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add Engagement"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function FindingForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", engagementId:"", title:"", category:"Financial Management", severity:"High", status:"Open", rootCause:"", recommendation:"", managementResponse:"", responsiblePerson:"", dueDate:"", implementationStatus:"Not Started", implementationEvidence:"", auditFollowUpDate:"", repeatedFinding:false, linkedRisk:"", linkedUIFW:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.amber}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.amber, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Finding":"Log New Finding"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 3fr", gap:"1rem" }}>
          <FInput label="Finding ID" value={f.id} onChange={set("id")} required placeholder="IAF-009"/>
          <FInput label="Engagement ID" value={f.engagementId} onChange={set("engagementId")} placeholder="IAE-001"/>
          <FInput label="Finding Title" value={f.title} onChange={set("title")} required placeholder="e.g. Unauthorised expenditure…"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FSelect label="Category" value={f.category} onChange={set("category")} options={["Financial Management","Supply Chain Management","Human Resources & Payroll","Information Technology","Grant Management","Governance & Ethics","Compliance","Risk Management"]}/>
          <FSelect label="Severity" value={f.severity} onChange={set("severity")} options={["Critical","High","Medium","Low"]}/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Open","Resolved"]}/>
          <FSelect label="Implementation" value={f.implementationStatus} onChange={set("implementationStatus")} options={["Not Started","In Progress","Complete"]}/>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={labelSt}>Repeated Finding</label>
            <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.4rem" }}>
              {["Yes","No"].map(opt=>(
                <label key={opt} style={{ display:"flex", alignItems:"center", gap:"0.4rem", cursor:"pointer", color:C.muted, fontSize:"0.85rem" }}>
                  <input type="radio" name="repeat" value={opt} checked={(f.repeatedFinding?"Yes":"No")===opt} onChange={()=>setF(p=>({ ...p, repeatedFinding:opt==="Yes" }))}/>
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </div>
        <FTextarea label="Root Cause" value={f.rootCause} onChange={set("rootCause")} rows={2} placeholder="Why did this finding occur?"/>
        <FTextarea label="Recommendation" value={f.recommendation} onChange={set("recommendation")} rows={2} placeholder="What action is required to resolve this finding?"/>
        <FTextarea label="Management Response" value={f.managementResponse} onChange={set("managementResponse")} rows={2} placeholder="Management's response and commitment…"/>
        <FTextarea label="Implementation Evidence" value={f.implementationEvidence} onChange={set("implementationEvidence")} rows={1} placeholder="Evidence of implementation provided by management…"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Responsible Person" value={f.responsiblePerson} onChange={set("responsiblePerson")} placeholder="e.g. CFO"/>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
          <FInput label="Follow-up Date" value={f.auditFollowUpDate} onChange={set("auditFollowUpDate")} type="date"/>
          <FInput label="Linked Risk ID" value={f.linkedRisk} onChange={set("linkedRisk")} placeholder="e.g. SR-001"/>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.amber, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Log Finding"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  function FollowUpForm({ initial={}, onSave, onCancel, saving }) {
    const EMPTY = { id:"", findingId:"", engagementId:"", title:"", dueDate:"", reviewDate:"", status:"Not Started", progressNote:"", lastUpdated:"" };
    const [f, setF] = useState({ ...EMPTY, ...initial });
    const set = k => v => setF(p=>({ ...p, [k]:v }));
    return (
      <div style={{ background:C.surface, border:`1px solid ${C.green}`, borderRadius:10, padding:"1.5rem", marginBottom:"1.5rem" }}>
        <h3 style={{ color:C.green, fontWeight:700, margin:"0 0 1.25rem" }}>{initial.id?"Edit Follow-up":"Add Follow-up"}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 2fr", gap:"1rem" }}>
          <FInput label="Follow-up ID" value={f.id} onChange={set("id")} required placeholder="FU-009"/>
          <FInput label="Finding ID" value={f.findingId} onChange={set("findingId")} placeholder="IAF-001"/>
          <FInput label="Engagement ID" value={f.engagementId} onChange={set("engagementId")} placeholder="IAE-001"/>
          <FInput label="Title" value={f.title} onChange={set("title")} placeholder="e.g. Budget Monitoring Controls"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          <FInput label="Due Date" value={f.dueDate} onChange={set("dueDate")} type="date"/>
          <FInput label="Review Date" value={f.reviewDate} onChange={set("reviewDate")} type="date"/>
          <FSelect label="Status" value={f.status} onChange={set("status")} options={["Not Started","In Progress","Closed"]}/>
        </div>
        <FTextarea label="Progress Note" value={f.progressNote} onChange={set("progressNote")} rows={2} placeholder="Update on implementation progress…"/>
        <FInput label="Last Updated" value={f.lastUpdated} onChange={set("lastUpdated")} type="date"/>
        <div style={{ display:"flex", gap:"0.75rem", marginTop:"0.5rem" }}>
          <button onClick={()=>onSave(f)} disabled={saving} style={{ padding:"0.65rem 1.75rem", background:C.green, color:C.bg, border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>{saving?"Saving…":initial.id?"Update":"Add Follow-up"}</button>
          <button onClick={onCancel} style={{ padding:"0.65rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const FormMap = { engagements:EngagementForm, findings:FindingForm, followUp:FollowUpForm };
  const FormComponent = FormMap[view];
  const addColor = view==="engagements"?C.blue:view==="findings"?C.amber:C.green;
  const addLabel = view==="engagements"?"Add Engagement":view==="findings"?"Log Finding":"Add Follow-up";

  return (
    <div>
      {toast && <div style={{ position:"fixed", top:16, right:16, zIndex:1000, padding:"0.75rem 1.25rem", borderRadius:8, background:toast.type==="ok"?"rgba(63,185,80,0.15)":"rgba(248,81,73,0.15)", border:`1px solid ${toast.type==="ok"?C.green:C.red}`, color:toast.type==="ok"?C.green:C.red, fontWeight:600, fontSize:"0.88rem" }}>{toast.msg}</div>}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.card, border:`1px solid ${C.red}`, borderRadius:12, padding:"2rem", maxWidth:400, width:"90%" }}>
            <h3 style={{ color:C.red, margin:"0 0 0.75rem" }}>Delete Item</h3>
            <p style={{ color:C.text, marginBottom:"1.5rem" }}>Delete <strong>{confirmDel}</strong>?</p>
            <div style={{ display:"flex", gap:"0.75rem" }}>
              <button onClick={()=>handleDelete(confirmDel)} disabled={saving} style={{ padding:"0.6rem 1.5rem", background:C.red, color:"#fff", border:"none", borderRadius:7, fontWeight:700, cursor:"pointer" }}>{saving?"Deleting…":"Yes, Delete"}</button>
              <button onClick={()=>setConfirmDel(null)} style={{ padding:"0.6rem 1.25rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:"1.25rem" }}>
        {[["engagements","🔍 Engagements"],["findings","⚠️ Findings"],["followUp","✅ Follow-up"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setView(k); setMode(null); }}
            style={{ padding:"0.5rem 1.1rem", border:"none", background:"transparent", cursor:"pointer",
              fontSize:"0.82rem", fontWeight:600, color:view===k?C.text:C.muted,
              borderBottom:view===k?`2px solid ${C.blue}`:"2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <h3 style={{ color:C.text, margin:"0 0 0.2rem", fontWeight:700 }}>
            {view==="engagements"?"Engagements":view==="findings"?"Findings Register":"Follow-up Register"} — Edit Mode
          </h3>
          <p style={{ color:C.muted, fontSize:"0.82rem", margin:0 }}>{items.length} items</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          <button onClick={()=>setMode("add")} disabled={!!mode} style={{ padding:"0.6rem 1.25rem", background:addColor, color:addColor===C.amber||addColor===C.green?C.bg:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:mode?0.5:1 }}>+ {addLabel}</button>
          <button onClick={seedDemoData} disabled={saving||!!mode} style={{ padding:"0.6rem 1.1rem", background:"transparent", color:C.green, border:`1px solid ${C.green}`, borderRadius:8, fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:(saving||mode)?0.5:1 }}>🌱 Seed Demo Data</button>
          <button onClick={load} style={{ padding:"0.6rem 0.9rem", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" }}>↻ Refresh</button>
        </div>
      </div>

      {mode==="add"         && <FormComponent onSave={handleSave} onCancel={()=>setMode(null)} saving={saving}/>}
      {mode && mode!=="add" && <FormComponent initial={mode} onSave={handleSave} onCancel={()=>setMode(null)} saving={saving}/>}

      {loading ? <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>Loading…</div> : (
        <Card>
          {view==="engagements" && (
            <Table
              headers={["ID","Title","Area","Type","Phase","Opinion","Findings","Status","Actions"]}
              rows={items.map(e=>[
                <span style={{ color:C.blue, fontWeight:700, fontSize:"0.72rem" }}>{e.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.8rem", maxWidth:140, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={e.title}>{e.title}</span>,
                <span style={{ fontSize:"0.72rem", color:C.muted }}>{e.area.split(" ")[0]}</span>,
                <Badge label={e.type} color="blue"/>,
                <span style={{ fontSize:"0.72rem", color:C.muted }}>{e.phase}</span>,
                <IAOpinionBadge opinion={e.opinion}/>,
                <span style={{ color:e.findings>0?C.amber:C.muted, fontWeight:700 }}>{e.findings}</span>,
                <IAStatusBadge status={e.status}/>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...e })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(e.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
          {view==="findings" && (
            <Table
              headers={["ID","Title","Severity","Status","Responsible","Due Date","Repeat","Actions"]}
              rows={items.map(f=>[
                <span style={{ color:C.amber, fontWeight:700, fontSize:"0.72rem" }}>{f.id}</span>,
                <span style={{ fontWeight:600, fontSize:"0.8rem", maxWidth:180, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={f.title}>{f.title}</span>,
                <IASeverityBadge severity={f.severity}/>,
                <IAStatusBadge status={f.status}/>,
                f.responsiblePerson,
                <span style={{ color:f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Resolved"?C.red:C.muted, fontSize:"0.75rem" }}>{f.dueDate||"—"}</span>,
                f.repeatedFinding?<span style={{ color:C.red, fontWeight:700, fontSize:"0.72rem" }}>⟳</span>:<span style={{ color:C.muted, fontSize:"0.75rem" }}>—</span>,
                <div style={{ display:"flex", gap:"0.4rem" }}>
                  <button onClick={()=>setMode({ ...f })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                  <button onClick={()=>setConfirmDel(f.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                </div>,
              ])}
            />
          )}
          {view==="followUp" && (
            <Table
              headers={["ID","Finding","Title","Due Date","Status","Progress","Actions"]}
              rows={items.map(f=>{
                const isOverdue = f.dueDate&&new Date(f.dueDate)<new Date()&&f.status!=="Closed";
                return [
                  <span style={{ color:C.green, fontWeight:700, fontSize:"0.72rem" }}>{f.id}</span>,
                  <span style={{ color:C.amber, fontSize:"0.75rem", fontWeight:700 }}>{f.findingId}</span>,
                  <span style={{ fontWeight:600, fontSize:"0.8rem" }}>{f.title}</span>,
                  <span style={{ color:isOverdue?C.red:C.muted, fontWeight:isOverdue?700:400, fontSize:"0.75rem" }}>{f.dueDate}{isOverdue?" ⚠":""}</span>,
                  <IAStatusBadge status={f.status}/>,
                  <span style={{ fontSize:"0.72rem", color:C.muted, maxWidth:140, display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={f.progressNote}>{f.progressNote||"—"}</span>,
                  <div style={{ display:"flex", gap:"0.4rem" }}>
                    <button onClick={()=>setMode({ ...f })} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.blue, border:`1px solid ${C.blue}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Edit</button>
                    <button onClick={()=>setConfirmDel(f.id)} disabled={!!mode} style={{ padding:"0.3rem 0.6rem", background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:5, fontSize:"0.72rem", cursor:"pointer", opacity:mode?0.4:1 }}>Del</button>
                  </div>,
                ];
              })}
            />
          )}
        </Card>
      )}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id:"executive",     label:"Executive Overview",  icon:"🏛" },
  { id:"appetite",      label:"Risk Appetite",        icon:"⚖" },
  { id:"strategic",     label:"Strategic Risks",      icon:"🎯" },
  { id:"kri",           label:"KRI Monitoring",       icon:"📊" },
  { id:"opportunities", label:"Opportunities",        icon:"💡" },
  { id:"emerging",      label:"Emerging Risks",       icon:"🌐" },
  { id:"treatment",     label:"Treatment Actions",    icon:"🔧" },
  { id:"assurance",     label:"Combined Assurance",   icon:"✅" },
  { id:"bcm",           label:"BCM Resilience",       icon:"🛡" },
  { id:"fraud",         label:"Fraud & Ethics",       icon:"⚠" },
  { id:"departmental",  label:"Departmental Risks",   icon:"🏢" },
  { id:"uifw",          label:"UIFW Expenditure",     icon:"💰" },
  { id:"thirdparty",    label:"Third-Party Risk",     icon:"🤝" },
  { id:"app",           label:"APP Alignment",        icon:"📋" },
  { id:"predictive",    label:"Predictive Intel",     icon:"🔮" },
  { id:"compliance",    label:"Compliance",           icon:"⚖" },
  { id:"iam",            label:"Identity & Access",     icon:"🔐" },
  { id:"policy",         label:"Policy & Process",      icon:"📜" },
  { id:"declarations",   label:"Declarations",          icon:"📝" },
  { id:"projects",       label:"Projects & Contracts",  icon:"📁" },
  { id:"internalaudit", label:"Internal Audit",        icon:"🔎" },
  { id:"auditlog",      label:"Audit Log",            icon:"🔍" },
  { id:"admin",         label:"Admin Panel",          icon:"⚙" },
];

const MODULES = {
  executive:ExecutiveOverview, appetite:RiskAppetite, strategic:StrategicRisks,
  kri:KRIMonitoring, opportunities:Opportunities, emerging:EmergingRisks,
  treatment:TreatmentActions, assurance:CombinedAssurance, bcm:BCMResilience,
  fraud:FraudEthics, departmental:DepartmentalRisks, uifw:UIFWExpenditure,
  thirdparty:ThirdPartyRisk, app:APPAlignment, predictive:PredictiveIntel,
  compliance:ComplianceModule,
  iam:       IAMModule,
  policy:    PolicyModule,
  declarations:DeclarationsModule,
  projects:  ProjectsModule,
  internalaudit: InternalAuditModule,
  auditlog:      AuditLog,
  admin:AdminTab,
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const PERIODS = [
  { value:"Q1-2526", label:"Q1 2025/26" },
  { value:"Q2-2526", label:"Q2 2025/26" },
  { value:"Q3-2526", label:"Q3 2025/26" },
  { value:"Q4-2526", label:"Q4 2025/26" },
  { value:"Q1-2627", label:"Q1 2026/27" },
  { value:"Q2-2627", label:"Q2 2026/27" },
  { value:"Q3-2627", label:"Q3 2026/27" },
  { value:"Q4-2627", label:"Q4 2026/27" },
  { value:"Q1-2728", label:"Q1 2027/28" },
];

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  applyTheme("dark");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Invalid username or password." : "Login failed — please try again.");
        setBusy(false); return;
      }
      const data = await res.json();
      saveSession(data.token, data.user);
      onLogin({ token: data.token, user: data.user });
    } catch (err) {
      setError("Cannot reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:C.bg, fontFamily:"'Segoe UI','Inter',sans-serif", padding:"1rem" }}>
      <form onSubmit={submit} style={{ width:"100%", maxWidth:380, background:C.surface,
        border:`1px solid ${C.border}`, borderRadius:12, padding:"2rem", boxShadow:"0 10px 40px rgba(0,0,0,0.35)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1.25rem" }}>
          <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1d6fa4,#3b82f6)", borderRadius:8,
            display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800 }}>i</div>
          <div>
            <div style={{ color:C.text, fontWeight:800, fontSize:"1rem", lineHeight:1.2 }}>LGSETA — BJMAPEX</div>
            <div style={{ color:C.muted, fontSize:"0.72rem" }}>GRC Intelligence Center</div>
          </div>
        </div>
        <h3 style={{ color:C.text, fontSize:"0.95rem", margin:"0 0 1rem" }}>Sign in</h3>
        {error && <div style={{ background:"rgba(220,38,38,0.12)", border:`1px solid ${C.red}`, color:C.red,
          borderRadius:6, padding:"0.5rem 0.7rem", fontSize:"0.78rem", marginBottom:"0.85rem" }}>{error}</div>}
        <label style={{ display:"block", color:C.muted, fontSize:"0.72rem", marginBottom:"0.25rem" }}>Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} autoFocus autoComplete="username"
          style={{ width:"100%", boxSizing:"border-box", background:C.bg, border:`1px solid ${C.border}`, borderRadius:6,
            color:C.text, fontSize:"0.85rem", padding:"0.55rem 0.7rem", marginBottom:"0.85rem", outline:"none" }}/>
        <label style={{ display:"block", color:C.muted, fontSize:"0.72rem", marginBottom:"0.25rem" }}>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"
          style={{ width:"100%", boxSizing:"border-box", background:C.bg, border:`1px solid ${C.border}`, borderRadius:6,
            color:C.text, fontSize:"0.85rem", padding:"0.55rem 0.7rem", marginBottom:"1.1rem", outline:"none" }}/>
        <button type="submit" disabled={busy}
          style={{ width:"100%", background:busy?C.muted:C.blue, color:"#fff", border:"none", borderRadius:6,
            padding:"0.6rem", fontSize:"0.85rem", fontWeight:700, cursor:busy?"default":"pointer" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    const t = (typeof localStorage !== "undefined" && localStorage.getItem(TOKEN_KEY)) || null;
    return t ? { token: t, user: storedUser() } : null;
  });
  const [active, setActive]     = useState("executive");
  const [period, setPeriod]     = useState("Q2-2627");
  const [darkMode, setDarkMode] = useState(true);
  const Module = MODULES[active] || ExecutiveOverview;

  // Apply the active palette into the live `C` token object whenever the mode
  // changes. Toggling state forces App (and all modules) to re-render with the
  // new surface colours.
  useEffect(() => { applyTheme(darkMode ? "dark" : "light"); }, [darkMode]);
  // Any API call that gets a 401 (expired/invalid token) bounces back to login.
  useEffect(() => {
    const onUnauth = () => setSession(null);
    window.addEventListener("bjmapex-unauthorized", onUnauth);
    return () => window.removeEventListener("bjmapex-unauthorized", onUnauth);
  }, []);
  applyTheme(darkMode ? "dark" : "light"); // ensure tokens are correct on first paint

  if (!session) return <LoginScreen onLogin={setSession} />;
  const logout = () => { clearSession(); setSession(null); };

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'Segoe UI','Inter',sans-serif", overflow:"hidden" }}>
      {/* Sidebar */}
      <aside style={{ width:240, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
        <div style={{ padding:"1rem 1.1rem 0.75rem", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.surface, zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#1d6fa4,#3b82f6)", borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:"0.85rem", flexShrink:0 }}>i</div>
            <div>
              <div style={{ color:C.text, fontWeight:800, fontSize:"0.88rem", lineHeight:1.2 }}>LGSETA — BJMAPEX</div>
              <div style={{ color:C.muted, fontSize:"0.7rem" }}>GRC Intelligence Center</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"0.5rem 0" }}>
          {NAV.map((item,i)=>{
            const isActive = active===item.id;
            const isAdmin  = item.id==="admin";
            return (
              <button key={item.id} onClick={()=>setActive(item.id)}
                style={{ display:"flex", alignItems:"center", gap:"0.65rem", width:"100%", padding:"0.55rem 1.1rem",
                  border:"none", background:isActive?"rgba(88,166,255,0.12)":"transparent",
                  cursor:"pointer", textAlign:"left",
                  borderLeft:`3px solid ${isActive?C.blue:"transparent"}`,
                  marginTop:isAdmin&&i>0?"0.25rem":0,
                  borderTop:isAdmin?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:"0.95rem", width:20, textAlign:"center" }}>{item.icon}</span>
                <span style={{ color:isActive?C.text:isAdmin?C.purple:C.muted, fontSize:"0.83rem", fontWeight:isActive?700:500 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 1.5rem",
          height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ color:C.text, fontSize:"1rem", fontWeight:700, margin:0 }}>
            {NAV.find(n=>n.id===active)?.label}
          </h2>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            <select value={period} onChange={e=>setPeriod(e.target.value)}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
                color:C.text, fontSize:"0.75rem", padding:"0.3rem 0.6rem", cursor:"pointer", outline:"none" }}>
              {PERIODS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Switch to Light Mode":"Switch to Dark Mode"}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
                color:C.text, fontSize:"0.85rem", padding:"0.3rem 0.5rem", cursor:"pointer", lineHeight:1 }}>
              {darkMode?"☀️":"🌙"}
            </button>
            <span style={{ color:C.green, fontSize:"0.78rem", fontWeight:600 }}>● Live</span>
            <span style={{ color:C.muted, fontSize:"0.78rem" }}>{PERIODS.find(p=>p.value===period)?.label||"Q2 2026/27"}</span>
            <span style={{ width:1, height:20, background:C.border }} />
            <span style={{ color:C.text, fontSize:"0.78rem", fontWeight:600 }}>
              {session.user?.name || session.user?.username || "User"}
              {session.user?.role ? <span style={{ color:C.muted, fontWeight:400 }}>{" · "+session.user.role}</span> : null}
            </span>
            <button onClick={logout} title="Sign out"
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
                color:C.text, fontSize:"0.75rem", padding:"0.3rem 0.6rem", cursor:"pointer" }}>
              Sign out
            </button>
          </div>
        </header>
        <main style={{ flex:1, overflowY:"auto", padding:"1.5rem" }}>
          <PeriodContext.Provider value={period}>
            <Module/>
          </PeriodContext.Provider>
        </main>
      </div>
    </div>
  );
}
