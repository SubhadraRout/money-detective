import { getPayments, getRefunds, getSettlements, getOrders, getFees, calculateExpectedSettlement, findUnmatchedRecords, getTransactionHistory, createRecoveryCase, draftRecoveryMessage, } from "./agentTools.js";
const OLLAMA_URL = process.env.OLLAMA_URL ??
    "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ??
    "qwen3:4b";
const tools = [
    {
        type: "function",
        function: {
            name: "getPayments",
            description: "Retrieve payment records. Use this to inspect the original payment amount, status, order and payment details.",
            parameters: {
                type: "object",
                properties: {
                    paymentId: {
                        type: "string",
                        description: "Payment ID to retrieve.",
                    },
                    orderId: {
                        type: "string",
                        description: "Order ID to find associated payments.",
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
            description: "Retrieve refunds associated with a payment or order. Use this when investigating excessive, duplicate or mismatched refunds.",
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
            description: "Retrieve settlement records associated with a payment.",
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
            description: "Retrieve the order associated with an order ID.",
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
            description: "Retrieve processing, platform and other fees associated with a payment.",
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
            description: "Deterministically calculate the expected settlement amount using payment, refunds and fees. Always prefer this tool over doing financial arithmetic yourself.",
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
            description: "Find inconsistencies between a payment, refunds, fees and settlement records.",
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
            description: "Retrieve the complete transaction history around a payment, including order, payment, refunds, fees and settlements.",
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
            description: "Prepare a recovery case for human review. This does not execute a financial action.",
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
                    "amount",
                ],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "draftRecoveryMessage",
            description: "Draft a message for Finance or Payments Operations about a suspected financial discrepancy.",
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
                    "amount",
                ],
                additionalProperties: false,
            },
        },
    },
];
function executeTool(name, args) {
    switch (name) {
        case "getPayments":
            return getPayments({
                paymentId: typeof args.paymentId ===
                    "string"
                    ? args.paymentId
                    : undefined,
                orderId: typeof args.orderId ===
                    "string"
                    ? args.orderId
                    : undefined,
            });
        case "getRefunds":
            return getRefunds({
                paymentId: typeof args.paymentId ===
                    "string"
                    ? args.paymentId
                    : undefined,
                orderId: typeof args.orderId ===
                    "string"
                    ? args.orderId
                    : undefined,
            });
        case "getSettlements":
            return getSettlements({
                paymentId: typeof args.paymentId ===
                    "string"
                    ? args.paymentId
                    : undefined,
                settlementId: typeof args.settlementId ===
                    "string"
                    ? args.settlementId
                    : undefined,
            });
        case "getOrders":
            return getOrders({
                orderId: String(args.orderId),
            });
        case "getFees":
            return getFees({
                paymentId: String(args.paymentId),
            });
        case "calculateExpectedSettlement":
            return calculateExpectedSettlement({
                paymentId: String(args.paymentId),
            });
        case "findUnmatchedRecords":
            return findUnmatchedRecords({
                paymentId: String(args.paymentId),
            });
        case "getTransactionHistory":
            return getTransactionHistory({
                paymentId: String(args.paymentId),
            });
        case "createRecoveryCase":
            return createRecoveryCase({
                paymentId: String(args.paymentId),
                reason: String(args.reason),
                amount: Number(args.amount),
            });
        case "draftRecoveryMessage":
            return draftRecoveryMessage({
                paymentId: String(args.paymentId),
                reason: String(args.reason),
                amount: Number(args.amount),
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
async function callOllama(messages) {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages,
            tools,
            stream: false,
            // Qwen3 supports thinking,
            // but we don't need hidden reasoning
            // for this operational MVP.
            think: false,
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama request failed (${response.status}): ${body}`);
    }
    return response.json();
}
export async function runOllamaAgent(input) {
    const systemPrompt = `
You are Money Detective, an AI financial investigation agent.

Your job is to investigate payment leakage using the available financial tools.

IMPORTANT RULES:

1. Never invent financial records.
2. Never invent payment amounts, refunds, settlements or fees.
3. Use the tools to retrieve evidence.
4. Financial arithmetic must come from deterministic tools whenever possible.
5. Do not assume a root cause before examining the evidence.
6. Follow the evidence across payments, refunds, fees and settlements.
7. Clearly distinguish facts from conclusions.
8. If evidence is insufficient, say so.
9. Recovery actions must remain pending human review.
10. Never claim that money was recovered merely because a recovery case was created.

Your investigation should generally follow this reasoning pattern:

payment
  ↓
refunds
  ↓
fees
  ↓
settlement
  ↓
expected settlement
  ↓
unmatched records
  ↓
transaction history
  ↓
root cause

When appropriate, prepare a recovery case and draft a recovery message, but never execute a financial transaction.

Return a concise investigation suitable for a Finance / Payments Operations user.

Your final answer should contain:

- Finding
- Evidence
- Why it matters
- Recommended next step
- Confidence

Do not expose internal chain-of-thought.
`;
    const contextText = input.context !== undefined
        ? JSON.stringify(input.context)
        : "No additional context provided.";
    const userPrompt = `
Investigate this Money Detective case.

Case ID: ${input.caseId ?? "Not provided"}
Payment ID: ${paymentId}
Order ID: ${input.orderId ?? "Not provided"}

Investigation question:
${input.question}

Here are the VERIFIED financial investigation results:

PAYMENTS:
${JSON.stringify(evidence.getPayments)}

REFUNDS:
${JSON.stringify(evidence.getRefunds)}

SETTLEMENTS:
${JSON.stringify(evidence.getSettlements)}

FEES:
${JSON.stringify(evidence.getFees)}

EXPECTED SETTLEMENT:
${JSON.stringify(evidence.calculateExpectedSettlement)}

UNMATCHED RECORDS:
${JSON.stringify(evidence.findUnmatchedRecords)}

Analyze these results and give a concise merchant-facing investigation.

You MUST include:

1. Finding
2. What happened
3. Financial impact
4. Evidence
5. Confidence
6. Recommended next step

Important:
- Do not claim duplicate payment unless the payment records prove multiple captured payments.
- If refunds exceed the payment, identify duplicate/excessive refund processing.
- Use the exact amounts from the evidence.
- Do not invent facts.
- Keep the answer under 150 words.
Do not repeat the raw evidence unnecessarily.
Go directly to the finding and conclusion.`;
    const messages = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: userPrompt,
        },
    ];
    const maxIterations = 8;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const response = await callOllama(messages);
        if (response.error) {
            throw new Error(response.error);
        }
        const assistantMessage = response.message;
        messages.push(assistantMessage);
        const toolCalls = assistantMessage.tool_calls ??
            [];
        if (toolCalls.length === 0) {
            return {
                success: true,
                model: OLLAMA_MODEL,
                answer: assistantMessage.content ??
                    "",
                iterations: iteration + 1,
            };
        }
        for (const toolCall of toolCalls) {
            const name = toolCall.function.name;
            const args = toolCall.function
                .arguments ?? {};
            let result;
            try {
                result =
                    executeTool(name, args);
            }
            catch (error) {
                result = {
                    tool: name,
                    success: false,
                    data: {
                        error: error instanceof Error
                            ? error.message
                            : String(error),
                    },
                };
            }
            messages.push({
                role: "tool",
                content: JSON.stringify(result),
            });
        }
    }
    throw new Error(`AI investigation exceeded the maximum of ${maxIterations} tool iterations.`);
}
