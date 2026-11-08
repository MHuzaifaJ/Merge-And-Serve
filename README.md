# Merge & Serve

A portrait Phaser 3 + TypeScript + Vite browser game prototype.

## Run

Use Node.js 22.6+ and run `pnpm install`, then `pnpm dev`. `pnpm test` checks merge rules, shared-board purchases, orders and economy. `pnpm build` type-checks and generates `dist/`.

## Play

The top bar has a sound toggle and wallet. Drag the exact dish onto the customer order to serve. Buy level-one ingredients using the bottom buttons: Item 2 (left), Item 1 (center), Item 3 (right). Only Item 1 is initially unlocked. Matching type AND level merge on one shared board. Drag unwanted items into the corner bin without refund. Tapping to select and then tapping a target is also supported.

Six customers make a shift. At day-end, spend coins above tomorrow's reserve to expand the board from 4 to 6 to 9 slots, or unlock Item 2 and Item 3. The shared board carries over between shifts. Wallet and upgrades save at day boundaries; sound preference saves immediately. Prior prototype wallet/upgrades remain compatible. Current boards/orders are not yet restored after refresh.

## Scope

One fixed 480×860 portrait game, one shared board, three ingredient chains, four levels, drag/tap controls, feedback animations, generated sound effects and mute. Art uses temporary emoji and procedural UI. Multiple shops, final art, full saves and economy tuning are future work.

## itch.io

Build and ZIP the contents of `dist/` with `index.html` at the archive root. Upload as HTML, enable browser play, set viewport to 480×860, enable mobile friendly, portrait orientation and fullscreen. Vite uses relative asset paths for embedded hosting.
