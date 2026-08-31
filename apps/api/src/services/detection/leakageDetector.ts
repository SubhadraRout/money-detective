import type {
  FinancialDataset,
  Payment,
  Refund,
  Evidence,
  LeakageType
} from "../../types/financial.js";

import {
  reconcileDataset,
  type PaymentReconciliation
} from "../reconciliation/reconciliationEngine.js";

export type LeakageSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface LeakageCandidate {
  caseId: string;

  type: LeakageType;

  severity: LeakageSeverity;

  orderId?: string;

  paymentId?: string;

  refundIds?: string[];

  settlementId?: string;

  expectedAmount: number;

  actualAmount: number;

  potentialLeakage: number;

  evidence: Evidence[];

  deterministicReason: string;
}

function roundMoney(
  value: number
): number {
  return Math.round(
    value * 100
  ) / 100;
}

function severityForAmount(
  amount: number
): LeakageSeverity {
  const value =
    Math.abs(amount);

  if (value >= 10_000) {
    return "critical";
  }

  if (value >= 2_500) {
    return "high";
  }

  if (value >= 500) {
    return "medium";
  }

  return "low";
}

function evidence(
  source: Evidence["source"],
  recordId: string,
  field: string,
  value: string | number,
  explanation: string
): Evidence {
  return {
    source,
    recordId,
    field,
    value,
    explanation
  };
}

function detectDuplicateRefunds(
  dataset: FinancialDataset
): LeakageCandidate[] {
  const result: LeakageCandidate[] =
    [];

  const refundsByPayment =
    new Map<string, Refund[]>();

  for (const refund of dataset.refunds) {
    const existing =
      refundsByPayment.get(
        refund.paymentId
      ) ?? [];

    existing.push(refund);

    refundsByPayment.set(
      refund.paymentId,
      existing
    );
  }

  let counter = 1;

  for (
    const [
      paymentId,
      refunds
    ] of refundsByPayment
  ) {
    if (refunds.length < 2) {
      continue;
    }

    const payment =
      dataset.payments.find(
        item =>
          item.paymentId ===
          paymentId
      );

    if (!payment) {
      continue;
    }

    const totalRefunded =
      roundMoney(
        refunds.reduce(
          (sum, refund) =>
            sum +
            refund.amount,
          0
        )
      );

    /*
     * The generator intentionally creates
     * legitimate partial refunds elsewhere.
     *
     * A duplicate-refund case is therefore
     * identified when cumulative refunds
     * exceed the original payment.
     */

    if (
      totalRefunded <=
      payment.amount
    ) {
      continue;
    }

    const leakage =
      roundMoney(
        totalRefunded -
          payment.amount
      );

    result.push({
      caseId:
        `LEAK-DUP-REFUND-${String(
          counter++
        ).padStart(4, "0")}`,

      type:
        "DUPLICATE_REFUND",

      severity:
        severityForAmount(
          leakage
        ),

      orderId:
        payment.orderId,

      paymentId,

      refundIds:
        refunds.map(
          refund =>
            refund.refundId
        ),

      expectedAmount:
        payment.amount,

      actualAmount:
        totalRefunded,

      potentialLeakage:
        leakage,

      evidence: [
        evidence(
          "payment",
          payment.paymentId,
          "amount",
          payment.amount,
          "Original payment amount."
        ),

        ...refunds.map(
          refund =>
            evidence(
              "refund",
              refund.refundId,
              "amount",
              refund.amount,
              "Refund associated with the payment."
            )
        )
      ],

      deterministicReason:
        `The payment was ₹${payment.amount.toFixed(
          2
        )}, but ${refunds.length} refunds total ₹${totalRefunded.toFixed(
          2
        )}. This exceeds the original payment by ₹${leakage.toFixed(
          2
        )}.`
    });
  }

  return result;
}

function detectCapturedCancelledNoRefund(
  dataset: FinancialDataset
): LeakageCandidate[] {
  const result: LeakageCandidate[] =
    [];

  let counter = 1;

  for (const order of dataset.orders) {
    if (
      order.status !==
      "cancelled"
    ) {
      continue;
    }

    const payment =
      dataset.payments.find(
        item =>
          item.orderId ===
          order.orderId
      );

    if (!payment) {
      continue;
    }

    if (
      payment.status !==
      "captured"
    ) {
      continue;
    }

    const refunds =
      dataset.refunds.filter(
        refund =>
          refund.paymentId ===
          payment.paymentId
      );

    const processedRefunds =
      refunds.filter(
        refund =>
          refund.status ===
          "processed"
      );

    if (
      processedRefunds.length > 0
    ) {
      continue;
    }

    result.push({
      caseId:
        `LEAK-CANCELLED-${String(
          counter++
        ).padStart(4, "0")}`,

      type:
        "CAPTURED_CANCELLED_NO_REFUND",

      severity:
        severityForAmount(
          payment.amount
        ),

      orderId:
        order.orderId,

      paymentId:
        payment.paymentId,

      expectedAmount:
        payment.amount,

      actualAmount:
        0,

      potentialLeakage:
        payment.amount,

      evidence: [
        evidence(
          "order",
          order.orderId,
          "status",
          order.status,
          "Order was cancelled."
        ),

        evidence(
          "payment",
          payment.paymentId,
          "status",
          payment.status,
          "Payment was already captured."
        ),

        evidence(
          "payment",
          payment.paymentId,
          "amount",
          payment.amount,
          "Captured amount potentially exposed to the merchant."
        )
      ],

      deterministicReason:
        `Order ${order.orderId} was cancelled after payment ${payment.paymentId} was captured, but no processed refund exists.`
    });
  }

  return result;
}

function detectRefundAmountMismatch(
  dataset: FinancialDataset
): LeakageCandidate[] {
  const result: LeakageCandidate[] =
    [];

  let counter = 1;

  for (const refund of dataset.refunds) {
    const payment =
      dataset.payments.find(
        item =>
          item.paymentId ===
          refund.paymentId
      );

    if (!payment) {
      continue;
    }

    if (
      refund.amount <=
      payment.amount
    ) {
      continue;
    }

    const excess =
      roundMoney(
        refund.amount -
          payment.amount
      );

    result.push({
      caseId:
        `LEAK-REFUND-MISMATCH-${String(
          counter++
        ).padStart(4, "0")}`,

      type:
        "REFUND_AMOUNT_MISMATCH",

      severity:
        severityForAmount(
          excess
        ),

      orderId:
        payment.orderId,

      paymentId:
        payment.paymentId,

      refundIds: [
        refund.refundId
      ],

      expectedAmount:
        payment.amount,

      actualAmount:
        refund.amount,

      potentialLeakage:
        excess,

      evidence: [
        evidence(
          "payment",
          payment.paymentId,
          "amount",
          payment.amount,
          "Original payment amount."
        ),

        evidence(
          "refund",
          refund.refundId,
          "amount",
          refund.amount,
          "Recorded refund amount exceeds the original payment."
        )
      ],

      deterministicReason:
        `Refund ${refund.refundId} is ₹${refund.amount.toFixed(
          2
        )}, exceeding the original payment of ₹${payment.amount.toFixed(
          2
        )} by ₹${excess.toFixed(
          2
        )}.`
    });
  }

  return result;
}

function detectSettlementMismatches(
  reconciliations: PaymentReconciliation[]
): LeakageCandidate[] {
  const result: LeakageCandidate[] =
    [];

  let counter = 1;

  for (
    const item of reconciliations
  ) {
    if (
      item.status !==
      "under_settled"
    ) {
      continue;
    }

    if (!item.settlement) {
      continue;
    }

    /*
     * If the settlement explicitly contains
     * an adjustment, classify it separately.
     */

    if (
      Math.abs(
        item.settlement.adjustments
      ) > 0.01
    ) {
      continue;
    }

    const leakage =
      Math.max(
        item.settlementDifference,
        0
      );

    if (
      leakage <= 0.01
    ) {
      continue;
    }

    result.push({
      caseId:
        `LEAK-SETTLEMENT-${String(
          counter++
        ).padStart(4, "0")}`,

      type:
        "SETTLEMENT_MISMATCH",

      severity:
        severityForAmount(
          leakage
        ),

      orderId:
        item.orderId,

      paymentId:
        item.paymentId,

      settlementId:
        item.settlement
          .settlementId,

      expectedAmount:
        item.expectedSettlement,

      actualAmount:
        item.actualSettlement,

      potentialLeakage:
        leakage,

      evidence: [
        evidence(
          "payment",
          item.paymentId,
          "amount",
          item.paymentAmount,
          "Original captured payment."
        ),

        evidence(
          "settlement",
          item.settlement.settlementId,
          "netAmount",
          item.actualSettlement,
          "Actual amount settled."
        )
      ],

      deterministicReason:
        `Expected settlement was ₹${item.expectedSettlement.toFixed(
          2
        )}, but only ₹${item.actualSettlement.toFixed(
          2
        )} was settled. The unexplained difference is ₹${leakage.toFixed(
          2
        )}.`
    });
  }

  return result;
}

function detectMissingSettlements(
  reconciliations: PaymentReconciliation[]
): LeakageCandidate[] {
  const result: LeakageCandidate[] =
    [];

  let counter = 1;

  for (
    const item of reconciliations
  ) {
    if (
      item.status !==
      "missing_settlement"
    ) {
      continue;
    }

    const amount =
      Math.max(
        item.expectedSettlement,
        0
      );

    result.push({
      caseId:
        `LEAK-MISSING-SETTLEMENT-${String(
          counter++
        ).padStart(4, "0")}`,

      type:
        "MISSING_SETTLEMENT",

      severity:
        severityForAmount(
          amount
        ),

      orderId:
        item.orderId,

      paymentId:
        item.paymentId,

      expectedAmount:
        amount,

      actualAmount:
        0,

      potentialLeakage:
        amount,

      evidence: [
        evidence(
          "payment",
          item.paymentId,
          "amount",
          item.paymentAmount,
          "Captured payment with no corresponding settlement."
        )
      ],

      deterministicReason:
        `Payment ${item.paymentId} has an expected settlement of ₹${amount.toFixed(
          2
        )}, but no settlement record exists.`
    });
  }

  return result;
}

function detectUnexplainedAdjustments(
  reconciliations: PaymentReconciliation[]
): LeakageCandidate[] {
  const result: LeakageCandidate[] =
    [];

  let counter = 1;

  for (
    const item of reconciliations
  ) {
    if (!item.settlement) {
      continue;
    }

    const adjustment =
      item.settlement.adjustments;

    if (
      adjustment >=
      -0.01
    ) {
      continue;
    }

    const leakage =
      roundMoney(
        Math.abs(adjustment)
      );

    result.push({
      caseId:
        `LEAK-ADJUSTMENT-${String(
          counter++
        ).padStart(4, "0")}`,

      type:
        "UNEXPLAINED_ADJUSTMENT",

      severity:
        severityForAmount(
          leakage
        ),

      orderId:
        item.orderId,

      paymentId:
        item.paymentId,

      settlementId:
        item.settlement
          .settlementId,

      expectedAmount:
        item.expectedSettlement,

      actualAmount:
        item.actualSettlement,

      potentialLeakage:
        leakage,

      evidence: [
        evidence(
          "settlement",
          item.settlement.settlementId,
          "adjustments",
          adjustment,
          "Settlement contains a negative adjustment with no explanatory metadata."
        )
      ],

      deterministicReason:
        `Settlement ${item.settlement.settlementId} contains an unexplained negative adjustment of ₹${leakage.toFixed(
          2
        )}.`
    });
  }

  return result;
}

export function detectLeakage(
  dataset: FinancialDataset
): LeakageCandidate[] {
  const {
    reconciliations
  } = reconcileDataset(
    dataset
  );

  return [
    ...detectDuplicateRefunds(
      dataset
    ),

    ...detectCapturedCancelledNoRefund(
      dataset
    ),

    ...detectRefundAmountMismatch(
      dataset
    ),

    ...detectSettlementMismatches(
      reconciliations
    ),

    ...detectMissingSettlements(
      reconciliations
    ),

    ...detectUnexplainedAdjustments(
      reconciliations
    )
  ];
}

export function summarizeLeakage(
  candidates: LeakageCandidate[]
) {
  const totalPotentialLeakage =
    roundMoney(
      candidates.reduce(
        (sum, candidate) =>
          sum +
          candidate.potentialLeakage,
        0
      )
    );

  const byType =
    candidates.reduce<
      Record<string, number>
    >(
      (result, candidate) => {
        result[candidate.type] =
          (
            result[
              candidate.type
            ] ?? 0
          ) + 1;

        return result;
      },
      {}
    );

  const bySeverity =
    candidates.reduce<
      Record<string, number>
    >(
      (result, candidate) => {
        result[
          candidate.severity
        ] =
          (
            result[
              candidate.severity
            ] ?? 0
          ) + 1;

        return result;
      },
      {}
    );

  return {
    totalCases:
      candidates.length,

    totalPotentialLeakage,

    byType,

    bySeverity
  };
}