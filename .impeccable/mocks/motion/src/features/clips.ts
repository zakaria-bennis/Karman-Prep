// The feature clips as data: which capture shows when, how it scrolls and where the finger taps.
// Frames at 30 fps. `shot` is a capture name in ../shots without "-phone-<mode>" / "-desktop-<mode>".
// `scroll` keys are [frame, CSS px scrolled]. Taps and sheet edges are CSS px on the capture,
// measured with Playwright on the live prototype (see shots/README.md).
// Every clip ends on its first picture, so it loops with no jump.

export type FeatureKind = 'dashboard' | 'calendar' | 'd10-finish' | 'progress-rewards' | 'parent-update' | 'tour';

export type Seg = {
	shot: string;
	from: number;
	in?: number; // dissolve (or sheet slide) length in frames, default 12
	enter?: 'dissolve' | 'cut' | 'sheet';
	scroll?: [number, number][];
	sheetTop?: number; // phone: top edge of the captured sheet
	sheetLeft?: number; // desktop: left edge of the captured side sheet
};
export type Tap = {at: number; x: number; y: number};
export type ClipDef = {frames: number; phone: Seg[]; desktop: Seg[]; taps: Tap[]};

const HOME = 'student-home-cohort';
const COHORT = 'student-classes-cohort';
const PRIVATE = 'student-classes-private';
const PROGRESS = 'student-progress-cohort';
const REWARDS = 'student-rewards-cohort';

export const CLIPS: Record<FeatureKind, ClipDef> = {
	// Home: the next thing to do, Your Daily 10 and the due items, then down to skills and bests.
	dashboard: {
		frames: 240,
		phone: [
			{shot: HOME, from: 0, scroll: [[24, 0], [105, 420], [135, 420], [185, 796]]},
			{shot: HOME, from: 214, in: 22},
		],
		desktop: [{shot: HOME, from: 0}],
		taps: [],
	},
	// The cohort's week, then a Private student books the next 1:1.
	calendar: {
		frames: 240,
		phone: [
			{shot: COHORT, from: 0, scroll: [[18, 0], [70, 247]]},
			{shot: PRIVATE, from: 96},
			{shot: 'student-booking-open', from: 126, enter: 'sheet', in: 16, sheetTop: 561},
			{shot: 'student-booking-slot', from: 178, in: 6},
			{shot: COHORT, from: 222, in: 16},
		],
		desktop: [
			{shot: COHORT, from: 0},
			{shot: PRIVATE, from: 96},
			{shot: 'student-booking-open', from: 126, enter: 'sheet', in: 16, sheetLeft: 980},
			{shot: 'student-booking-slot', from: 178, in: 6},
			{shot: COHORT, from: 222, in: 16},
		],
		taps: [
			{at: 120, x: 131, y: 195}, // Book your next session
			{at: 174, x: 356, y: 814}, // 6:00 pm
		],
	},
	// The Daily 10 ending: the box, opened on a tap, the prize on the fox, then the calm results.
	'd10-finish': {
		frames: 240,
		phone: [
			{shot: 'daily10-boxready-longtime', from: 0},
			{shot: 'daily10-box-longtime', from: 36, in: 6},
			{shot: 'daily10-burst-longtime', from: 70, in: 5},
			{shot: 'daily10-found-longtime', from: 82, in: 10},
			{shot: 'daily10-prize-longtime', from: 104, in: 12},
			{shot: 'daily10-results-longtime', from: 150, in: 14},
			{shot: 'daily10-boxready-longtime', from: 222, in: 16},
		],
		desktop: [
			{shot: 'daily10-boxready-longtime', from: 0},
			{shot: 'daily10-box-longtime', from: 36, in: 6},
			{shot: 'daily10-burst-longtime', from: 70, in: 5},
			{shot: 'daily10-found-longtime', from: 82, in: 10},
			{shot: 'daily10-prize-longtime', from: 104, in: 12},
			{shot: 'daily10-results-longtime', from: 150, in: 14},
			{shot: 'daily10-boxready-longtime', from: 222, in: 16},
		],
		taps: [
			{at: 32, x: 75, y: 859}, // Open
			{at: 66, x: 220, y: 417}, // the box
		],
	},
	// Progress by skill, then tokens and the fox.
	'progress-rewards': {
		frames: 240,
		phone: [
			{shot: PROGRESS, from: 0, scroll: [[15, 0], [88, 760]]},
			{shot: REWARDS, from: 110, scroll: [[135, 0], [178, 238]]},
			{shot: PROGRESS, from: 222, in: 16},
		],
		desktop: [
			{shot: PROGRESS, from: 0},
			{shot: REWARDS, from: 110},
			{shot: PROGRESS, from: 222, in: 16},
		],
		taps: [],
	},
	// The parent's week, then the weekly update.
	'parent-update': {
		frames: 240,
		phone: [
			{shot: 'parent-home-cohort', from: 0, scroll: [[20, 0], [80, 420]]},
			{shot: 'parent-update-cohort', from: 104, scroll: [[130, 0], [185, 458]]},
			{shot: 'parent-home-cohort', from: 222, in: 16},
		],
		desktop: [
			{shot: 'parent-home-cohort', from: 0},
			{shot: 'parent-update-cohort', from: 104},
			{shot: 'parent-home-cohort', from: 222, in: 16},
		],
		taps: [{at: 98, x: 220, y: 835}], // Read the latest update
	},
	// Four features in twelve seconds: Home, Classes, the Daily 10 prize, Rewards.
	tour: {
		frames: 360,
		phone: [
			{shot: HOME, from: 0, scroll: [[15, 0], [62, 300]]},
			{shot: COHORT, from: 80, scroll: [[100, 0], [142, 247]]},
			{shot: 'daily10-prize-longtime', from: 165},
			{shot: REWARDS, from: 250, scroll: [[270, 0], [310, 238]]},
			{shot: HOME, from: 336, in: 18},
		],
		desktop: [
			{shot: HOME, from: 0},
			{shot: COHORT, from: 80},
			{shot: 'daily10-prize-longtime', from: 165},
			{shot: REWARDS, from: 250},
			{shot: HOME, from: 336, in: 18},
		],
		taps: [],
	},
};
