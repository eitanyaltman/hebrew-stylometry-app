/* Stylometry core: per-word exact binomial tests -> Higher Criticism (gamma0=0.35) -> leave-one-out t-test.
   Pairwise by design: a test uses only features present in the two texts being compared.
   Units are lists of verse ranges; counts are summed from a per-verse feature index. */
(function (g) {
  const S = { cache: {}, qt: {} }, LIM = { units: 5, tokens: 5000, perUnit: 250 };
  const sum = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  function lg(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, .1208650973866179e-2, -.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + .5) * Math.log(t); let s = 1.000000000190015; for (let j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { const T = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < T) d = T; d = 1 / d; let h = d;
    for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < T) d = T; c = 1 + aa / c; if (Math.abs(c) < T) c = T; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < T) d = T; c = 1 + aa / c; if (Math.abs(c) < T) c = T; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break; } return h; }
  function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lg(a + b) - lg(a) - lg(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const tsf = (t, df) => { const p = .5 * ibeta(df / (df + t * t), df / 2, .5); return t > 0 ? p : 1 - p; };
  // exact two-sided binomial p: outcomes at least as far from the mean as the observed count
  function binP(a, n, q) { if (q <= 0 || q >= 1) return 1; const mu = n * q, dev = Math.abs(a - mu) - 1e-9, lq = Math.log(q / (1 - q)); let lp = n * Math.log(1 - q), s = 0;
    for (let k = 0; k <= n; k++) { if (Math.abs(k - mu) >= dev) s += Math.exp(lp); lp += Math.log((n - k) / (k + 1)) + lq; } return Math.min(1, s); }
  function dHC(A, B) { const nA = sum(A), nB = sum(B), P = [];
    for (let w = 0; w < A.length; w++) { const a = A[w], n = a + B[w]; if (n) P.push(binP(a, n, (nA - a) / (nA + nB - n))); }
    P.sort((x, y) => x - y); const N = P.length, km = Math.max(1, Math.floor(.35 * N)); let m = -1e9;
    for (let i = 1; i <= km; i++) { const f = i / N, z = Math.sqrt(N) * (f - P[i - 1]) / Math.sqrt(f * (1 - f)); if (z > m) m = z; } return m; }
  function attrP(T, units, refs) { const F = T.length, C = new Float64Array(F);
    units.concat(refs).forEach(u => { for (let i = 0; i < F; i++) C[i] += u[i]; });
    const xp = dHC(T, C), xs = units.map(u => { const E = new Float64Array(F); for (let i = 0; i < F; i++) E[i] = C[i] + T[i] - u[i]; return dHC(u, E); });
    const m = xs.length, mean = sum(xs) / m, sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (m - 1)), t = (xp - mean) / (sd * Math.sqrt(1 + 1 / m));
    return { p: tsf(t, m - 1), x: xp, mean, sd, m }; }
  function init(idx) { S.idx = idx.books; S.feats = idx.features; S.F = idx.features.length; S.chap = {};
    for (const b in S.idx) { S.chap[b] = {}; for (const k in S.idx[b]) { const [c, v] = k.split('.').map(Number); (S.chap[b][c] = S.chap[b][c] || []).push(v); } }
    for (const b in S.chap) for (const c in S.chap[b]) S.chap[b][c].sort((x, y) => x - y);
    S.cache = {}; S.qt = {}; }
  const chapters = b => Object.keys(S.chap[b] || {}).map(Number).sort((x, y) => x - y);
  // range syntax: "Deut 6", "Deut 8-11" (whole chapters), "2Kgs 17:1-21", "Gen 5:3-28,30-32". Duplicates are removed.
  function verses(ranges) { const out = [], seen = new Set(), add = (b, c, v) => { const k = b + ' ' + c + '.' + v; if (!seen.has(k)) { seen.add(k); out.push([b, c, v]); } };
    for (const r of ranges) { const m = /^(\w+)\s+(\d+)(?:-(\d+))?(?::(.+))?$/.exec(r.trim()); if (!m) throw new Error('Bad range: ' + r); const b = m[1], c1 = +m[2];
      if (!S.idx[b]) throw new Error('Unknown book: ' + b);
      if (m[4]) m[4].split(',').forEach(p => { const [a, z] = p.split('-').map(Number); for (let v = a; v <= (z || a); v++) if (S.idx[b][c1 + '.' + v]) add(b, c1, v); });
      else for (let c = c1; c <= (+m[3] || c1); c++) (S.chap[b][c] || []).forEach(v => add(b, c, v)); }
    return out; }
  // token count without building a count vector (used for list displays)
  function quickTokens(ranges) { const key = JSON.stringify(ranges); if (key in S.qt) return S.qt[key]; let n = 0;
    for (const [b, c, v] of verses(ranges)) { const a = S.idx[b][c + '.' + v]; for (let i = 1; i < a.length; i += 2) n += a[i]; } return S.qt[key] = n; }
  // count vector for a unit; excl (a Set of "Book c.v") removes verses, e.g. to leave a tested text out of reference text
  function ucount(u, excl) { const key = JSON.stringify(u.ranges); if (!excl && S.cache[key]) return S.cache[key]; const arr = new Float64Array(S.F), vs = new Set();
    for (const [b, c, v] of verses(u.ranges)) { const id = b + ' ' + c + '.' + v; if (excl && excl.has(id)) continue; vs.add(id); const a = S.idx[b][c + '.' + v]; for (let i = 0; i < a.length; i += 2) arr[a[i]] += a[i + 1]; }
    let d = 0; for (let i = 0; i < arr.length; i++) if (arr[i] > 0) d++; const r = { arr, vs, tokens: sum(arr), distinct: d }; if (!excl) S.cache[key] = r; return r; }
  const overlap = (a, b) => { for (const x of a.vs) if (b.vs.has(x)) return true; return false; };
  // Test unit u against a corpus (list of unit ids). Testable corpus units that share verses with u are dropped;
  // reference-only units (e.g. auxiliary text) keep everything except the shared verses.
  function testVs(u, ids, units) { const T = ucount(u), tests = [], refs = [];
    for (const id of ids) { const d = units[id]; let c = ucount(d);
      if (overlap(T, c)) { if (!d.ref) continue; c = ucount(d, T.vs); if (!c.tokens) continue; }
      (d.ref ? refs : tests).push(c.arr); }
    return tests.length < 3 ? null : attrP(T.arr, tests, refs); }
  const internal = (ids, units) => ids.filter(id => !units[id].ref).map(id => ({ id, r: testVs(units[id], ids, units) }));
  function validate(ids, units) { const e = [], t = ids.filter(i => !units[i].ref); let tok = 0;
    ids.forEach(i => tok += ucount(units[i]).tokens);
    if (t.length < LIM.units) e.push(`Needs at least ${LIM.units} testable units (has ${t.length}).`);
    if (tok < LIM.tokens) e.push(`Needs at least ${LIM.tokens} tokens (has ${tok}).`);
    t.forEach(i => { const k = ucount(units[i]).tokens; if (k < LIM.perUnit) e.push(`${units[i].name} has ${k} tokens (minimum ${LIM.perUnit}).`); });
    return e; }
  // Genesis through Kings (OSHB book keys). To pre-build units for more books, add them here.
  const BOOKS = [['Gen', 'Genesis'], ['Exod', 'Exodus'], ['Lev', 'Leviticus'], ['Num', 'Numbers'], ['Deut', 'Deuteronomy'], ['Josh', 'Joshua'], ['Judg', 'Judges'],
    ['1Sam', '1 Samuel'], ['2Sam', '2 Samuel'], ['1Kgs', '1 Kings'], ['2Kgs', '2 Kings']];
  // one auto-generated unit per complete chapter, id "Book.chapter" (e.g. "Deut.6")
  function chapterUnits() { const out = {}; for (const [k, n] of BOOKS) for (const c of chapters(k)) out[k + '.' + c] = { name: n + ' ' + c, ranges: [k + ' ' + c], ref: false, auto: true, book: k, ch: c }; return out; }
  const api = { init, verses, ucount, quickTokens, chapters, chapterUnits, BOOKS, testVs, internal, validate, sum, LIM, S };
  if (typeof module !== 'undefined') module.exports = api; else g.Stylo = api;
})(this);
