# PasteHappy for Reddit

PasteHappy helps manage Reddit posting queues from a CSV file. Use the buttons and shortcuts in `index.html` to import a CSV, copy post text, and mark entries as posted.

## Deploying on Render

A Render blueprint is included for quick deployment as a static site.

1. Create a new **Blueprint** on Render and point it to this repository.
2. Render will read `render.yaml` and provision a static site named **reddit-pastehappy**.
3. No build step is required; Render will serve the files directly from the repository root.

To preview locally, open `index.html` in your browser.
