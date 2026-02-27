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

Deno.test("fn supports multiple plain args and returns raw", () => {
  const add = fn((a: number, b: number) => a + b);
  const out = add(1, 2);
  assertEquals(out, 3);
});

Deno.test("fn supports multiple infected args", () => {
  const add = fn((a: number, b: number) => a + b);
  const out = add(ok(1), ok(2));

  const value = match(out).with({
    ok: (v) => v,
  });
  assertEquals(value, 3);
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
    err: {
      PromiseRejected: () => false,
      UnknownException: () => false,
    },
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
    err: {
      PromiseRejected: () => -1,
      UnknownException: () => -1,
    },
  });
  assertEquals(value, 42);
});

Deno.test("fn chains async input with async handler", async () => {
  const step1 = fn(async (n: number) => n * 2);
  const step2 = fn(async (n: number) => n + 10);

  const result = step2(step1(Promise.resolve(5)));
  const value = await match(result).with({
    ok: (v) => v,
    err: {
      PromiseRejected: () => -1,
      UnknownException: () => -1,
    },
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
      PromiseRejected: () => "promise-rejected",
      UnknownException: () => "unknown-exception",
      Boom: () => "boom",
    },
  });
  assertEquals(value, "boom");
});

Deno.test("fn maps async rejection to PromiseRejected by default", async () => {
  const step = fn(async (_n: number) => {
    throw new Error("boom");
  });

  const out = step(1);
  const value = await match(out).with({
    ok: () => "ok",
    err: {
      PromiseRejected: (e) =>
        e.cause instanceof Error ? e.cause.message : "unknown",
      UnknownException: () => "unknown",
    },
  });
  assertEquals(value, "boom");
});

Deno.test("fn supports custom mapDefect for async rejection", async () => {
  class UnknownException
    extends FectError("UnknownException")<{ cause: unknown }>() {}

  const step = fn(
    async (_n: number) => {
      throw "boom";
    },
    {
      mapDefect: (cause) => UnknownException.of({ cause }),
    },
  );

  const out = step(1);
  const value = await match(out).with({
    ok: () => "ok",
    err: {
      UnknownException: (e) => String(e.cause),
    },
  });
  assertEquals(value, "boom");
});

Deno.test("fn maps rejected promise input to defect channel", async () => {
  const step = fn((n: number) => n + 1);

  const out = step(Promise.reject(new Error("input failed")));
  const value = await match(out).with({
    ok: () => "ok",
    err: {
      PromiseRejected: (e) =>
        e.cause instanceof Error ? e.cause.message : "unknown",
      UnknownException: () => "unknown",
    },
  });

  assertEquals(value, "input failed");
});

Deno.test("fn maps thrown exception in infected flow to UnknownException", async () => {
  const step = fn((_: number) => {
    throw new Error("thrown");
  });

  const out = step(Promise.resolve(1));
  const value = await match(out).with({
    ok: () => "ok",
    err: {
      PromiseRejected: () => "promise-rejected",
      UnknownException: (e) =>
        e.cause instanceof Error ? e.cause.message : "unknown",
    },
  });

  assertEquals(value, "thrown");
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
