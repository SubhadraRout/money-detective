import fs from "node:fs";
import path from "node:path";

interface GroundTruthCase {
  caseId: string;
  type: string;
  orderId: string;
  paymentId: string;
  expectedLeakage: number;
  groundTruth: boolean;
  severity: string;
}

interface GroundTruthFile {
  version: string;
  generatedAt: string;
  cases: GroundTruthCase[];
}

interface InvestigationCase {
  caseId: string;
  type: string;
  entities: {
    orderId?: string;
    paymentId?: string;
  };
  financialImpact: {
    potentialLeakage: number;
  };
}

interface InvestigationCasesFile {
  version: string;
  generatedAt: string;
  cases: InvestigationCase[];
}

const dataRoot = path.resolve(
  process.cwd(),
  "../data"
);

const groundTruthPath = path.join(
  dataRoot,
  "ground-truth",
  "ground-truth.json"
);

const investigationCasesPath = path.join(
  dataRoot,
  "investigations",
  "investigation-cases.json"
);

function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing required artifact: ${filePath}`
    );
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  ) as T;
}

function round(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100
  ) / 100;
}

function money(value: number): string {
  return `₹${value.toFixed(2)}`;
}

const groundTruth =
  loadJson<GroundTruthFile>(
    groundTruthPath
  );

const investigationCases =
  loadJson<InvestigationCasesFile>(
    investigationCasesPath
  );

/*
 * --------------------------------------------------
 * GROUND TRUTH
 * --------------------------------------------------
 */

const trueCases =
  groundTruth.cases.filter(
    (item) =>
      item.groundTruth === true
  );

const groundTruthByPayment =
  new Map(
    trueCases.map(
      (item) => [
        item.paymentId,
        item
      ]
    )
  );

/*
 * --------------------------------------------------
 * DETECTION
 * --------------------------------------------------
 */

const detectedByPayment =
  new Map(
    investigationCases.cases
      .filter(
        (item) =>
          Boolean(
            item.entities?.paymentId
          )
      )
      .map(
        (item) => [
          item.entities.paymentId!,
          item
        ]
      )
  );

const truePositives =
  trueCases.filter(
    (item) =>
      detectedByPayment.has(
        item.paymentId
      )
  );

const falseNegatives =
  trueCases.filter(
    (item) =>
      !detectedByPayment.has(
        item.paymentId
      )
  );

const falsePositives =
  investigationCases.cases.filter(
    (item) => {
      const paymentId =
        item.entities?.paymentId;

      return (
        !paymentId ||
        !groundTruthByPayment.has(
          paymentId
        )
      );
    }
  );

const tp = truePositives.length;
const fp = falsePositives.length;
const fn = falseNegatives.length;

const precision =
  tp + fp === 0
    ? 0
    : tp / (tp + fp);

const recall =
  tp + fn === 0
    ? 0
    : tp / (tp + fn);

const f1 =
  precision + recall === 0
    ? 0
    : (2 * precision * recall) /
      (precision + recall);

/*
 * --------------------------------------------------
 * FINANCIAL EVALUATION
 * --------------------------------------------------
 */

const groundTruthLeakage =
  round(
    trueCases.reduce(
      (sum, item) =>
        sum + item.expectedLeakage,
      0
    )
  );

const detectedLeakage =
  round(
    investigationCases.cases.reduce(
      (sum, item) =>
        sum +
        item.financialImpact
          .potentialLeakage,
      0
    )
  );

const correctlyDetectedLeakage =
  round(
    truePositives.reduce(
      (sum, truth) => {
        const detected =
          detectedByPayment.get(
            truth.paymentId
          );

        return (
          sum +
          (detected?.financialImpact
            .potentialLeakage ?? 0)
        );
      },
      0
    )
  );

const expectedLeakageForDetectedCases =
  round(
    truePositives.reduce(
      (sum, truth) =>
        sum + truth.expectedLeakage,
      0
    )
  );

const leakageCoverage =
  groundTruthLeakage === 0
    ? 0
    : expectedLeakageForDetectedCases /
      groundTruthLeakage;

/*
 * --------------------------------------------------
 * AMOUNT ACCURACY
 * --------------------------------------------------
 */

let totalAbsoluteError = 0;

for (
  const truth of truePositives
) {
  const detected =
    detectedByPayment.get(
      truth.paymentId
    );

  if (!detected) {
    continue;
  }

  totalAbsoluteError += Math.abs(
    detected.financialImpact
      .potentialLeakage -
      truth.expectedLeakage
  );
}

const meanAbsoluteError =
  tp === 0
    ? 0
    : totalAbsoluteError / tp;

/*
 * --------------------------------------------------
 * TYPE CONSISTENCY
 * --------------------------------------------------
 */

const typeMatches =
  truePositives.filter(
    (truth) => {
      const detected =
        detectedByPayment.get(
          truth.paymentId
        );

      return (
        detected?.type ===
        truth.type
      );
    }
  ).length;

const typeAccuracy =
  tp === 0
    ? 0
    : typeMatches / tp;

/*
 * --------------------------------------------------
 * OUTPUT
 * --------------------------------------------------
 */

console.log("");

console.log(
  "========================================"
);

console.log(
  "     MONEY DETECTIVE DETECTION EVAL"
);

console.log(
  "========================================"
);

console.log("");

console.log("GROUND TRUTH");

console.log(
  "----------------------------------------"
);

console.log(
  `Total scenarios:       ${groundTruth.cases.length}`
);

console.log(
  `True leakage cases:    ${trueCases.length}`
);

console.log(
  `Ground truth leakage:  ${money(
    groundTruthLeakage
  )}`
);

console.log("");

console.log("DETECTION");

console.log(
  "----------------------------------------"
);

console.log(
  `Detected cases:        ${investigationCases.cases.length}`
);

console.log(
  `True positives:        ${tp}`
);

console.log(
  `False positives:       ${fp}`
);

console.log(
  `False negatives:       ${fn}`
);

console.log("");

console.log("QUALITY METRICS");

console.log(
  "----------------------------------------"
);

console.log(
  `Precision:             ${(precision * 100).toFixed(2)}%`
);

console.log(
  `Recall:                ${(recall * 100).toFixed(2)}%`
);

console.log(
  `F1 score:              ${(f1 * 100).toFixed(2)}%`
);

console.log("");

console.log("FINANCIAL COVERAGE");

console.log(
  "----------------------------------------"
);

console.log(
  `Ground truth leakage:  ${money(
    groundTruthLeakage
  )}`
);

console.log(
  `Detected leakage:      ${money(
    detectedLeakage
  )}`
);

console.log(
  `Correctly detected:    ${money(
    correctlyDetectedLeakage
  )}`
);

console.log(
  `Leakage coverage:      ${(leakageCoverage * 100).toFixed(2)}%`
);

console.log("");

console.log("AMOUNT ACCURACY");

console.log(
  "----------------------------------------"
);

console.log(
  `Mean absolute error:   ${money(
    round(meanAbsoluteError)
  )}`
);

console.log(
  `Type accuracy:         ${(typeAccuracy * 100).toFixed(2)}%`
);

console.log("");

console.log("RESULT");

console.log(
  "----------------------------------------"
);

if (
  precision === 1 &&
  recall === 1
) {
  console.log(
    "✓ All ground-truth leakage cases were detected."
  );
} else {
  console.log(
    "⚠ Detection evaluation found mismatches."
  );
}

console.log("");

console.log(
  "Detection evaluation complete."
);