// Made-up questions with real answers, for the design page (no student signed in): what Start plays
// there, graded on the screen by LocalPlay.tsx. Nothing is saved. A signed-in student never sees
// these: their questions come from the live bank.
import type { LocalQuestion } from "./LocalPlay";

/** Eight made-up Circles questions. */
export const CIRCLES: LocalQuestion[] = [
  {
    text: "A circle has a radius of 6. What is its circumference?",
    choices: ["12π", "6π", "24π", "36π"],
    right: 0,
    why: "Circumference is 2πr, so 2 × π × 6 = 12π.",
  },
  {
    text: "A circle has a diameter of 10. What is its area?",
    choices: ["10π", "20π", "25π", "100π"],
    right: 2,
    why: "The radius is half the diameter, 5, and the area is πr² = 25π.",
  },
  {
    text: "A circle in the xy-plane has the equation (x − 2)² + (y + 1)² = 49. What is its center?",
    choices: ["(−2, 1)", "(2, −1)", "(2, 1)", "(−2, −1)"],
    right: 1,
    why: "In (x − h)² + (y − k)² = r² the center is (h, k). Here h = 2 and k = −1.",
  },
  {
    text: "A circle has a radius of 9. What is the length of an arc with a central angle of 40°?",
    choices: ["4π", "9π", "2π", "π"],
    right: 2,
    why: "The arc is 40/360 = 1/9 of the circumference 18π, so 18π ÷ 9 = 2π.",
  },
  {
    text: "A circle has a radius of 6. What is the area of a sector with a central angle of 60°?",
    choices: ["3π", "12π", "36π", "6π"],
    right: 3,
    why: "The sector is 60/360 = 1/6 of the area 36π, so 6π.",
  },
  {
    text: "A circle has the equation x² + y² − 6x + 8y = 0. What is its radius?",
    choices: ["3", "4", "5", "25"],
    right: 2,
    why: "Complete the squares: (x − 3)² + (y + 4)² = 9 + 16 = 25, so the radius is 5.",
  },
  {
    text: "A circle has a radius of 8. What is the length of an arc with a central angle of 3π/4 radians?",
    choices: ["6π", "3π", "8π", "12π"],
    right: 0,
    why: "In radians an arc is rθ, so 8 × 3π/4 = 6π.",
  },
  {
    text: "A circle in the xy-plane has the equation (x − 3)² + (y + 2)² = 25. What is its radius?",
    choices: ["3", "5", "10", "25"],
    right: 1,
    why: "The equation (x − h)² + (y − k)² = r² has radius r. Here r² = 25, so the radius is 5.",
  },
];
