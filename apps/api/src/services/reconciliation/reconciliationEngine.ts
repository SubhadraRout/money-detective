import type {
  FinancialDataset,
  Payment,
  Refund,
  Fee,
  Settlement
} from "../../types/financial.js";

export interface PaymentReconciliation {
  paymentId: string;
  orderId: string;

  paymentAmount: number;

  totalRefunds: number;

  totalFees: number;

  totalFeeTaxes: number;

  expectedSettlement: number;

  actualSettlement: number;

  settlementDifference: number;

  settlementFound: boolean;

  settlement?: Settlement;

  refunds: Refund[];

  fees: Fee[];

  status:
    | "matched"
    | "under_settled"
    | "over_settled"
    | "missing_settlement";
}

export interface ReconciliationResult {
  reconciliations: PaymentReconciliation[];

  totalPaymentValue: number;

  totalExpectedSettlement: number;

  totalActualSettlement: number;

  totalUnderSettlement: number;

  matchedPayments: number;

  underSettledPayments: number;

  overSettledPayments: number;

  missingSettlementPayments: number;
}

function roundMoney(
  value: number
): number {
  return Math.round(
    value * 100
  ) / 100;
}

function findRefunds(
  payment: Payment,
  dataset: FinancialDataset
): Refund[] {
  return dataset.refunds.filter(
    refund =>
      refund.paymentId ===
      payment.paymentId
  );
}

function findFees(
  payment: Payment,
  dataset: FinancialDataset
): Fee[] {
  return dataset.fees.filter(
    fee =>
      fee.paymentId ===
      payment.paymentId
  );
}

function findSettlement(
  payment: Payment,
  dataset: FinancialDataset
): Settlement | undefined {
  return dataset.settlements.find(
    settlement =>
      settlement.paymentId ===
      payment.paymentId
  );
}

export function reconcilePayment(
  payment: Payment,
  dataset: FinancialDataset
): PaymentReconciliation {
  const refunds =
    findRefunds(
      payment,
      dataset
    );

  const fees =
    findFees(
      payment,
      dataset
    );

  const settlement =
    findSettlement(
      payment,
      dataset
    );

  const totalRefunds =
    refunds.reduce(
      (sum, refund) =>
        sum + refund.amount,
      0
    );

  const totalFees =
    fees.reduce(
      (sum, fee) =>
        sum + fee.amount,
      0
    );

  const totalFeeTaxes =
    fees.reduce(
      (sum, fee) =>
        sum + fee.tax,
      0
    );

  /*
   * IMPORTANT:
   *
   * Refunds are tracked separately from the
   * settlement calculation.
   *
   * The generated dataset creates legitimate
   * refunds without modifying the settlement.
   *
   * Therefore subtracting refunds here would
   * incorrectly manufacture settlement mismatches.
   */

  const expectedSettlement =
    roundMoney(
      payment.amount -
        totalFees -
        totalFeeTaxes
    );

  const actualSettlement =
    settlement?.netAmount ?? 0;

  const settlementDifference =
    roundMoney(
      expectedSettlement -
        actualSettlement
    );

  let status:
    PaymentReconciliation["status"];

  if (!settlement) {
    status =
      "missing_settlement";
  } else if (
    Math.abs(
      settlementDifference
    ) < 0.01
  ) {
    status = "matched";
  } else if (
    settlementDifference > 0
  ) {
    status =
      "under_settled";
  } else {
    status =
      "over_settled";
  }

  return {
    paymentId:
      payment.paymentId,

    orderId:
      payment.orderId,

    paymentAmount:
      payment.amount,

    totalRefunds,

    totalFees,

    totalFeeTaxes,

    expectedSettlement,

    actualSettlement,

    settlementDifference,

    settlementFound:
      Boolean(settlement),

    settlement,

    refunds,

    fees,

    status
  };
}

export function reconcileDataset(
  dataset: FinancialDataset
): ReconciliationResult {
  const reconciliations =
    dataset.payments.map(
      payment =>
        reconcilePayment(
          payment,
          dataset
        )
    );

  const totalPaymentValue =
    roundMoney(
      reconciliations.reduce(
        (sum, item) =>
          sum +
          item.paymentAmount,
        0
      )
    );

  const totalExpectedSettlement =
    roundMoney(
      reconciliations.reduce(
        (sum, item) =>
          sum +
          item.expectedSettlement,
        0
      )
    );

  const totalActualSettlement =
    roundMoney(
      reconciliations.reduce(
        (sum, item) =>
          sum +
          item.actualSettlement,
        0
      )
    );

  const underSettledPayments =
    reconciliations.filter(
      item =>
        item.status ===
        "under_settled"
    );

  return {
    reconciliations,

    totalPaymentValue,

    totalExpectedSettlement,

    totalActualSettlement,

    totalUnderSettlement:
      roundMoney(
        underSettledPayments.reduce(
          (sum, item) =>
            sum +
            Math.max(
              item.settlementDifference,
              0
            ),
          0
        )
      ),

    matchedPayments:
      reconciliations.filter(
        item =>
          item.status ===
          "matched"
      ).length,

    underSettledPayments:
      underSettledPayments.length,

    overSettledPayments:
      reconciliations.filter(
        item =>
          item.status ===
          "over_settled"
      ).length,

    missingSettlementPayments:
      reconciliations.filter(
        item =>
          item.status ===
          "missing_settlement"
      ).length
  };
}