import { assertEquals } from "jsr:@std/assert";
import {
  err,
  fail,
  FectError,
  fn,
  isErr,
  isFect,
  ok,
} from "../lib/fect.ts";
import { match } from "../lib/match.ts";
import { Fect } from "../mod.ts";

// ===== Sync basics =====

Deno.test("fn returns raw value for sync plain input/output", () => {
  const check = fn((input: { thing?: { thing?: boolean } }) => {
    if (input.thing?.thing === true) return true;
    return false;
  });

  const result = check({ thing: { thing: true } });
  assertEquals(result, true);
});

Deno.test("fn supports zero-arg handlers", () => {
  const fortyTwo = fn(() => 42);
  const result = fortyTwo();
  assertEquals(result, 42);
});

Deno.test("fn short-circuits on error carrier input", () => {
  let executed = false;
  const step = fn((n: number) => {
    executed = true;
    return n + 1;
  });

  const errInput = err("blocked");
  const out = step(errInput);
  assertEquals(executed, false);
  assertEquals(isErr(out), true);
});

Deno.test("fn merges effects from input and output carriers", () => {
  const step1 = fn((s: string) => {
    if (s.length === 0) return fail("empty");
    return s.toUpperCase();
  });
  const step2 = fn((s: string) => `${s}!`);

  const result = step2(step1("hello"));
  const value = isFect(result)
    ? match(result).with({
      ok: (v) => v,
      err: (e) => `err:${e}`,
    })
    : result;
  assertEquals(value, "HELLO!");
});

// ===== Async basics =====

Deno.test("fn propagates promise input as async carrier", async () => {
  const check = fn((input: { thing?: { thing?: boolean } }) => {
    if (input.thing?.thing === true) return true;
    return false;
  });

  const result = check(Promise.resolve({ thing: { thing: true } }));
  assertEquals(isFect(result), true);

  const msg = await match(result).with({
    ok: (v) => v,
  });
  assertEquals(msg, true);
});

Deno.test("fn flattens async body return", async () => {
  const check = fn(async (input: { n: number }) => {
    return input.n + 1;
  });

  const result = check({ n: 41 });
  const value = await match(result).with({
    ok: (v) => v,
  });
  assertEquals(value, 42);
});

Deno.test("fn chains async input with async handler", async () => {
  const step1 = fn(async (n: number) => n * 2);
  const step2 = fn(async (n: number) => n + 10);

  const result = step2(step1(Promise.resolve(5)));
  const value = await match(result).with({
    ok: (v) => v,
  });
  assertEquals(value, 20);
});

Deno.test("fn short-circuits async error through pipeline", async () => {
  class Boom extends FectError("Boom")() {}

  const step1 = fn((_n: number) => Boom.err());
  const step2 = fn((n: number) => n + 10);

  const result = step2(step1(Promise.resolve(5)));
  const value = await match(result).with({
    ok: (v) => `ok:${v}`,
    err: {
      Boom: () => "boom",
    },
  });
  assertEquals(value, "boom");
});

// ===== FectError =====

Deno.test("FectError creates tagged error with fields", () => {
  class ParseError extends FectError("ParseError")<{ input: string }>() {}

  const e = ParseError.of({ input: "abc" });
  assertEquals(e._tag, "ParseError");
  assertEquals(e.input, "abc");
});

Deno.test("FectError.err() returns a Fail wrapper", () => {
  class ParseError extends FectError("ParseError")<{ input: string }>() {}

  const f = ParseError.err({ input: "abc" });
  // Fail is opaque, but fn() should handle it
  const step = fn(() => f);
  const result = step();
  assertEquals(isErr(result), true);
});

// ===== Fect facade =====

Deno.test("Fect facade supports fn/ok/match flow", () => {
  const step = Fect.fn((n: number) => n + 1);
  const out = step(41);

  const discharged = Fect.match(out).with({
    42: (v) => v,
  });

  assertEquals(discharged, 42);
});
