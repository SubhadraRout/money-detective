import type {
  InvestigationCandidate,
  LeakageType,
  Evidence,
} from "../types/financial.js";

export interface InvestigationContext {
  candidates: InvestigationCandidate[];
}

export interface DetectorResult {
  type: LeakageType;
  candidates: InvestigationCandidate[];
}

export type EvidenceBuilder = (
  evidence: Evidence[]
) => Evidence[];