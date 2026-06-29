/**
 * Resolve canonical google_place_id across duplicate Athens venue rows.
 * Used by review pack builder, review server, and duplicate audit.
 */
const STOP_TOKENS = new Set([
  'the', 'and', 'bar', 'cafe', 'coffee', 'restaurant', 'club', 'hotel', 'athens', 'greece',
  'athina', 'open', 'air', 'outdoor', 'store', 'shop', 'project', 'national', 'museum',
]);

export function normalizeVenueName(raw) {
  return String(raw ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAddress(raw) {
  return String(raw ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Street + number core — split on comma BEFORE stripping punctuation */
export function addressStem(raw) {
  const rawStr = String(raw ?? '').trim();
  if (!rawStr) return '';
  const firstSegment = rawStr.split(',')[0].trim();
  let stem = normalizeAddress(firstSegment);
  if (stem.length >= 6) return stem;
  stem = normalizeAddress(rawStr)
    .replace(/\b(greece|athens|athina)\b/g, '')
    .replace(/\b\d{3}\s*\d{2,3}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stem.length >= 6 ? stem : '';
}

export function coordKey(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `${la.toFixed(5)},${lo.toFixed(5)}`;
}

export function parseGallery(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j.filter(Boolean) : [];
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function googlePhotoCount(row) {
  const urls = [row.image_url, ...parseGallery(row.image_gallery)].filter(Boolean);
  return urls.filter((u) => String(u).includes('places.googleapis.com')).length;
}

export function nameTokens(name) {
  return normalizeVenueName(name)
    .split(' ')
    .filter((t) => t.length >= 4 && !STOP_TOKENS.has(t));
}

export function namesLikelySameVenue(a, b) {
  const na = normalizeVenueName(a);
  const nb = normalizeVenueName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  for (const t of ta) if (tb.has(t)) return true;
  return false;
}

function rowQuality(row) {
  let s = 0;
  if (String(row.google_place_id ?? '').trim()) s += 1000;
  s += googlePhotoCount(row) * 10;
  if (String(row.address ?? '').trim()) s += 5;
  if (String(row.image_url ?? '').includes('places.googleapis.com')) s += 3;
  return s;
}

class UnionFind {
  constructor() {
    this.parent = new Map();
  }
  find(id) {
    if (!this.parent.has(id)) this.parent.set(id, id);
    if (this.parent.get(id) !== id) this.parent.set(id, this.find(this.parent.get(id)));
    return this.parent.get(id);
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

function buildClusters(rows) {
  const uf = new UnionFind();
  for (const r of rows) uf.find(r.id);

  const byNormName = new Map();
  const byPlaceId = new Map();
  const byAddressStem = new Map();
  const byCoord = new Map();

  for (const r of rows) {
    const nn = normalizeVenueName(r.name);
    if (nn.length >= 3) {
      if (!byNormName.has(nn)) byNormName.set(nn, []);
      byNormName.get(nn).push(r);
    }
    const pid = String(r.google_place_id ?? '').trim();
    if (pid) {
      if (!byPlaceId.has(pid)) byPlaceId.set(pid, []);
      byPlaceId.get(pid).push(r);
    }
    const stem = addressStem(r.address);
    if (stem.length >= 6) {
      if (!byAddressStem.has(stem)) byAddressStem.set(stem, []);
      byAddressStem.get(stem).push(r);
    }
    const ck = coordKey(r.location_lat, r.location_lng);
    if (ck) {
      if (!byCoord.has(ck)) byCoord.set(ck, []);
      byCoord.get(ck).push(r);
    }
  }

  for (const [, grp] of byNormName) {
    for (let i = 1; i < grp.length; i++) uf.union(grp[0].id, grp[i].id);
  }
  for (const [, grp] of byPlaceId) {
    for (let i = 1; i < grp.length; i++) uf.union(grp[0].id, grp[i].id);
  }

  for (const [, grp] of byAddressStem) {
    for (let i = 0; i < grp.length; i++) {
      for (let j = i + 1; j < grp.length; j++) {
        if (namesLikelySameVenue(grp[i].name, grp[j].name)) uf.union(grp[i].id, grp[j].id);
      }
    }
  }

  for (const [, grp] of byCoord) {
    for (let i = 0; i < grp.length; i++) {
      for (let j = i + 1; j < grp.length; j++) {
        const stemA = addressStem(grp[i].address);
        const stemB = addressStem(grp[j].address);
        if (stemA && stemB && stemA === stemB && namesLikelySameVenue(grp[i].name, grp[j].name)) {
          uf.union(grp[i].id, grp[j].id);
        }
      }
    }
  }

  // Same street address + coordinates: propagate place_id to orphan rows (renamed venues)
  for (const [, grp] of byCoord) {
    if (grp.length < 2) continue;
    for (let i = 0; i < grp.length; i++) {
      for (let j = i + 1; j < grp.length; j++) {
        const stemA = addressStem(grp[i].address);
        const stemB = addressStem(grp[j].address);
        if (!stemA || !stemB || stemA.length < 6 || stemA !== stemB) continue;
        const pidA = String(grp[i].google_place_id ?? '').trim();
        const pidB = String(grp[j].google_place_id ?? '').trim();
        const orphanPair = (!pidA && pidB) || (pidA && !pidB);
        if (orphanPair) uf.union(grp[i].id, grp[j].id);
      }
    }
  }

  const clusters = new Map();
  for (const r of rows) {
    const root = uf.find(r.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(r);
  }
  return [...clusters.values()];
}

function pickCanonicalPlaceId(members) {
  const byPid = new Map();
  for (const m of members) {
    const pid = String(m.google_place_id ?? '').trim();
    if (!pid) continue;
    if (!byPid.has(pid)) byPid.set(pid, { count: 0, quality: 0 });
    const e = byPid.get(pid);
    e.count += 1;
    e.quality += rowQuality(m);
  }
  if (byPid.size === 0) return { placeId: null, conflict: false, allPlaceIds: [] };
  const allPlaceIds = [...byPid.keys()];
  if (byPid.size === 1) return { placeId: allPlaceIds[0], conflict: false, allPlaceIds };
  const sorted = [...byPid.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].quality - a[1].quality,
  );
  return { placeId: sorted[0][0], conflict: true, allPlaceIds };
}

function bestGalleryUrls(members, placeId) {
  const seen = new Set();
  const out = [];
  const ranked = [...members].sort((a, b) => rowQuality(b) - rowQuality(a));
  for (const m of ranked) {
    const pid = String(m.google_place_id ?? '').trim();
    if (placeId && pid && pid !== placeId) continue;
    for (const url of [m.image_url, ...parseGallery(m.image_gallery)]) {
      const u = String(url ?? '').trim();
      if (!u.includes('places.googleapis.com')) continue;
      const photoM = u.match(/\/photos\/([^/]+)\//);
      const key = photoM?.[1] ?? u;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(u);
    }
  }
  return out;
}

/**
 * @param {Array<{id,name,address,google_place_id,image_url,image_gallery,location_lat?,location_lng?}>} rows
 */
export function buildVenueGoogleResolution(rows) {
  const clusters = buildClusters(rows);
  const resolutionByEventId = new Map();
  const clusterSummaries = [];

  for (const members of clusters) {
    const canonical = members.reduce((best, m) => (rowQuality(m) > rowQuality(best) ? m : best), members[0]);
    const { placeId, conflict, allPlaceIds } = pickCanonicalPlaceId(members);
    const galleryUrls = bestGalleryUrls(members, placeId);
    const clusterKey = normalizeVenueName(canonical.name) || addressStem(canonical.address) || canonical.id;

    clusterSummaries.push({
      clusterKey,
      size: members.length,
      canonicalEventId: canonical.id,
      canonicalName: canonical.name,
      resolvedPlaceId: placeId,
      placeIdConflict: conflict,
      conflictingPlaceIds: conflict ? allPlaceIds : [],
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        googlePlaceId: m.google_place_id ?? null,
        lookup: lookupLabel(m),
      })),
    });

    for (const m of members) {
      const ownPid = String(m.google_place_id ?? '').trim();
      let source = 'self';
      let inheritedFrom = null;
      if (placeId) {
        if (!ownPid) {
          source = 'sibling';
          inheritedFrom = canonical.name;
        } else if (ownPid !== placeId) {
          source = 'cluster_canonical';
          inheritedFrom = canonical.name;
        }
      }
      resolutionByEventId.set(m.id, {
        eventId: m.id,
        venueName: m.name,
        ownPlaceId: ownPid || null,
        resolvedPlaceId: placeId,
        resolvedGalleryUrls: galleryUrls,
        source,
        sourceEventId: source === 'self' && ownPid === placeId ? m.id : canonical.id,
        inheritedFrom,
        clusterKey,
        clusterSize: members.length,
        placeIdConflict: conflict,
        conflictingPlaceIds: conflict ? allPlaceIds : [],
      });
    }
  }

  return { resolutionByEventId, clusters: clusterSummaries };
}

export function lookupLabel(row) {
  const pid = String(row.google_place_id ?? '').trim();
  const photos = googlePhotoCount(row);
  if (pid && photos > 0) return 'google_ok';
  if (pid) return 'place_id_no_gallery';
  if (photos > 0) return 'photos_no_place_id';
  return 'no_listing';
}

export function lookupLabelHuman(code) {
  const m = {
    google_ok: 'Google OK',
    place_id_no_gallery: 'Place ID but empty gallery',
    photos_no_place_id: 'Gallery photos but no place_id',
    no_listing: 'No Google listing',
  };
  return m[code] ?? code;
}

export function resolvedLookupLabel(resolution) {
  if (resolution.resolvedPlaceId) return 'google_ok';
  if (resolution.resolvedGalleryUrls?.length) return 'photos_no_place_id';
  return 'no_listing';
}
