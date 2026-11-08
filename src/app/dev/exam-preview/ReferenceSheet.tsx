"use client";

import MathText from "@/components/learn/MathText";
import { QuestionGuide } from "@/components/learn/quiz/QuizTools";

// The standard SAT Math reference facts, written out as text (no copied artwork).
const FORMULAS: [string, string][] = [
  ["Circle", "\\(A = \\pi r^2\\), \\(C = 2\\pi r\\)"],
  ["Rectangle", "\\(A = \\ell w\\)"],
  ["Triangle", "\\(A = \\frac{1}{2}bh\\)"],
  ["Pythagorean theorem", "\\(c^2 = a^2 + b^2\\)"],
  [
    "Special right triangles",
    "\\(30^\\circ\\)-\\(60^\\circ\\)-\\(90^\\circ\\): sides \\(x\\), \\(x\\sqrt{3}\\), \\(2x\\); \\(45^\\circ\\)-\\(45^\\circ\\)-\\(90^\\circ\\): sides \\(s\\), \\(s\\), \\(s\\sqrt{2}\\)",
  ],
  ["Rectangular prism", "\\(V = \\ell wh\\)"],
  ["Cylinder", "\\(V = \\pi r^2 h\\)"],
  ["Sphere", "\\(V = \\frac{4}{3}\\pi r^3\\)"],
  ["Cone", "\\(V = \\frac{1}{3}\\pi r^2 h\\)"],
  ["Pyramid", "\\(V = \\frac{1}{3}\\ell wh\\)"],
];

export default function ReferenceSheet({ onClose }: { onClose(): void }) {
  return (
    <QuestionGuide onClose={onClose}>
      <p>Reference</p>
      <dl className="grid gap-2 text-sm">
        {FORMULAS.map(([name, formula]) => (
          <div key={name} className="flex flex-wrap gap-x-3 border-b border-bronze/50 pb-2">
            <dt className="font-semibold">{name}</dt>
            <dd>
              <MathText text={formula} />
            </dd>
          </div>
        ))}
      </dl>
      <p>
        The number of degrees of arc in a circle is 360. The number of radians of arc in a circle is
        2π. The sum of the measures in degrees of the angles of a triangle is 180.
      </p>
    </QuestionGuide>
  );
}
