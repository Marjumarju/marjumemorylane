# Memory Lane hero image on the first page

## Goal
Put the uploaded Memory Lane illustration at the top of the first page as a welcoming hero, matching the app's warm paper look.

## What will change
- The family page (first screen) opens with the illustration as a full-width hero banner: rounded corners, a soft shadow, and the page's warm background behind it.
- The illustration already carries the "Memory Lane" name, so the existing "Our family" heading and intro sentence stay below it and the rest of the page (tree, person cards) is untouched.
- On phones the banner shrinks gracefully; the tree still scrolls sideways as it does now.

## Technical details
- Upload the image with lovable-assets from the upload folder and keep the pointer in `src/assets/` (no binary in the repo), then import its URL in `src/routes/index.tsx`.
- Render the hero above the heading in `Home()` with Tailwind classes only (rounded, ring, shadow) — no hardcoded colors.

## Verification
- Check the first page on desktop and a narrow phone width: hero shows crisply, tree and cards below are unchanged, build stays clean.
