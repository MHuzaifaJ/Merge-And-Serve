# Merge & Serve

Portrait Phaser 3 + TypeScript + Vite merge game. Two shops, twenty levels per shop, one shared nine-slot board.

## Run

Node.js 22.6+: `pnpm install`, `pnpm dev`. `pnpm test` verifies economy, refunds, orders, progression, transitions and persistence. `pnpm build` type-checks and produces `dist/`.

## Play

Bottom buttons: Item 2 / Item 1 / Item 3. Base ingredients cost 20 coins. Drag matching type AND level together to merge (maximum level 4). Move to empty cells. Drag exact dishes onto a customer's order; delivered items tick off individually. Only the complete order pays, with no bonus. Up to three customers arrive together, with up to three required items each. No timers, departures, days or results screens. All orders complete automatically starts the next level.

Complete level 5 to unlock Item 2, level 10 for Item 3, level 20 for the next shop. A reward bar shows the current milestone. Shop 2 opens only with the explicit button; no return to Shop 1. Wallet and jar upgrades carry forward. Board clears with no leftover conversion, and the jar starts empty. Shop 2 uses new dessert chains; finishing its level 20 ends this prototype's content.

## Coins and jar

Bin refunds half the cumulative base cost: levels 1/2/3/4 refund 10/20/40/80 coins. Select or drag an item to see its bin refund. Orders pay 1.5 times required base cost, only after every requested item is delivered. Default wallet: 200 coins.

Jar starts unlocked and empty. Initially generates 5 coins every 5 active seconds, up to 40 coins. Tap to collect. Full jars stop generating; no offline or hidden-tab earnings. Speed upgrades: 5/4/3/2 seconds, cost 100/200/400. Capacity upgrades: 40/60/100/160, cost 120/240/480. EVERY upgrade fills to the resulting total capacity, without adding prior contents above the cap. No reserve restriction. All tuning is in RULES in src/model.ts.

## Persistence and scope

Autosaves board, partial orders, wallet, current shop/level and jar progression locally. Refresh restores progress without offline income. Legacy prototype wallets carry over with a minimum of 200 coins; old day/unlock progression restarts at level 1 under the new rules. Sound preference is preserved. Temporary emoji/procedural artwork and synthesized effects; final artwork and more content remain future work. No undo or emergency bailout; the free jar ensures recovery.

## itch.io

ZIP contents of dist/ with index.html at archive root. HTML/browser-play upload, 480x860 viewport, mobile-friendly, portrait orientation, fullscreen enabled. Relative Vite asset paths support embedding.
