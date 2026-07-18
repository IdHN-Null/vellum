# Contributing Guide — Branch Policy

🌐 [English (US)](CONTRIBUTING.md) · **English (UK)** · [Español](CONTRIBUTING.es.md) · [中文](CONTRIBUTING.zh.md) · [日本語](CONTRIBUTING.ja.md) · [한국어](CONTRIBUTING.ko.md)

This repository runs on the five branch types below. In one line:

> **Write code only on `feat/*`, gather it on `dev`, and let `master` receive only verified results.**

## 1. `master` — releases

- Must only ever contain versions that are **fully integrated and verified (build + tests)**.
- No direct development here. Commits arrive only through merges from `dev` (or `hotfix/*`).
- `master` *is* the release: the `dist/` release zips and GitHub Pages (`docs/`) are served from this branch.

## 2. `dev` — integration

- Despite the name, its real job is **integration**. **Do not write code directly here.**
- To land a feature you developed separately, open a **PR from `feat/*` into `dev`**.
- Once `dev` has stabilised, merge it into `master` via PR.

## 3. `feat/{feature-name}` — feature development

- Branch off `dev` and build whatever you like.
- **Before opening a PR**, merge `dev` locally, resolve conflicts, and confirm
  `npm run build && npm test` passes.
- **No self-approving your own PR.** (No merging without review.)
- Once a PR is approved and merged, the branch is **deleted automatically** (repository setting).
- Built something brilliant or fun that you'd rather show off than merge?
  Push the branch and simply don't open a PR.

## 4. `test/{test-name}` — experiments

- For experiments and validation only. **No PRs.**
- If the results are worth keeping, move them to a `feat/*` branch and develop them properly.

## 5. `hotfix/{bug-name}` — urgent fixes

- Branch off `dev` or `master` when an **urgent problem** appears there.
- Fix it completely, then merge back (if applied to `master`, propagate to `dev` too).
- Problems on other branches (`feat/*` etc.) are not hotfix material — fix them in place.

---

## PR checklist

- [ ] Merged `dev` locally → conflicts resolved
- [ ] `cd plugin && npm run build` passes (type check + bundle)
- [ ] `npm test` passes
- [ ] For rendering-related changes, checked the visual harness (`node test/server.mjs`)
- [ ] Not self-approved

## Flow at a glance

```
feat/cool-feature ──PR──▶ dev ──PR──▶ master ──▶ dist/ release + docs/ page
     ▲                     │
     └── branch from here ─┘          hotfix/urgent-bug ──▶ (merge back where it arose)
```
