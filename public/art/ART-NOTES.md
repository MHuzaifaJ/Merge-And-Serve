# Illustrated art release

Generated with the built-in image_gen tool, using outputs/merge-and-serve-mockup-v1.png as the style reference. Original alpha is preserved. Assets are original generated artwork, not extracted from the reference game.

- customers-v1.png: transparent 3-column, 2-row atlas; six equally sized front-facing upper-body smiling customers, warm cartoon shading, bold outlines; backpack boy, yellow-bow girl, glasses young man, coral-shirt woman, blue-shirt bearded man, purple-cardigan elderly woman. No scenery, UI or text.
- food-v1.png: transparent 4-column, 6-row atlas; four distinct merge stages for each of potato/fries, burger, drink, cookie, cupcake/cake and ice cream chains. Centered padded icons, warm cartoon shading and bold outlines, no labels or numerals.
- shop-v1.png: empty front-facing shop wall; coral/cream awning, blank wooden hanging sign, cream botanical wallpaper and teal wainscoting. No people, counter, decorations, food or UI. Dynamic shop name and purchased decorations render separately.

The game uses 256px food frames and 512px customer frames directly from the atlases; nothing is baked into the interactive order/board UI. Existing gameplay/save format is unchanged.

Validation: TypeScript check, production Vite build, 10 model tests, browser checks of spawning, moving, serving, merging and decorations.
