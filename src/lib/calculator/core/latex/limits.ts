// Parse and row limits. A leaf module that index.ts re-exports, so
// parser modules read the limits without importing index.ts at run time.

export const MAX_ROWS = 100;
export const MAX_ROW_CHARACTERS = 2048;
export const MAX_TREE_NODES = 2000;
export const MAX_NESTING_DEPTH = 64;
export const MAX_FUNCTION_PARAMS = 8;
