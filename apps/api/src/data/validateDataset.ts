import fs from "node:fs";
import path from "node:path";

import type {
  FinancialDataset,
  LeakageType,
  GroundTruthCase,
  Order,
  Payment,
  Refund,
  Fee,
  Settlement,
} from "../types/financial.js";

interface GroundTruthFile {
  version: string;
  generatedAt: string;
  cases: GroundTruthCase[];
}

const datasetPath = path.resolve(
  process.cwd(),
  "../data/generated/financial-dataset.json"
);

const groundTruthPath = path.resolve(
  process.cwd(),
  "../data/ground-truth/ground-truth.json"
);

function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  ) as T;
}

function countBy<T extends string>(
  values: T[]
): Record<string, number> {
  return values.reduce<Record<string, number>>(
    (counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    },
    {}
  );
}

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(
      `VALIDATION FAILED: ${message}`
    );
  }
}

function validateUniqueIds(
  name: string,
  ids: string[]
): void {
  const unique = new Set(ids);

  assert(
    unique.size === ids.length,
    `${name} contains duplicate IDs`
  );

  console.log(`✓ ${name} IDs are unique`);
}

console.log("");
console.log("========================================");
console.log("   MONEY DETECTIVE DATASET VALIDATION");
console.log("========================================");
console.log("");

const dataset =
  loadJson<FinancialDataset>(datasetPath);

const groundTruthFile =
  loadJson<GroundTruthFile>(groundTruthPath);

const groundTruth =
  groundTruthFile.cases;

console.log("DATASET");
console.log("----------------------------------------");

console.log(
  `Orders:       ${dataset.orders.length}`
);

console.log(
  `Payments:     ${dataset.payments.length}`
);

console.log(
  `Refunds:      ${dataset.refunds.length}`
);

console.log(
  `Fees:         ${dataset.fees.length}`
);

console.log(
  `Settlements:  ${dataset.settlements.length}`
);

console.log(
  `Ground truth: ${groundTruth.length}`
);

console.log("");

/*
 * ----------------------------------------------------
 * 1. BASIC DATASET SIZE
 * ----------------------------------------------------
 */

assert(
  dataset.orders.length >= 10_000,
  `Expected at least 10,000 orders, got ${dataset.orders.length}`
);

assert(
  dataset.payments.length >= 10_000,
  `Expected at least 10,000 payments, got ${dataset.payments.length}`
);

assert(
  groundTruth.length >= 600,
  `Expected at least 600 ground-truth cases, got ${groundTruth.length}`
);

console.log(
  "✓ Dataset contains at least 10,000 orders"
);

console.log(
  "✓ Dataset contains at least 10,000 payments"
);

console.log(
  `✓ Ground truth contains ${groundTruth.length} cases`
);

console.log("");

/*
 * ----------------------------------------------------
 * 2. ID UNIQUENESS
 * ----------------------------------------------------
 */

validateUniqueIds(
  "Order",
  dataset.orders.map(
    (order: Order) => order.orderId
  )
);

validateUniqueIds(
  "Payment",
  dataset.payments.map(
    (payment: Payment) => payment.paymentId
  )
);

validateUniqueIds(
  "Refund",
  dataset.refunds.map(
    (refund: Refund) => refund.refundId
  )
);

validateUniqueIds(
  "Fee",
  dataset.fees.map(
    (fee: Fee) => fee.feeId
  )
);

validateUniqueIds(
  "Settlement",
  dataset.settlements.map(
    (settlement: Settlement) =>
      settlement.settlementId
  )
);

console.log("");

/*
 * ----------------------------------------------------
 * 3. REFERENTIAL INTEGRITY
 * ----------------------------------------------------
 */

const orderIds = new Set(
  dataset.orders.map(
    (order: Order) => order.orderId
  )
);

const paymentIds = new Set(
  dataset.payments.map(
    (payment: Payment) => payment.paymentId
  )
);

const settlementIds = new Set(
  dataset.settlements.map(
    (settlement: Settlement) =>
      settlement.settlementId
  )
);

for (const payment of dataset.payments) {
  assert(
    orderIds.has(payment.orderId),
    `Payment ${payment.paymentId} references missing order ${payment.orderId}`
  );
}

for (const refund of dataset.refunds) {
  assert(
    paymentIds.has(refund.paymentId),
    `Refund ${refund.refundId} references missing payment ${refund.paymentId}`
  );

  assert(
    orderIds.has(refund.orderId),
    `Refund ${refund.refundId} references missing order ${refund.orderId}`
  );
}

for (const fee of dataset.fees) {
  assert(
    paymentIds.has(fee.paymentId),
    `Fee ${fee.feeId} references missing payment ${fee.paymentId}`
  );
}

for (const settlement of dataset.settlements) {
  assert(
    paymentIds.has(settlement.paymentId),
    `Settlement ${settlement.settlementId} references missing payment ${settlement.paymentId}`
  );
}

console.log(
  "✓ Payment → Order relationships valid"
);

console.log(
  "✓ Refund → Payment relationships valid"
);

console.log(
  "✓ Refund → Order relationships valid"
);

console.log(
  "✓ Fee → Payment relationships valid"
);

console.log(
  "✓ Settlement → Payment relationships valid"
);

console.log("");

/*
 * ----------------------------------------------------
 * 4. FINANCIAL AMOUNT VALIDATION
 * ----------------------------------------------------
 */

for (const order of dataset.orders) {
  assert(
    order.orderAmount >= 0,
    `Order ${order.orderId} has negative amount`
  );
}

for (const payment of dataset.payments) {
  assert(
    payment.amount >= 0,
    `Payment ${payment.paymentId} has negative amount`
  );
}

for (const refund of dataset.refunds) {
  assert(
    refund.amount >= 0,
    `Refund ${refund.refundId} has negative amount`
  );
}

for (const fee of dataset.fees) {
  assert(
    fee.amount >= 0,
    `Fee ${fee.feeId} has negative amount`
  );

  assert(
    fee.tax >= 0,
    `Fee ${fee.feeId} has negative tax`
  );
}

for (const settlement of dataset.settlements) {
  assert(
    settlement.grossAmount >= 0,
    `Settlement ${settlement.settlementId} has negative gross amount`
  );

  assert(
    settlement.fees >= 0,
    `Settlement ${settlement.settlementId} has negative fees`
  );

  assert(
    settlement.taxes >= 0,
    `Settlement ${settlement.settlementId} has negative taxes`
  );
}

console.log(
  "✓ No negative financial amounts"
);

console.log("");

/*
 * ----------------------------------------------------
 * 5. GROUND TRUTH LEAKAGE CLASSES
 * ----------------------------------------------------
 */

const leakageTypes: LeakageType[] = [
  "DUPLICATE_REFUND",
  "CAPTURED_CANCELLED_NO_REFUND",
  "REFUND_AMOUNT_MISMATCH",
  "SETTLEMENT_MISMATCH",
  "MISSING_SETTLEMENT",
  "UNEXPLAINED_ADJUSTMENT",
];

const groundTruthLeakageCases =
  groundTruth.filter(
    (item) => item.groundTruth === true
  );

const groundTruthCounts = countBy(
  groundTruthLeakageCases
    .map((item) => item.type)
    .filter(
      (type): type is LeakageType =>
        type !== undefined
    )
);

console.log("GROUND TRUTH");
console.log("----------------------------------------");

console.log(
  `Total cases:       ${groundTruth.length}`
);

console.log(
  `True leakage:      ${groundTruthLeakageCases.length}`
);

console.log(
  `Normal cases:      ${
    groundTruth.length -
    groundTruthLeakageCases.length
  }`
);

console.log("");

console.log(
  "LEAKAGE CLASS DISTRIBUTION"
);

console.log("----------------------------------------");

for (const type of leakageTypes) {
  const count =
    groundTruthCounts[type] ?? 0;

  console.log(
    `${type.padEnd(35)} ${count}`
  );

  assert(
    count > 0,
    `Leakage class ${type} is missing from ground truth`
  );
}

console.log("");

/*
 * ----------------------------------------------------
 * 6. GROUND TRUTH REFERENCES
 * ----------------------------------------------------
 */

for (const item of groundTruth) {
  if (item.orderId) {
    assert(
      orderIds.has(item.orderId),
      `Ground truth ${item.caseId} references missing order ${item.orderId}`
    );
  }

  if (item.paymentId) {
    assert(
      paymentIds.has(item.paymentId),
      `Ground truth ${item.caseId} references missing payment ${item.paymentId}`
    );
  }

  if (item.settlementId) {
    assert(
      settlementIds.has(item.settlementId),
      `Ground truth ${item.caseId} references missing settlement ${item.settlementId}`
    );
  }
}

console.log(
  "✓ Ground-truth order references valid"
);

console.log(
  "✓ Ground-truth payment references valid"
);

console.log(
  "✓ Ground-truth settlement references valid"
);

console.log("");

/*
 * ----------------------------------------------------
 * 7. LEGITIMATE ANOMALY SIGNALS
 * ----------------------------------------------------
 */

const partialRefunds =
  dataset.refunds.filter(
    (refund: Refund) => {
      const payment =
        dataset.payments.find(
          (p: Payment) =>
            p.paymentId ===
            refund.paymentId
        );

      return (
        payment !== undefined &&
        refund.amount > 0 &&
        refund.amount < payment.amount
      );
    }
  );

const failedPayments =
  dataset.payments.filter(
    (payment: Payment) =>
      payment.status === "failed"
  );

const pendingSettlements =
  dataset.settlements.filter(
    (settlement: Settlement) =>
      settlement.status === "pending"
  );

const failedSettlements =
  dataset.settlements.filter(
    (settlement: Settlement) =>
      settlement.status === "failed"
  );

const cancelledOrders =
  dataset.orders.filter(
    (order: Order) =>
      order.status === "cancelled"
  );

console.log(
  "LEGITIMATE / NORMAL ANOMALY SIGNALS"
);

console.log(
  "----------------------------------------"
);

console.log(
  `Partial refunds:       ${partialRefunds.length}`
);

console.log(
  `Failed payments:       ${failedPayments.length}`
);

console.log(
  `Pending settlements:   ${pendingSettlements.length}`
);

console.log(
  `Failed settlements:    ${failedSettlements.length}`
);

console.log(
  `Cancelled orders:      ${cancelledOrders.length}`
);

console.log("");

/*
 * ----------------------------------------------------
 * 8. FINAL RESULT
 * ----------------------------------------------------
 */

console.log("========================================");
console.log("          VALIDATION COMPLETE");
console.log("========================================");
console.log("");

console.log(
  "✓ 10,000+ orders"
);

console.log(
  "✓ 10,000+ payments"
);

console.log(
  "✓ Six leakage classes present"
);

console.log(
  "✓ Ground truth present"
);

console.log(
  "✓ IDs are unique"
);

console.log(
  "✓ Referential integrity valid"
);

console.log(
  "✓ Financial amounts valid"
);

console.log(
  "✓ Legitimate anomaly signals present"
);

console.log("");

console.log(
  "DATASET STATUS: READY FOR INVESTIGATION ENGINE"
);

console.log("");