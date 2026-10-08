const { registerHooks } = require("node:module");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { fileURLToPath } = require("node:url");
const ts = require("typescript");

// Run the actual application modules with Node's test runner, without Next dev.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = resolve(__dirname, "..", specifier.slice(2));
      const path = [base + ".ts", base + ".tsx", base + "/index.ts"].find(existsSync);
      if (path) return nextResolve(path, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\.tsx?$/.test(url)) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
        fileName: fileURLToPath(url),
      }).outputText;
      return { format: "commonjs", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
