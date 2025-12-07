# Contributing to @3plate/graph

Thank you for your interest in contributing to @3plate/graph! We welcome contributions from the community.

## Contributor License Agreement

Before we can accept your contribution, you must sign our [Contributor License Agreement (CLA)](./CLA.md). This protects both you and us, and ensures that the project can continue to be developed and distributed.

**Why a CLA?**

- Ensures you have the rights to contribute your code
- Allows us to maintain the project under GPL-3.0 while also offering commercial licenses
- Protects the project from legal issues
- Gives you credit for your contributions

## How to Contribute

### 1. Sign the CLA

First-time contributors must sign the CLA by following the instructions in [CLA.md](./CLA.md).

### 2. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/3plate-graph.git
cd 3plate-graph
```

### 3. Set Up Development Environment

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the demo site
pnpm dev:site
```

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 5. Make Your Changes

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass: `pnpm test`
- Build successfully: `pnpm build`

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: add amazing feature"
```

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 7. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub and:

1. **Sign the CLA** in your PR description (if you haven't already)
2. Describe your changes
3. Reference any related issues

## Code Style

### General Guidelines

- **Use TypeScript** for all new code
- **No semicolons** - We follow a semicolon-free style (enforced by ESLint/Prettier)
- **Single quotes** for strings (except to avoid escaping)
- **2 spaces** for indentation
- Format code with Prettier (automatic on save)
- Write meaningful commit messages

### Why No Semicolons?

We've chosen to omit semicolons following the style of projects like Vue.js, Nuxt, and StandardJS. This is a personal preference that's enforced consistently across the codebase via tooling.

**The tooling will handle this for you automatically**, so don't worry about it! Just run:

```bash
# Format all files
pnpm format

# Lint and auto-fix
pnpm lint --fix
```

## Project Structure

```
graph/
├── packages/          # Library packages
│   ├── core/         # Framework-agnostic core
│   ├── react/        # React wrapper
│   ├── vue/          # Vue wrapper
│   └── angular/      # Angular wrapper
├── apps/             # Demo applications
│   ├── demo-site/    # Unified Astro demo site
│   ├── demo-react/   # React dev playground
│   ├── demo-vue/     # Vue dev playground
│   └── demo-angular/ # Angular dev playground
└── .github/          # CI/CD workflows
```

## Development Scripts

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:core
pnpm build:react
pnpm build:vue

# Development
pnpm dev:site       # Start demo site
pnpm dev:demo       # Start React demo

# Testing
pnpm test           # Run all tests

# Publishing (maintainers only)
pnpm publish:packages
```

## Testing

- Write unit tests for new features
- Ensure existing tests pass
- Test in multiple browsers if UI changes
- Test with both React 18 and React 19 if applicable

## Documentation

- Update README.md if adding features
- Add JSDoc comments to public APIs
- Update demo examples if behavior changes
- Add migration guides for breaking changes

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Tag @3plates for urgent matters

## License

By contributing to @3plate/graph, you agree that your contributions will be licensed under the GNU General Public License v3.0, with the understanding that 3Plate LLC may also use your contributions in commercial versions of the software as outlined in the CLA.

---

Thank you for contributing to @3plate/graph! 🚀
