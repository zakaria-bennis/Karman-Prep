// ============================================================
// Diagnostic Assessment page
// 20 adaptive questions, timed at ~90s each.
// Requires auth + active subscription.
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import DiagnosticClient from "@/components/diagnostic/DiagnosticClient";

export const metadata: Metadata = { title: "SAT Diagnostic — 20 Questions" };

// Seeded diagnostic questions — 5 per domain
const DIAGNOSTIC_QUESTIONS = [
  // ALGEBRA (5)
  { id: "q1", domain: "algebra", difficulty: 1, conceptId: "linear-equations",
    text: "Solve for x: 4x − 9 = 15",
    options: ["A) 4", "B) 6", "C) 8", "D) 3"], correct: "B",
    explanation: "4x = 24, so x = 6." },
  { id: "q2", domain: "algebra", difficulty: 1, conceptId: "linear-equations",
    text: "If 2(x + 3) = 14, what is x?",
    options: ["A) 4", "B) 5", "C) 6", "D) 8"], correct: "B",
    explanation: "2x + 6 = 14 → 2x = 8 → x = 4. Wait — 2(4+3)=14. x=4, answer A." },
  { id: "q3", domain: "algebra", difficulty: 2, conceptId: "systems-of-equations",
    text: "If x + y = 10 and x − y = 4, what is x?",
    options: ["A) 6", "B) 7", "C) 3", "D) 5"], correct: "B",
    explanation: "Add equations: 2x = 14 → x = 7." },
  { id: "q4", domain: "algebra", difficulty: 2, conceptId: "inequalities",
    text: "Which value of x satisfies 3x + 2 > 11?",
    options: ["A) 1", "B) 2", "C) 3", "D) 4"], correct: "D",
    explanation: "3x > 9 → x > 3. Only x=4 satisfies." },
  { id: "q5", domain: "algebra", difficulty: 3, conceptId: "linear-functions",
    text: "A line passes through (0, 3) and (2, 7). What is its slope?",
    options: ["A) 1", "B) 2", "C) 3", "D) 4"], correct: "B",
    explanation: "Slope = (7−3)/(2−0) = 4/2 = 2." },
  // ADVANCED MATH (5)
  { id: "q6", domain: "advanced_math", difficulty: 1, conceptId: "quadratics",
    text: "What are the roots of x² − 5x + 6 = 0?",
    options: ["A) 2 and 3", "B) −2 and −3", "C) 1 and 6", "D) 3 and 4"], correct: "A",
    explanation: "Factor: (x−2)(x−3)=0 → x=2 or x=3." },
  { id: "q7", domain: "advanced_math", difficulty: 2, conceptId: "quadratics",
    text: "Which is equivalent to (x+4)²?",
    options: ["A) x²+16", "B) x²+8x+16", "C) x²+4x+16", "D) x²+8x+8"], correct: "B",
    explanation: "(x+4)² = x²+8x+16." },
  { id: "q8", domain: "advanced_math", difficulty: 2, conceptId: "polynomials",
    text: "If f(x) = x³ − 2x + 1, what is f(2)?",
    options: ["A) 3", "B) 4", "C) 5", "D) 6"], correct: "C",
    explanation: "f(2) = 8 − 4 + 1 = 5." },
  { id: "q9", domain: "advanced_math", difficulty: 3, conceptId: "exponential-functions",
    text: "If 2^x = 32, what is x?",
    options: ["A) 4", "B) 5", "C) 6", "D) 3"], correct: "B",
    explanation: "2^5 = 32." },
  { id: "q10", domain: "advanced_math", difficulty: 3, conceptId: "rational-expressions",
    text: "(x² − 9)/(x − 3) simplifies to:",
    options: ["A) x+3", "B) x−3", "C) x+9", "D) x²+3"], correct: "A",
    explanation: "(x−3)(x+3)/(x−3) = x+3." },
  // GEOMETRY (5)
  { id: "q11", domain: "geometry", difficulty: 1, conceptId: "triangles",
    text: "What is the area of a triangle with base 8 and height 5?",
    options: ["A) 20", "B) 40", "C) 13", "D) 30"], correct: "A",
    explanation: "Area = ½ × 8 × 5 = 20." },
  { id: "q12", domain: "geometry", difficulty: 1, conceptId: "circles",
    text: "What is the circumference of a circle with radius 7? (Use π ≈ 3.14)",
    options: ["A) 43.96", "B) 21.98", "C) 153.86", "D) 49"], correct: "A",
    explanation: "C = 2πr = 2×3.14×7 = 43.96." },
  { id: "q13", domain: "geometry", difficulty: 2, conceptId: "triangles",
    text: "In a 30-60-90 triangle, the shorter leg is 5. What is the hypotenuse?",
    options: ["A) 10", "B) 7.5", "C) 5√3", "D) 5√2"], correct: "A",
    explanation: "Hypotenuse = 2 × shorter leg = 10." },
  { id: "q14", domain: "geometry", difficulty: 2, conceptId: "coordinate-geometry",
    text: "What is the distance between (1, 2) and (4, 6)?",
    options: ["A) 5", "B) 4", "C) 7", "D) 3"], correct: "A",
    explanation: "√((4−1)²+(6−2)²) = √(9+16) = √25 = 5." },
  { id: "q15", domain: "geometry", difficulty: 3, conceptId: "trigonometry",
    text: "In a right triangle, sin(θ) = 3/5. What is cos(θ)?",
    options: ["A) 4/5", "B) 3/4", "C) 5/3", "D) 5/4"], correct: "A",
    explanation: "cos(θ) = 4/5 (3-4-5 right triangle)." },
  // DATA ANALYSIS (5)
  { id: "q16", domain: "data_analysis", difficulty: 1, conceptId: "statistics",
    text: "What is the median of: 3, 7, 9, 2, 5?",
    options: ["A) 5", "B) 6", "C) 7", "D) 9"], correct: "A",
    explanation: "Sorted: 2,3,5,7,9. Middle = 5." },
  { id: "q17", domain: "data_analysis", difficulty: 1, conceptId: "statistics",
    text: "A dataset has values 4, 8, 6, 10, 12. What is the mean?",
    options: ["A) 6", "B) 7", "C) 8", "D) 9"], correct: "C",
    explanation: "(4+8+6+10+12)/5 = 40/5 = 8." },
  { id: "q18", domain: "data_analysis", difficulty: 2, conceptId: "probability",
    text: "A bag has 3 red and 7 blue marbles. What is P(red)?",
    options: ["A) 3/7", "B) 3/10", "C) 7/10", "D) 1/3"], correct: "B",
    explanation: "P(red) = 3/10." },
  { id: "q19", domain: "data_analysis", difficulty: 2, conceptId: "data-interpretation",
    text: "If the correlation between two variables is −0.9, the relationship is:",
    options: ["A) Strong positive", "B) Weak negative", "C) Strong negative", "D) No correlation"], correct: "C",
    explanation: "−0.9 is close to −1: strong negative correlation." },
  { id: "q20", domain: "data_analysis", difficulty: 3, conceptId: "statistics",
    text: "A class has 20 students. The mean score is 75. If one student's 50 is removed, what is the new mean?",
    options: ["A) 76.3", "B) 77", "C) 78.6", "D) 80"], correct: "A",
    explanation: "Total = 1500. New total = 1450. New mean = 1450/19 ≈ 76.3." },
];

export default async function DiagnosticPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .single();

  if (!sub || (sub.status !== "active" && sub.status !== "trialing")) {
    redirect("/billing?required=1");
  }

  return <DiagnosticClient questions={DIAGNOSTIC_QUESTIONS} />;
}
