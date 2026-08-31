import { paymentEvidence, refundEvidence, } from "../evidenceBuilder.js";
function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function detectRefundAmountMismatch(dataset) {
    const candidates = [];
    for (const refund of dataset.refunds) {
        if (refund.status !== "processed") {
            continue;
        }
        /*
         * A refund without an expected amount cannot be
         * evaluated by this deterministic detector.
         *
         * It should not be treated as leakage merely
         * because the expected value is unavailable.
         */
        if (refund.expectedAmount === undefined) {
            continue;
        }
        const difference = roundMoney(refund.amount - refund.expectedAmount);
        /*
         * Ignore normal floating-point differences.
         */
        if (Math.abs(difference) < 0.01) {
            continue;
        }
        const payment = dataset.payments.find((item) => item.paymentId === refund.paymentId);
        if (!payment) {
            continue;
        }
        candidates.push({
            caseId: `INV-REFUND-MISMATCH-${refund.refundId}`,
            type: "REFUND_AMOUNT_MISMATCH",
            orderId: refund.orderId,
            paymentId: refund.paymentId,
            refundIds: [refund.refundId],
            expectedAmount: refund.expectedAmount,
            actualAmount: refund.amount,
            potentialLeakage: Math.abs(difference),
            evidence: [
                paymentEvidence(payment, "amount", `Original payment amount was ${payment.amount}.`),
                refundEvidence(refund, "expectedAmount", `Expected refund amount was ${refund.expectedAmount}.`),
                refundEvidence(refund, "amount", `Actual processed refund amount was ${refund.amount}.`),
            ],
            deterministicReason: `Expected refund amount was ${refund.expectedAmount}, but the processed refund amount was ${refund.amount}. Difference: ${Math.abs(difference)}.`,
        });
    }
    return candidates;
}
