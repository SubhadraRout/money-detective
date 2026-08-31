import fs from "node:fs";
import path from "node:path";

import type { FinancialDataset } from "../types/financial.js";
import type { InvestigationCase } from "../investigation/investigationCase.js";
interface GroundTruthCase {
  caseId: string;
  groundTruth: boolean;
}

interface GroundTruthFile {
  version: string;
  generatedAt: string;
  cases: GroundTruthCase[];
}


interface InvestigationCasesFile {
  version: string;
  generatedAt: string;
  summary: {
    totalCases: number;
    totalPotentialLeakage: number;
    criticalCases: number;
    highCases: number;
    mediumCases: number;
    lowCases: number;
  };
  cases: InvestigationCase[];
}

interface EvidenceGraph {
  caseId: string;
  nodes: unknown[];
  edges: unknown[];
}

interface EvidenceGraphsFile {
  version: string;
  generatedAt: string;
  graphs: EvidenceGraph[];
}

interface AIReport {
  caseId: string;
  finding: {
    type: string;
    title: string;
    whatHappened: string;
    whyItMatters: string;
    financialImpact: number;
    confidence: string;
    evidence: string[];
    merchantExplanation: string;
    recommendedNextStep: string;
  };
}

interface AIReportsFile {
  version: string;
  generatedAt: string;
  reports: AIReport[];
}

interface RecoveryPlan {
  caseId: string;
  recoveryStatus: string;
  recoverability: string;
  recoverabilityReason: string;

  financialImpact: {
    potentialRecovery: number;
    currency: string;
  };

  recoveryAction: {
    type: string;
    action: string;
    owner: string;
    priority: string;
  };

  rationale: string;

  steps: string[];

  humanReview: {
    required: boolean;
    reason: string;
  };

  verification: {
    criteria: string;
    expectedOutcome: string;
  };

  aiContext: {
    confidence: string;
    finding: string;
    recommendedNextStep: string;
  };
}
interface RecoveryPlansFile {
  version: string;
  generatedAt: string;
  plans: RecoveryPlan[];
}

const dataRoot = path.resolve(
  process.cwd(),
  "../data"
);

const datasetPath = path.join(
  dataRoot,
  "generated",
  "financial-dataset.json"
);

const groundTruthPath = path.join(
  dataRoot,
  "ground-truth",
  "ground-truth.json"
);

const casesPath = path.join(
  dataRoot,
  "investigations",
  "investigation-cases.json"
);

const graphsPath = path.join(
  dataRoot,
  "investigations",
  "evidence-graphs.json"
);

const aiReportsPath = path.join(
  dataRoot,
  "investigations",
  "ai-investigation-reports.json"
);

const recoveryPlansPath = path.join(
  dataRoot,
  "investigations",
  "recovery-action-plans.json"
);

function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing required artifact: ${filePath}`
    );
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  ) as T;
}

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(
      `VERIFICATION FAILED: ${message}`
    );
  }
}

function money(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function isFinitePositive(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function isFiniteNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

console.log("");
console.log(
  "========================================"
);
console.log(
  "      MONEY DETECTIVE PIPELINE VERIFY"
);
console.log(
  "========================================"
);
console.log("");

const dataset =
  loadJson<FinancialDataset>(
    datasetPath
  );

const groundTruth =
  loadJson<GroundTruthFile>(
    groundTruthPath
  );

const investigationCases =
  loadJson<InvestigationCasesFile>(
    casesPath
  );

const evidenceGraphs =
  loadJson<EvidenceGraphsFile>(
    graphsPath
  );

const aiReports =
  loadJson<AIReportsFile>(
    aiReportsPath
  );

const recoveryPlans =
  loadJson<RecoveryPlansFile>(
    recoveryPlansPath
  );

/*
 * --------------------------------------------------
 * ARTIFACT SUMMARY
 * --------------------------------------------------
 */

console.log("ARTIFACTS");
console.log("----------------------------------------");

console.log(
  `Dataset:             ${dataset.orders.length} orders`
);

console.log(
  `Ground truth:        ${groundTruth.cases.length} cases`
);

console.log(
  `Investigation cases: ${investigationCases.cases.length}`
);

console.log(
  `Evidence graphs:     ${evidenceGraphs.graphs.length}`
);

console.log(
  `AI reports:          ${aiReports.reports.length}`
);

console.log(
  `Recovery plans:      ${recoveryPlans.plans.length}`
);

console.log("");

/*
 * --------------------------------------------------
 * DATASET INTEGRITY
 * --------------------------------------------------
 */

console.log("DATASET INTEGRITY");
console.log("----------------------------------------");

assert(
  dataset.orders.length >= 10000,
  "Dataset must contain at least 10,000 orders."
);

console.log(
  "✓ Dataset contains 10,000+ orders"
);

assert(
  dataset.payments.length >= 10000,
  "Dataset must contain at least 10,000 payments."
);

console.log(
  "✓ Dataset contains 10,000+ payments"
);

assert(
  dataset.groundTruth.length >= 600,
  "Dataset ground truth must contain leakage cases."
);

console.log(
  "✓ Dataset contains leakage ground truth"
);

const trueGroundTruth =
  groundTruth.cases.filter(
    (item) => item.groundTruth === true
  );

assert(
  trueGroundTruth.length === 600,
  `Expected 600 true leakage cases, got ${trueGroundTruth.length}.`
);

console.log(
  "✓ Exactly 600 true leakage cases"
);

console.log("");

/*
 * --------------------------------------------------
 * INVESTIGATION LAYER
 * --------------------------------------------------
 */

console.log("INVESTIGATION LAYER");
console.log("----------------------------------------");

assert(
  investigationCases.cases.length ===
    trueGroundTruth.length,
  `Expected ${trueGroundTruth.length} investigation cases, got ${investigationCases.cases.length}.`
);

console.log(
  `✓ ${investigationCases.cases.length} investigation cases generated`
);

const investigationCaseIds =
  new Set(
    investigationCases.cases.map(
      (item) => item.caseId
    )
  );

assert(
  investigationCaseIds.size ===
    investigationCases.cases.length,
  "Investigation case IDs are not unique."
);

console.log(
  "✓ Investigation case IDs are unique"
);

/*
 * Validate every individual leakage amount.
 *
 * This is deliberately done before summing them.
 * It prevents undefined / NaN / string values from
 * silently corrupting the total.
 */

for (
  const investigationCase
  of investigationCases.cases
) {
  assert(
    isFinitePositive(
      investigationCase.financialImpact?.potentialLeakage
    ),
    `Invalid potentialLeakage for ${investigationCase.caseId}.`
  );
}

console.log(
  "✓ Investigation leakage amounts are valid numbers"
);

const totalPotentialLeakage =
  investigationCases.cases.reduce(
    (sum, investigationCase) =>
      sum +
      investigationCase.financialImpact?.potentialLeakage,
    0
  );

assert(
  isFinitePositive(
    totalPotentialLeakage
  ),
  "Investigation layer reported zero or invalid potential leakage."
);

console.log(
  `✓ Potential leakage detected: ${money(
    totalPotentialLeakage
  )}`
);

assert(
  isFiniteNumber(
    investigationCases.summary.totalCases
  ),
  "Investigation summary totalCases is invalid."
);

assert(
  investigationCases.summary.totalCases ===
    investigationCases.cases.length,
  "Investigation summary case count does not match cases."
);

console.log(
  "✓ Investigation summary case count matches"
);

assert(
  isFiniteNumber(
    investigationCases.summary
      .totalPotentialLeakage
  ),
  "Investigation summary totalPotentialLeakage is invalid."
);

assert(
  Math.abs(
    investigationCases.summary
      .totalPotentialLeakage -
      totalPotentialLeakage
  ) < 0.01,
  "Investigation summary leakage does not match case leakage total."
);

console.log(
  "✓ Investigation summary leakage matches case total"
);

console.log("");

/*
 * --------------------------------------------------
 * EVIDENCE GRAPH LAYER
 * --------------------------------------------------
 */

console.log("EVIDENCE GRAPH LAYER");
console.log("----------------------------------------");

assert(
  evidenceGraphs.graphs.length ===
    investigationCases.cases.length,
  "Every investigation case must have an evidence graph."
);

console.log(
  `✓ ${evidenceGraphs.graphs.length} evidence graphs generated`
);

const graphCaseIds =
  new Set(
    evidenceGraphs.graphs.map(
      (graph) => graph.caseId
    )
  );

assert(
  graphCaseIds.size ===
    evidenceGraphs.graphs.length,
  "Evidence graph case IDs are not unique."
);

console.log(
  "✓ Evidence graph case IDs are unique"
);

for (
  const investigationCase
  of investigationCases.cases
) {
  const graph =
  evidenceGraphs.graphs.find(
    (item) =>
      item.caseId ===
      investigationCase.caseId
  );

if (!graph) {
  throw new Error(
    `VERIFICATION FAILED: Missing evidence graph for ${investigationCase.caseId}.`
  );
}

assert(
  Array.isArray(graph.nodes),
  `Invalid graph nodes for ${investigationCase.caseId}.`
);

assert(
  Array.isArray(graph.edges),
  `Invalid graph edges for ${investigationCase.caseId}.`
);

assert(
  graph.nodes.length > 0,
  `Evidence graph has no nodes for ${investigationCase.caseId}.`
);

assert(
  graph.edges.length > 0,
  `Evidence graph has no edges for ${investigationCase.caseId}.`
);
}

console.log(
  "✓ Every investigation case has non-empty evidence"
);

console.log("");

/*
 * --------------------------------------------------
 * AI INVESTIGATION LAYER
 * --------------------------------------------------
 */

console.log("AI INVESTIGATION LAYER");
console.log("----------------------------------------");

assert(
  aiReports.reports.length ===
    investigationCases.cases.length,
  "Every investigation case must have an AI report."
);

console.log(
  `✓ ${aiReports.reports.length} AI reports generated`
);

const aiCaseIds =
  new Set(
    aiReports.reports.map(
      (report) => report.caseId
    )
  );

assert(
  aiCaseIds.size ===
    aiReports.reports.length,
  "AI report case IDs are not unique."
);

console.log(
  "✓ AI report case IDs are unique"
);

for (
  const report
  of aiReports.reports
) {
  assert(
    investigationCaseIds.has(
      report.caseId
    ),
    `AI report references unknown case ${report.caseId}.`
  );

  assert(
    typeof report.finding.type ===
      "string" &&
      report.finding.type.length > 0,
    `Missing AI finding type for ${report.caseId}.`
  );

  assert(
    typeof report.finding.title ===
      "string" &&
      report.finding.title.length > 0,
    `Missing AI title for ${report.caseId}.`
  );

  assert(
    typeof report.finding.whatHappened ===
      "string" &&
      report.finding.whatHappened.length > 0,
    `Missing explanation for ${report.caseId}.`
  );

  assert(
    typeof report.finding.whyItMatters ===
      "string" &&
      report.finding.whyItMatters.length > 0,
    `Missing business impact explanation for ${report.caseId}.`
  );

  assert(
    isFiniteNumber(
      report.finding.financialImpact
    ) &&
      report.finding.financialImpact >= 0,
    `Invalid AI financial impact for ${report.caseId}.`
  );

  assert(
    typeof report.finding.confidence ===
      "string" &&
      report.finding.confidence.length > 0,
    `Missing AI confidence for ${report.caseId}.`
  );

  assert(
    Array.isArray(
      report.finding.evidence
    ) &&
      report.finding.evidence.length > 0,
    `Missing AI evidence for ${report.caseId}.`
  );

  assert(
    typeof report.finding.merchantExplanation ===
      "string" &&
      report.finding.merchantExplanation.length > 0,
    `Missing merchant explanation for ${report.caseId}.`
  );

  assert(
    typeof report.finding.recommendedNextStep ===
      "string" &&
      report.finding.recommendedNextStep.length > 0,
    `Missing next step for ${report.caseId}.`
  );
}

console.log(
  "✓ AI reports contain explanations"
);

console.log(
  "✓ AI reports contain business impact"
);

console.log(
  "✓ AI reports contain evidence"
);

console.log(
  "✓ AI reports contain recommended actions"
);

console.log("");

/*
 * --------------------------------------------------
 * RECOVERY LAYER
 * --------------------------------------------------
 */

console.log("RECOVERY / ACTION PLAN");
console.log("----------------------------------------");

assert(
  recoveryPlans.plans.length ===
    investigationCases.cases.length,
  "Every investigation case must have a recovery plan."
);

console.log(
  `✓ ${recoveryPlans.plans.length} recovery plans generated`
);

const recoveryCaseIds =
  new Set(
    recoveryPlans.plans.map(
      (plan) => plan.caseId
    )
  );

assert(
  recoveryCaseIds.size ===
    recoveryPlans.plans.length,
  "Recovery plan case IDs are not unique."
);

console.log(
  "✓ Recovery plan case IDs are unique"
);

for (const plan of recoveryPlans.plans) {
  assert(
    investigationCaseIds.has(plan.caseId),
    `Recovery plan references unknown case ${plan.caseId}.`
  );

  assert(
    typeof plan.recoverability === "string" &&
      plan.recoverability.length > 0,
    `Missing recoverability for ${plan.caseId}.`
  );

  assert(
    isFiniteNumber(
      plan.financialImpact.potentialRecovery
    ) &&
      plan.financialImpact.potentialRecovery >= 0,
    `Invalid potential recovery for ${plan.caseId}.`
  );

  assert(
    typeof plan.recoveryAction.action === "string" &&
      plan.recoveryAction.action.length > 0,
    `Missing recovery action for ${plan.caseId}.`
  );

  assert(
    typeof plan.recoveryAction.owner === "string" &&
      plan.recoveryAction.owner.length > 0,
    `Missing recovery owner for ${plan.caseId}.`
  );

  assert(
    typeof plan.recoveryAction.priority === "string" &&
      plan.recoveryAction.priority.length > 0,
    `Missing recovery priority for ${plan.caseId}.`
  );

  assert(
    plan.humanReview.required === true,
    `Recovery plan ${plan.caseId} must require human review.`
  );

  assert(
    Array.isArray(plan.steps) &&
      plan.steps.length > 0,
    `Recovery plan ${plan.caseId} has no steps.`
  );
}

console.log(
  "✓ Recovery plans contain required actions"
);

const recoveryAmount =
  recoveryPlans.plans.reduce(
    (sum, plan) =>
      sum +
      plan.financialImpact.potentialRecovery,
    0
  );

assert(
  isFiniteNumber(recoveryAmount) &&
    recoveryAmount > 0,
  "Recovery engine reported zero or invalid recoverable amount."
);

console.log(
  `✓ Potential recovery: ${money(
    recoveryAmount
  )}`
);

const humanReviewCount =
  recoveryPlans.plans.filter(
    (plan) =>
      plan.humanReview.required === true
  ).length;

assert(
  humanReviewCount ===
    recoveryPlans.plans.length,
  "Every recovery plan should require human review."
);

console.log(
  `✓ Human review required: ${humanReviewCount}/${recoveryPlans.plans.length}`
);

console.log("");

/*
 * --------------------------------------------------
 * END-TO-END CASE LINKAGE
 * --------------------------------------------------
 */

console.log("END-TO-END LINKAGE");
console.log("----------------------------------------");

for (
  const investigationCase
  of investigationCases.cases
) {
  const caseId =
    investigationCase.caseId;

  assert(
    graphCaseIds.has(caseId),
    `Graph missing for ${caseId}.`
  );

  assert(
    aiCaseIds.has(caseId),
    `AI report missing for ${caseId}.`
  );

  assert(
    recoveryCaseIds.has(caseId),
    `Recovery plan missing for ${caseId}.`
  );
}

console.log(
  "✓ Case → Evidence Graph linkage valid"
);

console.log(
  "✓ Case → AI Report linkage valid"
);

console.log(
  "✓ Case → Recovery Plan linkage valid"
);

console.log("");

/*
 * --------------------------------------------------
 * FINAL SUMMARY
 * --------------------------------------------------
 */

console.log(
  "========================================"
);

console.log(
  "       PIPELINE VERIFICATION COMPLETE"
);

console.log(
  "========================================"
);

console.log("");

console.log(
  "✓ Synthetic financial dataset"
);

console.log(
  "✓ Ground-truth leakage cases"
);

console.log(
  "✓ Deterministic investigation"
);

console.log(
  "✓ Evidence graphs"
);

console.log(
  "✓ AI investigation reports"
);

console.log(
  "✓ Recoverability analysis"
);

console.log(
  "✓ Recovery action plans"
);

console.log(
  "✓ End-to-end case linkage"
);

console.log("");

console.log(
  `Potential leakage: ${money(
    totalPotentialLeakage
  )}`
);

console.log(
  `Potential recovery: ${money(
    recoveryAmount
  )}`
);

console.log(
  `Cases requiring human review: ${humanReviewCount}`
);

console.log("");

console.log(
  "PIPELINE STATUS: READY FOR API / UI"
);

console.log("");