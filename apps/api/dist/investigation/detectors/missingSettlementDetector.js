import { paymentEvidence, } from "../evidenceBuilder.js";
export function detectMissingSettlements(dataset) {
    const candidates = [];
    const settledPaymentIds = new Set(dataset.settlements.map((settlement) => settlement.paymentId));
    for (const payment of dataset.payments) {
        if (payment.status !== "captured") {
            continue;
        }
        if (settledPaymentIds.has(payment.paymentId)) {
            continue;
        }
        candidates.push({
            caseId: `INV-MISSING-SETTLEMENT-${payment.paymentId}`,
            type: "MISSING_SETTLEMENT",
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            expectedAmount: payment.amount,
            actualAmount: 0,
            potentialLeakage: payment.amount,
            evidence: [
                paymentEvidence(payment, "status", "Payment is captured but no settlement record exists."),
                paymentEvidence(payment, "amount", `Captured payment amount is ${payment.amount}.`),
            ],
            deterministicReason: `Captured payment ${payment.paymentId} has no corresponding settlement.`,
        });
    }
    return candidates;
}
