import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

// 1) 워커를 먼저 번들해 문자열로 얻는다 (main에 인라인 → 3파일만으로 오프라인 동작)
const workerBuild = await esbuild.build({
  entryPoints: ["src/worker.ts"],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
  logLevel: "warning",
});
const workerCode = workerBuild.outputFiles[0].text;

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  define: { __WORKER_CODE__: JSON.stringify(workerCode) },
});

if (prod) {
  await ctx.rebuild();
  process.exit(0);
} else {
  await ctx.watch();
}
