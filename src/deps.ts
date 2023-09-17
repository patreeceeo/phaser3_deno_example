import { debounce } from "./utils/debounce.ts";
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
  RELOADING_SELF,
}

type DepsMap<Deps extends ModuleId[]> = Pick<ModuleType, Deps[number]>

interface ModuleIife<Deps extends ModuleId[]> {
  (depsMap: DepsMap<Deps>, state: ModuleState): void
}

const _globalThis = globalThis as any;
const _modulesUrl: Partial<Record<ModuleId, string>> = _globalThis._modulesUrl || {};
const _urlsModule: Partial<Record<string, ModuleId>> = _globalThis._urlsModule || {};
const _modulesDeps: Partial<Record<ModuleId, ModuleId[]>> = _globalThis._modulesDeps || {};
const _modulesIife: Partial<Record<ModuleId, ModuleIife<any[]>>> = _globalThis._modulesIife || {};
_globalThis._modulesUrl = _modulesUrl;
_globalThis._urlsModule = _urlsModule;
_globalThis._modulesDeps = _modulesDeps;
_globalThis._modulesIife = _modulesIife;

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
  iife(depsMap, ModuleState.LOADING)
}

const deouncedReload = debounce(async (e) => {
    // attempt to hot reload the effected modules
    console.log("[HMR]: received change event:", e.data);
    const data = JSON.parse(e.data);
    let success = false
    for(const url of Object.values(_modulesUrl)) {
      const path = new URL(url).pathname;
      if(data.updated.indexOf(path) >= 0) {
        const moduleId = _urlsModule[url]!;
        const depsMap = await createDepsMap(_modulesDeps[moduleId]!.map((dep) => requireAsync(dep)), _modulesDeps[moduleId]!);
        const iife = _modulesIife[moduleId]!;
        iife(depsMap, ModuleState.RELOADING_SELF)
        const reloadedModule = await requireAsync(moduleId, true);
        // Find dependents and reload them too
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

if(!_globalThis._eventListenerAdded && globalThis.EventSource) {
  new EventSource("/esbuild").addEventListener(
    "change",
    deouncedReload,
  );
  _globalThis._eventListenerAdded = true;
}
