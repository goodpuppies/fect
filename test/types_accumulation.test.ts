import { assertEquals } from "jsr:@std/assert";
import { Fect, FectError, fn, match } from "../mod.ts";

Deno.test("type accumulation compile suite loads", () => {
  assertEquals(1, 1);
});

if (false) {
  class A extends FectError("A")() {}
  class B extends FectError("B")<{ reason: string }>() {}
  class C extends FectError("C")<{ code: number }>() {}

  const step1 = fn((input: string) => {
    if (input.length === 0) return A.err();
    return input;
  });

  const step2 = fn((input: string) => {
    if (input === "b") return B.err({ reason: "blocked" });
    return `${input}!`;
  });

  const step3 = fn(async (input: string) => {
    if (input === "c!") return C.err({ code: 500 });
    return input.length;
  });

  const out = step3(step2(step1("x")));

  match(out).with({
    ok: (value) => value,
    err: {
      PromiseRejected: () => 0,
      UnknownException: () => 0,
      A: () => 1,
      B: (e) => e.reason.length,
      C: (e) => e.code,
    },
  });

  match(out).with({
    ok: (value) => value,
    // @ts-expect-error missing C branch must fail compile
    err: {
      PromiseRejected: () => 0,
      UnknownException: () => 0,
      A: () => 1,
      B: (e: { _tag: "B"; reason: string }) => e.reason.length,
    },
  });

  match(out).with({
    ok: (value) => value,
    err: {
      PromiseRejected: () => 0,
      UnknownException: () => 0,
      A: () => 1,
      B: (e: { _tag: "B"; reason: string }) => e.reason.length,
      C: (e: { _tag: "C"; code: number }) => e.code,
      // @ts-expect-error extra D branch must fail compile
      D: () => 0,
    },
  });

  const narrowedA = Fect.partial(out).with({
    err: {
      A: () => 1,
    },
  });

  const narrowedAC = Fect.partial(narrowedA).with({
    err: {
      C: () => 3,
    },
  });

  match(narrowedAC).with({
    ok: (value) => value,
    err: {
      PromiseRejected: () => 0,
      UnknownException: () => 0,
      B: (e: { _tag: "B"; reason: string }) => e.reason.length,
    },
  });

  match(narrowedAC).with({
    ok: (value) => value,
    err: {
      PromiseRejected: () => 0,
      UnknownException: () => 0,
      B: (e: { _tag: "B"; reason: string }) => e.reason.length,
      // @ts-expect-error handled A branch must not be present anymore
      A: () => 0,
    },
  });

  match(narrowedAC).with({
    ok: (value) => value,
    err: {
      PromiseRejected: () => 0,
      UnknownException: () => 0,
      B: (e: { _tag: "B"; reason: string }) => e.reason.length,
      // @ts-expect-error handled C branch must not be present anymore
      C: () => 0,
    },
  });

  Fect.partial(out).with({
    err: {
      // @ts-expect-error unknown tag key must fail compile
      D: () => 0,
    },
  });

  const sum12 = fn((
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number,
    i: number,
    j: number,
    k: number,
    l: number,
  ) => a + b + c + d + e + f + g + h + i + j + k + l);

  const out12 = sum12(
    Fect.ok(1),
    2,
    Promise.resolve(3),
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
  );

  match(out12).with({
    ok: (v) => v,
    err: {
      PromiseRejected: () => 0,
      UnknownException: () => 0,
    },
  });

  match(out12).with({
    ok: (v) => v,
    // @ts-expect-error UnknownException branch must be required
    err: {
      PromiseRejected: () => 0,
    },
  });
}
