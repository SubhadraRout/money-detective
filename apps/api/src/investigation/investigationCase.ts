import type {
  Evidence,
  InvestigationCandidate,
  LeakageType,
} from "../types/financial.js";

export type InvestigationSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type Recoverability =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export type InvestigationStatus =
  | "detected"
  | "investigating"
  | "action_required"
  | "recovery_pending"
  | "recovered"
  | "closed";

export interface InvestigationCase {
  caseId: string;

  type: LeakageType;

  status: InvestigationStatus;

  severity: InvestigationSeverity;

  title: string;

  summary: string;

  problem: string;

  financialImpact: {
    expectedAmount: number;
    actualAmount: number;
    potentialLeakage: number;
    currency: "INR";
  };

  entities: {
    orderId?: string;
    paymentId?: string;
    refundIds?: string[];
    settlementId?: string;
  };

  evidence: Evidence[];

  rootCause: {
    category: string;
    explanation: string;
  };

  confidence: number;

  recoverability: Recoverability;

  recoverabilityReason: string;

  recommendedAction: {
    action: string;
    owner: string;
    priority: InvestigationSeverity;
  };

  verification: {
    criteria: string;
    expectedOutcome: string;
  };
}

function determineSeverity(
  candidate: InvestigationCandidate
): InvestigationSeverity {
  const amount = candidate.potentialLeakage;

  if (amount >= 50000) {
    return "critical";
  }

  if (amount >= 20000) {
    return "high";
  }

  if (amount >= 5000) {
    return "medium";
  }

  return "low";
}

function determineRecoverability(
  type: LeakageType
): Recoverability {
  switch (type) {
    case "DUPLICATE_REFUND":
      return "high";

    case "CAPTURED_CANCELLED_NO_REFUND":
      return "high";

    case "REFUND_AMOUNT_MISMATCH":
      return "high";

    case "SETTLEMENT_MISMATCH":
      return "high";

    case "MISSING_SETTLEMENT":
      return "high";

    case "UNEXPLAINED_ADJUSTMENT":
      return "medium";

    default:
      return "unknown";
  }
}

function getRecoverabilityReason(
  type: LeakageType
): string {
  switch (type) {
    case "DUPLICATE_REFUND":
      return "A duplicate refund is directly identifiable and can be reconciled against the original payment and refund records.";

    case "CAPTURED_CANCELLED_NO_REFUND":
      return "The payment was captured while the associated order was cancelled without a corresponding refund, making the amount potentially recoverable through refund reconciliation.";

    case "REFUND_AMOUNT_MISMATCH":
      return "The refund amount differs from the expected refund amount, creating a directly measurable financial discrepancy.";

    case "SETTLEMENT_MISMATCH":
      return "The settlement net amount differs from the amount expected from the payment, fees, taxes and adjustments.";

    case "MISSING_SETTLEMENT":
      return "The payment is captured but has no corresponding settlement record, making settlement reconciliation the appropriate recovery path.";

    case "UNEXPLAINED_ADJUSTMENT":
      return "The settlement contains an adjustment that is not explained by the available financial records and should be reconciled.";

    default:
      return "Recoverability requires additional investigation.";
  }
}

function getRootCause(
  type: LeakageType
): {
  category: string;
  explanation: string;
} {
  switch (type) {
    case "DUPLICATE_REFUND":
      return {
        category: "Refund reconciliation",
        explanation:
          "Multiple refund records indicate that more money may have been refunded than intended for the payment.",
      };

    case "CAPTURED_CANCELLED_NO_REFUND":
      return {
        category: "Order/payment reconciliation",
        explanation:
          "The order was cancelled after payment capture, but the captured amount was not matched with an appropriate refund.",
      };

    case "REFUND_AMOUNT_MISMATCH":
      return {
        category: "Refund amount reconciliation",
        explanation:
          "The recorded refund amount does not match the expected refund amount derived from the transaction.",
      };

    case "SETTLEMENT_MISMATCH":
      return {
        category: "Settlement reconciliation",
        explanation:
          "The settlement net amount differs from the expected amount after accounting for fees, taxes and adjustments.",
      };

    case "MISSING_SETTLEMENT":
      return {
        category: "Settlement tracking",
        explanation:
          "A captured payment has no corresponding settlement record.",
      };

    case "UNEXPLAINED_ADJUSTMENT":
      return {
        category: "Settlement adjustment",
        explanation:
          "A settlement contains an adjustment that cannot be explained by the available transaction records.",
      };

    default:
      return {
        category: "Financial reconciliation",
        explanation:
          "The transaction requires additional reconciliation.",
      };
  }
}

function getRecommendedAction(
  type: LeakageType,
  severity: InvestigationSeverity
): {
  action: string;
  owner: string;
  priority: InvestigationSeverity;
} {
  switch (type) {
    case "DUPLICATE_REFUND":
      return {
        action:
          "Reconcile all refunds against the original payment and determine whether a duplicate refund should be recovered.",
        owner: "Finance / Payments Operations",
        priority: severity,
      };

    case "CAPTURED_CANCELLED_NO_REFUND":
      return {
        action:
          "Verify the cancellation and initiate the appropriate refund or reconciliation process for the captured payment.",
        owner: "Finance / Customer Operations",
        priority: severity,
      };

    case "REFUND_AMOUNT_MISMATCH":
      return {
        action:
          "Compare the expected and processed refund amounts and recover the discrepancy if the refund was excessive.",
        owner: "Finance / Payments Operations",
        priority: severity,
      };

    case "SETTLEMENT_MISMATCH":
      return {
        action:
          "Reconcile the settlement against payment, fee, tax and adjustment records and raise a settlement discrepancy if required.",
        owner: "Finance / Payments Operations",
        priority: severity,
      };

    case "MISSING_SETTLEMENT":
      return {
        action:
          "Trace the captured payment through settlement records and raise a settlement reconciliation issue if the payment remains unsettled.",
        owner: "Finance / Payments Operations",
        priority: severity,
      };

    case "UNEXPLAINED_ADJUSTMENT":
      return {
        action:
          "Identify the source of the settlement adjustment and reconcile it against supporting financial records.",
        owner: "Finance / Payments Operations",
        priority: severity,
      };

    default:
      return {
        action:
          "Perform financial reconciliation and investigate the discrepancy.",
        owner: "Finance",
        priority: severity,
      };
  }
}

function getVerificationCriteria(
  type: LeakageType
): {
  criteria: string;
  expectedOutcome: string;
} {
  switch (type) {
    case "DUPLICATE_REFUND":
      return {
        criteria:
          "Reconcile every refund associated with the payment against the intended refund amount.",
        expectedOutcome:
          "The duplicate refund is reversed or otherwise financially reconciled.",
      };

    case "CAPTURED_CANCELLED_NO_REFUND":
      return {
        criteria:
          "Verify the order cancellation and confirm whether the captured payment has been refunded.",
        expectedOutcome:
          "The payment is refunded appropriately or the cancellation is legitimately reconciled.",
      };

    case "REFUND_AMOUNT_MISMATCH":
      return {
        criteria:
          "Compare the expected refund amount with the processed refund amount.",
        expectedOutcome:
          "The refund discrepancy is corrected or explicitly justified.",
      };

    case "SETTLEMENT_MISMATCH":
      return {
        criteria:
          "Recalculate expected settlement net amount from payment, fees, taxes and adjustments.",
        expectedOutcome:
          "The settlement discrepancy is reconciled or a settlement dispute is raised.",
      };

    case "MISSING_SETTLEMENT":
      return {
        criteria:
          "Trace the captured payment through settlement records.",
        expectedOutcome:
          "A valid settlement is found or the missing settlement is escalated for recovery.",
      };

    case "UNEXPLAINED_ADJUSTMENT":
      return {
        criteria:
          "Identify and reconcile the settlement adjustment with supporting records.",
        expectedOutcome:
          "The adjustment is explained, corrected or escalated for recovery.",
      };

    default:
      return {
        criteria:
          "Perform financial reconciliation.",
        expectedOutcome:
          "The discrepancy is explained or financially recovered.",
      };
  }
}

function getTitle(
  type: LeakageType
): string {
  switch (type) {
    case "DUPLICATE_REFUND":
      return "Possible duplicate refund";

    case "CAPTURED_CANCELLED_NO_REFUND":
      return "Captured payment on cancelled order";

    case "REFUND_AMOUNT_MISMATCH":
      return "Refund amount mismatch";

    case "SETTLEMENT_MISMATCH":
      return "Settlement amount mismatch";

    case "MISSING_SETTLEMENT":
      return "Captured payment missing settlement";

    case "UNEXPLAINED_ADJUSTMENT":
      return "Unexplained settlement adjustment";

    default:
      return "Financial discrepancy detected";
  }
}

function getSummary(
  candidate: InvestigationCandidate
): string {
  return (
    `${getTitle(candidate.type)} involving ` +
    `${candidate.paymentId ?? candidate.orderId ?? "an unknown transaction"}. ` +
    `Potential financial impact is ₹${candidate.potentialLeakage.toFixed(2)}.`
  );
}

function calculateConfidence(
  candidate: InvestigationCandidate
): number {
  /*
   * Phase 3.1 uses deterministic evidence strength.
   *
   * This is NOT an AI confidence score yet.
   * The AI reasoning layer can replace/enrich this
   * value in a later phase.
   */

  const evidenceCount =
    candidate.evidence.length;

  if (evidenceCount >= 6) {
    return 0.99;
  }

  if (evidenceCount >= 4) {
    return 0.95;
  }

  if (evidenceCount >= 2) {
    return 0.90;
  }

  return 0.80;
}

export function createInvestigationCase(
  candidate: InvestigationCandidate
): InvestigationCase {
  const severity =
    determineSeverity(candidate);

  const recoverability =
    determineRecoverability(candidate.type);

  const rootCause =
    getRootCause(candidate.type);

  const recommendedAction =
    getRecommendedAction(
      candidate.type,
      severity
    );

  const verification =
    getVerificationCriteria(candidate.type);

  const confidence =
    calculateConfidence(candidate);

  const recoverabilityReason =
    getRecoverabilityReason(candidate.type);

  return {
    caseId: candidate.caseId,

    type: candidate.type,

    status: "detected",

    severity,

    title: getTitle(candidate.type),

    summary: getSummary(candidate),

    problem: candidate.deterministicReason,

    financialImpact: {
      expectedAmount:
        candidate.expectedAmount,

      actualAmount:
        candidate.actualAmount,

      potentialLeakage:
        candidate.potentialLeakage,

      currency: "INR",
    },

    entities: {
      orderId: candidate.orderId,
      paymentId: candidate.paymentId,
      refundIds: candidate.refundIds,
      settlementId: candidate.settlementId,
    },

    evidence: candidate.evidence,

    rootCause,

    confidence,

    recoverability,

    recoverabilityReason,

    recommendedAction,

    verification,
  };
}

export function createInvestigationCases(
  candidates: InvestigationCandidate[]
): InvestigationCase[] {
  return candidates.map(
    createInvestigationCase
  );
}