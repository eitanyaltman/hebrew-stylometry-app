# Hebrew Stylometry (Higher Criticism)

Static web app reproducing the method of Faigenbaum-Golovin et al. (PLOS ONE 2025). Data: Open Scriptures Hebrew Bible (CC BY), https://github.com/openscriptures/morphhb

Built-in corpora live in `data/corpora.json`; the verse index is `data/index.json`.

## V2
- Pre-built unit for every chapter of Genesis–2 Kings, grouped by book; a "Custom" group holds units built from partial chapters.
- Unit builder: type ranges or pick verses from a book → chapter → verse tree; Preview Hebrew.
- `validation.html`: results versus the paper. Regenerate with `node tools/build-validation.js` (run from the repo root).
- Add more books to the unit tree by extending `BOOKS` in `stylo.js`.
