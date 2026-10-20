# Project Name: TypeScript Application

## 🛠️ Build & Test Commands
- **Install dependencies:** `npm install`
- **Build production project:** `npm run build`
- **Start dev mode:** `npm run dev`
- **Run type checker:** `npm run typecheck`
- **Run tests:** `npm run test`
- **Lint code:** `npm run lint`

## ⚙️ TypeScript Standards
- **Enforce Strict Mode:** Adhere strictly to `"strict": true` in `tsconfig.json`. No implicit `any` allowed.
- **Ban `any`:** Never use the `any` type. If a type is genuinely unknown, use `unknown` combined with explicit type narrowing or type guards.
- **Null & Undefined:** Explicitly handle null/undefined states (`strictNullChecks`). Avoid unsafe non-null assertions (`!`).
- **Interfaces vs. Types:** Use `interface` for public APIs and component props/state; use `type` for unions, intersections, and utility aliases.
- **Imports:** Prefer explicit type-only imports (`import type { User } from './types'`) for pure type declarations to optimize bundling.
- **Immutability:** Use `as const` for enum-like configurations and read-only literal objects.

## 💻 Coding Conventions
- **Exports:** Prefer explicit named exports over default exports to guarantee consistent naming across imports.
- **Async Code:** Always use `async/await` syntax instead of raw, chained `.then()` promises.
- **Validation:** Run the local type checker (`npx tsc --noEmit`) and linter after every code modification before declaring a task complete.
