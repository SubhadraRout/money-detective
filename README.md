# 🔎 Money Detective

**Money Detective — AI-powered financial operations agent that turns payment anomalies into verified recovery.**

### Find. Investigate. Explain. Recover. Verify.

Money Detective is an **AI-powered financial operations agent** designed to help merchants identify payment-related financial leakage and turn suspicious transactions into actionable recovery cases.

Instead of stopping at anomaly detection, Money Detective follows the complete operational workflow:

```
Detect → Investigate → Explain → Recover → Verify
```

The system combines transaction analysis, evidence-based investigation, AI reasoning, human approval, recovery tracking, and deterministic financial verification.


## 🎯 Core Workflow

### 1. Detect

Money Detective analyzes financial records and identifies suspicious cases.


**Example:**

```
Possible duplicate refund
Potential leakage: ₹50,407.80
Confidence: 95%
```

### 2. Investigate

The system builds an evidence-based view of the transaction.

It connects related financial entities such as:

```
Investigation
     ↓
   Order
     ↓
  Payment
     ↓
  Refund
     ↓
  Refund
     ↓
   Fee
     ↓
Settlement
```

This allows the investigator to understand the actual financial relationship between events.

For a duplicate refund case, the system can identify situations where:

```
Original Payment
        ↓
Multiple Refunds
        ↓
Refunds > Original Payment
        ↓
Potential Financial Leakage
```

### 3. Explain

The AI investigator converts the transaction evidence into a human-readable explanation.

**Example:**

> A single payment has multiple refund events.
>
> The total refund amount exceeds the original payment amount, creating a financial exposure.

The goal is to turn raw transaction data into an actionable financial investigation.

## 🤖 AI Investigator

Money Detective uses an AI agent to reason over the financial investigation context.

The AI layer is designed to assist with:

- Understanding investigation context
- Explaining anomalies
- Summarizing evidence
- Providing recovery reasoning
- Recommending next steps

This creates a separation between:

```
AI reasoning
     +
Deterministic financial verification
     +
Human approval
```

AI helps explain and recommend.

It does not independently perform irreversible financial actions.

## 💰 Recovery Workflow

Once an investigation identifies potential recoverable money, Money Detective creates a recovery plan.


**Example:**

```
Potential recovery: ₹50,407.80

Action:
Reconcile all refunds against the original payment
and determine whether a duplicate refund should be recovered.

Owner:
Finance / Payments Operations

Priority:
Critical
```

## 👤 Human-in-the-Loop

Financial recovery actions require human approval.

Money Detective therefore follows:

```
AI Investigation
       ↓
Recovery Recommendation
       ↓
Human Review
       ↓
Approve / Reject
       ↓
Recovery Initiated
```

A human reviewer remains responsible for approving the financial action.

## ✅ Recovery Verification

Approval is not considered successful recovery.


The verification process compares:

```
Potential Recovery
       ↓
Verified Recovery
       ↓
Remaining Exposure
```

**Example:**

```
Potential recovery: ₹56,391.19
Verified recovery:  ₹56,391.19
Remaining exposure: ₹0
```

The system records the verification result and marks the case as recovered when the deterministic verification confirms the expected financial outcome.

**This gives the complete workflow.**


## 📊 Dashboard

The dashboard provides an operational overview of the investigation system.


The dashboard updates after a recovery is completed.

**For example:**

Before recovery:

```
Verified Recovery: ₹47.06 lakh
Remaining Exposure: ₹32.34 lakh
```

After a successful recovery:

```
Verified Recovery: increases
Remaining Exposure: decreases
```

This makes the financial impact of recovery visible at the system level.

## 🧠 Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Modern CSS
- Component-based UI


### Backend

- Node.js
- TypeScript
- Express
- REST APIs

### AI Layer

- Ollama
- Local LLM integration
- AI agent
- Agent tools
- Investigation context


## 🏗️ Architecture

High-level architecture:

```
                  ┌──────────────────────┐
                  │      React UI        │
                  │   TypeScript + Vite  │
                  └──────────┬───────────┘
                             │
                             │ REST API
                             ▼
                  ┌──────────────────────┐
                  │   Node.js / Express  │
                  │      API Server      │
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       Investigation      Recovery      Verification
          Engine           Engine          Engine
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │     AI Agent Layer   │
                  │       Ollama         │
                  └──────────────────────┘
```

## 📁 Project Structure

```
money-detective/
│
├── apps/
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── ...
│   │   │
│   │   ├── package.json
│   │   └── vite.config.*
│   │
│   └── api/
│       ├── src/
│       │   ├── service.ts
│       │   ├── ollamaAgent.ts
│       │   ├── ollamaClient.ts
│       │   ├── agentTools.ts
│       │   └── ...
│       │
│       └── package.json
│
├── package.json
├── README.md
└── ...
```

## ⚙️ Requirements

Before running the project, install:

- Node.js
- npm
- Ollama
- A compatible Ollama model

Verify Node.js:

```bash
node --version
```

Verify npm:

```bash
npm --version
```

Verify Ollama:

```bash
ollama --version
```

## 🚀 Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Move into the project:

```bash
cd money-detective
```

Install dependencies.

For the API:

```bash
cd apps/api
npm install
```

For the frontend:

```bash
cd ../web
npm install
```

## 🦙 Ollama Setup

Install and start Ollama.

Pull the model configured for the project.

For example:

```bash
ollama pull <YOUR_MODEL>
```

Start Ollama if required:

```bash
ollama serve
```

The exact model depends on the model configured in the project's AI client/agent configuration.

## 🔐 Environment Variables

Create the required `.env` file in the API application if your local configuration requires one.

Example:

```env
PORT=4000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=<YOUR_MODEL>
```

Use the variable names already defined in the project's source configuration if they differ from the example above.

> ⚠️ Do not commit secrets or private credentials to GitHub.

## ▶️ Running the Application

### Start the API

Open a terminal:

```bash
cd apps/api
npm run dev
```

The API runs on:

```
http://localhost:4000
```

### Start the Web App

Open another terminal:

```bash
cd apps/web
npm run dev
```

The frontend will normally be available at:

```
http://localhost:5173
```

Open the displayed localhost URL in your browser.

## 🧪 Type Checking

API:

```bash
cd apps/api
npm run typecheck
```

Frontend:

```bash
cd apps/web
npm run build
```

The frontend build performs TypeScript checking before creating the production bundle.

## 🔌 API Endpoints

### Dashboard

```
GET /api/dashboard
```

Returns the overall investigation and recovery metrics.

Example response:

```json
{
  "totalCases": 600,
  "totalPotentialLeakage": 7940710.13,
  "criticalCases": 6,
  "highCases": 174,
  "mediumCases": 96,
  "lowCases": 324,
  "totalPotentialRecovery": 7940710.13,
  "verifiedRecovery": 4762617.06,
  "remainingExposure": 3178093.07,
  "humanReviewRequired": 595
}
```

### Recovery Plan

```
GET /api/cases/:caseId/recovery
```

Returns the recovery plan and current recovery decision for a case.

### Complete Recovery

```
POST /api/cases/:caseId/recovery/complete
```

Records recovery completion and triggers deterministic verification.

### Verification

```
GET /api/cases/:caseId/verification
```



Example:

```json
{
  "verificationStatus": "recovered",
  "financialImpact": {
    "potentialRecovery": 56391.19,
    "verifiedRecovery": 56391.19,
    "remainingExposure": 0,
    "currency": "INR"
  }
}
```

## 🔄 Recovery State Machine

A recovery case follows a controlled lifecycle.

```
Pending
   │
   ▼
Human Review
   │
   ├──────────────► Rejected
   │
   ▼
Approved
   │
   ▼
Initiated
   │
   ▼
Completed
   │
   ▼
Verified
   │
   ▼
Recovered
```

This prevents an investigation from being treated as successful merely because a human clicked "Approve".


## 🔮 Future Improvements

Potential future extensions include:

- More anomaly types
- Real payment-provider integrations
- Automated reconciliation
- Recovery notifications
- Role-based approval workflows
- Advanced audit logs
- More financial data sources
- Recovery analytics
- Merchant-specific investigation rules
- Production-grade authentication
- Persistent production database
- Larger-scale agent orchestration


## ⭐ Final Summary

Money Detective transforms financial anomalies into actionable recovery workflows.

```
             MONEY DETECTIVE

                  🔎
                 FIND
                  ↓
             INVESTIGATE
                  ↓
               EXPLAIN
                  ↓
              HUMAN REVIEW
                  ↓
               RECOVER
                  ↓
               VERIFY
                  ↓
            REDUCE EXPOSURE
```


---
