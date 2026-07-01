// Static fallback / demo data. Feature modules render these when the API
// returns nothing (first run, offline, or an empty collection).

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

export { STATIC_RISKS, STATIC_KRIS, STATIC_TREATMENTS, STATIC_UIFW, STATIC_FRAUD, STATIC_DEPTS, STATIC_PORTFOLIOS, STATIC_OPRISKS, STATIC_THIRD, STATIC_APP, STATIC_EMERGING, STATIC_OPP, STATIC_APPETITE, STATIC_ASSURANCE, STATIC_BCM };
