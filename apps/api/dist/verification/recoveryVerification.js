function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
/**
 * Deterministic demo verification.
 *
 * The MVP uses synthetic recovery outcomes so that the dashboard
 * demonstrates the complete lifecycle:
 *
 * detected → explained → recovery recommended → verification
 *
 * No real financial transaction is executed.
 *
 * The outcome is derived from the caseId so the same case always
 * produces the same verification result.
 */
function getDemoOutcome(caseId) {
    let hash = 0;
    for (let i = 0; i < caseId.length; i++) {
        hash =
            (hash * 31 + caseId.charCodeAt(i)) >>> 0;
    }
    const bucket = hash % 100;
    if (bucket < 50) {
        return {
            status: "recovered",
            recoveryRatio: 1,
        };
    }
    if (bucket < 70) {
        return {
            status: "partially_recovered",
            recoveryRatio: 0.5,
        };
    }
    if (bucket < 90) {
        return {
            status: "pending",
            recoveryRatio: 0,
        };
    }
    return {
        status: "not_recovered",
        recoveryRatio: 0,
    };
}
/**
 * Verify one synthetic recovery plan.
 */
export function verifyRecoveryPlan(plan) {
    const potentialRecovery = roundMoney(plan.financialImpact.potentialRecovery);
    const outcome = getDemoOutcome(plan.caseId);
    const verifiedRecovery = roundMoney(potentialRecovery *
        outcome.recoveryRatio);
    const remainingExposure = roundMoney(Math.max(0, potentialRecovery -
        verifiedRecovery));
    let verificationResult;
    switch (outcome.status) {
        case "recovered":
            verificationResult =
                `The full potential recovery of ₹${verifiedRecovery.toFixed(2)} was reconciled. No remaining financial exposure was identified.`;
            break;
        case "partially_recovered":
            verificationResult =
                `₹${verifiedRecovery.toFixed(2)} of the ₹${potentialRecovery.toFixed(2)} potential recovery was reconciled. ₹${remainingExposure.toFixed(2)} remains exposed and requires follow-up.`;
            break;
        case "pending":
            verificationResult =
                `Recovery has not yet been verified. The full potential exposure of ₹${potentialRecovery.toFixed(2)} remains pending human review.`;
            break;
        case "not_recovered":
            verificationResult =
                `No recovery was verified. The full potential exposure of ₹${potentialRecovery.toFixed(2)} remains unresolved.`;
            break;
    }
    return {
        caseId: plan.caseId,
        verificationStatus: outcome.status,
        financialImpact: {
            potentialRecovery,
            verifiedRecovery,
            remainingExposure,
            currency: "INR",
        },
        verificationCriteria: plan.verification.criteria,
        verificationResult,
        verifiedAt: new Date().toISOString(),
    };
}
export function verifyRecoveryPlans(plans) {
    return plans.map(verifyRecoveryPlan);
}
