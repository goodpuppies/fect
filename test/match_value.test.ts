import { assertEquals, assertThrows } from "jsr:@std/assert";
import { match } from "../mod.ts";

Deno.test("match(value) handles literal string key", () => {
  const result = match("hello").with({
    hello: () => "ok",
    unknown: () => "unknown",
  });
  assertEquals(result, "ok");
});

Deno.test("match(value) handles literal number key", () => {
  const result = match(42).with({
    42: () => "answer",
    unknown: () => "unknown",
  });
  assertEquals(result, "answer");
});

Deno.test("match(value) handles literal boolean/null/undefined keys", () => {
  const yes = match(true).with({
    true: () => "yes",
    unknown: () => "unknown",
  });
  const nil = match(null).with({
    null: () => "nil",
    unknown: () => "unknown",
  });
  const missing = match(undefined).with({
    undefined: () => "missing",
    unknown: () => "unknown",
  });

  assertEquals(yes, "yes");
  assertEquals(nil, "nil");
  assertEquals(missing, "missing");
});

Deno.test("match(value) prioritizes literal handler over typeof", () => {
  const result = match("42").with({
    string: () => "type",
    "42": () => "literal",
    unknown: () => "unknown",
  });
  assertEquals(result, "literal");
});

Deno.test("match(value) falls back to unknown handler", () => {
  const result = match(Symbol("x")).with({
    string: () => "string",
    unknown: () => "fallback",
  });
  assertEquals(result, "fallback");
});

Deno.test("match(value) throws when no handler matches and unknown is missing", () => {
  assertThrows(
    () =>
      match({ n: 1 }).with({
        string: () => "string",
      }),
    Error,
    "Unhandled match value",
  );
});

Deno.test("match(value) supports union-like literal branching", () => {
  type UserType = "admin" | "user";
  const getRoleMessage = (userType: UserType): string =>
    match(userType).with({
      admin: () => "Welcome, Administrator!",
      user: () => "Hello, User!",
    });

  assertEquals(getRoleMessage("admin"), "Welcome, Administrator!");
  assertEquals(getRoleMessage("user"), "Hello, User!");
});
