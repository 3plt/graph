# steadyflow

Graph library with stable layout and incremental updates

## Inspiration

This component is inspired by [IonGraph Web](https://spidermonkey.dev/blog/2025/10/28/iongraph-web.html) from the SpiderMonkey team.


## Features

- Custom node rendering
- Automatic graph layout
- Stable layouts
- Multiple orientations
- Interactive features
- Cycle detection
- Edge styling
- Pan and zoom
- Mini-map
- Animations
- SVG for crisp details
- Fast rendering
- Builder mode
- Incremental updates
- Railroad-style edges
- Configurable layout
- React/Vue/Angular support

## Project Structure

`steadyflow` can be used as a library with no framework dependencies, or you can use the
components in `steadyflow-react`, `steadyflow-vue`, or `steadyflow-angular` which wrap
the core library.

```
steadyflow/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── react/
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── vue/
│   │   └── ...
│   │
│   └── angular/
│       └── ...
│
├── apps/
│   ├── demo-react/
│   │   ├── src/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   ├── demo-vue/
│   |   └── ...
│   │
│   └── demo-angular/
│       └── ...
│
├── .github/
│   └── workflows/
│       ├── publish-npm.yml
│       └── deploy-pages.yml
│
├── pnpm-workspace.yaml
├── package.json
├── .npmrc
├── turbo.json
└── README.md   
```