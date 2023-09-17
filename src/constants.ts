import { declareModule, ModuleId } from "./deps.ts";

declareModule(ModuleId.Constants, import.meta.url, [], () => {
  LOGO_SPEED_X = 300
  LOGO_SPEED_Y = -500
});

export let LOGO_SPEED_X: number
export let LOGO_SPEED_Y: number
