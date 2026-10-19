// The keypad's own icons (VIS-KEYPAD-19, 32, 33), drawn here to the reference's shapes and sizes:
// thin long arrows, a filled backspace tag with a cut-out cross, a return arrow, a speaker with
// waves, a solid Shift arrow and the Hide keypad caret. Every icon is aria-hidden and takes
// currentColor.

import type { JSX, ReactNode } from "react";
import type { KeyIcon } from "./keys";

function Svg(props: { w: number; h: number; children: ReactNode }): JSX.Element {
  return (
    <svg
      className="kc-key-icon"
      width={props.w}
      height={props.h}
      viewBox={`0 0 ${props.w} ${props.h}`}
      aria-hidden="true"
      focusable="false"
    >
      {props.children}
    </svg>
  );
}

function Arrow(props: { flip: boolean }): JSX.Element {
  return (
    <Svg w={18} h={10}>
      <g transform={props.flip ? "translate(18 0) scale(-1 1)" : undefined} fill="currentColor">
        <rect x={4} y={4.3} width={13.5} height={1.4} />
        <path d="M0.5 5L5 2V8Z" />
      </g>
    </Svg>
  );
}

const ICONS: Record<KeyIcon, () => JSX.Element> = {
  left: () => <Arrow flip={false} />,
  right: () => <Arrow flip />,
  backspace: () => (
    <Svg w={18} h={12}>
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M0.4 6L5 0.6H16.4A1.2 1.2 0 0 1 17.6 1.8V10.2A1.2 1.2 0 0 1 16.4 11.4H5Z M7.6 3.2L6.6 4.2L8.4 6L6.6 7.8L7.6 8.8L9.4 7L11.2 8.8L12.2 7.8L10.4 6L12.2 4.2L11.2 3.2L9.4 5Z"
      />
    </Svg>
  ),
  enter: () => (
    <Svg w={22} h={12}>
      <g fill="currentColor">
        <rect x={19.4} y={1.6} width={1.7} height={7} />
        <rect x={4.5} y={6.9} width={16.6} height={1.7} />
        <path d="M0.6 7.75L5.4 4.4V11.1Z" />
      </g>
    </Svg>
  ),
  audio: () => (
    <Svg w={16} h={14}>
      <path fill="currentColor" d="M1 4.6H4L7.8 1.4V12.6L4 9.4H1Z" />
      <g fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
        <path d="M10 5A2.6 2.6 0 0 1 10 9" />
        <path d="M12 3A5.2 5.2 0 0 1 12 11" />
      </g>
    </Svg>
  ),
  shift: () => (
    <Svg w={14} h={15}>
      <path fill="currentColor" d="M7 0.6L13.4 7.4H9.6V14H4.4V7.4H0.6Z" />
    </Svg>
  ),
};

export function KeyIconGlyph(props: { icon: KeyIcon }): JSX.Element {
  return ICONS[props.icon]();
}

/** VIS-KEYPAD-33: the Hide keypad tab's caret, pointing down (12 px box). */
export function CaretDownGlyph(): JSX.Element {
  return (
    <svg
      className="kc-glyph"
      width={12}
      height={12}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0.5 3.5L6 9L11.5 3.5Z" fill="currentColor" />
    </svg>
  );
}

/** VIS-KEYPAD-18: a drawn radical with a short overbar and nothing under it. */
export function SqrtGlyph(): JSX.Element {
  return (
    <svg
      className="kc-key-sqrt"
      width={22}
      height={18}
      viewBox="0 0 22 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1 10.2L3.4 8.9L7.6 16.6L14.2 1.4H21.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="miter"
      />
      <path d="M3.4 8.9L4.2 8.5L8 15.4L7.6 16.6Z" fill="currentColor" />
    </svg>
  );
}
