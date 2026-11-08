# Merge & Serve

A local-first Phaser 3 + TypeScript + Vite browser game prototype.

## Run

Install Node.js 22.6+ and a package manager, then run `pnpm install` and `pnpm dev` (npm equivalents also work). `pnpm test` checks the economy and merge rules. `pnpm build` type-checks and generates `dist/`.

## Play

Buy base ingredients for 2 coins. Drag matching items together to merge, or drag to an empty cell to move. Drag onto SERVE or BIN to act. Tap-to-select controls are also supported. Select the exact requested item and press Serve. Select an unwanted item and press Bin to discard it without refund. Every shift has six customers. Orders expire individually. Day-end upgrades use only coins above tomorrow's reserve. Boards persist between shifts; the prototype saves wallet and upgrade progression at day boundaries in this browser.

## Scope

One shop, up to three stations, four merge levels, 4/6/9-slot boards, patience timers, coins, upgrades and shift summary. Art uses temporary emoji and procedural UI. Responsive phone/desktop layouts, merge flashes, floating coins and patience warnings are included. Multiple shops, audio, full mid-shift saves, and final balancing are future work. This is an early playable prototype, not a finished release.

## itch.io

Build, then ZIP the **contents** of `dist/` so `index.html` is at the archive root. Upload as HTML, enable “This file will be played in the browser”, use a 960×760 viewport and enable fullscreen. Vite uses relative asset paths for embedded hosting.


