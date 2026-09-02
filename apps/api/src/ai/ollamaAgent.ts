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
 * ---------------------------------------------------------
 * OLLAMA TOOL DEFINITIONS
 * ---------------------------------------------------------
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
 * ---------------------------------------------------------
 * EXECUTE INVESTIGATION TOOL
 * ---------------------------------------------------------
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
            : undefined,
      });

    case "getFees":
      return getFees({
        paymentId:
          typeof args.paymentId === "string"
            ? args.paymentId
            : undefined,
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
        tool: name,
        success: false,
        data: {
          error: `Unknown tool: ${name}`,
        },
      };
  }
}

/*
 * ---------------------------------------------------------
 * CALL OLLAMA
 * ---------------------------------------------------------
 *
 * Important:
 *
 * - stream:false
 * - think:false
 * - final synthesis uses JSON mode
 * - generous timeout for local Qwen
 *
 * The previous version had keep_alive/options outside
 * JSON.stringify(), which was incorrect.
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
        ? { tools }
        : {
            format: "json",
          }),

      stream: false,

      think: false,

      keep_alive: "5m",

      options: {
        temperature: 0.1,
        num_ctx: 4096,
        num_predict: 700,
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
 * ---------------------------------------------------------
 * CLEAN MODEL JSON
 * ---------------------------------------------------------
 */

function parseInvestigationReport(
  rawAnswer: string
) {
  const cleaned =
    rawAnswer
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  try {
    return JSON.parse(
      cleaned
    ) as {
      title: string;
      whatHappened: string;
      whyItMatters: string;
      merchantExplanation: string;
      recommendedNextStep: string;
      confidence: string;
    };
  } catch {
    /*
     * Qwen sometimes returns extra text despite JSON mode.
     *
     * Try to recover the first complete JSON object.
     */

    const first =
      cleaned.indexOf("{");

    const last =
      cleaned.lastIndexOf("}");

    if (
      first !== -1 &&
      last > first
    ) {
      const possibleJson =
        cleaned.slice(
          first,
          last + 1
        );

      try {
        return JSON.parse(
          possibleJson
        ) as {
          title: string;
          whatHappened: string;
          whyItMatters: string;
          merchantExplanation: string;
          recommendedNextStep: string;
          confidence: string;
        };
      } catch {
        // Fall through.
      }
    }

    console.error(
      "[AI] Ollama returned invalid JSON:",
      rawAnswer
    );

    throw new Error(
      "Ollama returned an invalid investigation format."
    );
  }
}

/*
 * ---------------------------------------------------------
 * RUN MONEY DETECTIVE INVESTIGATION
 * ---------------------------------------------------------
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

  console.log(
    `[AI] Starting Ollama investigation for ${
      input.caseId ??
      paymentId
    }`
  );

  /*
   * -------------------------------------------------------
   * STEP 1
   *
   * Deterministically collect all important evidence.
   * -------------------------------------------------------
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
   * -------------------------------------------------------
   * STEP 2
   *
   * Send verified evidence to Qwen for synthesis.
   * -------------------------------------------------------
   */

  const systemPrompt = `
You are Money Detective, a financial investigation analyst.

You analyze VERIFIED financial evidence collected by deterministic tools.

The evidence is the source of truth.

STRICT RULES:

1. Never invent facts.
2. Never claim a duplicate payment unless multiple captured payment records are explicitly present.
3. If one payment has multiple refunds and the refund total exceeds the payment amount, identify excessive or duplicate refund processing.
4. Do not confuse refund discrepancies with settlement discrepancies.
5. Use the exact amounts from the evidence.
6. Prefer deterministic tool calculations over your own calculations.
7. Clearly distinguish confirmed evidence from inference.
8. Never say that a tool was used.
9. Never describe your internal reasoning.
10. Never write "Step 1", "Step 2", etc.
11. Never repeat the entire evidence.
12. Never recommend reversing a legitimate transaction without evidence.
13. Keep the response concise and merchant-friendly.

IMPORTANT:
There is only a duplicate PAYMENT if the payment evidence contains multiple captured payment records.

Multiple refunds against one payment are NOT evidence of duplicate payment.

Return ONLY valid JSON.

Do not use markdown.
Do not use code fences.
Do not add text before or after the JSON.

The JSON MUST have exactly these fields:

{
  "title": "Short finding",
  "whatHappened": "Concise explanation of what happened.",
  "whyItMatters": "Concise explanation of why this matters.",
  "merchantExplanation": "Simple merchant-facing explanation.",
  "recommendedNextStep": "One clear next action.",
  "confidence": "HIGH"
}

The confidence value must be one of:
"HIGH"
"MEDIUM"
"LOW"
`;

  const userPrompt = `
Investigate this Money Detective case.

CASE ID:
${input.caseId ?? "unknown"}

PAYMENT ID:
${paymentId}

QUESTION:
${input.question}

VERIFIED PAYMENT EVIDENCE:
${JSON.stringify(
  evidence.getPayments,
  null,
  2
)}

VERIFIED REFUND EVIDENCE:
${JSON.stringify(
  evidence.getRefunds,
  null,
  2
)}

VERIFIED SETTLEMENT EVIDENCE:
${JSON.stringify(
  evidence.getSettlements,
  null,
  2
)}

VERIFIED FEE EVIDENCE:
${JSON.stringify(
  evidence.getFees,
  null,
  2
)}

VERIFIED EXPECTED SETTLEMENT:
${JSON.stringify(
  evidence.calculateExpectedSettlement,
  null,
  2
)}

VERIFIED UNMATCHED RECORDS:
${JSON.stringify(
  evidence.findUnmatchedRecords,
  null,
  2
)}

ANALYSIS REQUIREMENTS:

- Determine what actually happened.
- Identify the financial risk.
- Use exact amounts.
- If refunds exceed the payment amount, clearly identify excessive/duplicate refunds.
- Do NOT call this a duplicate payment unless multiple captured payment records are explicitly shown.
- Do NOT invent a root cause that is not supported by evidence.
- Give the merchant one practical next step.

Return ONLY the JSON object.
`;

  const messages: OllamaMessage[] = [
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
  ];

  console.log(
    "[AI] Sending verified evidence to Ollama for final synthesis."
  );

  /*
   * No tools during final synthesis.
   */

  const response =
    await callOllama(
      messages,
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
   * Validate required fields.
   */

  if (
    typeof report.title !==
      "string" ||
    typeof report.whatHappened !==
      "string" ||
    typeof report.whyItMatters !==
      "string" ||
    typeof report.merchantExplanation !==
      "string" ||
    typeof report.recommendedNextStep !==
      "string" ||
    typeof report.confidence !==
      "string"
  ) {
    console.error(
      "[AI] Invalid investigation structure:",
      report
    );

    throw new Error(
      "Ollama returned an incomplete investigation."
    );
  }

  console.log(
    `[AI] Ollama investigation completed for ${
      input.caseId ??
      paymentId
    }`
  );

  return {
    success: true,

    model:
      OLLAMA_MODEL,

    report,

    answer:
      JSON.stringify(
        report
      ),

    iterations: 1,
  };
}