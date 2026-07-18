# Vellum

🌐 [English (US)](README.md) · [English (UK)](README.en-GB.md) · **Español** · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**De la imaginación al mapa.** Un generador y editor de mapas de fantasía para Obsidian con el que crear y refinar tus propios mundos.

Funciona con canvas puro (render a tinta y aguada), sin bibliotecas externas, con el objetivo de que cada render sea por sí mismo un mapa antiguo terminado. Los mapas se guardan como archivos `.fmap` (JSON), así que el control de versiones y la sincronización funcionan sin más.

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| [`plugin/`](plugin/) | **Código fuente** del plugin (TypeScript), con build, tests y documentación de arquitectura |
| [`docs/`](docs/) | Página de inicio (servida con **GitHub Pages**), incluye el zip de descarga |
| [`dist/`](dist/) | **Distribución** del plugin — zip de release + copia descomprimida (solo archivos de instalación) |

- Cómo generar una distribución desde el código: sección de desarrollo de [`plugin/README.md`](plugin/README.md)
- Arquitectura e internals: [`plugin/ARCHITECTURE.md`](plugin/ARCHITECTURE.md) (en inglés)
- Decisiones de diseño: [`plugin/DESIGN-DECISIONS.md`](plugin/DESIGN-DECISIONS.md) (en inglés)

## Instalación (usuarios)

1. Descarga el último `vellum-x.y.z.zip` de [`dist/`](dist/) y descomprímelo
   (o usa el botón de descarga de la página de inicio).
2. Copia `main.js`, `manifest.json` y `styles.css` en la carpeta `.obsidian/plugins/vellum/` de tu bóveda.
   - En Windows, el `install.ps1 "ruta\a\TuBoveda"` incluido lo hace en una línea.
3. Activa **Vellum** en Ajustes → Plugins de la comunidad.

> Por ahora solo escritorio (móvil sin probar).

## Desarrollo (inicio rápido)

```powershell
cd plugin
npm install
npm run dev    # build en modo watch
npm run build  # comprobación de tipos + bundle de producción
npm test       # tests unitarios de lógica pura
```

## Contribuir / reglas de ramas

Este repositorio usa la estrategia de ramas `master` (release) / `dev` (integración) / `feat/*` (funcionalidad).
Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un PR.

## Licencia

[MIT](plugin/LICENSE)
