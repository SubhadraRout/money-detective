import type {
  Evidence,
  Order,
  Payment,
  Refund,
  Fee,
  Settlement,
} from "../types/financial.js";

export function orderEvidence(
  order: Order,
  explanation: string
): Evidence {
  return {
    source: "order",
    recordId: order.orderId,
    field: "status",
    value: order.status,
    explanation,
  };
}

export function orderAmountEvidence(
  order: Order,
  explanation: string
): Evidence {
  return {
    source: "order",
    recordId: order.orderId,
    field: "orderAmount",
    value: order.orderAmount,
    explanation,
  };
}

export function paymentEvidence(
  payment: Payment,
  field: keyof Payment,
  explanation: string
): Evidence {
  const value = payment[field];

  return {
    source: "payment",
    recordId: payment.paymentId,
    field: String(field),
    value:
      typeof value === "string" ||
      typeof value === "number"
        ? value
        : String(value),
    explanation,
  };
}

export function refundEvidence(
  refund: Refund,
  field: keyof Refund,
  explanation: string
): Evidence {
  const value = refund[field];

  return {
    source: "refund",
    recordId: refund.refundId,
    field: String(field),
    value:
      typeof value === "string" ||
      typeof value === "number"
        ? value
        : String(value),
    explanation,
  };
}

export function feeEvidence(
  fee: Fee,
  field: keyof Fee,
  explanation: string
): Evidence {
  const value = fee[field];

  return {
    source: "fee",
    recordId: fee.feeId,
    field: String(field),
    value:
      typeof value === "string" ||
      typeof value === "number"
        ? value
        : String(value),
    explanation,
  };
}

export function settlementEvidence(
  settlement: Settlement,
  field: keyof Settlement,
  explanation: string
): Evidence {
  const value = settlement[field];

  return {
    source: "settlement",
    recordId: settlement.settlementId,
    field: String(field),
    value:
      typeof value === "string" ||
      typeof value === "number"
        ? value
        : String(value),
    explanation,
  };
}