# Merge & Serve

A portrait Phaser 3 + TypeScript + Vite merge game: two shops, twenty levels per shop, one nine-slot shared board.

## Run

Node.js 22.6+: `pnpm install`, `pnpm dev`. Run `pnpm test` for economy/progression/save/cosmetics checks and `pnpm build` to type-check and produce dist/.

## Play

Start with zero coins. Base ingredients are FREE. Bottom buttons: Item 2 / Item 1 / Item 3. Only Item 1 starts unlocked. Merge matching type AND level, up to level 4. Move items into empty cells. Drag dishes onto the customer's order; each accepted item ticks off. Only a fully completed order pays, with no bonus. BIN deletes without refund.

Up to three customers arrive together, up to three items each. No patience timers, departures, days or result screens. New customers arrive automatically when all orders finish. Level 5 unlocks Item 2, level 10 unlocks Item 3, level 20 enables the next-shop button. Shop 2 starts a new board and chains; no return to Shop 1. Wallet, owned and equipped decorations carry over. The prototype ends after Shop 2 level 20.

## Decorations

The separate palette button opens a permanent collection. Coins from completed orders buy wall and counter themes, one fixed wall accessory slot and one fixed counter accessory slot. Purchase auto-equips; owned items can be equipped for free forever, in either shop. Cosmetics have no effect on orders, payouts, progression or merging. Coin bar only shows the wallet.

No jar, passive coins, jar upgrades, ingredient charges or bin refunds remain. Default order payouts are 30 times the number of base ingredients represented by required dishes. Rules and decoration prices are in src/model.ts.

## Saves

Local autosave v4 preserves current board, partial orders, coins, shop/level, owned cosmetics and equipped choices. v3 cosmetics migrate to fixed wall/counter slots; the removed mint-board purchase refunds 150 coins once. The merge board has one fixed style. Valid v2 level saves migrate to v3 preserving wallet and gameplay, dropping jar data. Fresh installs begin at zero; migrated wallets are preserved. Invalid save data resets safely. Sound preference persists separately. Food items use 24 distinct illustrated PNG sprites shared by board, orders, spawners and drag previews. Items have no names or level badges. Only the shop name remains; front-facing upper-body customers have no visible names; locked buttons show only locks. Progress uses counts, a filler and reward icon. Routine gameplay text is removed; visual merge/error/unlock/payment feedback remains. Decoration menu names and prices remain for purchases. Synthesized sound effects remain in this prototype.

## itch.io

ZIP dist/ contents with index.html at root. HTML/browser-play upload, 480x860 viewport, mobile-friendly, portrait orientation and fullscreen enabled. Relative Vite paths support embedding.

## Shop scene

Above the merge board: patterned wall, shop sign, front-facing upper-body customers, icon order bubbles, and a continuous foreground counter. Serve by dropping the matching item onto the customer bubble. Completed customers leave their counter position. Wall and counter themes are independent; each surface has exactly one accessory slot, outside customer/order bounds. Decoration tabs: Wall / Counter / Wall slot / Counter slot. No shelf slots or merge-board theme options.

Build uses the official Rollup WASM package through a pnpm override for Windows environments that block native add-ons.


## Unified illustrated UI

All visible surfaces and icons use the approved PNG art direction: speech bubbles, progress/coin bars, decoration dialog/cards/tabs/buttons and previews, muted sound, check/close/coin/reward symbols, wall/counter props, selection/merge feedback, milestone notices, transition/completion panels and loading view. Text and numbers stay dynamic; invisible Phaser zones provide input. No runtime Graphics/Rectangle primitives or emoji icons remain. Text/backing canvas render at 2x–3x density.

Development-only visual review: append `?review=three`, `decor-wall`, `decor-counter`, `decor-wallProp`, `decor-counterProp`, `shop2`, `shopReady`, `finished`, `unlock` or `muted`. Review fixtures do not save, and Vite strips their setup from production builds.
