https://reddit-pastehappy.onrender.com

# PasteHappy for Reddit

PasteHappy helps manage Reddit posting queues from a CSV file. Use the buttons and shortcuts in `index.html` to import a CSV, copy post text, and mark entries as posted.

## Deploying on Render

A Render blueprint is included for quick deployment as a Node web service.

1. Create a new **Blueprint** on Render and point it to this repository.
2. Render will read `render.yaml`, install dependencies, and start `npm start`.
3. The service will be reachable on the URL Render provides for the `reddit-pastehappy` web service.

### Local preview

```bash
npm install
npm start
```

Then open http://localhost:3000 to use the app.
