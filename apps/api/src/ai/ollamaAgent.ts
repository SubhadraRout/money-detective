import {
  getPayments,
  getRefunds,
  getSettlements,
  getOrders,
  getFees,
  calculateExpectedSettlement,
  findUnmatchedRecords,
  getTransactionHistory,
  createRecoveryCase,
  draftRecoveryMessage,
} from "./agentTools.js";

const OLLAMA_URL =
  process.env.OLLAMA_URL ??
  "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ??
  "qwen3:4b";

type AgentInput = {
  question: string;
  caseId?: string;
  paymentId?: string;
  orderId?: string;
  context?: unknown;
};

type ToolArguments = Record<string, unknown>;

type ToolCall = {
  function: {
    name: string;
    arguments: ToolArguments;
  };
};

type OllamaMessage = {
  role:
    | "system"
    | "user"
    | "assistant"
    | "tool";

  content?: string;

  tool_calls?: ToolCall[];

  tool_name?: string;
};

type OllamaResponse = {
  message: OllamaMessage;

  done?: boolean;

  error?: string;
};

/*
 * =========================================================
 * OLLAMA TOOL DEFINITIONS
 * =========================================================
 */

const tools = [
  {
    type: "function",

    function: {
      name: "getPayments",

      description:
        "Retrieve payment records and inspect amount, status, order and payment details.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },

          orderId: {
            type: "string",
          },
        },

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "getRefunds",

      description:
        "Retrieve refunds associated with a payment or order.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },

          orderId: {
            type: "string",
          },
        },

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "getSettlements",

      description:
        "Retrieve settlement records associated with a payment.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },

          settlementId: {
            type: "string",
          },
        },

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "getOrders",

      description:
        "Retrieve an order by order ID.",

      parameters: {
        type: "object",

        properties: {
          orderId: {
            type: "string",
          },
        },

        required: ["orderId"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "getFees",

      description:
        "Retrieve fees associated with a payment.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },
        },

        required: ["paymentId"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "calculateExpectedSettlement",

      description:
        "Deterministically calculate the expected settlement amount.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },
        },

        required: ["paymentId"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "findUnmatchedRecords",

      description:
        "Find inconsistencies between payment, refunds, fees and settlement records.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },
        },

        required: ["paymentId"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "getTransactionHistory",

      description:
        "Retrieve complete transaction history for a payment.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },
        },

        required: ["paymentId"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "createRecoveryCase",

      description:
        "Prepare a recovery case for human review. Does not execute a financial action.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },

          reason: {
            type: "string",
          },

          amount: {
            type: "number",
          },
        },

        required: [
          "paymentId",
          "reason",
        ],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "draftRecoveryMessage",

      description:
        "Draft a recovery message for Finance or Payments Operations.",

      parameters: {
        type: "object",

        properties: {
          paymentId: {
            type: "string",
          },

          reason: {
            type: "string",
          },

          amount: {
            type: "number",
          },
        },

        required: [
          "paymentId",
          "reason",
        ],

        additionalProperties: false,
      },
    },
  },
];

/*
 * =========================================================
 * EXECUTE TOOL
 * =========================================================
 */

function executeTool(
  name: string,
  args: ToolArguments
) {
  switch (name) {
    case "getPayments":
      return getPayments({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : undefined,

        orderId:
          typeof args.orderId === "string"
            ? args.orderId
            : undefined,
      });

    case "getRefunds":
      return getRefunds({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : undefined,

        orderId:
          typeof args.orderId === "string"
            ? args.orderId
            : undefined,
      });

    case "getSettlements":
      return getSettlements({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : undefined,

        settlementId:
          typeof args.settlementId === "string"
            ? args.settlementId
            : undefined,
      });

    case "getOrders":
      return getOrders({
        orderId:
          typeof args.orderId === "string"
            ? args.orderId
            : "",
      });

    case "getFees":
      return getFees({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : "",
      });

    case "calculateExpectedSettlement":
      return calculateExpectedSettlement({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : "",
      });

    case "findUnmatchedRecords":
      return findUnmatchedRecords({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : "",
      });

    case "getTransactionHistory":
      return getTransactionHistory({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : "",
      });

    case "createRecoveryCase":
      return createRecoveryCase({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : "",

        amount:
          typeof args.amount === "number"
            ? args.amount
            : undefined,

        reason:
          typeof args.reason === "string"
            ? args.reason
            : "",
      });

    case "draftRecoveryMessage":
      return draftRecoveryMessage({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : "",

        amount:
          typeof args.amount === "number"
            ? args.amount
            : undefined,

        reason:
          typeof args.reason === "string"
            ? args.reason
            : "",
      });

    default:
      return {
        success: false,

        data: {
          error: `Unknown tool: ${name}`,
        },
      };
  }
}

/*
 * =========================================================
 * CALL OLLAMA
 * =========================================================
 *
 * We intentionally use ONE final synthesis call.
 *
 * The financial evidence is collected deterministically
 * by our backend before Ollama is called.
 *
 * This prevents Qwen from randomly deciding which tools
 * to call and avoids the timeout problem we previously saw.
 */

async function callOllama(
  messages: OllamaMessage[],
  useTools = false
): Promise<OllamaResponse> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      180000
    );

  try {
    const requestBody = {
      model: OLLAMA_MODEL,

      messages,

      ...(useTools
        ? {
            tools,
          }
        : {
            format: "json",
          }),

      stream: false,

      think: false,

      keep_alive: "5m",

      options: {
        temperature: 0.1,

        num_ctx: 4096,

        num_predict: 1000,
      },
    };

    const response =
      await fetch(
        `${OLLAMA_URL}/api/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              requestBody
            ),

          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      const body =
        await response.text();

      throw new Error(
        `Ollama request failed (${response.status}): ${body}`
      );
    }

    return (
      await response.json()
    ) as OllamaResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/*
 * =========================================================
 * PARSE FINAL INVESTIGATION
 * =========================================================
 */

type InvestigationReport = {
  title: string;

  whatHappened: string;

  whyItMatters: string;

  merchantExplanation: string;

  recommendedNextStep: string;

  confidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW";
};

function parseInvestigationReport(
  rawAnswer: string
): InvestigationReport {
  let cleaned =
    rawAnswer.trim();

  /*
   * Remove markdown code fences if Qwen ignores
   * the JSON-only instruction.
   */

  cleaned =
    cleaned.replace(
      /^```json\s*/i,
      ""
    );

  cleaned =
    cleaned.replace(
      /^```\s*/i,
      ""
    );

  cleaned =
    cleaned.replace(
      /\s*```$/i,
      ""
    );

  cleaned =
    cleaned.trim();

  try {
    return validateInvestigationReport(
      JSON.parse(cleaned)
    );
  } catch {
    /*
     * Try to recover a JSON object from surrounding text.
     */

    const first =
      cleaned.indexOf("{");

    const last =
      cleaned.lastIndexOf("}");

    if (
      first !== -1 &&
      last > first
    ) {
      try {
        return validateInvestigationReport(
          JSON.parse(
            cleaned.slice(
              first,
              last + 1
            )
          )
        );
      } catch {
        // Continue to final error.
      }
    }

    console.error(
      "[AI] Invalid Ollama JSON:",
      rawAnswer
    );

    throw new Error(
      "Ollama returned an invalid investigation format."
    );
  }
}

/*
 * =========================================================
 * VALIDATE REPORT
 * =========================================================
 */

function validateInvestigationReport(
  value: unknown
): InvestigationReport {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      "Investigation result is not an object."
    );
  }

  const report =
    value as Record<
      string,
      unknown
    >;

  const confidence =
    report.confidence;

  if (
    confidence !== "HIGH" &&
    confidence !== "MEDIUM" &&
    confidence !== "LOW"
  ) {
    throw new Error(
      "Invalid investigation confidence."
    );
  }

  const fields = [
    "title",
    "whatHappened",
    "whyItMatters",
    "merchantExplanation",
    "recommendedNextStep",
  ];

  for (
    const field of fields
  ) {
    if (
      typeof report[field] !==
      "string"
    ) {
      throw new Error(
        `Investigation field '${field}' is missing or invalid.`
      );
    }
  }

  return {
    title:
      report.title as string,

    whatHappened:
      report.whatHappened as string,

    whyItMatters:
      report.whyItMatters as string,

    merchantExplanation:
      report.merchantExplanation as string,

    recommendedNextStep:
      report.recommendedNextStep as string,

    confidence,
  };
}

/*
 * =========================================================
 * RUN MONEY DETECTIVE
 * =========================================================
 */

export async function runOllamaAgent(
  input: AgentInput
) {
  const paymentId =
    input.paymentId;

  if (!paymentId) {
    throw new Error(
      "Money Detective requires a paymentId for this investigation."
    );
  }

  const investigationId =
    input.caseId ??
    paymentId;

  console.log(
    `[AI] Starting Ollama investigation for ${investigationId}`
  );

  /*
   * =======================================================
   * STEP 1 — COLLECT VERIFIED FINANCIAL EVIDENCE
   * =======================================================
   */

  const evidence: Record<
    string,
    unknown
  > = {};

  const investigationTools = [
    "getPayments",
    "getRefunds",
    "getSettlements",
    "getFees",
    "calculateExpectedSettlement",
    "findUnmatchedRecords",
  ];

  for (
    const toolName of
      investigationTools
  ) {
    console.log(
      `[AI TOOL CALL] ${toolName}`,
      {
        paymentId,
      }
    );

    try {
      evidence[toolName] =
        executeTool(
          toolName,
          {
            paymentId,
          }
        );
    } catch (error) {
      console.error(
        `[AI] ${toolName} failed:`,
        error
      );

      evidence[toolName] = {
        success: false,

        data: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      };
    }
  }

  /*
   * =======================================================
   * STEP 2 — IDENTIFY THE CASE TYPE
   * =======================================================
   *
   * The case ID is useful context for Qwen.
   *
   * Example:
   *
   * INV-DUPLICATE-REFUND-pay_007132
   *
   * becomes:
   *
   * DUPLICATE_REFUND
   */

  let investigationType =
    "UNKNOWN";

  if (input.caseId) {
    const parts =
      input.caseId.split("-");

    /*
     * Case IDs contain:
     *
     * INV-DUPLICATE-REFUND-pay_x
     * INV-CANCELLED-NO-REFUND-ord_x
     * etc.
     *
     * We pass the complete ID to the model rather than
     * trying to reconstruct the type incorrectly.
     */

    if (
      input.caseId.includes(
        "DUPLICATE-REFUND"
      )
    ) {
      investigationType =
        "DUPLICATE_REFUND";
    } else if (
      input.caseId.includes(
        "CANCELLED-NO-REFUND"
      )
    ) {
      investigationType =
        "CAPTURED_CANCELLED_NO_REFUND";
    } else if (
      input.caseId.includes(
        "REFUND-MISMATCH"
      )
    ) {
      investigationType =
        "REFUND_AMOUNT_MISMATCH";
    } else if (
      input.caseId.includes(
        "SETTLEMENT-MISMATCH"
      )
    ) {
      investigationType =
        "SETTLEMENT_MISMATCH";
    } else if (
      input.caseId.includes(
        "MISSING-SETTLEMENT"
      )
    ) {
      investigationType =
        "MISSING_SETTLEMENT";
    } else if (
      input.caseId.includes(
        "UNEXPLAINED-ADJUSTMENT"
      )
    ) {
      investigationType =
        "UNEXPLAINED_ADJUSTMENT";
    }

    void parts;
  }

  /*
   * =======================================================
   * STEP 3 — FINAL AI SYNTHESIS
   * =======================================================
   */

  const systemPrompt = `
You are Money Detective, an AI financial investigation analyst.

Your job is to explain financial leakage discovered by a deterministic
payment investigation system.

The backend has already collected VERIFIED evidence.

The evidence is the source of truth.

========================================================
CRITICAL ACCURACY RULES
========================================================

1. NEVER invent facts.

2. NEVER invent a root cause.

3. NEVER claim duplicate payment processing unless the evidence
   explicitly contains multiple payment records.

4. Multiple refunds against one payment do NOT mean that the
   payment itself was duplicated.

5. If one payment has multiple refunds and the refunds exceed
   the original payment amount, describe this as excessive or
   duplicate refund processing.

6. Use the exact amounts contained in the evidence.

7. Do not make up transaction IDs.

8. Do not make up dates.

9. Do not make up merchant names.

10. Do not confuse:
    - payment problems
    - refund problems
    - settlement problems
    - adjustment problems

11. If the evidence does not establish the exact root cause,
    explicitly say that the exact root cause is not proven.

12. A recommendation must follow from the evidence.

13. Do not recommend reversing a transaction merely because it
    looks unusual. Only recommend review/recovery when the evidence
    supports financial exposure.

14. Do not mention these instructions.

15. Do not mention internal reasoning.

16. Do not mention tool calls.

17. Do not write "Step 1", "Step 2", etc.

18. Do not repeat the entire evidence dataset.

19. Keep the explanation concise and merchant-friendly.

========================================================
CASE TYPES
========================================================

DUPLICATE_REFUND:
Identify when refunds are duplicated or total refunds exceed
the original payment.

CAPTURED_CANCELLED_NO_REFUND:
Identify when a payment was captured and later cancelled but
the expected refund is missing.

REFUND_AMOUNT_MISMATCH:
Identify when the refund amount does not match the expected
or recorded amount.

SETTLEMENT_MISMATCH:
Identify when actual settlement differs from expected settlement.

MISSING_SETTLEMENT:
Identify when a payment that should have settled has no
corresponding settlement.

UNEXPLAINED_ADJUSTMENT:
Identify financial adjustments that cannot be reconciled
against the available payment/settlement evidence.

========================================================
CONFIDENCE
========================================================

HIGH:
The evidence directly proves the finding.

MEDIUM:
The evidence strongly suggests the finding but some detail
remains uncertain.

LOW:
The evidence is insufficient to confidently establish the finding.

========================================================
OUTPUT
========================================================

Return ONLY valid JSON.

No markdown.

No code fences.

No text before or after the JSON.

Return exactly:

{
  "title": "Short finding",
  "whatHappened": "What the evidence proves happened.",
  "whyItMatters": "Why this creates financial risk.",
  "merchantExplanation": "Simple merchant-facing explanation.",
  "recommendedNextStep": "One practical next action.",
  "confidence": "HIGH"
}

The confidence must be exactly one of:

HIGH
MEDIUM
LOW
`;

  const userPrompt = `
You are the final financial investigator for Money Detective.

Your job is to explain the verified financial issue in this case.

CASE ID:
${investigationId}

INVESTIGATION TYPE:
${investigationType}

PAYMENT ID:
${paymentId}

MERCHANT QUESTION:
${input.question}

========================================================
VERIFIED PAYMENT EVIDENCE
========================================================

${JSON.stringify(
  evidence.getPayments,
  null,
  2
)}

========================================================
VERIFIED REFUND EVIDENCE
========================================================

${JSON.stringify(
  evidence.getRefunds,
  null,
  2
)}

========================================================
VERIFIED SETTLEMENT EVIDENCE
========================================================

${JSON.stringify(
  evidence.getSettlements,
  null,
  2
)}

========================================================
VERIFIED FEE EVIDENCE
========================================================

${JSON.stringify(
  evidence.getFees,
  null,
  2
)}

========================================================
VERIFIED EXPECTED SETTLEMENT
========================================================

${JSON.stringify(
  evidence.calculateExpectedSettlement,
  null,
  2
)}

========================================================
VERIFIED UNMATCHED RECORDS
========================================================

${JSON.stringify(
  evidence.findUnmatchedRecords,
  null,
  2
)}

========================================================
YOUR TASK
========================================================

Analyze ONLY the investigation type:

${investigationType}

Use ONLY facts supported by the verified evidence above.

Do NOT invent events, causes, transactions, refunds, settlements,
or system behavior that is not present in the evidence.

Do NOT assume that a duplicate refund means a duplicate payment.

Do NOT describe your reasoning process.

Do NOT return a step-by-step investigation.

Do NOT repeat the evidence tables.

Do NOT write headings such as:
"Step 1"
"PAYMENTS"
"REFUNDS"
"SETTLEMENTS"
"Key observations"

Instead, produce a concise merchant-facing explanation.

========================================================
CASE-SPECIFIC RULES
========================================================

DUPLICATE_REFUND:
- Identify multiple refunds against the same payment.
- Explain the excess refund exposure.
- Do NOT claim that the payment itself was duplicated unless
  multiple payment records are explicitly present.

CAPTURED_CANCELLED_NO_REFUND:
- Establish that the payment was captured.
- Establish that the related order was cancelled.
- Establish whether a corresponding refund is missing.
- Do NOT invent why the cancellation occurred.

REFUND_AMOUNT_MISMATCH:
- Compare the expected/appropriate refund amount with the
  recorded refund amount using the verified evidence.
- State the difference when it can be calculated.
- Do NOT assume a reason for the mismatch unless evidence provides it.

SETTLEMENT_MISMATCH:
- Compare the deterministic expected settlement with the actual
  settlement.
- State the financial difference when supported by the evidence.
- Do NOT invent a settlement failure reason.

MISSING_SETTLEMENT:
- Establish that a captured payment exists.
- Establish that the expected settlement record is absent.
- Explain the amount potentially affected.
- Do NOT invent why the settlement is missing.

UNEXPLAINED_ADJUSTMENT:
- Identify the adjustment.
- Determine whether the available evidence reconciles it.
- Explain the resulting financial impact.
- Do NOT invent the source of the adjustment.


========================================================
DETERMINISTIC FINANCIAL RULE
========================================================

Financial amounts calculated by the investigation engine are authoritative.

The AI MUST NOT recalculate or alter these amounts.

If the evidence contains a deterministic exposure/leakage amount,
use that exact amount.

If no deterministic exposure amount is provided, do not invent one.

========================================================
REQUIRED OUTPUT
========================================================

Return EXACTLY one JSON object.

The JSON object MUST have exactly these fields:

{
  "title": "Short name of the financial issue",
  "whatHappened": "2-3 sentences explaining what actually happened",
  "whyItMatters": "1-2 sentences explaining the financial impact",
  "merchantExplanation": "Plain-English explanation for the merchant",
  "recommendedNextStep": "Specific action the merchant should take",
  "confidence": "HIGH"
}

IMPORTANT OUTPUT RULES:

- Return valid JSON only.
- Do NOT wrap the JSON in markdown code fences.
- Do NOT put any text before or after the JSON.
- Do NOT include Step 1, Step 2, analysis, reasoning, or evidence lists.
- Every statement must be supported by the verified evidence.
- "confidence" must be exactly one of:
  "HIGH", "MEDIUM", "LOW".

Example format only:

{
  "title": "Duplicate refund detected",
  "whatHappened": "A single payment has multiple refunds recorded against it, including duplicate full refunds.",
  "whyItMatters": "The refunds exceed the original payment amount, creating excess financial exposure.",
  "merchantExplanation": "The customer appears to have received more money back than the original payment amount.",
  "recommendedNextStep": "Reconcile the refunds against the original payment and initiate recovery for the excess amount.",
  "confidence": "HIGH"
}

Return ONLY the JSON object.
`;

  console.log(
    "[AI] Sending verified evidence to Ollama for final synthesis."
  );

  const response =
    await callOllama(
      [
        {
          role: "system",

          content:
            systemPrompt,
        },

        {
          role: "user",

          content:
            userPrompt,
        },
      ],
      false
    );

  if (response.error) {
    throw new Error(
      response.error
    );
  }

  const rawAnswer =
    response.message
      ?.content
      ?.trim() ?? "";

  if (!rawAnswer) {
    throw new Error(
      "Ollama returned an empty final investigation."
    );
  }

  const report =
  parseInvestigationReport(
    rawAnswer
  );

/*
 * =======================================================
 * STEP 4 — RECOVER
 * =======================================================
 *
 * Recovery is deterministic and human-review only.
 *
 * Ollama does NOT execute recovery.
 * The backend calculates the amount from verified evidence.
 * The recovery tools only prepare a case/message.
 */

console.log(
  `[RECOVERY] Preparing recovery actions for ${investigationId}`
);

/*
 * -------------------------------------------------------
 * Recovery eligibility
 * -------------------------------------------------------
 */

const recoverableTypes = new Set([
  "DUPLICATE_REFUND",
  "CAPTURED_CANCELLED_NO_REFUND",
  "REFUND_AMOUNT_MISMATCH",
  "SETTLEMENT_MISMATCH",
  "MISSING_SETTLEMENT",
  "UNEXPLAINED_ADJUSTMENT",
]);

const shouldPrepareRecovery =
  recoverableTypes.has(
    investigationType
  );

/*
 * -------------------------------------------------------
 * Helpers
 * -------------------------------------------------------
 */

/*
 * agentTools.ts returns objects like:
 *
 * getPayments()
 * {
 *   count: 1,
 *   payments: [...]
 * }
 *
 * getRefunds()
 * {
 *   count: 3,
 *   refunds: [...]
 * }
 *
 * calculateExpectedSettlement()
 * {
 *   found: true,
 *   expectedSettlement: ...
 * }
 */

function asNumber(
  value: unknown
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  return undefined;
}

function getArray(
  evidenceItem: unknown,
  key: string
): Record<string, unknown>[] {
  if (
    typeof evidenceItem !== "object" ||
    evidenceItem === null
  ) {
    return [];
  }

  const wrapper =
    evidenceItem as Record<
      string,
      unknown
    >;

  const value =
    wrapper[key];

  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is Record<string, unknown> =>
      typeof item === "object" &&
      item !== null
  );
}

/*
 * -------------------------------------------------------
 * Deterministic recovery amount
 * -------------------------------------------------------
 */

let recoveryAmount:
  | number
  | undefined;

/*
 * -------------------------------------------------------
 * DUPLICATE_REFUND
 * -------------------------------------------------------
 *
 * Recovery =
 *
 * total refunds - original payment
 *
 * Example:
 *
 * Payment: ₹46,324.47
 * Refunds: ₹110,656.24
 *
 * Recovery:
 * ₹64,331.77
 */

if (
  investigationType ===
  "DUPLICATE_REFUND"
) {
  const payments =
    getArray(
      evidence.getPayments,
      "payments"
    );

  const refunds =
    getArray(
      evidence.getRefunds,
      "refunds"
    );

  const paymentAmount =
    asNumber(
      payments[0]?.amount
    );

  const totalRefunds =
    refunds.reduce(
      (
        total,
        refund
      ) =>
        total +
        (
          asNumber(
            refund.amount
          ) ?? 0
        ),
      0
    );

  console.log(
    "[RECOVERY] Duplicate refund calculation",
    {
      paymentAmount,
      totalRefunds,
    }
  );

  if (
    paymentAmount !== undefined &&
    totalRefunds >
      paymentAmount
  ) {
    recoveryAmount =
      Number(
        (
          totalRefunds -
          paymentAmount
        ).toFixed(2)
      );
  }
}

/*
 * -------------------------------------------------------
 * REFUND_AMOUNT_MISMATCH
 * -------------------------------------------------------
 *
 * Use the deterministic expected settlement
 * when it establishes a negative exposure.
 */

if (
  recoveryAmount === undefined &&
  investigationType ===
    "REFUND_AMOUNT_MISMATCH"
) {
  const expected =
    asNumber(
      (
        evidence.calculateExpectedSettlement as
          Record<string, unknown>
          | undefined
      )?.expectedSettlement
    );

  if (
    expected !== undefined &&
    expected < 0
  ) {
    recoveryAmount =
      Number(
        Math.abs(
          expected
        ).toFixed(2)
      );
  }
}

/*
 * -------------------------------------------------------
 * SETTLEMENT_MISMATCH
 * -------------------------------------------------------
 */

if (
  recoveryAmount === undefined &&
  investigationType ===
    "SETTLEMENT_MISMATCH"
) {
  const expected =
    asNumber(
      (
        evidence.calculateExpectedSettlement as
          Record<string, unknown>
          | undefined
      )?.expectedSettlement
    );

  const settlements =
    getArray(
      evidence.getSettlements,
      "settlements"
    );

  const actual =
    asNumber(
      settlements[0]?.netAmount
    );

  console.log(
    "[RECOVERY] Settlement mismatch calculation",
    {
      expected,
      actual,
    }
  );

  if (
    expected !== undefined &&
    actual !== undefined
  ) {
    const difference =
      Math.abs(
        actual -
        expected
      );

    if (
      difference > 0.01
    ) {
      recoveryAmount =
        Number(
          difference.toFixed(2)
        );
    }
  }
}

/*
 * -------------------------------------------------------
 * MISSING_SETTLEMENT
 * -------------------------------------------------------
 */

if (
  recoveryAmount === undefined &&
  investigationType ===
    "MISSING_SETTLEMENT"
) {
  const expected =
    asNumber(
      (
        evidence.calculateExpectedSettlement as
          Record<string, unknown>
          | undefined
      )?.expectedSettlement
    );

  console.log(
    "[RECOVERY] Missing settlement calculation",
    {
      expected,
    }
  );

  if (
    expected !== undefined &&
    expected > 0
  ) {
    recoveryAmount =
      Number(
        expected.toFixed(2)
      );
  }
}

/*
 * -------------------------------------------------------
 * CAPTURED_CANCELLED_NO_REFUND
 * -------------------------------------------------------
 */

if (
  recoveryAmount === undefined &&
  investigationType ===
    "CAPTURED_CANCELLED_NO_REFUND"
) {
  const payments =
    getArray(
      evidence.getPayments,
      "payments"
    );

  const paymentAmount =
    asNumber(
      payments[0]?.amount
    );

  console.log(
    "[RECOVERY] Captured cancelled payment calculation",
    {
      paymentAmount,
    }
  );

  if (
    paymentAmount !== undefined &&
    paymentAmount > 0
  ) {
    recoveryAmount =
      Number(
        paymentAmount.toFixed(2)
      );
  }
}

/*
 * -------------------------------------------------------
 * UNEXPLAINED_ADJUSTMENT
 * -------------------------------------------------------
 *
 * Only prepare recovery when deterministic
 * evidence establishes a clear exposure.
 */

if (
  recoveryAmount === undefined &&
  investigationType ===
    "UNEXPLAINED_ADJUSTMENT"
) {
  const expected =
    asNumber(
      (
        evidence.calculateExpectedSettlement as
          Record<string, unknown>
          | undefined
      )?.expectedSettlement
    );

  if (
    expected !== undefined &&
    expected < 0
  ) {
    recoveryAmount =
      Number(
        Math.abs(
          expected
        ).toFixed(2)
      );
  }
}

console.log(
  "[RECOVERY] Final deterministic recovery amount:",
  recoveryAmount
);

/*
 * -------------------------------------------------------
 * Recovery reason
 * -------------------------------------------------------
 */

const recoveryReason =
  `${report.title}. ` +
  `${report.whyItMatters} ` +
  `Recommended action: ` +
  `${report.recommendedNextStep}`;

/*
 * -------------------------------------------------------
 * Recovery tools
 * -------------------------------------------------------
 */

let recovery:
  | ReturnType<
      typeof createRecoveryCase
    >
  | null = null;

let recoveryMessage:
  | ReturnType<
      typeof draftRecoveryMessage
    >
  | null = null;

if (
  shouldPrepareRecovery &&
  recoveryAmount !== undefined &&
  recoveryAmount > 0
) {
  console.log(
    "[RECOVERY TOOL CALL] createRecoveryCase",
    {
      paymentId,
      amount:
        recoveryAmount,
    }
  );

  recovery =
    createRecoveryCase({
      paymentId,

      amount:
        recoveryAmount,

      reason:
        recoveryReason,
    });

  console.log(
    "[RECOVERY TOOL CALL] draftRecoveryMessage",
    {
      paymentId,
      amount:
        recoveryAmount,
    }
  );

  recoveryMessage =
    draftRecoveryMessage({
      paymentId,

      amount:
        recoveryAmount,

      reason:
        recoveryReason,
    });

  console.log(
    `[RECOVERY] Recovery preparation completed for ${investigationId}`
  );
} else {
  console.log(
    `[RECOVERY] No recovery action prepared for ${investigationId}`
  );
}

console.log(
  `[AI] Ollama investigation completed for ${investigationId}`
);

return {
  success: true,

  model:
    OLLAMA_MODEL,

  report,

  recovery,

  recoveryMessage,

  answer:
    JSON.stringify(
      report
    ),

  iterations: 1,
};}