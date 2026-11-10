# Merge & Serve

A portrait Phaser + TypeScript + Vite game with one endless fast-food shop.

For mobile/cloud development and automatic itch publishing, see [the setup guide](docs/mobile-workflow.md). The newly locked Snack Shop art direction is documented in [docs/art-direction.md](docs/art-direction.md); it is a mockup reference pending implementation.

## Play

Start with zero coins and nine shared merge slots. All three free generators are available from the start: **Burger / Fries / Drink**, left to right. Drag and drop items to merge identical type and stage up to stage four, move to empty slots, or discard for free. Dropping onto any other occupied slot swaps the two items, including matching stage-four items. Board items cannot be moved by clicking. Base items are complete food, not ingredients.

| Chain | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Burger | Basic burger | Cheeseburger | Double burger | Tower burger |
| Fries | Plain fries | Curly fries | Cheese fries | Loaded fries |
| Drink | Small soda | Large soda | Ice-cream float | Special shake |

Each group randomly has 1–3 customers, each randomly requests 1–3 items. Each order contains distinct categories: at most one burger, one fries and one drink, with one variant of each selected category. Within a group, no two customers request the same complete combination of item types and stages, regardless of icon order; individual items may overlap. An individual completed order pays once; the customer and dialog disappear, leaving their position empty until every order in the current group is done. Then a new random group arrives automatically. The board, coins and decorations stay. No visible levels, progress bar, unlocks, days, patience timers, final screen or second shop.

Demand progresses independently for burger, fries and drink. After a category's highest stage is served, future groups request that stage with 70% base weight and its previous stage with 30%; older stages stop appearing. Stage one remains the only demand until stage two is introduced. Orders in the current group stay unchanged. Unique orders are sampled without replacement, so the mix within any small group can vary.

Next-stage introductions follow Burger 2 → Fries 2 → Drink 2 → Burger 3 → Fries 3 → Drink 3 → Burger 4 → Fries 4 → Drink 4. Only one introduction is pending at a time, guaranteed in the first customer's order; the next gap starts only after that item is served. After finishing its group, 2–3 additional groups must be completed before the next introduction appears. The tutorial already serves Burger 2, so Fries 2 appears after 2–3 normal groups. No simultaneous category unlocks or visible progression UI. Players can merge to any stage from the start. Served stages, pending introductions, gap deadlines and PRNG state are saved so reloading cannot reroll them.

## First-time tutorial and reset

New players start with a text-free, mandatory tutorial guided only by an animated hand (no highlights or glow). Three fixed customers request a stage-one burger, a stage-two burger, and a stage-two burger plus stage-one fries. Only the required generator or drag action is allowed at each step; there is no Skip button. The final customer waits for both items before paying. Completing the group unlocks normal play, retaining the earned coins. Tutorial progress resumes after reload; existing v2–v6 saves without tutorial progress bypass it.

The Decorations panel has a **Reset Game** button at the bottom. **Cancel** keeps progress; confirming **Reset all progress?** clears this game's current and legacy saves, board, wallet, themes and sound setting, then restarts the new-player tutorial. Unrelated browser storage is preserved.

## Decorations and saves

Completed orders earn coins only for permanent cosmetics: four wall designs, four counter designs and four nameplates (one free default per category). There are no accessory slots or props. Purchase auto-equips; owned items switch freely. No passive income, ingredient costs, bin refunds or bonuses. Order bubbles show icons/checks only, never payment amounts.

Save v6 preserves tutorial progress, per-category demand, pending introductions and group deadlines alongside partial/paid orders, board, wallet, random sequence and the three equipped themes. Older saves without demand data retain their current orders, wallet, board and themes; available completed-item and tutorial data initialize progression conservatively because older versions did not record full serve history. The unique-order rule applies to newly generated groups. Old v2-v5 wallets/themes migrate. Removed paid accessories refund their original prices once; v5 duplicate-category groups refresh while valid unique orders retain delivery progress. Old first-shop board types map Fries/Burger/Drink to Burger/Fries/Drink; old dessert boards clear because those items have no equivalent. The old v3 retired board-theme refund also applies only once.

## Run and verify

Node.js 22.6+: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`. An official Rollup WASM override supports Windows environments that block native add-ons. Build produces dist/; zip its contents with index.html at the root for itch HTML/browser play. Viewport: 480×860, mobile-friendly portrait with fullscreen enabled.

Original PNG sources are in art-source/. The asset pipeline finds real silhouette bounds, preserves antialias pixels, aligns pivots, adds 4px edge extrusion plus 4px transparent gutters, and exports PNG/JSON atlases. Install scripts/requirements-art.txt with Python; run `python scripts/slice_assets.py`, then `python scripts/verify_slices.py` (`pnpm test:assets`). All dynamic text uses bundled Lilita One (SIL OFL license in public/fonts/OFL.txt). Canvas/text render at 2×–3× density. The game never shakes the screen, including on invalid drops or purchases. All visible surfaces/icons use painted PNGs; no emoji UI or visible geometry primitives remain.

Dev-only review pages: `?review=three`, `single`, `paid`, `purchase`, `poor`, `muted`, `decor-wall`, `decor-counter`, `decor-nameplate`, `atlas-foods`, `atlas-icons`, `atlas-controls`, `atlas-people`, `atlas-walls`, `atlas-counters`, `atlas-nameplates`, `theme-0`, `theme-1`, `theme-2`, `theme-3`. Fixtures never save and are stripped from production.


## Current layout

Board is exactly centered at logical x=240, 300 x 300. A separate right-side dotted bin strip has the same 300px height; its entire area accepts discard drops. Decorations sits immediately right of sound in the top-left bar. Order icons use one fixed 40px canvas for 1-3 requests, centered without rescaling. Generator icons fit within button bounds with at least 10px padding. Matching dishes can be dropped on the visible customer body or order bubble; adjacent targets resolve to the nearest customer center. Walls contain no roof/awning or baked-in sign; the nameplate is independent.
