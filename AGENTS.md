# Merge & Serve

Portrait Phaser + TypeScript + Vite game. Read README.md for the current rules and save migration behavior.

## Scope and art direction

- The user locked the Snack Shop / Fresh Pop Diner art direction. See docs/art-direction.md and docs/art-reference/snack-shop-final.png.
- The reference is an approved MOCKUP, not an implemented asset set. The current game still uses older art. Do not claim the new style is implemented, and do not replace assets unless the user requests implementation.
- Preserve the single shop, nine shared slots, three free generators (burger left, fries center, drink right), four merge stages, distinct categories per order, and timer-free group flow unless requested otherwise.
- No extra visible item names, level badges, customer names, order payments or progression UI.

## Development

- Node 24, pnpm 11.25.0. Run pnpm install --frozen-lockfile.
- Install Python dependencies with python -m pip install -r scripts/requirements-art.txt.
- Required checks for code/asset changes: pnpm test, pnpm test:assets, pnpm build.
- Keep the Rollup WASM override in pnpm-workspace.yaml.
- Use scripts/slice_assets.py for atlas updates and verify with scripts/verify_slices.py. Keep art sources and slicing metadata consistent.
- For visual changes inspect the portrait layout and mobile touch interactions. Dev-only review routes are documented in README.md.
- Never commit dist/, node_modules/, outputs/, work/, credentials or .env files.

## Publishing

- Pull requests run checks only. A main push or a manual main workflow run deploys the checked build to itch.io through .github/workflows/itch.yml.
- Keep BUTLER_API_KEY only in GitHub Actions secrets. Coding tasks do not need the itch key.
- A branch push is not a deployment. Report the commit, checks and actual deployment result separately. Do not say a deployment succeeded until the deploy job succeeded and browser play is verified.
- Follow explicit user instructions on whether to open a PR or push to main; the existing main workflow publishes automatically.
- See docs/mobile-workflow.md for first-time setup and mobile operation.
