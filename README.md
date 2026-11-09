# Merge & Serve

A portrait Phaser + TypeScript + Vite game with one endless fast-food shop.

## Play

Start with zero coins and nine shared merge slots. All three free generators are available from the start: **Burger / Fries / Drink**, left to right. Merge identical type and stage up to stage four; move items to empty slots or discard them for free. Base items are complete food, not ingredients.

| Chain | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Burger | Basic burger | Cheeseburger | Double burger | Tower burger |
| Fries | Plain fries | Curly fries | Cheese fries | Loaded fries |
| Drink | Small soda | Large soda | Ice-cream float | Special shake |

Each group randomly has 1–3 customers, each randomly requests 1–3 items. Duplicate requests are allowed and each consumes one item. An individual completed order pays once; its check stays until every order in the current group is done. Then a new random group arrives automatically. The board, coins and decorations stay. No visible levels, progress bar, unlocks, days, patience timers, final screen or second shop.

Orders start with stage-one items. Higher variants gradually join the order pool after 3, 8 and 16 completed groups, weighted toward simpler food. This is internal pacing, never displayed as a level or filler. Players can merge to any stage from the start. The PRNG state is saved so reloading does not reroll orders or the future sequence.

## Decorations and saves

Completed orders earn coins only for permanent cosmetics: wall/counter themes, exactly one wall accessory and one counter accessory. Purchase auto-equips; owned items switch freely. No passive income, ingredient costs, bin refunds or bonuses. Order bubbles show icons/checks only, never payment amounts.

Save v5 preserves partial/paid orders, board, wallet, random sequence, cosmetic ownership/equipped choices and internal pacing. Old v2–v4 wallets/decor migrate. Old first-shop board types map Fries/Burger/Drink to Burger/Fries/Drink; old dessert boards clear because those items have no equivalent. Old active orders become a new random group. The old v3 retired board-theme refund applies only once.

## Run and verify

Node.js 22.6+: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`. An official Rollup WASM override supports Windows environments that block native add-ons. Build produces dist/; zip its contents with index.html at the root for itch HTML/browser play. Viewport: 480×860, mobile-friendly portrait with fullscreen enabled.

Original PNG sources are in art-source/. The asset pipeline finds real silhouette bounds, preserves antialias pixels, aligns pivots, adds 4px edge extrusion plus 4px transparent gutters, and exports PNG/JSON atlases. Install scripts/requirements-art.txt with Python; run `python scripts/slice_assets.py`, then `python scripts/verify_slices.py` (`pnpm test:assets`). All dynamic text uses bundled Lilita One (SIL OFL license in public/fonts/OFL.txt). Canvas/text render at 2×–3× density. All visible surfaces/icons use painted PNGs; no emoji UI or visible geometry primitives remain.

Dev-only review pages: `?review=three`, `single`, `paid`, `purchase`, `poor`, `muted`, `decor-wall`, `decor-counter`, `decor-wallProp`, `decor-counterProp`, `atlas-foods`, `atlas-icons`, `atlas-controls`, `atlas-people`, `atlas-props`. Fixtures never save and are stripped from production.
