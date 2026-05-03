# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a fresh Git project with no application source checked in yet. As code is added, keep the layout predictable:

- `src/` for production code and reusable modules.
- `tests/` for automated tests that mirror `src/` structure.
- `docs/` for design notes, API references, and contributor documentation.
- `assets/` for static files such as images, fixtures, or sample data.
- Root-level configuration files should govern the whole project.

Prefer small, cohesive modules named after their feature or responsibility, for example `src/auth/session.*` or `tests/auth/session.test.*`.

## Build, Test, and Development Commands

No build system or package manager is committed yet. When tooling is introduced, keep canonical commands working from the repository root:

- `make setup` or package-manager equivalent: install dependencies.
- `make test`: run the complete automated test suite.
- `make lint`: run static checks and formatting validation.
- `make dev`: start the local development server or watcher.

Avoid editor-specific workflows; contributors should be able to bootstrap and validate changes from the command line.

## Coding Style & Naming Conventions

Follow the formatter and linter configured for the language once one is added. Until then, use consistent indentation, clear names, and avoid unrelated refactors.

Use lowercase, hyphenated names for documentation files when practical, such as `docs/api-design.md`. For source files, follow the chosen language or framework. Keep public interfaces explicit and document non-obvious behavior close to the code.

## Testing Guidelines

Add tests with new behavior. Place tests under `tests/` and mirror the production module path where possible. Use names that describe expected behavior, such as `session.test.*` or `test_session_*`.

Tests should cover normal flows, important edge cases, and failure paths. If a change cannot be tested automatically, explain manual verification in the pull request.

## Commit & Pull Request Guidelines

This repository has no existing commit history, so use concise, imperative commit messages such as `Add project scaffold` or `Implement session validation`.

Pull requests should include a summary, rationale, tests or checks run, and screenshots or logs for user-facing changes. Link related issues when available and call out breaking changes, migrations, or follow-up work.

## Security & Configuration Tips

Do not commit secrets, local credentials, or machine-specific configuration. Use ignored environment files such as `.env.local` for local values, and provide a documented template such as `.env.example` when configuration becomes required.
