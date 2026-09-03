import { loadFinancialDataset } from "../data/datasetLoader.js";

const dataset = loadFinancialDataset();

function findPayment(paymentId: string) {
  return dataset.payments.find(
    (payment) => payment.paymentId === paymentId
  );
}

function findOrder(orderId: string) {
  return dataset.orders.find(
    (order) => order.orderId === orderId
  );
}

function getRefundsForPayment(paymentId: string) {
  return dataset.refunds.filter(
    (refund) => refund.paymentId === paymentId
  );
}

function getFeesForPayment(paymentId: string) {
  return dataset.fees.filter(
    (fee) => fee.paymentId === paymentId
  );
}

function getSettlementForPayment(paymentId: string) {
  return dataset.settlements.find(
    (settlement) =>
      settlement.paymentId === paymentId
  );
}

/*
|--------------------------------------------------------------------------
| Financial tools
|--------------------------------------------------------------------------
*/

export function getPayments({
  paymentId,
  orderId,
}: {
  paymentId?: string;
  orderId?: string;
} = {}) {
  let payments = dataset.payments;

  if (paymentId) {
    payments = payments.filter(
      (payment) =>
        payment.paymentId === paymentId
    );
  }

  if (orderId) {
    payments = payments.filter(
      (payment) =>
        payment.orderId === orderId
    );
  }

  return {
    count: payments.length,
    payments,
  };
}

export function getOrders({
  orderId,
}: {
  orderId?: string;
} = {}) {
  let orders = dataset.orders;

  if (orderId) {
    orders = orders.filter(
      (order) =>
        order.orderId === orderId
    );
  }

  return {
    count: orders.length,
    orders,
  };
}

export function getRefunds({
  paymentId,
  orderId,
}: {
  paymentId?: string;
  orderId?: string;
} = {}) {
  let refunds = dataset.refunds;

  if (paymentId) {
    refunds = refunds.filter(
      (refund) =>
        refund.paymentId === paymentId
    );
  }

  if (orderId) {
    const paymentIds =
      dataset.payments
        .filter(
          (payment) =>
            payment.orderId === orderId
        )
        .map(
          (payment) =>
            payment.paymentId
        );

    refunds = refunds.filter(
      (refund) =>
        paymentIds.includes(
          refund.paymentId
        )
    );
  }

  return {
    count: refunds.length,
    refunds,
  };
}

export function getFees({
  paymentId,
}: {
  paymentId?: string;
}) {
  const fees = paymentId
    ? dataset.fees.filter(
        (fee) =>
          fee.paymentId === paymentId
      )
    : dataset.fees;

  return {
    count: fees.length,
    fees,
  };
}

export function getSettlements({
  paymentId,
  settlementId,
}: {
  paymentId?: string;
  settlementId?: string;
} = {}) {
  let settlements =
    dataset.settlements;

  if (paymentId) {
    settlements = settlements.filter(
      (settlement) =>
        settlement.paymentId ===
        paymentId
    );
  }

  if (settlementId) {
    settlements = settlements.filter(
      (settlement) =>
        settlement.settlementId ===
        settlementId
    );
  }

  return {
    count: settlements.length,
    settlements,
  };
}

export function getBankTransactions() {
  /*
   * This MVP dataset does not currently expose
   * a separate bankTransactions collection.
   *
   * Return an explicit unavailable result rather
   * than inventing bank data.
   */
  return {
    available: false,
    reason:
      "No separate bank transaction dataset is configured in this MVP."
  };
}

export function calculateExpectedSettlement({
  paymentId,
}: {
  paymentId: string;
})  {
  const payment = findPayment(paymentId);

  if (!payment) {
    return {
      found: false,
      paymentId
    };
  }

  const refunds =
    getRefundsForPayment(paymentId);

  const fees =
    getFeesForPayment(paymentId);

  const settlement =
    getSettlementForPayment(paymentId);

  const refundAmount = refunds.reduce(
    (sum, refund) =>
      sum + refund.amount,
    0
  );

  const feeAmount = fees.reduce(
    (sum, fee) =>
      sum + fee.amount,
    0
  );

  const taxAmount = fees.reduce(
    (sum, fee) =>
      sum + fee.tax,
    0
  );

  const adjustments =
    settlement?.adjustments ?? 0;

  const expected =
    payment.amount -
    refundAmount -
    feeAmount -
    taxAmount +
    adjustments;

  return {
    found: true,
    paymentId,
    paymentAmount: payment.amount,
    refundAmount,
    feeAmount,
    taxAmount,
    adjustments,
    expectedSettlement: Number(
      expected.toFixed(2)
    )
  };
}

export function findUnmatchedRecords({
  paymentId,
}: {
  paymentId?: string;
} = {}) {
  const payments = paymentId
    ? dataset.payments.filter(
        (payment) =>
          payment.paymentId === paymentId
      )
    : dataset.payments;

  const unmatched = payments.filter(
    (payment) => {
      const settlement =
        getSettlementForPayment(
          payment.paymentId
        );

      return (
        payment.status === "captured" &&
        !settlement
      );
    }
  );

  return {
    count: unmatched.length,
    records: unmatched.map(
      (payment) => ({
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        reason:
          "Captured payment has no linked settlement."
      })
    )
  };
}

export function getTransactionHistory({
  paymentId,
}: {
  paymentId: string;
}) {
  const payment =
    findPayment(paymentId);

  if (!payment) {
    return {
      found: false,
      paymentId
    };
  }

  const order =
    findOrder(payment.orderId);

  const refunds =
    getRefundsForPayment(paymentId);

  const fees =
    getFeesForPayment(paymentId);

  const settlement =
    getSettlementForPayment(paymentId);

  return {
    found: true,
    payment,
    order,
    refunds,
    fees,
    settlement
  };
}

export function createRecoveryCase({
  paymentId,
  amount,
  reason,
}: {
  paymentId: string;
  amount?: number;
  reason: string;
}) {
  return {
    created: true,
    paymentId,
    amount,
    status: "PENDING_HUMAN_REVIEW",
    reason,
    action:
      "Finance team should review the evidence before taking recovery action.",
  };
}

export function draftRecoveryMessage({
  paymentId,
  amount,
  reason,
}: {
  paymentId: string;
  amount?: number;
  reason: string;
}) {
  return {
    paymentId,
    amount,
    draft:
      `A potential financial discrepancy was identified for payment ${paymentId}. ` +
      `${reason} ` +
      `Please review the linked payment, refund, settlement and fee records ` +
      `before taking any corrective action.`,
    requiresHumanReview: true,
  };
}

export function approveRecoveryCase({
  paymentId,
}: {
  paymentId: string;
}) {
  return {
    success: true,
    paymentId,
    recoveryStatus: "approved",
    recoveryAction: "initiated",
    verificationStatus: "pending",
    approvedBy: "human",
    approvedAt: new Date().toISOString(),
    message:
      "Recovery approved by human reviewer. Recovery action can now be initiated and verified.",
  };
}

export function rejectRecoveryCase({
  paymentId,
  reason,
}: {
  paymentId: string;
  reason?: string;
}) {
  return {
    success: true,
    paymentId,
    recoveryStatus: "rejected",
    recoveryAction: "not_initiated",
    verificationStatus: "not_applicable",
    rejectedBy: "human",
    rejectedAt: new Date().toISOString(),
    reason:
      reason ||
      "Recovery recommendation rejected by human reviewer.",
  };
}
/*
|--------------------------------------------------------------------------
| Tool registry
|--------------------------------------------------------------------------
*/

export const toolHandlers = {
  getPayments,
  getOrders,
  getRefunds,
  getSettlements,
  getBankTransactions,
  calculateExpectedSettlement,
  findUnmatchedRecords,
  getTransactionHistory,
  createRecoveryCase,
  draftRecoveryMessage,
  approveRecoveryCase,
  rejectRecoveryCase
};

export const ollamaTools = [
  {
    type: "function",
    function: {
      name: "getPayments",
      description:
        "Retrieve payment records. Use paymentId when investigating a specific payment.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description:
              "Optional payment ID."
          }
        }
      }
    }
  },

  {
    type: "function",
    function: {
      name: "getOrders",
      description:
        "Retrieve order records. Use orderId when investigating a specific order.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description:
              "Optional order ID."
          }
        }
      }
    }
  },

  {
    type: "function",
    function: {
      name: "getRefunds",
      description:
        "Retrieve refunds linked to a payment.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description:
              "Payment ID."
          }
        }
      }
    }
  },

  {
    type: "function",
    function: {
      name: "getSettlements",
      description:
        "Retrieve settlement records linked to a payment.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description:
              "Payment ID."
          }
        }
      }
    }
  },

  {
    type: "function",
    function: {
      name: "getBankTransactions",
      description:
        "Check whether bank transaction data is available.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },

  {
    type: "function",
    function: {
      name: "calculateExpectedSettlement",
      description:
        "Calculate expected settlement deterministically from payment, refunds, fees, taxes and adjustments.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description:
              "Payment ID."
          }
        },
        required: ["paymentId"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "findUnmatchedRecords",
      description:
        "Find captured payments without linked settlements.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description:
              "Optional payment ID."
          }
        }
      }
    }
  },

  {
    type: "function",
    function: {
      name: "getTransactionHistory",
      description:
        "Retrieve the complete financial history for a payment.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description:
              "Payment ID."
          }
        },
        required: ["paymentId"]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "createRecoveryCase",
      description:
        "Create a human-review recovery recommendation. Never moves money.",
      parameters: {
        type: "object",
        properties: {
          caseId: {
            type: "string"
          },
          reason: {
            type: "string"
          }
        },
        required: [
          "caseId",
          "reason"
        ]
      }
    }
  },

  {
    type: "function",
    function: {
      name: "draftRecoveryMessage",
      description:
        "Draft a recovery/reconciliation message for human review.",
      parameters: {
        type: "object",
        properties: {
          caseId: {
            type: "string"
          },
          reason: {
            type: "string"
          }
        },
        required: [
          "caseId",
          "reason"
        ]
      }
    }
  }
] as const;