#!/usr/bin/env -S deno run --allow-write --allow-read --allow-run --allow-env --allow-net
import { esbuild } from "./deps.ts";
import { BUILD_OPTIONS, WWW_DIR } from "./configure.ts";

const context = await esbuild.context(BUILD_OPTIONS);

context.serve({
  servedir: WWW_DIR,
}).then(async () => {
  await context.watch();
  await context.rebuild();
  // TODO iterate over transpiled files, finding all import statements.
  // If using a bare specifier, replace that with the URL from the import map
  // else if it has a .ts extension, replace it .js
});
