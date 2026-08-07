# Supported-scope decision before policy evaluation

Status as of 2026-08-07: **the Temperate compatibility screen is complete;
authorize prospective freezing of the pass-only subset, but do not authorize
StrongBot outcome evaluation yet**.

The original role-blind target artifact contains 127 exact representatives:
67 Temperate, 41 Snow, 18 Urban, and one Desert map. The authorized asset tree
lacks `isosnow.mix` and `isourb.mix`; no equivalent files exist elsewhere under
the user's `pi_jss233` project or scratch allocation. Desert is unsupported by
the pinned Red Alert 2 engine contract. This asset availability was established
without policy outcomes.

The minimum viable study should therefore define its simulator-supported source
population as the 67 exact Temperate representatives. This is a scope
restriction, not an assertion that all 67 are valid.

Two independently verified, outcome-free full screens ran all 67 exact
representatives: job 21608050 at source commit `7e059926` and job 21608882 at
source commit `b245ae2`. Both completed all 134 reciprocal passive sessions on
their first attempts and returned exactly 54 `pass`, 7 `review`, and 6 `fail`
families. Normalized per-family status, path, map hash, failures, reviews, and
warning-category counts were identical. The evidence-tree commitments were
`68e51b29b0d96f395d48142f8cdb4a89bab00ddec6d0ab4b235e266d2e8364e3`
and `c8b8e94da46e494258896f934608a53ac7f15e3be8bbc1c2cd92c7795c7f12f4`.

The six failures were `mf_amazon01`, `mf_deadman`, `mf_isleland`,
`mf_lostlake`, `mf_mp20t6`, and `mf_tn01mw`. The seven review families were
`mf_892c5f7a62ab723d`, `mf_countryswing`, `mf_jungleofvietnam`,
`mf_lakeisland`, `mf_rekoool6playersfast`, `mf_rekoool8playersfast`, and
`mf_splitlevel`. These classifications concern parser/load/early-progress
compatibility only; no bot outcome was generated or inspected.

This scope supports an honest workshop paper about map-structure-conditioned
generalization within the Temperate RA2 simulator domain. It does not support
claims across all RA2 theaters or Yuri's Revenge. A stronger submission remains
conditional on the author supplying legally obtained Snow and Urban theater
archives, repeating compatibility screening, and broadening the confirmatory
population before policy results are inspected.

The next admissible action is to generate and commit a role-blind pass-only
manifest containing the exact intersection of the 54 passing families from the
two screens, with every exclusion and denominator reported. That manifest is a
candidate simulator-compatible population, not yet a train/validation/test
split. The evaluation-seed/start gate and `METHOD_INTERFACE_GATE.md` must still
pass before any StrongBot or Supalosa outcome is opened.
