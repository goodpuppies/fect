import { Fect, fn, ok } from "../mod.ts";

const add = fn((a: number, b: number) => {
  return a + b;
});

const a = ok(1);
const b = 2;

console.log(add(a, b));
console.log(Fect.try(add(a, b)));
