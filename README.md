# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS


## Environment variables

Copy `.env.example` to `.env` and set `AI_API_KEY` locally or in your server's secret manager. Do not use a `VITE_` prefix for provider keys: Vite variables are bundled into browser code. `.env` is excluded from Git.

The AI assistant calls the server-side `/api/public/chat` endpoint, which reads `AI_API_KEY` on the server. For an Android build, set `VITE_API_BASE` to the deployed Noor Habit server URL before building so the app can reach that endpoint.
