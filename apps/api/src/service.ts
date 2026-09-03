import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";

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

const recoveryDecisionsPath = path.join(
  investigationsRoot,
  "recovery-decisions.json"
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

function saveJson<T>(
  filePath: string,
  data: T
): void {
  fs.mkdirSync(
    path.dirname(filePath),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );
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

  recoveryCase?: {
    status?: string;
    caseId?: string;
    amount?: number;
  };

  recoveryMessage?: {
    subject?: string;
    message?: string;
    body?: string;
  };
}

interface RecoveryPlansFile {
  version: string;
  generatedAt: string;
  plans: RecoveryPlan[];
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

type RecoveryStatus =
  | "approved"
  | "rejected"
  | "recovered";

type RecoveryAction =
  | "initiated"
  | "not_initiated"
  | "completed";

type VerificationStatus =
  | "pending"
  | "not_applicable"
  | "recovered";

interface RecoveryDecision {
  caseId: string;

  recoveryStatus:
    | "approved"
    | "rejected"
    | "recovered";

  recoveryAction:
    | "initiated"
    | "not_initiated"
    | "completed";

  verificationStatus:
    | "pending"
    | "not_applicable"
    | "recovered";

  decidedBy: "human";

  decidedAt: string;

  reason?: string;
}

interface RecoveryDecisionsFile {
  decisions: RecoveryDecision[];
}

/*
|--------------------------------------------------------------------------
| Artifact loaders
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

function getBaseRecoveryVerification(): RecoveryVerificationFile {
  return loadJson<RecoveryVerificationFile>(
    recoveryVerificationPath
  );
}

function getRecoveryDecisions(): RecoveryDecisionsFile {
  if (!fs.existsSync(recoveryDecisionsPath)) {
    return {
      decisions: [],
    };
  }

  return loadJson<RecoveryDecisionsFile>(
    recoveryDecisionsPath
  );
}

function saveRecoveryDecisions(
  data: RecoveryDecisionsFile
): void {
  saveJson(
    recoveryDecisionsPath,
    data
  );
}

/*
|--------------------------------------------------------------------------
| Recovery helpers
|--------------------------------------------------------------------------
*/

/**
 * Get the latest human decision for a case.
 */
function getRecoveryDecision(
  caseId: string
): RecoveryDecision | undefined {
  const decisions =
    getRecoveryDecisions();

  return decisions.decisions.find(
    (item) =>
      item.caseId === caseId
  );
}

/**
 * Build the effective recovery status.
 *
 * The original recovery plan is static.
 * Human decisions are stored separately.
 */
function getEffectiveRecoveryPlan(
  plan: RecoveryPlan
): RecoveryPlan {
  const decision =
    getRecoveryDecision(
      plan.caseId
    );

  if (!decision) {
    return plan;
  }

  return {
    ...plan,

    recoveryStatus:
      decision.recoveryStatus,

    recoveryDecision: {
      action:
        decision.recoveryAction,

      verificationStatus:
        decision.verificationStatus,

      decidedBy:
        decision.decidedBy,

      decidedAt:
        decision.decidedAt,

      reason:
        decision.reason,
    },
  } as RecoveryPlan & {
    recoveryDecision: {
      action: string;
      verificationStatus: string;
      decidedBy: string;
      decidedAt: string;
      reason?: string;
    };
  };
}

/**
 * Get verification state after applying
 * the human recovery decision.
 *
 * The base verification artifact remains
 * untouched. Decisions dynamically determine
 * the current lifecycle state.
 */
function getEffectiveRecoveryVerification():
  RecoveryVerificationFile {
  const verification =
    getBaseRecoveryVerification();

  const decisions =
    getRecoveryDecisions();

  const plans =
    getRecoveryPlans();

  const effectiveResults =
    verification.verifications.map(
      (result) => {
        const decision =
          decisions.decisions.find(
            (item) =>
              item.caseId ===
              result.caseId
          );

        if (!decision) {
          return result;
        }

        const plan =
          plans.plans.find(
            (item) =>
              item.caseId ===
              result.caseId
          );

        const potentialRecovery =
          plan?.financialImpact
            .potentialRecovery ??
          result.financialImpact
            .potentialRecovery;

        /*
         * Approved:
         * recovery has started but has
         * not yet been confirmed.
         */
        if (
          decision.recoveryStatus ===
            "approved" &&
          decision.recoveryAction ===
            "initiated"
        ) {
          return {
            ...result,

            verificationStatus:
              "pending",

            financialImpact: {
              ...result.financialImpact,

              potentialRecovery,

              verifiedRecovery: 0,

              remainingExposure:
                potentialRecovery,
            },

            verificationResult:
              "Recovery has been approved and initiated. Awaiting human confirmation that the recovery was completed.",

            verifiedAt:
              result.verifiedAt,
          };
        }

        /*
         * Rejected:
         * no financial recovery action
         * was initiated.
         */
        if (
          decision.recoveryStatus ===
            "rejected"
        ) {
          return {
            ...result,

            verificationStatus:
              "not_applicable",

            financialImpact: {
              ...result.financialImpact,

              potentialRecovery,

              verifiedRecovery: 0,

              remainingExposure:
                potentialRecovery,
            },

            verificationResult:
              "Recovery recommendation was rejected by the human reviewer. No recovery action was initiated.",

            verifiedAt:
              result.verifiedAt,
          };
        }

        /*
         * Recovered:
         * the human confirmed that the
         * approved recovery was completed.
         */
        if (
          decision.recoveryStatus ===
            "recovered" &&
          decision.recoveryAction ===
            "completed"
        ) {
          return {
            ...result,

            verificationStatus:
              "recovered",

            financialImpact: {
              ...result.financialImpact,

              potentialRecovery,

              verifiedRecovery:
                potentialRecovery,

              remainingExposure: 0,
            },

            verificationResult:
              `The full potential recovery of ₹${potentialRecovery.toFixed(
                2
              )} was reconciled. No remaining financial exposure was identified.`,

            verifiedAt:
              decision.decidedAt,
          };
        }

        return result;
      }
    );

  return {
    ...verification,

    verifications:
      effectiveResults,
  };
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
      service:
        "money-detective-api",
      version: "1.0.0",
    });
  }
);

app.get(
  "/",
  (_req, res) => {
    res.json({
      name:
        "Money Detective API",

      tagline:
        "Find, explain, and recover money merchants are losing.",

      status: "running",
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

      /*
       * IMPORTANT:
       * Use effective verification state,
       * not the static artifact.
       */
      const verification =
        getEffectiveRecoveryVerification();

      const effectivePlans =
        recovery.plans.map(
          getEffectiveRecoveryPlan
        );

      const totalPotentialRecovery =
        effectivePlans.reduce(
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
          cases.summary
            .totalPotentialLeakage,

        criticalCases:
          cases.summary
            .criticalCases,

        highCases:
          cases.summary.highCases,

        mediumCases:
          cases.summary
            .mediumCases,

        lowCases:
          cases.summary.lowCases,

        totalPotentialRecovery,

        verifiedRecovery,

        remainingExposure,

        humanReviewRequired:
          effectivePlans.filter(
            (plan) =>
              plan.recoveryStatus ===
              "human_review_required"
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
            ).length,
        },
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load dashboard data.",

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
          cases.cases,
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load investigation cases.",

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
        item.caseId ===
        caseId
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
          error:
            "Investigation case not found.",

          caseId:
            req.params.caseId,
        });

        return;
      }

      res.json({
        case:
          investigationCase,
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load case.",

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
            req.params.caseId,
        });

        return;
      }

      res.json({
        caseId:
          req.params.caseId,

        graph,
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load evidence graph.",

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
          time:
            new Date().toISOString(),
        }
      );

      const aiResult =
        await runOllamaAgent({
          caseId,

          paymentId:
            investigationCase
              .entities
              .paymentId,

          orderId:
            investigationCase
              .entities
              .orderId,

          question:
            `Investigate this ${investigationCase.type} case and explain what happened, why it matters, and what should be investigated next.`,

          context: {
            investigationCase,
            evidenceGraph:
              graph,
          },
        });

      console.log(
        `[AI] Ollama investigation completed for ${caseId}`,
        {
          method: req.method,
          url: req.originalUrl,
          time:
            new Date().toISOString(),
        }
      );

      res.json({
        caseId,
        ai:
          aiResult,
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
      const caseId =
        req.params.caseId;

      const plans =
        getRecoveryPlans();

      const plan =
        plans.plans.find(
          (item) =>
            item.caseId === caseId
        );

      if (!plan) {
        res.status(404).json({
          error:
            "Recovery plan not found.",

          caseId,
        });

        return;
      }

      const effectivePlan =
        getEffectiveRecoveryPlan(
          plan
        );

      res.json({
        caseId,

        plan:
          effectivePlan,
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load recovery plan.",

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
| 4.1.7 Human recovery approval
|--------------------------------------------------------------------------
*/

app.post(
  "/api/cases/:caseId/recovery/approve",
  (req, res) => {
    try {
      const caseId =
        req.params.caseId;

      const plans =
        getRecoveryPlans();

      const plan =
        plans.plans.find(
          (item) =>
            item.caseId === caseId
        );

      if (!plan) {
        res.status(404).json({
          error:
            "Recovery plan not found.",

          caseId,
        });

        return;
      }

      const existingDecision =
        getRecoveryDecision(
          caseId
        );

      /*
       * Do not allow a rejected or
       * recovered case to be approved
       * again in the MVP.
       */
      if (
        existingDecision?.recoveryStatus ===
          "rejected" ||
        existingDecision?.recoveryStatus ===
          "recovered"
      ) {
        res.status(409).json({
          error:
            "This recovery decision is already final.",

          caseId,

          recoveryStatus:
            existingDecision
              .recoveryStatus,
        });

        return;
      }

      /*
       * Idempotent approval.
       */
      if (
        existingDecision?.recoveryStatus ===
        "approved"
      ) {
        res.json({
          success: true,

          caseId,

          recoveryStatus:
            existingDecision
              .recoveryStatus,

          recoveryAction:
            existingDecision
              .recoveryAction,

          verificationStatus:
            existingDecision
              .verificationStatus,

          approvedBy:
            "human",

          approvedAt:
            existingDecision
              .decidedAt,

          message:
            "Recovery is already approved and awaiting completion.",
        });

        return;
      }

      const decisions =
        getRecoveryDecisions();

      const decision: RecoveryDecision =
        {
          caseId,

          recoveryStatus:
            "approved",

          recoveryAction:
            "initiated",

          verificationStatus:
            "pending",

          decidedBy:
            "human",

          decidedAt:
            new Date().toISOString(),
        };

      decisions.decisions.push(
        decision
      );

      saveRecoveryDecisions(
        decisions
      );

      res.json({
        success: true,

        caseId,

        recoveryStatus:
          decision.recoveryStatus,

        recoveryAction:
          decision.recoveryAction,

        verificationStatus:
          decision.verificationStatus,

        approvedBy:
          "human",

        approvedAt:
          decision.decidedAt,

        message:
          "Recovery approved by human reviewer. Recovery action can now be completed externally and verified.",
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to approve recovery.",

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
| 4.1.8 Human recovery rejection
|--------------------------------------------------------------------------
*/

app.post(
  "/api/cases/:caseId/recovery/reject",
  (req, res) => {
    try {
      const caseId =
        req.params.caseId;

      const plans =
        getRecoveryPlans();

      const plan =
        plans.plans.find(
          (item) =>
            item.caseId === caseId
        );

      if (!plan) {
        res.status(404).json({
          error:
            "Recovery plan not found.",

          caseId,
        });

        return;
      }

      const existingDecision =
        getRecoveryDecision(
          caseId
        );

      /*
       * Rejection is final for this MVP.
       */
      if (
        existingDecision
      ) {
        res.status(409).json({
          error:
            "A recovery decision has already been recorded for this case.",

          caseId,

          recoveryStatus:
            existingDecision
              .recoveryStatus,
        });

        return;
      }

      const reason =
        typeof req.body?.reason ===
        "string"
          ? req.body.reason
          : "Recovery recommendation rejected by human reviewer.";

      const decisions =
        getRecoveryDecisions();

      const decision: RecoveryDecision =
        {
          caseId,

          recoveryStatus:
            "rejected",

          recoveryAction:
            "not_initiated",

          verificationStatus:
            "not_applicable",

          decidedBy:
            "human",

          decidedAt:
            new Date().toISOString(),

          reason,
        };

      decisions.decisions.push(
        decision
      );

      saveRecoveryDecisions(
        decisions
      );

      res.json({
        success: true,

        caseId,

        recoveryStatus:
          decision.recoveryStatus,

        recoveryAction:
          decision.recoveryAction,

        verificationStatus:
          decision.verificationStatus,

        rejectedBy:
          "human",

        rejectedAt:
          decision.decidedAt,

        reason,

        message:
          "Recovery recommendation rejected by human reviewer.",
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to reject recovery.",

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
| 4.1.9 Recovery completion
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This endpoint does NOT move real money.
|
| It records that the human-approved
| recovery action has been completed
| externally/manualy.
|
| The verification API then exposes the
| deterministic recovered state.
|
*/

app.post(
  "/api/cases/:caseId/recovery/complete",
  (req, res) => {
    try {
      const caseId =
        req.params.caseId;

      const plans =
        getRecoveryPlans();

      const plan =
        plans.plans.find(
          (item) =>
            item.caseId === caseId
        );

      if (!plan) {
        res.status(404).json({
          error:
            "Recovery plan not found.",

          caseId,
        });

        return;
      }

      const existingDecision =
        getRecoveryDecision(
          caseId
        );

      /*
       * Recovery can only be completed
       * after human approval.
       */
            /*
       * Idempotent completion.
       *
       * If this case was already recovered,
       * return the existing final state.
       */
      if (
        existingDecision?.recoveryStatus ===
        "recovered"
      ) {
        res.json({
          success: true,

          caseId,

          recoveryStatus:
            "recovered",

          recoveryAction:
            "completed",

          verificationStatus:
            "recovered",

          completedBy:
            "human",

          completedAt:
            existingDecision.decidedAt,

          message:
            "Recovery has already been completed and verified.",
        });

        return;
      }

      /*
       * Recovery can only be completed
       * after human approval.
       */
      if (
        !existingDecision ||
        existingDecision.recoveryStatus !==
          "approved"
      ) {
        res.status(409).json({
          error:
            "Recovery must be approved by a human reviewer before it can be completed.",

          caseId,

          recoveryStatus:
            existingDecision
              ?.recoveryStatus ??
            plan.recoveryStatus,
        });

        return;
      }

      /*
       * Update the existing human decision.
       */
      const decisions =
        getRecoveryDecisions();

      const decisionIndex =
        decisions.decisions.findIndex(
          (item) =>
            item.caseId === caseId
        );

      if (
        decisionIndex < 0
      ) {
        res.status(409).json({
          error:
            "Approved recovery decision could not be found.",

          caseId,
        });

        return;
      }

      const completedAt =
        new Date().toISOString();

      decisions.decisions[
        decisionIndex
      ] = {
        ...decisions.decisions[
          decisionIndex
        ],

        recoveryStatus:
          "recovered",

        recoveryAction:
          "completed",

        verificationStatus:
          "recovered",

        decidedBy:
          "human",

        decidedAt:
          completedAt,
      };

      saveRecoveryDecisions(
        decisions
      );

      res.json({
        success: true,

        caseId,

        recoveryStatus:
          "recovered",

        recoveryAction:
          "completed",

        verificationStatus:
          "recovered",

        completedBy:
          "human",

        completedAt,

        message:
          "Recovery completion recorded. Deterministic verification now confirms the recovered amount.",
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to complete recovery.",

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
| 4.1.10 Recovery verification
|--------------------------------------------------------------------------
*/

app.get(
  "/api/cases/:caseId/verification",
  (req, res) => {
    try {
      const verification =
        getEffectiveRecoveryVerification();

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
            req.params.caseId,
        });

        return;
      }

      res.json({
        caseId:
          req.params.caseId,

        verification:
          result,
      });
    } catch (error) {
      res.status(500).json({
        error:
          "Failed to load recovery verification.",

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