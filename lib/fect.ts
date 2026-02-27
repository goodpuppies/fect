// lib/infect.ts — rewritten from fect_proto_effect_view_v7 prototype.
//
// Design:
// - ONE carrier type: Fect<A, Fx>. Async is tracked as { async: true } in Fx,
//   just like errors are tracked as { result: E }. Both are infections.
// - The carrier is always a plain object, never PromiseLike. When a handler
//   returns a Promise, the payload stored inside the carrier is actually a
//   Promise<Payload> at runtime (a deliberate type-level "lie").
// - `fn(handler)` wraps a function so it auto-unwraps carriers, short-circuits
//   on errors, chains promises, and merges effect metadata through the pipeline.
// - `FectError("Tag")<Fields>()` gives you one-line class-based error
//   declarations whose names survive hover/inference.
// - `fail(error)` is the in-handler escape hatch; `err(error)` builds a full
//   carrier directly.
// - `match(fect).with({ ok, err })` discharges a carrier. For async carriers
//   it returns a Promise. No manual unwrapping needed — JS auto-flattens.

// ===== Utility types =====

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Shape of the effects map carried inside a `Fect`. */
export type FxShape = Record<string, unknown>;

/** Any error value that carries a discriminant `_tag`. */
export type TaggedError = { _tag: string };

/** Pull the error type out of an Fx record's `result` slot. */
type ErrorOfFx<Fx extends FxShape> = Fx extends { result: infer E } ? E : never;

/** Collect all keys across every member of a union. */
type KeysOfUnion<T> = T extends unknown ? keyof T : never;

/** Flatten a union-of-records into a single record. */
type NormalizeFx<Fx extends FxShape> = Simplify<
  {
    [K in KeysOfUnion<Fx>]: Fx extends Record<K, infer V> ? V : never;
  }
>;

/** Extract the value at key K from whichever union member has it. */
type ValueAt<Fx, K extends PropertyKey> = Fx extends Record<K, infer V> ? V
  : never;

/** Merge two Fx records, unioning the value types at each key. */
type MergeFx<A extends FxShape, B extends FxShape> = NormalizeFx<
  {
    [K in KeysOfUnion<A> | KeysOfUnion<B>]: ValueAt<A, K> | ValueAt<B, K>;
  }
>;

// ===== Async type utilities =====

/** True when T is a Promise (used to inject `{ async: true }` into Fx). */
type IsPromise<T> = T extends Promise<any> ? true : false;

// ===== Symbols =====

const FECT = Symbol("fect");
const FECT_TYPE = Symbol("fect_type");
const FAIL = Symbol("fect_fail");

// ===== Payload & core types =====

type Payload<A, E> =
  | { tag: "ok"; value: A }
  | { tag: "err"; error: E };

export interface Fect<A, Fx extends FxShape = {}> {
  readonly [FECT]: true;
  readonly [FECT_TYPE]: { readonly _fx: Fx };
  readonly payload: Payload<A, ErrorOfFx<Fx>>;
  readonly fx: Fx;
}

/**
 * A lightweight wrapper returned by `fail()` inside an `fn` handler.
 * It tells the runtime "this is an error" without allocating a full carrier.
 */
export type Fail<E> = {
  readonly [FAIL]: true;
  readonly error: E;
};

// ===== Type-level plumbing =====

type ToFect<T> = T extends Fect<infer A, infer Fx extends FxShape> ? Fect<A, Fx>
  : Fect<T, {}>;

/** Map a handler's raw return type to a Fect. Unwraps Promise (async tag added separately). */
type ToFectOut<T> = T extends Promise<infer U> ? ToFectOut<U>
  : T extends Fail<infer E> ? Fect<never, { result: E }>
  : ToFect<T>;

type FectA<T> = T extends Fect<infer A, infer _Fx extends FxShape> ? A
  : never;

type FectFx<T> = T extends Fect<any, infer Fx extends FxShape> ? Fx : {};

/** Internal: compute the raw return type. */
type FnReturn_<TIn, TOut> = Fect<
  FectA<ToFectOut<TOut>>,
  MergeFx<
    FectFx<ToFect<TIn>>,
    IsPromise<TOut> extends true
      ? MergeFx<FectFx<ToFectOut<TOut>>, { async: true }>
      : FectFx<ToFectOut<TOut>>
  >
>;

/** Force TS to resolve the alias so hovers show `Fect<A, Fx>` not `FnReturn<…>`. */
type FnReturn<TIn, TOut> = FnReturn_<TIn, TOut> extends
  Fect<infer A, infer Fx extends FxShape> ? Fect<A, Fx> : never;

type HasInfectedOut<T> = [Extract<T, PromiseLike<any> | Fail<any> | Fect<any, any>>] extends
  [never] ? false
  : true;

type FnMaybeRawReturn<TIn, TOut> = HasInfectedOut<TOut> extends true
  ? FnReturn<TIn, TOut>
  : TOut;

// ===== Runtime helpers =====

function makeCore<A, Fx extends FxShape>(
  payload: Payload<A, ErrorOfFx<Fx>>,
  fx: Fx,
): Fect<A, Fx> {
  return {
    [FECT]: true,
    [FECT_TYPE]: undefined as unknown as { readonly _fx: Fx },
    payload,
    fx,
  };
}

/**
 * Build a carrier whose payload is actually a Promise at runtime.
 * The type system sees a resolved Payload — this is a deliberate lie that
 * lets async be just another Fx infection rather than a separate carrier type.
 */
function makeCoreAsync<A, Fx extends FxShape>(
  payload: Promise<Payload<any, any>>,
  fx: Fx,
): Fect<A, Fx> {
  return {
    [FECT]: true,
    [FECT_TYPE]: undefined as unknown as { readonly _fx: Fx },
    payload: payload as unknown as Payload<A, ErrorOfFx<Fx>>,
    fx,
  };
}

/** Runtime check: is this value a `Fect` carrier? */
export function isFect(value: unknown): value is Fect<unknown, FxShape> {
  return (
    typeof value === "object" &&
    value !== null &&
    FECT in (value as Record<PropertyKey, unknown>)
  );
}

/** Runtime check: is this value a `Fail` wrapper? */
function isFail(value: unknown): value is Fail<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    FAIL in (value as Record<PropertyKey, unknown>)
  );
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).then === "function"
  );
}

function mergeFxRuntime(a: FxShape, b: FxShape): FxShape {
  return { ...a, ...b };
}

/**
 * Convert a raw handler return value into a Payload (or PromiseLike<Payload>).
 * Used inside `.then()` chains where JS auto-flattens nested promises.
 */
function settleToPayload(
  raw: unknown,
): Payload<unknown, unknown> | PromiseLike<Payload<unknown, unknown>> {
  if (isFail(raw)) return { tag: "err", error: raw.error };
  if (isFect(raw)) return raw.payload; // may itself be a Promise; .then() flattens
  return { tag: "ok", value: raw };
}

// ===== Public constructors =====

/** Wrap a plain value in a success carrier. */
export function ok<A>(value: A): Fect<A, {}> {
  return makeCore({ tag: "ok", value }, {});
}

/** Build an error carrier directly. */
export function err<E>(error: E): Fect<never, { result: E }> {
  return makeCore({ tag: "err", error }, { result: error });
}

/**
 * Build a `Fail` wrapper for use *inside* an `fn` handler.
 * The runtime converts it into a full error carrier automatically.
 */
export function fail<E>(error: E): Fail<E> {
  return { [FAIL]: true, error };
}

/**
 * Is the carrier in the ok state?
 * Only meaningful on sync carriers — use `match` for async.
 */
export function isOk<A, Fx extends FxShape>(
  fect: Fect<A, Fx>,
): fect is Fect<A, Fx> & { payload: { tag: "ok"; value: A } } {
  return fect.payload.tag === "ok";
}

/**
 * Is the carrier in the error state?
 * Only meaningful on sync carriers — use `match` for async.
 */
export function isErr<A, Fx extends FxShape>(
  fect: Fect<A, Fx>,
): fect is Fect<A, Fx> & { payload: { tag: "err" } } {
  return fect.payload.tag === "err";
}

// ===== FectError: class-based tagged error declarations =====

type FieldsArg<TFields extends object> = [keyof TFields] extends [never]
  ? [] | [TFields]
  : [TFields];

/**
 * The base class returned by `FectError("Tag")<Fields>()`.
 * Sub-classes inherit `_tag`, `.of()`, and `.err()`.
 */
export type FectErrorClass<Tag extends string, Fields extends object> = {
  /** Construct an error instance. */
  new (...args: FieldsArg<Fields>): { readonly _tag: Tag } & Readonly<Fields>;
  /** Construct an error instance (alternative to `new`). */
  of<C extends new (...a: any) => any>(
    this: C,
    ...args: FieldsArg<Fields>
  ): InstanceType<C>;
  /** Construct and wrap in `Fail` for use inside `fn` handlers. */
  err<C extends new (...a: any) => any>(
    this: C,
    ...args: FieldsArg<Fields>
  ): Fail<InstanceType<C>>;
  /** The tag literal. */
  readonly _tag: Tag;
};

/**
 * Declare a tagged error class in one line:
 *
 * ```ts
 * class InputEmpty extends FectError("InputEmpty")() {}
 * class ParseError extends FectError("ParseError")<{ input: string }>() {}
 * ```
 *
 * Then use `ParseError.err({ input })` inside `fn` handlers.
 */
export function FectError<const Tag extends string>(tag: Tag) {
  return <Fields extends object = {}>(): FectErrorClass<Tag, Fields> => {
    class TaggedBase {
      static readonly _tag = tag;
      readonly _tag = tag;

      constructor(...args: any[]) {
        const fields = args[0];
        if (fields) Object.assign(this, fields);
      }

      static of(this: any, ...args: any[]): any {
        return new this(...args);
      }

      static err(this: any, ...args: any[]): any {
        return fail(new this(...args));
      }
    }
    return TaggedBase as any;
  };
}

// ===== fn =====

/**
 * Wrap a handler so it participates in the infection pipeline.
 *
 * - Accepts plain values, `Fect` carriers, or `PromiseLike` values.
 * - Auto-short-circuits on error carriers.
 * - Chains through async payloads transparently.
 * - Merges effect metadata from input and output.
 * - `Fail` returns (via `SomeError.err(...)`) are converted to error carriers.
 */
export function fn<H extends () => unknown>(
  handler: H,
): () => FnMaybeRawReturn<{}, ReturnType<H>>;
export function fn<H extends (input: any) => unknown>(handler: H): {
  (input: Parameters<H>[0]): FnMaybeRawReturn<Parameters<H>[0], ReturnType<H>>;
  <FxIn extends FxShape>(
    input: Fect<Parameters<H>[0], FxIn>,
  ): FnReturn<Fect<Parameters<H>[0], FxIn>, ReturnType<H>>;
  (input: PromiseLike<Parameters<H>[0]>): FnReturn<
    Fect<Parameters<H>[0], { async: true }>,
    ReturnType<H>
  >;
};
export function fn(handler: ((input: unknown) => unknown) | (() => unknown)) {
  // ── Zero-arg handler ──
  if (handler.length === 0) {
    return () => {
      const outRaw = (handler as () => unknown)();

      if (isPromiseLike(outRaw)) {
        const asyncPayload = Promise.resolve(outRaw).then(settleToPayload);
        return makeCoreAsync(
          asyncPayload as Promise<Payload<unknown, unknown>>,
          {},
        );
      }

      if (isFail(outRaw)) return err(outRaw.error);
      return outRaw;
    };
  }

  // ── With-arg handler ──
  return (input: unknown) => {
    // Plain input path: keep plain outputs plain.
    if (!isFect(input) && !isPromiseLike(input)) {
      const outRaw = (handler as (i: unknown) => unknown)(input);

      if (isPromiseLike(outRaw)) {
        const asyncPayload = Promise.resolve(outRaw).then(settleToPayload);
        return makeCoreAsync(
          asyncPayload as Promise<Payload<unknown, unknown>>,
          {},
        );
      }

      if (isFail(outRaw)) return err(outRaw.error);
      return outRaw;
    }

    // Infected input path: always stay in carrier space.
    const inCore: Fect<unknown, FxShape> = isFect(input)
      ? input
      : makeCoreAsync(
        Promise.resolve(input).then((v) => ({ tag: "ok" as const, value: v })),
        {},
      );

    const inPayload = inCore.payload;

    // ── Async input (payload is actually a Promise at runtime) ──
    if (isPromiseLike(inPayload)) {
      const asyncPayload = (
        inPayload as unknown as Promise<Payload<unknown, unknown>>
      ).then((resolved) => {
        if (resolved.tag === "err") return resolved; // short-circuit
        const outRaw = (handler as (i: unknown) => unknown)(resolved.value);
        if (isPromiseLike(outRaw)) {
          return Promise.resolve(outRaw).then(settleToPayload);
        }
        return settleToPayload(outRaw);
      });

      return makeCoreAsync(
        asyncPayload as Promise<Payload<unknown, unknown>>,
        inCore.fx,
      );
    }

    // ── Sync input ──
    if (inPayload.tag === "err") return inCore; // short-circuit

    const outRaw = (handler as (i: unknown) => unknown)(inPayload.value);

    // Async output from sync input
    if (isPromiseLike(outRaw)) {
      const asyncPayload = Promise.resolve(outRaw).then(settleToPayload);
      return makeCoreAsync(
        asyncPayload as Promise<Payload<unknown, unknown>>,
        inCore.fx,
      );
    }

    // Fully sync path
    if (isFail(outRaw)) {
      const outCore = err(outRaw.error);
      // deno-lint-ignore no-explicit-any
      return makeCore(
        outCore.payload as any,
        mergeFxRuntime(inCore.fx, outCore.fx),
      );
    }
    if (isFect(outRaw)) {
      // deno-lint-ignore no-explicit-any
      return makeCore(
        outRaw.payload as any,
        mergeFxRuntime(inCore.fx, outRaw.fx),
      );
    }
    // deno-lint-ignore no-explicit-any
    return makeCore({ tag: "ok", value: outRaw } as any, inCore.fx);
  };
}

