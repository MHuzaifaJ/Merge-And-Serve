# Merge & Serve

A portrait Phaser + TypeScript + Vite game with one endless fast-food shop.

For mobile/cloud development and automatic itch publishing, see [the setup guide](docs/mobile-workflow.md). The newly locked Snack Shop art direction is documented in [docs/art-direction.md](docs/art-direction.md); it is a mockup reference pending implementation.

## Play

Start with zero coins and nine shared merge slots. All three free generators are available from the start: **Burger / Fries / Drink**, left to right. Merge identical type and stage up to stage four; move items to empty slots or discard them for free. Base items are complete food, not ingredients.

| Chain | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Burger | Basic burger | Cheeseburger | Double burger | Tower burger |
| Fries | Plain fries | Curly fries | Cheese fries | Loaded fries |
| Drink | Small soda | Large soda | Ice-cream float | Special shake |

Each group randomly has 1–3 customers, each randomly requests 1–3 items. Each order contains distinct categories: at most one burger, one fries and one drink, with one variant of each selected category. An individual completed order pays once; its check stays until every order in the current group is done. Then a new random group arrives automatically. The board, coins and decorations stay. No visible levels, progress bar, unlocks, days, patience timers, final screen or second shop.

Orders start with stage-one items. Higher variants gradually join the order pool after 3, 8 and 16 completed groups, weighted toward simpler food. This is internal pacing, never displayed as a level or filler. Players can merge to any stage from the start. The PRNG state is saved so reloading does not reroll orders or the future sequence.

## Decorations and saves

Completed orders earn coins only for permanent cosmetics: four wall designs, four counter designs and four nameplates (one free default per category). There are no accessory slots or props. Purchase auto-equips; owned items switch freely. No passive income, ingredient costs, bin refunds or bonuses. Order bubbles show icons/checks only, never payment amounts.

Save v6 preserves partial/paid orders, board, wallet, random sequence and the three equipped themes. Old v2-v5 wallets/themes migrate. Removed paid accessories refund their original prices once; v5 duplicate-category groups refresh while valid unique orders retain delivery progress. Old first-shop board types map Fries/Burger/Drink to Burger/Fries/Drink; old dessert boards clear because those items have no equivalent. The old v3 retired board-theme refund also applies only once.

## Run and verify

Node.js 22.6+: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`. An official Rollup WASM override supports Windows environments that block native add-ons. Build produces dist/; zip its contents with index.html at the root for itch HTML/browser play. Viewport: 480×860, mobile-friendly portrait with fullscreen enabled.

Original PNG sources are in art-source/. The asset pipeline finds real silhouette bounds, preserves antialias pixels, aligns pivots, adds 4px edge extrusion plus 4px transparent gutters, and exports PNG/JSON atlases. Install scripts/requirements-art.txt with Python; run `python scripts/slice_assets.py`, then `python scripts/verify_slices.py` (`pnpm test:assets`). All dynamic text uses bundled Lilita One (SIL OFL license in public/fonts/OFL.txt). Canvas/text render at 2×–3× density. All visible surfaces/icons use painted PNGs; no emoji UI or visible geometry primitives remain.

Dev-only review pages: `?review=three`, `single`, `paid`, `purchase`, `poor`, `muted`, `decor-wall`, `decor-counter`, `decor-nameplate`, `atlas-foods`, `atlas-icons`, `atlas-controls`, `atlas-people`, `atlas-walls`, `atlas-counters`, `atlas-nameplates`, `theme-0`, `theme-1`, `theme-2`, `theme-3`. Fixtures never save and are stripped from production.


## Current layout

Board is exactly centered at logical x=240, 300 x 300. A separate right-side dotted bin strip has the same 300px height; its entire area accepts discard drops. Decorations sits immediately right of sound in the top-left bar. Order icons use one fixed 40px canvas for 1-3 requests, centered without rescaling. Generator icons fit within button bounds with at least 10px padding. Matching dishes can be dropped on the visible customer body or order bubble; adjacent targets resolve to the nearest customer center. Walls contain no roof/awning or baked-in sign; the nameplate is independent.
