import type {
  FinancialDataset,
  Payment,
  Refund,
  Settlement,
  Fee,
  Evidence
} from "../../types/financial.js";

import type {
  LeakageCandidate
} from "../detection/leakageDetector.js";

import {
  reconcilePayment
} from "../reconciliation/reconciliationEngine.js";

export interface InvestigationTimelineEvent {
  type:
    | "order"
    | "payment"
    | "refund"
    | "fee"
    | "settlement";

  timestamp?: string;

  recordId: string;

  amount?: number;

  description: string;
}

export interface InvestigationEvidence {
  caseId: string;

  leakageType:
    LeakageCandidate["type"];

  severity:
    LeakageCandidate["severity"];

  subject: {
    orderId?: string;
    paymentId?: string;
    refundIds?: string[];
    settlementId?: string;
  };

  financialSummary: {
    paymentAmount: number;
    expectedAmount: number;
    actualAmount: number;
    potentialLeakage: number;
  };

  records: {
    payment?: Payment;
    refunds: Refund[];
    settlement?: Settlement;
    fees: Fee[];
  };

  evidence: Evidence[];

  timeline:
    InvestigationTimelineEvent[];

  deterministicFinding: string;

  investigationQuestions: string[];

  aiContext: string;
}

function buildTimeline(
  dataset: FinancialDataset,
  candidate: LeakageCandidate
): InvestigationTimelineEvent[] {
  const events:
    InvestigationTimelineEvent[] =
    [];

  const order =
    candidate.orderId
      ? dataset.orders.find(
          item =>
            item.orderId ===
            candidate.orderId
        )
      : undefined;

  const payment =
    candidate.paymentId
      ? dataset.payments.find(
          item =>
            item.paymentId ===
            candidate.paymentId
        )
      : undefined;

  if (order) {
    events.push({
      type: "order",

      recordId:
        order.orderId,

      timestamp:
        order.createdAt,

      description:
        `Order ${order.orderId} was created for ₹${order.orderAmount.toFixed(
          2
        )} and currently has status "${order.status}".`
    });
  }

  if (payment) {
    events.push({
      type: "payment",

      recordId:
        payment.paymentId,

      timestamp:
        payment.capturedAt ??
        payment.createdAt,

      amount:
        payment.amount,

      description:
        `Payment ${payment.paymentId} was captured for ₹${payment.amount.toFixed(
          2
        )} using ${payment.method}.`
    });
  }

  if (candidate.paymentId) {
    const refunds =
      dataset.refunds.filter(
        refund =>
          refund.paymentId ===
          candidate.paymentId
      );

    for (
      const refund of refunds
    ) {
      events.push({
        type: "refund",

        recordId:
          refund.refundId,

        timestamp:
          refund.processedAt ??
          refund.createdAt,

        amount:
          refund.amount,

        description:
          `Refund ${refund.refundId} was recorded for ₹${refund.amount.toFixed(
            2
          )} with status "${refund.status}".`
      });
    }

    const fees =
      dataset.fees.filter(
        fee =>
          fee.paymentId ===
          candidate.paymentId
      );

    for (
      const fee of fees
    ) {
      events.push({
        type: "fee",

        recordId:
          fee.feeId,

        timestamp:
          fee.createdAt,

        amount:
          fee.amount,

        description:
          `${fee.type} fee ${fee.feeId} was recorded for ₹${fee.amount.toFixed(
            2
          )} plus ₹${fee.tax.toFixed(
            2
          )} tax.`
      });
    }

    const settlement =
      candidate.settlementId
        ? dataset.settlements.find(
            item =>
              item.settlementId ===
              candidate.settlementId
          )
        : dataset.settlements.find(
            item =>
              item.paymentId ===
              candidate.paymentId
          );

    if (settlement) {
      events.push({
        type: "settlement",

        recordId:
          settlement.settlementId,

        timestamp:
          settlement.settlementDate,

        amount:
          settlement.netAmount,

        description:
          `Settlement ${settlement.settlementId} settled ₹${settlement.netAmount.toFixed(
            2
          )}, with ₹${settlement.fees.toFixed(
            2
          )} fees, ₹${settlement.taxes.toFixed(
            2
          )} taxes and ₹${settlement.adjustments.toFixed(
            2
          )} adjustments.`
      });
    }
  }

  return events.sort(
    (a, b) => {
      if (
        !a.timestamp ||
        !b.timestamp
      ) {
        return 0;
      }

      return (
        new Date(
          a.timestamp
        ).getTime() -
        new Date(
          b.timestamp
        ).getTime()
      );
    }
  );
}

function questionsFor(
  type: LeakageCandidate["type"]
): string[] {
  switch (type) {
    case "DUPLICATE_REFUND":
      return [
        "Was the customer refunded more than once?",
        "Which refund appears to be the duplicate?",
        "Was either refund subsequently reversed?",
        "How much can potentially be recovered?"
      ];

    case "CAPTURED_CANCELLED_NO_REFUND":
      return [
        "Why was the order cancelled after payment capture?",
        "Was the customer reimbursed through another channel?",
        "Should a refund have been initiated?",
        "What action should finance take?"
      ];

    case "REFUND_AMOUNT_MISMATCH":
      return [
        "Why does the refund exceed the original payment?",
        "Was the excess amount actually transferred?",
        "Was this caused by a manual intervention?",
        "Can the excess amount be recovered?"
      ];

    case "SETTLEMENT_MISMATCH":
      return [
        "Why is the actual settlement lower than expected?",
        "Is the difference caused by an unrecorded fee?",
        "Does the discrepancy appear in another settlement?",
        "Should finance raise a reconciliation dispute?"
      ];

    case "MISSING_SETTLEMENT":
      return [
        "Why is there no settlement record?",
        "Was this payment included in another settlement batch?",
        "Is the payment still pending?",
        "Should finance escalate the missing settlement?"
      ];

    case "UNEXPLAINED_ADJUSTMENT":
      return [
        "What caused the negative adjustment?",
        "Is there supporting finance documentation?",
        "Was the adjustment authorized?",
        "Can the amount be disputed or recovered?"
      ];
  }
}

function buildAIContext(
  candidate: LeakageCandidate,
  evidence: InvestigationEvidence
): string {
  const lines = [
    "ROLE:",
    "You are Money Detective, an AI financial investigation agent for merchants.",
    "",

    "OBJECTIVE:",
    "Investigate the financial anomaly using only the supplied evidence.",
    "Do not invent transactions, amounts, causes, or recovery outcomes.",
    "Clearly distinguish confirmed facts from hypotheses.",
    "",

    `CASE ID: ${candidate.caseId}`,
    `CASE TYPE: ${candidate.type}`,
    `SEVERITY: ${candidate.severity}`,
    "",

    `ORDER ID: ${
      candidate.orderId ?? "unknown"
    }`,

    `PAYMENT ID: ${
      candidate.paymentId ?? "unknown"
    }`,

    `SETTLEMENT ID: ${
      candidate.settlementId ?? "unknown"
    }`,

    `POTENTIAL LEAKAGE: ₹${candidate.potentialLeakage.toFixed(
      2
    )}`,

    "",

    "DETERMINISTIC FINDING:",

    candidate.deterministicReason,

    "",

    "FINANCIAL SUMMARY:",

    `Payment amount: ₹${evidence.financialSummary.paymentAmount.toFixed(
      2
    )}`,

    `Expected amount: ₹${evidence.financialSummary.expectedAmount.toFixed(
      2
    )}`,

    `Actual amount: ₹${evidence.financialSummary.actualAmount.toFixed(
      2
    )}`,

    `Potential leakage: ₹${evidence.financialSummary.potentialLeakage.toFixed(
      2
    )}`,

    "",

    "TIMELINE:"
  ];

  for (
    const event of evidence.timeline
  ) {
    lines.push(
      `- ${event.description}`
    );
  }

  lines.push(
    "",
    "INVESTIGATION QUESTIONS:"
  );

  for (
    const question of
      evidence.investigationQuestions
  ) {
    lines.push(
      `- ${question}`
    );
  }

  lines.push(
    "",
    "AI OUTPUT SHOULD:",
    "1. Explain what happened.",
    "2. Identify the strongest evidence.",
    "3. Separate confirmed facts from likely causes.",
    "4. Explain the financial impact.",
    "5. Estimate recoverability only when supported by evidence.",
    "6. Recommend concrete next actions.",
    "7. State what additional information would resolve uncertainty."
  );

  return lines.join("\n");
}

export function buildInvestigationEvidence(
  candidate: LeakageCandidate,
  dataset: FinancialDataset
): InvestigationEvidence {
  const payment =
    candidate.paymentId
      ? dataset.payments.find(
          item =>
            item.paymentId ===
            candidate.paymentId
        )
      : undefined;

  const refunds =
    candidate.paymentId
      ? dataset.refunds.filter(
          item =>
            item.paymentId ===
            candidate.paymentId
        )
      : [];

  const fees =
    candidate.paymentId
      ? dataset.fees.filter(
          item =>
            item.paymentId ===
            candidate.paymentId
        )
      : [];

  const settlement =
    candidate.settlementId
      ? dataset.settlements.find(
          item =>
            item.settlementId ===
            candidate.settlementId
        )
      : candidate.paymentId
        ? dataset.settlements.find(
            item =>
              item.paymentId ===
              candidate.paymentId
          )
        : undefined;

  const reconciliation =
    payment
      ? reconcilePayment(
          payment,
          dataset
        )
      : undefined;

  const financialSummary = {
    paymentAmount:
      reconciliation
        ?.paymentAmount ??
      candidate.expectedAmount,

    expectedAmount:
      candidate.expectedAmount,

    actualAmount:
      candidate.actualAmount,

    potentialLeakage:
      candidate.potentialLeakage
  };

  const preliminaryEvidence: InvestigationEvidence =
    {
      caseId:
        candidate.caseId,

      leakageType:
        candidate.type,

      severity:
        candidate.severity,

      subject: {
        orderId:
          candidate.orderId,

        paymentId:
          candidate.paymentId,

        refundIds:
          candidate.refundIds,

        settlementId:
          candidate.settlementId
      },

      financialSummary,

      records: {
        payment,

        refunds,

        settlement,

        fees
      },

      evidence:
        candidate.evidence,

      timeline: [],

      deterministicFinding:
        candidate.deterministicReason,

      investigationQuestions:
        questionsFor(
          candidate.type
        ),

      aiContext: ""
    };

  preliminaryEvidence.timeline =
    buildTimeline(
      dataset,
      candidate
    );

  preliminaryEvidence.aiContext =
    buildAIContext(
      candidate,
      preliminaryEvidence
    );

  return preliminaryEvidence;
}

export function buildAllInvestigationEvidence(
  candidates: LeakageCandidate[],
  dataset: FinancialDataset
): InvestigationEvidence[] {
  return candidates.map(
    candidate =>
      buildInvestigationEvidence(
        candidate,
        dataset
      )
  );
}