import fs from "node:fs";
import path from "node:path";

import type {
  FinancialDataset,
  GroundTruthCase,
  LeakageType,
} from "../types/financial.js";

import {
  investigate,
} from "./investigationEngine.js";

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

function loadJson<T>(
  filePath: string
): T {
  return JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  ) as T;
}

function countByType(
  types: LeakageType[]
): Record<string, number> {
  return types.reduce<Record<string, number>>(
    (result, type) => {
      result[type] =
        (result[type] ?? 0) + 1;

      return result;
    },
    {}
  );
}

const dataset =
  loadJson<FinancialDataset>(datasetPath);

const groundTruthFile =
  loadJson<GroundTruthFile>(
    groundTruthPath
  );

const report = investigate(dataset);

const trueCases =
  groundTruthFile.cases.filter(
    (item) => item.groundTruth
  );

const detectedTypes =
  report.candidates.map(
    (candidate) => candidate.type
  );

const detectedByType =
  countByType(detectedTypes);

const truthByType =
  countByType(
    trueCases
      .map((item) => item.type)
      .filter(
        (
          type
        ): type is LeakageType =>
          type !== undefined
      )
  );

console.log("");
console.log(
  "========================================"
);
console.log(
  "      MONEY DETECTIVE INVESTIGATION"
);
console.log(
  "========================================"
);
console.log("");

console.log(
  `Total investigation candidates: ${report.totalCandidates}`
);

console.log(
  `Potential leakage detected: ₹${report.totalPotentialLeakage.toFixed(2)}`
);

console.log("");

console.log("DETECTION BY CLASS");
console.log("----------------------------------------");

const leakageTypes: LeakageType[] = [
  "DUPLICATE_REFUND",
  "CAPTURED_CANCELLED_NO_REFUND",
  "REFUND_AMOUNT_MISMATCH",
  "SETTLEMENT_MISMATCH",
  "MISSING_SETTLEMENT",
  "UNEXPLAINED_ADJUSTMENT",
];

for (const type of leakageTypes) {
  console.log(
    `${type.padEnd(35)} truth=${String(
      truthByType[type] ?? 0
    ).padStart(4)} detected=${String(
      detectedByType[type] ?? 0
    ).padStart(4)}`
  );
}

console.log("");

console.log("TOP 10 INVESTIGATIONS");
console.log("----------------------------------------");

for (
  const candidate of report.candidates.slice(
    0,
    10
  )
) {
  console.log(
    `${candidate.type} | ₹${candidate.potentialLeakage.toFixed(
      2
    )} | ${candidate.caseId}`
  );
}

console.log("");

console.log(
  "Investigation engine execution complete."
);

console.log("");