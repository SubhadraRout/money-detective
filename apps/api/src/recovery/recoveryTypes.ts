import type { LeakageType } from "../types/financial.js";

export type Recoverability =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "NOT_RECOVERABLE";

export type RecoveryConfidence =
  | "high"
  | "medium"
  | "low";

export type ActionPriority =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type ActionStatus =
  | "ACTION_REQUIRED"
  | "REVIEW_REQUIRED"
  | "MONITOR";

export interface RecoveryActionPlan {
  caseId: string;
  type: LeakageType;

  potentialLeakage: number;

  recoverability: Recoverability;
  recoverableAmount: number;
  recoveryConfidence: RecoveryConfidence;

  priority: ActionPriority;

  recommendedAction: string;
  verificationCriteria: string;

  actionStatus: ActionStatus;

  explanation: string;
}

export interface RecoveryActionPlanFile {
  version: string;
  generatedAt: string;
  totalCases: number;
  totalPotentialLeakage: number;
  totalRecoverableAmount: number;
  plans: RecoveryActionPlan[];
}