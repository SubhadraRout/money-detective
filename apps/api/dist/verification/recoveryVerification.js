function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
/**
 * Deterministic demo verification.
 *
 * In the MVP, every generated recovery plan represents a
 * successfully reconciled synthetic leakage case.
 *
 * This does NOT move real money.
 * It only demonstrates the verification stage of the
 * Money Detective investigation lifecycle.
 */
export function verifyRecoveryPlan(plan) {
    const potentialRecovery = roundMoney(plan.financialImpact.potentialRecovery);
    const verifiedRecovery = potentialRecovery;
    const remainingExposure = roundMoney(Math.max(0, potentialRecovery -
        verifiedRecovery));
    let verificationStatus;
    if (verifiedRecovery === 0) {
        verificationStatus =
            "not_recovered";
    }
    else if (verifiedRecovery <
        potentialRecovery) {
        verificationStatus =
            "partially_recovered";
    }
    else {
        verificationStatus =
            "recovered";
    }
    let verificationResult;
    switch (verificationStatus) {
        case "recovered":
            verificationResult =
                `The full potential recovery of ₹${verifiedRecovery.toFixed(2)} was reconciled. No remaining financial exposure was identified.`;
            break;
        case "partially_recovered":
            verificationResult =
                `₹${verifiedRecovery.toFixed(2)} was reconciled, leaving ₹${remainingExposure.toFixed(2)} of potential exposure requiring follow-up.`;
            break;
        case "not_recovered":
            verificationResult =
                `No recovery was verified. The full potential exposure of ₹${potentialRecovery.toFixed(2)} remains unresolved.`;
            break;
        default:
            verificationResult =
                "Recovery verification is pending.";
    }
    return {
        caseId: plan.caseId,
        verificationStatus,
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
