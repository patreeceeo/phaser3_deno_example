import { declareModule, ModuleId } from "./deps.ts";

declareModule(ModuleId.Test, import.meta.url, [], () => {
  speed = 1000
  return {
    unload: () => {
      console.log("unloading test");
    }
  };
});

export let speed: number
