import { Fect, List, Option } from "../mod.ts";

class NotMul extends Fect.error("NotMul")() {}
class ExpectedDigit extends Fect.error("ExpectedDigit")() {}
class ExpectedComma extends Fect.error("ExpectedComma")() {}
class ExpectedCloseParen extends Fect.error("ExpectedCloseParen")() {}

type ParseStep = { value: number; next: number };

const makeStep = Fect.fn((value: number, next: number): ParseStep => (
  { value, next }
));

const mul = Fect.fn((a: number, b: number) => a * b);

const mulLiteral = "mul(";

const toDigit = Fect.fn((c: string) => {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - "0".charCodeAt(0);
  return ExpectedDigit.err();
});

const readRequiredDigit = Fect.fn((chars: readonly string[], i: number) => {
  const c = List.at(chars, i);
  const d = toDigit(c);
  return makeStep(d, i + 1);
});

const extendDigits = Fect.fn(function extendDigits(
  chars: readonly string[],
  step: ParseStep,
  count: number,
): ParseStep {
  if (count === 3) return step;

  const nextDigit = toDigit(List.at(chars, step.next));
  const optionalDigit = Fect.match(nextDigit).with({
    ok: (digit) => Option.Some(digit),
    err: {
      ExpectedDigit: () => Option.None,
      ListIndexOutOfBounds: () => Option.None,
    },
  });

  return Option.match(optionalDigit, {
    Some: (digit) => {
      const combined = makeStep(step.value * 10 + digit, step.next + 1);
      return extendDigits(chars, combined, count + 1);
    },
    None: () => step,
  });
});

const expectCharAt = Fect.fn((
  chars: readonly string[],
  i: number,
  expected: string,
  error: unknown,
) => {
  return Fect.match(List.at(chars, i)).with({
    ok: (value) => {
      if (value === expected) {
        return Fect.ok(i + 1);
      } else {
        return Fect.err(error);
      }
    },
    err: {
      ListIndexOutOfBounds: () => Fect.err(error),
    },
  });
});

const expectMulLiteral = Fect.fn((chars: readonly string[], i: number) => {
  const chunk = List.slice(chars, i, i + mulLiteral.length).join("");
  if (chunk === mulLiteral) return i + mulLiteral.length;
  return NotMul.err();
});

const parseMulAt = Fect.fn((chars: readonly string[], i: number) => {
  const afterMul = expectMulLiteral(chars, i);
  const leftStep = extendDigits(chars, readRequiredDigit(chars, afterMul), 1);
  const afterComma = expectCharAt(
    chars,
    Fect.get(leftStep, "next"),
    ",",
    ExpectedComma.of(),
  );
  const rightStep = extendDigits(chars,readRequiredDigit(chars, afterComma), 1);
  const afterClose = expectCharAt(
    chars,
    Fect.get(rightStep, "next"),
    ")",
    ExpectedCloseParen.of(),
  );
  return makeStep(
    mul(Fect.get(leftStep, "value"), Fect.get(rightStep, "value")),
    afterClose,
  );
});

function scan(chars: readonly string[], i: number, acc: number): number {
  return Fect.match(List.at(chars, i)).with({
    ok: () => {
      const parsed = parseMulAt(chars, i) as { payload: unknown };
      const payload = parsed.payload as
        | { tag: "ok"; value: ParseStep }
        | { tag: "err"; error: { _tag: string } };

      if (payload.tag === "ok") {
        return scan(chars, payload.value.next, acc + payload.value.value);
      }
      return scan(chars, i + 1, acc);
    },
    err: {
      ListIndexOutOfBounds: () => acc,
    },
  });
}

const corruptedMemory =
  "xmul(2,4)%&mul[3,7]!@^do_not_mul(5,5)+mul(32,64]then(mul(11,8)mul(8,5))";

const main = () => {
  const chars = [...corruptedMemory];
  console.log(scan(chars, 0, 0));
};

if (import.meta.main) {
  main();
}
