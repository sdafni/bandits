# Trust Event Flows

Conceptual event-driven flows for SafeKey Insurance Lab Phase 2. **Documentation only.**

All flows assume:

- SafeKey Core remains the landlord-facing system of record
- Lab consumes **trust events** asynchronously
- Humans retain authority at every binding step

---

## Event taxonomy (conceptual)

| Event | Emitter | Lab subscribers |
|-------|---------|-----------------|
| `check.created` | Core | Compliance Agent (policy snapshot) |
| `upload.link_activated` | Core | Fraud Signal Agent |
| `documents.received` | Core | Document Integrity, Compliance, QA |
| `documents.batch_submitted` | Core | Document Integrity, Fraud Signal |
| `review.requested` | Core | QA Agent, Compliance Agent |
| `recommendation.drafted` | Core (analyst) | QA Agent, Risk Drift Agent |
| `recommendation.locked` | Core | Audit Agent, partner export (research) |
| `anomaly.detected` | Lab | Escalation flow (human) |
| `escalation.opened` / `escalation.resolved` | Lab | Audit Agent |
| `claims.context.simulated` | Lab | Claims simulation only |

---

## 1. Tenant onboarding flow

**Purpose:** Document how a tenant enters the trust lifecycle without Lab touching Core UX.

```mermaid
flowchart TD
  A[Landlord creates check in Core] --> B{Billing / link gate}
  B -->|Plan active| C[Core generates secure upload token]
  B -->|Preview / draft| D[Check saved — link blocked]
  C --> E[Landlord sends link to tenant]
  E --> F[Tenant opens /upload/token]
  F --> G{Token valid?}
  G -->|No| H[Expired / invalid page]
  G -->|Yes| I[Tenant sees property + requested docs]
  I --> J[Tenant submits profile + consent]
  J --> K[Core stores documents]
  K --> L[Core emits documents.received]
  L --> M[Lab: Document Integrity + Compliance observe]
```

### Ownership

| Step | Owner |
|------|-------|
| Link generation | Core |
| Tenant UX | Core |
| Consent capture | Core (tenant action) |
| Signal generation | Lab (advisory) |

### Lab constraints during onboarding

- Agents may **not** email tenants directly
- Agents may **not** alter requested document lists visible to tenant
- Fraud Agent may flag **link access anomalies** (velocity, geo, device) for human review

---

## 2. Verification flow

**Purpose:** Structured review from document receipt to locked recommendation.

```mermaid
flowchart TD
  A[documents.received] --> B[Analyst assigned in Core review desk]
  B --> C[Lab: QA Agent pre-checklist]
  C --> D[Lab: Document Integrity scores]
  D --> E[Lab: Compliance Agent policy pass]
  E --> F{Blocking anomaly?}
  F -->|Yes| G[Escalation flow]
  F -->|No| H[Analyst completes review in Core]
  H --> I[Analyst drafts recommendation]
  I --> J[Lab: QA Agent validates completeness]
  J --> K[Lab: Risk Drift Agent baseline compare]
  K --> L{Mandatory human approval gates}
  L -->|Pass| M[recommendation.locked in Core]
  L -->|Fail| N[Return to analyst with advisory notes]
  M --> O[Landlord notified via Core]
  M --> P[Audit Agent seals event chain]
```

### Human gates (mandatory)

- Analyst must explicitly lock recommendation (Core action)
- QA Agent **cannot** auto-approve incomplete packs
- Compliance Agent **cannot** clear regulatory flags without analyst acknowledgment

---

## 3. Anomaly flow

**Purpose:** Detect, classify, and route inconsistencies without auto-punitive action.

```mermaid
flowchart TD
  A[Signal threshold crossed] --> B[Anomaly record created in Lab]
  B --> C{Severity class}
  C -->|S1 Informational| D[Attach to case advisory panel]
  C -->|S2 Review required| E[Open escalation — analyst queue]
  C -->|S3 Integrity / fraud| F[Open escalation — fraud investigator]
  C -->|S4 Compliance| G[Open escalation — compliance lead]
  E --> H[Human investigates in Core + Lab read tools]
  F --> H
  G --> H
  H --> I{Resolution}
  I -->|False positive| J[Mark anomaly dismissed + reason]
  I -->|Confirmed| K[Analyst adjusts recommendation or requests re-upload]
  I -->|Policy breach| L[Case hold — legal notification path]
  J --> M[Audit Agent appends resolution]
  K --> M
  L --> M
```

### Anomaly categories (conceptual)

| Category | Example | Auto-action allowed |
|----------|---------|---------------------|
| Document integrity | Hash mismatch, tamper metadata | **No** — escalate only |
| Identity continuity | Name mismatch across docs | **No** |
| Timeline | Employment start after stated move-in | **No** |
| Behavioral | Impossible upload velocity | **No** — flag only |
| Compliance | Missing consent artifact | **No** — block lock until human confirms |

---

## 4. Escalation flow

**Purpose:** Standardize human takeover when agents cannot proceed safely.

```mermaid
stateDiagram-v2
  [*] --> Open: Agent or analyst opens
  Open --> Triaged: Ops lead assigns owner
  Triaged --> Investigating: Owner active
  Investigating --> PendingHuman: Awaiting named approver
  PendingHuman --> Resolved: Decision recorded
  PendingHuman --> Investigating: More evidence needed
  Resolved --> [*]: Audit entry sealed
```

### Escalation SLAs (research targets)

| Severity | Target triage | Approver |
|----------|---------------|----------|
| S2 | 4 business hours | Senior analyst |
| S3 | 1 business hour | Fraud investigator + analyst |
| S4 | Immediate queue | Compliance lead + DPO if PII involved |

### Escalation rights

| Role | Can open | Can resolve | Can downgrade severity |
|------|----------|-------------|------------------------|
| Lab agent | Yes (proposal) | **No** | **No** |
| Analyst | Yes | Yes (S2) | Yes with reason |
| Fraud investigator | Yes | Yes (S3) | Yes with reason |
| Compliance lead | Yes | Yes (S4) | Yes with audit note |
| Landlord | **No** | **No** | **No** |

---

## 5. Insurer review flow

**Purpose:** Conceptual handoff from locked recommendation to partner underwriting context. **Non-binding.**

```mermaid
flowchart LR
  A[recommendation.locked] --> B[Lab builds eligibility context package]
  B --> C[Compliance Agent redaction pass]
  C --> D[Document Integrity attestation summary]
  D --> E[Risk Drift baseline snapshot]
  E --> F{Partner contract tier}
  F -->|Tier A| G[Score + flags + case metadata]
  F -->|Tier B| H[+ document class manifest, no bytes]
  F -->|Tier C| I[+ tokenized doc refs with consent]
  G --> J[Insurer review workbench]
  H --> J
  I --> J
  J --> K[Underwriter decision — external system]
  K --> L[Optional: claims.context.simulated for Lab research]
```

### Insurer visibility defaults

| Field | Default visibility |
|-------|-------------------|
| Recommendation enum | Yes |
| Risk score | Yes (contractual) |
| Red flag summaries | Yes (human-authored + agent-attributed) |
| Raw document images | **No** unless Tier C + consent |
| Tenant contact details | **No** |
| Landlord PII | Minimized |

### Binding decision rule

> Insurer underwriter **always** owns bind / decline / conditional. Lab packages are **decision support**, not decision replacement.

---

## 6. Audit trail flow

**Purpose:** Append-only evidence chain from case creation through partner export and simulation.

```mermaid
flowchart TD
  A[Every Core state transition] --> B[TrustEvent emitted]
  B --> C[Audit Agent validates schema + ordering]
  C --> D[Immutable AuditEntry appended]
  D --> E[Hash chain link to prior entry]
  E --> F{Regulator read window request?}
  F -->|No| G[Internal retention store]
  F -->|Yes| H[Compliance Agent applies field minimization]
  H --> I[Time-bounded read token issued]
  I --> J[Regulator read-only view]
  J --> K[Access logged as AuditEntry]
```

### Audit entry minimum fields

- `entry_id`, `case_id`, `timestamp_utc`
- `actor_type` (human | agent | system)
- `actor_id` (pseudonymized for agents)
- `action`, `payload_hash`, `prior_entry_hash`
- `jurisdiction`, `retention_class`

### Immutability rules

- No `UPDATE` or `DELETE` on audit entries
- Corrections append superseding entries with reference to corrected `entry_id`
- Agent reasoning logs stored as hashed attachments, not inline mutable text

---

## Cross-flow orchestration

```mermaid
flowchart TB
  subgraph Onboarding
    O1[Tenant onboarding]
  end
  subgraph Verification
    V1[Verification]
  end
  subgraph Risk
    A1[Anomaly]
    E1[Escalation]
  end
  subgraph Partner
    I1[Insurer review]
  end
  subgraph Evidence
    AU1[Audit trail]
  end

  O1 --> V1
  V1 --> A1
  A1 --> E1
  E1 --> V1
  V1 --> I1
  O1 --> AU1
  V1 --> AU1
  A1 --> AU1
  E1 --> AU1
  I1 --> AU1
```

All flows terminate in **human-readable outcomes** for Core users and **immutable audit artifacts** for Lab governance.
