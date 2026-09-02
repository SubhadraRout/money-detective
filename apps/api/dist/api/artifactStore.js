import fs from "node:fs";
import path from "node:path";
const dataRoot = path.resolve(process.cwd(), "../data/investigations");
function loadJson(fileName) {
    const filePath = path.join(dataRoot, fileName);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Artifact not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
export function getInvestigationCases() {
    return loadJson("investigation-cases.json").cases;
}
export function getEvidenceGraphs() {
    return loadJson("evidence-graphs.json").graphs;
}
export function getAIReports() {
    return loadJson("ai-investigation-reports.json").reports;
}
export function getRecoveryPlans() {
    return loadJson("recovery-action-plans.json").plans;
}
export function getRecoveryVerification() {
    return loadJson("recovery-verification.json").results;
}
