import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

// Every picture in these clips is a real quiz engine capture from
// .impeccable/mocks/redesign/engine/renders (alg-1, dark theme, 2x WebP).
// The code only scales, crops between UI rows, moves and cross-dissolves
// them. The one thing drawn here is the soft tap ripple.

export type ClipKind = 'd10-right' | 'd10-wrong' | 'handoff';
export type Ratio = '16x9' | '9x16';
export const GROUNDS = {marigold: '#EBA21F', pine: '#1F4D45', night: '#141413'} as const;
export type ClipProps = {kind: ClipKind; ratio: Ratio; ground: keyof typeof GROUNDS};

export const CLIP_FRAMES: Record<ClipKind, number> = {
	'd10-right': 180,
	'd10-wrong': 210,
	handoff: 180,
};

type Device = 'phone' | 'desktop';
type State = 'question' | 'selected' | 'wrong' | 'correct-explain';

// Capture size in CSS px (files are 2x).
const SIZE: Record<Device, {w: number; h: number}> = {
	phone: {w: 440, h: 956},
	desktop: {w: 1200, h: 800},
};

// Measured on the captures (CSS px). Rows where states differ, found by pixel diff.
const GEO = {
	phone: {
		focus: {x: 220, y: 420},
		choiceB: {x: 190, y: 337},
		choiceC: {x: 190, y: 409},
		submit: {x: 334, y: 557},
		showExplain: {x: 146, y: 558},
		// Below the choices, above the explanation rule (wrong-state buttons sit here).
		gap: {left: 0, top: 526, right: 440, bottom: 596},
		// Explanation panel: rule at 607, text, Hide explanations / Next question.
		explain: {left: 0, top: 596, right: 440, bottom: 891},
		above: {left: 0, top: 0, right: 440, bottom: 596},
	},
	desktop: {
		focus: {x: 600, y: 380},
		choiceB: {x: 560, y: 306},
		choiceC: {x: 560, y: 378},
		submit: {x: 806, y: 527},
		showExplain: {x: 618, y: 528},
		// Question column after explanations open (layout shifts left).
		left: {left: 0, top: 56, right: 601, bottom: 736},
		// Explanation column on the right. Starts at row 96 so the 40 px slide
		// only ever uncovers empty rows (56-96), never the top bar.
		explain: {left: 601, top: 96, right: 1200, bottom: 736},
	},
} as const;

type Box = {left: number; top: number; right: number; bottom: number};
type Layer = {state: State; opacity: number; window?: Box; dy?: number};
type Tap = {x: number; y: number; at: number};

const smooth = Easing.bezier(0.4, 0, 0.2, 1);
const ramp = (f: number, a: number, b: number, ease = smooth) =>
	interpolate(f, [a, b], [0, 1], {
		easing: ease,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

const src = (device: Device, state: State) => staticFile(`caps/alg-1-${device}-dark-${state}.webp`);

const Ripple: React.FC<{tap: Tap; s: number}> = ({tap, s}) => {
	const f = useCurrentFrame();
	const t = f - tap.at;
	if (t < 0 || t > 20) return null;
	const grow = interpolate(t, [0, 20], [0, 1], {easing: Easing.out(Easing.cubic)});
	const d = (22 + 34 * grow) * s; // 22 -> 56 CSS px, a fingertip
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
			}}
		/>
	);
};

const Capture: React.FC<{
	device: Device;
	s: number;
	x: number;
	y: number;
	layers: Layer[];
	taps?: Tap[];
	zoom?: number;
	focus?: {x: number; y: number};
	opacity?: number;
}> = ({device, s, x, y, layers, taps = [], zoom = 1, focus, opacity = 1}) => {
	const {w, h} = SIZE[device];
	const W = w * s;
	const H = h * s;
	const fx = (focus ?? {x: w / 2, y: h / 2}).x * s;
	const fy = (focus ?? {x: w / 2, y: h / 2}).y * s;
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: W,
				height: H,
				opacity,
				transform: `scale(${zoom})`,
				transformOrigin: `${fx}px ${fy}px`,
				borderRadius: 12,
				overflow: 'hidden',
			}}
		>
			{layers.map((l, i) => {
				if (l.opacity <= 0) return null;
				const win = l.window ?? {left: 0, top: 0, right: w, bottom: h};
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: win.left * s,
							top: win.top * s,
							width: (win.right - win.left) * s,
							height: (win.bottom - win.top) * s,
							overflow: 'hidden',
							opacity: l.opacity,
						}}
					>
						<Img
							src={src(device, l.state)}
							style={{
								position: 'absolute',
								left: -win.left * s,
								top: -win.top * s + (l.dy ?? 0) * s,
								width: W,
								height: H,
							}}
						/>
					</div>
				);
			})}
			{taps.map((t, i) => (
				<Ripple key={i} tap={t} s={s} />
			))}
		</div>
	);
};

// Where each device sits on each ratio (output px).
const placement = (device: Device, ratio: Ratio, purpose: 'solo' | 'handoff') => {
	const frameW = ratio === '16x9' ? 1920 : 1080;
	const frameH = ratio === '16x9' ? 1080 : 1920;
	let s: number;
	if (device === 'phone') s = ratio === '9x16' ? 1.8 : purpose === 'handoff' ? 1.0 : 1.0;
	else s = ratio === '16x9' ? 1.2 : 0.88;
	const {w, h} = SIZE[device];
	return {s, x: Math.round((frameW - w * s) / 2), y: Math.round((frameH - h * s) / 2)};
};

const D10: React.FC<{device: Device; ratio: Ratio; wrong: boolean}> = ({device, ratio, wrong}) => {
	const f = useCurrentFrame();
	const g = GEO[device];
	const end = wrong ? 210 : 180;
	const zoomTo = device === 'phone' ? 1.06 : 1.08;
	const zoom = 1 + (zoomTo - 1) * (ramp(f, 20, 64) - ramp(f, end - 34, end - 4));

	// Timings: tap, then the engine's response dissolves in under the ripple.
	const tapChoice = 48;
	const graded = wrong ? 52 : 52; // wrong: B tapped, engine grades (no B-selected capture exists)
	const tapNext = wrong ? 112 : 84; // Show explanations / Submit Answer
	const explainAt = tapNext + 4;
	const back = end - 34;

	const layers: Layer[] = [{state: 'question', opacity: 1}];
	if (!wrong) {
		layers.push({state: 'selected', opacity: ramp(f, graded, graded + 10)});
	} else {
		layers.push({state: 'wrong', opacity: ramp(f, graded, graded + 12)});
	}

	const slide = 1 - ramp(f, explainAt + 4, explainAt + 26, Easing.bezier(0.2, 0.8, 0.2, 1));
	if (device === 'phone') {
		const pg = GEO.phone;
		if (!wrong) {
			layers.push({state: 'correct-explain', opacity: ramp(f, explainAt, explainAt + 12), window: pg.above});
		} else {
			// Wrong: keep the graded choices (B marked, C checked) and open the
			// real explanation rows beneath them.
			layers.push({state: 'correct-explain', opacity: ramp(f, explainAt, explainAt + 10), window: pg.gap});
		}
		layers.push({
			state: 'correct-explain',
			opacity: ramp(f, explainAt + 4, explainAt + 20),
			window: pg.explain,
			dy: 56 * slide,
		});
	} else {
		const dg = GEO.desktop;
		layers.push({state: 'correct-explain', opacity: ramp(f, explainAt, explainAt + 12), window: dg.left});
		// Same fade as the left column so the two halves never show a seam;
		// the column's top rows are empty ground in both states, so the slide
		// uncovers nothing.
		layers.push({
			state: 'correct-explain',
			opacity: ramp(f, explainAt, explainAt + 12),
			window: dg.explain,
			dy: 40 * slide,
		});
	}
	// Return to the opening frame so the loop is seamless.
	layers.push({state: 'question', opacity: ramp(f, back, end - 4)});

	const taps: Tap[] = [
		{...(wrong ? g.choiceB : g.choiceC), at: tapChoice},
		{...(wrong ? g.showExplain : g.submit), at: tapNext},
	];
	const p = placement(device, ratio, 'solo');
	return <Capture device={device} {...p} layers={layers} taps={taps} zoom={zoom} focus={g.focus} />;
};

// The engine's own page colour (rgb 16 28 24, sampled from the captures).
// The morphing box is filled with it so a capture is never shown
// half-transparent over the ground.
const ENGINE_BG = 'rgb(16, 28, 24)';

const Handoff: React.FC<{ratio: Ratio}> = ({ratio}) => {
	const f = useCurrentFrame();
	const ease = Easing.bezier(0.45, 0, 0.15, 1);
	// 0 = phone, 1 = desktop; out and back so the loop closes on the phone.
	const t = ramp(f, 30, 72, ease) - ramp(f, 122, 164, ease);
	const ph = placement('phone', ratio, 'handoff');
	const dk = placement('desktop', ratio, 'handoff');
	const pw = SIZE.phone.w * ph.s;
	const phH = SIZE.phone.h * ph.s;
	const dw = SIZE.desktop.w * dk.s;
	const dh = SIZE.desktop.h * dk.s;
	const frameW = ratio === '16x9' ? 1920 : 1080;
	const frameH = ratio === '16x9' ? 1080 : 1920;
	const bw = pw + (dw - pw) * t;
	const bh = phH + (dh - phH) * t;
	const phoneOpacity = interpolate(t, [0.15, 0.6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const deskOpacity = interpolate(t, [0.35, 0.8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	// Each capture is fitted inside the morphing frame (never cropped).
	const img = (device: Device, w0: number, h0: number, opacity: number) => {
		const k = Math.min(bw / w0, bh / h0);
		const w = w0 * k;
		const h = h0 * k;
		return opacity > 0 ? (
			<Img
				src={src(device, 'selected')}
				style={{position: 'absolute', left: (bw - w) / 2, top: (bh - h) / 2, width: w, height: h, opacity}}
			/>
		) : null;
	};
	return (
		<div
			style={{
				position: 'absolute',
				left: (frameW - bw) / 2,
				top: (frameH - bh) / 2,
				width: bw,
				height: bh,
				borderRadius: 12,
				overflow: 'hidden',
				backgroundColor: ENGINE_BG,
			}}
		>
			{img('phone', pw, phH, phoneOpacity)}
			{img('desktop', dw, dh, deskOpacity)}
		</div>
	);
};

export const Clip: React.FC<ClipProps> = ({kind, ratio, ground}) => {
	const device: Device = ratio === '9x16' ? 'phone' : 'desktop';
	return (
		<AbsoluteFill style={{backgroundColor: GROUNDS[ground]}}>
			{kind === 'handoff' ? (
				<Handoff ratio={ratio} />
			) : (
				<D10 device={device} ratio={ratio} wrong={kind === 'd10-wrong'} />
			)}
		</AbsoluteFill>
	);
};
