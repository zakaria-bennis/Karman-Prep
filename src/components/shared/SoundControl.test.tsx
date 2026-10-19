// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SoundControl from "./SoundControl";
import { setSoundEnabled, soundEnabled } from "@/lib/sound-preference";
import { getSound, playSound, preloadSounds } from "@/lib/sounds";

afterEach(() => {
  cleanup();
  setSoundEnabled(false);
});

describe("explicit sound preference", () => {
  it("never returns or preloads a playable sound before opt-in", () => {
    expect(soundEnabled()).toBe(false);
    preloadSounds();
    playSound("error");
    expect(getSound("ambientTroposphere")).toBeNull();
  });
  it("provides a named, reversible toggle shared by visible controls", () => {
    render(<SoundControl />);
    const toggle = screen.getByRole("button", { name: /Practice sounds/ });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(soundEnabled()).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(soundEnabled()).toBe(false);
    expect(getSound("nodeClick")).toBeNull();
  });
});
