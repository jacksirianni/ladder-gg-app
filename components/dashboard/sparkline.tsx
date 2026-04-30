/**
 * v3.0: tiny inline area-sparkline for the Pulse stat strip. Pure SVG
 * so it renders entirely on the server with no client cost. Math is
 * the standard "normalize to bbox + draw polyline" — a randomized id
 * keeps the gradient `<defs>` unique when multiple sparklines render
 * on the same page.
 */

let counter = 0;
function nextId() {
  counter += 1;
  return `spark-${counter}`;
}

type Props = {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
};

export function Sparkline({
  values,
  color = "var(--primary)",
  width = 72,
  height = 32,
}: Props) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const id = nextId();
  return (
    <svg
      width={width}
      height={height}
      className="block shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${id})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Build a synthetic 8-point trend that ramps to `current`. Used as
 * placeholder data until we wire a real weekly-counts fact table.
 *
 * Shape: gentle ascent with a small random-ish wobble, ending exactly
 * at `current`. Deterministic for a given input so SSR doesn't hydrate-
 * mismatch.
 */
export function rampToCurrent(current: number, points = 8): number[] {
  if (current <= 0) {
    // Decoration only — keep a tiny bumpy line so the sparkline area
    // still renders.
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }
  const result: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // Eased ramp 0..1, with deterministic micro-bumps.
    const eased = Math.pow(t, 1.4);
    const wobble = (i % 3 === 0 ? -0.08 : i % 3 === 1 ? 0.04 : 0.02) * current;
    const v = eased * current + wobble;
    result.push(Math.max(0, Math.round(v * 10) / 10));
  }
  result[points - 1] = current; // anchor exact endpoint
  return result;
}
