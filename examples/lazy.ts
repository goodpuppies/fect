import { Fect } from "../mod.ts";

const first = Fect.fn((a: number, b: number) => {
  const x = b
  return a
});

const hang = Fect.lazy(
  ()=> {throw new Error("trolo")}
);

console.log(Fect.try(first(10, hang)));