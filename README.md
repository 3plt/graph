# @3plate/graph

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

`@3plate/graph` can be used as a library with no framework dependencies, or you can use the
components in `@3plate/graph-react`, `@3plate/graph-vue`, or `@3plate/graph-angular` which wrap
the core library.

```
graph/
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
│   └── site/
│       ├── src/
│       ├── public/
│       ├── astro.config.mjs
│       └── package.json
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

## Installation

### Core Library

```bash
npm install @3plate/graph-core
```

### Framework Wrappers

```bash
# React
npm install @3plate/graph-react

# Vue
npm install @3plate/graph-vue

# Angular
npm install @3plate/graph-angular
```

## Usage

### Core (Framework-agnostic)

TODO

### React

TODO

### Vue

TODO

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run demo site
pnpm dev:site

# Run tests
pnpm test
```

## Contributing

We welcome contributions! Before submitting a pull request, please:

1. Read our [Contributing Guidelines](./CONTRIBUTING.md)
2. Sign the [Contributor License Agreement (CLA)](./CLA.md)
3. Follow the code style and testing guidelines

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](./LICENSE) file for details.

### Why GPL?

We've chosen GPL-3.0 to ensure that improvements to @3plate/graph remain open source and benefit the entire community. This means:

- ✅ You can use @3plate/graph in open source projects
- ✅ You can modify and distribute @3plate/graph
- ✅ Commercial use is allowed
- ⚠️ If you distribute modified versions, you must also make your changes available under GPL-3.0

### Commercial Licensing

If you need to use @3plate/graph in a proprietary/closed-source application without GPL restrictions, commercial licenses are available. Contact us at [nathan@3plate.com] for more information.

### Copyright

Copyright (c) 2025 3Plate LLC

---

Made with ⚡ by [3Plate LLC](https://www.3plate.com/)
