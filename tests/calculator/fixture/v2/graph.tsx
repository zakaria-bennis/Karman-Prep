// Graph harness page (08 Task 8), /v2/graph.html?skin=<SkinId>&rows=<url-encoded JSON string[]>
// &w=<px>&h=<px>: mounts GraphPanel at w×h CSS px (default 800×600) in a harness-kit shadow root,
// with rows "1"…"n". graph.spec.ts reads the engine through globalThis.__calculatorHarness.

import graphCss from "@/components/calculator-v2/styles/graph.css?inline";
import tokensCss from "@/components/calculator-v2/styles/tokens.css?inline";
import { GraphPanel } from "@/components/calculator-v2/ui/graph/GraphPanel";
import { EngineContext } from "@/components/calculator-v2/ui/hooks/use-engine";
import { SKIN_IDS, type SkinId } from "@/lib/calculator-v2/theme/skins";
import { mountHarness } from "./harness-kit";

const params = new URLSearchParams(location.search);
const skinParam = params.get("skin");
const skin: SkinId =
  skinParam !== null && (SKIN_IDS as readonly string[]).includes(skinParam)
    ? (skinParam as SkinId)
    : "ivory";
const rowsParam = params.get("rows");
const rows = rowsParam === null ? [] : (JSON.parse(rowsParam) as string[]);
const w = Number(params.get("w") ?? 800);
const h = Number(params.get("h") ?? 600);

const root = document.getElementById("root")!;
root.style.display = "block";
root.style.width = `${w}px`;
root.style.height = `${h}px`;

const { engine } = mountHarness({
  root,
  css: [tokensCss, graphCss],
  skin,
  render: (engine) => (
    <EngineContext.Provider value={engine}>
      <div style={{ width: `${w}px`, height: `${h}px` }}>
        <GraphPanel
          host={root}
          themeRevision={0}
          reducedMotion={false}
          settingsOpen={false}
          onOpenSettings={() => undefined}
        />
      </div>
    </EngineContext.Provider>
  ),
});
if (rows.length > 0) engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
