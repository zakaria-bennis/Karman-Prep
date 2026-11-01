import type { CSSProperties, ReactNode } from "react";
import { HOUSE } from "@/lib/figures/engine/house";
import type { Scene, SceneItem, Weight } from "@/lib/figures/engine/scene";
import type {
  StudioFilter,
  StudioGradient,
  StudioLayer,
  StudioPaint,
  StudioRestyle,
  StudioShape,
} from "@/lib/figures/engine/studio/types";
import "./figure-studio.css";

/**
 * The studio render style of FigureView: the Bluebook scene with its studio layer
 * (src/lib/figures/engine/studio) drawn around it. Every Bluebook item is drawn at
 * its own coordinates; the layer only adds shapes under or between them and
 * repaints fills, so labels, marks, dashes and arrowheads are unchanged. Text is
 * drawn last, over everything, with a halo of the paper so it stays crisp on shading.
 */

const px = (n: number) => Math.round(n * 100) / 100;
const roleVar = (role: string) => `var(--figure-${role})`;

const BLURS: Record<Exclude<StudioFilter, "lift" | "glow">, number> = {
  blur1: 1,
  blur2: 2,
  blur4: 4,
  blur7: 7,
};

function strokeProps(weight: Weight) {
  return {
    strokeWidth: HOUSE[weight],
    strokeDasharray: weight === "dashed" ? HOUSE.dashPattern : undefined,
  };
}

function gradientDef(g: StudioGradient, id: string) {
  const units = g.units === "user" ? "userSpaceOnUse" : "objectBoundingBox";
  const stops = g.stops.map((s, i) => (
    <stop key={i} offset={s.offset} style={{ stopColor: s.color, stopOpacity: s.opacity ?? 1 }} />
  ));
  if (g.kind === "linear") {
    return (
      <linearGradient
        key={id}
        id={id}
        gradientUnits={units}
        x1={px(g.x1)}
        y1={px(g.y1)}
        x2={px(g.x2)}
        y2={px(g.y2)}
      >
        {stops}
      </linearGradient>
    );
  }
  return (
    <radialGradient
      key={id}
      id={id}
      gradientUnits={units}
      cx={px(g.cx)}
      cy={px(g.cy)}
      r={px(g.r)}
      fx={px(g.fx)}
      fy={px(g.fy)}
    >
      {stops}
    </radialGradient>
  );
}

export function renderStudioSvg({
  scene,
  studio,
  idBase,
  className,
  title,
}: {
  scene: Scene;
  studio: StudioLayer;
  idBase: string;
  className?: string;
  title?: string;
}) {
  const [ox, oy] = scene.offset ?? [0, 0];
  const markerId = idBase;
  const ref = (id: string) => `${idBase}-${id}`;
  const paint = (p: StudioPaint) => (typeof p === "string" ? p : `url(#${ref(p.grad)})`);
  const filterUrl = (f?: StudioFilter) => (f ? `url(#${ref(f)})` : undefined);
  const region = {
    x: px(-ox - 40),
    y: px(-oy - 40),
    width: px(scene.width + 80),
    height: px(scene.height + 80),
  };

  const shape = (s: StudioShape, key: string) => (
    <path
      key={key}
      d={s.d}
      data-studio={s.kind}
      transform={s.transform}
      opacity={s.opacity}
      filter={filterUrl(s.filter)}
      clipPath={s.clip ? `url(#${ref(s.clip)})` : undefined}
      strokeLinejoin="round"
      style={{
        fill: s.fill ? paint(s.fill) : "none",
        stroke: s.stroke ? paint(s.stroke) : "none",
        strokeWidth: s.strokeWidth,
      }}
    />
  );

  const item = (it: SceneItem, i: number, style?: StudioRestyle): ReactNode => {
    const override: CSSProperties = {};
    if (style?.fill) override.fill = paint(style.fill);
    if (style?.stroke) override.stroke = paint(style.stroke);
    if (style?.strokeWidth) override.strokeWidth = style.strokeWidth;
    const filter = filterUrl(style?.filter);
    if (it.t === "rect") {
      return (
        <rect
          key={i}
          x={px(it.x)}
          y={px(it.y)}
          width={px(it.width)}
          height={px(it.height)}
          fill={it.fill ? roleVar(it.fill) : "none"}
          stroke={roleVar(it.role)}
          {...strokeProps(it.weight ?? "line")}
          filter={filter}
          style={override}
          data-part={it.partId}
        />
      );
    }
    if (it.t !== "path") return null;
    const arrows = it.arrows;
    return (
      <path
        key={i}
        d={it.d}
        fill={it.fill ? roleVar(it.fill) : "none"}
        fillRule={it.fillRule}
        stroke={it.stroke === false ? "none" : roleVar(it.role)}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...strokeProps(it.weight)}
        markerStart={arrows === "start" || arrows === "both" ? `url(#${markerId})` : undefined}
        markerEnd={arrows === "end" || arrows === "both" ? `url(#${markerId})` : undefined}
        filter={filter}
        style={override}
        data-part={it.partId}
      />
    );
  };

  const body: ReactNode[] = [];
  const texts: ReactNode[] = [];
  scene.items.forEach((it, i) => {
    (studio.before[i] ?? []).forEach((s, k) => body.push(shape(s, `b${i}-${k}`)));
    if (it.t === "text") {
      texts.push(
        <text
          key={i}
          x={px(it.x)}
          y={px(it.y)}
          textAnchor={it.anchor}
          fill={roleVar(it.role)}
          fontSize={HOUSE.font}
          fontFamily="inherit"
          fontStyle={it.italic ? "italic" : undefined}
          stroke="var(--figure-studio-halo)"
          strokeWidth={3.5}
          strokeLinejoin="round"
          paintOrder="stroke"
          data-part={it.partId}
        >
          {it.text}
        </text>
      );
    } else body.push(item(it, i, studio.restyle[i]));
  });
  (studio.before[scene.items.length] ?? []).forEach((s, k) => body.push(shape(s, `end-${k}`)));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${px(-ox)} ${px(-oy)} ${px(scene.width)} ${px(scene.height)}`}
      role="img"
      aria-label={scene.description}
      data-figure-view=""
      data-figure-style="studio"
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
        {Object.entries(BLURS).map(([id, sd]) => (
          <filter key={id} id={ref(id)} filterUnits="userSpaceOnUse" {...region}>
            <feGaussianBlur stdDeviation={sd} />
          </filter>
        ))}
        <filter id={ref("lift")} filterUnits="userSpaceOnUse" {...region}>
          <feDropShadow
            dx={0}
            dy={0.9}
            stdDeviation={0.8}
            style={{ floodColor: "var(--figure-studio-lift)" }}
          />
        </filter>
        <filter id={ref("glow")} filterUnits="userSpaceOnUse" {...region}>
          <feDropShadow
            dx={0}
            dy={1.4}
            stdDeviation={2.2}
            style={{ floodColor: "var(--figure-studio-glow)" }}
          />
        </filter>
        {studio.gradients.map((g) => gradientDef(g, ref(g.id)))}
        {studio.clips.map((c) => (
          <clipPath key={c.id} id={ref(c.id)}>
            <path d={c.d} />
          </clipPath>
        ))}
      </defs>
      {body}
      {texts}
    </svg>
  );
}
