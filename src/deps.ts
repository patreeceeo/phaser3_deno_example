import { debounce } from "debounce";
import type * as Phaser from "npm:phaser@3.60.0";
import type * as Main from "./main.ts";
import type * as Constants from "./constants.ts";


export enum ModuleId {
  Phaser = "npm:phaser@3.60.0",
  Main = "./main.js",
  Constants = "./constants.js",
}

export const localModulePaths = [
  ModuleId.Main,
  ModuleId.Constants,
];

interface ModuleType {
  [ModuleId.Phaser]: typeof Phaser;
  [ModuleId.Main]: typeof Main;
  [ModuleId.Constants]: typeof Constants;
}

export enum ModuleState {
  LOADING,
  RELOADING_DEPS,
  UNLOADING,
}

type DepsMap<Deps extends ModuleId[]> = Pick<ModuleType, Deps[number]>

interface ModuleIife<Deps extends ModuleId[]> {
  (depsMap: DepsMap<Deps>, state: ModuleState): void
}

const _modulesUrl: Partial<Record<ModuleId, string>> = {};
const _urlsModule: Partial<Record<string, ModuleId>> = {};
const _modulesDeps: Partial<Record<ModuleId, ModuleId[]>> = {};
const _modulesIife: Partial<Record<ModuleId, ModuleIife<any[]>>> = {};

export function requireAsync<D extends ModuleId>(dep: D, reload = false) {
  const url = dep + (reload ? "?timestamp=" + Date.now() : '')
  return import(url) as Promise<ModuleType[D]>;
}

async function createDepsMap<Deps extends ModuleId[]>(promises: Promise<any>[], deps: Deps) {
  const results = await Promise.all(promises);
  const depsMap: DepsMap<Deps> = {} as any;
  results.forEach((result, i) => {
    const dep = deps![i];
    (depsMap as any)[dep] = result;
  });
  return depsMap;
}

export async function declareModule<Deps extends ModuleId[], Iife extends ModuleIife<Deps>>(moduleId: ModuleId, url: string, deps: Deps, iife: Iife) {
  _modulesUrl[moduleId] = url;
  _urlsModule[url] = moduleId;
  _modulesDeps[moduleId] = deps;
  _modulesIife[moduleId] = iife as any;
  const promises = deps.map((dep) => requireAsync(dep));
  const depsMap = await createDepsMap(promises, deps);
  console.log("[HMR]: loading", moduleId);
  iife(depsMap, ModuleState.LOADING)
}

const deouncedReload = debounce(async (e) => {
    // attempt to hot reload the effected modules
    console.log("[HMR]: received change event:", JSON.stringify(JSON.parse(e.data), null, 2));
    const data = JSON.parse(e.data);
    let success = false
    for(const url of Object.values(_modulesUrl)) {
      const path = new URL(url).pathname;
      if(data.updated.indexOf(path) >= 0) {
        const moduleId = _urlsModule[url]!;
        const depsMap = await createDepsMap(_modulesDeps[moduleId]!.map((dep) => requireAsync(dep)), _modulesDeps[moduleId]!);
        const iife = _modulesIife[moduleId]!;
        console.log("[HMR]: unloading", moduleId);
        iife(depsMap, ModuleState.UNLOADING)
        const reloadedModule = await requireAsync(moduleId, true);
        // Find dependents and reload them too
        // TODO: recursively. Use a stack to detect cycles.
        for(const [dependentModuleId, deps] of Object.entries(_modulesDeps) as [ModuleId, ModuleId[]][]) {
          if(deps!.indexOf(moduleId) >= 0) {
            const iife = _modulesIife[dependentModuleId]!;
            const promises = deps!.map((dep) => dep === moduleId ? Promise.resolve(reloadedModule) : requireAsync(dep));
            const depsMap = await createDepsMap(promises, deps!);
            iife(depsMap, ModuleState.RELOADING_DEPS)
          }
        }
        success = true;
      }
    }
    if(!success) {
      // if we didn't hot reload anything, reload the page
      console.log("[HMR]: failed to hot reload, reloading page!");
      location.reload();
    }
  },
  100
)

if(globalThis.EventSource) {
  new EventSource("/esbuild").addEventListener(
    "change",
    deouncedReload,
  );
}
