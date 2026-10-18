// Lazy (D4, AR-33): the Transfer controls' chunk entry, reached only through
// transfer-classifier.ts's one import(). One import() instead of one per module keeps the eager
// quiz routes to fewer chunk-loading stubs: 12's classifier, the wrappers' item lookup and the
// Transfer control (with its stylesheet) load together; the bridge's pipeline keeps its own
// import() in use-transfer-bridge.ts. Never imported by eager code.

export * from "@/lib/calculator-transfer/classify";
export { installMathSplit } from "@/lib/calculator-transfer/math-split";
export * from "./transfer-items";
export { TransferControl } from "./TransferControl";
