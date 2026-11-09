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
