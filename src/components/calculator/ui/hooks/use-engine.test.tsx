// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { createTestEngine } from "@/lib/calculator/core/api/__fixtures__/test-engine";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import { SkinContext, useSkin } from "./skin";
import { EngineContext, useEngine, useEngineSnapshot } from "./use-engine";

it("AR-54 a syntax error reaches React as a row message through useEngineSnapshot and nothing throws", () => {
  const restore = installDomStubs();
  expect(document.createElement("canvas").getContext("2d")).toBeNull();
  const { engine } = createTestEngine();
  function Probe() {
    const s = useEngineSnapshot(useEngine());
    return (
      <output>
        {useSkin()}|{s.rows.map((r) => r.error?.message ?? r.latex).join(";")}
      </output>
    );
  }
  render(
    <EngineContext.Provider value={engine}>
      <SkinContext.Provider value="plum">
        <Probe />
      </SkinContext.Provider>
    </EngineContext.Provider>
  );
  expect(screen.getByRole("status")).toHaveTextContent("plum|");
  act(() => {
    engine.editRow("1", "\\frac{", "typing");
  });
  expect(screen.getByRole("status")).toHaveTextContent("plum|Sorry, I don't understand this.");
  restore();
});
