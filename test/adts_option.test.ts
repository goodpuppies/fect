import { assertEquals } from "jsr:@std/assert";
import { None, Some, type Option, Option as OptionNs } from "../mod.ts";

Deno.test("Option constructors and guards", () => {
  const some = Some(42);
  const none: Option<number> = None;

  assertEquals(OptionNs.isSome(some), true);
  assertEquals(OptionNs.isNone(none), true);
});

Deno.test("Option map/flatMap/getOrElse", () => {
  const doubled = OptionNs.map(Some(21), (v) => v * 2);
  const missing = OptionNs.flatMap(None as Option<number>, (v) => Some(v * 2));

  assertEquals(doubled, Some(42));
  assertEquals(missing, None);
  assertEquals(OptionNs.getOrElse(missing, () => 5), 5);
});

Deno.test("Option toResult integrates with Fect.match", () => {
  const out = OptionNs.toResult(Some("x"), () => "none");
  const msg = OptionNs.toResult(None as Option<string>, () => "none");

  const okValue = out.payload.tag === "ok" ? out.payload.value : "bad";
  const errValue = msg.payload.tag === "err" ? msg.payload.error : "bad";

  assertEquals(okValue, "x");
  assertEquals(errValue, "none");
});

