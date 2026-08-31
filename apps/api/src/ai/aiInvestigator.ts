import type {
  LeakageType,
} from "../types/financial.js";

import type {
  InvestigationCase,
} from "../investigation/investigationCase.js";

import type {
  EvidenceGraph,
} from "../investigation/evidenceGraph.js";

export type InvestigatorConfidence =
  | "low"
  | "medium"
  | "high";

export interface InvestigationFinding {
  type: LeakageType;

  title: string;

  whatHappened: string;

  whyItMatters: string;

  financialImpact: number;

  confidence: InvestigatorConfidence;

  evidence: string[];

  merchantExplanation: string;

  recommendedNextStep: string;
}

export interface AIInvestigationReport {
  caseId: string;

  investigationType: LeakageType;

  finding: InvestigationFinding;

  evidenceSummary: {
    nodesUsed: number;

    edgesUsed: number;

    paymentAmount?: number;

    refundAmount: number;

    fees: number;

    taxes: number;

    settlementAmount?: number;

    settlementDifference?: number;
  };

  generatedAt: string;

  investigatorVersion: string;
}

function money(
  value: number
): string {
  return `₹${value.toFixed(2)}`;
}

function determineConfidence(
  graph: EvidenceGraph
): InvestigatorConfidence {
  const hasPayment =
    graph.nodes.some(
      (node) =>
        node.type === "payment"
    );

  const hasEvidence =
    graph.edges.length >= 2;

  if (
    hasPayment &&
    hasEvidence &&
    graph.nodes.length >= 4
  ) {
    return "high";
  }

  if (
    hasPayment ||
    hasEvidence
  ) {
    return "medium";
  }

  return "low";
}

function investigateDuplicateRefund(
  graph: EvidenceGraph
): InvestigationFinding {
  const payment =
    graph.financialFlow.paymentAmount ?? 0;

  const refunds =
    graph.financialFlow.totalRefundAmount;

  const excessRefund =
    Math.max(
      0,
      refunds - payment
    );

  return {
    type: "DUPLICATE_REFUND",

    title:
      "Duplicate or excessive refund detected",

    whatHappened:
      `The payment was ${money(
        payment
      )}, but the linked refund records total ${money(
        refunds
      )}. The refund value therefore exceeds the original payment by ${money(
        excessRefund
      )}.`,

    whyItMatters:
      excessRefund > 0
        ? `The merchant may have returned ${money(
            excessRefund
          )} more than the customer originally paid.`
        : "Multiple refund records are associated with the same payment and require review.",

    financialImpact:
      graph.financialFlow.totalRefundAmount,

    confidence:
      determineConfidence(graph),

    evidence: [
      `Payment amount: ${money(
        payment
      )}.`,
      `Total linked refunds: ${money(
        refunds
      )}.`,
      `Refund records found in the evidence graph: ${
        graph.nodes.filter(
          (node) =>
            node.type === "refund"
        ).length
      }.`,
    ],

    merchantExplanation:
      `Money Detective found multiple refund events connected to the same payment. ` +
      `Together they represent ${money(
        refunds
      )} against a payment of ${money(
        payment
      )}.`,

    recommendedNextStep:
      "Review the linked refund records and confirm whether each refund was intentionally issued.",
  };
}

function investigateCancelledNoRefund(
  graph: EvidenceGraph
): InvestigationFinding {
  const payment =
    graph.financialFlow.paymentAmount ?? 0;

  return {
    type:
      "CAPTURED_CANCELLED_NO_REFUND",

    title:
      "Captured payment on cancelled order without refund",

    whatHappened:
      `A payment of ${money(
        payment
      )} was captured, while the associated order was cancelled and no corresponding refund was found.`,

    whyItMatters:
      `The merchant may owe the customer ${money(
        payment
      )} while the payment remains captured.`,

    financialImpact:
      payment,

    confidence:
      determineConfidence(graph),

    evidence: [
      `Captured payment amount: ${money(
        payment
      )}.`,
      "Associated order is marked cancelled.",
      `Linked refund amount: ${money(
        graph.financialFlow
          .totalRefundAmount
      )}.`,
    ],

    merchantExplanation:
      `The order was cancelled after a payment of ${money(
        payment
      )} was captured, but Money Detective could not find a refund covering that payment.`,

    recommendedNextStep:
      "Verify the cancellation and refund policy, then issue or reconcile the missing refund if appropriate.",
  };
}

function investigateRefundMismatch(
  graph: EvidenceGraph
): InvestigationFinding {
  const payment =
    graph.financialFlow.paymentAmount ?? 0;

  const refunds =
    graph.financialFlow.totalRefundAmount;

  return {
    type:
      "REFUND_AMOUNT_MISMATCH",

    title:
      "Refund amount does not match expected amount",

    whatHappened:
      `The payment was ${money(
        payment
      )}, while the refund records total ${money(
        refunds
      )}. The refund amount differs from the expected refund amount recorded by the investigation.`,

    whyItMatters:
      `The refund discrepancy represents money that may have been incorrectly returned or withheld.`,

    financialImpact:
      graph.financialFlow.totalRefundAmount,

    confidence:
      determineConfidence(graph),

    evidence: [
      `Payment amount: ${money(
        payment
      )}.`,
      `Linked refund amount: ${money(
        refunds
      )}.`,
      `Refund records: ${
        graph.nodes.filter(
          (node) =>
            node.type === "refund"
        ).length
      }.`,
    ],

    merchantExplanation:
      "The refund transaction does not align with the expected refund amount for the payment.",

    recommendedNextStep:
      "Compare the refund against the original order policy and customer entitlement before making an adjustment.",
  };
}

function investigateSettlementMismatch(
  graph: EvidenceGraph
): InvestigationFinding {
  const expected =
    graph.financialFlow
      .expectedSettlementAmount ?? 0;

  const actual =
    graph.financialFlow
      .settlementNetAmount ?? 0;

  const difference =
    Math.abs(
      graph.financialFlow
        .settlementDifference ?? 0
    );

  return {
    type:
      "SETTLEMENT_MISMATCH",

    title:
      "Settlement amount does not reconcile",

    whatHappened:
      `Based on the payment's settlement inputs, Money Detective expected a net settlement of ${money(
        expected
      )}, but the settlement record contains ${money(
        actual
      )}.`,

    whyItMatters:
      `The settlement is short or overstated by ${money(
        difference
      )}, which can represent recoverable merchant leakage.`,

    financialImpact:
      difference,

    confidence:
      determineConfidence(graph),

    evidence: [
      `Expected settlement: ${money(
        expected
      )}.`,
      `Actual settlement: ${money(
        actual
      )}.`,
      `Settlement difference: ${money(
        difference
      )}.`,
      `Fees: ${money(
        graph.financialFlow.totalFees
      )}.`,
      `Taxes: ${money(
        graph.financialFlow.totalTaxes
      )}.`,
    ],

    merchantExplanation:
      `The settlement does not reconcile with the underlying payment, fees, taxes and adjustments. ` +
      `The unexplained difference is ${money(
        difference
      )}.`,

    recommendedNextStep:
      "Compare the settlement statement with the payment ledger and raise a reconciliation issue for the unexplained difference.",
  };
}

function investigateMissingSettlement(
  graph: EvidenceGraph
): InvestigationFinding {
  const payment =
    graph.financialFlow.paymentAmount ?? 0;

  return {
    type:
      "MISSING_SETTLEMENT",

    title:
      "Captured payment has no settlement",

    whatHappened:
      `A captured payment of ${money(
        payment
      )} has no corresponding settlement record.`,

    whyItMatters:
      `The merchant may have processed the customer's payment without receiving the expected settlement.`,

    financialImpact:
      payment,

    confidence:
      determineConfidence(graph),

    evidence: [
      `Captured payment: ${money(
        payment
      )}.`,
      "No corresponding settlement node exists in the evidence graph.",
    ],

    merchantExplanation:
      `Money Detective found a captured payment of ${money(
        payment
      )} that does not appear in the settlement records.`,

    recommendedNextStep:
      "Search the settlement ledger and bank reconciliation records for the payment, then raise a missing-settlement investigation if it cannot be located.",
  };
}

function investigateUnexplainedAdjustment(
  graph: EvidenceGraph
): InvestigationFinding {
  const adjustment =
    Math.abs(
      graph.financialFlow
        .settlementAdjustments
    );

  return {
    type:
      "UNEXPLAINED_ADJUSTMENT",

    title:
      "Unexplained settlement adjustment",

    whatHappened:
      `The settlement contains an adjustment of ${money(
        adjustment
      )} that requires explanation.`,

    whyItMatters:
      `An unexplained adjustment can reduce the merchant's settlement and may represent recoverable leakage.`,

    financialImpact:
      adjustment,

    confidence:
      determineConfidence(graph),

    evidence: [
      `Settlement adjustment: ${money(
        graph.financialFlow
          .settlementAdjustments
      )}.`,
      `Settlement net amount: ${money(
        graph.financialFlow
          .settlementNetAmount ?? 0
      )}.`,
    ],

    merchantExplanation:
      `Money Detective identified a settlement adjustment of ${money(
        adjustment
      )} without sufficient supporting context in the financial records.`,

    recommendedNextStep:
      "Retrieve the settlement adjustment reference and reconcile it against known charges, disputes, or operational adjustments.",
  };
}

function createFinding(
  investigationCase: InvestigationCase,
  graph: EvidenceGraph
): InvestigationFinding {
  switch (
    investigationCase.type
  ) {
    case "DUPLICATE_REFUND":
      return investigateDuplicateRefund(
        graph
      );

    case "CAPTURED_CANCELLED_NO_REFUND":
      return investigateCancelledNoRefund(
        graph
      );

    case "REFUND_AMOUNT_MISMATCH":
      return investigateRefundMismatch(
        graph
      );

    case "SETTLEMENT_MISMATCH":
      return investigateSettlementMismatch(
        graph
      );

    case "MISSING_SETTLEMENT":
      return investigateMissingSettlement(
        graph
      );

    case "UNEXPLAINED_ADJUSTMENT":
      return investigateUnexplainedAdjustment(
        graph
      );
  }
}

export function investigateCase(
  investigationCase: InvestigationCase,
  graph: EvidenceGraph
): AIInvestigationReport {
  const finding =
    createFinding(
      investigationCase,
      graph
    );

  return {
    caseId:
      investigationCase.caseId,

    investigationType:
      investigationCase.type,

    finding,

    evidenceSummary: {
      nodesUsed:
        graph.nodes.length,

      edgesUsed:
        graph.edges.length,

      paymentAmount:
        graph.financialFlow
          .paymentAmount,

      refundAmount:
        graph.financialFlow
          .totalRefundAmount,

      fees:
        graph.financialFlow
          .totalFees,

      taxes:
        graph.financialFlow
          .totalTaxes,

      settlementAmount:
        graph.financialFlow
          .settlementNetAmount,

      settlementDifference:
        graph.financialFlow
          .settlementDifference,
    },

    generatedAt:
      new Date().toISOString(),

    investigatorVersion:
      "1.0.0",
  };
}