# Dom’s Plumbing Services

A draft Next.js landing page for the Hills District and surrounding areas.

## Run locally

Use Node.js 24 LTS (also used by CI).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run build` for a production build.

## Business details

Contact details are in `src/lib/business.ts`.
The quote form opens an email draft to the business address and offers a copy fallback; it does not send mail or store enquiries on a server.

Service descriptions are sample content approved for this draft.
Update them before publishing and review the `robots`
metadata in `src/app/layout.tsx` (currently set to prevent indexing).

## Design and assets

- Original business logo supplied by the user, retained in `public/doms-plumbing-logo.png`.
- Upscaled transparent logo (1536 × 1024) in `public/doms-plumbing-logo-transparent.png`, used in the header, footer and loader.
- Matching multi-resolution favicon in `src/app/favicon.ico`, plus 32px/64px PNG favicons and a 180px Apple touch icon in `public/`.
- Self-hosted Bungee display lettering and IBM Plex Sans body type from Google Fonts. The OFL licences are included in `src/app/fonts/`.
- [Stock photograph of tap fittings and tools by AS Photography on Pexels](https://www.pexels.com/photo/14953886/), used under the [Pexels License](https://www.pexels.com/license/). This is illustrative photography, not a photograph of Dom or his work. The hero uses the locally stored `public/plumbing-tools-stock.jpg` with a centred crop and a static import for automatic asset versioning.
- A real 3D pipe and spurting water in `src/lib/pipe-scene.ts`. The pipe enters from the top of the hero behind the navbar. The flow uses instanced droplets and mist, with no solid water tube. Drag slows its outward movement while gravity carries it to the actual bottom of the hero. The full-height viewport keeps water visible over the text, link and photo. On mobile, the vertical pipe runs alongside the navbar and its outlet sits below it. Both palettes are supported.
- Light/dark modes follow the system preference until the visitor chooses a mode. Both palettes style the hero, navigation, cards, inputs, buttons, photography and footer.
- The full-screen loader waits for fonts and the hero image, with a bounded wait. Reduced-motion preferences are respected.

## Linting

Run `npm run lint` to check the entire project. Errors and warnings fail the check.
Installing dependencies also installs the Husky pre-commit hook.

ESLint 10 is supported by `eslint-config-next` 16.4.6. The scoped npm overrides
keep its React, import and accessibility plugins on the project's ESLint version
while their peer dependency ranges still stop at ESLint 9. Remove these overrides
when those plugins declare ESLint 10 support.

The GitHub Actions `Lint` workflow runs on pushes, pull requests, and merge queue checks for feedback. The GitHub lint ruleset is disabled, so direct pushes to `main` are allowed without waiting for CI.

## Vercel builds

`vercel.json` removes `npm_config_cache_dir` (and its uppercase variant) before
installation and building. This unsupported npm setting can be injected by the
[Vercel build environment](https://community.vercel.com/t/npm-warn-unknown-env-config-cache-dir-caused-by-vercel-build-environment/51678).
The supported npm cache setting, `npm_config_cache`, is preserved. Local npm
commands and GitHub Actions use their normal environment.

## Hero and logo preparation

The hero uses a left headline and quote card, an animated 3D Dom in the centre, and supporting copy and a small photograph on the right. The compact navigation floats independently over the hero.

The `[data-hero-stage="3d"]` element in `src/app/page.tsx` contains `DomCharacter`, which lazy-loads its Three.js scene.

The logo was restored using the built-in imagegen tool. The first pass upscaled the original, preserved its lettering, red wrench, blue roofline and pipe details, and removed the black rectangular background. The final refinement prompt was:

> Precise cutout cleanup of the provided upscaled business logo. Keep the entire logo itself absolutely identical: all wording, letterforms, tools, roofline, pipes and water shapes, positions and colours. ONLY remove the diffuse blue/grey halos, outer shadows, haze and any softly glowing pixels outside the actual sharp black outline of the logo. Every pixel beyond the logo's crisp silhouette must be fully transparent alpha=0, including around the red wrench, roofline, and tagline. No glow, no shadow, no backdrop, no black rectangle. Preserve internal black structural shapes inside the logo. Do not redraw, redesign, reword or add anything. Keep the full logo inside the canvas with a small transparent margin. Deliver one crisp transparent PNG ready to sit on a solid blue website.

Favicons were derived from that transparent asset at the required delivery sizes. The original logo remains unchanged.

## Typography, water and theme motion

The headline is “Your local plumbing bloke”. Two solid-colour SVG wave masks move inside the word “plumbing”; the rest of the page stays still. The masks are code-native assets in `src/app/globals.css`.

The theme toggle uses the browser View Transition API to uncover the new palette in an 850ms diagonal sweep. Reduced-motion preferences and browsers without the API use an immediate switch. Theme preferences are saved locally when storage is available.

The scrollbar uses native CSS styling, adapting its track and thumb colours to the active palette.

## Dom’s 3D character

The character is an original, locally authored cartoon approximation of the supplied photo: short dark hair, moustache and goatee, a silver ear stud, navy work shirt, and a tool belt with a red pipe wrench. The original portrait is not served on the website.

- `scripts/dom-model.mjs`: editable geometry, materials and bone hierarchy.
- `scripts/dom-sculpt.mjs`: offline surface sculpting and skin weights for the continuous shirt, sleeves, arms and hands.
- `scripts/build-dom-model.mjs`: exports the character and its embedded `Idle` and `Wave` clips. Run `node scripts/build-dom-model.mjs` after changing the model.
- `public/models/dom.glb`: the real 3D asset used by the page.
- `public/models/dom-poster.png`: a transparent render used while 3D loads and when WebGL is unavailable. It is statically imported so each updated portrait receives a new hashed asset URL rather than reusing an older optimized image.
- `src/lib/dom-scene.ts`: one shared WebGL renderer with separate viewports for Dom and the full-height pipe flow, lighting, animation playback, pointer gaze and resource cleanup.
- `src/components/dom-character.tsx`: the accessible greeting, reduced-motion preference and fallback UI.

Click or tap Dom to make him wave; keyboard users can focus him and press Enter or Space. Clicks in the transparent space around him are ignored. The character has a short neck, brown almond-shaped eyes, thick brows, a toothy smile, shaped moustache and goatee, and a short textured haircut based on Dom’s portrait. Continuous surfaces form his shirt sleeves, arms, wrists and hands. The arms bend through skin weights rather than separate joint pieces. Separate cloth bones follow the shoulder swing without its axial twist, keeping the joined sleeves smooth and the hidden arm roots covered throughout the wave. The wave uses external shoulder rotation and forward elbow flexion around its local X hinge. The wrist turns the palm toward the visitor, with a gentle wrist sway, torso lean, head nod and resting-arm counterbalance. A small whole-body weight shift keeps the feet near their planted position, and every joint eases back to rest. One transparent canvas covers the hero, with separate viewports keeping Dom framed in the centre and the pipe behind the navbar. Dom renders in front where the views overlap, and enough horizontal camera space keeps his entire hand visible. On desktop, Dom’s viewport extends through the hero’s bottom padding to the section edge. The camera fits the complete model bounds, including the boot soles, with room for breathing and waving. The necklace geometry has been removed to prevent white lines across the neck. Pointer input is delegated to the hero so the enlarged canvas does not block links. Hover uses lightweight ellipsoids attached to the character’s bones and runs at most once per animation frame, without skinning vertices or raycasting the detailed meshes. Precise mesh picking runs only on clicks. Pointer bounds are cached until scrolling or resizing, and head gaze consumes the latest pointer position during the animation frame. The idle includes breathing and blinking. The pause button has been removed. Both 3D animations respect the visitor’s reduced-motion setting. Motion also pauses off screen and when the tab is hidden. Reduced-motion users start with a still pose and receive a static greeting pose on request. Pixel density is capped at 1.5. Dom renders at up to 60 fps; only the visible scenes render, with a 30 fps cap when the pipe alone is visible. The loop stops when both views leave the screen.

On desktop with a mouse or trackpad, clicking the metal pipe starts a repair. Dom collects the red wrench from his belt, walks over, holds the wrench at the outlet, stops the water, walks home and stows the same tool. The leak stays fixed until reload. `src/lib/dom-repair.ts` controls the sequence, with shoulder and elbow movement placing the wrench at the outlet. The wrist stays in one neutral pose and the tool remains horizontal in the same palm grip for the entire sequence. During the repair, the arm and held tool move together through short fixing strokes around the fitting. The grip stays fixed, with no separate wrist turns or special return hand poses. Boots follow the moving legs. The pipe is also keyboard accessible, with screen-reader status updates. Reduced-motion users stop the leak immediately; mobile has no pipe interaction. Resizing to mobile cancels an unfinished repair. Pointer hover remains inexpensive, and the existing renderer covers the full hero during the walk.

The model exporter generates `src/lib/dom-model-version.ts` from the GLB hash. Re-exporting a character refreshes its URL and remounts the character during development, so an already open page picks up changes such as hand orientation.

Run `node scripts/check-dom-repair.mjs` (Node 24+) to check the belt tool, wrench contact, walking, water shutoff, cancellation and reduced motion.

Run `node scripts/check-dom-framing.mjs` (Node 24+) to verify that every model vertex, including the boots, stays inside the camera view across screen sizes and animated poses.

Run `node scripts/check-dom-hover.mjs` (Node 24+) to check that hover follows animated targets without sampling skin vertices or raycasting render meshes.

Run `node scripts/check-hero-effects.mjs` (Node 24+) to check water motion, stable geometry, still-frame behavior, outlet anchoring, flow reaching the hero bottom, and the absence of metal geometry across Dom’s neck.

Run `node scripts/check-dom-wave.mjs` to check that the elbow flexes forward in its hinge plane and the body moves and returns to rest.

After exporting a model, run `node scripts/check-dom-shoulders.mjs` to check the exported skin bindings for exposed arm roots across the greeting.

For a standalone modelling preview, run `node scripts/preview-dom.mjs` and visit http://127.0.0.1:3006. Both the preview and website frame the complete character, including his boot soles.
