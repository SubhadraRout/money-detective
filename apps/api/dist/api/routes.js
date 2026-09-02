import { Router, } from "express";
import { getInvestigationCases, getEvidenceGraphs, getAIReports, getRecoveryPlans, getRecoveryVerification, } from "./artifactStore.js";
const router = Router();
router.get("/dashboard", (_req, res) => {
    const cases = getInvestigationCases();
    const recoveryPlans = getRecoveryPlans();
    const verification = getRecoveryVerification();
    const totalLeakage = cases.reduce((sum, item) => sum +
        item.financialImpact
            .potentialLeakage, 0);
    const totalRecovery = recoveryPlans.reduce((sum, item) => sum +
        item.financialImpact
            .potentialRecovery, 0);
    const criticalCases = cases.filter((item) => item.severity ===
        "critical").length;
    const highCases = cases.filter((item) => item.severity ===
        "high").length;
    const humanReview = recoveryPlans.filter((item) => item.humanReview.required).length;
    const recovered = verification.reduce((sum, item) => sum +
        item.verifiedRecovery, 0);
    res.json({
        totalCases: cases.length,
        totalLeakage,
        totalPotentialRecovery: totalRecovery,
        criticalCases,
        highCases,
        humanReviewRequired: humanReview,
        verifiedRecovery: recovered,
    });
});
router.get("/cases", (req, res) => {
    const cases = getInvestigationCases();
    const severity = typeof req.query.severity ===
        "string"
        ? req.query.severity
        : undefined;
    const type = typeof req.query.type ===
        "string"
        ? req.query.type
        : undefined;
    const filtered = cases.filter((item) => (!severity ||
        item.severity ===
            severity) &&
        (!type ||
            item.type === type));
    res.json({
        total: filtered.length,
        cases: filtered,
    });
});
router.get("/cases/:caseId", (req, res) => {
    const caseId = req.params.caseId;
    const investigationCase = getInvestigationCases()
        .find((item) => item.caseId ===
        caseId);
    if (!investigationCase) {
        res.status(404).json({
            error: "Investigation case not found",
        });
        return;
    }
    const evidence = getEvidenceGraphs()
        .find((item) => item.caseId ===
        caseId);
    const ai = getAIReports()
        .find((item) => item.caseId ===
        caseId);
    const recovery = getRecoveryPlans()
        .find((item) => item.caseId ===
        caseId);
    const verification = getRecoveryVerification()
        .find((item) => item.caseId ===
        caseId);
    res.json({
        case: investigationCase,
        evidence,
        ai,
        recovery,
        verification,
    });
});
router.get("/cases/:caseId/evidence", (req, res) => {
    const evidence = getEvidenceGraphs()
        .find((item) => item.caseId ===
        req.params.caseId);
    if (!evidence) {
        res.status(404).json({
            error: "Evidence graph not found",
        });
        return;
    }
    res.json(evidence);
});
router.get("/cases/:caseId/ai", (req, res) => {
    const report = getAIReports()
        .find((item) => item.caseId ===
        req.params.caseId);
    if (!report) {
        res.status(404).json({
            error: "AI investigation not found",
        });
        return;
    }
    res.json(report);
});
router.get("/cases/:caseId/recovery", (req, res) => {
    const plan = getRecoveryPlans()
        .find((item) => item.caseId ===
        req.params.caseId);
    if (!plan) {
        res.status(404).json({
            error: "Recovery plan not found",
        });
        return;
    }
    res.json(plan);
});
router.get("/cases/:caseId/verification", (req, res) => {
    const result = getRecoveryVerification()
        .find((item) => item.caseId ===
        req.params.caseId);
    if (!result) {
        res.status(404).json({
            error: "Verification result not found",
        });
        return;
    }
    res.json(result);
});
export default router;
