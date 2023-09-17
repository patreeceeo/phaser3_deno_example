import type * as Phaser from "npm:phaser@3.60.0";

export enum Dep {
  Phaser = "npm:phaser@3.60.0",
}

interface DependencyTypes {
  [Dep.Phaser]: typeof Phaser;
}

export function requireAsync<D extends Dep>(dep: D) {
  return import(dep) as Promise<DependencyTypes[D]>;
}
