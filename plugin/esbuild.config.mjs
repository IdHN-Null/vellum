import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

// 1) Bundle the worker first and capture it as a string (inlined into main → three files work offline)
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
