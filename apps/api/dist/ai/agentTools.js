import { loadFinancialDataset, } from "../data/datasetLoader.js";
const dataset = loadFinancialDataset();
function success(tool, data) {
    return {
        tool,
        success: true,
        data,
    };
}
function failure(tool, message) {
    return {
        tool,
        success: false,
        data: {
            error: message,
        },
    };
}
/**
 * Retrieve payments using paymentId or orderId.
 */
export function getPayments(args) {
    let results = dataset.payments;
    if (args.paymentId) {
        results = results.filter(payment => payment.paymentId ===
            args.paymentId);
    }
    if (args.orderId) {
        results = results.filter(payment => payment.orderId ===
            args.orderId);
    }
    return success("getPayments", results);
}
/**
 * Retrieve refunds using paymentId or orderId.
 */
export function getRefunds(args) {
    let results = dataset.refunds;
    if (args.paymentId) {
        results = results.filter(refund => refund.paymentId ===
            args.paymentId);
    }
    if (args.orderId) {
        results = results.filter(refund => refund.orderId ===
            args.orderId);
    }
    return success("getRefunds", results);
}
/**
 * Retrieve settlements for a payment.
 */
export function getSettlements(args) {
    let results = dataset.settlements;
    if (args.paymentId) {
        results = results.filter(settlement => settlement.paymentId ===
            args.paymentId);
    }
    if (args.settlementId) {
        results = results.filter(settlement => settlement.settlementId ===
            args.settlementId);
    }
    return success("getSettlements", results);
}
/**
 * Retrieve an order.
 */
export function getOrders(args) {
    const results = dataset.orders.filter(order => order.orderId ===
        args.orderId);
    return success("getOrders", results);
}
/**
 * Retrieve fees associated with a payment.
 */
export function getFees(args) {
    const results = dataset.fees.filter(fee => fee.paymentId ===
        args.paymentId);
    return success("getFees", results);
}
/**
 * Calculate expected settlement.
 *
 * IMPORTANT:
 * Financial arithmetic remains deterministic.
 * The LLM does NOT calculate this itself.
 */
export function calculateExpectedSettlement(args) {
    const payment = dataset.payments.find(item => item.paymentId ===
        args.paymentId);
    if (!payment) {
        return failure("calculateExpectedSettlement", `Payment ${args.paymentId} not found.`);
    }
    const refunds = dataset.refunds
        .filter(refund => refund.paymentId ===
        args.paymentId)
        .reduce((sum, refund) => sum + refund.amount, 0);
    const fees = dataset.fees
        .filter(fee => fee.paymentId ===
        args.paymentId)
        .reduce((sum, fee) => sum +
        fee.amount +
        fee.tax, 0);
    const settlement = payment.amount -
        refunds -
        fees;
    return success("calculateExpectedSettlement", {
        paymentId: args.paymentId,
        paymentAmount: payment.amount,
        totalRefunds: refunds,
        totalFeesAndTaxes: fees,
        expectedSettlement: settlement,
        currency: payment.currency,
    });
}
/**
 * Find discrepancies between a payment
 * and its related financial records.
 */
export function findUnmatchedRecords(args) {
    const payment = dataset.payments.find(item => item.paymentId ===
        args.paymentId);
    if (!payment) {
        return failure("findUnmatchedRecords", `Payment ${args.paymentId} not found.`);
    }
    const refunds = dataset.refunds.filter(item => item.paymentId ===
        args.paymentId);
    const settlements = dataset.settlements.filter(item => item.paymentId ===
        args.paymentId);
    const fees = dataset.fees.filter(item => item.paymentId ===
        args.paymentId);
    const refundTotal = refunds.reduce((sum, item) => sum + item.amount, 0);
    const feeTotal = fees.reduce((sum, item) => sum +
        item.amount +
        item.tax, 0);
    const expectedSettlement = payment.amount -
        refundTotal -
        feeTotal;
    const unmatched = [];
    if (payment.status ===
        "captured" &&
        settlements.length === 0) {
        unmatched.push("Captured payment has no settlement record.");
    }
    if (refundTotal >
        payment.amount) {
        unmatched.push("Total refunds exceed the original payment.");
    }
    if (settlements.length > 0) {
        const actualSettlement = settlements.reduce((sum, settlement) => sum +
            settlement.netAmount, 0);
        if (Math.abs(actualSettlement -
            expectedSettlement) > 0.01) {
            unmatched.push("Actual settlement differs from expected settlement.");
        }
    }
    return success("findUnmatchedRecords", {
        payment,
        refunds,
        fees,
        settlements,
        expectedSettlement,
        unmatched,
    });
}
/**
 * Return the complete transaction history
 * around a payment.
 */
export function getTransactionHistory(args) {
    const payment = dataset.payments.find(item => item.paymentId ===
        args.paymentId);
    if (!payment) {
        return failure("getTransactionHistory", `Payment ${args.paymentId} not found.`);
    }
    const order = dataset.orders.find(item => item.orderId ===
        payment.orderId);
    const refunds = dataset.refunds.filter(item => item.paymentId ===
        args.paymentId);
    const fees = dataset.fees.filter(item => item.paymentId ===
        args.paymentId);
    const settlements = dataset.settlements.filter(item => item.paymentId ===
        args.paymentId);
    return success("getTransactionHistory", {
        order,
        payment,
        refunds,
        fees,
        settlements,
    });
}
/**
 * Proposed recovery case.
 *
 * This does NOT automatically change financial records.
 */
export function createRecoveryCase(args) {
    return success("createRecoveryCase", {
        caseId: `REC-${args.paymentId}`,
        paymentId: args.paymentId,
        reason: args.reason,
        amount: args.amount,
        status: "pending_human_review",
        message: "Recovery case prepared. Human approval is required before financial action.",
    });
}
/**
 * Prepare a finance-operations message.
 */
export function draftRecoveryMessage(args) {
    return success("draftRecoveryMessage", {
        subject: `Financial discrepancy requires review: ${args.paymentId}`,
        message: `Payment ${args.paymentId} has a potential financial discrepancy of ₹${args.amount.toFixed(2)}. Reason: ${args.reason}. Please review the linked transaction evidence and reconcile the amount before taking financial action.`,
    });
}
