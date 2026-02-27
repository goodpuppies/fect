import { assertEquals, assertRejects } from "jsr:@std/assert";
import { fn, remoteValue, RemoteValue, Fect } from "../mod.ts";

Deno.test("RemoteValue resolves via fill()", async () => {
  const rv = remoteValue<number>();
  queueMicrotask(() => {
    rv.fill(42);
  });
  assertEquals(await rv.wait(), 42);
});

Deno.test("RemoteValue rejects via fail()", async () => {
  const rv = remoteValue<number>();
  queueMicrotask(() => {
    rv.fail(new Error("boom"));
  });
  await assertRejects(() => rv.wait(), Error, "boom");
});

Deno.test("RemoteValue supports timeout", async () => {
  const rv = remoteValue<number>({ timeoutMs: 5 });
  await assertRejects(
    () => rv.wait(),
    Error,
    "timed out",
  );
});

Deno.test("RemoteValue registry supports resolveById()", async () => {
  const rv = remoteValue<string>({ register: true });
  const didResolve = RemoteValue.resolveById(rv.id, "ok");
  assertEquals(didResolve, true);
  assertEquals(await rv.wait(), "ok");

  // Already settled/cleaned up.
  assertEquals(RemoteValue.resolveById(rv.id, "nope"), false);
});

Deno.test("RemoteValue composes with fn infection flow", async () => {
  const double = fn((n: number) => n * 2);
  const rv = remoteValue<number>();

  const out = double(rv);
  queueMicrotask(() => {
    rv.fill(21);
  });

  assertEquals(await Fect.try(out), 42);
});
