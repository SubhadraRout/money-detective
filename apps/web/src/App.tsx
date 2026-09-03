import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import "./styles.css";

const API = "http://localhost:4000";

type Case = {
  caseId: string;
  type: string;
  status: string;
  severity: string;
  title: string;
  summary: string;
  problem: string;
  financialImpact: {
    expectedAmount: number;
    actualAmount: number;
    potentialLeakage: number;
    currency: string;
  };
  entities: {
    orderId?: string;
    paymentId?: string;
    refundIds?: string[];
    settlementId?: string;
  };
  evidence: unknown[];
  rootCause: {
    category: string;
    explanation: string;
  };
  confidence: number;
  recoverability: string;
  recoverabilityReason: string;
  recommendedAction: {
    action: string;
    owner: string;
    priority: string;
  };
  verification: {
    criteria: string;
    expectedOutcome: string;
  };
};

type Dashboard = {
  totalCases: number;
  totalPotentialLeakage: number;
  totalPotentialRecovery: number;
  verifiedRecovery: number;
  remainingExposure: number;
  criticalCases: number;
  highCases: number;
  mediumCases: number;
  lowCases: number;
  humanReviewRequired: number;
  recoveryStatus: {
    recovered: number;
    partiallyRecovered: number;
    notRecovered: number;
    pending: number;
  };
};

type EvidenceGraph = {
  caseId: string;
  nodes: any[];
  edges: any[];
};

type AIReport = {
  finding: {
    title: string;
    whatHappened: string;
    whyItMatters: string;
    financialImpact: number;
    confidence: string;
    evidence: string[];
    merchantExplanation: string;
    recommendedNextStep: string;
  };
};

type RecoveryPlan = {

  caseId: string;
  recoveryStatus: string;

  recoveryDecision?: {
  action:
    | "initiated"
    | "not_initiated";

  verificationStatus:
    | "pending"
    | "not_applicable";

  decidedBy: "human";
  decidedAt: string;
  reason?: string;
};

  recoverability: string;
  recoverabilityReason: string;

  financialImpact: {
    potentialRecovery: number;
    currency: string;
  };

  recoveryAction: {
    type: string;
    action: string;
    owner: string;
    priority: string;
  };

  rationale: string;

  steps: string[];

  humanReview: {
    required: boolean;
    reason: string;
  };

  recoveryCase?: {
    caseId?: string;
    status?: string;
    amount?: number;
    paymentId?: string;
    reason?: string;
  };

  recoveryMessage?: {
    subject?: string;
    message?: string;
    body?: string;
  };

  verification: {
    criteria: string;
    expectedOutcome: string;
  };

  aiContext: {
    confidence: string;
    finding: string;
    recommendedNextStep: string;
  };
};

type Verification = {
  verificationStatus: string;
  financialImpact: {
    potentialRecovery: number;
    verifiedRecovery: number;
    remainingExposure: number;
    currency: string;
  };
  verificationCriteria?: string;
  verificationResult?: string;
  verifiedAt?: string;
};

function money(value: number | null | undefined) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function severityClass(severity: string) {
  return severity.toLowerCase();
}

function App() {

  const [dashboard, setDashboard] =
    useState<Dashboard | null>(null);

  const [cases, setCases] =
    useState<Case[]>([]);

  const [selectedCase, setSelectedCase] =
    useState<Case | null>(null);

  const [evidence, setEvidence] =
    useState<EvidenceGraph | null>(null);

  const [ai, setAi] =
    useState<AIReport | null>(null);

  const aiRequestRef = useRef<string | null>(null);


  const [recovery, setRecovery] =
    useState<RecoveryPlan | null>(null);

  const [verification, setVerification] =
    useState<Verification | null>(null);

  const [search, setSearch] =
    useState("");

  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
  useState("");

const [refreshing, setRefreshing] =
  useState(false);


const [caseLoading, setCaseLoading] =
  useState(false);

const [loadingCaseId, setLoadingCaseId] =
  useState<string | null>(null);

const [caseError, setCaseError] =
  useState("");

const [recoveryActionLoading, setRecoveryActionLoading] =
  useState(false);

const [recoveryActionError, setRecoveryActionError] =
  useState("");

  useEffect(() => {
  async function initialize() {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        loadDashboard(),
        loadCases(),
      ]);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load investigation data. Please check that the API is running."
      );
    } finally {
      setLoading(false);
    }
  }

  initialize();
}, []);


  async function refreshData() {
  try {
    setRefreshing(true);
    setError("");

    await Promise.all([
      loadDashboard(),
      loadCases(),
    ]);
  } catch (err) {
    console.error(err);

    setError(
      "Refresh failed. Please check that the API is running."
    );
  } finally {
    setRefreshing(false);
  }
}

  async function loadDashboard() {
  const response = await fetch(
    `${API}/api/dashboard`
  );

  if (!response.ok) {
    throw new Error(
      `Dashboard request failed (${response.status})`
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  setDashboard(data);
}

  async function loadCases() {
  const response = await fetch(
    `${API}/api/cases`
  );

  if (!response.ok) {
    throw new Error(
      `Cases request failed (${response.status})`
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  setCases(
    Array.isArray(data.cases)
      ? data.cases
      : []
  );
}


async function handleRecoveryDecision(
  action: "approve" | "reject"
) {
  if (!selectedCase) {
    return;
  }

  setRecoveryActionLoading(true);
  setRecoveryActionError("");

  try {
    const response = await fetch(
      `${API}/api/cases/${selectedCase.caseId}/recovery/${action}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          action === "reject"
            ? JSON.stringify({
                reason:
                  "Recovery recommendation rejected by human reviewer.",
              })
            : undefined,
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          `Recovery ${action} failed.`
      );
    }

    /*
     * Reload recovery + verification
     * so the UI reflects the backend state.
     */
    const [
      recoveryResponse,
      verificationResponse,
    ] = await Promise.all([
      fetch(
        `${API}/api/cases/${selectedCase.caseId}/recovery`
      ),
      fetch(
        `${API}/api/cases/${selectedCase.caseId}/verification`
      ),
    ]);

    const recoveryData =
      await recoveryResponse.json();

    const verificationData =
      await verificationResponse.json();

    setRecovery(
      recoveryData.plan ?? null
    );

    setVerification(
      verificationData.verification ??
        null
    );

    /*
     * Refresh dashboard totals as well.
     */
    await loadDashboard();

  } catch (err) {
    console.error(
      "Recovery decision failed:",
      err
    );

    setRecoveryActionError(
      err instanceof Error
        ? err.message
        : "Unable to update recovery decision."
    );
  } finally {
    setRecoveryActionLoading(false);
  }
}




/* ADD THIS HERE */

async function completeRecovery() {
  if (!selectedCase) {
    return;
  }

  try {
    setRecoveryActionLoading(true);
    setRecoveryActionError("");

    const response = await fetch(
      `${API}/api/cases/${selectedCase.caseId}/recovery/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Failed to complete recovery."
      );
    }

    const [
      recoveryResponse,
      verificationResponse,
    ] = await Promise.all([
      fetch(
        `${API}/api/cases/${selectedCase.caseId}/recovery`
      ),
      fetch(
        `${API}/api/cases/${selectedCase.caseId}/verification`
      ),
    ]);

    const recoveryData =
      await recoveryResponse.json();

    const verificationData =
      await verificationResponse.json();

    setRecovery(
      recoveryData.plan ?? null
    );

    setVerification(
      verificationData.verification ??
        null
    );

    await loadDashboard();

  } catch (err) {
    console.error(
      "Recovery completion failed:",
      err
    );

    setRecoveryActionError(
      err instanceof Error
        ? err.message
        : "Unable to complete recovery."
    );

  } finally {
    setRecoveryActionLoading(false);
  }
}

  async function openCase(item: Case) {
  // Prevent duplicate requests for the same case.
  if (aiRequestRef.current === item.caseId) {
    return;
  }

  if (loadingCaseId === item.caseId) {
    return;
  }

  // Mark this case as being investigated.
  aiRequestRef.current = item.caseId;

  setLoadingCaseId(item.caseId);
  setSelectedCase(item);

  setEvidence(null);
  setAi(null);
  setRecovery(null);
  setVerification(null);

  setCaseLoading(true);
  setCaseError("");

  try {
    const [
      evidenceResponse,
      aiResponse,
      recoveryResponse,
      verificationResponse,
    ] = await Promise.all([
      fetch(
        `${API}/api/cases/${item.caseId}/evidence`
      ),

      fetch(
        `${API}/api/cases/${item.caseId}/ai`
      ),

      fetch(
        `${API}/api/cases/${item.caseId}/recovery`
      ),

      fetch(
        `${API}/api/cases/${item.caseId}/verification`
      ),
    ]);

    if (!evidenceResponse.ok) {
      throw new Error(
        "Evidence could not be loaded."
      );
    }

    if (!aiResponse.ok) {
      throw new Error(
        "AI investigation could not be loaded."
      );
    }

    if (!recoveryResponse.ok) {
      throw new Error(
        "Recovery plan could not be loaded."
      );
    }

    if (!verificationResponse.ok) {
      throw new Error(
        "Recovery verification could not be loaded."
      );
    }

    const evidenceData =
      await evidenceResponse.json();

    const aiData =
      await aiResponse.json();

    const recoveryData =
      await recoveryResponse.json();

    const verificationData =
      await verificationResponse.json();

    // -----------------------------
    // VERIFIED EVIDENCE
    // -----------------------------

    setEvidence(
      evidenceData.graph ?? null
    );

    // -----------------------------
    // AI INVESTIGATION
    // -----------------------------

    let aiAnswer: AIReport | null = null;

    if (aiData.report?.finding) {
      // Preferred format
      aiAnswer = aiData.report;

    } else if (aiData.ai?.report?.finding) {
      // Nested report format
      aiAnswer = aiData.ai.report;

    } else if (aiData.ai?.answer) {
      const rawAnswer =
        aiData.ai.answer;

      let parsedAnswer: any = null;

      // Ollama may return structured JSON
      // as a JSON string.
      if (
        typeof rawAnswer === "string"
      ) {
        try {
          parsedAnswer =
            JSON.parse(rawAnswer);
        } catch {
          parsedAnswer = null;
        }
      } else if (
        rawAnswer &&
        typeof rawAnswer === "object"
      ) {
        parsedAnswer = rawAnswer;
      }

      // -----------------------------
      // STRUCTURED AI RESPONSE
      // -----------------------------

      if (
        parsedAnswer &&
        typeof parsedAnswer === "object"
      ) {
        aiAnswer = {
          finding: {
            title:
              typeof parsedAnswer.title ===
              "string"
                ? parsedAnswer.title
                : "AI Investigation Result",

            whatHappened:
              typeof parsedAnswer.whatHappened ===
              "string"
                ? parsedAnswer.whatHappened
                : "The AI investigator analyzed the verified financial evidence.",

            whyItMatters:
              typeof parsedAnswer.whyItMatters ===
              "string"
                ? parsedAnswer.whyItMatters
                : "The verified evidence indicates a financial discrepancy requiring review.",

            financialImpact:
              parsedAnswer.financialImpact ??
              item.financialImpact
                .potentialLeakage,

            confidence:
              typeof parsedAnswer.confidence ===
              "string"
                ? parsedAnswer.confidence
                : `${Math.round(
                    item.confidence * 100
                  )}%`,

            evidence:
              Array.isArray(
                parsedAnswer.evidence
              )
                ? parsedAnswer.evidence
                : [],

            merchantExplanation:
              typeof parsedAnswer.merchantExplanation ===
              "string"
                ? parsedAnswer.merchantExplanation
                : typeof parsedAnswer.whatHappened ===
                  "string"
                ? parsedAnswer.whatHappened
                : "The verified financial evidence indicates a discrepancy requiring review.",

            recommendedNextStep:
              typeof parsedAnswer.recommendedNextStep ===
              "string"
                ? parsedAnswer.recommendedNextStep
                : item.recommendedAction.action,
          },
        };
      }

      // -----------------------------
      // PLAIN TEXT FALLBACK
      // -----------------------------

      else {
        const safeAnswer =
          typeof rawAnswer === "string"
            ? rawAnswer
            : "The AI investigator analyzed the verified financial evidence.";

        aiAnswer = {
          finding: {
            title:
              "AI Investigation Result",

            whatHappened:
              safeAnswer,

            whyItMatters:
              "The AI investigator analyzed the verified payment, refund, settlement, fee, and unmatched-record evidence.",

            financialImpact:
              item.financialImpact
                .potentialLeakage,

            confidence:
              `${Math.round(
                item.confidence * 100
              )}%`,

            evidence: [],

            merchantExplanation:
              safeAnswer,

            recommendedNextStep:
              item.recommendedAction.action,
          },
        };
      }
    }

    setAi(aiAnswer);

    // -----------------------------
    // RECOVERY
    // -----------------------------

    setRecovery(
      recoveryData.plan ?? null
    );

    // -----------------------------
    // VERIFICATION
    // -----------------------------

    setVerification(
      verificationData.verification ??
        null
    );

  } catch (err) {
    console.error(
      "Case investigation failed:",
      err
    );

    setCaseError(
      err instanceof Error
        ? err.message
        : "Unable to load this investigation."
    );

  } finally {
    setCaseLoading(false);
    setLoadingCaseId(null);

    // IMPORTANT:
    // Allow this case to be opened again later.
    if (
      aiRequestRef.current === item.caseId
    ) {
      aiRequestRef.current = null;
    }
  }
}
  function backToCases() {
    setSelectedCase(null);
    setEvidence(null);
    setAi(null);
    setRecovery(null);
    setVerification(null);
    setCaseError("");
  }

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesSearch =
        item.caseId
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.type
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesSeverity =
        severityFilter === "ALL" ||
        item.severity === severityFilter;

      return (
        matchesSearch &&
        matchesSeverity
      );
    });
  }, [cases, search, severityFilter]);

  if (selectedCase) {
    return (
      <CaseInvestigation
        item={selectedCase}
        evidence={evidence}
        ai={ai}
        recovery={recovery}
        caseLoading={caseLoading}
        caseError={caseError}
        verification={verification}
        onBack={backToCases}
        onRecoveryDecision={handleRecoveryDecision}
        recoveryActionLoading={recoveryActionLoading}
        recoveryActionError={recoveryActionError}
        completeRecovery={completeRecovery}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={21} />
          </div>

          <div>
            <div className="brand-name">
              Money Detective
            </div>

            <div className="brand-subtitle">
              Financial leakage intelligence
            </div>
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot" />
          Investigation engine online
        </div>
      </header>

      <main className="content">
  <section className="hero">
    <div>
      <div className="eyebrow">
        OPERATIONS COMMAND CENTER
      </div>

      <h1>
        Find where the money is
        <span> leaking.</span>
      </h1>

      <p>
        Detect suspicious payment behavior,
        understand the evidence, and turn
        every anomaly into a recovery action.
      </p>
    </div>

    <button
      className="refresh-button"
      onClick={refreshData}
      disabled={refreshing}
    >
      <RefreshCw
        size={16}
        className={refreshing ? "spin" : ""}
      />
      {refreshing ? "Refreshing..." : "Refresh data"}
    </button>
  </section>

  {error && (
    <div className="error-banner" role="alert">
      <AlertTriangle size={18} />
      <div>
        <strong>
          Unable to load investigation data
        </strong>
        <span>{error}</span>
      </div>
    </div>
  )}

  {loading || !dashboard ? (
    <div className="loading">
      Loading investigation data...
    </div>
  ) : (
    <>
      <section className="metric-grid">
        <MetricCard
          icon={<CircleDollarSign />}
          label="Potential leakage"
          value={money(
            dashboard.totalPotentialLeakage
          )}
          detail={`${dashboard.totalCases} cases detected`}
          accent="danger"
        />
              <MetricCard
                icon={<Wallet />}
                label="Potential recovery"
                value={money(
                  dashboard.totalPotentialRecovery
                )}
                detail={`${dashboard.humanReviewRequired} require human review`}
                accent="warning"
              />

              <MetricCard
                icon={<CheckCircle2 />}
                label="Verified recovery"
                value={money(
                  dashboard.verifiedRecovery
                )}
                detail={`${dashboard.recoveryStatus.recovered} cases recovered`}
                accent="success"
              />

              <MetricCard
                icon={<AlertTriangle />}
                label="Remaining exposure"
                value={money(
                  dashboard.remainingExposure
                )}
                detail={`${dashboard.recoveryStatus.pending} cases pending`}
                accent="neutral"
              />
            </section>

            <section className="severity-grid">
              <SeverityCard
                label="Critical"
                value={dashboard.criticalCases}
                severity="critical"
              />

              <SeverityCard
                label="High"
                value={dashboard.highCases}
                severity="high"
              />

              <SeverityCard
                label="Medium"
                value={dashboard.mediumCases}
                severity="medium"
              />

              <SeverityCard
                label="Low"
                value={dashboard.lowCases}
                severity="low"
              />
            </section>

            <section className="section-header">
              <div>
                <div className="eyebrow">
                  INVESTIGATIONS
                </div>

                <h2>
                  Leakage cases
                </h2>
              </div>

              <div className="case-count">
                {filteredCases.length} cases
              </div>
            </section>

            <section className="case-toolbar">
              <div className="search-box">
                <Search size={17} />

                <input
                  placeholder="Search case, payment or leakage type..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />
              </div>

              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All severities
                </option>

                <option value="critical">
                  Critical
                </option>

                <option value="high">
                  High
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="low">
                  Low
                </option>
              </select>
            </section>

            <section className="case-list">
  {filteredCases.length === 0 ? (
    <div className="empty-state">
      <div className="empty-state-icon">
        <FileSearch size={22} />
      </div>

      <h3>No investigations found</h3>

      <p>
        No leakage cases match your current search or severity filter.
      </p>

      {(search || severityFilter !== "ALL") && (
        <button
          className="secondary-button"
          onClick={() => {
            setSearch("");
            setSeverityFilter("ALL");
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  ) : (
    filteredCases.map((item) => (
      <button
        className="case-row"
        key={item.caseId}
        onClick={() => openCase(item)}
        disabled={caseLoading}
      >
        <div className="case-main">
          <div className="case-title-row">
            <span
              className={`severity-badge ${severityClass(
                item.severity
              )}`}
            >
              {item.severity}
            </span>

            <span className="case-type">
              {item.type}
            </span>
          </div>

          <h3>
            {item.title}
          </h3>

          <p>
            {item.summary}
          </p>

                      <div className="case-id">
                        {item.caseId}
                      </div>
                    </div>

                    <div className="case-financial">
                      <div className="financial-label">
                        Potential leakage
                      </div>

                      <div className="financial-value">
                        {money(
                          item.financialImpact
                            .potentialLeakage
                        )}
                      </div>

                      <div className="recoverable">
                        {item.recoverability}
                        {" "}recoverability
                      </div>
                    </div>

                    <ChevronRight
                      className="row-arrow"
                      size={20}
                    />
                  </button>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div
      className={`metric-card ${accent}`}
    >
      <div className="metric-icon">
        {icon}
      </div>

      <div className="metric-label">
        {label}
      </div>

      <div className="metric-value">
        {value}
      </div>

      <div className="metric-detail">
        {detail}
      </div>
    </div>
  );
}

function SeverityCard({
  label,
  value,
  severity,
}: {
  label: string;
  value: number;
  severity: string;
}) {
  return (
    <div className="severity-card">
      <div
        className={`severity-indicator ${severity}`}
      />

      <div>
        <div className="severity-label">
          {label}
        </div>

        <div className="severity-value">
          {value}
        </div>
      </div>
    </div>
  );
}

function CaseInvestigation({
  item,
  evidence,
  ai,
  recovery,
  verification,
  caseLoading,
  caseError,
  onBack,
  onRecoveryDecision,
  recoveryActionLoading,
  recoveryActionError,
  completeRecovery,
}: {
  item: Case;
  evidence: EvidenceGraph | null;
  ai: AIReport | null;
  recovery: RecoveryPlan | null;
  verification: Verification | null;
  caseLoading: boolean;
  caseError: string;
  onBack: () => void;
  onRecoveryDecision: (
    action: "approve" | "reject"
  ) => void;

  recoveryActionLoading: boolean;
  recoveryActionError: string;
  completeRecovery: () => Promise<void>;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={21} />
          </div>

          <div>
            <div className="brand-name">
              Money Detective
            </div>

            <div className="brand-subtitle">
              Case investigation
            </div>
          </div>
        </div>

        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          All investigations
        </button>
      </header>

      <main className="content">
        {/* CASE HEADER */}
        <section className="case-hero">
          <div>
            <div className="case-title-row">
              <span
                className={`severity-badge ${severityClass(
                  item.severity
                )}`}
              >
                {item.severity}
              </span>

              <span className="case-type">
                {item.type}
              </span>
            </div>

            <h1>{item.title}</h1>

            <div className="case-id large">
              {item.caseId}
            </div>
          </div>

          <div className="hero-impact">
            <div>POTENTIAL LEAKAGE</div>

            <strong>
              {money(
                item.financialImpact.potentialLeakage
              )}
            </strong>
          </div>
        </section>

        {/* CASE ERROR */}
        {caseError && (
          <div className="error-banner">
            <AlertTriangle size={18} />

            <div>
              <strong>
                Unable to load investigation
              </strong>

              <p>{caseError}</p>
            </div>
          </div>
        )}

        {/* INVESTIGATION SUMMARY */}
        <section className="investigation-grid">
          <div className="panel">
            <PanelHeading
              icon={<FileSearch />}
              eyebrow="INVESTIGATION"
              title="What happened"
            />

            <p className="large-copy">
              {item.problem}
            </p>

            <div className="impact-box">
              <div>
                <span>Original amount</span>

                <strong>
                  {money(
                    item.financialImpact
                      .expectedAmount
                  )}
                </strong>
              </div>

              <div>
                <span>Actual amount</span>

                <strong>
                  {money(
                    item.financialImpact
                      .actualAmount
                  )}
                </strong>
              </div>

              <div>
                <span>At risk</span>

                <strong>
                  {money(
                    item.financialImpact
                      .potentialLeakage
                  )}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <PanelHeading
              icon={<AlertTriangle />}
              eyebrow="WHY IT MATTERS"
              title="Business impact"
            />

            {caseLoading && !ai ? (
              <div className="loading">
                Loading business impact...
              </div>
            ) : (
              <p className="large-copy">
                {ai?.finding.whyItMatters ??
                  item.summary}
              </p>
            )}

            <div className="confidence">
              <span>
                Investigation confidence
              </span>

              <strong>
                {Math.round(
                  item.confidence * 100
                )}
                %
              </strong>
            </div>
          </div>
        </section>

        {/* EVIDENCE */}
        <section className="panel">
          <PanelHeading
            icon={<FileSearch />}
            eyebrow="EVIDENCE"
            title="Transaction evidence graph"
          />

          {caseLoading && !evidence ? (
            <div className="loading">
              Loading evidence graph...
            </div>
          ) : evidence ? (
            <EvidenceGraphView
              evidence={evidence}
            />
          ) : (
            <div className="empty-state">
              Evidence is unavailable for this case.
            </div>
          )}
        </section>

        {/* AI + RECOVERY */}
        <section className="investigation-grid">
          {/* AI INVESTIGATION */}
          <div className="panel ai-panel">
            <PanelHeading
              icon={<Sparkles />}
              eyebrow="AI INVESTIGATOR"
              title="Why we believe it"
            />

            {caseLoading && !ai ? (
              <div className="loading">
                Loading AI investigation...
              </div>
            ) : ai ? (
              <>
                <div className="ai-heading">
                  {ai.finding.title}
                </div>

                <div className="ai-section">
                  <label>
                    WHAT HAPPENED
                  </label>

                  <p>
                    {ai.finding.whatHappened}
                  </p>
                </div>

                <div className="ai-section">
                  <label>
                    WHY IT MATTERS
                  </label>

                  <p>
                    {ai.finding.whyItMatters}
                  </p>
                </div>

                <div className="ai-section">
                  <label>
                    MERCHANT EXPLANATION
                  </label>

                  <p>
                    {ai.finding.merchantExplanation}
                  </p>
                </div>

                <div className="next-step">
                  <span>
                    Recommended next step
                  </span>

                  <strong>
                    {ai.finding.recommendedNextStep}
                  </strong>
                </div>
              </>
            ) : (
              <div className="empty-state">
                AI investigation is unavailable.
              </div>
            )}
          </div>

          {/* RECOVERY */}
<div className="panel recovery-panel">
  <PanelHeading
    icon={<Wallet />}
    eyebrow="RECOVERY"
    title="Action plan"
  />

  {caseLoading && !recovery ? (
    <div className="loading">
      Preparing recovery action...
    </div>
  ) : recovery ? (
    <>
      {/* MONEY AT RISK */}
      <div className="recovery-amount">
        {money(
          recovery.financialImpact.potentialRecovery
        )}
      </div>

      <div className="recovery-label">
        potentially recoverable
      </div>

      {/* RECOVERY STATUS */}
      <div className="recovery-status">
        {recovery.recoveryStatus.replaceAll(
          "_",
          " "
        )}
      </div>

      {/* ACTION */}
      <div className="action-box">
        <label>ACTION</label>

        <strong>
          {recovery.recoveryAction.action}
        </strong>

        <div className="action-meta">
          <span>
            Owner:{" "}
            {recovery.recoveryAction.owner}
          </span>

          <span>
            Priority:{" "}
            {recovery.recoveryAction.priority}
          </span>
        </div>
      </div>

      {/* HUMAN REVIEW */}
      {recovery.humanReview.required && (
        <>
          {/* WAITING FOR HUMAN DECISION */}
          {recovery.recoveryStatus ===
            "human_review_required" && (
            <div className="recovery-review-actions">
              <div className="review-notice">
                Human review required before
                financial action.
              </div>

              <div className="recovery-buttons">
                <button
                  type="button"
                  className="approve-recovery-button"
                  onClick={() =>
                    onRecoveryDecision(
                      "approve"
                    )
                  }
                  disabled={
                    recoveryActionLoading
                  }
                >
                  <CheckCircle2 size={17} />

                  {recoveryActionLoading
                    ? "Processing..."
                    : "Approve Recovery"}
                </button>

                <button
                  type="button"
                  className="reject-recovery-button"
                  onClick={() =>
                    onRecoveryDecision(
                      "reject"
                    )
                  }
                  disabled={
                    recoveryActionLoading
                  }
                >
                  Reject
                </button>
              </div>

              {recoveryActionError && (
                <div
                  className="recovery-action-error"
                  role="alert"
                >
                  {recoveryActionError}
                </div>
              )}
            </div>
          )}

          {/* APPROVED */}
          {recovery.recoveryStatus ===
  "approved" && (
  <div className="recovery-approved">
    <CheckCircle2 size={18} />

    <div>
      <strong>
        Recovery approved
      </strong>

      <span>
        Recovery action initiated ·
        Verification pending
      </span>

      <button
        type="button"
        className="approve-recovery-button"
        onClick={completeRecovery}
        disabled={recoveryActionLoading}
      >
        {recoveryActionLoading
          ? "Verifying..."
          : "Confirm Recovery Completed"}
      </button>
    </div>
  </div>
)}
          {/* REJECTED */}
          {recovery.recoveryStatus ===
            "rejected" && (
            <div className="recovery-rejected">
              <AlertTriangle size={18} />

              <div>
                <strong>
                  Recovery rejected
                </strong>

                <span>
                  No recovery action was
                  initiated.
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* WHY THIS SHOULD BE RECOVERED */}
      <div className="ai-section">
        <label>
          WHY THIS SHOULD BE RECOVERED
        </label>

        <p>
          {recovery.rationale}
        </p>
      </div>

      {/* RECOVERY STEPS */}
      <div className="ai-section">
        <label>
          RECOVERY STEPS
        </label>
      </div>

      <ol className="steps">
        {recovery.steps.map(
          (step, index) => (
            <li key={index}>
              <span>
                {index + 1}
              </span>

              {step}
            </li>
          )
        )}
      </ol>

      {/* RECOVERY CASE */}
      {recovery.recoveryCase && (
        <div className="action-box">
          <label>
            RECOVERY CASE
          </label>

          <strong>
            {recovery.recoveryCase.status ??
              "CREATED"}
          </strong>

          {recovery.recoveryCase.caseId && (
            <div className="action-meta">
              <span>
                Case:{" "}
                {recovery.recoveryCase.caseId}
              </span>
            </div>
          )}

          {recovery.recoveryCase.amount !==
            undefined && (
            <div className="action-meta">
              <span>
                Amount:{" "}
                {money(
                  recovery.recoveryCase.amount
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* RECOVERY MESSAGE */}
      {recovery.recoveryMessage && (
        <div className="action-box">
          <label>
            DRAFT RECOVERY MESSAGE
          </label>

          {recovery.recoveryMessage.subject && (
            <strong>
              {recovery.recoveryMessage.subject}
            </strong>
          )}

          <p>
            {recovery.recoveryMessage.message ??
              recovery.recoveryMessage.body ??
              "Recovery message prepared for merchant review."}
          </p>
        </div>
      )}
    </>
  ) : (
    <div className="empty-state">
      Recovery plan is unavailable.
    </div>
  )}
</div>

        </section>

        {/* VERIFICATION */}
        <section className="verification-panel">
          <div>
            <div className="eyebrow">
              VERIFICATION
            </div>

            <h2>
              Recovery outcome
            </h2>

            <p>
              Money Detective closes the loop:
              detect → explain → recover → verify.
            </p>
          </div>

          {caseLoading && !verification ? (
            <div className="loading">
              Loading verification...
            </div>
          ) : verification ? (
            <div className="verification-result">
              <div className="verified-icon">
                <CheckCircle2 size={28} />
              </div>

              <div>
                <div className="verified-status">
                  {verification.verificationStatus}
                </div>

                <strong>
                  {money(
                    verification.financialImpact
                      .verifiedRecovery
                  )}
                </strong>

                <span>
                  verified recovery
                </span>
              </div>

              <div className="remaining">
                <span>
                  Remaining exposure
                </span>

                <strong>
                  {money(
                    verification.financialImpact
                      .remainingExposure
                  )}
                </strong>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              Verification data is unavailable.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PanelHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="panel-heading">
      <div className="panel-icon">
        {icon}
      </div>

      <div>
        <div className="eyebrow">
          {eyebrow}
        </div>

        <h2>
          {title}
        </h2>
      </div>
    </div>
  );
}

function EvidenceGraphView({
  evidence,
}: {
  evidence: EvidenceGraph | null;
}) {
  if (!evidence) {
    return (
      <div className="loading">
        Loading evidence graph...
      </div>
    );
  }

  const nodes =
    Array.isArray(evidence.nodes)
      ? evidence.nodes
      : [];

  return (
    <div className="evidence-graph">
      {nodes.map(
        (node, index) => {
          const type =
            String(
              node.type ??
              node.source ??
              node.kind ??
              "record"
            );

          const id =
            String(
              node.id ??
              node.recordId ??
              node.entityId ??
              `record-${index + 1}`
            );

          return (
            <div
              className="graph-node-wrapper"
              key={`${id}-${index}`}
            >
              <div className="graph-node">
                <div className="graph-node-type">
                  {type}
                </div>

                <strong>
                  {id}
                </strong>
              </div>

              {index <
                nodes.length - 1 && (
                <div className="graph-arrow">
                  ↓
                </div>
              )}
            </div>
          );
        }
      )}

      {!nodes.length && (
        <div>
          Evidence records available,
          but no graph nodes were returned.
        </div>
      )}
    </div>
  );
}

export default App;