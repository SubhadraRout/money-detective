import fs from "node:fs";
import path from "node:path";
import { verifyRecoveryPlans, } from "./recoveryVerification.js";
const dataRoot = path.resolve(process.cwd(), "../data");
const recoveryPlansPath = path.join(dataRoot, "investigations", "recovery-action-plans.json");
const outputPath = path.join(dataRoot, "investigations", "recovery-verification.json");
function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
function money(value) {
    return `₹${value.toFixed(2)}`;
}
const recoveryFile = loadJson(recoveryPlansPath);
const verifications = verifyRecoveryPlans(recoveryFile.plans);
const totalPotentialRecovery = verifications.reduce((sum, item) => sum +
    item.financialImpact
        .potentialRecovery, 0);
const totalVerifiedRecovery = verifications.reduce((sum, item) => sum +
    item.financialImpact
        .verifiedRecovery, 0);
const totalRemainingExposure = verifications.reduce((sum, item) => sum +
    item.financialImpact
        .remainingExposure, 0);
const recovered = verifications.filter((item) => item.verificationStatus ===
    "recovered").length;
const partiallyRecovered = verifications.filter((item) => item.verificationStatus ===
    "partially_recovered").length;
const notRecovered = verifications.filter((item) => item.verificationStatus ===
    "not_recovered").length;
const pending = verifications.filter((item) => item.verificationStatus ===
    "pending").length;
const output = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    summary: {
        totalCases: verifications.length,
        totalPotentialRecovery,
        totalVerifiedRecovery,
        totalRemainingExposure,
        recovered,
        partiallyRecovered,
        notRecovered,
        pending,
    },
    verifications,
};
fs.mkdirSync(path.dirname(outputPath), {
    recursive: true,
});
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
console.log("");
console.log("========================================");
console.log("     MONEY DETECTIVE RECOVERY VERIFY");
console.log("========================================");
console.log("");
console.log(`Recovery plans:       ${verifications.length}`);
console.log(`Potential recovery:   ${money(totalPotentialRecovery)}`);
console.log(`Verified recovery:    ${money(totalVerifiedRecovery)}`);
console.log(`Remaining exposure:   ${money(totalRemainingExposure)}`);
console.log("");
console.log("VERIFICATION STATUS");
console.log("----------------------------------------");
console.log(`Recovered:            ${recovered}`);
console.log(`Partially recovered:  ${partiallyRecovered}`);
console.log(`Not recovered:        ${notRecovered}`);
console.log(`Pending:              ${pending}`);
console.log("");
if (verifications.length > 0) {
    const sample = verifications[0];
    console.log("SAMPLE VERIFICATION");
    console.log("----------------------------------------");
    console.log(`Case: ${sample.caseId}`);
    console.log(`Status: ${sample.verificationStatus}`);
    console.log(`Potential recovery: ${money(sample.financialImpact
        .potentialRecovery)}`);
    console.log(`Verified recovery: ${money(sample.financialImpact
        .verifiedRecovery)}`);
    console.log(`Remaining exposure: ${money(sample.financialImpact
        .remainingExposure)}`);
    console.log("");
    console.log("RESULT");
    console.log(sample.verificationResult);
}
console.log("");
console.log(`Verification results written to: ${outputPath}`);
console.log("");
console.log("Recovery verification complete.");
