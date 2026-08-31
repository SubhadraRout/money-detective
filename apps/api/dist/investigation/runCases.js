import fs from "node:fs";
import path from "node:path";
import { investigate } from "./investigationEngine.js";
import { createInvestigationCases, } from "./investigationCase.js";
const datasetPath = path.resolve(process.cwd(), "../data/generated/financial-dataset.json");
function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
const dataset = loadJson(datasetPath);
const investigationReport = investigate(dataset);
const cases = createInvestigationCases(investigationReport.candidates);
const outputPath = path.resolve(process.cwd(), "../data/investigations/investigation-cases.json");
fs.mkdirSync(path.dirname(outputPath), {
    recursive: true,
});
const output = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    summary: {
        totalCases: cases.length,
        totalPotentialLeakage: cases.reduce((sum, item) => sum +
            item.financialImpact
                .potentialLeakage, 0),
        criticalCases: cases.filter((item) => item.severity ===
            "critical").length,
        highCases: cases.filter((item) => item.severity ===
            "high").length,
        mediumCases: cases.filter((item) => item.severity ===
            "medium").length,
        lowCases: cases.filter((item) => item.severity ===
            "low").length,
    },
    cases,
};
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
console.log("");
console.log("========================================");
console.log("     MONEY DETECTIVE INVESTIGATION CASES");
console.log("========================================");
console.log("");
console.log(`Investigation cases: ${cases.length}`);
console.log(`Potential leakage: ₹${output.summary.totalPotentialLeakage.toFixed(2)}`);
console.log(`Critical: ${output.summary.criticalCases}`);
console.log(`High:     ${output.summary.highCases}`);
console.log(`Medium:   ${output.summary.mediumCases}`);
console.log(`Low:      ${output.summary.lowCases}`);
console.log("");
console.log(`Cases written to: ${outputPath}`);
console.log("");
console.log("Investigation case generation complete.");
console.log("");
