/** Figures for the pattern and odd-one-out games: shape s, count n, rotation r (marker), fill f. */
export type Fig = { s: number; n: number; r: number; f: number };

const COLORS = ["#1E4F86", "#1F7A4D", "#B45309", "#7C3AED", "#BE123C"];

function Glyph({ s, r, f, x, y, size }: { s: number; r: number; f: number; x: number; y: number; size: number }) {
  const c = COLORS[s % COLORS.length]!;
  const k = size;
  const fill = f ? c : "#fff";
  const stroke = c;
  const shape = (() => {
    switch (s) {
      case 0: return <circle r={k} />;
      case 1: return <rect x={-k} y={-k} width={2 * k} height={2 * k} rx={k * 0.15} />;
      case 2: return <polygon points={`0,${-k * 1.1} ${k * 1.05},${k * 0.8} ${-k * 1.05},${k * 0.8}`} />;
      case 3: return <polygon points={`0,${-k * 1.15} ${k * 1.15},0 0,${k * 1.15} ${-k * 1.15},0`} />;
      default: return <polygon points={Array.from({ length: 6 }, (_, i) => `${Math.cos((Math.PI / 3) * i) * k * 1.05},${Math.sin((Math.PI / 3) * i) * k * 1.05}`).join(" ")} />;
    }
  })();
  return (
    <g transform={`translate(${x} ${y})`}>
      <g fill={fill} stroke={stroke} strokeWidth={2.2}>{shape}</g>
      <g transform={`rotate(${r * 90})`}>
        <line x1={0} y1={0} x2={0} y2={-k * 0.75} stroke={f ? "#fff" : c} strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={0} cy={-k * 0.75} r={k * 0.16} fill={f ? "#fff" : c} />
      </g>
    </g>
  );
}

export function Figure({ fig, size = 76 }: { fig: Fig; size?: number }) {
  const n = Math.max(1, Math.min(3, fig.n));
  const k = n === 1 ? 17 : n === 2 ? 12.5 : 10.5;
  const pos = n === 1 ? [[30, 30]] : n === 2 ? [[17, 30], [43, 30]] : [[30, 16], [16, 42], [44, 42]];
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true">
      {pos.map(([x, y], i) => <Glyph key={i} s={fig.s} r={fig.r} f={fig.f} x={x!} y={y!} size={k} />)}
    </svg>
  );
}
