import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import {
  investigateCaseWithOllama,
} from "./ai/aiInvestigator.js";

import {
  runOllamaAgent,
} from "./ai/ollamaAgent.js";

const app = express();

const PORT = Number(
  process.env.PORT ?? 4000
);

app.use(cors());
app.use(express.json());

/*
|--------------------------------------------------------------------------
| Paths
|--------------------------------------------------------------------------
*/

const dataRoot = path.resolve(
  process.cwd(),
  "../data"
);

const investigationsRoot = path.join(
  dataRoot,
  "investigations"
);

const investigationCasesPath = path.join(
  investigationsRoot,
  "investigation-cases.json"
);

const evidenceGraphsPath = path.join(
  investigationsRoot,
  "evidence-graphs.json"
);

const aiReportsPath = path.join(
  investigationsRoot,
  "ai-investigation-reports.json"
);

const recoveryPlansPath = path.join(
  investigationsRoot,
  "recovery-action-plans.json"
);

const recoveryVerificationPath = path.join(
  investigationsRoot,
  "recovery-verification.json"
);

/*
|--------------------------------------------------------------------------
| Generic JSON loader
|--------------------------------------------------------------------------
*/

function loadJson<T>(
  filePath: string
): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Artifact not found: ${filePath}`
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf-8"
    )
  ) as T;
}

/*
|--------------------------------------------------------------------------
| Artifact types
|--------------------------------------------------------------------------
*/

interface InvestigationCase {
  caseId: string;
  type: string;
  status: string;
  severity: string;
  title: string;
  summary: string;
  problem: string;

  financialImpact: {
    expectedAmount: number;
    actualAmount: number;
    potentialLeakage: number;
    currency: string;
  };

  entities: {
    orderId?: string;
    paymentId?: string;
    refundIds?: string[];
    settlementId?: string;
  };

  evidence: unknown[];

  rootCause: {
    category: string;
    explanation: string;
  };

  confidence: number;

  recoverability: string;
  recoverabilityReason: string;

  recommendedAction: {
    action: string;
    owner: string;
    priority: string;
  };

  verification: {
    criteria: string;
    expectedOutcome: string;
  };
}

interface InvestigationCasesFile {
  version: string;
  generatedAt: string;
  summary: {
    totalCases: number;
    totalPotentialLeakage: number;
    criticalCases: number;
    highCases: number;
    mediumCases: number;
    lowCases: number;
  };
  cases: InvestigationCase[];
}

interface EvidenceGraph {
  caseId: string;
  nodes: unknown[];
  edges: unknown[];
  [key: string]: unknown;
}

interface EvidenceGraphsFile {
  version: string;
  generatedAt: string;
  graphs: EvidenceGraph[];
}

interface AIReport {
  caseId: string;
  investigationType: string;

  finding: {
    type: string;
    title: string;
    whatHappened: string;
    whyItMatters: string;
    financialImpact: number;
    confidence: string;
    evidence: string[];
    merchantExplanation: string;
    recommendedNextStep: string;
  };

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

interface AIReportsFile {
  version: string;
  generatedAt: string;
  reports: AIReport[];
}

interface RecoveryPlan {
  caseId: string;
  recoveryStatus: string;
  recoverability: string;
  recoverabilityReason: string;

  financialImpact: {
    potentialRecovery: number;
    currency: string;
  };

  recoveryAction: {
    type: string;
    action: string;
    owner: string;
    priority: string;
  };

  rationale: string;
  steps: string[];

  humanReview: {
    required: boolean;
    reason: string;
  };

  verification: {
    criteria: string;
    expectedOutcome: string;
  };

  aiContext: {
    confidence: string;
    finding: string;
    recommendedNextStep: string;
  };
}

interface RecoveryPlansFile {
  version: string;
  generatedAt: string;
  plans: RecoveryPlan[];
}

interface RecoveryVerification {
  caseId: string;
  status: string;
  potentialRecovery: number;
  verifiedRecovery: number;
  remainingExposure: number;
  [key: string]: unknown;
}

interface RecoveryVerification {
  caseId: string;

  verificationStatus: string;

  financialImpact: {
    potentialRecovery: number;
    verifiedRecovery: number;
    remainingExposure: number;
    currency: string;
  };

  verificationCriteria: string;
  verificationResult: string;
  verifiedAt: string;
}

interface RecoveryVerificationFile {
  version: string;
  generatedAt: string;
  summary: unknown;
  verifications: RecoveryVerification[];
}

/*
|--------------------------------------------------------------------------
| Load artifacts
|--------------------------------------------------------------------------
*/

function getInvestigationCases(): InvestigationCasesFile {
  return loadJson<InvestigationCasesFile>(
    investigationCasesPath
  );
}

function getEvidenceGraphs(): EvidenceGraphsFile {
  return loadJson<EvidenceGraphsFile>(
    evidenceGraphsPath
  );
}

function getAIReports(): AIReportsFile {
  return loadJson<AIReportsFile>(
    aiReportsPath
  );
}

function getRecoveryPlans(): RecoveryPlansFile {
  return loadJson<RecoveryPlansFile>(
    recoveryPlansPath
  );
}

function getRecoveryVerification(): RecoveryVerificationFile {
  return loadJson<RecoveryVerificationFile>(
    recoveryVerificationPath
  );
}

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

app.get(
  "/health",
  (_req, res) => {
    res.json({
      ok: true,
      service: "money-detective-api",
      version: "1.0.0"
    });
  }
);

app.get(
  "/",
  (_req, res) => {
    res.json({
      name: "Money Detective API",
      tagline:
        "Find, explain, and recover money merchants are losing.",
      status: "running"
    });
  }
);

/*
|--------------------------------------------------------------------------
| 4.1.1 Dashboard summary
|--------------------------------------------------------------------------
*/

app.get(
  "/api/dashboard",
  (_req, res) => {
    try {
      const cases =
        getInvestigationCases();

      const recovery =
        getRecoveryPlans();

      const verification =
        getRecoveryVerification();

      const totalPotentialRecovery =
        recovery.plans.reduce(
          (sum, plan) =>
            sum +
            plan.financialImpact
              .potentialRecovery,
          0
        );

      const verifiedRecovery =
        verification.verifications.reduce(
          (sum, result) =>
            sum +
            result.financialImpact
              .verifiedRecovery,
          0
        );

      const remainingExposure =
        verification.verifications.reduce(
          (sum, result) =>
            sum +
            result.financialImpact
              .remainingExposure,
          0
        );

      res.json({
        totalCases:
          cases.summary.totalCases,

        totalPotentialLeakage:
          cases.summary.totalPotentialLeakage,

        criticalCases:
          cases.summary.criticalCases,

        highCases:
          cases.summary.highCases,

        mediumCases:
          cases.summary.mediumCases,

        lowCases:
          cases.summary.lowCases,

        totalPotentialRecovery,

        verifiedRecovery,

        remainingExposure,

        humanReviewRequired:
          recovery.plans.filter(
            (plan) =>
              plan.humanReview.required
          ).length,

        recoveryStatus: {
          recovered:
            verification.verifications.filter(
              (item) =>
                item.verificationStatus ===
                "recovered"
            ).length,

          partiallyRecovered:
            verification.verifications.filter(
              (item) =>
                item.verificationStatus ===
                "partially_recovered"
            ).length,

          notRecovered:
            verification.verifications.filter(
              (item) =>
                item.verificationStatus ===
                "not_recovered"
            ).length,

          pending:
            verification.verifications.filter(
              (item) =>
                item.verificationStatus ===
                "pending"
            ).length
        }
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load dashboard data.",

        details:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 4.1.2 Investigation cases
|--------------------------------------------------------------------------
*/

app.get(
  "/api/cases",
  (_req, res) => {
    try {
      const cases =
        getInvestigationCases();

      res.json({
        total:
          cases.cases.length,

        cases:
          cases.cases
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load investigation cases.",
        details:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

function findCase(
  caseId: string
): InvestigationCase | undefined {
  return getInvestigationCases()
    .cases
    .find(
      (item) =>
        item.caseId === caseId
    );
}

/*
|--------------------------------------------------------------------------
| 4.1.3 Case detail
|--------------------------------------------------------------------------
*/

app.get(
  "/api/cases/:caseId",
  (req, res) => {
    try {
      const investigationCase =
        findCase(
          req.params.caseId
        );

      if (!investigationCase) {
        res.status(404).json({
          error: "Investigation case not found.",
          caseId: req.params.caseId
        });

        return;
      }

      res.json({
        case: investigationCase
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load case.",
        details:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 4.1.4 Evidence
|--------------------------------------------------------------------------
*/

app.get(
  "/api/cases/:caseId/evidence",
  (req, res) => {
    try {
      const graphFile =
        getEvidenceGraphs();

      const graph =
        graphFile.graphs.find(
          (item) =>
            item.caseId ===
            req.params.caseId
        );

      if (!graph) {
        res.status(404).json({
          error:
            "Evidence graph not found.",
          caseId:
            req.params.caseId
        });

        return;
      }

      res.json({
        caseId:
          req.params.caseId,
        graph
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load evidence graph.",
        details:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 4.1.5 AI investigation
|--------------------------------------------------------------------------
*/

app.get(
  "/api/cases/:caseId/ai",
  async (req, res) => {
    try {
      const caseId =
        req.params.caseId;

      const investigationCase =
        findCase(caseId);

      if (!investigationCase) {
        res.status(404).json({
          error:
            "Investigation case not found.",
          caseId,
        });

        return;
      }

      const graphFile =
        getEvidenceGraphs();

      const graph =
        graphFile.graphs.find(
          (item) =>
            item.caseId === caseId
        );

      if (!graph) {
        res.status(404).json({
          error:
            "Evidence graph not found.",
          caseId,
        });

        return;
      }

      console.log(
  `[AI] Starting Ollama investigation for ${caseId}`,
  {
    method: req.method,
    url: req.originalUrl,
    time: new Date().toISOString(),
  }
);

      const aiResult =
        await runOllamaAgent({
          caseId,
          paymentId:
            investigationCase.entities.paymentId,
          orderId:
            investigationCase.entities.orderId,
          question:
            `Investigate this ${investigationCase.type} case and explain what happened, why it matters, and what should be investigated next.`,
          context: {
            investigationCase,
            evidenceGraph: graph,
          },
        });

      console.log(
  `[AI] Ollama investigation completed for ${caseId}`,
  {
    method: req.method,
    url: req.originalUrl,
    time: new Date().toISOString(),
  }
);

      res.json({
        caseId,
        ai: aiResult,
      });
    } catch (error) {
      console.error(
        "Ollama AI investigation failed:",
        error
      );

      res.status(500).json({
        error:
          "AI investigation failed.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);
/*
|--------------------------------------------------------------------------
| 4.1.6 Recovery action
|--------------------------------------------------------------------------
*/

app.get(
  "/api/cases/:caseId/recovery",
  (req, res) => {
    try {
      const plans =
        getRecoveryPlans();

      const plan =
        plans.plans.find(
          (item) =>
            item.caseId ===
            req.params.caseId
        );

      if (!plan) {
        res.status(404).json({
          error:
            "Recovery plan not found.",
          caseId:
            req.params.caseId
        });

        return;
      }

      res.json({
        caseId:
          req.params.caseId,
        plan
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load recovery plan.",
        details:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 4.1.7 Recovery verification
|--------------------------------------------------------------------------
*/

app.get(
  "/api/cases/:caseId/verification",
  (req, res) => {
    try {
      const verification =
        getRecoveryVerification();

      const result =
        verification.verifications.find(
          (item) =>
            item.caseId ===
            req.params.caseId
        );

      if (!result) {
        res.status(404).json({
          error:
            "Recovery verification not found.",
          caseId:
            req.params.caseId
        });

        return;
      }

      res.json({
        caseId:
          req.params.caseId,
        verification:
          result
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load recovery verification.",
        details:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log(
      `Money Detective API running on http://localhost:${PORT}`
    );
  }
);