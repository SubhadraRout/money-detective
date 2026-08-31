import fs from "node:fs";
import path from "node:path";
import { buildEvidenceGraphs, } from "./evidenceGraph.js";
const datasetPath = path.resolve(process.cwd(), "../data/generated/financial-dataset.json");
const casesPath = path.resolve(process.cwd(), "../data/investigations/investigation-cases.json");
function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
const dataset = loadJson(datasetPath);
const investigationFile = loadJson(casesPath);
const graphs = buildEvidenceGraphs(investigationFile.cases, dataset);
const totalNodes = graphs.reduce((sum, graph) => sum + graph.nodes.length, 0);
const totalEdges = graphs.reduce((sum, graph) => sum + graph.edges.length, 0);
const output = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    summary: {
        totalGraphs: graphs.length,
        totalNodes,
        totalEdges,
        averageNodesPerGraph: graphs.length === 0
            ? 0
            : totalNodes /
                graphs.length,
        averageEdgesPerGraph: graphs.length === 0
            ? 0
            : totalEdges /
                graphs.length,
    },
    graphs,
};
const outputPath = path.resolve(process.cwd(), "../data/investigations/evidence-graphs.json");
fs.mkdirSync(path.dirname(outputPath), {
    recursive: true,
});
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
console.log("");
console.log("========================================");
console.log("       MONEY DETECTIVE EVIDENCE GRAPH");
console.log("========================================");
console.log("");
console.log(`Investigation graphs: ${graphs.length}`);
console.log(`Total graph nodes:    ${totalNodes}`);
console.log(`Total graph edges:    ${totalEdges}`);
console.log(`Average nodes/case:   ${output.summary.averageNodesPerGraph.toFixed(2)}`);
console.log(`Average edges/case:   ${output.summary.averageEdgesPerGraph.toFixed(2)}`);
console.log("");
if (graphs.length > 0) {
    const first = graphs[0];
    console.log("SAMPLE GRAPH");
    console.log("----------------------------------------");
    console.log(`Case: ${first.caseId}`);
    console.log(`Nodes: ${first.nodes.length}`);
    console.log(`Edges: ${first.edges.length}`);
    console.log("");
    console.log("FINANCIAL FLOW");
    console.log(`Payment:             ₹${(first.financialFlow
        .paymentAmount ?? 0).toFixed(2)}`);
    console.log(`Refunds:             ₹${first.financialFlow.totalRefundAmount.toFixed(2)}`);
    console.log(`Fees:                ₹${first.financialFlow.totalFees.toFixed(2)}`);
    console.log(`Taxes:               ₹${first.financialFlow.totalTaxes.toFixed(2)}`);
    console.log(`Settlement:          ₹${(first.financialFlow
        .settlementNetAmount ?? 0).toFixed(2)}`);
    console.log("");
    console.log(first.summary);
}
console.log("");
console.log(`Graphs written to: ${outputPath}`);
console.log("");
console.log("Evidence graph generation complete.");
console.log("");
