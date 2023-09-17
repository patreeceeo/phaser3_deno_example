import { debounce } from "./utils/debounce.ts";
import type * as Phaser from "npm:phaser@3.60.0";
import type * as Main from "./main.ts";
import type * as Test from "./test.ts";

export enum ModuleId {
  Phaser = "npm:phaser@3.60.0",
  Main = "./main.js",
  Test = "./test.js",
}

interface ModuleType {
  [ModuleId.Phaser]: typeof Phaser;
  [ModuleId.Main]: typeof Main;
  [ModuleId.Test]: typeof Test;
}

export function requireAsync<D extends ModuleId>(dep: D, reload = false) {
  const url = dep + (reload ? "?hash=" + Math.random() : '')
  return import(url) as Promise<ModuleType[D]>;
}

interface ModuleIife<Args extends any[]> {
  (...args: Args): ModuleResult;
}


interface ModuleResult {
  unload: () => void;
}

const _modulesUrl: Partial<Record<ModuleId, string>> = globalThis._modulesUrl || {};
const _urlsModule: Partial<Record<string, ModuleId>> = globalThis._urlsModule || {};
const _modulesDeps: Partial<Record<ModuleId, ModuleId[]>> = globalThis._modulesDeps || {};
const _modulesIife: Partial<Record<ModuleId, ModuleIife<any[]>>> = globalThis._modulesIife || {};
const _modules: Partial<Record<ModuleId, ModuleResult>> = globalThis._modules || {}
globalThis._modulesUrl = _modulesUrl;
globalThis._urlsModule = _urlsModule;
globalThis._modulesDeps = _modulesDeps;
globalThis._modulesIife = _modulesIife;
globalThis._modules = _modules;

async function createDepsMap(promises: Promise<any>[], deps: ModuleId[]) {
  const results = await Promise.all(promises);
  const depsMap: Pick<ModuleType, any> = {} as any;
  results.forEach((result, i) => {
    const dep = deps![i];
    (depsMap as any)[dep] = result;
  });
  return depsMap;
}

export async function declareModule<Deps extends ModuleId[], Iife extends ModuleIife<[Pick<ModuleType, Deps[number]>]>>(moduleId: ModuleId, url: string, deps: Deps, iife: Iife) {
  _modulesUrl[moduleId] = url;
  _urlsModule[url] = moduleId;
  _modulesDeps[moduleId] = deps;
  _modulesIife[moduleId] = iife as any;
  const promises = deps.map((dep) => requireAsync(dep));
  const depsMap = await createDepsMap(promises, deps);
  _modules[moduleId] = iife(depsMap)
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
        const unload = _modules[moduleId]!.unload;
        unload();
        const reloadedModule = await requireAsync(moduleId, true);
        // Find dependents and reload them too
        for(const [dependentModuleId, deps] of Object.entries(_modulesDeps) as [ModuleId, ModuleId[]][]) {
          if(deps!.indexOf(moduleId) >= 0) {
            const iife = _modulesIife[dependentModuleId]!;
            const promises = deps!.map((dep) => dep === moduleId ? Promise.resolve(reloadedModule) : requireAsync(dep));
            const depsMap = await createDepsMap(promises, deps!);
            _modules[dependentModuleId] = iife(depsMap)
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

if(!globalThis._eventListenerAdded) {
  new EventSource("/esbuild").addEventListener(
    "change",
    deouncedReload,
  );
  globalThis._eventListenerAdded = true;
}
