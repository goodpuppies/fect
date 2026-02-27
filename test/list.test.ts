import { assertEquals } from "jsr:@std/assert";
import { List, match } from "../mod.ts";

Deno.test("List.at returns ok for valid index", () => {
  const out = List.at([10, 20, 30], 1);
  const value = match(out).with({
    ok: (v) => v,
    err: {
      ListIndexOutOfBounds: () => -1,
    },
  });
  assertEquals(value, 20);
});

Deno.test("List.at returns tagged error for invalid index", () => {
  const out = List.at([10], 5);
  const value = match(out).with({
    ok: () => "ok",
    err: {
      ListIndexOutOfBounds: (e) => `${e.index}/${e.length}`,
    },
  });
  assertEquals(value, "5/1");
});

Deno.test("List.atOption and helpers", () => {
  assertEquals(List.length([1, 2, 3]), 3);
  assertEquals(List.slice([1, 2, 3], 1), [2, 3]);
  assertEquals(List.prepend(0, [1, 2]), [0, 1, 2]);
  assertEquals(List.atOption(["a"], 0), { _tag: "Some", value: "a" });
  assertEquals(List.atOption(["a"], 1), { _tag: "None" });
});

