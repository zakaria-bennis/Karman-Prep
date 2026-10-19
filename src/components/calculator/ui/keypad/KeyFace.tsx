// A key's face (VIS-KEYPAD-14 to 23): static typeset maths in the maths font, italic variables,
// 80 % exponents, |a|, a drawn radical, words in the UI font, the keypad's icons, and the
// two-symbol keys of the letters page with their selected symbol in full colour.

import type { JSX } from "react";
import { KeyIconGlyph, SqrtGlyph } from "./keypad-icons";
import type { KeyFace as Face } from "./keys";

const Var = (props: { children: string }) => <i className="kc-key-var">{props.children}</i>;

export function KeyFace(props: { face: Face }): JSX.Element {
  const { face } = props;
  switch (face.kind) {
    case "math":
      return face.italic ? <Var>{face.text}</Var> : <span>{face.text}</span>;
    case "word":
      return <span className="kc-key-word">{face.text}</span>;
    case "icon":
      return <KeyIconGlyph icon={face.icon} />;
    case "power":
      return (
        <span>
          <Var>a</Var>
          <sup className="kc-key-sup">
            {face.italic ? <Var>{face.exponent}</Var> : face.exponent}
          </sup>
        </span>
      );
    case "subscript":
      return (
        <span>
          <Var>a</Var>
          <sub className="kc-key-sub">
            <Var>b</Var>
          </sub>
        </span>
      );
    case "abs":
      return (
        <span>
          |<Var>a</Var>|
        </span>
      );
    case "sqrt":
      return <SqrtGlyph />;
    case "dual": {
      const second = face.raised ? <sup className="kc-key-raised">{face.second}</sup> : face.second;
      return (
        <span className="kc-key-dual">
          <span data-selected={String(face.selected === 0)}>{face.first}</span>
          <span data-selected={String(face.selected === 1)}>{second}</span>
        </span>
      );
    }
  }
}
