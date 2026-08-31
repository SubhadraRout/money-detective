import fs from "node:fs";
import path from "node:path";

import type {
  InvestigationCase,
} from "../investigation/investigationCase.js";

import type {
  EvidenceGraph,
} from "../investigation/evidenceGraph.js";

import {
  investigateCase,
} from "./aiInvestigator.js";

interface InvestigationCasesFile {
  cases: InvestigationCase[];
}

interface EvidenceGraphsFile {
  graphs: EvidenceGraph[];
}

const casesPath = path.resolve(
  process.cwd(),
  "../data/investigations/investigation-cases.json"
);

const graphsPath = path.resolve(
  process.cwd(),
  "../data/investigations/evidence-graphs.json"
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

const graphsFile =
  loadJson<EvidenceGraphsFile>(
    graphsPath
  );

const graphByCaseId =
  new Map<string, EvidenceGraph>();

for (
  const graph of graphsFile.graphs
) {
  graphByCaseId.set(
    graph.caseId,
    graph
  );
}

const reports =
  casesFile.cases
    .map((investigationCase) => {
      const graph =
        graphByCaseId.get(
          investigationCase.caseId
        );

      if (!graph) {
        console.warn(
          `Missing evidence graph for ${investigationCase.caseId}`
        );

        return null;
      }

      return investigateCase(
        investigationCase,
        graph
      );
    })
    .filter(
      (
        report
      ): report is NonNullable<
        typeof report
      > => report !== null
    );

const totalFinancialImpact =
  reports.reduce(
    (sum, report) =>
      sum +
      report.finding.financialImpact,
    0
  );

const confidenceCounts =
  reports.reduce(
    (result, report) => {
      const confidence =
        report.finding.confidence;

      result[confidence] =
        (result[confidence] ?? 0) +
        1;

      return result;
    },
    {
      low: 0,
      medium: 0,
      high: 0,
    } as Record<
      string,
      number
    >
  );

const output = {
  version: "1.0.0",

  generatedAt:
    new Date().toISOString(),

  summary: {
    totalReports:
      reports.length,

    totalFinancialImpact,

    highConfidence:
      confidenceCounts.high,

    mediumConfidence:
      confidenceCounts.medium,

    lowConfidence:
      confidenceCounts.low,
  },

  reports,
};

const outputPath = path.resolve(
  process.cwd(),
  "../data/investigations/ai-investigation-reports.json"
);

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
  "        MONEY DETECTIVE AI INVESTIGATOR"
);

console.log(
  "========================================"
);

console.log("");

console.log(
  `Investigation cases: ${casesFile.cases.length}`
);

console.log(
  `AI reports generated: ${reports.length}`
);

console.log(
  `Financial impact: ₹${totalFinancialImpact.toFixed(
    2
  )}`
);

console.log("");

console.log(
  "CONFIDENCE"
);

console.log(
  "----------------------------------------"
);

console.log(
  `High:   ${confidenceCounts.high}`
);

console.log(
  `Medium: ${confidenceCounts.medium}`
);

console.log(
  `Low:    ${confidenceCounts.low}`
);

console.log("");

if (reports.length > 0) {
  const sample =
    reports[0];

  console.log(
    "SAMPLE AI INVESTIGATION"
  );

  console.log(
    "----------------------------------------"
  );

  console.log(
    `Case: ${sample.caseId}`
  );

  console.log(
    `Type: ${sample.investigationType}`
  );

  console.log(
    `Title: ${sample.finding.title}`
  );

  console.log("");

  console.log(
    "WHAT HAPPENED"
  );

  console.log(
    sample.finding.whatHappened
  );

  console.log("");

  console.log(
    "WHY IT MATTERS"
  );

  console.log(
    sample.finding.whyItMatters
  );

  console.log("");

  console.log(
    `FINANCIAL IMPACT: ₹${sample.finding.financialImpact.toFixed(
      2
    )}`
  );

  console.log(
    `CONFIDENCE: ${sample.finding.confidence}`
  );

  console.log("");

  console.log(
    "RECOMMENDED NEXT STEP"
  );

  console.log(
    sample.finding
      .recommendedNextStep
  );
}

console.log("");

console.log(
  `Reports written to: ${outputPath}`
);

console.log("");

console.log(
  "AI investigation complete."
);

console.log("");