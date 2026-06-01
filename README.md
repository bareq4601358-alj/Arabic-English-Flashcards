# Arabic · English Flashcards

Same study app as [Spanish Flashcards](https://bareq4601358-alj.github.io/Spanish-Flashcards/) (used only as an **outline** for topics and card count), adapted for **Iraqi Arabic → English**:

- **Main deck** — Arabic on the front, English on the back (click or ← to flip, → for next)
- **Matching** — pair Arabic with English (5 words per round, topics, scores)
- **Topics, sentences, writing, saved, hidden** — same layout and features

## Run locally

```bash
cd "arabic flashcards"
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Deploy to GitHub Pages

1. Create a repo (e.g. `Arabic-Flashcards`).
2. Push this folder to `main`.
3. **Settings → Pages →** deploy from `main` / root.
4. Site URL: `https://<username>.github.io/Arabic-Flashcards/`

## Word bank (verified deck)

**973** vocabulary cards — each Arabic gloss is verified (Iraqi lexicon, manual overrides, or validated translation). Ambiguous or doubtful cards are removed rather than shown with a risky gloss.

Rebuild the verified deck:

```bash
git clone --depth 1 https://github.com/bareq4601358-alj/Spanish-Flashcards.git /tmp/spanish-flashcards
node scripts/build-verified-deck.mjs
node scripts/prune-doubtful-cards.mjs
```

To rebuild from the Spanish repo (read-only clone; does not change Spanish GitHub):

```bash
git clone --depth 1 https://github.com/bareq4601358-alj/Spanish-Flashcards.git /tmp/spanish-flashcards
node scripts/mirror-spanish-banks.mjs    # first time: fills translation cache (~15 min)
node scripts/apply-wordbank-from-cache.mjs   # fast: applies cache to template
```

**544** sentence pairs in `sentence-bank.js` (same as Spanish after deduplication).
