# Confidence and Entailment Self-Consistency Check

This is **not a formal calibration curve or accuracy estimate**. The 30-row working set has no labels. It is a transparent manual plausibility review of the 27 extracted attribute observations: whether the source excerpt grounds the value, whether the assigned attribute label looks semantically appropriate, and whether the final retain/reject disposition looks reasonable.

## By entailment label

| Label | Observations | Retained | Manually correct-looking |
|---|---:|---:|---:|
| Supported | 23 | 23 (100.00%) | 17 (73.91%) |
| Partially supported | 2 | 2 (100.00%) | 2 (100.00%) |
| Not supported | 2 | 0 (0.00%) | 1 (50.00%) |
| Ambiguous | 0 | 0 | Not observed |

All 23 `supported` values survived adjudication, but six assignments looked semantically questionable despite having verbatim excerpts—for example a brand treated as `Series`, an MPN treated as `Series`, or an over-broad description treated as `Model`. This is why excerpt entailment should not be presented as attribute-label accuracy.

Both `partially_supported` observations produced reasonable-looking normalized voltage outputs. Of the two `not_supported` observations, rejecting `Milw` as a Series looked correct; rejecting `115V` for the bandsaw looked overly conservative because the value appears verbatim.

## By confidence tier

| Verification confidence | Observations | Retained | Manually correct-looking |
|---|---:|---:|---:|
| High (0.95–1.00) | 25 | 23 (92.00%) | 18 (72.00%) |
| Medium (0.80–0.949) | 1 | 1 (100.00%) | 1 (100.00%) |
| Low (<0.80) | 1 | 1 (100.00%) | 1 (100.00%) |

The two lower-tier observations are too few to support any confidence-calibration conclusion. The high tier is also not cleanly calibrated: 72.00% looked correct under this manual rubric, mainly because high entailment confidence can coexist with a wrong attribute label. Treat these figures as a debugging signal, not model reliability.

## Reproducibility

The JSON artifact includes all 27 decisions and the manual note applied to each. The six supported label assignments counted as questionable are declared in `backend/scripts/publish_confidence_self_check.py`; the bandsaw voltage rejection is separately identified. Changing the rubric therefore produces a reviewable diff rather than an unexplained metric.
