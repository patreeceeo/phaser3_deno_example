import { declareModule, ModuleId } from "./deps.ts";

declareModule(ModuleId.Test, import.meta.url, [], () => {
  speed = 1000
});

export let speed: number
