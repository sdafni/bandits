# SafeKey Insurance Lab — Phase 2

**Institutional architecture layer (documentation only)**

## Phase 2 intent

Phase 2 defines how SafeKey **could** extend from rental screening infrastructure into insurer-grade trust intelligence—without collapsing Lab complexity into the landlord product.

Phase 2 answers:

- Who owns each stage of the trust lifecycle?
- Which events move between Core, Lab, partners, and regulators?
- Which autonomous agents may exist, and what are they forbidden from doing?
- How would claims context attach to prior verification evidence (simulation only)?
- What API surfaces might exist for partners **if** Lab graduates from research?

## Explicit non-goals (Phase 2)

- No production code, migrations, or UI in SafeKey Core
- No autonomous underwriting or binding coverage decisions
- No landlord-facing command centers, queues, or ops dashboards
- No deployment of `/trust-events`, `/risk-signals`, or related endpoints

## Reading order

1. [System context](./system-context.md) — actors and boundaries first
2. [Trust event flows](./trust-event-flows.md) — operational sequences
3. [Multi-agent topology](./multi-agent-topology.md) — agent contracts
4. [Governance](./governance.md) — hard limits and human gates
5. [Claims simulation](./claims-simulation.md) — downstream insurance context
6. [Trust intelligence graph](./trust-intelligence-graph.md) — signal model
7. [Future API surface](./future-api-surface.md) — conceptual integration plane

## Relationship to SafeKey Core

```mermaid
flowchart LR
  subgraph Core["SafeKey Core (production)"]
    LC[Landlord check]
    TU[Tenant upload portal]
    RV[Human review + recommendation]
  end

  subgraph Lab["Insurance Lab (research boundary)"]
    TE[Trust event ingestion]
    AG[Multi-agent analysis]
    CS[Claims simulation]
    AU[Audit & compliance plane]
  end

  subgraph External["External parties"]
    LL[Landlord / property operator]
    TN[Tenant applicant]
    IN[Insurer / MGA partner]
    RG[Regulator read window]
  end

  LL --> LC
  TN --> TU
  LC --> RV
  RV -.->|trust events (conceptual)| TE
  TE --> AG
  AG --> AU
  AG -.->|eligibility context only| IN
  AU -.->|bounded disclosure| RG
```

Core remains the **system of record for landlord workflow**. Lab is a **downstream intelligence and simulation layer** that must never rewrite Core UX or tenant-facing copy.
