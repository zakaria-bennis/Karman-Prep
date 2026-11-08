import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {GEOM, type Geom} from './geometry';
import {CLIPS, type FeatureKind, type Seg, type Tap} from './clips';

// Feature clips: real portal captures (../shots, made by scripts/capture-screens.mjs)
// inside the hand-drawn iPhone 17 Pro Max frame (../device). The code only places,
// scrolls, crops and cross-dissolves the captures, slides a captured sheet in from its
// own edge, and draws the soft fingertip ripple. No UI or text is drawn here.

export const GROUNDS = {marigold: '#EBA21F', pine: '#1F4D45', night: '#141413'} as const;
export type Ground = keyof typeof GROUNDS;
export type Ratio = '16x9' | '9x16';
export type FeatureProps = {kind: FeatureKind; ratio: Ratio; ground: Ground};

// Screens in dark mode on marigold and night, light mode on pine.
const MODE: Record<Ground, 'light' | 'dark'> = {marigold: 'dark', pine: 'light', night: 'dark'};
const FINISH = 'orange';

// Frame geometry, from device/device.js (viewBox 479 x 994, screen at 19.5, 19).
const F = {w: 479, h: 994, sx: 19.5, sy: 19, sw: 440, sh: 956, r: 62};
const PHONE = {w: 440, h: 956};
const DESK = {w: 1440, h: 900};

const smooth = Easing.bezier(0.45, 0, 0.2, 1);
const ramp = (f: number, a: number, b: number) =>
	interpolate(f, [a, b], [0, 1], {easing: smooth, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Scroll position (CSS px) at frame f, from [frame, y] keys. */
const scrollAt = (f: number, keys?: [number, number][]) => {
	if (!keys || keys.length === 0) return 0;
	if (f <= keys[0][0]) return keys[0][1];
	for (let i = 1; i < keys.length; i++) {
		const [f1, y1] = keys[i];
		const [f0, y0] = keys[i - 1];
		if (f <= f1) return y0 + (y1 - y0) * ramp(f, f0, f1);
	}
	return keys[keys.length - 1][1];
};

const file = (name: string) => staticFile(`shots/${name}.webp`);

/** Opacity of segment i at frame f: dissolves in over its `in` frames, gone once the next is fully in. */
const segOpacity = (segs: Seg[], i: number, f: number) => {
	const s = segs[i];
	const inDur = s.in ?? 12;
	const next = segs[i + 1];
	if (f < s.from) return 0;
	if (next && f >= next.from + (next.in ?? 12)) return 0;
	return i === 0 || s.enter === 'cut' ? 1 : ramp(f, s.from, s.from + inDur);
};

const Band: React.FC<{src: string; s: number; top: number; bottom: number; w: number; dy?: number; dx?: number; left?: number; right?: number; opacity?: number}> = ({
	src,
	s,
	top,
	bottom,
	w,
	dy = 0,
	dx = 0,
	left = 0,
	right,
	opacity = 1,
}) => {
	const r = right ?? w;
	return (
		<div style={{position: 'absolute', left: left * s, top: top * s, width: (r - left) * s, height: (bottom - top) * s, overflow: 'hidden', opacity}}>
			<Img src={src} style={{position: 'absolute', left: (-left + dx) * s, top: (-top + dy) * s, width: w * s}} />
		</div>
	);
};

/** A rectangle cut from a capture and moved by (dx, dy); whatever leaves the screen is clipped by the screen. */
const Crop: React.FC<{src: string; s: number; w: number; left: number; top: number; right: number; bottom: number; dx: number; dy: number}> = ({
	src,
	s,
	w,
	left,
	top,
	right,
	bottom,
	dx,
	dy,
}) => (
	<div style={{position: 'absolute', left: (left + dx) * s, top: (top + dy) * s, width: (right - left) * s, height: (bottom - top) * s, overflow: 'hidden'}}>
		<Img src={src} style={{position: 'absolute', left: -left * s, top: -top * s, width: w * s}} />
	</div>
);

/** One phone segment: a still, a scrolled long capture, or a sheet sliding up over the last state. */
const PhoneSeg: React.FC<{seg: Seg; mode: string; s: number; opacity: number}> = ({seg, mode, s, opacity}) => {
	const f = useCurrentFrame();
	const name = `${seg.shot}-phone-${mode}`;
	const g: Geom | undefined = GEOM[name];
	const y = scrollAt(f, seg.scroll);
	if (y > 0 && g && g.mainTop !== null && g.mainBottom !== null) {
		// Top bar and bottom bar from the viewport capture; the scroll area from the long capture.
		const bottomBand = Math.min(g.mainBottom, g.navTop ?? PHONE.h);
		return (
			<div style={{position: 'absolute', inset: 0, opacity}}>
				<Img src={file(name)} style={{position: 'absolute', left: 0, top: 0, width: PHONE.w * s}} />
				<Band src={file(`${seg.shot}-scroll-phone-${mode}`)} s={s} top={g.mainTop} bottom={g.mainBottom} w={PHONE.w} dy={-y} />
				<Band src={file(name)} s={s} top={bottomBand} bottom={PHONE.h} w={PHONE.w} />
			</div>
		);
	}
	return <Img src={file(name)} style={{position: 'absolute', left: 0, top: 0, width: PHONE.w * s, opacity}} />;
};

/** The sheet segment drawn properly: page above fades to the captured scrim, sheet slides up. */
const SheetSeg: React.FC<{name: string; s: number; from: number; dur: number; edge: number; axis: 'x' | 'y'; size: {w: number; h: number}}> = ({
	name,
	s,
	from,
	dur,
	edge,
	axis,
	size,
}) => {
	const f = useCurrentFrame();
	const p = ramp(f, from, from + dur);
	if (axis === 'y')
		return (
			<>
				<Band src={file(name)} s={s} top={0} bottom={edge} w={size.w} opacity={p} />
				<Crop src={file(name)} s={s} w={size.w} left={0} top={edge} right={size.w} bottom={size.h} dx={0} dy={(1 - p) * (size.h - edge)} />
			</>
		);
	return (
		<>
			<Band src={file(name)} s={s} top={0} bottom={size.h} w={size.w} right={edge} opacity={p} />
			<Crop src={file(name)} s={s} w={size.w} left={edge} top={0} right={size.w} bottom={size.h} dx={(1 - p) * (size.w - edge)} dy={0} />
		</>
	);
};

const Ripple: React.FC<{tap: Tap; s: number}> = ({tap, s}) => {
	const f = useCurrentFrame();
	const t = f - tap.at;
	if (t < 0 || t > 20) return null;
	const grow = interpolate(t, [0, 20], [0, 1], {easing: Easing.out(Easing.cubic)});
	const d = (22 + 34 * grow) * s; // 22 -> 56 pt, a fingertip
	const opacity = interpolate(t, [0, 3, 20], [0, 0.6, 0], {extrapolateRight: 'clamp'});
	return (
		<div
			style={{
				position: 'absolute',
				left: tap.x * s - d / 2,
				top: tap.y * s - d / 2,
				width: d,
				height: d,
				borderRadius: '50%',
				opacity,
				background:
					'radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.55) 64%, rgba(255,255,255,0) 71%)',
				mixBlendMode: 'normal',
			}}
		/>
	);
};

const Phone: React.FC<{kind: FeatureKind; mode: string; x: number; y: number; scale: number}> = ({kind, mode, x, y, scale}) => {
	const f = useCurrentFrame();
	const clip = CLIPS[kind];
	const s = scale; // output px per pt
	return (
		<div style={{position: 'absolute', left: x, top: y, width: F.w * s, height: F.h * s}}>
			<div
				style={{
					position: 'absolute',
					left: F.sx * s,
					top: F.sy * s,
					width: F.sw * s,
					height: F.sh * s,
					borderRadius: F.r * s,
					overflow: 'hidden',
					background: '#000',
				}}
			>
				{clip.phone.map((seg, i) => {
					const o = segOpacity(clip.phone, i, f);
					if (o <= 0) return null;
					if (seg.enter === 'sheet')
						return <SheetSeg key={i} name={`${seg.shot}-phone-${mode}`} s={s} from={seg.from} dur={seg.in ?? 16} edge={seg.sheetTop ?? 0} axis="y" size={PHONE} />;
					return <PhoneSeg key={i} seg={seg} mode={mode} s={s} opacity={o} />;
				})}
				{clip.taps.map((t, i) => (
					<Ripple key={i} tap={t} s={s} />
				))}
			</div>
			<Img src={staticFile(`device/iphone-17-pro-max-${FINISH}.svg`)} style={{position: 'absolute', inset: 0, width: F.w * s, height: F.h * s}} />
		</div>
	);
};

const Desktop: React.FC<{kind: FeatureKind; mode: string; x: number; y: number; scale: number}> = ({kind, mode, x, y, scale}) => {
	const f = useCurrentFrame();
	const segs = CLIPS[kind].desktop;
	const s = scale;
	return (
		<div style={{position: 'absolute', left: x, top: y, width: DESK.w * s, height: DESK.h * s, borderRadius: 12, overflow: 'hidden'}}>
			{segs.map((seg, i) => {
				const o = segOpacity(segs, i, f);
				if (o <= 0) return null;
				const name = `${seg.shot}-desktop-${mode}`;
				if (seg.enter === 'sheet')
					return <SheetSeg key={i} name={name} s={s} from={seg.from} dur={seg.in ?? 16} edge={seg.sheetLeft ?? 0} axis="x" size={DESK} />;
				return <Img key={i} src={file(name)} style={{position: 'absolute', left: 0, top: 0, width: DESK.w * s, opacity: o}} />;
			})}
		</div>
	);
};

export const Feature: React.FC<FeatureProps> = ({kind, ratio, ground}) => {
	const mode = MODE[ground];
	if (ratio === '9x16') {
		const s = 1.62;
		return (
			<AbsoluteFill style={{background: GROUNDS[ground]}}>
				<Phone kind={kind} mode={mode} scale={s} x={Math.round((1080 - F.w * s) / 2)} y={Math.round((1920 - F.h * s) / 2)} />
			</AbsoluteFill>
		);
	}
	const ps = 0.92;
	const ds = 1100 / DESK.w;
	const gap = 70;
	const total = F.w * ps + gap + DESK.w * ds;
	const left = Math.round((1920 - total) / 2);
	return (
		<AbsoluteFill style={{background: GROUNDS[ground]}}>
			<Phone kind={kind} mode={mode} scale={ps} x={left} y={Math.round((1080 - F.h * ps) / 2)} />
			<Desktop kind={kind} mode={mode} scale={ds} x={Math.round(left + F.w * ps + gap)} y={Math.round((1080 - DESK.h * ds) / 2)} />
		</AbsoluteFill>
	);
};
