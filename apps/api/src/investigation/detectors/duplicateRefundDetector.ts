import type {
  FinancialDataset,
  InvestigationCandidate,
  Refund,
} from "../../types/financial.js";

import {
  refundEvidence,
  paymentEvidence,
} from "../evidenceBuilder.js";

export function detectDuplicateRefunds(
  dataset: FinancialDataset
): InvestigationCandidate[] {
  const candidates: InvestigationCandidate[] = [];

  const refundsByPayment =
    new Map<string, Refund[]>();

  for (const refund of dataset.refunds) {
    const refunds =
      refundsByPayment.get(refund.paymentId) ?? [];

    refunds.push(refund);
    refundsByPayment.set(refund.paymentId, refunds);
  }

  for (const [paymentId, refunds] of refundsByPayment) {
    if (refunds.length < 2) {
      continue;
    }

    const payment = dataset.payments.find(
      (item) => item.paymentId === paymentId
    );

    if (!payment) {
      continue;
    }

    const totalRefunded = refunds.reduce(
      (sum, refund) => sum + refund.amount,
      0
    );

    if (totalRefunded <= payment.amount) {
      continue;
    }

    const duplicateAmount =
      totalRefunded - payment.amount;

    candidates.push({
      caseId: `INV-DUPLICATE-REFUND-${paymentId}`,
      type: "DUPLICATE_REFUND",
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      refundIds: refunds.map(
        (refund) => refund.refundId
      ),
      expectedAmount: payment.amount,
      actualAmount: totalRefunded,
      potentialLeakage: duplicateAmount,
      evidence: [
        paymentEvidence(
          payment,
          "amount",
          `Original payment amount was ${payment.amount}.`
        ),
        ...refunds.map((refund) =>
          refundEvidence(
            refund,
            "amount",
            `Refund of ${refund.amount} was issued against the payment.`
          )
        ),
      ],
      deterministicReason:
        `Total refunds of ${totalRefunded} exceed the original payment amount of ${payment.amount} by ${duplicateAmount}.`,
    });
  }

  return candidates;
}