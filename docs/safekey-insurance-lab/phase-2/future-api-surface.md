# Future API Surface

Conceptual API design for SafeKey Insurance Lab partner and governance integration. **Not implemented. Not exposed in production.**

SafeKey Core production APIs remain unchanged. The endpoints below describe a **future Lab edge** should research graduate under contract and regulatory approval.

---

## 1. Design principles

| Principle | Implication |
|-----------|-------------|
| **Read-heavy, write-restricted** | Partners consume context; they do not mutate Core cases |
| **Non-binding semantics** | All payloads include `advisory: true` unless explicit bind API (external insurer) |
| **Idempotency** | `Idempotency-Key` required on all POST |
| **Audit by default** | Every call → Audit Agent entry |
| **Scope tokens** | OAuth2 / mTLS client creds with case-level or portfolio-level scope |
| **Data minimization** | Field sets tiered by contract (see system-context insurer flow) |

---

## 2. API plane separation

```mermaid
flowchart LR
  subgraph CoreAPI["Core API (existing production — unchanged)"]
    AUTH[Auth / dashboard]
    CASE[Case CRUD — landlord]
    UPLOAD[Upload — tenant]
  end

  subgraph LabAPI["Lab API (future — conceptual)"]
    TE[/trust-events]
    RS[/risk-signals]
    AS[/audit-stream]
    CC[/claims-context]
    VS[/verification-status]
  end

  CoreAPI -.->|event export| TE
  LabAPI --> PARTNER[Insurer / MGA]
  LabAPI --> REG[Regulator read window]
```

**Core landlords and tenants never call Lab API.**

---

## 3. `/trust-events`

### Purpose

Ingest (internal) and query (authorized partners) normalized trust lifecycle events.

### Methods (conceptual)

| Method | Path | Caller | Description |
|--------|------|--------|-------------|
| `POST` | `/v1/trust-events` | Core event exporter (internal) | Append event |
| `GET` | `/v1/trust-events?case_id=` | Partner / analyst | Filtered event list |
| `GET` | `/v1/trust-events/{event_id}` | Partner / analyst | Single event |

### Event envelope (sketch)

```json
{
  "event_id": "uuid",
  "case_id": "uuid",
  "type": "documents.received",
  "timestamp_utc": "ISO-8601",
  "emitter": "safekey-core",
  "payload_hash": "sha256",
  "advisory": false,
  "jurisdiction": "GR"
}
```

### Permissions

| Role | POST | GET |
|------|------|-----|
| Core exporter | Yes | No |
| Insurer partner | No | Tier A+ |
| Regulator | No | Minimized subset |
| Landlord | **No** | **No** |

### Failure behavior

- Duplicate `event_id` → `409` with existing hash
- Exporter down → Core unaffected; events queued with backpressure

---

## 4. `/risk-signals`

### Purpose

Expose derived Lab agent signals at a point in time — **never raw model weights**.

### Methods (conceptual)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/risk-signals?case_id=` | Latest signal bundle |
| `GET` | `/v1/risk-signals?case_id=&at=` | Historical snapshot |
| `GET` | `/v1/risk-signals/{signal_id}` | Single signal detail |

### Signal bundle (sketch)

```json
{
  "case_id": "uuid",
  "snapshot_at": "ISO-8601",
  "advisory": true,
  "signals": [
    {
      "agent": "document_integrity",
      "policy_version": "2026.05.1",
      "type": "integrity_score",
      "value": 0.91,
      "human_review_required": false
    }
  ],
  "coherence_summary": {
    "score": 0.88,
    "gaps": ["employer_name_mismatch"]
  }
}
```

### Visibility tiers

| Tier | Fields |
|------|--------|
| T0 Internal | Full agent attributions |
| T1 Partner | Scores + gap codes |
| T2 Regulator | Aggregated counts only |

### Escalation

Signals with `human_review_required: true` **must not** appear in partner bind automation.

---

## 5. `/audit-stream`

### Purpose

Append-only audit access for compliance and regulator read windows.

### Methods (conceptual)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/audit-stream?case_id=` | Case audit chain |
| `GET` | `/v1/audit-stream/head` | Chain head hash |
| `POST` | `/v1/audit-stream/verify` | Verify hash chain integrity |

### Response constraints

- No PII in default regulator scope
- Each `GET` logged as new audit entry (meta-audit)
- Rate limited; break-glass token for incident response

### Failure behavior

- Hash mismatch → `500` + S4 internal escalation; partner export disabled globally

---

## 6. `/claims-context`

### Purpose

Research and partner simulation endpoint for **non-binding** claims context packages.

### Methods (conceptual)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/claims-context/simulate` | Generate SIMULATED package |
| `GET` | `/v1/claims-context/{simulation_id}` | Retrieve simulation |

### Request (sketch)

```json
{
  "verification_snapshot_ref": {
    "case_id": "uuid",
    "locked_at": "ISO-8601"
  },
  "claims_event": {
    "type": "rent_arrears",
    "simulated_occurrence_date": "ISO-8601"
  },
  "watermark": "SIMULATED"
}
```

### Response guardrails

- Always includes `"binding": false`
- Requires `Lab-Ops-Approval-Ref` header for external partner delivery (G7)
- Compliance Agent redaction applied before response

### Forbidden

- `POST /claims-context/bind` — **does not exist** in SafeKey scope
- Auto-payment triggers — **forbidden** (F9)

---

## 7. `/verification-status`

### Purpose

High-level verification state for partners without Core landlord UI exposure.

### Methods (conceptual)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/verification-status/{case_id}` | Summary status |
| `GET` | `/v1/verification-status/{case_id}/timeline` | State transitions |

### Status enum (conceptual)

| Status | Meaning |
|--------|---------|
| `draft` | Check not yet active |
| `awaiting_tenant` | Link active; awaiting uploads |
| `under_review` | Analyst review |
| `recommendation_ready` | Locked recommendation |
| `expired` | Link or case expired |

### Partner-safe fields only

```json
{
  "case_id": "uuid",
  "status": "recommendation_ready",
  "recommendation": "conditional",
  "score_band": "B",
  "pack_coverage": 0.92,
  "locked_at": "ISO-8601",
  "advisory": true
}
```

**Excluded:** tenant email, landlord email, document URLs, raw red flags with PII.

---

## 8. Cross-cutting API requirements

### Authentication

| Client type | Mechanism |
|-------------|-----------|
| Core exporter | Internal mTLS + service identity |
| Insurer partner | OAuth2 client credentials + contract scope |
| Regulator | Time-bounded JWT from Legal/DPO issuance |
| Lab ops | SSO + MFA |

### Rate limits (research targets)

| Endpoint | Limit |
|----------|-------|
| `/trust-events` GET | 600/min per client |
| `/risk-signals` GET | 300/min |
| `/audit-stream` GET | 60/min |
| `/claims-context` POST | 30/min |
| `/verification-status` GET | 600/min |

### Error model

```json
{
  "error": {
    "code": "COMPLIANCE_HOLD",
    "message": "Export blocked pending human approval",
    "advisory": true,
    "retry_after": null
  }
}
```

### Versioning

- URL prefix `/v1/` — breaking changes increment major
- Agent `policy_version` included in all signal responses

---

## 9. Explicit non-endpoints

The following will **not** be built on Lab API surface:

| Proposed (rejected) | Reason |
|---------------------|--------|
| `PATCH /core/cases/{id}` | Core boundary |
| `POST /landlord/notifications` | F2 governance |
| `POST /tenant/messages` | F2 governance |
| `DELETE /audit-stream/*` | F4 governance |
| `POST /recommendation/override` | F11 governance |

---

## 10. Graduation criteria (research → pilot)

Before any Lab API pilot (still not Core):

1. Governance F1–F12 enforced in integration tests
2. Regulator DPIA signed for field sets
3. Audit hash chain 30-day burn-in without breakage
4. Partner redaction test suite pass rate 100%
5. Explicit insurer contract defining non-binding semantics

**SafeKey Core deployment is independent of Lab API graduation.**
