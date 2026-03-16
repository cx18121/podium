# Phase 8: Schema Migration + WPM Windows - Research

**Researched:** 2026-03-16
**Domain:** Dexie.js IndexedDB schema versioning, TypeScript interface evolution, windowed WPM computation
**Confidence:** HIGH

---

## Summary

Phase 8 is the prerequisite gate for all v2.0 features. It has two distinct jobs: (1) bump the Dexie schema from v2 to v3, adding the three new fields (`wpmWindows`, `whisperFillers`, `whisperStatus`) to the `Session` TypeScript interface; and (2) implement a pure `calculateWPMWindows()` function that buckets transcript segments into 30-second windows and writes the result to the session record at save time.

The current codebase sits at Dexie `db.version(2)` with an identical stores string to v1 (added in Phase 6 for the `transcript` field). The pattern for adding fields that are not indexed is already established: add a new `db.version(N).stores({ sessions: '++id, createdAt, title' })` block with the same stores string. Since FOUND-01 explicitly states "v1.0 sessions cleared on upgrade (no backward compatibility required)", an `.upgrade()` callback calling `tx.table('sessions').clear()` is the correct approach — it is simpler than trying to migrate legacy data that lacks all required fields.

The WPM windowing algorithm is a pure bucketing function. Each `TranscriptSegment` has a `timestampMs` field. The algorithm assigns each final segment to the 30-second bucket `Math.floor(timestampMs / 30000)`, counts words per bucket, then divides by the bucket's actual covered duration (clamped to session duration) to get WPM. This is straightforward and fully testable without any browser API.

**Primary recommendation:** Add `db.version(3)` with `.upgrade(tx => tx.table('sessions').clear())`, extend the `Session` interface with three optional fields, add `calculateWPMWindows()` to `src/analysis/pacing.ts`, and wire the call into `handleSaveName` in `App.tsx`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Dexie schema migrated to v3 with new fields (`whisperFillers`, `whisperStatus`, `wpmWindows`); v1.0 sessions cleared on upgrade (no backward compatibility required) | Dexie `version(3).stores(...).upgrade()` pattern with `tx.table('sessions').clear()` achieves this; TypeScript interface extension with optional fields is additive |
| FOUND-02 | WPM per 30s window calculated at session end and stored in `wpmWindows` for chart display | `calculateWPMWindows()` pure function over `TranscriptSegment[]` + `durationMs`; called in `handleSaveName` before `db.sessions.add()` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dexie | ^4.3.0 (already installed) | IndexedDB schema versioning and migration | Already the project's data layer; version upgrade is the documented Dexie pattern |
| fake-indexeddb | ^6.2.5 (already installed) | In-process IndexedDB for Vitest tests | Already used in `db.test.ts`; no additional install required |
| vitest | ^4.1.0 (already installed) | Unit tests for pure functions | Project standard; pool=vmThreads already configured for WSL2 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript `?:` optional fields | n/a | Mark `whisperFillers`, `whisperStatus` as optional on `Session` | Fields are undefined until Phase 13 populates them — optional is correct |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clear sessions on upgrade | Migrate each record | Migration is complex — v1 sessions lack required fields and the requirement explicitly says no backward compatibility |
| `upgrade()` clear | `db.delete()` + reopen | `db.delete()` approach is hacky (noted in Dexie GitHub issue #349); `tx.table('sessions').clear()` is the supported path |

**Installation:**
No new packages needed — all dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure
The phase touches exactly three files and adds one new file:

```
src/
├── db/
│   └── db.ts                  # Add db.version(3), extend Session interface
├── analysis/
│   └── pacing.ts              # Add calculateWPMWindows() pure function
│   └── pacing.test.ts         # Add unit tests for calculateWPMWindows()
└── App.tsx                    # Wire calculateWPMWindows() into handleSaveName
```

A dedicated `src/db/db.test.ts` update is also needed to verify that new sessions return `wpmWindows` as an array (not undefined).

### Pattern 1: Dexie Schema Version Bump with Clear

**What:** Add a new version block above all existing `db.version()` calls, with the same stores string (since new fields are not indexed), plus an `.upgrade()` callback that clears the sessions table.

**When to use:** When new fields are added to stored objects but the fields are not indexed (not part of the stores string), AND when backward compatibility with old records is not required.

**Example:**
```typescript
// Source: Dexie.org docs — Version.upgrade() pattern + GitHub issue #349 clear pattern
db.version(3).stores({
  sessions: '++id, createdAt, title',
}).upgrade(tx => {
  // FOUND-01: v1.0 sessions cleared — no backward compatibility required
  return tx.table('sessions').clear();
});
```

**Critical rule:** The stores string `'++id, createdAt, title'` must be IDENTICAL to v1 and v2 — new fields (`wpmWindows`, `whisperFillers`, `whisperStatus`) are data, not indexes. Adding them to the stores string would be wrong and is explicitly forbidden in the codebase comments.

### Pattern 2: TypeScript Interface Extension with Optional Fields

**What:** Add three optional fields to the `Session` interface in `db.ts`. Optional means `field?: Type` — TypeScript will type them as `Type | undefined`, which is correct because:
- `wpmWindows` is undefined on sessions loaded from IndexedDB before Phase 8 runs (Phase 12 must handle this gracefully).
- `whisperFillers` and `whisperStatus` remain undefined until Phase 13 populates them.

**Example:**
```typescript
// Source: TypeScript docs + existing project pattern (transcript?: TranscriptSegment[])
export interface WPMWindow {
  startMs: number;    // window start (e.g. 0, 30000, 60000)
  endMs: number;      // window end (clamped to session duration)
  wpm: number;        // words per minute for this window
  wordCount: number;  // raw count (useful for debugging / Phase 12 chart)
}

export interface Session {
  id: number;
  title: string;
  createdAt: Date;
  durationMs: number;
  videoBlob: Blob;
  eventLog: SessionEvent[];
  scorecard: Scorecard | null;
  transcript?: TranscriptSegment[];         // Phase 6 (existing)
  wpmWindows?: WPMWindow[];                 // Phase 8 — FOUND-02
  whisperFillers?: WhisperFillerResult;     // Phase 13 — WHIS-01
  whisperStatus?: 'pending' | 'complete' | 'failed'; // Phase 13 — WHIS-03
}
```

Note: `WhisperFillerResult` can be typed as a stub interface now (with a comment pointing to Phase 13) so the field is present in the schema without requiring Phase 13 implementation. Alternatively, type it as `unknown` or `Record<string, unknown>` until Phase 13 defines the real shape.

### Pattern 3: calculateWPMWindows() Pure Function

**What:** Takes `TranscriptSegment[]` and `durationMs: number`, returns `WPMWindow[]`. No side effects, no browser APIs, fully testable.

**Algorithm:**
1. Filter to final segments only (`isFinal === true`).
2. For each segment, compute bucket index: `Math.floor(segment.timestampMs / 30000)`.
3. Group segments by bucket index. Count words (split on whitespace, filter empty).
4. For each bucket, compute `startMs = bucketIdx * 30000`, `endMs = Math.min((bucketIdx + 1) * 30000, durationMs)`.
5. WPM = `wordCount / ((endMs - startMs) / 60000)`. Guard against zero-duration bucket (return 0).
6. Return array sorted by `startMs` ascending.

**Edge cases to handle in tests:**
- Empty transcript → return `[]`
- Single short segment (< 30s session) → one window, correct duration clamping
- Segment at exactly 30000ms → goes into window 1, not window 0
- No final segments (only interim) → return `[]`

**Example:**
```typescript
// Source: derived from existing calculateWPM() pattern in src/analysis/pacing.ts
export function calculateWPMWindows(
  segments: TranscriptSegment[],
  durationMs: number
): WPMWindow[] {
  const finalSegments = segments.filter(s => s.isFinal);
  if (finalSegments.length === 0) return [];

  const buckets = new Map<number, string[]>();
  for (const seg of finalSegments) {
    const idx = Math.floor(seg.timestampMs / 30000);
    if (!buckets.has(idx)) buckets.set(idx, []);
    buckets.get(idx)!.push(seg.text);
  }

  const windows: WPMWindow[] = [];
  for (const [idx, texts] of buckets) {
    const startMs = idx * 30000;
    const endMs = Math.min((idx + 1) * 30000, durationMs);
    const windowDurationMs = endMs - startMs;
    const wordCount = texts.join(' ').trim().split(/\s+/).filter(Boolean).length;
    const wpm = windowDurationMs > 0
      ? Math.round(wordCount / (windowDurationMs / 60000))
      : 0;
    windows.push({ startMs, endMs, wpm, wordCount });
  }

  return windows.sort((a, b) => a.startMs - b.startMs);
}
```

### Pattern 4: Wiring calculateWPMWindows() into App.tsx

**What:** In `handleSaveName`, after `calculateWPM()` is called, also call `calculateWPMWindows()` and pass the result to `db.sessions.add()`.

**Where in App.tsx:**
```typescript
// After existing: const wpm = calculateWPM(segments, durationMs);
const wpmWindows = calculateWPMWindows(segments, durationMs);

// In db.sessions.add():
const sessionId = await db.sessions.add({
  title,
  createdAt: new Date(),
  durationMs,
  videoBlob: fixedBlob,
  eventLog,
  scorecard: null,
  transcript: segments,
  wpmWindows,          // FOUND-02: add here
});
```

### Anti-Patterns to Avoid

- **Adding `wpmWindows` or `whisperFillers` to the stores() index string:** These are arrays/objects — they cannot be Dexie indexes. The existing comment in `db.ts` documents this rule.
- **Skipping the version(3) block entirely and just adding fields to the interface:** Without a version bump, existing v2 databases will not run an upgrade callback and any pre-existing sessions will not be cleared. New records will save fine, but the Dexie internals track the schema version for future migrations.
- **Using `db.delete()` inside the upgrade callback:** This is the "hacky" approach documented in Dexie GitHub issues — it attempts to delete and reopen the database within an upgrade transaction, which is unreliable. Use `tx.table('sessions').clear()` instead.
- **Typing whisperFillers as `any`:** Use a stub interface or `unknown` so Phase 13 is forced to define the real shape, not accidentally accept malformed data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB schema versioning | Custom version tracking in localStorage | Dexie `db.version(N).stores().upgrade()` | Dexie handles the IndexedDB `onupgradeneeded` event, transaction management, and concurrent-tab version conflicts |
| Running upgrade on stale clients | Manual version checks on app start | Dexie's version system | Dexie automatically runs upgrade callbacks in version order when older schema detected |
| WPM bucketing | External analytics library | `calculateWPMWindows()` pure function | The algorithm is 15 lines of vanilla TS — no library adds value here |

**Key insight:** The complexity of Dexie schema migrations is all in the "don't skip version blocks" rule — not in the implementation. The actual code is minimal.

---

## Common Pitfalls

### Pitfall 1: VersionError on App Load After Migration
**What goes wrong:** `VersionError: The requested version (3) is less than the existing version (N)` — or conversely, opening the database with an old version after a new tab has already upgraded it.
**Why it happens:** IndexedDB enforces monotonically increasing version numbers. If code is rolled back or a stale tab is open, the version stored in IndexedDB is higher than the code's declared version.
**How to avoid:** Always keep ALL version blocks in the code (v1, v2, v3). Never remove old version blocks. This is the same pattern already in `db.ts` (v1 and v2 are both present).
**Warning signs:** `VersionError` in the browser console on app load.

### Pitfall 2: Missing version(3) Block Causes Silent Schema Mismatch
**What goes wrong:** New sessions save `wpmWindows` correctly (TypeScript doesn't enforce what's in IndexedDB), but when the session is read back, `wpmWindows` is `undefined` for sessions saved before Phase 8 — and old sessions were never cleared because no upgrade callback ran.
**Why it happens:** Forgetting the version bump means Dexie never runs the `upgrade()` callback. The database stays at v2 version in IndexedDB.
**How to avoid:** Always add a version block when the intended data shape changes, even if the stores string is identical.
**Warning signs:** Success criterion 1 fails — `db.sessions.get(id)` returns `wpmWindows: undefined` after recording.

### Pitfall 3: Clearing Sessions Before the Version Block Stores() Call
**What goes wrong:** The `.upgrade()` callback references a table that doesn't exist in the new schema definition, throwing a schema error.
**Why it happens:** Misunderstanding that `.upgrade()` must be chained after `.stores()`.
**How to avoid:** Always write `db.version(N).stores({...}).upgrade(tx => {...})` — stores first, upgrade second.

### Pitfall 4: calculateWPMWindows Returning 0-WPM Windows for Last Partial Window
**What goes wrong:** The final window of a session (e.g. seconds 60–75 of a 75-second session) has only 15 seconds of data, but if `endMs` is not clamped to `durationMs`, the denominator uses 30 seconds, producing a WPM that is half the real rate.
**Why it happens:** Using `(idx + 1) * 30000` as `endMs` without clamping to `durationMs`.
**How to avoid:** `endMs = Math.min((idx + 1) * 30000, durationMs)` — already in the recommended algorithm above.
**Warning signs:** Last window consistently shows WPM roughly half of surrounding windows.

### Pitfall 5: fake-indexeddb Not Resetting Between Tests
**What goes wrong:** Dexie database state bleeds between tests — a session saved in one test shows up in another.
**Why it happens:** `fake-indexeddb/auto` patches the global `indexedDB` once but doesn't reset between tests.
**How to avoid:** The existing `db.test.ts` already uses `beforeEach(() => db.sessions.clear())`. Follow the same pattern in new db tests for Phase 8.
**Warning signs:** Test order-dependent failures.

---

## Code Examples

Verified patterns from the existing codebase and Dexie documentation:

### Dexie Version Upgrade with Clear
```typescript
// Source: Dexie.org Version.upgrade() docs + GitHub dexie/Dexie.js discussion #2214
// Pattern: clear table on upgrade when no backward compatibility needed
db.version(3).stores({
  sessions: '++id, createdAt, title',
}).upgrade(tx => {
  return tx.table('sessions').clear();
});
```

### Accessing the Transaction in upgrade()
```typescript
// Source: Dexie.org Version.upgrade() docs
// tx is a Transaction object with a .table(name) method
// .clear() returns a Promise — must be returned so Dexie awaits it
db.version(3).stores({ ... }).upgrade(tx => {
  return tx.table('sessions').clear();
  // OR for multiple tables:
  // return Promise.all([tx.table('a').clear(), tx.table('b').clear()]);
});
```

### WPM Window Pure Function (full implementation)
```typescript
// Source: derived from calculateWPM() in src/analysis/pacing.ts
export function calculateWPMWindows(
  segments: TranscriptSegment[],
  durationMs: number
): WPMWindow[] {
  const finalSegments = segments.filter(s => s.isFinal);
  if (finalSegments.length === 0) return [];

  const buckets = new Map<number, string[]>();
  for (const seg of finalSegments) {
    const idx = Math.floor(seg.timestampMs / 30000);
    if (!buckets.has(idx)) buckets.set(idx, []);
    buckets.get(idx)!.push(seg.text);
  }

  const windows: WPMWindow[] = [];
  for (const [idx, texts] of buckets) {
    const startMs = idx * 30000;
    const endMs = Math.min((idx + 1) * 30000, durationMs);
    const windowDurationMs = endMs - startMs;
    const wordCount = texts.join(' ').trim().split(/\s+/).filter(Boolean).length;
    const wpm = windowDurationMs > 0
      ? Math.round(wordCount / (windowDurationMs / 60000))
      : 0;
    windows.push({ startMs, endMs, wpm, wordCount });
  }

  return windows.sort((a, b) => a.startMs - b.startMs);
}
```

### Test Pattern for calculateWPMWindows (unit)
```typescript
// Source: existing pacing.test.ts pattern — same file, same imports
it('returns one window for a 30s session with 60 words', () => {
  const segments: TranscriptSegment[] = [
    { text: Array(60).fill('word').join(' '), timestampMs: 5000, isFinal: true },
  ];
  const windows = calculateWPMWindows(segments, 30000);
  expect(windows).toHaveLength(1);
  expect(windows[0].wpm).toBe(120); // 60 words / 0.5 min = 120 wpm
  expect(windows[0].startMs).toBe(0);
  expect(windows[0].endMs).toBe(30000);
});

it('returns empty array for empty segments', () => {
  expect(calculateWPMWindows([], 60000)).toEqual([]);
});

it('clamps last window endMs to durationMs', () => {
  const segments: TranscriptSegment[] = [
    { text: Array(10).fill('word').join(' '), timestampMs: 65000, isFinal: true },
  ];
  // Session is 75s, last window is 60–75s (15s, not 30s)
  const windows = calculateWPMWindows(segments, 75000);
  const last = windows[windows.length - 1];
  expect(last.endMs).toBe(75000);
  expect(last.startMs).toBe(60000);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Schema v2 with only `transcript` optional | Schema v3 adds `wpmWindows`, `whisperFillers`, `whisperStatus` | Phase 8 | All downstream v2.0 phases read these fields from db |
| Single wpm_snapshot event (session average) | Per-window WPM array stored in `wpmWindows` | Phase 8 | Phase 12 WPM chart becomes possible |
| No Whisper fields in schema | `whisperFillers` + `whisperStatus` stubs present | Phase 8 | Phase 13 can read/write without another schema migration |

**Deprecated/outdated:**
- Single-number WPM approach (wpm_snapshot event) is NOT removed in Phase 8 — the event log still has it and `scorePacing()` still reads it. Phase 8 adds windowed data alongside the existing average.

---

## Open Questions

1. **WhisperFillerResult type shape for Phase 8 stub**
   - What we know: Phase 13 will need `byType: Record<string, number>` at minimum (Phase 11 FillerBreakdown panel reads `whisperFillers.byType`).
   - What's unclear: Whether Phase 13 needs more fields (confidence scores, timestamps per word).
   - Recommendation: Define a minimal `WhisperFillerResult` interface now with `byType: Record<string, number>` and a comment marking it as a Phase 13 stub. This satisfies Phase 11's need without over-engineering.

2. **Whether to gap-fill missing 30-second windows**
   - What we know: If a speaker is silent for 60+ seconds, no transcript segments will fall in that window bucket — it simply won't appear in the `wpmWindows` array.
   - What's unclear: Phase 12 chart display may want explicit zero-WPM windows to show gaps on the chart.
   - Recommendation: Do NOT gap-fill in Phase 8. Return only windows with data. Phase 12 can handle gap-filling when rendering the chart — it has access to `durationMs` and can infer which windows are missing.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | vite.config.ts (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| Quick run command | `npx vitest run src/analysis/pacing.test.ts src/db/db.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Schema v3 exists; existing sessions cleared on upgrade; no VersionError on open | unit (db) | `npx vitest run src/db/db.test.ts` | ✅ exists, needs new cases |
| FOUND-01 | `whisperFillers` and `whisperStatus` fields exist as optional on Session type | unit (db) | `npx vitest run src/db/db.test.ts` | ✅ exists, needs new cases |
| FOUND-02 | `calculateWPMWindows()` returns correct bucketed windows given transcript | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ exists, needs new cases |
| FOUND-02 | `wpmWindows` is saved and retrieved from IndexedDB as an array | unit (db) | `npx vitest run src/db/db.test.ts` | ✅ exists, needs new cases |

### Sampling Rate
- **Per task commit:** `npx vitest run src/analysis/pacing.test.ts src/db/db.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. New test cases are added to existing files (`pacing.test.ts`, `db.test.ts`), not new files.

---

## Sources

### Primary (HIGH confidence)
- Dexie.org official docs — Version.upgrade() API, clear() pattern
- `src/db/db.ts` (codebase) — current schema v1/v2, stores string constraints
- `src/analysis/pacing.ts` (codebase) — existing calculateWPM() pattern that calculateWPMWindows() extends
- `src/App.tsx` (codebase) — handleSaveName save location for wiring

### Secondary (MEDIUM confidence)
- Dexie GitHub discussion #2214 — "If the db version is too old, skip the upgrade and clear the tables?" — confirms `tx.table('sessions').clear()` pattern
- Dexie GitHub issue #349 — "Drop all tables on upgrade" — confirms tx.table().clear() is preferred over db.delete()
- `src/db/db.test.ts` (codebase) — `beforeEach(db.sessions.clear())` pattern for fake-indexeddb reset

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed; Dexie version upgrade pattern is well-documented and confirmed in codebase
- Architecture: HIGH — current db.ts and pacing.ts patterns directly inform the implementation; Dexie upgrade() API is authoritative
- Pitfalls: HIGH — VersionError and fake-indexeddb bleed are confirmed by existing codebase decisions (Phase 06-03 and Phase 01-01 notes in STATE.md)
- WPM windowing algorithm: HIGH — pure math, no library dependencies, directly derived from existing calculateWPM()

**Research date:** 2026-03-16
**Valid until:** 2026-09-16 (Dexie 4 is stable; algorithm is deterministic)
