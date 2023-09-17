import * as _Phaser from "npm:phaser@3.60.0";
export const Phaser = _Phaser;
import type * as Test from "./test.ts";

export enum Dep {
  test = "./test.js",
}

interface DependencyTypes {
  [Dep.test]: typeof Test;
}

export function importLocal(dep: Dep) {
  return import(dep) as Promise<DependencyTypes[typeof dep]>;
}
