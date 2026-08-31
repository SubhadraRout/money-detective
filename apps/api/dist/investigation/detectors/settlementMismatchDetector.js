import { paymentEvidence, settlementEvidence, } from "../evidenceBuilder.js";
function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function detectSettlementMismatch(dataset) {
    const candidates = [];
    for (const settlement of dataset.settlements) {
        const payment = dataset.payments.find((item) => item.paymentId === settlement.paymentId);
        if (!payment) {
            continue;
        }
        /*
         * Settlement reconciliation invariant:
         *
         * Expected net
         * = gross
         * - fees
         * - taxes
         * + adjustments
         *
         * We intentionally use the financial components
         * recorded on the settlement itself.
         *
         * The fee table is supporting evidence, not the
         * settlement's authoritative calculation.
         */
        const expectedNet = roundMoney(settlement.grossAmount -
            settlement.fees -
            settlement.taxes +
            settlement.adjustments);
        const actualNet = roundMoney(settlement.netAmount);
        const difference = roundMoney(expectedNet - actualNet);
        /*
         * If the adjustment explains the difference,
         * this is not a settlement mismatch.
         *
         * It belongs to the UNEXPLAINED_ADJUSTMENT
         * investigation instead.
         */
        if (settlement.adjustments !== 0) {
            continue;
        }
        /*
         * Ignore rounding noise.
         */
        if (Math.abs(difference) < 0.01) {
            continue;
        }
        /*
         * A positive difference means the merchant received
         * less than the reconciled settlement amount.
         *
         * A negative difference means the settlement contains
         * more than expected. Both are worth investigating.
         */
        candidates.push({
            caseId: `INV-SETTLEMENT-MISMATCH-${settlement.settlementId}`,
            type: "SETTLEMENT_MISMATCH",
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            settlementId: settlement.settlementId,
            expectedAmount: expectedNet,
            actualAmount: actualNet,
            potentialLeakage: Math.abs(difference),
            evidence: [
                paymentEvidence(payment, "amount", `Payment amount was ${payment.amount}.`),
                settlementEvidence(settlement, "grossAmount", `Settlement gross amount was ${settlement.grossAmount}.`),
                settlementEvidence(settlement, "fees", `Settlement recorded fees of ${settlement.fees}.`),
                settlementEvidence(settlement, "taxes", `Settlement recorded taxes of ${settlement.taxes}.`),
                settlementEvidence(settlement, "adjustments", `Settlement recorded adjustments of ${settlement.adjustments}.`),
                settlementEvidence(settlement, "netAmount", `Settlement net amount was ${settlement.netAmount}.`),
            ],
            deterministicReason: `Expected settlement net amount was ${expectedNet}, but actual settlement net amount was ${actualNet}. Difference: ${Math.abs(difference)}.`,
        });
    }
    return candidates;
}
