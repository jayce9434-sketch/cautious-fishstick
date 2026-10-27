# Crashflock — ABSW2-Style Rebuild

A self-contained static HTML5 slingshot-destruction game for GitHub Pages. The project is flat/root-only, has no build step, uses no CDN or external runtime library, and is designed for desktop plus touch-first iPad/mobile play.

## Campaign
- Bird Side: 10 stories × 20 levels = 200 levels.
- Pig Side: 10 stories × 20 levels = 200 levels.
- 400 campaign levels total.
- Every story: boss on 5, major boss on 10, boss on 15, final boss on 20.
- 21 playable characters per side (42 total).
- 20 block/material systems with unique durability and behaviors.
- 400 unique certified structure fingerprints.

## Story characters and Character Swaps
Crashflock no longer makes the normal campaign roster a grind unlock.

- Every level supplies a scripted free lineup.
- New birds/pigs are introduced automatically as the story progresses.
- A newly introduced character appears in the level lineup immediately; no coins, stars, mastery, or shop purchase are required.
- The Character Shop is optional. It sells swaps that replace the currently loaded story character.
- Finite swap packs: +10 / +30 / +100.
- Permanent swap units: 0–4 per character. Each permanent unit supplies one reusable swap per attempt; the allocation refreshes when the level restarts.
- Finite swaps stack on top of permanent units.
- The 8-hour Stasis Melt awards random finite character swaps and can be completed immediately for 80 coins.

## Angry-Birds-style scoring loop
- Enemy defeated: 5,000 points.
- Destruction adds material-dependent points.
- One optional demolition core can add 2,500 points on selected levels.
- Every unused supplied shot is worth 10,000 points at clear.
- 2-star and 3-star targets are generated from each level's goals and available shots.
- Every normal campaign level is certified so its 3-star threshold is below a clean-clear score.

## Major rebuild fixes
- Believable structure physics: unsupported blocks fall, supports break, structures collapse, falling blocks can crush targets, and targets fall when their support disappears.
- Boss-specific music plus separate menu, normal-level, and final-boss tracks.
- Separate Master / Music / SFX volume controls from 0% to 2000%.
- Universal Back navigation across non-home screens and transient dialogs.
- Touch safety: text selection disabled, long-press browser behavior suppressed, user zoom disabled, touch-action set for game controls, and responsive mobile layout with no horizontal overflow in QA.
- Autosave plus save Export / Import / Reset.
- Owner Menu with exact Add / Set currency controls, campaign unlocks, character tools, cosmetics tools, and QA shortcuts.
- Cosmetics: 12 trails, 8 launcher skins, 8 impact effects.
- Daily Contracts, achievements, Star Vault, mastery, Endless Run, Boss Rush, Daily Challenge, and Stasis Melt.
- Generated/local bird art, pig art, backgrounds, launcher art, key art, materials, and proper 180/192/512 app icons.
- PWA manifest + service worker; all runtime dependencies are local.

## Run
Upload every file from the ZIP directly to the repository root. Do not put the files inside a wrapper folder.

For local testing, serve the root directory with any static HTTP server.

## Owner access
Local/dev owner access code: `CRASHFLOCKDEV`.
