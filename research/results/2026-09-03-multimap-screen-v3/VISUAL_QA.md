# Visual QA

All three generated PNG figures were inspected at their native 1260-pixel
width through a read-only image transfer from Bouchet. No local project copy
or simulation was created for QA.

- All 13 map rows are shown, grouped by primary HFO revisions, HFO geometry
  controls, and distinct maps/revision control.
- Map labels, W/D/L counts, gate labels, axes, legends and caveats are readable.
- No overlapping labels or clipped rows were observed.
- Text uses explicit dark foregrounds on white backgrounds; numeric contrast
  checks are in validation.json.
- Cap draws and other draws are visibly separated, not merged into wins.
- PASS is marked as a screen decision only; the family-independence caveat is
  visible on every panel.
- Every figure is immediately followed by its compact table and full audit
  links in VISUAL_REPORT.md. REPORT.md contains no embedded images.

The report generator independently rechecked all 900 cell checksums, markers,
case/provenance bindings and literal-win certificates, and recomputed every
map summary/gate. The raw completed evidence was never edited.
