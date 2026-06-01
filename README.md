# Arabic · English Flashcards

Arabic · English flashcard app — **Iraqi Arabic** on the front, English on the back:

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

1. Push this folder to `main`.
2. **Settings → Pages →** deploy from `main` / root.
3. Site URL: `https://bareq4601358-alj.github.io/Arabic-English-Flashcards/`

## Word bank

**~967** cards — built **English → Iraqi Arabic** (verbs as colloquial **يـ…** forms). Topics use Arabic labels; each word has one category tag.

```bash
node scripts/build-en-iraqi-deck.mjs   # rebuild glosses from English
node scripts/retag-wordbank.mjs        # re-sort categories only
```
