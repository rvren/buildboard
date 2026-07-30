// Compatibility shim: the domain model now lives in the shared layer so the
// main process and renderer share one source of truth. Existing `@/types`
// imports keep working unchanged.
export * from "@shared/types";
