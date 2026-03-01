import { assertEquals } from "jsr:@std/assert";
import { err, Fect, FectError, fn, match, ok } from "../mod.ts";

// ===== Tagged error match =====

class NotFound extends FectError("NotFound")<{ resource: string }>() {}
class Unauthorized extends FectError("Unauthorized")<{ userId: string }>() {}
class UnknownException
  extends FectError("UnknownException")<{ cause: unknown }>() {}

Deno.test("match works with sync carrier and exhaustive tagged err object", () => {
  const step = fn((_n: number) => NotFound.err({ resource: "repo" }));
  const input = step(1);

  const message = match(input).with({
    ok: (value) => `ok:${value}`,
    err: {
      NotFound: (e) => `missing:${e.resource}`,
    },
  });

  assertEquals(message, "missing:repo");
});

Deno.test("match works with async infected carrier", async () => {
  const flow = fn(async (name: string) => {
    if (name.length === 0) return NotFound.err({ resource: "name" });
    return name.toUpperCase();
  });

  const out = flow("deno");
  const message = await match(out).with({
    ok: (value) => `ok:${value}`,
    err: {
      PromiseRejected: () => "promise-rejected",
      UnknownException: () => "unknown-exception",
      NotFound: (e) => `missing:${e.resource}`,
    },
  });

  assertEquals(message, "ok:DENO");
});

Deno.test("match supports non-tagged errors via function err handler", () => {
  const out = err("boom");
  const message = match(out).with({
    ok: (value) => `ok:${value}`,
    err: (e) => `err:${e}`,
  });
  assertEquals(message, "err:boom");
});

Deno.test("match handles multi-error pipeline exhaustively", () => {
  const step1 = fn((s: string) => {
    if (s === "") return NotFound.err({ resource: "input" });
    return s;
  });

  const step2 = fn((s: string) => {
    if (s === "admin") return Unauthorized.err({ userId: s });
    return s.toUpperCase();
  });

  const result = step2(step1("admin"));
  const message = match(result).with({
    ok: (v) => `ok:${v}`,
    err: {
      NotFound: (e) => `missing:${e.resource}`,
      Unauthorized: (e) => `denied:${e.userId}`,
    },
  });

  assertEquals(message, "denied:admin");
});

Deno.test("partial handles selected tagged errors and keeps others", () => {
  const step = fn((s: string) => {
    if (s === "") return NotFound.err({ resource: "input" });
    if (s === "admin") return Unauthorized.err({ userId: s });
    return s.toUpperCase();
  });

  const out = Fect.partial(step("")).with({
    err: {
      NotFound: () => "guest",
    },
  });

  const message = match(out).with({
    ok: (value) => `ok:${value}`,
    err: {
      Unauthorized: (e) => `denied:${e.userId}`,
    },
  });

  assertEquals(message, "ok:guest");
});

// ===== Type-level exhaustiveness checks =====
if (false) {
  class A extends FectError("A")<{ value: number }>() {}
  class B extends FectError("B")<{ message: string }>() {}

  const step = fn((_n: number) => {
    if (Math.random() > 0.5) return A.err({ value: 1 });
    if (Math.random() > 0.5) return B.err({ message: "hi" });
    return _n;
  });

  const r = step(1);

  // All branches covered — compiles fine
  match(r).with({
    ok: () => 0,
    err: {
      A: (e) => e.value,
      B: (e) => e.message.length,
    },
  });

  match(r).with({
    ok: () => 0,
    // @ts-expect-error missing B branch must fail compile
    err: {
      A: (e: { _tag: "A"; value: number }) => e.value,
    },
  });

  match(r).with({
    ok: () => 0,
    err: {
      A: (e: { _tag: "A"; value: number }) => e.value,
      B: (e: { _tag: "B"; message: string }) => e.message.length,
      // @ts-expect-error extra branch C must fail compile
      C: (_e: never) => 0,
    },
  });

  const narrowed = Fect.partial(r).with({
    err: {
      A: () => 0,
    },
  });

  match(narrowed).with({
    ok: () => 0,
    err: {
      B: (e: { _tag: "B"; message: string }) => e.message.length,
    },
  });

  match(narrowed).with({
    ok: () => 0,
    err: {
      B: (e: { _tag: "B"; message: string }) => e.message.length,
      // @ts-expect-error handled branch A must not be present anymore
      A: (e: { _tag: "A"; value: number }) => e.value,
    },
  });
}
