import type {
  Fee,
  Order,
  Payment,
  Refund,
  Settlement,
} from "../types/financial.js";

import type {
  InvestigationCase,
} from "./investigationCase.js";

export type EvidenceNodeType =
  | "order"
  | "payment"
  | "refund"
  | "fee"
  | "settlement"
  | "investigation";

export type EvidenceEdgeType =
  | "ORDER_HAS_PAYMENT"
  | "PAYMENT_HAS_REFUND"
  | "PAYMENT_HAS_FEE"
  | "PAYMENT_HAS_SETTLEMENT"
  | "INVESTIGATION_REFERENCES"
  | "INVESTIGATION_INVOLVES";

export interface EvidenceGraphNode {
  id: string;

  type: EvidenceNodeType;

  label: string;

  data:
    | Order
    | Payment
    | Refund
    | Fee
    | Settlement
    | InvestigationCase;
}

export interface EvidenceGraphEdge {
  id: string;

  from: string;

  to: string;

  type: EvidenceEdgeType;

  explanation: string;
}

export interface EvidenceGraph {
  caseId: string;

  nodes: EvidenceGraphNode[];

  edges: EvidenceGraphEdge[];

  financialFlow: {
    orderAmount?: number;

    paymentAmount?: number;

    totalRefundAmount: number;

    totalFees: number;

    totalTaxes: number;

    settlementGrossAmount?: number;

    settlementNetAmount?: number;

    settlementAdjustments: number;

    expectedSettlementAmount?: number;

    settlementDifference?: number;
  };

  summary: string;
}

interface GraphRecords {
  order?: Order;

  payment?: Payment;

  refunds: Refund[];

  fees: Fee[];

  settlement?: Settlement;
}

function addNode(
  nodes: EvidenceGraphNode[],
  node: EvidenceGraphNode
): void {
  if (
    nodes.some(
      (existing) =>
        existing.id === node.id
    )
  ) {
    return;
  }

  nodes.push(node);
}

function addEdge(
  edges: EvidenceGraphEdge[],
  edge: EvidenceGraphEdge
): void {
  if (
    edges.some(
      (existing) =>
        existing.id === edge.id
    )
  ) {
    return;
  }

  edges.push(edge);
}

function calculateFinancialFlow(
  records: GraphRecords
): EvidenceGraph["financialFlow"] {
  const totalRefundAmount =
    records.refunds.reduce(
      (sum, refund) =>
        sum + refund.amount,
      0
    );

  const totalFees =
    records.fees.reduce(
      (sum, fee) =>
        sum + fee.amount,
      0
    );

  const totalTaxes =
    records.fees.reduce(
      (sum, fee) =>
        sum + fee.tax,
      0
    );

  const settlementAdjustments =
    records.settlement?.adjustments ?? 0;

  let expectedSettlementAmount:
    | number
    | undefined;

  let settlementDifference:
    | number
    | undefined;

  if (records.settlement) {
    expectedSettlementAmount =
      records.settlement.grossAmount -
      totalFees -
      totalTaxes +
      settlementAdjustments;

    settlementDifference =
      expectedSettlementAmount -
      records.settlement.netAmount;
  }

  return {
    orderAmount:
      records.order?.orderAmount,

    paymentAmount:
      records.payment?.amount,

    totalRefundAmount,

    totalFees,

    totalTaxes,

    settlementGrossAmount:
      records.settlement?.grossAmount,

    settlementNetAmount:
      records.settlement?.netAmount,

    settlementAdjustments,

    expectedSettlementAmount,

    settlementDifference,
  };
}

function createSummary(
  records: GraphRecords,
  financialFlow: EvidenceGraph["financialFlow"]
): string {
  const paymentId =
    records.payment?.paymentId ??
    "unknown payment";

  const paymentAmount =
    records.payment?.amount;

  const settlementText =
    records.settlement
      ? `Settlement net ₹${records.settlement.netAmount.toFixed(
          2
        )}`
      : "No settlement record";

  const refundText =
    `Refunds ₹${financialFlow.totalRefundAmount.toFixed(
      2
    )}`;

  const feeText =
    `Fees/taxes ₹${(
      financialFlow.totalFees +
      financialFlow.totalTaxes
    ).toFixed(2)}`;

  return (
    `Financial evidence graph for ${paymentId}. ` +
    `Payment ₹${paymentAmount?.toFixed(2) ?? "unknown"}, ` +
    `${refundText}, ${feeText}, ${settlementText}.`
  );
}

export function buildEvidenceGraph(
  investigationCase: InvestigationCase,
  dataset: {
    orders: Order[];
    payments: Payment[];
    refunds: Refund[];
    fees: Fee[];
    settlements: Settlement[];
  }
): EvidenceGraph {
  const payment =
    investigationCase.entities.paymentId
      ? dataset.payments.find(
          (item) =>
            item.paymentId ===
            investigationCase.entities.paymentId
        )
      : undefined;

  const order =
    investigationCase.entities.orderId
      ? dataset.orders.find(
          (item) =>
            item.orderId ===
            investigationCase.entities.orderId
        )
      : payment
        ? dataset.orders.find(
            (item) =>
              item.orderId ===
              payment.orderId
          )
        : undefined;

  const refunds = dataset.refunds.filter(
    (refund) =>
      payment
        ? refund.paymentId ===
          payment.paymentId
        : investigationCase.entities.refundIds?.includes(
            refund.refundId
          ) ?? false
  );

  const fees = dataset.fees.filter(
    (fee) =>
      payment
        ? fee.paymentId ===
          payment.paymentId
        : false
  );

  const settlement =
    investigationCase.entities.settlementId
      ? dataset.settlements.find(
          (item) =>
            item.settlementId ===
            investigationCase.entities
              .settlementId
        )
      : payment
        ? dataset.settlements.find(
            (item) =>
              item.paymentId ===
              payment.paymentId
          )
        : undefined;

  const records: GraphRecords = {
    order,
    payment,
    refunds,
    fees,
    settlement,
  };

  const nodes: EvidenceGraphNode[] = [];

  const edges: EvidenceGraphEdge[] = [];

  /*
   * Investigation root node.
   */

  addNode(nodes, {
    id: investigationCase.caseId,
    type: "investigation",
    label: investigationCase.title,
    data: investigationCase,
  });

  /*
   * Order.
   */

  if (order) {
    addNode(nodes, {
      id: order.orderId,
      type: "order",
      label: `Order ${order.orderId}`,
      data: order,
    });

    addEdge(edges, {
      id: `${investigationCase.caseId}->${order.orderId}`,
      from: investigationCase.caseId,
      to: order.orderId,
      type: "INVESTIGATION_INVOLVES",
      explanation:
        "The investigation is associated with this order.",
    });
  }

  /*
   * Payment.
   */

  if (payment) {
    addNode(nodes, {
      id: payment.paymentId,
      type: "payment",
      label: `Payment ${payment.paymentId}`,
      data: payment,
    });

    addEdge(edges, {
      id: `${investigationCase.caseId}->${payment.paymentId}`,
      from: investigationCase.caseId,
      to: payment.paymentId,
      type: "INVESTIGATION_REFERENCES",
      explanation:
        "The investigation directly references this payment.",
    });

    if (order) {
      addEdge(edges, {
        id: `${order.orderId}->${payment.paymentId}`,
        from: order.orderId,
        to: payment.paymentId,
        type: "ORDER_HAS_PAYMENT",
        explanation:
          "The payment belongs to the order.",
      });
    }
  }

  /*
   * Refunds.
   */

  for (const refund of refunds) {
    addNode(nodes, {
      id: refund.refundId,
      type: "refund",
      label: `Refund ${refund.refundId}`,
      data: refund,
    });

    if (payment) {
      addEdge(edges, {
        id: `${payment.paymentId}->${refund.refundId}`,
        from: payment.paymentId,
        to: refund.refundId,
        type: "PAYMENT_HAS_REFUND",
        explanation:
          "The refund was created against this payment.",
      });
    }
  }

  /*
   * Fees.
   */

  for (const fee of fees) {
    addNode(nodes, {
      id: fee.feeId,
      type: "fee",
      label: `Fee ${fee.feeId}`,
      data: fee,
    });

    if (payment) {
      addEdge(edges, {
        id: `${payment.paymentId}->${fee.feeId}`,
        from: payment.paymentId,
        to: fee.feeId,
        type: "PAYMENT_HAS_FEE",
        explanation:
          "The fee was charged against this payment.",
      });
    }
  }

  /*
   * Settlement.
   */

  if (settlement) {
    addNode(nodes, {
      id: settlement.settlementId,
      type: "settlement",
      label: `Settlement ${settlement.settlementId}`,
      data: settlement,
    });

    if (payment) {
      addEdge(edges, {
        id: `${payment.paymentId}->${settlement.settlementId}`,
        from: payment.paymentId,
        to: settlement.settlementId,
        type: "PAYMENT_HAS_SETTLEMENT",
        explanation:
          "The settlement corresponds to this payment.",
      });
    }
  }

  const financialFlow =
    calculateFinancialFlow(records);

  const summary =
    createSummary(
      records,
      financialFlow
    );

  return {
    caseId:
      investigationCase.caseId,

    nodes,

    edges,

    financialFlow,

    summary,
  };
}

export function buildEvidenceGraphs(
  cases: InvestigationCase[],
  dataset: {
    orders: Order[];
    payments: Payment[];
    refunds: Refund[];
    fees: Fee[];
    settlements: Settlement[];
  }
): EvidenceGraph[] {
  return cases.map(
    (investigationCase) =>
      buildEvidenceGraph(
        investigationCase,
        dataset
      )
  );
}