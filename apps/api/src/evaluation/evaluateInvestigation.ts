import fs from "node:fs";
import path from "node:path";

import type {
  FinancialDataset,
  GroundTruthCase,
  LeakageType,
  InvestigationCandidate,
} from "../types/financial.js";

import { investigate } from "../investigation/investigationEngine.js";

interface GroundTruthFile {
  version: string;
  generatedAt: string;
  cases: GroundTruthCase[];
}

interface EvaluationMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  detectedLeakage: number;
  missedLeakage: number;
}

interface ClassEvaluation {
  type: LeakageType;
  truthCount: number;
  detectedCount: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  detectedLeakage: number;
  missedLeakage: number;
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
  return JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  ) as T;
}

function roundMoney(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

function calculatePrecision(
  truePositives: number,
  falsePositives: number
): number {
  const denominator =
    truePositives + falsePositives;

  if (denominator === 0) {
    return 0;
  }

  return truePositives / denominator;
}

function calculateRecall(
  truePositives: number,
  falseNegatives: number
): number {
  const denominator =
    truePositives + falseNegatives;

  if (denominator === 0) {
    return 0;
  }

  return truePositives / denominator;
}

function calculateF1(
  precision: number,
  recall: number
): number {
  if (precision + recall === 0) {
    return 0;
  }

  return (
    (2 * precision * recall) /
    (precision + recall)
  );
}

function evaluateClass(
  type: LeakageType,
  truthCases: GroundTruthCase[],
  candidates: InvestigationCandidate[]
): ClassEvaluation {
  const truthForClass = truthCases.filter(
    (item) => item.type === type
  );

  const detectedForClass = candidates.filter(
    (candidate) => candidate.type === type
  );

  /*
   * A candidate is considered a true positive when
   * its payment/order/settlement identity corresponds
   * to a ground-truth leakage case.
   *
   * We use the most specific available reference:
   * paymentId → orderId → settlementId.
   */

  const matchedTruth = new Set<string>();

  let truePositives = 0;
  let falsePositives = 0;
  let detectedLeakage = 0;

  for (const candidate of detectedForClass) {
    const matchingTruth = truthForClass.find(
      (truth) => {
        if (
          truth.paymentId &&
          candidate.paymentId
        ) {
          return (
            truth.paymentId ===
            candidate.paymentId
          );
        }

        if (
          truth.settlementId &&
          candidate.settlementId
        ) {
          return (
            truth.settlementId ===
            candidate.settlementId
          );
        }

        if (
          truth.orderId &&
          candidate.orderId
        ) {
          return (
            truth.orderId ===
            candidate.orderId
          );
        }

        return false;
      }
    );

    if (!matchingTruth) {
      falsePositives++;
      continue;
    }

    if (matchedTruth.has(matchingTruth.caseId)) {
      /*
       * Multiple candidates pointing to the same
       * ground-truth case are not counted as
       * additional true positives.
       */
      falsePositives++;
      continue;
    }

    matchedTruth.add(matchingTruth.caseId);
    truePositives++;

    detectedLeakage = roundMoney(
      detectedLeakage +
        candidate.potentialLeakage
    );
  }

  const falseNegatives =
    truthForClass.length -
    truePositives;

  const missedLeakage = roundMoney(
    truthForClass
      .filter(
        (truth) =>
          !matchedTruth.has(truth.caseId)
      )
      .reduce(
        (sum, truth) =>
          sum + truth.expectedLeakage,
        0
      )
  );

  const precision = calculatePrecision(
    truePositives,
    falsePositives
  );

  const recall = calculateRecall(
    truePositives,
    falseNegatives
  );

  const f1 = calculateF1(
    precision,
    recall
  );

  return {
    type,
    truthCount: truthForClass.length,
    detectedCount: detectedForClass.length,
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1,
    detectedLeakage,
    missedLeakage,
  };
}

function printPercentage(
  value: number
): string {
  return `${(value * 100).toFixed(2)}%`;
}

const dataset =
  loadJson<FinancialDataset>(
    datasetPath
  );

const groundTruthFile =
  loadJson<GroundTruthFile>(
    groundTruthPath
  );

const report = investigate(dataset);

const trueCases =
  groundTruthFile.cases.filter(
    (item) => item.groundTruth
  );

const leakageTypes: LeakageType[] = [
  "DUPLICATE_REFUND",
  "CAPTURED_CANCELLED_NO_REFUND",
  "REFUND_AMOUNT_MISMATCH",
  "SETTLEMENT_MISMATCH",
  "MISSING_SETTLEMENT",
  "UNEXPLAINED_ADJUSTMENT",
];

const classResults =
  leakageTypes.map(
    (type) =>
      evaluateClass(
        type,
        trueCases,
        report.candidates
      )
  );

const totalTruePositives =
  classResults.reduce(
    (sum, result) =>
      sum + result.truePositives,
    0
  );

const totalFalsePositives =
  classResults.reduce(
    (sum, result) =>
      sum + result.falsePositives,
    0
  );

const totalFalseNegatives =
  classResults.reduce(
    (sum, result) =>
      sum + result.falseNegatives,
    0
  );

const totalDetectedLeakage =
  classResults.reduce(
    (sum, result) =>
      sum + result.detectedLeakage,
    0
  );

const totalMissedLeakage =
  classResults.reduce(
    (sum, result) =>
      sum + result.missedLeakage,
    0
  );

const precision =
  calculatePrecision(
    totalTruePositives,
    totalFalsePositives
  );

const recall =
  calculateRecall(
    totalTruePositives,
    totalFalseNegatives
  );

const f1 =
  calculateF1(
    precision,
    recall
  );

const metrics: EvaluationMetrics = {
  truePositives: totalTruePositives,
  falsePositives: totalFalsePositives,
  falseNegatives: totalFalseNegatives,
  precision,
  recall,
  f1,
  detectedLeakage: roundMoney(
    totalDetectedLeakage
  ),
  missedLeakage: roundMoney(
    totalMissedLeakage
  ),
};

console.log("");
console.log(
  "========================================"
);
console.log(
  "       MONEY DETECTIVE EVALUATION"
);
console.log(
  "========================================"
);
console.log("");

console.log("DATASET");
console.log("----------------------------------------");
console.log(
  `Transactions:       ${dataset.orders.length}`
);
console.log(
  `Ground-truth cases: ${groundTruthFile.cases.length}`
);
console.log(
  `True leakage cases: ${trueCases.length}`
);
console.log(
  `Investigation candidates: ${report.totalCandidates}`
);

console.log("");
console.log("OVERALL METRICS");
console.log("----------------------------------------");

console.log(
  `True positives:     ${metrics.truePositives}`
);

console.log(
  `False positives:    ${metrics.falsePositives}`
);

console.log(
  `False negatives:    ${metrics.falseNegatives}`
);

console.log(
  `Precision:           ${printPercentage(
    metrics.precision
  )}`
);

console.log(
  `Recall:              ${printPercentage(
    metrics.recall
  )}`
);

console.log(
  `F1 score:            ${printPercentage(
    metrics.f1
  )}`
);

console.log(
  `Detected leakage:   ₹${metrics.detectedLeakage.toFixed(
    2
  )}`
);

console.log(
  `Missed leakage:     ₹${metrics.missedLeakage.toFixed(
    2
  )}`
);

console.log("");
console.log("PER-CLASS EVALUATION");
console.log("----------------------------------------");

for (const result of classResults) {
  console.log("");
  console.log(result.type);

  console.log(
    `  Truth:            ${result.truthCount}`
  );

  console.log(
    `  Detected:         ${result.detectedCount}`
  );

  console.log(
    `  True positives:   ${result.truePositives}`
  );

  console.log(
    `  False positives:  ${result.falsePositives}`
  );

  console.log(
    `  False negatives:  ${result.falseNegatives}`
  );

  console.log(
    `  Precision:        ${printPercentage(
      result.precision
    )}`
  );

  console.log(
    `  Recall:           ${printPercentage(
      result.recall
    )}`
  );

  console.log(
    `  F1:               ${printPercentage(
      result.f1
    )}`
  );

  console.log(
    `  Detected leakage: ₹${result.detectedLeakage.toFixed(
      2
    )}`
  );

  console.log(
    `  Missed leakage:   ₹${result.missedLeakage.toFixed(
      2
    )}`
  );
}

console.log("");
console.log(
  "========================================"
);
console.log("          EVALUATION COMPLETE");
console.log(
  "========================================"
);
console.log("");

if (
  metrics.precision === 1 &&
  metrics.recall === 1
) {
  console.log(
    "✓ Investigation engine achieved perfect detection on synthetic ground truth."
  );
} else {
  console.log(
    "⚠ Investigation engine requires further tuning."
  );
}

console.log("");