# FitMentor Frontend

Responsive React and TypeScript training dashboard with in-browser MediaPipe pose tracking, live form cues, voice feedback, and session history.

## Development

```bash
npm ci
npm run dev
```

Camera access requires HTTPS or `localhost`. The deployed GitHub Pages site uses HTTPS and runs MediaPipe pose detection in the browser. Video frames stay in the browser; only twelve selected pose landmarks are sent to the backend over STOMP, at most three times per second.

## Deployment

The `pages.yml` workflow builds pull requests and deploys `main` to GitHub Pages. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. The project is built under `/FITMENTOR-FRONT/` for its Pages URL.

Set the repository Actions variable `VITE_API_URL` to the public backend URL, such as `https://fitmentor-backend.onrender.com`, so live landmarks reach the WebSocket pose service. The production default uses that Render URL when the variable is unset.

The browser loads the MediaPipe runtime and model from their public CDNs. An internet connection is required for the first load.