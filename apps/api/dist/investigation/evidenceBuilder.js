export function orderEvidence(order, explanation) {
    return {
        source: "order",
        recordId: order.orderId,
        field: "status",
        value: order.status,
        explanation,
    };
}
export function orderAmountEvidence(order, explanation) {
    return {
        source: "order",
        recordId: order.orderId,
        field: "orderAmount",
        value: order.orderAmount,
        explanation,
    };
}
export function paymentEvidence(payment, field, explanation) {
    const value = payment[field];
    return {
        source: "payment",
        recordId: payment.paymentId,
        field: String(field),
        value: typeof value === "string" ||
            typeof value === "number"
            ? value
            : String(value),
        explanation,
    };
}
export function refundEvidence(refund, field, explanation) {
    const value = refund[field];
    return {
        source: "refund",
        recordId: refund.refundId,
        field: String(field),
        value: typeof value === "string" ||
            typeof value === "number"
            ? value
            : String(value),
        explanation,
    };
}
export function feeEvidence(fee, field, explanation) {
    const value = fee[field];
    return {
        source: "fee",
        recordId: fee.feeId,
        field: String(field),
        value: typeof value === "string" ||
            typeof value === "number"
            ? value
            : String(value),
        explanation,
    };
}
export function settlementEvidence(settlement, field, explanation) {
    const value = settlement[field];
    return {
        source: "settlement",
        recordId: settlement.settlementId,
        field: String(field),
        value: typeof value === "string" ||
            typeof value === "number"
            ? value
            : String(value),
        explanation,
    };
}
