# demo-site

Unified documentation and demo site for SteadyFlow, showcasing all framework integrations.

## Tech Stack

- **Astro** - Static site generator with multi-framework support
- **React** - React demo components
- **Vue** - Vue demo components
- **TypeScript** - Type-safe development

## Features

- Beautiful landing page with feature highlights
- Interactive demo with framework tabs (React, Vue, Angular)
- Installation instructions
- Code examples for each framework
- Fully responsive design
- Deployed to GitHub Pages

## Development

```bash
# Start dev server
pnpm dev:site

# Build for production
pnpm build:site

# Preview production build
pnpm --filter demo-site preview
```

## Structure

```
demo-site/
├── src/
│   ├── components/
│   │   ├── Header.astro        # Site header/navigation
│   │   ├── DemoSection.astro   # Tab-based demo section
│   │   ├── ReactDemo.tsx       # React demo component
│   │   ├── VueDemo.vue         # Vue demo component
│   │   └── demo.css            # Shared demo styles
│   ├── layouts/
│   │   └── Layout.astro        # Base layout
│   └── pages/
│       └── index.astro         # Landing page
├── public/
│   └── favicon.svg
└── astro.config.mjs
```

## Deployment

The site is automatically deployed to GitHub Pages on every push to the main branch via GitHub Actions.

The workflow builds:
1. Core library (`steadyflow`)
2. React wrapper (`react-steadyflow`)
3. Vue wrapper (`vue-steadyflow`)
4. Demo site (`demo-site`)

And deploys the built site to `https://3plates.github.io/steadyflow`
