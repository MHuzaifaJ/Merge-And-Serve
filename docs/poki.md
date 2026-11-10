# Poki integration

This branch adds an opt-in Poki target. The normal build remains the itch.io build.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:assets
pnpm build
pnpm build:poki
```

- `pnpm dev:poki`: local Vite server with Poki enabled.
- `pnpm build:poki`: production files in `dist-poki/`; zip the contents with `index.html` at the archive root for a Poki test upload.
- `pnpm build`: normal files in `dist/`, without loading the Poki script or sending Poki events.
- Development `?review=...` fixtures suppress Poki, including in `dev:poki`.
- CI checks both build targets and retains the separate `poki-browser-build` artifact. Existing main-only itch deployment still uploads `dist/`.

## SDK source and startup

The script is loaded asynchronously from the URL used in Poki's official package and Phaser plugin:

`https://game-cdn.poki.com/scripts/v2/poki-sdk.js`

The official `@poki/sdk@0.0.5` development dependency supplies API types; the SDK itself is loaded from Poki, not copied or bundled. References:

- [Official SDK wrapper and API reference](https://github.com/poki/npm-sdk)
- [Official Phaser integration](https://github.com/poki/phaser-plugin)
- [Poki SDK documentation](https://sdk.poki.com/sdk-documentation.html)

Initialization runs alongside font/asset loading. `gameLoadingFinished()` fires once the scene is ready, after the SDK initialization attempt. `enableEventTracking()` enables Poki measurement events. No game ID or secret is placed in the client.

`gameplayStart()` fires on the first game interaction, rather than automatically counting a loading screen as play. Repeated moves do not send duplicate lifecycle starts. Decorations and reset confirmation are outside gameplay; closing Decorations resumes gameplay only if the player previously started. Blur, a hidden document and page exit stop gameplay; focus/visibility resume it only when playing outside menus. The custom audio context suspends when focus is lost or the document is hidden. Reset stops gameplay until the new tutorial's first interaction.

The SDK deadline is eight seconds. Missing scripts or a stalled initialization never prevent the game from running. A rejected initialization (for example with an ad blocker) still permits safe lifecycle calls through the available SDK. SDK/measurement exceptions do not interrupt play. Events generated before SDK readiness are buffered (at most 256); the latest lifecycle state is used when readiness arrives, so a background tab does not falsely start gameplay. A timeout discards queued events and ignores late results.

## Tracking events

Tracking uses the current official API `PokiSDK.measure(category, what, action)`. It does not invent a `customEvent` API. The names below are fixed, bounded labels; no player identifiers, save contents or free-form player data are sent by game code.

| Category | What | Action | Trigger |
|---|---|---|---|
| `tutorial` | `onboarding` | `start`, `resume`, `complete` | First accepted tutorial action, loading an unfinished tutorial, final action |
| `tutorial` | `step_1` … `step_12` | `complete` | Each accepted tutorial step; loading a save does not replay completed steps |
| `item` | `burger_1` … `burger_4`, `fries_1` … `fries_4`, `drink_1` … `drink_4` | `generate`, `move`, `swap`, `merge`, `discard`, `serve` | Successful item actions only; merge names the resulting item |
| `round` | `customer_order` | `complete` | Full order payment, once; partial deliveries do not count |
| `round` | `customer_group` | `start`, `complete` | First accepted action in the current group for this visit, and completion of all orders |
| `checkpoint` | `groups_1`, `groups_3`, `groups_5`, `groups_10`, `groups_25`, `groups_50`, `groups_100` | `complete` | Completing the matching milestone |
| `upgrade` | e.g. `burger_2`, `fries_3` | `start`, `resume`, `complete` | Introducing a pending level, loading that pending level, first serving a higher level |
| `cosmetic` | Existing decoration ID | `purchase`, `equip` | Successful purchase/equip; failed purchases do not count |
| `button` | `decorations` | `interact` | Opening the panel |
| `button` | `reset_game` | `interact`, `cancel`, `complete` | Opening confirmation, cancelling, or confirming reset |

Tutorial/campaign resets deliberately allow a new tutorial and new group-start events. Group starts and resume events are per visit, not a claim of exactly-once delivery across browser sessions. Resuming a completed tutorial does not send tutorial start/complete again. Failed drops, full-board generation failures and failed purchases do not count as successful item/cosmetic events.

No commercial/rewarded ad placements, rewards or additional analytics providers are introduced in this change. Ad placements can be designed separately for the game's existing flow.

## Verification and Poki testing

The automated suite exercises loading/lifecycle order, deduplication, timeout/offline behavior, rejected initialization, measurement failures, tutorial completion/resume/reset, upgrade events and the existing game model. Both production targets must type-check and build.

For actual Poki validation, upload the contents of `dist-poki/` to the Poki developer test environment. Verify loading and gameplay events in Poki's tools, complete the tutorial, open/close Decorations, switch tabs, make a purchase and reset. Confirm events arrive in the Poki dashboard. SDK/domain access and that dashboard require the appropriate Poki environment; successful mocked calls alone do not establish backend ingestion or Poki publication.

In the current cloud environment the Poki documentation/CDN domains are blocked by outbound policy. Local browser checks use a mocked SDK to verify call order and action wiring, plus a blocked-script case to verify that the game remains playable. The official npm package/reference was accessible; real CDN delivery and dashboard ingestion have not been verified here. For network validation, the necessary initial destinations are `game-cdn.poki.com`, `sdk.poki.com`, and `developers.poki.com`; add further SDK/analytics destinations only as identified by Poki's actual test environment.
