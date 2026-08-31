import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FinancialDataset,
  GroundTruthCase,
  GroundTruthSeverity,
  LeakageType,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Refund,
  RefundStatus,
  Fee,
  FeeType,
  Settlement,
  SettlementStatus
} from "../../types/financial.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_VERSION = "1.0.0";

const ORDER_COUNT = 10_000;

const PAYMENT_METHODS: PaymentMethod[] = [
  "upi",
  "card",
  "netbanking",
  "wallet"
];

const LEAKAGE_DISTRIBUTION: Array<{
  type: LeakageType;
  count: number;
  severity: GroundTruthSeverity;
}> = [
  {
    type: "DUPLICATE_REFUND",
    count: 100,
    severity: "high"
  },
  {
    type: "CAPTURED_CANCELLED_NO_REFUND",
    count: 100,
    severity: "high"
  },
  {
    type: "REFUND_AMOUNT_MISMATCH",
    count: 100,
    severity: "medium"
  },
  {
    type: "SETTLEMENT_MISMATCH",
    count: 100,
    severity: "medium"
  },
  {
    type: "MISSING_SETTLEMENT",
    count: 100,
    severity: "high"
  },
  {
    type: "UNEXPLAINED_ADJUSTMENT",
    count: 100,
    severity: "medium"
  }
];

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const random = createSeededRandom(20260831);

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateAmount(): number {
  const rupees = randomInt(199, 49_999);

  const paise = randomInt(0, 99);

  return roundMoney(rupees + paise / 100);
}

function generateTimestamp(
  index: number,
  offsetMinutes: number
): string {
  const base = new Date("2026-01-01T00:00:00.000Z");

  base.setUTCMinutes(
    base.getUTCMinutes() +
      index * 37 +
      offsetMinutes
  );

  return base.toISOString();
}

function generateCustomerId(index: number): string {
  return `cus_${String(index + 1).padStart(6, "0")}`;
}

function generateOrderId(index: number): string {
  return `ord_${String(index + 1).padStart(6, "0")}`;
}

function generatePaymentId(index: number): string {
  return `pay_${String(index + 1).padStart(6, "0")}`;
}

function calculateFee(
  amount: number,
  method: PaymentMethod
): {
  processing: number;
  platform: number;
  international: number;
  tax: number;
} {
  const processingRate =
    method === "upi"
      ? 0.005
      : method === "card"
        ? 0.018
        : method === "netbanking"
          ? 0.012
          : 0.01;

  const processing = roundMoney(
    amount * processingRate
  );

  const platform = roundMoney(
    Math.min(25, amount * 0.001)
  );

  const international = 0;

  const taxableFees =
    processing +
    platform +
    international;

  const tax = roundMoney(
    taxableFees * 0.18
  );

  return {
    processing,
    platform,
    international,
    tax
  };
}

function addGroundTruth(
  groundTruth: GroundTruthCase[],
  input: GroundTruthCase
): void {
  groundTruth.push(input);
}

function createBaseDataset(): FinancialDataset {
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const refunds: Refund[] = [];
  const fees: Fee[] = [];
  const settlements: Settlement[] = [];
  const groundTruth: GroundTruthCase[] = [];

  for (let index = 0; index < ORDER_COUNT; index++) {
    const orderId = generateOrderId(index);
    const paymentId = generatePaymentId(index);
    const customerId = generateCustomerId(
      index % 3_000
    );

    const amount = generateAmount();

    const createdAt = generateTimestamp(index, 0);

    const method = randomChoice(
      PAYMENT_METHODS
    );

    const order: Order = {
      orderId,
      customerId,
      orderAmount: amount,
      currency: "INR",
      status: "fulfilled",
      createdAt,
      fulfilledAt: generateTimestamp(
        index,
        8
      )
    };

    const payment: Payment = {
      paymentId,
      orderId,
      customerId,
      amount,
      currency: "INR",
      method,
      status: "captured",
      createdAt,
      authorizedAt: generateTimestamp(
        index,
        2
      ),
      capturedAt: generateTimestamp(
        index,
        5
      )
    };

    const feeAmounts = calculateFee(
      amount,
      method
    );

    fees.push({
      feeId: `fee_${String(index + 1).padStart(
        6,
        "0"
      )}_processing`,
      paymentId,
      type: "processing",
      amount: feeAmounts.processing,
      tax: roundMoney(
        feeAmounts.processing * 0.18
      ),
      currency: "INR",
      createdAt: generateTimestamp(
        index,
        6
      )
    });

    if (feeAmounts.platform > 0) {
      fees.push({
        feeId: `fee_${String(index + 1).padStart(
          6,
          "0"
        )}_platform`,
        paymentId,
        type: "platform",
        amount: feeAmounts.platform,
        tax: roundMoney(
          feeAmounts.platform * 0.18
        ),
        currency: "INR",
        createdAt: generateTimestamp(
          index,
          6
        )
      });
    }

    const grossFees =
      feeAmounts.processing +
      feeAmounts.platform +
      feeAmounts.international;

    const totalTaxes =
      feeAmounts.tax;

    const netAmount = roundMoney(
      amount -
        grossFees -
        totalTaxes
    );

    const settlementId =
      `set_${String(index + 1).padStart(
        6,
        "0"
      )}`;

    const settlement: Settlement = {
      settlementId,
      paymentId,
      grossAmount: amount,
      fees: roundMoney(grossFees),
      taxes: roundMoney(totalTaxes),
      adjustments: 0,
      netAmount,
      currency: "INR",
      settlementDate: generateTimestamp(
        index,
        1_440
      ),
      status: "settled"
    };

    payment.settlementId =
      settlementId;

    orders.push(order);
    payments.push(payment);
    settlements.push(settlement);

    /*
     * Most transactions have no refund.
     *
     * A smaller portion receive legitimate
     * partial refunds so the detector must not
     * treat every refund as leakage.
     */
    if (
      random() < 0.10
    ) {
      const refundAmount = roundMoney(
        amount *
          (0.1 +
            random() * 0.4)
      );

      const refundId =
        `ref_${String(
          refunds.length + 1
        ).padStart(6, "0")}`;

      refunds.push({
        refundId,
        paymentId,
        orderId,
        amount: refundAmount,
        expectedAmount: refundAmount,
        currency: "INR",
        status: "processed",
        reason: "Customer requested partial refund",
        createdAt: generateTimestamp(
          index,
          120
        ),
        processedAt:
          generateTimestamp(
            index,
            130
          )
      });
    }

    addGroundTruth(
      groundTruth,
      {
        caseId: `NORMAL-${String(
          index + 1
        ).padStart(6, "0")}`,
        orderId,
        paymentId,
        expectedLeakage: 0,
        groundTruth: false
      }
    );
  }

  return {
    version: DATASET_VERSION,
    generatedAt:
      new Date().toISOString(),
    description:
      "Synthetic merchant financial dataset for Money Detective. Includes normal transactions, legitimate anomalies, and injected financial leakage cases.",
    orders,
    payments,
    refunds,
    fees,
    settlements,
    groundTruth
  };
}

function injectDuplicateRefund(
  dataset: FinancialDataset,
  index: number
): void {
  const payment =
    dataset.payments[index];

  const order =
    dataset.orders.find(
      item =>
        item.orderId ===
        payment.orderId
    );

  if (!order) {
    return;
  }

  const refundAmount =
    payment.amount;

  const firstRefund: Refund = {
    refundId: `ref_leak_dup_${String(
      index
    ).padStart(4, "0")}_1`,
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    amount: refundAmount,
    currency: "INR",
    status: "processed",
    reason: "Customer refund",
    createdAt: new Date(
      payment.capturedAt!
    ).toISOString(),
    processedAt:
      new Date(
        new Date(
          payment.capturedAt!
        ).getTime() +
          60 * 60 * 1000
      ).toISOString()
  };

  const duplicateRefund: Refund = {
    refundId: `ref_leak_dup_${String(
      index
    ).padStart(4, "0")}_2`,
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    amount: refundAmount,
    currency: "INR",
    status: "processed",
    reason: "Repeated refund processing",
    createdAt:
      new Date(
        new Date(
          payment.capturedAt!
        ).getTime() +
          90 * 60 * 1000
      ).toISOString(),
    processedAt:
      new Date(
        new Date(
          payment.capturedAt!
        ).getTime() +
          100 * 60 * 1000
      ).toISOString()
  };

  dataset.refunds.push(
    firstRefund,
    duplicateRefund
  );

  dataset.groundTruth.push({
    caseId: `LEAK-DUP-${String(
      index
    ).padStart(4, "0")}`,
    type: "DUPLICATE_REFUND",
    orderId: order.orderId,
    paymentId: payment.paymentId,
    expectedLeakage: refundAmount,
    groundTruth: true,
    severity: "high"
  });
}

function injectCancelledNoRefund(
  dataset: FinancialDataset,
  index: number
): void {
  const payment =
    dataset.payments[index];

  const order =
    dataset.orders.find(
      item =>
        item.orderId ===
        payment.orderId
    );

  if (!order) {
    return;
  }

  order.status = "cancelled";
  order.cancelledAt =
    new Date(
      new Date(
        order.createdAt
      ).getTime() +
        30 * 60 * 1000
    ).toISOString();

  dataset.groundTruth.push({
    caseId: `LEAK-CANCEL-${String(
      index
    ).padStart(4, "0")}`,
    type:
      "CAPTURED_CANCELLED_NO_REFUND",
    orderId: order.orderId,
    paymentId: payment.paymentId,
    expectedLeakage: payment.amount,
    groundTruth: true,
    severity: "high"
  });
}

function injectRefundMismatch(
  dataset: FinancialDataset,
  index: number
): void {
  const payment =
    dataset.payments[index];

  const order =
    dataset.orders.find(
      item =>
        item.orderId ===
        payment.orderId
    );

  if (!order) {
    return;
  }

  const expectedRefund =
    roundMoney(
      payment.amount * 0.25
    );

  const actualRefund =
    roundMoney(
      expectedRefund +
        Math.max(
          100,
          payment.amount * 0.05
        )
    );

  const refund: Refund = {
    refundId: `ref_leak_mismatch_${String(
      index
    ).padStart(4, "0")}`,
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    amount: actualRefund,
    expectedAmount: expectedRefund,
    currency: "INR",
    status: "processed",
    reason:
      "Refund amount mismatch test case",
    createdAt:
      new Date(
        new Date(
          payment.capturedAt!
        ).getTime() +
          60 * 60 * 1000
      ).toISOString(),
    processedAt:
      new Date(
        new Date(
          payment.capturedAt!
        ).getTime() +
          70 * 60 * 1000
      ).toISOString()
  };

  dataset.refunds.push(
    refund
  );

  dataset.groundTruth.push({
    caseId: `LEAK-REFUND-${String(
      index
    ).padStart(4, "0")}`,
    type:
      "REFUND_AMOUNT_MISMATCH",
    orderId: order.orderId,
    paymentId: payment.paymentId,
    expectedLeakage:
      roundMoney(
        actualRefund -
          expectedRefund
      ),
    groundTruth: true,
    severity: "medium"
  });
}

function injectSettlementMismatch(
  dataset: FinancialDataset,
  index: number
): void {
  const payment =
    dataset.payments[index];

  const settlement =
    dataset.settlements.find(
      item =>
        item.paymentId ===
        payment.paymentId
    );

  const order =
    dataset.orders.find(
      item =>
        item.orderId ===
        payment.orderId
    );

  if (!settlement || !order) {
    return;
  }

  const discrepancy =
    roundMoney(
      Math.max(
        100,
        payment.amount *
          0.03
      )
    );

  settlement.netAmount =
    roundMoney(
      settlement.netAmount -
        discrepancy
    );

  dataset.groundTruth.push({
    caseId: `LEAK-SETTLEMENT-${String(
      index
    ).padStart(4, "0")}`,
    type:
      "SETTLEMENT_MISMATCH",
    orderId: order.orderId,
    paymentId: payment.paymentId,
    settlementId:
      settlement.settlementId,
    expectedLeakage:
      discrepancy,
    groundTruth: true,
    severity: "medium"
  });
}

function injectMissingSettlement(
  dataset: FinancialDataset,
  index: number
): void {
  const payment =
    dataset.payments[index];

  const order =
    dataset.orders.find(
      item =>
        item.orderId ===
        payment.orderId
    );

  if (!order) {
    return;
  }

  const settlementIndex =
    dataset.settlements.findIndex(
      item =>
        item.paymentId ===
        payment.paymentId
    );

  if (settlementIndex >= 0) {
    dataset.settlements.splice(
      settlementIndex,
      1
    );
  }

  delete payment.settlementId;

  dataset.groundTruth.push({
    caseId: `LEAK-MISSING-SETTLEMENT-${String(
      index
    ).padStart(4, "0")}`,
    type:
      "MISSING_SETTLEMENT",
    orderId: order.orderId,
    paymentId: payment.paymentId,
    expectedLeakage:
      payment.amount,
    groundTruth: true,
    severity: "high"
  });
}

function injectUnexplainedAdjustment(
  dataset: FinancialDataset,
  index: number
): void {
  const payment =
    dataset.payments[index];

  const settlement =
    dataset.settlements.find(
      item =>
        item.paymentId ===
        payment.paymentId
    );

  const order =
    dataset.orders.find(
      item =>
        item.orderId ===
        payment.orderId
    );

  if (!settlement || !order) {
    return;
  }

  const adjustment =
    roundMoney(
      Math.max(
        150,
        payment.amount *
          0.04
      )
    );

  settlement.adjustments =
  -adjustment;

settlement.netAmount =
  roundMoney(
    settlement.netAmount -
      adjustment
  );

  dataset.groundTruth.push({
    caseId: `LEAK-ADJUSTMENT-${String(
      index
    ).padStart(4, "0")}`,
    type:
      "UNEXPLAINED_ADJUSTMENT",
    orderId: order.orderId,
    paymentId: payment.paymentId,
    settlementId:
      settlement.settlementId,
    expectedLeakage:
      adjustment,
    groundTruth: true,
    severity: "medium"
  });
}

function injectLeakageCases(
  dataset: FinancialDataset
): void {
  const usedIndexes = new Set<number>();

  const getUnusedIndex =
    (): number => {
      let index =
        randomInt(
          0,
          dataset.payments.length -
            1
        );

      while (
        usedIndexes.has(index)
      ) {
        index =
          randomInt(
            0,
            dataset.payments.length -
              1
          );
      }

      usedIndexes.add(index);

      return index;
    };

  for (
    const leakage of LEAKAGE_DISTRIBUTION
  ) {
    for (
      let i = 0;
      i < leakage.count;
      i++
    ) {
      const index =
        getUnusedIndex();

      switch (
        leakage.type
      ) {
        case "DUPLICATE_REFUND":
          injectDuplicateRefund(
            dataset,
            index
          );
          break;

        case "CAPTURED_CANCELLED_NO_REFUND":
          injectCancelledNoRefund(
            dataset,
            index
          );
          break;

        case "REFUND_AMOUNT_MISMATCH":
          injectRefundMismatch(
            dataset,
            index
          );
          break;

        case "SETTLEMENT_MISMATCH":
          injectSettlementMismatch(
            dataset,
            index
          );
          break;

        case "MISSING_SETTLEMENT":
          injectMissingSettlement(
            dataset,
            index
          );
          break;

        case "UNEXPLAINED_ADJUSTMENT":
          injectUnexplainedAdjustment(
            dataset,
            index
          );
          break;
      }
    }
  }
}

function writeDataset(
  dataset: FinancialDataset
): void {
  const apiRoot =
    path.resolve(
      __dirname,
      "../../../.."
    );

  const generatedDir =
    path.join(
      apiRoot,
      "data",
      "generated"
    );

  const groundTruthDir =
    path.join(
      apiRoot,
      "data",
      "ground-truth"
    );

  fs.mkdirSync(
    generatedDir,
    {
      recursive: true
    }
  );

  fs.mkdirSync(
    groundTruthDir,
    {
      recursive: true
    }
  );

  const datasetPath =
    path.join(
      generatedDir,
      "financial-dataset.json"
    );

  const groundTruthPath =
    path.join(
      groundTruthDir,
      "ground-truth.json"
    );

  fs.writeFileSync(
    datasetPath,
    JSON.stringify(
      dataset,
      null,
      2
    ),
    "utf8"
  );

  fs.writeFileSync(
    groundTruthPath,
    JSON.stringify(
      {
        version:
          dataset.version,
        generatedAt:
          dataset.generatedAt,
        cases:
          dataset.groundTruth
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `Financial dataset written to: ${datasetPath}`
  );

  console.log(
    `Ground truth written to: ${groundTruthPath}`
  );

  console.log(
    `Orders: ${dataset.orders.length}`
  );

  console.log(
    `Payments: ${dataset.payments.length}`
  );

  console.log(
    `Refunds: ${dataset.refunds.length}`
  );

  console.log(
    `Fees: ${dataset.fees.length}`
  );

  console.log(
    `Settlements: ${dataset.settlements.length}`
  );

  const leakageCases =
    dataset.groundTruth.filter(
      item =>
        item.groundTruth
    );

  console.log(
    `Injected leakage cases: ${leakageCases.length}`
  );
}

export function generateDataset(): FinancialDataset {
  const dataset =
    createBaseDataset();

  injectLeakageCases(
    dataset
  );

  return dataset;
}

const dataset =
  generateDataset();

writeDataset(
  dataset
);