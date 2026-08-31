import { orderEvidence, paymentEvidence, refundEvidence, } from "../evidenceBuilder.js";
function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function detectCapturedCancelledNoRefund(dataset) {
    const candidates = [];
    for (const order of dataset.orders) {
        if (order.status !== "cancelled") {
            continue;
        }
        const payments = dataset.payments.filter((payment) => payment.orderId === order.orderId &&
            payment.status === "captured");
        for (const payment of payments) {
            const processedRefunds = dataset.refunds.filter((refund) => refund.paymentId === payment.paymentId &&
                refund.status === "processed");
            const totalRefunded = roundMoney(processedRefunds.reduce((sum, refund) => sum + refund.amount, 0));
            const remainingExposure = roundMoney(Math.max(0, payment.amount - totalRefunded));
            /*
             * A cancelled order with a fully refunded
             * payment is legitimate.
             *
             * A cancelled order with a partially refunded
             * or completely unrefunded captured payment
             * still has financial exposure.
             */
            if (remainingExposure <= 0.01) {
                continue;
            }
            candidates.push({
                caseId: `INV-CANCELLED-NO-REFUND-${order.orderId}`,
                type: "CAPTURED_CANCELLED_NO_REFUND",
                orderId: order.orderId,
                paymentId: payment.paymentId,
                expectedAmount: payment.amount,
                actualAmount: totalRefunded,
                potentialLeakage: remainingExposure,
                evidence: [
                    orderEvidence(order, "status"),
                    paymentEvidence(payment, "status", "Payment was captured for a cancelled order."),
                    paymentEvidence(payment, "amount", `Captured payment amount is ${payment.amount}.`),
                    ...processedRefunds.map((refund) => refundEvidence(refund, "amount", `Processed refund amount was ${refund.amount}.`)),
                ],
                deterministicReason: `Cancelled order ${order.orderId} has a captured payment of ${payment.amount}, but only ${totalRefunded} has been refunded. Remaining financial exposure is ${remainingExposure}.`,
            });
        }
    }
    return candidates;
}
