# Issue-PR Speed Analysis: entrius/gittensor-ui

**Date:** 2026-04-19
**Methodology:** Compared `created_at` timestamps of all 166 issues against the `created_at` of the first PR referencing each issue (via `Fixes #N` / `Closes #N` in PR body). Flagged pairs where the gap is under 3 minutes.

**Result:** 44 issue-PR pairs flagged.

---

## Coordinated Account Pairs

### `HadesHappy` (issues) → `edwin-rivera-dev` (PRs) — 15 pairs

| Issue                                                      | PR                                                       | Gap  | Title                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| [#501](https://github.com/entrius/gittensor-ui/issues/501) | [#502](https://github.com/entrius/gittensor-ui/pull/502) | 13s  | Extract hardcoded protocol constants into named declarations             |
| [#489](https://github.com/entrius/gittensor-ui/issues/489) | [#490](https://github.com/entrius/gittensor-ui/pull/490) | 15s  | Surface network emission economics on the dashboard                      |
| [#512](https://github.com/entrius/gittensor-ui/issues/512) | [#514](https://github.com/entrius/gittensor-ui/pull/514) | 20s  | Pulse Board - living miner comparison with delta tracking                |
| [#432](https://github.com/entrius/gittensor-ui/issues/432) | [#433](https://github.com/entrius/gittensor-ui/pull/433) | 21s  | Extract shared FONTS and GITHUB_VIEWER_COLORS constants                  |
| [#493](https://github.com/entrius/gittensor-ui/issues/493) | [#494](https://github.com/entrius/gittensor-ui/pull/494) | 24s  | Extract duplicated alpha-to-USD conversion logic                         |
| [#437](https://github.com/entrius/gittensor-ui/issues/437) | [#439](https://github.com/entrius/gittensor-ui/pull/439) | 25s  | Watchlist cards should show both OSS and issue discovery metrics         |
| [#424](https://github.com/entrius/gittensor-ui/issues/424) | [#425](https://github.com/entrius/gittensor-ui/pull/425) | 29s  | Add scroll-jump button for long tables                                   |
| [#498](https://github.com/entrius/gittensor-ui/issues/498) | [#499](https://github.com/entrius/gittensor-ui/pull/499) | 39s  | FAQ has no entry about Issue Discovery rewards                           |
| [#504](https://github.com/entrius/gittensor-ui/issues/504) | [#505](https://github.com/entrius/gittensor-ui/pull/505) | 41s  | Persist filter and sort state in repository page tables                  |
| [#273](https://github.com/entrius/gittensor-ui/issues/273) | [#274](https://github.com/entrius/gittensor-ui/pull/274) | 57s  | Bounties page has no link to documentation                               |
| [#495](https://github.com/entrius/gittensor-ui/issues/495) | [#496](https://github.com/entrius/gittensor-ui/pull/496) | 58s  | Show predicted per-day earnings on open PRs                              |
| [#305](https://github.com/entrius/gittensor-ui/issues/305) | [#306](https://github.com/entrius/gittensor-ui/pull/306) | 65s  | Scoring cards look clickable but aren't                                  |
| [#277](https://github.com/entrius/gittensor-ui/issues/277) | [#278](https://github.com/entrius/gittensor-ui/pull/278) | 72s  | Discoveries page miner cards still show pull-request stats               |
| [#487](https://github.com/entrius/gittensor-ui/issues/487) | [#488](https://github.com/entrius/gittensor-ui/pull/488) | 110s | Display structural and leaf token scoring breakdown                      |
| [#297](https://github.com/entrius/gittensor-ui/issues/297) | [#298](https://github.com/entrius/gittensor-ui/pull/298) | 158s | Stale content from cancelled navigation can overwrite Repository viewers |

Additional feeder account: `juan-flores077` → `edwin-rivera-dev` ([#487](https://github.com/entrius/gittensor-ui/issues/487), 110s)

---

### `wdeveloper16` (issues) → `dataCenter430` (PRs) — 9 pairs

| Issue                                                      | PR                                                       | Gap         | Title                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| [#454](https://github.com/entrius/gittensor-ui/issues/454) | [#453](https://github.com/entrius/gittensor-ui/pull/453) | **-40s** ⚠️ | Fix guard against non-array API responses crashing .map()     |
| [#315](https://github.com/entrius/gittensor-ui/issues/315) | [#316](https://github.com/entrius/gittensor-ui/pull/316) | 16s         | Issue Discoveries status charts and unify miner status labels |
| [#462](https://github.com/entrius/gittensor-ui/issues/462) | [#463](https://github.com/entrius/gittensor-ui/pull/463) | 25s         | Inconsistent scrollbar for History table on bounties page     |
| [#540](https://github.com/entrius/gittensor-ui/issues/540) | [#541](https://github.com/entrius/gittensor-ui/pull/541) | 25s         | Add header section for bounties tables                        |
| [#587](https://github.com/entrius/gittensor-ui/issues/587) | [#588](https://github.com/entrius/gittensor-ui/pull/588) | 30s         | Remove redundant inline fontFamily strings                    |
| [#539](https://github.com/entrius/gittensor-ui/issues/539) | [#541](https://github.com/entrius/gittensor-ui/pull/541) | 26s         | Unify table header and body cell styles across bounties       |
| [#562](https://github.com/entrius/gittensor-ui/issues/562) | [#563](https://github.com/entrius/gittensor-ui/pull/563) | 47s         | Add new sidebar that shows new activities                     |
| [#458](https://github.com/entrius/gittensor-ui/issues/458) | [#459](https://github.com/entrius/gittensor-ui/pull/459) | 82s         | Copy Button UX Improvement — Getting Started Page             |
| [#470](https://github.com/entrius/gittensor-ui/issues/470) | [#471](https://github.com/entrius/gittensor-ui/pull/471) | 98s         | Improve FAQ based on scoring updates                          |
| [#445](https://github.com/entrius/gittensor-ui/issues/445) | [#446](https://github.com/entrius/gittensor-ui/pull/446) | 126s        | Add network stats and top earners to watchlist                |

> ⚠️ **Issue [#454](https://github.com/entrius/gittensor-ui/issues/454)**: PR [#453](https://github.com/entrius/gittensor-ui/pull/453) was created **40 seconds before** the issue was filed.

---

### Other Coordinated Pairs

| Issue                                                      | PR                                                       | Gap  | Issue Author | PR Author      | Title                                           |
| ---------------------------------------------------------- | -------------------------------------------------------- | ---- | ------------ | -------------- | ----------------------------------------------- |
| [#343](https://github.com/entrius/gittensor-ui/issues/343) | [#344](https://github.com/entrius/gittensor-ui/pull/344) | 80s  | carlos4s     | statxc         | Replace inline pagination in MinerPRsTable      |
| [#409](https://github.com/entrius/gittensor-ui/issues/409) | [#410](https://github.com/entrius/gittensor-ui/pull/410) | 136s | sharpenteeth | jimcody1995    | Search input placeholder text truncated         |
| [#466](https://github.com/entrius/gittensor-ui/issues/466) | [#467](https://github.com/entrius/gittensor-ui/pull/467) | 150s | carlos4s     | jamesrayammons | Repository chart weight y-axis shows 1–10 range |

---

### `carlos4s` (issues) — PR responders breakdown (9 issues total)

| Issue                                                      | PR                                                       | Gap        | PR Author      | Title                                        |
| ---------------------------------------------------------- | -------------------------------------------------------- | ---------- | -------------- | -------------------------------------------- |
| [#343](https://github.com/entrius/gittensor-ui/issues/343) | [#344](https://github.com/entrius/gittensor-ui/pull/344) | **1m 20s** | statxc         | Shared TablePagination in MinerPRsTable      |
| [#343](https://github.com/entrius/gittensor-ui/issues/343) | [#392](https://github.com/entrius/gittensor-ui/pull/392) | 14h 34m    | jamesrayammons | Same issue, second PR attempt                |
| [#466](https://github.com/entrius/gittensor-ui/issues/466) | [#467](https://github.com/entrius/gittensor-ui/pull/467) | **2m 30s** | jamesrayammons | Chart weight y-axis fix                      |
| [#443](https://github.com/entrius/gittensor-ui/issues/443) | [#444](https://github.com/entrius/gittensor-ui/pull/444) | 3m 42s     | bittoby        | List view for miners leaderboard             |
| [#476](https://github.com/entrius/gittensor-ui/issues/476) | [#479](https://github.com/entrius/gittensor-ui/pull/479) | 10m 9s     | YB0y           | Tri-state eligibility filter                 |
| [#585](https://github.com/entrius/gittensor-ui/issues/585) | [#586](https://github.com/entrius/gittensor-ui/pull/586) | 8m 13s     | RenzoMXD       | Sync Onboard Languages chart with table page |
| [#522](https://github.com/entrius/gittensor-ui/issues/522) | —                                                        | —          | —              | No PR attached                               |
| [#517](https://github.com/entrius/gittensor-ui/issues/517) | —                                                        | —          | —              | No PR attached                               |
| [#509](https://github.com/entrius/gittensor-ui/issues/509) | —                                                        | —          | —              | No PR attached                               |
| [#434](https://github.com/entrius/gittensor-ui/issues/434) | —                                                        | —          | —              | No PR attached                               |

Fast responders to carlos4s: **statxc** (80s), **jamesrayammons** (2m30s), **bittoby** (3m42s), **RenzoMXD** (8m13s), **YB0y** (10m9s)

---

## Summary

| Pattern                       | Accounts                    | Pairs  | Avg Gap |
| ----------------------------- | --------------------------- | ------ | ------- |
| HadesHappy → edwin-rivera-dev | 2 (+ juan-flores077 feeder) | 15     | ~45s    |
| wdeveloper16 → dataCenter430  | 2                           | 9      | ~50s    |
| **Total**                     |                             | **44** |         |

### Red Flags

1. **HadesHappy + edwin-rivera-dev**: 15 pairs with consistent 13–158s gaps. Almost certainly the same operator or a coordinated farming ring.
2. **wdeveloper16 + dataCenter430**: 9 pairs including one where **the PR was created before the issue**. Unambiguous pre-staging.
3. **Issue quality**: Most flagged issues have polished, detailed descriptions with reproduction steps — consistent with AI-generated content created alongside the PR code.
4. **edwin-rivera-dev** appears on both sides — as a self-farming solo author (2 issues) and as the PR submitter for HadesHappy (15) and juan-flores077 (1), totaling **18 fast-attached PRs**.

---

## carlos4s Network — Deep Dive (12 accounts)

### carlos4s (9 issues, 0 PRs — pure issue creator)

| State  | Issue                                                      | PR                                                       | PR Author      | Gap     |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------- | -------------- | ------- |
| closed | [#343](https://github.com/entrius/gittensor-ui/issues/343) | [#344](https://github.com/entrius/gittensor-ui/pull/344) | statxc         | 1m 20s  |
| closed | [#466](https://github.com/entrius/gittensor-ui/issues/466) | [#467](https://github.com/entrius/gittensor-ui/pull/467) | jamesrayammons | 2m 30s  |
| closed | [#434](https://github.com/entrius/gittensor-ui/issues/434) | [#435](https://github.com/entrius/gittensor-ui/pull/435) | YB0y           | 3m 22s  |
| open   | [#443](https://github.com/entrius/gittensor-ui/issues/443) | [#444](https://github.com/entrius/gittensor-ui/pull/444) | bittoby        | 3m 42s  |
| open   | [#509](https://github.com/entrius/gittensor-ui/issues/509) | [#510](https://github.com/entrius/gittensor-ui/pull/510) | bittoby        | 6m 31s  |
| open   | [#585](https://github.com/entrius/gittensor-ui/issues/585) | [#586](https://github.com/entrius/gittensor-ui/pull/586) | RenzoMXD       | 8m 13s  |
| closed | [#517](https://github.com/entrius/gittensor-ui/issues/517) | [#518](https://github.com/entrius/gittensor-ui/pull/518) | bittoby        | 8m 22s  |
| closed | [#476](https://github.com/entrius/gittensor-ui/issues/476) | [#479](https://github.com/entrius/gittensor-ui/pull/479) | YB0y           | 10m 9s  |
| open   | [#522](https://github.com/entrius/gittensor-ui/issues/522) | [#527](https://github.com/entrius/gittensor-ui/pull/527) | bittoby        | 15m 35s |

### aliworksx08 (4 issues, 0 PRs — feeds RenzoMXD and statxc)

| State  | Issue                                                      | PR                                                       | PR Author | Gap    |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------- | --------- | ------ |
| closed | [#403](https://github.com/entrius/gittensor-ui/issues/403) | [#404](https://github.com/entrius/gittensor-ui/pull/404) | RenzoMXD  | 4m 12s |
| closed | [#429](https://github.com/entrius/gittensor-ui/issues/429) | [#430](https://github.com/entrius/gittensor-ui/pull/430) | RenzoMXD  | 4m 9s  |
| closed | [#405](https://github.com/entrius/gittensor-ui/issues/405) | [#406](https://github.com/entrius/gittensor-ui/pull/406) | RenzoMXD  | 4m 41s |
| open   | [#551](https://github.com/entrius/gittensor-ui/issues/551) | [#552](https://github.com/entrius/gittensor-ui/pull/552) | statxc    | 10m 5s |

### corevibe555 (7 issues, 0 PRs — feeds jamesrayammons)

| State  | Issue                                                      | PR                                                       | PR Author      | Gap     |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------- | -------------- | ------- |
| closed | [#196](https://github.com/entrius/gittensor-ui/issues/196) | [#198](https://github.com/entrius/gittensor-ui/pull/198) | jamesrayammons | 44m 11s |
| closed | [#199](https://github.com/entrius/gittensor-ui/issues/199) | [#203](https://github.com/entrius/gittensor-ui/pull/203) | jamesrayammons | 64m 12s |
| closed | [#197](https://github.com/entrius/gittensor-ui/issues/197) | [#201](https://github.com/entrius/gittensor-ui/pull/201) | jamesrayammons | 67m 6s  |

### jamesrayammons (7 issues, 16 PRs — self-farms + fixes others')

**Self-farmed (issue → own PR):**

| State  | Issue                                                      | PR                                                       | Gap    |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------- | ------ |
| closed | [#309](https://github.com/entrius/gittensor-ui/issues/309) | [#310](https://github.com/entrius/gittensor-ui/pull/310) | 31s    |
| closed | [#399](https://github.com/entrius/gittensor-ui/issues/399) | [#400](https://github.com/entrius/gittensor-ui/pull/400) | 1m 5s  |
| closed | [#395](https://github.com/entrius/gittensor-ui/issues/395) | [#396](https://github.com/entrius/gittensor-ui/pull/396) | 2m 17s |
| closed | [#401](https://github.com/entrius/gittensor-ui/issues/401) | [#402](https://github.com/entrius/gittensor-ui/pull/402) | 2m 19s |
| closed | [#397](https://github.com/entrius/gittensor-ui/issues/397) | [#398](https://github.com/entrius/gittensor-ui/pull/398) | 3m 36s |
| closed | [#393](https://github.com/entrius/gittensor-ui/issues/393) | [#394](https://github.com/entrius/gittensor-ui/pull/394) | 3m 57s |

**Fixes others' issues:** carlos4s ([#466](https://github.com/entrius/gittensor-ui/issues/466)), bittoby ([#138](https://github.com/entrius/gittensor-ui/issues/138), [#168](https://github.com/entrius/gittensor-ui/issues/168)), corevibe555 ([#196](https://github.com/entrius/gittensor-ui/issues/196), [#197](https://github.com/entrius/gittensor-ui/issues/197), [#199](https://github.com/entrius/gittensor-ui/issues/199)), claytonlin1110 ([#484](https://github.com/entrius/gittensor-ui/issues/484)), yoko-hennie ([#139](https://github.com/entrius/gittensor-ui/issues/139)), Dexterity104 ([#475](https://github.com/entrius/gittensor-ui/issues/475))

### bittoby (6 issues, 11 PRs — self-farms + fixes carlos4s')

**Self-farmed:**

| State  | Issue                                                      | PR                                                       | Gap    |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------- | ------ |
| closed | [#303](https://github.com/entrius/gittensor-ui/issues/303) | [#304](https://github.com/entrius/gittensor-ui/pull/304) | 56s    |
| closed | [#178](https://github.com/entrius/gittensor-ui/issues/178) | [#179](https://github.com/entrius/gittensor-ui/pull/179) | 26m 9s |

**Fixes carlos4s:** [#443](https://github.com/entrius/gittensor-ui/issues/443)→[#444](https://github.com/entrius/gittensor-ui/pull/444), [#509](https://github.com/entrius/gittensor-ui/issues/509)→[#510](https://github.com/entrius/gittensor-ui/pull/510), [#517](https://github.com/entrius/gittensor-ui/issues/517)→[#518](https://github.com/entrius/gittensor-ui/pull/518), [#522](https://github.com/entrius/gittensor-ui/issues/522)→[#527](https://github.com/entrius/gittensor-ui/pull/527)

### YB0y (1 issue, 4 PRs)

**Self-farmed:** [#311](https://github.com/entrius/gittensor-ui/issues/311)→[#312](https://github.com/entrius/gittensor-ui/pull/312) (14s)
**Fixes carlos4s:** [#434](https://github.com/entrius/gittensor-ui/issues/434)→[#435](https://github.com/entrius/gittensor-ui/pull/435), [#476](https://github.com/entrius/gittensor-ui/issues/476)→[#479](https://github.com/entrius/gittensor-ui/pull/479)

### statxc (0 issues, 6 PRs)

**Fixes carlos4s:** [#343](https://github.com/entrius/gittensor-ui/issues/343)→[#344](https://github.com/entrius/gittensor-ui/pull/344)
**Fixes aliworksx08:** [#551](https://github.com/entrius/gittensor-ui/issues/551)→[#552](https://github.com/entrius/gittensor-ui/pull/552)

### RenzoMXD (0 issues, 10 PRs)

**Fixes carlos4s:** [#585](https://github.com/entrius/gittensor-ui/issues/585)→[#586](https://github.com/entrius/gittensor-ui/pull/586)
**Fixes aliworksx08:** [#403](https://github.com/entrius/gittensor-ui/issues/403)→[#404](https://github.com/entrius/gittensor-ui/pull/404), [#405](https://github.com/entrius/gittensor-ui/issues/405)→[#406](https://github.com/entrius/gittensor-ui/pull/406), [#429](https://github.com/entrius/gittensor-ui/issues/429)→[#430](https://github.com/entrius/gittensor-ui/pull/430)
**Fixes fansilas:** [#528](https://github.com/entrius/gittensor-ui/issues/528)→[#530](https://github.com/entrius/gittensor-ui/pull/530)

### Network Map

```
Issue-Only Feeders (0 PRs)       PR Submitters
──────────────────────────       ──────────────
carlos4s (9 issues) ───────────→ bittoby (4), YB0y (2), jamesrayammons (1),
                                  statxc (1), RenzoMXD (1)

aliworksx08 (4 issues) ────────→ RenzoMXD (3), statxc (1)

corevibe555 (7 issues) ────────→ jamesrayammons (3)

yoko-hennie (4 issues) ────────→ jamesrayammons (1)

claytonlin1110 (1 issue) ─────→ jamesrayammons (1)

fansilas (5 issues) ───────────→ RenzoMXD (1)

                    Self-Farming
                    ────────────
                    jamesrayammons: 6 self-pairs (31s – 3m57s)
                    bittoby: 2 self-pairs (56s – 26m)
                    YB0y: 1 self-pair (14s)
```

**Total: 7 issue-only feeders + 5 PR submitters = 12 accounts operating as one ring.**

---

## HadesHappy Network — Deep Dive (3 accounts)

### GitHub Profiles

| Field                     | [HadesHappy](https://github.com/HadesHappy)                                                               | [edwin-rivera-dev](https://github.com/edwin-rivera-dev)                                                                 | [juan-flores077](https://github.com/juan-flores077)                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Name**                  | hadeshappy#2871                                                                                           | Edwin Rivera                                                                                                            | Juan Flores                                                                                                     |
| **Bio**                   | "Creative, Passionate, and Efficient Senior Full Stack and Blockchain developer with 9+ years experience" | "Founder at SolvinHub \| FullStack & AI Engineer … React, Node.js, Python, Django, Java, C#, .NET, Go, Rust, Ruby, AWS" | "FullStack & AI Engineer \| React, Node.js, Python, Django, Java, C#, .NET, Go, Rust, Ruby, AWS \| AI Engineer" |
| **Created**               | 2022-07-09                                                                                                | 2019-12-02                                                                                                              | 2022-09-01                                                                                                      |
| **Followers / Following** | 1,953 / 5,526 (inflated)                                                                                  | 16 / 5                                                                                                                  | 1 / 1                                                                                                           |
| **Public repos**          | 102                                                                                                       | 103                                                                                                                     | 4                                                                                                               |
| **Role in ring**          | Issue feeder (23 issues, 0 PRs)                                                                           | PR submitter (35 PRs, 2 self-farmed issues)                                                                             | Hybrid: 5 issues + 4 PRs                                                                                        |

> **Bio match:** juan-flores077's bio is a subset of edwin-rivera-dev's — identical tech stack list, same wording. Strongly suggests the same operator.

### HadesHappy — 23 issues, 0 PRs (pure feeder)

All issues go exclusively to edwin-rivera-dev or juan-flores077.

| State  | Issue                                                      | PR                                                       | PR Author        | Gap      |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------- | ---------------- | -------- |
| closed | [#501](https://github.com/entrius/gittensor-ui/issues/501) | [#502](https://github.com/entrius/gittensor-ui/pull/502) | edwin-rivera-dev | **13s**  |
| closed | [#489](https://github.com/entrius/gittensor-ui/issues/489) | [#490](https://github.com/entrius/gittensor-ui/pull/490) | edwin-rivera-dev | **15s**  |
| open   | [#512](https://github.com/entrius/gittensor-ui/issues/512) | [#514](https://github.com/entrius/gittensor-ui/pull/514) | edwin-rivera-dev | **20s**  |
| closed | [#432](https://github.com/entrius/gittensor-ui/issues/432) | [#433](https://github.com/entrius/gittensor-ui/pull/433) | edwin-rivera-dev | **21s**  |
| closed | [#493](https://github.com/entrius/gittensor-ui/issues/493) | [#494](https://github.com/entrius/gittensor-ui/pull/494) | edwin-rivera-dev | **24s**  |
| closed | [#437](https://github.com/entrius/gittensor-ui/issues/437) | [#439](https://github.com/entrius/gittensor-ui/pull/439) | edwin-rivera-dev | **25s**  |
| closed | [#424](https://github.com/entrius/gittensor-ui/issues/424) | [#425](https://github.com/entrius/gittensor-ui/pull/425) | edwin-rivera-dev | **29s**  |
| closed | [#498](https://github.com/entrius/gittensor-ui/issues/498) | [#499](https://github.com/entrius/gittensor-ui/pull/499) | edwin-rivera-dev | **39s**  |
| open   | [#504](https://github.com/entrius/gittensor-ui/issues/504) | [#505](https://github.com/entrius/gittensor-ui/pull/505) | edwin-rivera-dev | **41s**  |
| closed | [#273](https://github.com/entrius/gittensor-ui/issues/273) | [#274](https://github.com/entrius/gittensor-ui/pull/274) | edwin-rivera-dev | **57s**  |
| open   | [#495](https://github.com/entrius/gittensor-ui/issues/495) | [#496](https://github.com/entrius/gittensor-ui/pull/496) | edwin-rivera-dev | **58s**  |
| closed | [#305](https://github.com/entrius/gittensor-ui/issues/305) | [#306](https://github.com/entrius/gittensor-ui/pull/306) | edwin-rivera-dev | **65s**  |
| closed | [#277](https://github.com/entrius/gittensor-ui/issues/277) | [#278](https://github.com/entrius/gittensor-ui/pull/278) | edwin-rivera-dev | **72s**  |
| closed | [#487](https://github.com/entrius/gittensor-ui/issues/487) | [#488](https://github.com/entrius/gittensor-ui/pull/488) | edwin-rivera-dev | **110s** |
| closed | [#297](https://github.com/entrius/gittensor-ui/issues/297) | [#298](https://github.com/entrius/gittensor-ui/pull/298) | edwin-rivera-dev | **158s** |
| closed | [#414](https://github.com/entrius/gittensor-ui/issues/414) | [#422](https://github.com/entrius/gittensor-ui/pull/422) | edwin-rivera-dev | 45m      |
| closed | [#408](https://github.com/entrius/gittensor-ui/issues/408) | [#411](https://github.com/entrius/gittensor-ui/pull/411) | edwin-rivera-dev | 7m       |
| closed | [#382](https://github.com/entrius/gittensor-ui/issues/382) | [#383](https://github.com/entrius/gittensor-ui/pull/383) | edwin-rivera-dev | 3m 21s   |
| closed | [#379](https://github.com/entrius/gittensor-ui/issues/379) | [#380](https://github.com/entrius/gittensor-ui/pull/380) | edwin-rivera-dev | 3m 22s   |
| closed | [#376](https://github.com/entrius/gittensor-ui/issues/376) | [#378](https://github.com/entrius/gittensor-ui/pull/378) | edwin-rivera-dev | 3m 20s   |
| closed | [#321](https://github.com/entrius/gittensor-ui/issues/321) | [#322](https://github.com/entrius/gittensor-ui/pull/322) | edwin-rivera-dev | 6m 2s    |
| closed | [#307](https://github.com/entrius/gittensor-ui/issues/307) | [#308](https://github.com/entrius/gittensor-ui/pull/308) | edwin-rivera-dev | 4m 1s    |
| closed | [#280](https://github.com/entrius/gittensor-ui/issues/280) | [#281](https://github.com/entrius/gittensor-ui/pull/281) | edwin-rivera-dev | 25m 24s  |
| closed | [#235](https://github.com/entrius/gittensor-ui/issues/235) | [#236](https://github.com/entrius/gittensor-ui/pull/236) | juan-flores077   | 4m       |

> **23/23 HadesHappy issues** have a PR from either edwin-rivera-dev (22) or juan-flores077 (1). Zero issues answered by any outside developer. The median gap is under 1 minute.

### edwin-rivera-dev — 35 PRs, 2 issues

**Breakdown by issue source:**

| Source                           | Count | Notes                                                                                                                                                                                                                                    |
| -------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HadesHappy issues                | 22    | 15 under 3 min, 7 under 45 min                                                                                                                                                                                                           |
| juan-flores077 issues            | 2     | [#557](https://github.com/entrius/gittensor-ui/issues/557)→[#559](https://github.com/entrius/gittensor-ui/pull/559), [#584](https://github.com/entrius/gittensor-ui/issues/584)→[#583](https://github.com/entrius/gittensor-ui/pull/583) |
| Self-farmed (own issue → own PR) | 2     | [#288](https://github.com/entrius/gittensor-ui/issues/288)→[#289](https://github.com/entrius/gittensor-ui/pull/289), [#282](https://github.com/entrius/gittensor-ui/issues/282)→[#283](https://github.com/entrius/gittensor-ui/pull/283) |
| Other issue authors              | 5     | Dexterity104 ([#266](https://github.com/entrius/gittensor-ui/issues/266)), spider-yamet ([#171](https://github.com/entrius/gittensor-ui/issues/171)), corevibe555 ([#152](https://github.com/entrius/gittensor-ui/issues/152))           |
| No issue reference               | 4     | [#366](https://github.com/entrius/gittensor-ui/pull/366), [#357](https://github.com/entrius/gittensor-ui/pull/357), [#332](https://github.com/entrius/gittensor-ui/pull/332), [#331](https://github.com/entrius/gittensor-ui/pull/331)   |

> **PR [#583](https://github.com/entrius/gittensor-ui/pull/583) was created at 03:05:50 — before issue [#584](https://github.com/entrius/gittensor-ui/issues/584) at 03:08:25.** The PR existed ~2m 35s before the issue it claims to fix. This is the same pattern as wdeveloper16/dataCenter430 #454/#453.

### juan-flores077 — 5 issues, 4 PRs

**Issues created:**

| State  | Issue                                                      | PR                                                       | PR Author             | Gap                            |
| ------ | ---------------------------------------------------------- | -------------------------------------------------------- | --------------------- | ------------------------------ |
| open   | [#584](https://github.com/entrius/gittensor-ui/issues/584) | [#583](https://github.com/entrius/gittensor-ui/pull/583) | edwin-rivera-dev      | **-2m 35s** ⚠️ PR before issue |
| open   | [#557](https://github.com/entrius/gittensor-ui/issues/557) | [#559](https://github.com/entrius/gittensor-ui/pull/559) | edwin-rivera-dev      | 4m                             |
| closed | [#487](https://github.com/entrius/gittensor-ui/issues/487) | [#488](https://github.com/entrius/gittensor-ui/pull/488) | edwin-rivera-dev      | 110s                           |
| closed | [#231](https://github.com/entrius/gittensor-ui/issues/231) | [#232](https://github.com/entrius/gittensor-ui/pull/232) | juan-flores077 (self) | 4m 23s                         |
| open   | [#210](https://github.com/entrius/gittensor-ui/issues/210) | [#212](https://github.com/entrius/gittensor-ui/pull/212) | juan-flores077 (self) | 23m                            |

**PRs submitted:**

| PR                                                       | Fixes Issue                                                | Issue Author          |
| -------------------------------------------------------- | ---------------------------------------------------------- | --------------------- |
| [#236](https://github.com/entrius/gittensor-ui/pull/236) | [#235](https://github.com/entrius/gittensor-ui/issues/235) | HadesHappy            |
| [#232](https://github.com/entrius/gittensor-ui/pull/232) | [#231](https://github.com/entrius/gittensor-ui/issues/231) | juan-flores077 (self) |
| [#230](https://github.com/entrius/gittensor-ui/pull/230) | [#200](https://github.com/entrius/gittensor-ui/issues/200) | corevibe555           |
| [#212](https://github.com/entrius/gittensor-ui/pull/212) | [#210](https://github.com/entrius/gittensor-ui/issues/210) | juan-flores077 (self) |

### Smoking Guns

1. **PR before issue**: edwin-rivera-dev's PR [#583](https://github.com/entrius/gittensor-ui/pull/583) was created 2m 35s **before** juan-flores077 filed issue [#584](https://github.com/entrius/gittensor-ui/issues/584). The code was written before the "bug" was reported.
2. **Matching bios**: juan-flores077 and edwin-rivera-dev share nearly identical bio text — same tech stack list in the same order ("React, Node.js, Python, Django, Java, C#, .NET, Go, Rust, Ruby, AWS").
3. **Exclusive feeding**: 23/23 HadesHappy issues are answered exclusively by edwin-rivera-dev (22) or juan-flores077 (1). No outside developer has ever responded to a HadesHappy issue.
4. **Inflated followers**: HadesHappy has 1,953 followers and 5,526 following — a classic follow-for-follow pattern used to make a sock puppet appear legitimate.
5. **Speed consistency**: 15 of 23 HadesHappy→edwin-rivera-dev pairs have gaps under 3 minutes. The fastest is **13 seconds**.
6. **Cross-feeding triangle**: HadesHappy feeds edwin-rivera-dev, juan-flores077 feeds edwin-rivera-dev, and juan-flores077 fixes HadesHappy's issues — a closed triangle where all value flows between 3 accounts.

### Network Map

```
HadesHappy (23 issues, 0 PRs)
   │
   ├──→ edwin-rivera-dev (22 PRs fix HadesHappy issues)
   │         ▲
   │         │ (2 PRs fix juan-flores077 issues)
   │         │ (PR #583 created BEFORE issue #584)
   │         │
   └──→ juan-flores077 (1 PR fixes HadesHappy #235)
              │
              └──→ feeds edwin-rivera-dev (issues #487, #557, #584)
                    + self-farms (#231, #210)

Total: 3 accounts, 35 PRs from edwin-rivera-dev alone.
```
