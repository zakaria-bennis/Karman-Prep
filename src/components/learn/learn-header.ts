// How far from the top of the viewport, in pixels, content must start to clear LearnLayout's fixed
// top bar. Calculator hosts on learn pages pass it as the dock's `dockTop` (AR-24). This module
// imports nothing, so hosts and the Vite fixture can use it without linking LearnLayout's Clerk
// widgets; LearnLayout.tsx re-exports it.
export const LEARN_HEADER_CLEARANCE = 72;
