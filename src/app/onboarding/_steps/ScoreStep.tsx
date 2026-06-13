"use client";

export function ScoreStep({
  prompt,
  value,
  onChange,
  icon,
}: {
  prompt: string;
  value: number;
  onChange: (n: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="inline-flex items-center gap-2 text-2xl font-extrabold text-ivory dark:text-ivory">
        {icon} {prompt}
      </h2>
      <p className="mt-2 text-sm text-taupe dark:text-taupe">SAT scores run 400-1600.</p>
      <div className="mt-8">
        <div className="mb-3 text-center text-5xl font-extrabold tabular-nums text-ivory dark:text-ivory">
          {value}
        </div>
        <input
          type="range"
          min={400}
          max={1600}
          step={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-info"
        />
        <div className="mt-2 flex justify-between text-xs tabular-nums text-taupe">
          <span>400</span>
          <span>800</span>
          <span>1200</span>
          <span>1600</span>
        </div>
      </div>
    </div>
  );
}
