import fs from "node:fs";
import path from "node:path";

import type {
  InvestigationCase,
} from "../investigation/investigationCase.js";

import type {
  AIInvestigationReport,
} from "../ai/aiInvestigator.js";

import {
  createRecoveryPlans,
} from "./recoveryEngine.js";

interface InvestigationCasesFile {
  version: string;
  generatedAt: string;
  cases: InvestigationCase[];
}

interface AIReportsFile {
  version: string;
  generatedAt: string;
  reports: AIInvestigationReport[];
}

const casesPath = path.resolve(
  process.cwd(),
  "../data/investigations/investigation-cases.json"
);

const aiReportsPath = path.resolve(
  process.cwd(),
  "../data/investigations/ai-investigation-reports.json"
);

const outputPath = path.resolve(
  process.cwd(),
  "../data/investigations/recovery-action-plans.json"
);

function loadJson<T>(
  filePath: string
): T {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf-8"
    )
  ) as T;
}

const casesFile =
  loadJson<InvestigationCasesFile>(
    casesPath
  );

const aiReportsFile =
  loadJson<AIReportsFile>(
    aiReportsPath
  );

const recoveryPlans =
  createRecoveryPlans(
    casesFile.cases,
    aiReportsFile.reports
  );

const totalPotentialRecovery =
  recoveryPlans.reduce(
    (sum, plan) =>
      sum +
      plan.financialImpact
        .potentialRecovery,
    0
  );

const highRecoverability =
  recoveryPlans.filter(
    (plan) =>
      plan.recoverability === "high"
  ).length;

const mediumRecoverability =
  recoveryPlans.filter(
    (plan) =>
      plan.recoverability === "medium"
  ).length;

const lowRecoverability =
  recoveryPlans.filter(
    (plan) =>
      plan.recoverability === "low"
  ).length;

const humanReviewRequired =
  recoveryPlans.filter(
    (plan) =>
      plan.humanReview.required
  ).length;

const actionCounts =
  recoveryPlans.reduce<
    Record<string, number>
  >(
    (result, plan) => {
      result[
        plan.recoveryAction.type
      ] =
        (result[
          plan.recoveryAction.type
        ] ?? 0) + 1;

      return result;
    },
    {}
  );

const output = {
  version: "1.0.0",
  generatedAt:
    new Date().toISOString(),
  description:
    "Recovery action plans generated from deterministic investigation cases and AI investigation reports.",
  totalPlans:
    recoveryPlans.length,
  totalPotentialRecovery:
    Number(
      totalPotentialRecovery.toFixed(2)
    ),
  summary: {
    highRecoverability,
    mediumRecoverability,
    lowRecoverability,
    humanReviewRequired,
    actionTypes:
      actionCounts,
  },
  plans: recoveryPlans,
};

fs.mkdirSync(
  path.dirname(outputPath),
  {
    recursive: true,
  }
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    output,
    null,
    2
  ),
  "utf-8"
);

console.log("");

console.log(
  "========================================"
);

console.log(
  "       MONEY DETECTIVE RECOVERY ENGINE"
);

console.log(
  "========================================"
);

console.log("");

console.log(
  `Investigation cases: ${casesFile.cases.length}`
);

console.log(
  `AI investigation reports: ${aiReportsFile.reports.length}`
);

console.log(
  `Recovery plans generated: ${recoveryPlans.length}`
);

console.log(
  `Potential recovery: ₹${totalPotentialRecovery.toFixed(2)}`
);

console.log("");

console.log(
  "RECOVERABILITY"
);

console.log(
  "----------------------------------------"
);

console.log(
  `High:   ${highRecoverability}`
);

console.log(
  `Medium: ${mediumRecoverability}`
);

console.log(
  `Low:    ${lowRecoverability}`
);

console.log("");

console.log(
  `Human review required: ${humanReviewRequired}`
);

console.log("");

console.log(
  "RECOVERY ACTIONS"
);

console.log(
  "----------------------------------------"
);

for (
  const [
    action,
    count,
  ] of Object.entries(
    actionCounts
  )
) {
  console.log(
    `${action.padEnd(35)} ${count}`
  );
}

console.log("");

if (recoveryPlans.length > 0) {
  const sample =
    recoveryPlans[0];

  console.log(
    "SAMPLE RECOVERY PLAN"
  );

  console.log(
    "----------------------------------------"
  );

  console.log(
    `Case: ${sample.caseId}`
  );

  console.log(
    `Recoverability: ${sample.recoverability}`
  );

  console.log(
    `Potential recovery: ₹${sample.financialImpact.potentialRecovery.toFixed(2)}`
  );

  console.log(
    `Action: ${sample.recoveryAction.type}`
  );

  console.log(
    `Owner: ${sample.recoveryAction.owner}`
  );

  console.log(
    `Priority: ${sample.recoveryAction.priority}`
  );

  console.log(
    `Human review: ${sample.humanReview.required ? "required" : "not required"}`
  );

  console.log("");

  console.log(
    "Steps:"
  );

  sample.steps.forEach(
    (step, index) => {
      console.log(
        `  ${index + 1}. ${step}`
      );
    }
  );
}

console.log("");

console.log(
  `Recovery plans written to: ${outputPath}`
);

console.log("");

console.log(
  "Recovery engine execution complete."
);

console.log("");