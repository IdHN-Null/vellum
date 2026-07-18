# Guía de contribución — Política de ramas

🌐 [English (US)](CONTRIBUTING.md) · [English (UK)](CONTRIBUTING.en-GB.md) · **Español** · [中文](CONTRIBUTING.zh.md) · [日本語](CONTRIBUTING.ja.md) · [한국어](CONTRIBUTING.ko.md)

Este repositorio funciona con los cinco tipos de rama siguientes. En una línea:

> **Escribe código solo en `feat/*`, reúnelo en `dev`, y deja que `master` reciba únicamente resultados verificados.**

## 1. `master` — releases

- Solo debe contener versiones **totalmente integradas y verificadas (build + tests)**.
- Aquí no se desarrolla directamente. Los commits llegan solo por merges desde `dev` (o `hotfix/*`).
- `master` *es* la release: los zips de `dist/` y GitHub Pages (`docs/`) se sirven desde esta rama.

## 2. `dev` — integración

- Pese al nombre, su función real es la **integración**. **No escribas código directamente aquí.**
- Para incorporar una funcionalidad desarrollada aparte, abre un **PR de `feat/*` hacia `dev`**.
- Cuando `dev` esté estable, se fusiona en `master` mediante PR.

## 3. `feat/{nombre}` — desarrollo de funcionalidades

- Ramifica desde `dev` y construye lo que quieras.
- **Antes de abrir un PR**, fusiona `dev` en local, resuelve conflictos y confirma que
  `npm run build && npm test` pasa.
- **Prohibido aprobar tu propio PR.** (Nada de merges sin revisión.)
- Cuando un PR se aprueba y fusiona, la rama se **elimina automáticamente** (ajuste del repositorio).
- ¿Hiciste algo genial o divertido que prefieres enseñar antes que fusionar?
  Sube la rama y simplemente no abras PR.

## 4. `test/{nombre}` — experimentos

- Solo para experimentos y validación. **Sin PRs.**
- Si el resultado vale la pena, muévelo a una rama `feat/*` y desarróllalo en serio.

## 5. `hotfix/{nombre}` — arreglos urgentes

- Ramifica desde `dev` o `master` cuando aparezca allí un **problema urgente**.
- Arréglalo por completo y fusiona de vuelta (si se aplicó a `master`, propágalo también a `dev`).
- Los problemas de otras ramas (`feat/*`, etc.) no son material de hotfix: arréglalos allí mismo.

---

## Checklist de PR

- [ ] `dev` fusionado en local → conflictos resueltos
- [ ] `cd plugin && npm run build` pasa (tipos + bundle)
- [ ] `npm test` pasa
- [ ] Si el cambio afecta al render, comprobado el harness visual (`node test/server.mjs`)
- [ ] Sin auto-aprobación

## Flujo de un vistazo

```
feat/funcion-genial ──PR──▶ dev ──PR──▶ master ──▶ release en dist/ + página en docs/
     ▲                       │
     └── ramifica desde aquí ┘          hotfix/bug-urgente ──▶ (fusiona donde surgió)
```
