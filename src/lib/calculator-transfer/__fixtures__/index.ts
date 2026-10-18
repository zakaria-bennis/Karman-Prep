// The transfer fixture corpus (TR-79): one file per Phase 1 category of c-transfer.md section 14,
// in the order of the fixture list, plus the functions file.

import collisions from "./collisions";
import exclusions from "./exclusions";
import functions from "./functions";
import inequalities from "./inequalities";
import loneSymbols from "./lone-symbols";
import phaseBlocks from "./phase-blocks";
import satForms from "./sat-forms";
import type { TransferFixture } from "./types";

export const FIXTURE_FILES: Readonly<Record<string, readonly TransferFixture[]>> = {
  exclusions,
  "lone-symbols": loneSymbols,
  "sat-forms": satForms,
  inequalities,
  "phase-blocks": phaseBlocks,
  functions,
  collisions,
};

export const TRANSFER_FIXTURES: readonly TransferFixture[] = Object.values(FIXTURE_FILES).flat();
