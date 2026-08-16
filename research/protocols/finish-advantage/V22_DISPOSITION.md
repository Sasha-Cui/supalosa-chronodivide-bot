# V22 disposition

V22 is preserved as a valid policy-audit record but is **not integration
eligible**. Its shared-selector patch would alter the unchanged V5 comparator
and duplicate the explicit strict-mode correction already present in V18.

The authoritative integration rule is amendment 9: move the V22 behavioral
examples to `terminalBaseRaceGuard.test.ts`, integrate no V22 production file,
and preserve both strict-candidate and legacy-comparator semantics.
