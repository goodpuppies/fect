import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "jsr:@std/assert";
import { err, fn, Fect, ok } from "../mod.ts";

Deno.test("Fect.try returns value for sync ok carrier", () => {
  const out = ok(42);

  const value = Fect.try(out);
  assertEquals(value, 42);
});

Deno.test("Fect.try throws for sync err carrier", () => {
  const out = err("boom");
  assertThrows(() => Fect.try(out), "boom");
});

Deno.test("Fect.try resolves value for async infected carrier", async () => {
  const step = fn(async (name: string) => name.toUpperCase());
  const out = step("deno");

  const value = await Fect.try(out);
  assertEquals(value, "DENO");
});

Deno.test("Fect.try rejects for async infected error carrier", async () => {
  const step = fn(async (_n: number) => err("async boom"));
  const out = step(1);

  await assertRejects(async () => {
    await Fect.try(out);
  }, "async boom");
});
