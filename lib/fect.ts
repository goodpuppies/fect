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

import { fn } from "./fn.ts";

// ===== Utility types =====

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Shape of the effects map carried inside a `Fect`. */
export type FxShape = Record<string, unknown>;

/** Any error value that carries a discriminant `_tag`. */
export type TaggedError = { _tag: string };

/** Default defect tag used when async work rejects without custom mapping. */
export type PromiseRejected = { _tag: "PromiseRejected"; cause: unknown };
/** Default defect tag used when handler execution throws in infected flows. */
export type UnknownException = { _tag: "UnknownException"; cause: unknown };

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
const FECT_LAZY = Symbol("fect_lazy");

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

/** Lazy wrapper used to defer evaluation in the infection pipeline. */
export type FectLazy<T> = {
  readonly [FECT_LAZY]: true;
  force: () => T;
};

type LazyArg<T> = T | FectLazy<T>;
type LazyArgs<TArgs extends unknown[]> = {
  [K in keyof TArgs]: LazyArg<TArgs[K]>;
};

// ===== Type-level plumbing =====

type ToFect<T> = T extends Fect<infer A, infer Fx extends FxShape> ? Fect<A, Fx>
  : Fect<T, {}>;

/** Map a handler's raw return type to a Fect. Unwraps Promise (async tag added separately). */
type ToFectOut<T> = T extends Promise<infer U> ? ToFectOut<U>
  : T extends FectLazy<infer U> ? ToFectOut<U>
  : T extends Fail<infer E> ? Fect<never, { result: E }>
  : ToFect<T>;

type FectA<T> = T extends Fect<infer A, infer _Fx extends FxShape> ? A
  : never;

type FectFx<T> = T extends Fect<any, infer Fx extends FxShape> ? Fx : {};

type DefectFx<D> = D extends never ? {} : { result: D };

/** Internal: compute the raw return type. */
type FnReturn_<TIn, TOut, D> = Fect<
  FectA<ToFectOut<TOut>>,
  MergeFx<
    FectFx<ToFect<TIn>>,
    IsPromise<TOut> extends true
      ? MergeFx<MergeFx<FectFx<ToFectOut<TOut>>, { async: true }>, DefectFx<D>>
      : FectFx<ToFectOut<TOut>>
  >
>;

/** Force TS to resolve the alias so hovers show `Fect<A, Fx>` not `FnReturn<…>`. */
export type FnReturn<TIn, TOut, D = never> = FnReturn_<TIn, TOut, D> extends
  Fect<infer A, infer Fx extends FxShape> ? Fect<A, Fx> : never;

type HasInfectedOut<T> =
  [Extract<T, PromiseLike<any> | Fail<any> | Fect<any, any> | FectLazy<any>>] extends [never]
    ? false
    : true;

export type FnMaybeRawReturn<TIn, TOut, D> = HasInfectedOut<TOut> extends true
  ? FnReturn<TIn, TOut, D>
  : TOut;

type InputArgToFx<TArg, D> = TArg extends Fect<any, infer Fx extends FxShape>
  ? Fx
  : TArg extends FectLazy<any> ? { fectLazy: true }
  : TArg extends PromiseLike<any> ? { async: true; result: D }
  : {};

export type MergeInputFx2<A, B, D> = MergeFx<
  InputArgToFx<A, D>,
  InputArgToFx<B, D>
>;
export type MergeInputFx3<A, B, C, D> = MergeFx<
  MergeFx<InputArgToFx<A, D>, InputArgToFx<B, D>>,
  InputArgToFx<C, D>
>;
export type MergeInputFx4<A, B, C, DArg, D> = MergeFx<
  MergeInputFx3<A, B, C, D>,
  InputArgToFx<DArg, D>
>;
// @generated-start merge-input-fx
export type MergeInputFx5<A, B, C, DArg, E, D> = MergeFx<
  MergeInputFx4<A, B, C, DArg, D>,
  InputArgToFx<E, D>
>;
export type MergeInputFx6<A, B, C, DArg, E, F, D> = MergeFx<
  MergeInputFx5<A, B, C, DArg, E, D>,
  InputArgToFx<F, D>
>;
export type MergeInputFx7<A, B, C, DArg, E, F, G, D> = MergeFx<
  MergeInputFx6<A, B, C, DArg, E, F, D>,
  InputArgToFx<G, D>
>;
export type MergeInputFx8<A, B, C, DArg, E, F, G, H, D> = MergeFx<
  MergeInputFx7<A, B, C, DArg, E, F, G, D>,
  InputArgToFx<H, D>
>;
export type MergeInputFx9<A, B, C, DArg, E, F, G, H, I, D> = MergeFx<
  MergeInputFx8<A, B, C, DArg, E, F, G, H, D>,
  InputArgToFx<I, D>
>;
export type MergeInputFx10<A, B, C, DArg, E, F, G, H, I, J, D> = MergeFx<
  MergeInputFx9<A, B, C, DArg, E, F, G, H, I, D>,
  InputArgToFx<J, D>
>;
export type MergeInputFx11<A, B, C, DArg, E, F, G, H, I, J, K, D> = MergeFx<
  MergeInputFx10<A, B, C, DArg, E, F, G, H, I, J, D>,
  InputArgToFx<K, D>
>;
export type MergeInputFx12<A, B, C, DArg, E, F, G, H, I, J, K, L, D> = MergeFx<
  MergeInputFx11<A, B, C, DArg, E, F, G, H, I, J, K, D>,
  InputArgToFx<L, D>
>;
// @generated-end merge-input-fx

// ===== Runtime helpers =====

export function makeCore<A, Fx extends FxShape>(
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
export function makeCoreAsync<A, Fx extends FxShape>(
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
export function isFail(value: unknown): value is Fail<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    FAIL in (value as Record<PropertyKey, unknown>)
  );
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).then === "function"
  );
}

/** Runtime check: is this value a `FectLazy` wrapper? */
export function isFectLazy(value: unknown): value is FectLazy<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    FECT_LAZY in (value as Record<PropertyKey, unknown>)
  );
}

/**
 * Build a memoized lazy wrapper.
 * The thunk runs at most once, then its result is cached.
 */
export function lazy<T>(thunk: () => T): FectLazy<T>;
export function lazy<TArgs extends unknown[], TOut>(
  handler: (...args: TArgs) => TOut,
): (...args: LazyArgs<TArgs>) => FectLazy<TOut>;
export function lazy<TArgs extends unknown[], TOut>(
  handler: (...args: TArgs) => TOut,
  ...args: LazyArgs<TArgs>
): FectLazy<TOut>;
export function lazy<T>(thunk: (...args: unknown[]) => T, ...args: unknown[]) {
  if (args.length > 0) {
    return buildLazy(() => thunk(...args));
  }

  if (thunk.length === 0) {
    return buildLazy(() => thunk());
  }

  return (...laterArgs: unknown[]) => buildLazy(() => thunk(...laterArgs));
}

function buildLazy<T>(thunk: () => T): FectLazy<T> {
  let hasValue = false;
  let cachedValue: T;
  const wrapper = {
    [FECT_LAZY]: true,
    force() {
      if (!hasValue) {
        cachedValue = thunk();
        hasValue = true;
      }
      return cachedValue;
    },
    [Symbol.toPrimitive](hint: string) {
      const value = forceFectLazy(wrapper.force() as unknown);
      if (hint === "number") return Number(value);
      if (hint === "string") return String(value);
      return value as unknown as string | number | bigint | boolean | null;
    },
    valueOf() {
      return forceFectLazy(wrapper.force() as unknown);
    },
    toString() {
      return String(forceFectLazy(wrapper.force() as unknown));
    },
  };
  return wrapper as FectLazy<T>;
}

/** Fully force nested `FectLazy` wrappers until a non-lazy value is reached. */
export function forceFectLazy<T>(input: T | FectLazy<T>): T {
  let current: unknown = input;
  while (isFectLazy(current)) {
    current = current.force();
  }
  return current as T;
}

export function mergeFxRuntime(a: FxShape, b: FxShape): FxShape {
  return { ...a, ...b };
}

export type FnOptions<DRejected = PromiseRejected, DThrown = UnknownException> = {
  mapDefect?: (cause: unknown) => DRejected | DThrown;
  mapRejected?: (cause: unknown) => DRejected;
  mapThrown?: (cause: unknown) => DThrown;
};

export function defaultMapRejected(cause: unknown): PromiseRejected {
  return { _tag: "PromiseRejected", cause };
}

export function defaultMapThrown(cause: unknown): UnknownException {
  return { _tag: "UnknownException", cause };
}

/**
 * Convert a raw handler return value into a Payload (or PromiseLike<Payload>).
 * Used inside `.then()` chains where JS auto-flattens nested promises.
 */
export function settleToPayload(
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

type ErrorRaiser = { err: (...args: any[]) => Fail<any> };

/**
 * Ergonomic helper for producing `Fail` values.
 * Accepts either an error instance/value or a tagged error class.
 */
export function raise<E>(error: E): Fail<E>;
export function raise<R extends ErrorRaiser>(
  errorClass: R,
  ...args: Parameters<R["err"]>
): ReturnType<R["err"]>;
export function raise(
  errorOrClass: unknown,
  ...args: unknown[]
): Fail<unknown> {
  if (
    (typeof errorOrClass === "function" || typeof errorOrClass === "object") &&
    errorOrClass !== null &&
    "err" in errorOrClass &&
    typeof (errorOrClass as { err?: unknown }).err === "function"
  ) {
    return (errorOrClass as { err: (...args: unknown[]) => Fail<unknown> }).err(
      ...args,
    );
  }
  return fail(errorOrClass);
}

/**
 * Build typed field projectors that participate in infection automatically.
 *
 * ```ts
 * type Step = { value: number; next: number };
 * const step = props<Step>();
 * const stepValue = step("value");
 * const stepNext = step("next");
 * ```
 */
export function props<T>(): <K extends keyof T>(
  key: K,
) => {
  (value: T): FnMaybeRawReturn<
    [value: T],
    T[K],
    PromiseRejected | UnknownException
  >;
  <FxIn extends FxShape>(value: Fect<T, FxIn>): FnReturn<
    Fect<T, FxIn>,
    T[K],
    PromiseRejected | UnknownException
  >;
  (value: PromiseLike<T>): FnReturn<
    Fect<T, { async: true; result: PromiseRejected | UnknownException }>,
    T[K],
    PromiseRejected | UnknownException
  >;
} {
  return function <K extends keyof T>(key: K) {
    return fn((value: T) => value[key]);
  };
}

export function get<T, K extends keyof T>(value: T, key: K): T[K];
export function get<T, Fx extends FxShape, K extends keyof T>(
  value: Fect<T, Fx>,
  key: K,
): Fect<T[K], Fx>;
export function get<T, K extends keyof T>(
  value: PromiseLike<T>,
  key: K,
): Fect<T[K], { async: true; result: PromiseRejected | UnknownException }>;
export function get(value: unknown, key: PropertyKey): unknown {
  const project = fn((input: Record<PropertyKey, unknown>) => input[key]);
  return project(value as Record<PropertyKey, unknown>);
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
export function FectError<const Tag extends string>(
  tag: Tag,
): <Fields extends object = {}>() => FectErrorClass<Tag, Fields> {
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

export { fn };
