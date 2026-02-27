import { isFect, type Fect, type FxShape, type TaggedError } from "./fect.ts";

type ErrorOfFx<Fx extends FxShape> = Fx extends { result: infer E } ? E : never;
type Exact<T, Shape> = T & Record<Exclude<keyof T, keyof Shape>, never>;

type ErrorHandlers<E extends TaggedError, R> = {
  [K in E["_tag"] & string]: (error: Extract<E, { _tag: K }>) => R;
};

type MatchHandlers<A, E, TOk, TErr> = [E] extends [never]
  ? { ok: (value: A) => TOk }
  : [E] extends [TaggedError] ? {
      ok: (value: A) => TOk;
      err:
        | Exact<
          ErrorHandlers<E & TaggedError, TErr>,
          ErrorHandlers<E & TaggedError, TErr>
        >
        | ((error: E) => TErr);
    }
  : {
    ok: (value: A) => TOk;
    err: (error: E) => TErr;
  };

type PlainValueHandler<T> = (value: T) => unknown;
type PlainMatchHandlers<T> = {
  [key: string]: PlainValueHandler<T>;
} & {
  unknown?: PlainValueHandler<T>;
};
type UnionOfHandlerReturns<THandlers> = {
  [K in keyof THandlers]: THandlers[K] extends (...args: any[]) => infer R ? R
    : never;
}[keyof THandlers];

type TaggedValue = { _tag: string };
type TaggedBoundValue<T> = T extends { value: infer V } ? V : T;
type TaggedValueHandlers<T extends TaggedValue, R> = {
  [K in T["_tag"] & string]: (value: TaggedBoundValue<Extract<T, { _tag: K }>>) => R;
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function dispatchFectPayload<A, E, TOk, TErr>(
  payload: { tag: "ok"; value: A } | { tag: "err"; error: E },
  handlers: {
    ok: (value: A) => TOk;
    err?: ((error: E) => TErr) | Record<string, (error: unknown) => TErr>;
  },
): TOk | TErr {
  if (payload.tag === "ok") {
    return handlers.ok(payload.value);
  }

  const maybeErr = handlers.err;
  if (typeof maybeErr === "function") {
    return maybeErr(payload.error);
  }

  if (typeof maybeErr === "object" && maybeErr !== null) {
    const byTag = maybeErr as Record<string, (e: unknown) => TErr>;
    const e = payload.error as unknown as TaggedError;
    const h = byTag[e._tag];
    if (typeof h === "function") return h(payload.error);
  }

  throw new Error("Missing error handler");
}

function literalKeyOfValue(value: unknown): string | null {
  if (value === null) return "null";
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}

function dispatchPlainValue<T, THandlers extends PlainMatchHandlers<T>>(
  value: T,
  handlers: THandlers,
): UnionOfHandlerReturns<THandlers> {
  if (
    typeof value === "object" &&
    value !== null &&
    "_tag" in (value as Record<PropertyKey, unknown>) &&
    typeof (value as { _tag?: unknown })._tag === "string"
  ) {
    const tag = (value as unknown as { _tag: string })._tag;
    const taggedHandler = handlers[tag];
    if (typeof taggedHandler === "function") {
      const bound = "value" in (value as Record<PropertyKey, unknown>)
        ? (value as unknown as { value: unknown }).value
        : value;
      return (taggedHandler as (input: unknown) => unknown)(
        bound,
      ) as UnionOfHandlerReturns<THandlers>;
    }
  }

  const literalKey = literalKeyOfValue(value);
  if (literalKey !== null) {
    const literalHandler = handlers[literalKey];
    if (typeof literalHandler === "function") {
      return literalHandler(value) as UnionOfHandlerReturns<THandlers>;
    }
  }

  const typeKey = typeof value;
  const typeHandler = handlers[typeKey];
  if (typeof typeHandler === "function") {
    return typeHandler(value) as UnionOfHandlerReturns<THandlers>;
  }

  const unknownHandler = handlers.unknown;
  if (typeof unknownHandler === "function") {
    return unknownHandler(value) as UnionOfHandlerReturns<THandlers>;
  }

  throw new Error(`Unhandled match value: ${String(value)} (${typeof value})`);
}

export function match<A, Fx extends { async: true } & FxShape>(
  input: Fect<A, Fx>,
): {
  with<TOk, TErr>(
    handlers: MatchHandlers<A, ErrorOfFx<Fx>, TOk, TErr>,
  ): Promise<TOk | TErr>;
};
export function match<A, Fx extends FxShape>(
  input: Fect<A, Fx>,
): {
  with<TOk, TErr>(
    handlers: MatchHandlers<A, ErrorOfFx<Fx>, TOk, TErr>,
  ): TOk | TErr;
};
export function match<T>(input: T): {
  with<R>(
    handlers: Exact<TaggedValueHandlers<T & TaggedValue, R>, TaggedValueHandlers<T & TaggedValue, R>>,
  ): R;
  with<THandlers extends PlainMatchHandlers<T>>(
    handlers: THandlers,
  ): UnionOfHandlerReturns<THandlers>;
};
export function match(input: unknown) {
  if (isFect(input)) {
    return {
      with<TOk, TErr>(
        handlers: {
          ok: (value: unknown) => TOk;
          err?:
            | ((error: unknown) => TErr)
            | Record<string, (error: unknown) => TErr>;
        },
      ): (TOk | TErr) | Promise<TOk | TErr> {
        const payload = input.payload as
          | { tag: "ok"; value: unknown }
          | { tag: "err"; error: unknown }
          | Promise<
            { tag: "ok"; value: unknown } | { tag: "err"; error: unknown }
          >;

        if (isPromiseLike(payload)) {
          return Promise.resolve(payload).then((resolved) =>
            dispatchFectPayload(resolved, handlers)
          );
        }

        return dispatchFectPayload(payload, handlers);
      },
    };
  }

  return {
    with<THandlers extends PlainMatchHandlers<unknown>>(
      handlers: THandlers,
    ): UnionOfHandlerReturns<THandlers> {
      return dispatchPlainValue(input, handlers);
    },
  };
}
