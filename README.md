# FitMentor Frontend

Responsive React and TypeScript training dashboard with in-browser MediaPipe pose tracking, live form cues, voice feedback, and session history.

## Development

```bash
npm ci
npm run dev
```

Camera access requires HTTPS or `localhost`. The deployed GitHub Pages site uses HTTPS and runs pose detection in the browser.

## Deployment

The `pages.yml` workflow builds pull requests and deploys `main` to GitHub Pages. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. The project is built under `/FITMENTOR-FRONT/` for its Pages URL.

The browser loads the MediaPipe runtime and model from their public CDNs. An internet connection is required for the first load.