import fs from "node:fs";
import path from "node:path";

import type { InvestigationCase } from "../investigation/investigationCase.js";
import type { EvidenceGraph } from "../investigation/evidenceGraph.js";
import type { AIInvestigationReport } from "../ai/aiInvestigator.js";
import type { RecoveryPlan } from "../recovery/recoveryEngine.js";

interface InvestigationCasesFile {
  cases: InvestigationCase[];
}

interface EvidenceGraphsFile {
  graphs: EvidenceGraph[];
}

interface AIReportsFile {
  reports: AIInvestigationReport[];
}

interface RecoveryPlansFile {
  plans: RecoveryPlan[];
}

interface RecoveryVerification {
  caseId: string;
  status: string;
  potentialRecovery: number;
  verifiedRecovery: number;
  remainingExposure: number;
}

interface RecoveryVerificationFile {
  results: RecoveryVerification[];
}

const dataRoot = path.resolve(
  process.cwd(),
  "../data/investigations"
);

function loadJson<T>(fileName: string): T {
  const filePath = path.join(
    dataRoot,
    fileName
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Artifact not found: ${filePath}`
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf-8"
    )
  ) as T;
}

export function getInvestigationCases(): InvestigationCase[] {
  return loadJson<InvestigationCasesFile>(
    "investigation-cases.json"
  ).cases;
}

export function getEvidenceGraphs(): EvidenceGraph[] {
  return loadJson<EvidenceGraphsFile>(
    "evidence-graphs.json"
  ).graphs;
}

export function getAIReports(): AIInvestigationReport[] {
  return loadJson<AIReportsFile>(
    "ai-investigation-reports.json"
  ).reports;
}

export function getRecoveryPlans(): RecoveryPlan[] {
  return loadJson<RecoveryPlansFile>(
    "recovery-action-plans.json"
  ).plans;
}

export function getRecoveryVerification(): RecoveryVerification[] {
  return loadJson<RecoveryVerificationFile>(
    "recovery-verification.json"
  ).results;
}