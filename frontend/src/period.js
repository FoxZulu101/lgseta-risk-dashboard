// Reporting-period context + the list of selectable periods.
import { createContext, useContext } from "react";

// ─── PERIOD CONTEXT ───────────────────────────────────────────────────────────
// Lets any module read the globally-selected reporting period via usePeriod().
// Modules that don't need it simply ignore it — no prop-drilling required.
const PeriodContext = createContext("Q2-2627");
function usePeriod() { return useContext(PeriodContext); }

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

export { PeriodContext, usePeriod, PERIODS };
