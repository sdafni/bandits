# SafeKey Insurance Lab

**Status:** Research and institutional architecture documentation only.

## Boundary statement

| Layer | Purpose | Production scope |
|-------|---------|------------------|
| **SafeKey Core** | Calm rental trust workflow for landlords: check creation, tenant upload, review, recommendation | Production product (`getsafekey.app`) |
| **SafeKey Insurance Lab** | Underwriting intelligence, multi-agent orchestration, compliance depth, claims simulation, regulator-grade audit | Documentation and isolated research only |

This directory **does not** authorize changes to SafeKey Core routes, landlord UI, database migrations, or production APIs.

## Principles (preserved across all Lab phases)

1. **Human authority** — Landlords, analysts, and insurer underwriters retain final decision rights. Lab agents advise, flag, and record; they do not adjudicate autonomously.
2. **Separation of concerns** — Core emits trust events; Lab consumes them in a bounded research context.
3. **Immutable audit** — Material trust decisions leave append-only evidence suitable for internal QA and regulator review windows.
4. **Least privilege** — Agents receive the minimum visibility required for their scoped task.
5. **Fail closed** — Ambiguity, integrity failure, or policy conflict escalates to humans; agents do not guess through compliance gaps.

## Phase 2 index

| Document | Contents |
|----------|----------|
| [Phase 2 overview](./phase-2/README.md) | Scope, non-goals, reading order |
| [System context](./phase-2/system-context.md) | Actor maps, responsibility boundaries, trust lifecycle ownership |
| [Trust event flows](./phase-2/trust-event-flows.md) | Tenant onboarding, verification, anomaly, escalation, insurer review, audit trail |
| [Multi-agent topology](./phase-2/multi-agent-topology.md) | Agent definitions, permissions, failure behavior |
| [Governance](./phase-2/governance.md) | Forbidden actions, mandatory approvals, immutable records, regulator boundaries |
| [Claims simulation](./phase-2/claims-simulation.md) | Conceptual claims lifecycle and workflows |
| [Trust intelligence graph](./phase-2/trust-intelligence-graph.md) | Signal dimensions and coherence model |
| [Future API surface](./phase-2/future-api-surface.md) | Conceptual partner/regulator endpoints (not implemented) |

## Related Core documentation

- [SaaS positioning summary](../saas-positioning-summary.md) — Core product layers and partner bridge narrative
- [Roadmap V2](../roadmap-v2.md) — Core product roadmap (distinct from Lab research)
