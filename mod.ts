export * from "./lib/fect.ts";
export * from "./lib/match.ts";
export * from "./lib/remotevalue.ts";
export * from "./lib/adts.ts";
export * from "./lib/list.ts";

import {
  err,
  fail,
  forceFectLazy,
  type Fect as FectValue,
  type FectLazy,
  FectError,
  fn,
  type FxShape,
  get,
  isErr,
  isFect,
  isFectLazy,
  isOk,
  lazy,
  ok,
  props,
  raise,
} from "./lib/fect.ts";
import { match, partial } from "./lib/match.ts";
import { isRemoteValue, RemoteValue, remoteValue } from "./lib/remotevalue.ts";
import * as Option from "./lib/adts.ts";
import * as List from "./lib/list.ts";

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function tryFect<A, Fx extends { async: true } & FxShape>(
  input: FectValue<A, Fx> | FectLazy<FectValue<A, Fx>> | A | FectLazy<A>,
): Promise<A>;
function tryFect<A, Fx extends FxShape>(
  input: FectValue<A, Fx> | FectLazy<FectValue<A, Fx>> | A | FectLazy<A>,
): A;
function tryFect<A, Fx extends FxShape>(
  input: FectValue<A, Fx> | FectLazy<FectValue<A, Fx>> | A | FectLazy<A>,
): A | Promise<A> {
  const resolvedInput = isFectLazy(input)
    ? forceFectLazy(input as FectLazy<unknown>)
    : input;
  if (!isFect(resolvedInput)) {
    return resolvedInput as A;
  }
  const payload = resolvedInput.payload as
    | { tag: "ok"; value: A }
    | { tag: "err"; error: unknown }
    | Promise<{ tag: "ok"; value: A } | { tag: "err"; error: unknown }>;

  if (isPromiseLike(payload)) {
    return Promise.resolve(payload).then((resolved) => {
      if (resolved.tag === "err") throw resolved.error;
      return resolved.value;
    });
  }

  if (payload.tag === "err") throw payload.error;
  return payload.value;
}

/**
 * Effect-style facade over the same primitives, for users who prefer
 * namespaced APIs like `Fect.fn(...)` and `Fect.ok(...)`.
 */
export const Fect = {
  fn,
  lazy,
  ok,
  err,
  fail,
  error: FectError,
  taggedError: FectError,
  FectError,
  raise,
  get,
  props,
  match,
  partial,
  try: tryFect,
  isOk,
  isErr,
  isFect,
  isFectLazy,
  RemoteValue,
  remoteValue,
  isRemoteValue,
  Option,
  List,
} as const;
