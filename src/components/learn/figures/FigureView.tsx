import { useId } from "react";
import { HOUSE } from "@/lib/figures/engine/house";
import type { Role, Scene, SceneItem, Weight } from "@/lib/figures/engine/scene";
import "./figure-roles.css";

const paint = (role: Role) => `var(--figure-${role})`;

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
        x={item.x}
        y={item.y}
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
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
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
      stroke={paint(item.role)}
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
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${scene.width} ${scene.height}`}
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
