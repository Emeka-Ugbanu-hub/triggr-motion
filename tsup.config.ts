import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    "text/index": "src/text/index.tsx",
    "paragraph/index": "src/paragraph/index.tsx",
    "list/index": "src/list/index.tsx",
    "block/index": "src/block/index.tsx",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  splitting: false,
  treeshake: true,
  minify: true,
  outDir: "dist",
  outExtension: ({ format }) => format === "cjs" ? { js: ".cjs" } : { js: ".js" },
  exports: "named",
})
