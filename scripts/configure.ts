import { localModulePaths } from "../src/deps.ts";
import { esbuild } from "./deps.ts";

type BuildOptions = esbuild.BuildOptions;
type Context = esbuild.CommonOptions;

export const JS_DIR = "./public/assets/";
export const WWW_DIR = "./public";

export const CONTEXT: Context = {
  minify: true,
  sourcemap: true,
  target: "esnext",
  platform: "browser"
};

export const BUILD_OPTIONS: BuildOptions = {
  ...CONTEXT,
  entryPoints: localModulePaths.map((path) => `./src/${path}`),
  outdir: JS_DIR,
  bundle: true,
  format: "esm",
};
