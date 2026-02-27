import { Fect, fn, List, match, Option } from "../mod.ts";

export const mul = fn(
  (a: number, b: number) => a * b,
);

export const charToDigit = fn(
  (c: string) => {
    if (c >= "0" && c <= "9") {
      return Option.Some(c.charCodeAt(0) - "0".charCodeAt(0));
    }
    return Option.None;
  },
);

export type wstr = readonly string[]

export function strEq(
  a: string | readonly string[],
  b: string | readonly string[],
): boolean {
  const left = typeof a === "string" ? a : a.join("");
  const right = typeof b === "string" ? b : b.join("");
  return left === right;
}
