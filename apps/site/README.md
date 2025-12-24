# site

Unified documentation and demo site for @3plate/graph.

## Tech Stack

- **Astro** - Static site generator
- **TypeScript** - Type-safe development

## Features

- Beautiful landing page with feature highlights
- Interactive playground for testing graph functionality
- Installation instructions
- Code examples
- Fully responsive design
- Deployed to GitHub Pages

## Development

```bash
# Start dev server
pnpm dev:site

# Build for production
pnpm build:site

# Preview production build
pnpm --filter site preview
```

## Structure

```
site/
├── src/
│   ├── components/
│   │   ├── Header.astro        # Site header/navigation
│   │   ├── CoreDemo.astro      # Core demo component
│   │   └── demo.css            # Shared demo styles
│   ├── layouts/
│   │   └── Layout.astro        # Base layout
│   └── pages/
│       ├── index.astro         # Landing page
│       └── playground.astro    # Interactive playground
├── public/
│   └── favicon.svg
└── astro.config.mjs
```

## Deployment

The site is automatically deployed to GitHub Pages on every push to the main branch via GitHub Actions.

The workflow builds:

1. Core library (`@3plate/graph-core`)
2. React wrapper (`@3plate/graph-react`)
3. Vue wrapper (`@3plate/graph-vue`)
4. Angular wrapper (`@3plate/graph-angular`)
5. Site (`site`)

And deploys the built site to `https://3plt.github.io/graph`
