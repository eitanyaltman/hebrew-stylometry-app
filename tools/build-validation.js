// Usage (from repo root): node tools/build-validation.js  -> writes validation.html
const fs = require('fs'), Stylo = require('../stylo.js');
const idx = JSON.parse(fs.readFileSync('data/index.json')), base = JSON.parse(fs.readFileSync('data/corpora.json')), PAPER = JSON.parse(fs.readFileSync('tools/paper-table1.json'));
Stylo.init(idx);
const U = { ...Stylo.chapterUnits(), ...base.units }, K = ['D', 'DtrH', 'P'], C = base.corpora;
const pk = id => { const u = U[id]; if (id === '2Kgs.17.1-21') return '2 Kgs 17'; return u.name.replace(/^(\d) (\w+)/, '$1 $2').replace('Genesis', 'Gen').replace('Exodus', 'Exod').replace('Leviticus', 'Lev').replace('Deuteronomy', 'Deut').replace('Joshua', 'Josh').replace('Judges', 'Judg').replace('Samuel', 'Sam').replace('Kings', 'Kgs'); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fp = p => p < 1e-2 ? p.toExponential(1).replace('e-', '×10⁻').replace(/⁻(\d)/, (m, d) => '⁻' + '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]) : p.toFixed(2);
const fx = n => n.toLocaleString('en-US');
// corpus stats
const stats = {}; let tot = 0;
for (const k of K) { const ids = C[k].units, test = ids.filter(i => !U[i].ref), F = new Set(); let t = 0, aux = 0;
  const tk = test.map(i => Stylo.ucount(U[i]).tokens).sort((a, b) => a - b);
  for (const i of ids) { const c = Stylo.ucount(U[i]); t += c.tokens; if (U[i].ref) aux += c.tokens; c.arr.forEach((x, j) => x > 0 && F.add(j)); }
  stats[k] = { units: test.length, tokens: t - aux, aux, dict: F.size, med: tk[tk.length >> 1] }; tot += t - aux; stats[k].F = F; }
const un = new Set(); K.forEach(k => stats[k].F.forEach(j => un.add(j)));
const PD = { D: 594, DtrH: 821, P: 846 }, PU = 1447, PAUX = 5077;
// 50 chapters
const rows = []; const lab = {};
for (const k of K) for (const id of C[k].units) if (!U[id].ref) lab[id] = k;
for (const id of Object.keys(lab)) { const p = {}; for (const k of K) { const r = Stylo.testVs(U[id], C[k].units.filter(x => x !== id), U); p[k] = r.p; }
  const n = pk(id), pp = K.map(k => PAPER[k][n]); rows.push({ id, n, tr: lab[id], ours: p, paper: pp, tok: Stylo.ucount(U[id]).tokens }); }
const cells = rows.flatMap(r => K.map((k, i) => ({ r, k, i, o: r.ours[k], p: r.paper[i] }))).filter(c => c.p != null);
const agree = cells.filter(c => (c.o <= .05) === (c.p <= .05)).length;
const dif = cells.map(c => Math.abs(c.o - c.p)).sort((a, b) => a - b), med = dif[dif.length >> 1], mean = dif.reduce((a, b) => a + b, 0) / dif.length;
const am = a => a.indexOf(Math.max(...a)), correct = rows.filter(r => K[am(K.map(k => r.ours[k]))] === r.tr).length;
const pcorrect = rows.filter(r => r.paper.every(x => x != null) && K[am(r.paper)] === r.tr).length, pn = rows.filter(r => r.paper.every(x => x != null)).length;
const rank = a => { const s = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = []; s.forEach((e, j) => r[e[1]] = j); return r; };
const spear = c => { const a = rank(c.map(x => x.o)), b = rank(c.map(x => x.p)), n = a.length, ma = (n - 1) / 2; let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - ma); sa += (a[i] - ma) ** 2; sb += (b[i] - ma) ** 2 } return s / Math.sqrt(sa * sb); };
console.error({ tot, correct, pcorrect, pn, agree, n: cells.length, med, mean, dict: K.map(k => stats[k].dict), union: un.size, aux: stats.P.aux });
// plots
const W = 330, H = 330, M = { l: 44, r: 10, t: 12, b: 38 }, LO = -6, sx = v => M.l + (Math.log10(Math.max(v, 1e-6)) - LO) / -LO * (W - M.l - M.r), sy = v => H - M.b - (Math.log10(Math.max(v, 1e-6)) - LO) / -LO * (H - M.t - M.b);
const SH = { D: (x, y) => `<circle cx="${x}" cy="${y}" r="4.5"/>`, DtrH: (x, y) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8"/>`, P: (x, y) => `<path d="M${x} ${y - 5.5}L${x + 5} ${y + 4}L${x - 5} ${y + 4}Z"/>` };
function plot(i) { const k = K[i], cs = cells.filter(c => c.i === i); let g = '';
  for (let e = LO; e <= 0; e++) { const v = 10 ** e; g += `<line class="gr" x1="${M.l}" x2="${W - M.r}" y1="${sy(v)}" y2="${sy(v)}"/><line class="gr" y1="${M.t}" y2="${H - M.b}" x1="${sx(v)}" x2="${sx(v)}"/><text class="tk" x="${M.l - 5}" y="${sy(v) + 3}" text-anchor="end">${e === 0 ? '1' : '10⁻' + '⁰¹²³⁴⁵⁶⁷⁸⁹'[-e]}</text><text class="tk" x="${sx(v)}" y="${H - M.b + 13}" text-anchor="middle">${e === 0 ? '1' : '10⁻' + '⁰¹²³⁴⁵⁶⁷⁸⁹'[-e]}</text>`; }
  g += `<line class="dg" x1="${sx(1e-6)}" y1="${sy(1e-6)}" x2="${sx(1)}" y2="${sy(1)}"/><line class="th" x1="${sx(.05)}" x2="${sx(.05)}" y1="${M.t}" y2="${H - M.b}"/><line class="th" y1="${sy(.05)}" y2="${sy(.05)}" x1="${M.l}" x2="${W - M.r}"/>`;
  cs.forEach(c => { const x = sx(c.p).toFixed(1), y = sy(c.o).toFixed(1); g += `<g class="pt ${c.r.tr}" tabindex="0"><title>${esc(c.r.n)} (${c.r.tr}): paper ${fp(c.p)}, ours ${fp(c.o)}</title>${SH[c.r.tr](+x, +y)}</g>`; });
  const ok = cs.filter(c => (c.o <= .05) === (c.p <= .05)).length;
  return `<figure><figcaption><b>Tested against ${k}</b><br><span class="m">Spearman ρ = ${spear(cs).toFixed(2)} · same side of 0.05: ${ok}/${cs.length}</span></figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Scatter of paper p-values (x) against ours (y) for the ${k} corpus, log scale. Values are in the table below.">${g}<text class="ax" x="${(M.l + W - M.r) / 2}" y="${H - 4}" text-anchor="middle">paper's p</text><text class="ax" transform="translate(11 ${(M.t + H - M.b) / 2}) rotate(-90)" text-anchor="middle">our p</text></svg></figure>`; }
const trow = r => `<tr><td>${esc(r.n)}</td><td>${r.tr}</td><td class="n">${r.tok}</td>${K.map((k, i) => { const o = r.ours[k], p = r.paper[i], fl = p != null && (o <= .05) !== (p <= .05); return `<td class="n${fl ? ' fl' : ''}">${fp(o)}</td><td class="n pp${fl ? ' fl' : ''}">${p == null ? '–' : fp(p)}</td>` }).join('')}</tr>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reproduction vs. the paper</title>
<style>
:root{color-scheme:light dark;--bg:#fcfcfb;--fg:#0b0b0b;--mut:#52514e;--bd:#d6d5d0;--ac:#1f5fbf;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--fl:#fde7e0}
@media(prefers-color-scheme:dark){:root{--bg:#1a1a19;--fg:#f0efec;--mut:#c3c2b7;--bd:#444;--ac:#6ea8ff;--s1:#3987e5;--s2:#d95926;--s3:#199e70;--fl:#4a2a20}}
body{margin:0 auto;padding:12px 14px 40px;max-width:1040px;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,sans-serif}
h1{font-size:20px}h2{font-size:16px;margin-top:28px}a{color:var(--ac)}.m{color:var(--mut);font-size:12px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--bd);padding:3px 6px;text-align:left}th{font-weight:600}.n{text-align:right;font-variant-numeric:tabular-nums}.pp{color:var(--mut)}td.fl{background:var(--fl)}.t{overflow-x:auto}
.pl{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;flex:1 1 300px}svg{width:100%;height:auto;display:block}
.gr{stroke:var(--bd);stroke-width:1}.dg{stroke:var(--mut);stroke-width:1.5;stroke-dasharray:4 3}.th{stroke:var(--mut);stroke-width:1;opacity:.5}.tk,.ax{fill:var(--mut);font-size:10px}.ax{font-size:11px}
.pt{stroke:var(--bg);stroke-width:2;paint-order:stroke;opacity:.92}.pt:hover,.pt:focus{opacity:1;stroke:var(--fg);stroke-width:1.5;outline:none}.pt.D{fill:var(--s1)}.pt.DtrH{fill:var(--s2)}.pt.P{fill:var(--s3)}
.lg{display:flex;gap:16px;flex-wrap:wrap;margin:6px 0}.lg svg{width:14px;height:14px;display:inline;vertical-align:-2px}.lg .D{fill:var(--s1)}.lg .DtrH{fill:var(--s2)}.lg .P{fill:var(--s3)}
</style></head><body>
<p><a href="index.html">&larr; Back to the app</a></p>
<h1>How closely does this app reproduce the paper?</h1>
<p class="m">Faigenbaum-Golovin et al., "Critical biblical studies via word frequency analysis: unveiling text authorship", PLOS ONE 2025. This page is generated by <code>tools/build-validation.js</code> using the same engine and data the app uses.</p>

<h2>What we did</h2>
<p><b>Data.</b> Open Scriptures Hebrew Bible (the same source as the paper), Genesis–Kings. Each word is reduced to lemma tokens: a written word split into its lemma pieces, proper names collapsed to one &lt;Np&gt; token and gentilics to &lt;Ng&gt;, and pronominal suffixes kept as their own tokens. These rules were tuned until our token counts matched the authors' published spreadsheet for all 50 tested chapters exactly (${fx(tot)} tokens in total). Qere variant words are counted, as the authors do.</p>
<p><b>Corpora.</b> The three ground-truth corpora (D, DtrH, P) use the chapter lists of the paper's Table S1. The preprint's text and its Table 1 disagree about which P chapters are included (Gen 1 versus Lev 4); we followed the table. The P corpus also includes the auxiliary narrative verses, as counts only (never tested).</p>
<p><b>Statistics.</b> For each word in a pair of texts, an exact two-sided binomial test gives a p-value. Higher Criticism (γ₀ = 0.35) summarises these over the words present in the pair. Each corpus chapter is scored the same way against the rest of its corpus (leave-one-out), and the test chapter's score is compared with those by a t-test. The attribution is the corpus with the largest p-value. Each tested chapter is left out of its own corpus.</p>
<p><b>Tried without improvement.</b> Several variations of the token rules (compound lemmas, suffixes, proper names) either moved token counts away from the authors' spreadsheet or did not bring the p-values closer.</p>

<h2>Corpus summary</h2>
<div class="t"><table><tr><th>Corpus</th><th class="n">Tested chapters</th><th class="n">Tokens</th><th class="n">Median tokens / chapter</th><th class="n">Dictionary (ours)</th><th class="n">Dictionary (paper)</th></tr>
${K.map(k => `<tr><td>${k}</td><td class="n">${stats[k].units}</td><td class="n">${fx(stats[k].tokens)}</td><td class="n">${stats[k].med}</td><td class="n">${stats[k].dict}</td><td class="n pp">${PD[k]}</td></tr>`).join('')}
<tr><td>All three</td><td class="n">${rows.length}</td><td class="n">${fx(tot)}</td><td class="n"></td><td class="n">${un.size}</td><td class="n pp">${PU}</td></tr>
<tr><td>P auxiliary text</td><td class="n"></td><td class="n">${fx(stats.P.aux)}</td><td class="n"></td><td class="n"></td><td class="n pp">${fx(PAUX)} tokens</td></tr></table></div>
<p class="m">Tested-chapter token totals match the authors' spreadsheet exactly. Dictionary = distinct lemma features in the corpus (P includes the auxiliary text). Our auxiliary verse list has 276 verses against 289 described in the paper, and our auxiliary token count is about 8% higher; we have not found why.</p>

<h2>The 50 tested chapters</h2>
<p><b>Attribution:</b> ours ${correct}/50 correct (${Math.round(correct * 2)}%); the paper reports 41/49 (84%). <b>Decision at p ≤ 0.05:</b> same reject/accept call in ${agree} of ${cells.length} cells. <b>Size of difference:</b> median |Δp| = ${med.toFixed(3)}, mean ${mean.toFixed(3)}. The values are correlated but not identical: wherever the paper has very small p-values ours are usually small too, but individual values often differ.</p>
<div class="lg" aria-hidden="true"><span><svg viewBox="0 0 14 14" class="D"><circle cx="7" cy="7" r="5"/></svg> chapter belongs to D</span><span><svg viewBox="0 0 14 14" class="DtrH"><rect x="2" y="2" width="10" height="10"/></svg> to DtrH</span><span><svg viewBox="0 0 14 14" class="P"><path d="M7 1L13 12H1z"/></svg> to P</span><span class="m">Dashed line = agreement; faint lines = 0.05. Hover a point for its chapter.</span></div>
<div class="pl">${[0, 1, 2].map(plot).join('')}</div>
<p class="m">Log scales; p-values below 10⁻⁶ are plotted at the edge. Gen 1 is not among the 50 chapters (we follow Table S1, which has Lev 4 instead).</p>
<h3>All chapters</h3>
<div class="t"><table><tr><th rowspan="2">Chapter</th><th rowspan="2">Corpus</th><th rowspan="2" class="n">Tokens</th><th colspan="2">vs D</th><th colspan="2">vs DtrH</th><th colspan="2">vs P</th></tr><tr><th class="n">ours</th><th class="n">paper</th><th class="n">ours</th><th class="n">paper</th><th class="n">ours</th><th class="n">paper</th></tr>
${rows.map(trow).join('')}</table></div>
<p class="m">Shaded cells fall on the opposite side of 0.05 from the paper's value. The paper prints two decimals (or three significant digits for small values). Each chapter's own corpus is computed without that chapter.</p>

<h2>Known differences</h2>
<ul><li>Tokens for the 50 chapters match; the auxiliary text does not (above).</li><li>Dictionary sizes are within a few words of the paper's but not equal.</li><li>The remaining p-value differences are unexplained. Per-word p-values we spot-checked against the authors' discriminating-word lists agreed for a minority of words (roughly 20–40% within about 12%, depending on the corpus).</li><li>The paper's 2 Kgs 17 is verses 1–21 only, as in the app.</li></ul>
<p class="m">Hebrew text and morphology: Open Scriptures Hebrew Bible, CC BY.</p>
</body></html>`;
fs.writeFileSync('validation.html', html);
