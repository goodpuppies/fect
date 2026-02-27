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
type FnReturn<TIn, TOut, D = never> = FnReturn_<TIn, TOut, D> extends
  Fect<infer A, infer Fx extends FxShape> ? Fect<A, Fx> : never;

type HasInfectedOut<T> = [Extract<T, PromiseLike<any> | Fail<any> | Fect<any, any>>] extends
  [never] ? false
  : true;

type FnMaybeRawReturn<TIn, TOut, D> = HasInfectedOut<TOut> extends true
  ? FnReturn<TIn, TOut, D>
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

type FnOptions<DRejected = PromiseRejected, DThrown = UnknownException> = {
  mapDefect?: (cause: unknown) => DRejected | DThrown;
  mapRejected?: (cause: unknown) => DRejected;
  mapThrown?: (cause: unknown) => DThrown;
};

function defaultMapRejected(cause: unknown): PromiseRejected {
  return { _tag: "PromiseRejected", cause };
}

function defaultMapThrown(cause: unknown): UnknownException {
  return { _tag: "UnknownException", cause };
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
export function raise(errorOrClass: unknown, ...args: unknown[]): Fail<unknown> {
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
export function props<T>() {
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
export function fn<
  H extends () => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): () => FnMaybeRawReturn<[], ReturnType<H>, DRejected | DThrown>;
export function fn<
  H extends (input: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (input: Parameters<H>[0]): FnMaybeRawReturn<
    Parameters<H>,
    ReturnType<H>,
    DRejected | DThrown
  >;
  <FxIn extends FxShape>(
    input: Fect<Parameters<H>[0], FxIn>,
  ): FnReturn<
    Fect<Parameters<H>[0], FxIn>,
    ReturnType<H>,
    DRejected | DThrown
  >;
  (input: PromiseLike<Parameters<H>[0]>): FnReturn<
    Fect<Parameters<H>[0], { async: true; result: DRejected | DThrown }>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (a: Parameters<H>[0], b: Parameters<H>[1]): FnMaybeRawReturn<
    Parameters<H>,
    ReturnType<H>,
    DRejected | DThrown
  >;
  (
    a:
      | Parameters<H>[0]
      | Fect<Parameters<H>[0], FxShape>
      | PromiseLike<Parameters<H>[0]>,
    b:
      | Parameters<H>[1]
      | Fect<Parameters<H>[1], FxShape>
      | PromiseLike<Parameters<H>[1]>,
  ): FnReturn<
    Fect<unknown, FxShape>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, ...rest: any[]) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (...args: Parameters<H>): FnMaybeRawReturn<
    Parameters<H>,
    ReturnType<H>,
    DRejected | DThrown
  >;
  (...args: unknown[]): FnReturn<
    Fect<unknown, FxShape>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn(
  handler: ((...args: unknown[]) => unknown),
  options?: FnOptions,
) {
  const mapRejected = options?.mapRejected ?? options?.mapDefect ??
    defaultMapRejected;
  const mapThrown = options?.mapThrown ?? options?.mapDefect ??
    defaultMapThrown;

  function toCoreInput(input: unknown): Fect<unknown, FxShape> {
    if (isFect(input)) return input;
    if (isPromiseLike(input)) {
      return makeCoreAsync(
        Promise.resolve(input).then(
          (v) => ({ tag: "ok" as const, value: v }),
          (cause) => ({ tag: "err" as const, error: mapRejected(cause) }),
        ),
        { async: true, result: true },
      );
    }
    return ok(input) as unknown as Fect<unknown, FxShape>;
  }

  // ── Any-arg handler ──
  return (...inputs: unknown[]) => {
    const infectedCall = inputs.some((input) =>
      isFect(input) || isPromiseLike(input)
    );

    // Plain call path: keep plain outputs plain.
    if (!infectedCall) {
      const outRaw = handler(...inputs);

      if (isPromiseLike(outRaw)) {
        const asyncPayload = Promise.resolve(outRaw).then(
          settleToPayload,
          (cause) => ({ tag: "err" as const, error: mapRejected(cause) }),
        );
        return makeCoreAsync(
          asyncPayload as Promise<Payload<unknown, unknown>>,
          { async: true, result: true },
        );
      }

      if (isFail(outRaw)) return err(outRaw.error);
      return outRaw;
    }

    const inCores = inputs.map(toCoreInput);
    const mergedInFx = inCores.reduce<FxShape>(
      (acc, core) => mergeFxRuntime(acc, core.fx),
      {},
    );
    const inPayloads = inCores.map((core) => core.payload);

    // Async infected input(s): resolve all payloads first.
    if (inPayloads.some(isPromiseLike)) {
      const asyncPayload = Promise.all(
        inPayloads.map((payload) =>
          Promise.resolve(payload).then(
            (resolved) => resolved as Payload<unknown, unknown>,
            (cause) =>
              ({ tag: "err" as const, error: mapRejected(cause) }) as Payload<
                unknown,
                unknown
              >,
          )
        ),
      ).then((resolvedInputs) => {
        const firstErr = resolvedInputs.find((p) => p.tag === "err");
        if (firstErr) return firstErr;

        const values = resolvedInputs.map((p) => (p as { value: unknown }).value);
        let outRaw: unknown;
        try {
          outRaw = handler(...values);
        } catch (cause) {
          return { tag: "err" as const, error: mapThrown(cause) };
        }

        if (isPromiseLike(outRaw)) {
          return Promise.resolve(outRaw).then(
            settleToPayload,
            (cause) => ({ tag: "err" as const, error: mapRejected(cause) }),
          );
        }
        return settleToPayload(outRaw);
      });

      return makeCoreAsync(
        asyncPayload as Promise<Payload<unknown, unknown>>,
        mergedInFx,
      );
    }

    // Fully sync infected input(s)
    const firstErr = (inPayloads as Payload<unknown, unknown>[]).find((p) =>
      p.tag === "err"
    );
    if (firstErr) {
      // deno-lint-ignore no-explicit-any
      return makeCore(firstErr as any, mergedInFx);
    }

    const values = (inPayloads as Array<{ tag: "ok"; value: unknown }>).map((
      p,
    ) => p.value);
    let outRaw: unknown;
    try {
      outRaw = handler(...values);
    } catch (cause) {
      // deno-lint-ignore no-explicit-any
      return makeCore(
        { tag: "err", error: mapThrown(cause) } as any,
        mergeFxRuntime(mergedInFx, { result: true }),
      );
    }

    if (isPromiseLike(outRaw)) {
      const asyncPayload = Promise.resolve(outRaw).then(
        settleToPayload,
        (cause) => ({ tag: "err" as const, error: mapRejected(cause) }),
      );
      return makeCoreAsync(
        asyncPayload as Promise<Payload<unknown, unknown>>,
        mergeFxRuntime(mergedInFx, { async: true, result: true }),
      );
    }

    if (isFail(outRaw)) {
      const outCore = err(outRaw.error);
      // deno-lint-ignore no-explicit-any
      return makeCore(
        outCore.payload as any,
        mergeFxRuntime(mergedInFx, outCore.fx),
      );
    }

    if (isFect(outRaw)) {
      // deno-lint-ignore no-explicit-any
      return makeCore(
        outRaw.payload as any,
        mergeFxRuntime(mergedInFx, outRaw.fx),
      );
    }

    // deno-lint-ignore no-explicit-any
    return makeCore({ tag: "ok", value: outRaw } as any, mergedInFx);
  };
}

