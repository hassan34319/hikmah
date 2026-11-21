// Solves admission-test puzzles from the payload the page receives, so the demo applicant scores realistically.
// Reads each puzzle from the server action response (the same data the browser renders).

export function watchItems(page) {
  const state = { item: null };
  page.on('response', async (res) => {
    try {
      if (res.request().method() !== 'POST' || !res.request().headers()['next-action']) return;
      const text = await res.text();
      const at = text.indexOf('"item":{');
      if (at < 0) return;
      let i = at + 7, depth = 0, end = -1;
      for (let k = i; k < text.length; k++) { const c = text[k]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = k + 1; break; } } }
      if (end > 0) state.item = JSON.parse(text.slice(i, end));
    } catch { /* ignore */ }
  });
  return state;
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function solvePattern({ cells, options }) {
  const known = cells.map((c, i) => (c ? { c, r: Math.floor(i / 3), col: i % 3 } : null)).filter(Boolean);
  const target = {};
  for (const k of ['s', 'n', 'r', 'f']) {
    const rules = [
      (r, c) => `row${r}`, (r, c) => `col${c}`, (r, c) => `sum${(r + c) % 3}`,
    ];
    let val;
    for (const rule of rules) {
      const map = {}; let ok = true;
      for (const { c, r, col } of known) { const key = rule(r, col); if (key in map && map[key] !== c[k]) { ok = false; break; } map[key] = c[k]; }
      if (ok && rule(2, 2) in map) { val = map[rule(2, 2)]; break; }
    }
    if (val === undefined) { // rotation stepping by row+col mod 4
      const base = known.find((x) => x.r === 0 && x.col === 0).c[k];
      val = (base + 4) % 4;
    }
    target[k] = val;
  }
  const idx = options.findIndex((o) => o.s === target.s && o.n === target.n && o.r === target.r && o.f === target.f);
  return idx >= 0 ? idx : 0;
}

function solveSequence({ terms, options }) {
  const t = terms; const n = t.length;
  const cands = [];
  const d = t.slice(1).map((x, i) => x - t[i]);
  if (d.every((x) => x === d[0])) cands.push(t[n - 1] + d[0]);
  if (t[0] !== 0) { const r = t[1] / t[0]; if (t.every((x, i) => i === 0 || x === t[i - 1] * r)) cands.push(t[n - 1] * r); }
  const dd = d.slice(1).map((x, i) => x - d[i]);
  if (dd.every((x) => x === dd[0])) cands.push(t[n - 1] + d[d.length - 1] + dd[0]);
  if (t.every((x, i) => i < 2 || x === t[i - 1] + t[i - 2])) cands.push(t[n - 1] + t[n - 2]);
  if (t.every((x, i) => i === 0 || x === 2 * t[i - 1] + 1)) cands.push(2 * t[n - 1] + 1);
  if (d.length >= 3 && d.every((x, i) => x === d[i % 2])) cands.push(t[n - 1] + d[n % 2 === 0 ? 1 : 0]);
  for (const c of cands) { const i = options.indexOf(c); if (i >= 0) return i; }
  return 0;
}

function solveOdd({ items }) {
  for (const k of ['s', 'n', 'f', 'r']) {
    const vals = items.map((x) => x[k]);
    for (let i = 0; i < vals.length; i++) {
      const others = vals.filter((_, j) => j !== i);
      if (others.every((v) => v === others[0]) && vals[i] !== others[0]) return i;
    }
  }
  return 0;
}

function solveLogic({ question }) {
  const sk = question.replace(/\b[a-z]+s\b/g, (w) => (['are', 'is'].includes(w) ? w : 'X')).replace(/\s+/g, ' ');
  const table = [
    [/^All X are X\. All X are X\. Are all X X\?$/, 0],
    [/^All X are X\. Some X are X\. Are some X definitely X\?$/, 2],
    [/^No X are X\. All X are X\. Can any X be X\?$/, 1],
    [/^Some X are X\. All X are X\. Are some X X\?$/, 0],
    [/^All X are X\. Are all X X\?$/, 2],
    [/^No X are X\. Are some X X\?$/, 1],
    [/^All X are X\. Some X are not X\. Are some X not X\?$/, 0],
    [/^Some X are X\. Some X are X\. Are some X definitely X\?$/, 2],
  ];
  for (const [re, a] of table) if (re.test(sk)) return a;
  return 2;
}

/** Returns the answer index (or tile sequence for memory). */
export function solve(item) {
  const p = item.payload;
  switch (item.game) {
    case 'pattern': return solvePattern(p);
    case 'sequence': return solveSequence(p);
    case 'odd': return solveOdd(p);
    case 'logic': return solveLogic(p);
    case 'memory': return p.sequence;
    default: return 0;
  }
}
