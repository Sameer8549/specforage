# SpecForge dual evaluation report

**Run date:** 2026-08-16  
**Pipeline:** deployed `/process` endpoint at `specforge-backend-production.up.railway.app`  
**Model:** `nvidia/nemotron-3.5-lightning-30b-a3b`  
**Artifacts:** [`backend/data/working_set_results.json`](backend/data/working_set_results.json) contains the compact stage evidence; [`backend/scripts/run_working_set.py`](backend/scripts/run_working_set.py) contains the reproducible cohort selection and runner.

## What these results do—and do not—mean

This report deliberately keeps two evaluations separate:

- The **official set** contains two labeled dishwasher rows. Accuracy statements are possible, subject to the known limitation that the supplied UNSPSC labels are blank and the supplied classpath uses a private merchandising taxonomy.
- The **working set** contains 30 unlabeled catalog rows selected from `sample_1000_items.csv`. Its percentages describe pipeline behavior and self-assessed confidence only. They are **not accuracy scores**.

The working cohort was selected by a deterministic greedy TF-IDF diversity pass over descriptions of at least 22 characters. It rewards text dissimilarity, description richness, and manufacturer diversity. This is deliberate coverage sampling, not random sampling. All 30 rows were then submitted individually to `/process`; `/eval` was not used.

## Dual results table

| Measure | Official two-row ground truth | 30-row diverse working set |
|---|---:|---:|
| Interpretation | Scored against supplied truth where comparable | Self-reported behavior on unlabeled data; **not accuracy** |
| Rows completed | 2/2 | 30/30 |
| Distinct resolved UNSPSC commodities | Dishwasher-focused | 14 |
| Successfully classified | Both rows produced a classification, but no compatible truth label exists for scoring | 46.67% (14/30) |
| Average classification confidence | Not aggregated by `/eval` | 0.392 across all rows; 0.840 among resolved rows |
| Rows with retained, evidence-backed attributes | Both sparse rows produced a very small number of values | 46.67% (14/30) |
| Attribute coverage | 6.67% (2/30 expected values) | 19.84% (25/126 expected values on resolved rows) |
| Character-limit compliance | 90.00% (9/10 generated fields) | 74.29% (78/105 generated fields) |
| Routed to review | 100% | 100% |
| Manufacturer exact accuracy | 50.00% | Not scored—no labels |
| Brand exact accuracy | 0.00% | Not scored—no labels |
| Attribute exact accuracy | 0.00% | Not scored—no labels |
| Description exact accuracy | 0.00% | Not scored—no labels |
| Classpath accuracy | Not directly comparable—no UNSPSC-to-private-taxonomy mapping | Not scored—no labels |
| Overall official score | 2.63% across comparable exact-match fields | Not applicable |

Vocabulary compliance is intentionally not substituted for coverage. The official run reported 0% over the two values it could actually evaluate, while the working-set extraction coverage above measures how often expected fields received a retained value. Missing attributes remain missing; they are not mislabeled as vocabulary failures.

## Working-set detail

“Yield” is final adjudicated attributes divided by the expected-attribute count. A `0/0` row is unresolved classification: no category schema was selected, so extraction was correctly skipped. Character compliance is the pipeline’s per-record percentage over generated description fields.

| CSV row | MPN | Input description | Predicted UNSPSC / commodity | Confidence | Yield | Character compliance | Review |
|---:|---|---|---|---:|---:|---:|---|
| 43 | 49-94-0907 | Milw 4-1/2×1/8×5/8-11 Perform+ Dual Metal Cut n Grind Disc | 27111507 Metal cutters | 0.850 | 1/9 | 80.00% | Yes |
| 100 | 44-A | Light Chocolate 44-A Mortar - Type N | 30111504 Mortars | 0.850 | 2/9 | 80.00% | Yes |
| 166 | 543144016 | Island Mist Sq Edge - Trex Transcend Lineage Decking | Unresolved | 0.000 | 0/0 | 66.67% | Yes |
| 242 | ADR5117512FW | French White Oak - Landmark Azek PVC Fascia | 25172608 Fascias | 0.850 | 2/9 | 80.00% | Yes |
| 287 | 543340896 | Black Alum Post Sleeve Select Alum Railing - w/Cap & Skirt | 30103102 Aluminum rail | 0.850 | 2/9 | 100.00% | Yes |
| 299 | 925219 | 2×50 ft Deck Joist Tape - Protecto Wrap | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 301 | 1517602 | 6068R Gliding Patio Dr 4500 United Blk Ext/WH Int LowE Arg w/J | 30171501 Glass doors | 0.850 | 2/9 | 100.00% | Yes |
| 305 | FS C01 2004S | Velux Fixed Skylight Gray/White with Solar Shade | 51287008 Solasulfone | 0.850 | 1/9 | 80.00% | Yes |
| 308 | 1501831 | Basement ecoLitePlus White Hopper DLA w/Screen | Unresolved | 0.000 | 0/0 | 66.67% | Yes |
| 316 | 1513577 | Doug Fir STK Smooth 1S2E | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 600 | 2/2/4 UD ALUM | Aluminum Triplex Wire (Linear Foot) | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 618 | 174-0CSB3-15W | Toggle 3-Way Switch White | 39122211 Toggle switch | 0.850 | 2/9 | 80.00% | Yes |
| 642 | PS960YPFS | GE 30-inch Electric Range SS - Display Only | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 674 | K527APBXR | Senco .131×3 SM BB - 500 count | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 677 | E28CNKHA | Prebena 2/4×1-1/8 Staple | 44122107 Staples | 0.850 | 2/9 | 80.00% | Yes |
| 759 | 35459 | Mason Line Board Orange - 500 ft Replacement | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 768 | 55227 | Amana Countersink/Stop 1/8-inch Drill | 27112812 Countersinks | 0.850 | 1/9 | 80.00% | Yes |
| 786 | DSA0250B | 1/4-inch Square × 1/4-inch Hex Socket Adapter | Unresolved | 0.000 | 0/0 | 66.67% | Yes |
| 825 | XNB05Z | Makita 18V 2-1/2-inch Straight Finish Nailer 16GA | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 833 | IBMG90K003 | Vessel Impact Ball Torsion Bit Assortment 5pc 3.5-inch | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 890 | 924422 | Mafell Carpentry Planing Machine ZH 320 Ec 120V | 23101514 Planing machines | 0.850 | 3/9 | 80.00% | Yes |
| 897 | 24-35M-320 | Iridium Grip - 3.2×5.2-inch Grip | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 906 | 578192 | Festool D 150 GR SYS - Systainer Abrasive Set | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 933 | JT1-549 | JWBS18SFX 18-inch Bandsaw - 1.75HP 1PH 115V | 23231101 Bandsaw wheel | 0.793 | 1/9 | 80.00% | Yes |
| 943 | DCS714B | DeWalt 20V Miter Saw - Bare, 10-inch Double Bevel Fixed | 27112748 Miter saw | 0.850 | 3/9 | 80.00% | Yes |
| 957 | ATGP-FA | T-Glide Advance Fence Professional | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 967 | BCB2A20A | Kreg 20V Battery/Charger Starter Kit | 26111710 Product specific battery packs | 0.767 | 2/9 | 100.00% | Yes |
| 991 | MAG:2044-230-1 | Stock Feeder 4-Roll - Steff | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 1000 | 10055.201 | Oliver 15-inch Benchtop Planer 2.5HP 1Ph 230V | Unresolved | 0.000 | 0/0 | 50.00% | Yes |
| 1001 | T27417 | Grizzly Oscillating Edge Belt and Spindle Sander | 23101525 Oscillating spindle sander | 0.850 | 1/9 | 80.00% | Yes |

No row triggered manufacturer-site retrieval. The common blocker was manufacturer confidence: distributor-field fallback resolutions were held at 0.65, below the confidence required for domain retrieval. This is consistent with the designed safety gate, but it limits attribute yield.

## Example gallery

### 1. Aluminum railing — rich, internally consistent success

- **Input:** `543340896`; brand `TREX`; “4x4-37\" Black Alum Post Sleeve Select Alum Railing - w/Cap & Skirt.”
- **Classification:** `30103102`, `Structures and Building and Construction and Manufacturing Components and Supplies > Structural components and basic shapes > Rails > Aluminum rail`, confidence **0.85**.
- **Evidence-backed attributes:** `Material = Alum` (`supported`, 1.00 verification; excerpt “Alum”); `Color = Black` (`supported`, 1.00; excerpt “Black”). Both were vocabulary compliant.
- **Adjudication:** did not fire; neither value was disputed.
- **Final output:** both attributes retained. Descriptions: “Boise Cascade Building Materials TREX, Aluminum rail, 543340896”; “ALUMINUM RAIL ALUM BLACK”; “TREX 543340896 Aluminum rail, Alum, Black”; “TREX Aluminum rail, Alum, Black”; “Aluminum rail, Alum, Black.” All five generated fields passed their individual limits.
- **Review:** yes—manufacturer remained below its confidence cutoff and seven generic expected attributes remained absent. This is a successful enrichment case, not a review-free case.

### 2. Low-E patio door — rich, internally consistent success

- **Input:** `1517602`; brand `United Window & Door`; “6068R Gliding Patio Dr 4500 United Blk Ext/WH Int LowE Arg w/J.”
- **Classification:** `30171501`, `Structures and Building and Construction and Manufacturing Components and Supplies > Doors and windows and glass > Doors > Glass doors`, confidence **0.85**.
- **Evidence-backed attributes:** `Series = 6068R` (`supported`, 1.00; excerpt “6068R”); `Model = Gliding Patio Dr 4500` (`supported`, 1.00; exact excerpt). Both were vocabulary compliant.
- **Adjudication:** did not fire.
- **Final output:** both values retained. All five generated descriptions passed; examples include “GLASS DOORS” and “United Window & Door Glass doors, 6068R.”
- **Review:** yes—manufacturer confidence was only 0.65 and the other seven generic attributes were absent.

### 3. DeWalt miter saw — rich extraction with a category-specific noun

- **Input:** `DCS714B`; “Dewalt 20V Miter Saw - (Bare) 10\" Double Bevel Fixed.”
- **Classification:** `27112748`, `Tools and General Machinery > Hand tools > Power tools > Miter saw`, confidence **0.85**.
- **Evidence-backed attributes:** `Series = 20V` (`supported`, 1.00; excerpt “20V”); `Model = DCS714B` (`supported`, 1.00; excerpt “DCS714B”); `Voltage Rating = 20 V` (raw `20V`, `partially_supported`, 0.80; excerpt “20V”; normalized to value `20`, UOM `V`).
- **Adjudication:** did not fire.
- **Final output:** all three values retained. Four of five descriptions passed; Mobile was too long. Examples: “MITER SAW 20V” and “Miter saw, 20V, 20 V Voltage Rating.”
- **Review:** yes—brand/manufacturer remained unresolved at the audit cutoff and six expected attributes were absent.

### 4. Mortar — useful values, but vocabulary weakness remains visible

- **Input:** `44-A`; “Light Chocolate 44-A Mortar - Type N.”
- **Classification:** `30111504`, `… > Concrete and cement and plaster > Concrete and mortars > Mortars`, confidence **0.85**.
- **Extracted attributes:** `Series = 44-A` and `Model = Light Chocolate 44-A Mortar - Type N`; both were `supported` at 1.00 from exact description excerpts, but neither passed the sparse ground-truth-derived vocabulary check.
- **Adjudication:** did not fire.
- **Final output:** both values were retained; four of five descriptions passed.
- **Review:** yes, correctly exposing the vocabulary and missing-field gaps instead of presenting this as fully resolved.

### 5. Kreg battery/charger kit — plausible category, constrained output

- **Input:** `BCB2A20A`; “Kreg 20V Battery/Charger Starter Kit.”
- **Classification:** `26111710`, `Power Generation and Distribution Machinery and Accessories > Batteries and generators and kinetic power transmission > Batteries and cells and accessories > Product specific battery packs`, confidence **0.767**.
- **Extracted attributes:** `Series = 20V` and `Model = BCB2A20A`, both `supported` at 1.00 from exact excerpts; sparse vocabulary marked both non-compliant.
- **Adjudication:** did not fire.
- **Final output:** both values retained; all five generated descriptions passed their limits.
- **Review:** yes—brand/manufacturer confidence and seven missing generic attributes prevented automatic acceptance.

### 6. Cut/grind disc — correctly refuses an unsupported “Series”

- **Input:** `49-94-0907`; “Milw 4-1/2×1/8×5/8-11 Perform+ Dual Metal Cut n Grind Disc.”
- **Classification:** `27111507`, `Tools and General Machinery > Hand tools > Cutting and crimping and punching tools > Metal cutters`, confidence **0.85**. The LLM tie-break selected Metal cutters over Grinders and Abrasive discs.
- **Extracted candidates:** `Series = Milw` was `not_supported` at 0.95 because the abbreviation was not evidence of a series; `Model = 49-94-0907` was `supported` at 1.00 and vocabulary compliant. Both cite excerpt “49-94-0907 Milw 4-1/2.”
- **Adjudication:** fired and rejected `Series = Milw`; the reason explicitly identifies the abbreviation as unsupported rather than guessing its meaning.
- **Final output:** only `Model = 49-94-0907` survived. Four of five descriptions passed.
- **Review:** yes. This is a positive refusal example, while the Metal cutters versus Abrasive discs category boundary remains debatable.

### 7. Bandsaw — correctly rejects one attribute, but exhibits sibling/category confusion

- **Input:** `JT1-549`; “JWBS18SFX 18\" Bandsaw - 1.75HP 1PH 115V.”
- **Classification:** `23231101`, `Industrial Manufacturing and Processing Machinery and Accessories > Sawmilling and lumber processing machinery and equipment > Bandsaws and accessories > Bandsaw wheel`, confidence **0.793**.
- **Extracted candidates:** `Power Rating = 1.75HP` was `supported` at 1.00 and vocabulary compliant. `Voltage Rating = 115V` was marked `not_supported` at 0.95/UOM non-compliant despite its exact excerpt.
- **Adjudication:** fired and rejected the voltage candidate; only the power rating remained.
- **Final output:** `Power Rating = 1.75HP`; four of five descriptions passed.
- **Review:** yes. The value refusal is conservative, but “Bandsaw wheel” is likely a sibling/component mismatch for a complete bandsaw machine. Without ground truth this is flagged as likely, not scored as an error.

### 8. Stock feeder — genuine ambiguity and no invented category

- **Input:** `MAG:2044-230-1`; “Stock Feeder 4-Roll - Steff”; manufacturer field `J&G Machinery`.
- **Classification:** unresolved, confidence **0.00**. The tie-break returned `genuinely_ambiguous` after receiving semantically incompatible candidates such as mining/agricultural feeders and printer roll feeds.
- **Extraction:** skipped because no classpath/expected schema was accepted; no attributes were invented.
- **Adjudication:** did not fire because there were no extracted candidates to adjudicate.
- **Final output:** only the MPN-based short description was usable; classification, attributes, invoice, long, and retail descriptions remained null.
- **Review:** yes, with explicit classification and description flags. This is the clearest refusal-to-guess case in the working cohort.

### 9. PVC fascia — confidently wrong cross-domain homonym

- **Input:** `ADR5117512FW`; brand `TIMBERTECH`; “French White Oak - Landmark Azek PVC Fascia.”
- **Classification:** `25172608`, `Commercial and Military and Private Vehicles and their Accessories and Components > Transportation components and systems > Vehicle trim and exterior covering > Fascias`, confidence **0.85**.
- **Extracted attributes:** `Series = Landmark` and `Model = 1x12-12' French White Oak`, both `supported` at 1.00 from exact excerpts but vocabulary non-compliant.
- **Adjudication:** did not fire.
- **Final output:** both values retained; four of five descriptions passed.
- **Review:** yes. The class is plainly the automotive sense of “fascia,” not building trim. This demonstrates confident cross-domain homonym failure even though downstream extraction is grounded.

### 10. Velux skylight — confidently wrong lexical collision

- **Input:** `FS C01 2004S`; “Velux Fxd Skylt Gry/Wh - w/Solar Shade RO 21×26-7/8.”
- **Classification:** `51287008`, `Drugs and Pharmaceutical Products > Antibacterials > Antibacterial sulfones > Solasulfone`, confidence **0.85**.
- **Extracted attribute:** `Series = FS C01`, `supported` at 0.95 from excerpt “FS C01,” but vocabulary non-compliant.
- **Adjudication:** did not fire.
- **Final output:** the series was retained and four descriptions passed, but all were built around the wrong pharmaceutical category.
- **Review:** yes. This is a clear confidently wrong classification and should not be portrayed as a success.

## Generalization by category

### Current 30-row working set

Each resolved commodity appeared once because the selector prioritized breadth. “Extraction success” means at least one final attribute survived adjudication; it is not proof that the UNSPSC prediction itself is correct.

| Predicted commodity | Resolved | Extraction success | Avg. confidence | Assessment |
|---|---:|---:|---:|---|
| Aluminum rail | 1/1 | 1/1 | 0.850 | Strong internal result; explicit “Alum Railing,” material, and color evidence |
| Glass doors | 1/1 | 1/1 | 0.850 | Strong internal result; patio-door normalization and Low-E context align |
| Metal cutters | 1/1 | 1/1 | 0.850 | Useful, but sibling ambiguity with Grinders/Abrasive discs remains |
| Miter saw | 1/1 | 1/1 | 0.850 | Strong explicit product noun; three retained attributes |
| Mortars | 1/1 | 1/1 | 0.850 | Plausible classification; two grounded values |
| Toggle switch | 1/1 | 1/1 | 0.850 | Plausible explicit product noun |
| Staples | 1/1 | 1/1 | 0.850 | Plausible explicit product noun |
| Countersinks | 1/1 | 1/1 | 0.850 | Plausible explicit product noun |
| Planing machines | 1/1 | 1/1 | 0.850 | Plausible classification; voltage normalization/adjudication needs scrutiny |
| Oscillating spindle sander | 1/1 | 1/1 | 0.850 | Strong explicit product noun |
| Product specific battery packs | 1/1 | 1/1 | 0.767 | Plausible, though the input is a combined battery/charger kit |
| Bandsaw wheel | 1/1 | 1/1 | 0.793 | Likely sibling/component confusion: complete bandsaw classified as wheel |
| Fascias | 1/1 | 1/1 | 0.850 | **Confidently wrong domain:** automotive fascia versus PVC building trim |
| Solasulfone | 1/1 | 1/1 | 0.850 | **Confidently wrong domain:** skylight lexical collision |
| Unresolved | 0/16 | 0/16 | 0.000 | Conservative refusals; includes decking, tape, lumber, wire, range, fasteners, nailer, bits, abrasive set, fence, stock feeder, and one planer |

### Categories exercised elsewhere in this session

These are retained as session-level observations and are not folded into the 30-row aggregate above:

| Category | Session evidence | Honest status |
|---|---|---|
| Domestic dish washers | Two official rows (`PDSH4816AF`, `WDTS7024RZ`) | Classification resolved in direct tests, but the official file has blank UNSPSC and an incompatible private classpath; extraction remained only 2/30 expected values overall |
| Abrasive disc / Metal cutters / Grinders | Multiple Milwaukee dual cut/grind discs | The correct broad product family surfaces, but sibling choice varies between Grinders and Metal cutters; Abrasive discs remains a plausible merchandising classification |
| Aluminum railing | Working row `543340896` | Strong explicit match; 2/9 grounded attributes and 100% description-limit compliance |
| Glass door | Working row `1517602` plus two prior patio-door variants | Consistently resolved to `30171501 Glass doors` in observed runs |
| Ceiling fan | Hunter fan plus three previously tested fan rows | Previously resolved to `40101609 Ceiling fan` after shorthand/tie-break validation fixes; not recomputed in this 30-row cohort |
| Miter saw | DeWalt `DCS714B` | Resolved to `27112748 Miter saw`; three retained attributes in the current run |
| Portable electrical cord | Prior SJEWA wire test | Previously resolved after catalog-shorthand normalization; the different “Aluminum Triplex Wire” row in this cohort remained unresolved, showing the rule does not cover all wire terminology |
| Mortar | `44-A` | Resolved; grounded Series/Model, sparse-vocabulary flags remain |
| Toggle switch | `174-0CSB3-15W` | Resolved; 2/9 output yield |
| Staples | `E28CNKHA` | Resolved; 2/9 output yield |
| Countersinks | `55227` | Resolved; 1/9 output yield |
| Planing machines | Mafell `924422` | Resolved; 3/9 raw yield, with a voltage normalization conflict |
| Oscillating spindle sander | Grizzly `T27417` | Resolved; 1/9 output yield |
| Product-specific battery packs | Kreg `BCB2A20A` | Resolved; 2/9 output yield |
| Bandsaw equipment | `JT1-549` | Resolved to a likely-wrong sibling, Bandsaw wheel |
| Building fascia | TimberTech/Azek row | Confident cross-domain failure to automotive Fascias |
| Skylight | Velux row | Confident cross-domain failure to pharmaceutical Solasulfone |

## Submission-level conclusions

1. **Breadth improved, but classification is not yet dependable across the long tail.** Fourteen distinct commodity codes were emitted, including convincing results for railing, doors, switches, staples, countersinks, miter saws, planers, sanders, and battery packs. However, only 46.67% of the deliberately diverse cohort resolved at all, and two resolved rows were clearly wrong by inspection.
2. **The pipeline is conservative about attribute values.** It retained 25 of 126 expected generic fields (19.84%). Adjudication demonstrably rejected unsupported candidates instead of filling slots, but manufacturer-site retrieval never fired in this cohort, limiting evidence beyond terse descriptions.
3. **Review routing is honest but not selective enough for automation.** Every row was routed to review. That prevents silent acceptance of sparse records and wrong classes, but it also means the current configuration does not produce hands-off records on this working set.
4. **Description compliance is field-specific and measurable.** The working set achieved 78/105 (74.29%) across generated fields. Stronger resolved cases often reached 80–100%; unresolved records commonly produced only a compliant Short description, lowering the aggregate.
5. **The main remaining classification risk is semantic/domain collision, not merely missing candidates.** PVC building fascia → vehicle fascia, skylight → Solasulfone, and bandsaw → bandsaw wheel show that an accepted 0.85 tie-break score can still be wrong. Cut/grind discs continue to expose legitimate sibling-category ambiguity.

These results should be presented as an honest system-behavior baseline, not as a 46.67% accuracy claim. Only the two-row official set supports accuracy scoring, and even there classpath accuracy is not directly comparable without a taxonomy mapping.
