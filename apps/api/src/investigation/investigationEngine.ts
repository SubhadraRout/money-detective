import type {
  FinancialDataset,
  InvestigationCandidate,
} from "../types/financial.js";

import { detectDuplicateRefunds } from "./detectors/duplicateRefundDetector.js";
import {
  detectCapturedCancelledNoRefund,
} from "./detectors/cancelledNoRefundDetector.js";
import {
  detectRefundAmountMismatch,
} from "./detectors/refundMismatchDetector.js";
import {
  detectSettlementMismatch,
} from "./detectors/settlementMismatchDetector.js";
import {
  detectMissingSettlements,
} from "./detectors/missingSettlementDetector.js";
import {
  detectUnexplainedAdjustments,
} from "./detectors/unexplainedAdjustmentDetector.js";

export interface InvestigationReport {
  generatedAt: string;
  totalCandidates: number;
  totalPotentialLeakage: number;
  candidates: InvestigationCandidate[];
}

export function investigate(
  dataset: FinancialDataset
): InvestigationReport {
  const candidates: InvestigationCandidate[] = [
    ...detectDuplicateRefunds(dataset),

    ...detectCapturedCancelledNoRefund(
      dataset
    ),

    ...detectRefundAmountMismatch(
      dataset
    ),

    ...detectSettlementMismatch(
      dataset
    ),

    ...detectMissingSettlements(
      dataset
    ),

    ...detectUnexplainedAdjustments(
      dataset
    ),
  ];

  /*
   * Remove accidental duplicates produced by
   * overlapping detector conditions.
   */

  const uniqueCandidates =
    new Map<string, InvestigationCandidate>();

  for (const candidate of candidates) {
    uniqueCandidates.set(
      candidate.caseId,
      candidate
    );
  }

  const finalCandidates =
    Array.from(uniqueCandidates.values());

  /*
   * Highest financial impact first.
   */

  finalCandidates.sort(
    (a, b) =>
      b.potentialLeakage -
      a.potentialLeakage
  );

  const totalPotentialLeakage =
    finalCandidates.reduce(
      (sum, candidate) =>
        sum + candidate.potentialLeakage,
      0
    );

  return {
    generatedAt: new Date().toISOString(),
    totalCandidates: finalCandidates.length,
    totalPotentialLeakage,
    candidates: finalCandidates,
  };
}