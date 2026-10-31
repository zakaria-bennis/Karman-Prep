import { useId } from "react";
import { HOUSE } from "@/lib/figures/engine/house";
import type { Role, Scene, SceneItem, Weight } from "@/lib/figures/engine/scene";
import "./figure-roles.css";

const paint = (role: Role) => `var(--figure-${role})`;

/**
 * Coordinates to 0.01 unit. Server and browser math can differ in the last digits
 * (sin/cos), and an unrounded attribute then fails hydration.
 */
const px = (n: number) => Math.round(n * 100) / 100;

function strokeProps(weight: Weight) {
  return {
    strokeWidth: HOUSE[weight],
    strokeDasharray: weight === "dashed" ? HOUSE.dashPattern : undefined,
  };
}

function renderItem(item: SceneItem, index: number, markerId: string) {
  if (item.t === "text") {
    return (
      <text
        key={index}
        x={px(item.x)}
        y={px(item.y)}
        textAnchor={item.anchor}
        fill={paint(item.role)}
        fontSize={HOUSE.font}
        fontFamily="inherit"
        fontStyle={item.italic ? "italic" : undefined}
        data-part={item.partId}
      >
        {item.text}
      </text>
    );
  }
  if (item.t === "rect") {
    return (
      <rect
        key={index}
        x={px(item.x)}
        y={px(item.y)}
        width={px(item.width)}
        height={px(item.height)}
        fill={item.fill ? paint(item.fill) : "none"}
        stroke={paint(item.role)}
        {...strokeProps(item.weight ?? "line")}
        data-part={item.partId}
      />
    );
  }
  const arrows = item.arrows;
  return (
    <path
      key={index}
      d={item.d}
      fill={item.fill ? paint(item.fill) : "none"}
      fillRule={item.fillRule}
      stroke={item.stroke === false ? "none" : paint(item.role)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...strokeProps(item.weight)}
      markerStart={arrows === "start" || arrows === "both" ? `url(#${markerId})` : undefined}
      markerEnd={arrows === "end" || arrows === "both" ? `url(#${markerId})` : undefined}
      data-part={item.partId}
    />
  );
}

/** Renders a Scene as one SVG. Colors come only from the --figure-* theme variables. */
export default function FigureView({
  scene,
  className,
  title,
}: {
  scene: Scene;
  className?: string;
  title?: string;
}) {
  const markerId = `figure-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // A scene padded to a larger box (figure choices) keeps its drawing centered in it.
  const [ox, oy] = scene.offset ?? [0, 0];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${px(-ox)} ${px(-oy)} ${px(scene.width)} ${px(scene.height)}`}
      role="img"
      aria-label={scene.description}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <marker
          id={markerId}
          viewBox={`0 0 ${HOUSE.arrowLength} ${HOUSE.arrowWidth}`}
          refX={HOUSE.arrowLength}
          refY={HOUSE.arrowWidth / 2}
          markerWidth={HOUSE.arrowLength}
          markerHeight={HOUSE.arrowWidth}
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path
            d={`M0 0 L${HOUSE.arrowLength} ${HOUSE.arrowWidth / 2} L0 ${HOUSE.arrowWidth} Z`}
            fill="context-stroke"
          />
        </marker>
      </defs>
      {scene.items.map((item, i) => renderItem(item, i, markerId))}
    </svg>
  );
}
