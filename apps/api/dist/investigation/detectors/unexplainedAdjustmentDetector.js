import { settlementEvidence, paymentEvidence, } from "../evidenceBuilder.js";
export function detectUnexplainedAdjustments(dataset) {
    const candidates = [];
    for (const settlement of dataset.settlements) {
        if (settlement.adjustments === 0) {
            continue;
        }
        const payment = dataset.payments.find((item) => item.paymentId === settlement.paymentId);
        if (!payment) {
            continue;
        }
        /*
         * An adjustment without a corresponding known
         * financial explanation is suspicious.
         *
         * We intentionally surface it for AI investigation
         * rather than declaring every adjustment fraudulent.
         */
        candidates.push({
            caseId: `INV-UNEXPLAINED-ADJUSTMENT-${settlement.settlementId}`,
            type: "UNEXPLAINED_ADJUSTMENT",
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            settlementId: settlement.settlementId,
            expectedAmount: settlement.grossAmount -
                settlement.fees -
                settlement.taxes,
            actualAmount: settlement.netAmount,
            potentialLeakage: Math.abs(settlement.adjustments),
            evidence: [
                paymentEvidence(payment, "amount", `Original payment amount was ${payment.amount}.`),
                settlementEvidence(settlement, "adjustments", `Settlement contains an adjustment of ${settlement.adjustments}.`),
                settlementEvidence(settlement, "netAmount", `Settlement net amount was ${settlement.netAmount}.`),
            ],
            deterministicReason: `Settlement ${settlement.settlementId} contains an unexplained adjustment of ${settlement.adjustments}.`,
        });
    }
    return candidates;
}
