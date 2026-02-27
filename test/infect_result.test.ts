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

// ===== Result-style error flow using FectError + fail =====

Deno.test("fn returns raw success for plain sync call", () => {
  const add1 = fn((n: number) => n + 1);
  const out = add1(41);
  assertEquals(out, 42);
});

Deno.test("fn + fail() produces error carrier", () => {
  class ParseFailed extends FectError("ParseFailed")<{ input: string }>() {}

  const parse = fn((s: string) => {
    const n = Number(s);
    if (Number.isNaN(n)) return ParseFailed.err({ input: s });
    return n;
  });

  const out = parse("not-a-number");
  assertEquals(isErr(out), true);
});

Deno.test("fn short-circuits when input is error carrier", () => {
  let executed = false;
  const step = fn((n: number) => {
    executed = true;
    return n + 10;
  });

  const input = err("blocked");
  const out = step(input);

  assertEquals(executed, false);
  assertEquals(isErr(out), true);
});

Deno.test("fn chains in happy path and preserves error", () => {
  class ParseFailed extends FectError("ParseFailed")() {}
  class DivByZero extends FectError("DivByZero")() {}

  const parseIntSafe = fn((s: string) => {
    const n = Number(s);
    if (Number.isNaN(n)) return ParseFailed.err();
    return n;
  });

  const reciprocal = fn((n: number) => {
    if (n === 0) return DivByZero.err();
    return 1 / n;
  });

  const good = reciprocal(parseIntSafe("4"));
  const goodValue = isFect(good)
    ? match(good).with({
      ok: (v) => v,
      err: {
        ParseFailed: () => -1,
        DivByZero: () => -1,
      },
    })
    : good;
  assertEquals(goodValue, 0.25);

  const bad = reciprocal(parseIntSafe("x"));
  assertEquals(isErr(bad), true);
});

Deno.test("match discharges ok carrier via ok handler", () => {
  const step = fn((n: number) => n + 1);
  const out = step(41);

  const discharged = match(out).with({
    number: (value) => value + 1,
  });
  assertEquals(discharged, 43);
});

Deno.test("match discharges error carrier via tagged err handlers", () => {
  class ParseFailed extends FectError("ParseFailed")<{ input: string }>() {}

  const parse = fn((s: string) => {
    const n = Number(s);
    if (Number.isNaN(n)) return ParseFailed.err({ input: s });
    return n;
  });

  const out = parse("x");
  const discharged = match(out).with({
    ok: (_value) => "unreachable",
    err: {
      ParseFailed: (e) => `handled:${e.input}`,
    },
  });
  assertEquals(discharged, "handled:x");
});

Deno.test("fn result mode supports zero-arg handlers", () => {
  const seven = fn(() => 7);
  const out = seven();
  assertEquals(out, 7);
});

Deno.test("plain fn supports ok/err carrier flow", () => {
  class E1 extends FectError("E1")() {}

  const func1 = fn(() => {
    if (Math.random() < 0) return E1.err(); // never in practice
    return 10;
  });

  const func2 = fn((x: number) => x * 3);

  const out = func2(func1());
  const value = isFect(out)
    ? match(out).with({
      ok: (v) => v,
      err: {
        E1: () => -1,
      },
    })
    : out;
  assertEquals(value, 30);
});

Deno.test("plain fn short-circuits error carrier input", () => {
  let executed = false;
  const step = fn((n: number) => {
    executed = true;
    return n + 1;
  });

  const out = step(err("blocked"));
  assertEquals(executed, false);
  assertEquals(isErr(out), true);
});
