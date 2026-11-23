# Kaizen Torch Awards — animated redesign

A single-page, 3D animated redesign of kaizentorchawards.com. The content and images come from the live site.

## View it
- **Quick preview:** double-click `index.html`. It works straight from disk, including the 3D coin.
- **Recommended (as when hosted):** serve the folder, e.g. `python -m http.server 8080` → http://localhost:8080
- **Deploy:** upload the whole folder to any static host (Vercel, Netlify, cPanel, S3). No build step is needed.

## What's inside
| Section | Motion / interaction |
|---|---|
| Preloader | Rotating sun emblem, gold progress ring, split-curtain reveal |
| Hero | Real-time WebGL gold coin (Three.js) with metallic reflections, sun rays, orbit rings and rising embers. It follows the mouse and flips to "One Soul at a Time" on scroll. Click the coin to spin it. Includes a live entry-deadline countdown |
| Manifesto / Note | Words light up as you read (scroll-scrubbed) |
| Ambition | Pinned, cinematic ballroom reveal: "Oscars of coaching" |
| Recognition | 3D crown switcher (Gold / Silver / Bronze), flip-able coin, certificate and social-post mock-ups |
| Categories | All 4 award areas and 56 subcategories with eligibility and entry-kit downloads |
| Key dates | Horizontal pinned timeline with a glowing progress line (vertical on mobile) |
| Judging | Animated criteria rings |
| Jury | Draggable 3D carousel of all 44 jurors over the gold globe video, profile pop-ups, and a full-list grid |
| Stories | Horizontal scrolling fictional impact stories (disclaimer kept) |
| Ecosystem | 7 arch-shaped "portals" that open like doors, with detail pop-ups |
| Podcast | Spinning vinyl that swaps sleeve and tracklist for all 8 episodes |
| Team, press, collaboration, FAQ, final CTA, footer | Reveals, hover states, accordion, rotating light rays |

Also included: smooth scrolling (Lenis), a custom gold cursor, magnetic buttons, a scroll progress bar, a mobile menu, keyboard and Escape support, and `prefers-reduced-motion` support (animations calm down and the pinned sections become normal scrolling).

## Folder structure
```
index.html            page markup
css/style.css         design system + all styles
js/main.js            animations & interactions (GSAP + ScrollTrigger + Lenis)
js/hero3d.js          WebGL coin scene (Three.js r160, loaded from jsDelivr)
js/content.js         editable content: podcast, stories, portals, team, FAQ, links
js/data-generated.js  44 jurors + 56 award categories (from the live site)
js/coin-textures.js   coin face textures embedded so WebGL also works from file://
js/vendor/            GSAP 3.12.5, ScrollTrigger, Lenis 1.1.13 (local copies)
img/  media/          optimised images and 3 background videos
downloads/            entry kits + checklist PDFs (~93 MB, see note)
```

## Editing content
- Text in sections: `index.html`
- Podcast episodes, stories, portals, team, collaboration cards, FAQ and key links: `js/content.js`
- Deadline countdown: the `data-countdown="2026-12-12T18:00:00+04:00"` attribute in `index.html`

## Notes
- The four entry-kit PDFs are about 23 MB each. To keep the upload small, you can delete `downloads/*.pdf` and point `KT.kits` in `js/content.js` to the live URLs (`https://www.kaizentorchawards.com/entry-kits/2026-10-29/...`).
- "Enter the Awards" links to the official form at `kaizentorch.com/mca-entry-kit/`. The collaboration guide is requested by email, since the live site gates it behind a form.
- Needs an internet connection for Google Fonts and the Three.js CDN. Offline, the hero falls back to a floating coin image.
