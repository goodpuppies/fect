import { assertEquals } from "jsr:@std/assert";
import { Fect, FectError, if_, match, ok } from "../mod.ts";

Deno.test("ifElse works as expression for plain boolean", () => {
  const out = if_(true, () => 1, () => 2);
  assertEquals(out, 1);
});

Deno.test("ifElse supports then/else builder syntax", () => {
  const out = Fect.if(true).then("a").else("b");
  assertEquals(out, "a");
});

Deno.test("ifElse supports with({ then, else }) syntax", () => {
  const out = Fect.if(false).with({
    then: 10,
    else: 20,
  });
  assertEquals(out, 20);
});

Deno.test("ifElse composes with infected boolean", () => {
  const out = Fect.if(ok(false)).then("yes").else("no");
  const value = match(out).with({
    ok: (v) => v,
  });
  assertEquals(value, "no");
});

Deno.test("ifElse supports explicit deferred branch values", () => {
  const out = Fect.if(false).then(1).else(Fect.defer(() => 2));
  assertEquals(out, 2);
});

Deno.test("ifElse propagates branch error via fail wrapper", () => {
  class Nope extends FectError("Nope")() {}
  const out = Fect.if(ok(true), () => Nope.err(), () => 123);
  const value = match(out).with({
    ok: () => "ok",
    err: {
      Nope: () => "nope",
    },
  });
  assertEquals(value, "nope");
});
