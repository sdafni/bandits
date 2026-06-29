# Athens venue duplicate audit

Normalization: NFKD, strip accents, lowercase, collapse punctuation/spaces, apostrophe variants.

| Metric | Count |
|--------|------:|
| Total venues | 318 |
| Unique (normalized name) | 279 |
| Duplicate clusters | 57 |
| Pre-resolution conflicts | 5 |
| **Post-resolution conflicts** | **0** |
| Rows inheriting sibling place_id | 6 |

## Pre-resolution conflicts (5)

### Lost (4 records) — ✓ unified

| # | Name | Place ID (raw) | Pre | Post place_id | Post | Source |
|---|------|----------------|-----|---------------|------|--------|
| 1 | 1888 Athens | `—` | No Google listing | `ChIJ5UhWblK9oRQRLfYS5u3PSfs` | Google OK | sibling ← Lost |
| 170 | Lost | `ChIJ5UhWblK9oRQRLfYS5u3PSfs` | Google OK | `ChIJ5UhWblK9oRQRLfYS5u3PSfs` | Google OK | self |
| 171 | Lost | `ChIJ5UhWblK9oRQRLfYS5u3PSfs` | Google OK | `ChIJ5UhWblK9oRQRLfYS5u3PSfs` | Google OK | self |
| 172 | Lost | `ChIJ5UhWblK9oRQRLfYS5u3PSfs` | Google OK | `ChIJ5UhWblK9oRQRLfYS5u3PSfs` | Google OK | self |

**Reason:** 3 row(s) have google_place_id; 1 missing it (same duplicate cluster)

**Fix:** Resolver inherits place_id from sibling — no manual fix needed for review UI.

### Dexameni Outdoor Cinema (4 records) — ✓ unified

| # | Name | Place ID (raw) | Pre | Post place_id | Post | Source |
|---|------|----------------|-----|---------------|------|--------|
| 71 | Cine Dexameni Open Air Cinema | `—` | No Google listing | `ChIJ0XLwm0e9oRQR2t1yAkLYZbg` | Google OK | sibling ← Dexameni Outdoor Cinema |
| 87 | Dexameni Outdoor Cinema | `ChIJ0XLwm0e9oRQR2t1yAkLYZbg` | Google OK | `ChIJ0XLwm0e9oRQR2t1yAkLYZbg` | Google OK | self |
| 88 | Dexameni Outdoor Cinema | `ChIJ0XLwm0e9oRQR2t1yAkLYZbg` | Google OK | `ChIJ0XLwm0e9oRQR2t1yAkLYZbg` | Google OK | self |
| 89 | Dexameni Outdoor Cinema | `ChIJ0XLwm0e9oRQR2t1yAkLYZbg` | Google OK | `ChIJ0XLwm0e9oRQR2t1yAkLYZbg` | Google OK | self |

**Reason:** 3 row(s) have google_place_id; 1 missing it (same duplicate cluster)

**Fix:** Resolver inherits place_id from sibling — no manual fix needed for review UI.

### Impact Hub Athens (3 records) — ✓ unified

| # | Name | Place ID (raw) | Pre | Post place_id | Post | Source |
|---|------|----------------|-----|---------------|------|--------|
| 130 | Impact Hub Athens | `ChIJjZ2TCiO9oRQRx928tDmI5f8` | Google OK | `ChIJjZ2TCiO9oRQRx928tDmI5f8` | Google OK | self |
| 276 | The Agora Project | `ChIJN9cTFSifoRQRHwhYjOzFGlw` | Google OK | `ChIJjZ2TCiO9oRQRx928tDmI5f8` | Google OK | cluster_canonical ← Impact Hub Athens |
| 277 | The Agora Project (Impact Hub) | `—` | No Google listing | `ChIJjZ2TCiO9oRQRx928tDmI5f8` | Google OK | sibling ← Impact Hub Athens |

**Reason:** 2 row(s) have google_place_id; 1 missing it (same duplicate cluster)

**Fix:** Resolver inherits place_id from sibling — no manual fix needed for review UI.

### Ekiben Kitchen (2 records) — ✓ unified

| # | Name | Place ID (raw) | Pre | Post place_id | Post | Source |
|---|------|----------------|-----|---------------|------|--------|
| 95 | Ekiben Japanese Street Food | `—` | No Google listing | `ChIJc3ka65-9oRQRyoZlct533n8` | Google OK | sibling ← Ekiben Kitchen |
| 96 | Ekiben Kitchen | `ChIJc3ka65-9oRQRyoZlct533n8` | Google OK | `ChIJc3ka65-9oRQRyoZlct533n8` | Google OK | self |

**Reason:** 1 row(s) have google_place_id; 1 missing it (same duplicate cluster)

**Fix:** Resolver inherits place_id from sibling — no manual fix needed for review UI.

### Handpicked Cherries (2 records) — ✓ unified

| # | Name | Place ID (raw) | Pre | Post place_id | Post | Source |
|---|------|----------------|-----|---------------|------|--------|
| 121 | Handpicked Cherries | `—` | No Google listing | `ChIJAZO78gK9oRQRMdDdkBeSvd4` | Google OK | sibling ← Handpicked Cherries |
| 122 | Handpicked Cherries | `ChIJAZO78gK9oRQRMdDdkBeSvd4` | Google OK | `ChIJAZO78gK9oRQRMdDdkBeSvd4` | Google OK | self |

**Reason:** 1 row(s) have google_place_id; 1 missing it (same duplicate cluster)

**Fix:** Resolver inherits place_id from sibling — no manual fix needed for review UI.

