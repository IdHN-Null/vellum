# Vellum (plugin de Obsidian)

🌐 [English (US)](README.md) · [English (UK)](README.en-GB.md) · **Español** · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**De la imaginación al mapa.** Un generador y editor de mapas de fantasía para crear y refinar tus propios mundos.
Funciona con canvas puro, sin bibliotecas externas, con el objetivo de que cada render sea por sí mismo un mapa antiguo terminado.

## Resumen de funciones

**Generación de terreno**
- **Generación totalmente aleatoria** — por defecto, un clic elige continentes, islas, nivel del mar y clima (reproducible con la semilla). El ajuste fino está en los **ajustes avanzados** (plegados)
- **Generación procedural + erosión hidráulica** — a la generación por semilla se suma una simulación de erosión por gotas que talla valles y llanuras aluviales reales
- **Columna montañosa garantizada por continente** — cadenas de crestas al estilo Tolkien
- **Hidrología avanzada** — ríos ramificados por acumulación de caudal (más anchos aguas abajo), lagos naturales por priority-flood, líneas batimétricas
- **Generación asíncrona** — el terreno se calcula en un Web Worker; ni los mapas grandes congelan la interfaz

**Render a tinta y aguada (estilo mapa antiguo)**
- Base de aguada de acuarela + detalle vectorial a pluma (costas, curvas de nivel, ríos), con re-render LOD al acercar
- **Anillos concéntricos costeros** — los anillos equidistantes de las cartas antiguas, más vetas en la superficie del agua
- **Rayado costero / terrestre** — líneas discontinuas calcográficas grabadas por capas a ambos lados de la costa (activables por separado)
- **Sellos de glifos** — bosques como grupos de árboles con sombra, colinas como arcos, montañas como picos de grabado con caras sombreadas y rayado
- **Deslizadores de textura** para grano, sombreado, moteado y tamaño de iconos; tres estilos (pergamino/color/tinta); colores de bioma personalizables
- Cuadrícula de coordenadas (A·B·C / 1·2·3), líneas de rumbo de la brújula, marcos/olas/viñeta

**Herramientas de edición**
- **Pinceles de terreno** — elevar/hundir (`[` `]` para el tamaño)
- **Pintura de biomas** — pinceles de Agua/Pradera/Bosque/Desierto/Nieve (1–5, E para borrar). Pintar agua/tierra corrige también la elevación
- **Anotaciones a mano alzada** — trazos, líneas y flechas (con discontinuas), color y grosor: ideales para mapas del tesoro
- **18 iconos de marcador** — insignias vectoriales de estilo cartográfico (castillo, pueblo, puerto, montaña, bosque, torre, templo, campo de batalla, cofre, calavera, bandera, X…) con control de tamaño
- **Polígonos de región** — dibuja fronteras a clics, con etiquetas y colores
- **Elementos de texto** — cartela de título, topónimos, **cintas con texto**, tarjetas de notas. Arrastrar para mover, redimensionar, doble clic para editar
- **25 pegatinas decorativas** — un clic desde la cuadrícula de miniaturas. Cielo (nube, sol, luna, aves, viento, tormenta) / Mar (barco, serpiente marina, ballena, peces, remolino, olas, faro, kraken) / Tierra (dragón, campamento, ruinas, torre, castillo, puente, molino) / Mapa (brújula, mancha de tinta, pergamino, adorno de esquina). **También puedes añadir tus propios PNG de la bóveda**
- **Insignias de marcador a tinta** — anillos dibujados a mano + glifos de tinta + acentos apagados que casan con un mapa antiguo
- Orden de capas (delante/detrás) desde el menú contextual

**Integración con la bóveda**
- Enlaces bidireccionales marcador ↔ nota (clic en un marcador → abre su nota; comando `현재 노트를 지도에서 보기` para el camino inverso)
- Los enlaces de subruta `[[mapa.fmap#marcador]]` enfocan un marcador concreto
- `.fmap` es JSON, así que el control de versiones y la sincronización funcionan sin más
- **Exportación PNG** — guardada en la bóveda con la misma calidad (caché de detalle 3×) que la vista del editor
- **Modo de mapa de imagen** — coloca marcadores y regiones sobre tu propio mapa dibujado
- **Pack de ejemplo** — el comando `샘플팩 설치 (온보딩)` genera un mapa de ejemplo con notas enlazadas

> La vista 3D se separó del núcleo. Volverá como plugin adicional (three.js).

## Instalación

### Opción 1 — script
```powershell
cd vellum
.\install.ps1 "C:\ruta\a\TuBoveda"
```

### Opción 2 — manual
1. Crea la carpeta `.obsidian/plugins/vellum/` en tu bóveda.
2. Copia los tres archivos: `main.js`, `manifest.json`, `styles.css`.
3. Activa **Vellum** en Ajustes de Obsidian → Plugins de la comunidad.

> Tras reemplazar los archivos, apaga y enciende el plugin o reinicia Obsidian. Comprueba la versión al pie del panel derecho.
> Por ahora solo escritorio (móvil sin probar — fuentes incrustadas, lienzos grandes).

## Primeros pasos
1. Paleta de comandos (Ctrl+P) → ejecuta **샘플팩 설치 (온보딩)** (instalar pack de ejemplo) → mira `판타지 지도 샘플/시작하기.md`.
2. Crea mapas nuevos con el icono de mapa de la cinta o el comando **새 판타지 지도 만들기** (nuevo mapa de fantasía) (archivo `.fmap`).

> Nota: la interfaz del plugin está por ahora en coreano.

## Herramientas (barra izquierda)
| Herramienta | Acción |
|---|---|
| Seleccionar | Arrastrar: mover el mapa / arrastrar marcadores, elementos, dibujos: mover / clic en marcador: abrir nota / clic derecho: menú |
| Marcador | Añade un marcador donde hagas clic (nombre, icono, enlace a nota) |
| Región | Clic para añadir vértices; doble clic/Enter para terminar, Esc para cancelar |
| Dibujo/Flecha | Arrastra para curvas libres y flechas (color, grosor y discontinuas en la barra inferior) |
| Elevar/Hundir | Arrastra para editar el terreno (solo mapas generados) |
| Pintura | Pinta biomas — tipo y tamaño en la barra inferior (1–5, E) |

El panel derecho tiene cuatro pestañas: **Terreno / Estilo / Elementos / Archivo**.

## Desarrollo
```powershell
npm install
npm run dev    # build en modo watch
npm run build  # comprobación de tipos + bundle de producción
npm test       # tests unitarios de lógica pura (RLE, migraciones, curvas de nivel, distribución del terreno)
```
Tests visuales del pipeline de render: `node test/server.mjs` y abre http://localhost:8137
(regenera el bundle con `npx esbuild test/preview.ts --bundle --outfile=test/preview.js`)

## Licencia
MIT
