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
        <rect x={4} y={4.15} width={13.5} height={1.7} />
        <path d="M0.5 5L4.7 2.1V7.9Z" />
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
        d="M0.4 6L5 0.6H16.4A1.2 1.2 0 0 1 17.6 1.8V10.2A1.2 1.2 0 0 1 16.4 11.4H5Z M7.5 4L8.6 2.9L10.6 4.9L12.6 2.9L13.7 4L11.7 6L13.7 8L12.6 9.1L10.6 7.1L8.6 9.1L7.5 8L9.5 6Z"
      />
    </Svg>
  ),
  enter: () => (
    <Svg w={24} h={14}>
      <path
        d="M20.4 3.2V6.8Q20.4 10 17.2 10H4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
      />
      <path d="M0.6 10L5.2 6.4V13.6Z" fill="currentColor" />
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

/** VIS-KEYPAD-33: the Hide keypad tab's keyboard, 28 by 19 px: a rounded outline, two rows of
 *  keys and a space bar. */
export function TabKeyboardGlyph(): JSX.Element {
  const keys: JSX.Element[] = [];
  for (let i = 0; i < 5; i++)
    keys.push(<rect key={`a${i}`} x={5.4 + i * 3.7} y={4.8} width={2.3} height={2.3} />);
  for (let i = 0; i < 4; i++)
    keys.push(<rect key={`b${i}`} x={7.2 + i * 3.7} y={8.4} width={2.3} height={2.3} />);
  return (
    <svg
      className="kc-glyph"
      width={28}
      height={19}
      viewBox="0 0 28 19"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={0.9}
        y={1.1}
        width={26.2}
        height={16.6}
        rx={2.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <g fill="currentColor">
        {keys}
        <rect x={8.8} y={12.4} width={10.4} height={2} />
      </g>
    </svg>
  );
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
      <path d="M0.2 3.8L6 11L11.8 3.8Z" fill="currentColor" />
    </svg>
  );
}

/** VIS-KEYPAD-18: a drawn radical with a short overbar and nothing under it. */
export function SqrtGlyph(): JSX.Element {
  return (
    <svg
      className="kc-key-sqrt"
      width={19}
      height={18}
      viewBox="0 0 19 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1 10.2L3.4 8.9L7.6 16.6L14.2 1.4H18.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="miter"
      />
      <path d="M3.4 8.9L4.2 8.5L8 15.4L7.6 16.6Z" fill="currentColor" />
    </svg>
  );
}
