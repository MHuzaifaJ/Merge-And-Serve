# Illustrated art release

Generated with the built-in image_gen tool, using outputs/merge-and-serve-mockup-v1.png as the style reference. Original alpha is preserved. Assets are original generated artwork, not extracted from the reference game.

- customers-v1.png: transparent 3-column, 2-row atlas; six equally sized front-facing upper-body smiling customers, warm cartoon shading, bold outlines; backpack boy, yellow-bow girl, glasses young man, coral-shirt woman, blue-shirt bearded man, purple-cardigan elderly woman. No scenery, UI or text.
- food-v1.png: transparent 4-column, 6-row atlas; four distinct merge stages for each of potato/fries, burger, drink, cookie, cupcake/cake and ice cream chains. Centered padded icons, warm cartoon shading and bold outlines, no labels or numerals.
- shop-v1.png: empty front-facing shop wall; coral/cream awning, blank wooden hanging sign, cream botanical wallpaper and teal wainscoting. No people, counter, decorations, food or UI. Dynamic shop name and purchased decorations render separately.

The game uses 256px food frames and 512px customer frames directly from the atlases; nothing is baked into the interactive order/board UI. Existing gameplay/save format is unchanged.

Validation: TypeScript check, production Vite build, 10 model tests, browser checks of spawning, moving, serving, merging and decorations.

## Visual fidelity correction (v2)

Built-in image_gen generated three production assets using the approved mockup as reference:
- board-v2.png: empty honey-orange beveled wooden board, cream inset, exactly nine recessed equal slots in a 3x3 grid, transparent outside, no food/UI/text.
- controls-v2.png: transparent 3x2 atlas; mint sound, coral trash, mint palette, blank sage button, blank gold button and cream lock. Thick teal outlines, glossy bevels, no text.
- wood-v2.png: edge-to-edge honey wood counter rail at the top with vertical grain below, no objects/UI/text.

Rendering now uses a 2x minimum backing canvas (3x on higher-density devices), a zoomed logical camera and camera-transformed board pointer coordinates. Text textures use the same density. Customer portraits scale with party size, speech bubbles have bounded widths, and food icons are larger. Generated board cells and their hit areas align. Browser verified 960x1720 backing pixels at a 401.85x720 CSS display, spawn/merge/serve/payment and decoration controls.

## Complete UI consistency pass (v3)

Built-in image_gen tool, approved mockup used as reference for all three assets:
- panels-v3.png: transparent 3x2 atlas of cream rounded panel, honey-wood framed cream panel, sage inset card, outlined cream speech bubble/tail, empty cream/tan progress track and emerald progress fill. No text/icons. Runtime nine-slicing preserves painted borders.
- icons-v3.png: transparent 3x3 atlas of gold star coin, mint check, coral close, muted sound, open padlock, shop, trophy, sparkle and no-accessory symbol. No text/numerals.
- props-v3.png: transparent 2x2 atlas of honey wall clock (no numerals), botanical picture, heart-pot leafy plant and tulip vase.

Coverage: top bar/background, order bubbles/tails, progress and coin bars, reward icons, partial/full order ticks, coin payment float, decoration overlay/frame/cards/tabs/buttons/prices/thumbnails, empty accessory, four props, sound muted state, selection tint, merge sparkles, unlock banner, next-shop dialog, final completion and loading view. All are PNG surfaces/icons; numbers, shop name and necessary menu text remain dynamic. Invisible input zones and cameras/tweens are engine behavior, not visible primitives. No runtime graphics/rectangle/circle drawing or emoji glyph icons remain. Old unused SVG generators were retired.

Visual QA reviewed: three customers with three-item orders, all four decoration tabs, owned/equipped/purchasable states, insufficient funds, successful purchase, shop transition, shop 2 items, final completion, unlock notice and muted sound. Dev-only review fixtures never save and are removed from production. Model tests protect payment/merging/progression/save/decor ownership rules.

## Final UI polish and icon-only orders

- Order bubbles show only requested item icons and delivery checks. Payment values/coin icons are removed from orders; full-order wallet payouts and floating payment feedback are retained.
- Progress fill uses an intact nine-sliced painted pill with rounded caps, not a cropped bitmap edge.
- Green/gold buttons share one fixed-scale nine-slice border treatment, including bottom spawners, menu tabs and purchase/transition buttons.
- Wall/counter previews show square material details inside painted wooden frames, rather than squeezed whole-scene crops. Explicit __BASE frames keep the main shop/counter artwork intact.
- Lilita One is bundled locally under SIL OFL (public/fonts/OFL.txt) and used for all dynamic UI, headers, shop names, wallet counts and loading text. Phaser waits for it to load before creating text textures; no external font request is made by players.

Browser checks: one/two/three-customer orders without amounts, paid-order check state, rounded 10%/60%/80% progress, framed wall samples, loaded custom font, and a completed order paying +30 into the wallet. Existing model tests protect economy and progression.

## Verified lossless slicing

Original atlas PNGs moved unchanged to art-source/. Runtime uses 7 padded PNG/JSON atlases and a separate isolated loading coin. No art was regenerated or resampled. All 24 food objects use their actual connected silhouette bounds instead of equal-height source rows, fixing clipped smoothie/cookie/cupcake/cake/cone/sundae edges. Trims include a 3px antialias allowance; body coverage is verified for alpha >=32. Food/icon visual sizes are normalized, portrait feet share baseline 496 in a 512px virtual frame, wall props use center pivots, counter props bottom pivots (center override in menu previews). Four duplicated edge texels plus four transparent gutter pixels guard each packed frame. All atlas dimensions stay <=2048; default linear filtering is retained.

57 unique frames and 2 shared button aliases pass pixel, source-coverage, padding/extrusion, pivot, trim-size and nine-slice validation. Per-frame cap insets fix the previous progress-fill insets exceeding the source height. Small destination sizes clamp cap scale instead of inverting slices. Source materials used in thumbnails also have isolated padded frames. Board/shop/counter remain independent full textures, with no shared atlas neighbours. Rebuild scripts and pinned Pillow requirements are in scripts/.

## One-shop endless fast-food update

Built-in image_gen generated art-source/fast-food-v1.png with the previous food artwork as style reference. Prompt: transparent 4×3 atlas, row 1 complete basic burger / cheese / double / tower; row 2 straight fries / curly / cheese / loaded; row 3 small red soda / large blue soda / clear-glass ice-cream float / pink special shake. Warm polished cartoon food, bold brown outlines, no words, ingredients or empty containers. The unchanged lossless packing pipeline derives 12 padded food frames from real silhouette bounds; the current total is 45 unique frames plus 2 shared button aliases. All other art and slicing settings are retained.

The game now has a single shop, no filler/levels/unlocks/completion screen, three free generators in Burger / Fries / Drink order, random groups of 1–3 with random 1–3 item orders and duplicate requests. Groups replace only after all orders complete. Coins remain decoration currency. Save v5 preserves the endless RNG sequence and migrates legacy wallet/decor data. Existing order-price hiding is retained.

## Distinct-category orders and full scene customization

Built-in image_gen created four new source PNGs, preserved in art-source/:
- walls-v1.png: 2x2 opaque atlas of cream botanical/teal wainscot, rose floral/burgundy, sky diamonds/navy and mint scallops/sage. Prompt explicitly excludes roof, awning, signs, furniture and props.
- counters-v1.png: 2x2 opaque atlas of honey oak, coral oak, ivory wood and dark walnut; each has a continuous countertop rail and vertical grain, no objects or merge board.
- nameplates-v1.png: 2x2 transparent atlas of blank carved honey, cream enamel/teal rim, coral diner/cream rim and teal/gold plaques. No lettering, hooks or scenery. Dynamic shop name renders independently.
- bin-zone-v1.png: transparent narrow full-height rounded discard field with teal dotted outline and subtle cream interior, no baked trash icon. The existing PNG trash icon renders separately in the center.

All new atlas frames use the same lossless crop/4px extrusion/4px gutter pipeline. There are now 60 unique frames plus 2 shared aliases. Accessory sprites and the old wall with awning are not shipped as runtime assets; their sources remain archived. Board uses a verified tight frame, centered at x=240, 300x300, with a separate 58x300 right-side bin target. Order icon canvas is fixed at 40px regardless of item/customer count; generator icon canvas is 58px inside 138x78 buttons. Nameplate/counter/wall purchase screens each show four designs. Decorations lives directly right of sound. Serving accepts dialog or body, choosing the nearest customer when bounding regions overlap.

Save v6 enforces distinct categories, migrates v5 orders/themes and refunds removed paid accessories once. Existing valid unique orders retain progress; old duplicate groups refresh. Model/layout tests cover 500 generated groups, dimensions, hit regions, refund idempotence and save/RNG continuity. Browser QA verified body and dialog delivery, bottom-of-bin discard, all four theme combinations, nameplate purchase/equip, and equal item scaling.
