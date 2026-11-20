[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mioand88-collab/gta6-trophy-guide-01-entry/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mioand88-collab/gta6-trophy-guide-01-entry/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

# Leonida Legends — GTA VI Trophy Guide & Tracker

The complete offline guide and checklist tracker for all **55 Grand Theft Auto VI trophies** on PlayStation 5 (1 platinum, 2 gold, 6 silver, 46 bronze — 28 hidden on PSN), built for the [make.fun bounty “Build the best GTA 6 trophy guide”](https://make.fun/bounty/gta6-trophy-guide-01).

## What it is

- **Every trophy, officially named.** Names, descriptions and grades are the official PlayStation list, word for word.
- **Guides in our own words, each one cited.** Every trophy has a guide that says what to do, where and how — and names its source beside it (Rockstar's GTA VI trailers and site, PSNProfiles, Exophase). Nothing is copied from another guide.
- **A five-stage roadmap to the platinum**, from the opening mission through contacts, activities, collectibles and the money cleanup.
- **19 missable trophies flagged**, each with how to catch it: a manual save before the moment, or mission replay.
- **A tracker that remembers.** Tick trophies off; progress is saved in the browser (localStorage), exportable to a JSON file and importable back.
- **Filters and spoiler mode.** Filter by story, missable, collectibles, activities, contacts & strangers, open world, online (the official list has none — everything is earnable offline), earned or still to earn. Spoiler mode hides story trophy names and descriptions until you earn them.
- **Fully offline.** Static files under `app/`, no build step, no network requests at run time. Serve `app/` with any static server and open `index.html`.

## Run it

```sh
cd app
python3 -m http.server 8080
# open http://localhost:8080
```

Or use the included `serve.ts` from the repository root (`node serve.ts`).

## Layout

- `app/index.html` — the page
- `app/style.css` — the original Vice City dusk design
- `app/app.js` — tracker logic: rendering, filters, search, spoiler mode, localStorage, export/import
- `app/data/trophies.json` — the 55 trophies with official names/descriptions/grades, hidden flags, kinds, missable flags, roadmap stages, counts and cited guides
- `screenshots/` — renders of the app in a browser
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`

## License

MIT. This is an unofficial fan-made guide, not affiliated with or endorsed by Rockstar Games. No Rockstar logo, official artwork or game screenshots are used.
