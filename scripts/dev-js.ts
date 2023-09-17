#!/usr/bin/env -S deno run --allow-write --allow-read --allow-run --allow-env --allow-net
import { esbuild } from "./deps.ts";
import { BUILD_OPTIONS, WWW_DIR } from "./configure.ts";

const context = await esbuild.context({
  ...BUILD_OPTIONS,
  banner: {
    js: `
      new EventSource("/esbuild").addEventListener(
        "change",
        () => location.reload(),
      );
    `
  }
});

context.serve({
  servedir: WWW_DIR,
}).then(async () => {
  await context.watch();
  await context.rebuild();
});
