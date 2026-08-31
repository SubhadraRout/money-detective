import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { FinancialDataset } from "../types/financial.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findDatasetPath(): string {
  const candidates = [
    path.resolve(
      __dirname,
      "../../data/generated/financial-dataset.json"
    ),

    path.resolve(
      __dirname,
      "../../../data/generated/financial-dataset.json"
    ),

    path.resolve(
      __dirname,
      "../../../../data/generated/financial-dataset.json"
    )
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    [
      "Financial dataset not found.",
      "",
      "Expected the generated dataset at one of:",
      ...candidates
    ].join("\n")
  );
}

export function loadFinancialDataset(): FinancialDataset {
  const datasetPath = findDatasetPath();

  const raw = fs.readFileSync(
    datasetPath,
    "utf8"
  );

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Unable to parse financial dataset: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "Invalid financial dataset: root must be an object."
    );
  }

  const dataset =
    parsed as Partial<FinancialDataset>;

  if (
    typeof dataset.version !==
    "string"
  ) {
    throw new Error(
      "Invalid financial dataset: missing version."
    );
  }

  if (
    !Array.isArray(dataset.orders)
  ) {
    throw new Error(
      "Invalid financial dataset: orders must be an array."
    );
  }

  if (
    !Array.isArray(dataset.payments)
  ) {
    throw new Error(
      "Invalid financial dataset: payments must be an array."
    );
  }

  if (
    !Array.isArray(dataset.refunds)
  ) {
    throw new Error(
      "Invalid financial dataset: refunds must be an array."
    );
  }

  if (
    !Array.isArray(dataset.fees)
  ) {
    throw new Error(
      "Invalid financial dataset: fees must be an array."
    );
  }

  if (
    !Array.isArray(dataset.settlements)
  ) {
    throw new Error(
      "Invalid financial dataset: settlements must be an array."
    );
  }

  if (
    !Array.isArray(dataset.groundTruth)
  ) {
    throw new Error(
      "Invalid financial dataset: groundTruth must be an array."
    );
  }

  return dataset as FinancialDataset;
}

export function getDatasetSummary(
  dataset: FinancialDataset
) {
  return {
    version: dataset.version,

    generatedAt:
      dataset.generatedAt,

    orders:
      dataset.orders.length,

    payments:
      dataset.payments.length,

    refunds:
      dataset.refunds.length,

    fees:
      dataset.fees.length,

    settlements:
      dataset.settlements.length,

    groundTruthCases:
      dataset.groundTruth.length,

    injectedLeakageCases:
      dataset.groundTruth.filter(
        item => item.groundTruth
      ).length
  };
}