import {
  forceFectLazy,
  type FectLazy,
  isFect,
  isFectLazy,
  type Fect,
  type FxShape,
  makeCore,
  makeCoreAsync,
  type Simplify,
  type TaggedError,
} from "./fect.ts";

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

type PartialErrorHandlers<E extends TaggedError, A> = Partial<{
  [K in E["_tag"] & string]: (error: Extract<E, { _tag: K }>) => A;
}>;

type UnhandledErrors<E, THandled extends Partial<Record<string, unknown>>> =
  E extends TaggedError ? E extends { _tag: infer TTag extends string }
    ? TTag extends keyof THandled & string ? never : E
    : E
    : E;

type ReplaceFxResult<Fx extends FxShape, E> = [E] extends [never]
  ? Simplify<Omit<Fx, "result">>
  : Simplify<Omit<Fx, "result"> & { result: E }>;

type PartialFx<
  Fx extends FxShape,
  THandled extends Partial<Record<string, unknown>>,
> = ReplaceFxResult<Fx, UnhandledErrors<ErrorOfFx<Fx>, THandled>>;

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

function partiallyHandlePayload<A>(
  payload: { tag: "ok"; value: A } | { tag: "err"; error: unknown },
  handlers: Record<string, (error: unknown) => A>,
): { tag: "ok"; value: A } | { tag: "err"; error: unknown } {
  if (payload.tag === "ok") return payload;

  const maybeError = payload.error;
  if (
    typeof maybeError === "object" &&
    maybeError !== null &&
    "_tag" in (maybeError as Record<PropertyKey, unknown>) &&
    typeof (maybeError as { _tag?: unknown })._tag === "string"
  ) {
    const tag = (maybeError as { _tag: string })._tag;
    const handler = handlers[tag];
    if (typeof handler === "function") {
      return { tag: "ok", value: handler(payload.error) };
    }
  }

  return payload;
}

export function match<A, Fx extends { async: true } & FxShape>(
  input: Fect<A, Fx> | FectLazy<Fect<A, Fx>>,
): {
  with<TOk, TErr>(
    handlers: MatchHandlers<A, ErrorOfFx<Fx>, TOk, TErr>,
  ): Promise<TOk | TErr>;
};
export function match<A, Fx extends FxShape>(
  input: Fect<A, Fx> | FectLazy<Fect<A, Fx>>,
): {
  with<TOk, TErr>(
    handlers: MatchHandlers<A, ErrorOfFx<Fx>, TOk, TErr>,
  ): TOk | TErr;
};
export function match<T>(input: T | FectLazy<T>): {
  with<R>(
    handlers: Exact<TaggedValueHandlers<T & TaggedValue, R>, TaggedValueHandlers<T & TaggedValue, R>>,
  ): R;
  with<THandlers extends PlainMatchHandlers<T>>(
    handlers: THandlers,
  ): UnionOfHandlerReturns<THandlers>;
};
export function match(input: unknown) {
  const resolvedInput = isFectLazy(input) ? forceFectLazy(input) : input;

  if (isFect(resolvedInput)) {
    return {
      with<TOk, TErr>(
        handlers: {
          ok: (value: unknown) => TOk;
          err?:
            | ((error: unknown) => TErr)
            | Record<string, (error: unknown) => TErr>;
        },
      ): (TOk | TErr) | Promise<TOk | TErr> {
        const payload = resolvedInput.payload as
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
      return dispatchPlainValue(resolvedInput, handlers);
    },
  };
}

export function partial<A, Fx extends FxShape>(
  input: Fect<A, Fx> | FectLazy<Fect<A, Fx>>,
): {
  with<
    THandled extends PartialErrorHandlers<ErrorOfFx<Fx> & TaggedError, A>,
  >(
    handlers: {
      err: THandled;
    },
  ): Fect<A, PartialFx<Fx, THandled>>;
};
export function partial<A, Fx extends FxShape>(
  input: Fect<A, Fx> | FectLazy<Fect<A, Fx>>,
) {
  const resolvedInput = isFectLazy(input) ? forceFectLazy(input) : input;

  return {
    with(handlers: { err: Record<string, (error: unknown) => A> }) {
      const errHandlers = handlers.err as Record<string, (error: unknown) => A>;
      const payload = resolvedInput.payload as
        | { tag: "ok"; value: A }
        | { tag: "err"; error: unknown }
        | Promise<{ tag: "ok"; value: A } | { tag: "err"; error: unknown }>;

      if (isPromiseLike(payload)) {
        return makeCoreAsync(
          Promise.resolve(payload).then((resolved) =>
            partiallyHandlePayload(resolved, errHandlers)
          ),
          resolvedInput.fx,
        ) as unknown as Fect<A, PartialFx<Fx, typeof handlers.err>>;
      }

      return makeCore(
        partiallyHandlePayload(payload, errHandlers) as unknown as {
          tag: "ok";
          value: A;
        } | { tag: "err"; error: ErrorOfFx<Fx> },
        resolvedInput.fx,
      ) as unknown as Fect<A, PartialFx<Fx, typeof handlers.err>>;
    },
  };
}
