import {
  defaultMapRejected,
  defaultMapThrown,
  err,
  type FectLazy,
  forceFectLazy,
  type Fect,
  isFectLazy,
  type FnMaybeRawReturn,
  type FnOptions,
  type FnReturn,
  type FxShape,
  isFail,
  isFect,
  isPromiseLike,
  makeCore,
  makeCoreAsync,
  type MergeInputFx2,
  type MergeInputFx3,
  type MergeInputFx4,
  type MergeInputFx5,
  type MergeInputFx6,
  type MergeInputFx7,
  type MergeInputFx8,
  type MergeInputFx9,
  type MergeInputFx10,
  type MergeInputFx11,
  type MergeInputFx12,
  mergeFxRuntime,
  lazy,
  ok,
  type PromiseRejected,
  settleToPayload,
  type UnknownException,
} from "./fect.ts";

/**
 * Wrap a handler so it participates in the infection pipeline.
 *
 * - Accepts plain values, `Fect` carriers, or `PromiseLike` values.
 * - Auto-short-circuits on error carriers.
 * - Chains through async payloads transparently.
 * - Merges effect metadata from input and output.
 * - `Fail` returns (via `SomeError.err(...)`) are converted to error carriers.
 */
type InfectedArg<T> =
  | T
  | Fect<T, FxShape>
  | FectLazy<T>
  | PromiseLike<T>;

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
  (input: FectLazy<Parameters<H>[0]>): FectLazy<
    FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>
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
  <
    AIn extends
      | Parameters<H>[0]
      | Fect<Parameters<H>[0], FxShape>
      | FectLazy<Parameters<H>[0]>
      | PromiseLike<Parameters<H>[0]>,
    BIn extends
      | Parameters<H>[1]
      | Fect<Parameters<H>[1], FxShape>
      | FectLazy<Parameters<H>[1]>
      | PromiseLike<Parameters<H>[1]>,
  >(
    a: AIn,
    b: BIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx2<AIn, BIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends
      | Parameters<H>[0]
      | Fect<Parameters<H>[0], FxShape>
      | FectLazy<Parameters<H>[0]>
      | PromiseLike<Parameters<H>[0]>,
    BIn extends
      | Parameters<H>[1]
      | Fect<Parameters<H>[1], FxShape>
      | FectLazy<Parameters<H>[1]>
      | PromiseLike<Parameters<H>[1]>,
    CIn extends
      | Parameters<H>[2]
      | Fect<Parameters<H>[2], FxShape>
      | FectLazy<Parameters<H>[2]>
      | PromiseLike<Parameters<H>[2]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx3<AIn, BIn, CIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends
      | Parameters<H>[0]
      | Fect<Parameters<H>[0], FxShape>
      | FectLazy<Parameters<H>[0]>
      | PromiseLike<Parameters<H>[0]>,
    BIn extends
      | Parameters<H>[1]
      | Fect<Parameters<H>[1], FxShape>
      | FectLazy<Parameters<H>[1]>
      | PromiseLike<Parameters<H>[1]>,
    CIn extends
      | Parameters<H>[2]
      | Fect<Parameters<H>[2], FxShape>
      | FectLazy<Parameters<H>[2]>
      | PromiseLike<Parameters<H>[2]>,
    DIn extends
      | Parameters<H>[3]
      | Fect<Parameters<H>[3], FxShape>
      | FectLazy<Parameters<H>[3]>
      | PromiseLike<Parameters<H>[3]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx4<AIn, BIn, CIn, DIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
// @generated-start fn-overloads-5-12
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx5<AIn, BIn, CIn, DArgIn, EIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any, f: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
    f: FIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx6<AIn, BIn, CIn, DArgIn, EIn, FIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any, f: any, g: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
    f: FIn,
    g: GIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx7<AIn, BIn, CIn, DArgIn, EIn, FIn, GIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx8<AIn, BIn, CIn, DArgIn, EIn, FIn, GIn, HIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx9<AIn, BIn, CIn, DArgIn, EIn, FIn, GIn, HIn, IIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
    j: Parameters<H>[9],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
    JIn extends InfectedArg<Parameters<H>[9]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
    j: JIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx10<AIn, BIn, CIn, DArgIn, EIn, FIn, GIn, HIn, IIn, JIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
    j: Parameters<H>[9],
    k: Parameters<H>[10],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
    JIn extends InfectedArg<Parameters<H>[9]>,
    KIn extends InfectedArg<Parameters<H>[10]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
    j: JIn,
    k: KIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx11<AIn, BIn, CIn, DArgIn, EIn, FIn, GIn, HIn, IIn, JIn, KIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
    j: Parameters<H>[9],
    k: Parameters<H>[10],
    l: Parameters<H>[11],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DArgIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
    JIn extends InfectedArg<Parameters<H>[9]>,
    KIn extends InfectedArg<Parameters<H>[10]>,
    LIn extends InfectedArg<Parameters<H>[11]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DArgIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
    j: JIn,
    k: KIn,
    l: LIn,
  ): FnReturn<
    Fect<unknown, MergeInputFx12<AIn, BIn, CIn, DArgIn, EIn, FIn, GIn, HIn, IIn, JIn, KIn, LIn, DRejected | DThrown>>,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
// @generated-end fn-overloads-5-12
export function fn<
  H extends (
    a: any,
    b: any,
    c: any,
    d: any,
    e: any,
    f: any,
    g: any,
  ) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DIn,
    e: EIn,
    f: FIn,
    g: GIn,
  ): FnReturn<
    Fect<
      unknown,
      MergeInputFx7<AIn, BIn, CIn, DIn, EIn, FIn, GIn, DRejected | DThrown>
    >,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (
    a: any,
    b: any,
    c: any,
    d: any,
    e: any,
    f: any,
    g: any,
    h: any,
  ) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
  ): FnReturn<
    Fect<
      unknown,
      MergeInputFx8<
        AIn,
        BIn,
        CIn,
        DIn,
        EIn,
        FIn,
        GIn,
        HIn,
        DRejected | DThrown
      >
    >,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (
    a: any,
    b: any,
    c: any,
    d: any,
    e: any,
    f: any,
    g: any,
    h: any,
    i: any,
  ) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
  ): FnReturn<
    Fect<
      unknown,
      MergeInputFx9<
        AIn,
        BIn,
        CIn,
        DIn,
        EIn,
        FIn,
        GIn,
        HIn,
        IIn,
        DRejected | DThrown
      >
    >,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (
    a: any,
    b: any,
    c: any,
    d: any,
    e: any,
    f: any,
    g: any,
    h: any,
    i: any,
    j: any,
  ) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
    j: Parameters<H>[9],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
    JIn extends InfectedArg<Parameters<H>[9]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
    j: JIn,
  ): FnReturn<
    Fect<
      unknown,
      MergeInputFx10<
        AIn,
        BIn,
        CIn,
        DIn,
        EIn,
        FIn,
        GIn,
        HIn,
        IIn,
        JIn,
        DRejected | DThrown
      >
    >,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (
    a: any,
    b: any,
    c: any,
    d: any,
    e: any,
    f: any,
    g: any,
    h: any,
    i: any,
    j: any,
    k: any,
  ) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
    j: Parameters<H>[9],
    k: Parameters<H>[10],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
    JIn extends InfectedArg<Parameters<H>[9]>,
    KIn extends InfectedArg<Parameters<H>[10]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
    j: JIn,
    k: KIn,
  ): FnReturn<
    Fect<
      unknown,
      MergeInputFx11<
        AIn,
        BIn,
        CIn,
        DIn,
        EIn,
        FIn,
        GIn,
        HIn,
        IIn,
        JIn,
        KIn,
        DRejected | DThrown
      >
    >,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (
    a: any,
    b: any,
    c: any,
    d: any,
    e: any,
    f: any,
    g: any,
    h: any,
    i: any,
    j: any,
    k: any,
    l: any,
  ) => unknown,
  DRejected = PromiseRejected,
  DThrown = UnknownException,
>(
  handler: H,
  options?: FnOptions<DRejected, DThrown>,
): {
  (
    a: Parameters<H>[0],
    b: Parameters<H>[1],
    c: Parameters<H>[2],
    d: Parameters<H>[3],
    e: Parameters<H>[4],
    f: Parameters<H>[5],
    g: Parameters<H>[6],
    h: Parameters<H>[7],
    i: Parameters<H>[8],
    j: Parameters<H>[9],
    k: Parameters<H>[10],
    l: Parameters<H>[11],
  ): FnMaybeRawReturn<Parameters<H>, ReturnType<H>, DRejected | DThrown>;
  <
    AIn extends InfectedArg<Parameters<H>[0]>,
    BIn extends InfectedArg<Parameters<H>[1]>,
    CIn extends InfectedArg<Parameters<H>[2]>,
    DIn extends InfectedArg<Parameters<H>[3]>,
    EIn extends InfectedArg<Parameters<H>[4]>,
    FIn extends InfectedArg<Parameters<H>[5]>,
    GIn extends InfectedArg<Parameters<H>[6]>,
    HIn extends InfectedArg<Parameters<H>[7]>,
    IIn extends InfectedArg<Parameters<H>[8]>,
    JIn extends InfectedArg<Parameters<H>[9]>,
    KIn extends InfectedArg<Parameters<H>[10]>,
    LIn extends InfectedArg<Parameters<H>[11]>,
  >(
    a: AIn,
    b: BIn,
    c: CIn,
    d: DIn,
    e: EIn,
    f: FIn,
    g: GIn,
    h: HIn,
    i: IIn,
    j: JIn,
    k: KIn,
    l: LIn,
  ): FnReturn<
    Fect<
      unknown,
      MergeInputFx12<
        AIn,
        BIn,
        CIn,
        DIn,
        EIn,
        FIn,
        GIn,
        HIn,
        IIn,
        JIn,
        KIn,
        LIn,
        DRejected | DThrown
      >
    >,
    ReturnType<H>,
    DRejected | DThrown
  >;
};
export function fn<
  H extends (
    a: any,
    b: any,
    c: any,
    d: any,
    e: any,
    f: any,
    g: any,
    h: any,
    i: any,
    j: any,
    k: any,
    l: any,
    ...rest: any[]
  ) => unknown,
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
  handler: (...args: unknown[]) => unknown,
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

  const evaluate: (...inputs: unknown[]) => unknown = (...inputs: unknown[]) => {
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
          asyncPayload as Promise<
            { tag: "ok"; value: unknown } | { tag: "err"; error: unknown }
          >,
          { async: true, result: true },
        );
      }

      if (isFail(outRaw)) return err(outRaw.error);
      if (isFectLazy(outRaw)) return outRaw;
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
            (resolved) =>
              resolved as
                | { tag: "ok"; value: unknown }
                | { tag: "err"; error: unknown },
            (cause) =>
              ({
                tag: "err" as const,
                error: mapRejected(cause),
              }) as { tag: "ok"; value: unknown } | {
                tag: "err";
                error: unknown;
              },
          )
        ),
      ).then((resolvedInputs) => {
        const firstErr = resolvedInputs.find((p) => p.tag === "err");
        if (firstErr) return firstErr;

        const values = resolvedInputs.map((p) =>
          (p as { value: unknown }).value
        );
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
        if (isFectLazy(outRaw)) {
          return settleToPayload(forceFectLazy(outRaw));
        }
        return settleToPayload(outRaw);
      });

      return makeCoreAsync(
        asyncPayload as Promise<
          { tag: "ok"; value: unknown } | { tag: "err"; error: unknown }
        >,
        mergedInFx,
      );
    }

    // Fully sync infected input(s)
    const firstErr = (
      inPayloads as Array<{ tag: "ok"; value: unknown } | { tag: "err"; error: unknown }>
    ).find((p) => p.tag === "err");
    if (firstErr) {
      // deno-lint-ignore no-explicit-any
      return makeCore(
        firstErr as any,
        mergedInFx,
      );
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
        asyncPayload as Promise<
          { tag: "ok"; value: unknown } | { tag: "err"; error: unknown }
        >,
        mergeFxRuntime(mergedInFx, { async: true, result: true }),
      );
    }

    if (isFectLazy(outRaw)) {
      return forceFectLazy(outRaw);
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

    return makeCore({ tag: "ok", value: outRaw }, mergedInFx);
  };

  // Any-arg handler
  const wrapped: (...inputs: unknown[]) => unknown = (...inputs: unknown[]) => {
    if (inputs.some(isFectLazy)) {
      return lazy(() => forceFectLazy(evaluate(...inputs)));
    }
    return evaluate(...inputs);
  };

  return wrapped;
}
