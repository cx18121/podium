# Deferred Items — Phase 12

## Pre-existing Build Errors (Out of Scope)

These TypeScript errors exist in the codebase prior to Phase 12 work and were not introduced by this plan.

1. `src/analysis/fillerDetector.ts(54,24)`: `'text' is declared but its value is never read.` — unused parameter in isLikeAFiller
2. `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx(19,6)`: `Property 'at' does not exist on type 'TranscriptSegment[]'` — requires `lib: ["es2022"]` in tsconfig
3. `src/components/StorageQuotaBar/StorageQuotaBar.test.tsx(2,36)`: `'beforeEach' is declared but its value is never read.` — unused import
