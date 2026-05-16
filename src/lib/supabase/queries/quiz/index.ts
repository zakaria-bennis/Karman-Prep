// ============================================================
// Barrel re-export for the quiz query layer.
//
// Audit M1: the original quiz.ts had grown to 711 lines covering
// five unrelated concerns (question CRUD, ingestion-review,
// quiz attempts + responses, student flags, learn_node_status).
// Each is its own file now; this barrel preserves the original
// import shape so the 8 call sites don't need touching.
//
//   import { fetchQuestionsForNode } from "@/lib/supabase/queries/quiz";
//
// still works exactly the same.
// ============================================================

export * from "./questions";
export * from "./review";
export * from "./attempts";
export * from "./flags";
export * from "./node-status";
