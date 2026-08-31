import type {
  InvestigationCase,
  InvestigationSeverity,
  Recoverability,
} from "../investigation/investigationCase.js";

import type {
  AIInvestigationReport,
} from "../ai/aiInvestigator.js";

export type RecoveryStatus =
  | "recommended"
  | "human_review_required"
  | "recovery_in_progress"
  | "recovered"
  | "closed";

export type RecoveryActionType =
  | "REFUND_RECONCILIATION"
  | "REFUND_RECOVERY"
  | "SETTLEMENT_RECONCILIATION"
  | "SETTLEMENT_ESCALATION"
  | "ADJUSTMENT_RECONCILIATION"
  | "FINANCIAL_REVIEW";

export interface RecoveryPlan {
  caseId: string;

  recoveryStatus: RecoveryStatus;

  recoverability: Recoverability;

  recoverabilityReason: string;

  financialImpact: {
    potentialRecovery: number;
    currency: "INR";
  };

  recoveryAction: {
    type: RecoveryActionType;
    action: string;
    owner: string;
    priority: InvestigationSeverity;
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
    confidence: "high" | "medium" | "low";
    finding: string;
    recommendedNextStep: string;
  };
}

function getActionType(
  investigationCase: InvestigationCase
): RecoveryActionType {
  switch (investigationCase.type) {
    case "DUPLICATE_REFUND":
      return "REFUND_RECOVERY";

    case "CAPTURED_CANCELLED_NO_REFUND":
      return "REFUND_RECONCILIATION";

    case "REFUND_AMOUNT_MISMATCH":
      return "REFUND_RECOVERY";

    case "SETTLEMENT_MISMATCH":
      return "SETTLEMENT_RECONCILIATION";

    case "MISSING_SETTLEMENT":
      return "SETTLEMENT_ESCALATION";

    case "UNEXPLAINED_ADJUSTMENT":
      return "ADJUSTMENT_RECONCILIATION";

    default:
      return "FINANCIAL_REVIEW";
  }
}

function getRecoverySteps(
  investigationCase: InvestigationCase
): string[] {
  switch (investigationCase.type) {
    case "DUPLICATE_REFUND":
      return [
        "Review every refund associated with the payment.",
        "Confirm the intended refund amount.",
        "Identify the duplicate or excessive refund.",
        "Verify whether the excess amount can be recovered.",
        "Record the financial reconciliation outcome.",
      ];

    case "CAPTURED_CANCELLED_NO_REFUND":
      return [
        "Verify that the order was legitimately cancelled.",
        "Confirm that the payment was successfully captured.",
        "Check whether a refund exists for the captured payment.",
        "If no valid refund exists, initiate the appropriate refund workflow.",
        "Verify that the payment and order records are reconciled.",
      ];

    case "REFUND_AMOUNT_MISMATCH":
      return [
        "Compare the expected refund amount with the processed refund.",
        "Review the reason and supporting records for the refund.",
        "Confirm whether the excess refund was intentional.",
        "Recover the discrepancy if the refund was excessive.",
        "Record the final reconciliation result.",
      ];

    case "SETTLEMENT_MISMATCH":
      return [
        "Recalculate the expected settlement amount.",
        "Compare payment, fees, taxes and adjustments.",
        "Compare the calculated amount with the settlement record.",
        "Raise a settlement discrepancy if the difference is unexplained.",
        "Verify the corrected or reconciled settlement.",
      ];

    case "MISSING_SETTLEMENT":
      return [
        "Trace the captured payment through settlement records.",
        "Check whether settlement occurred under another settlement reference.",
        "Confirm that the payment remains genuinely unsettled.",
        "Escalate the missing settlement for reconciliation.",
        "Verify that a valid settlement is eventually recorded.",
      ];

    case "UNEXPLAINED_ADJUSTMENT":
      return [
        "Identify the source of the settlement adjustment.",
        "Review supporting financial records.",
        "Determine whether the adjustment is legitimate.",
        "Recover or correct the amount if the adjustment is invalid.",
        "Verify that the settlement is financially reconciled.",
      ];

    default:
      return [
        "Review the investigation evidence.",
        "Perform financial reconciliation.",
        "Determine whether recovery is appropriate.",
        "Record the recovery outcome.",
      ];
  }
}

function getHumanReviewReason(
  investigationCase: InvestigationCase
): string {
  if (investigationCase.recoverability === "high") {
    return "Financial action should be reviewed and approved by the responsible finance or payments operations owner before execution.";
  }

  if (investigationCase.recoverability === "medium") {
    return "Additional reconciliation is required before any recovery action is executed.";
  }

  return "The case does not currently contain sufficient evidence for automatic recovery.";
}

function getRationale(
  investigationCase: InvestigationCase,
  aiReport: AIInvestigationReport
): string {
  return (
    `${investigationCase.title}. ` +
    `Potential recovery is ₹${investigationCase.financialImpact.potentialLeakage.toFixed(2)}. ` +
    `${investigationCase.recoverabilityReason} ` +
    `AI investigator confidence is ${aiReport.finding.confidence}.`
  );
}

function normalizeConfidence(
  confidence: number
): "high" | "medium" | "low" {
  if (confidence >= 0.90) {
    return "high";
  }

  if (confidence >= 0.70) {
    return "medium";
  }

  return "low";
}

export function createRecoveryPlan(
  investigationCase: InvestigationCase,
  aiReport: AIInvestigationReport
): RecoveryPlan {
  const actionType =
    getActionType(investigationCase);

  const steps =
    getRecoverySteps(investigationCase);

  const humanReviewReason =
    getHumanReviewReason(investigationCase);

  const potentialRecovery =
    investigationCase.financialImpact?.potentialLeakage;

  return {
    caseId: investigationCase.caseId,

    recoveryStatus:
      "human_review_required",

    recoverability:
      investigationCase.recoverability,

    recoverabilityReason:
      investigationCase.recoverabilityReason,

    financialImpact: {
      potentialRecovery,
      currency: "INR",
    },

    recoveryAction: {
      type: actionType,
      action:
        investigationCase.recommendedAction.action,
      owner:
        investigationCase.recommendedAction.owner,
      priority:
        investigationCase.recommendedAction.priority,
    },

    rationale:
      getRationale(
        investigationCase,
        aiReport
      ),

    steps,

    humanReview: {
      required: true,
      reason: humanReviewReason,
    },

    verification: {
      criteria:
        investigationCase.verification.criteria,
      expectedOutcome:
        investigationCase.verification.expectedOutcome,
    },

    aiContext: {
      confidence:
        normalizeConfidence(
          aiReport.finding.confidence === "high"
  ? 1
  : aiReport.finding.confidence === "medium"
    ? 0.7
    : 0.4
        ),
      finding:
        aiReport.finding.merchantExplanation,
      recommendedNextStep:
        aiReport.finding.recommendedNextStep,
    },
  };
}

export function createRecoveryPlans(
  investigationCases: InvestigationCase[],
  aiReports: AIInvestigationReport[]
): RecoveryPlan[] {
  const reportsByCaseId = new Map(
    aiReports.map(
      (report) => [
        report.caseId,
        report,
      ]
    )
  );

  return investigationCases
    .map((investigationCase) => {
      const aiReport =
        reportsByCaseId.get(
          investigationCase.caseId
        );

      if (!aiReport) {
        return null;
      }

      return createRecoveryPlan(
        investigationCase,
        aiReport
      );
    })
    .filter(
      (
        plan
      ): plan is RecoveryPlan =>
        plan !== null
    );
}