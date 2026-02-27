import { Fect, fn, List, match, Option, strEq } from "../mod.ts";
import { charToDigit, mul, type wstr } from "./pseudostd.ts";
import { type Fect as FectValue } from "../lib/fect.ts";

class NotMul extends Fect.error("NotMul")() {}
class ExpectedDigit extends Fect.error("ExpectedDigit")() {}
class ExpectedComma extends Fect.error("ExpectedComma")() {}
class ExpectedCloseParen extends Fect.error("ExpectedCloseParen")() {}

type ParseStep = { value: number; next: number };

const makeStep = fn(
  (value: number, next: number): ParseStep => (
    { value, next }
  ),
);

const charComma = ",";
const charCloseParen = ")";
const mulLiteral = [..."mul("];
const mulLiteralLength = List.length(mulLiteral);

const readRequiredDigit = fn(
  (chars: wstr, i: number) => {
    return match(List.at(chars, i)).with({
      ok: (c) => {
        return match(charToDigit(c)).with({
          Some: (digit) => makeStep(Fect.ok(digit), i + 1),
          None: () => makeStep(Fect.err(ExpectedDigit.of()), i + 1),
        });
      },
      err: (err) => makeStep(Fect.err(err), i + 1),
    });
  },
);

const extendDigits = fn(
  (chars: wstr, step: ParseStep, count: number): ParseStep => {
    if (count === 3) {
      return step;
    } else {
      return match(List.at(chars, step.next)).with({
        err: (_) => step,
        ok: (code) => {
          return match(charToDigit(code)).with({
            None: () => step,
            Some: (digit) => {
              const combined = makeStep(
                step.value * 10 + digit,
                step.next + 1,
              );
              return extendDigits(chars, combined, count + 1);
            },
          });
        },
      });
    }
  },
);

const expectCharAt = <E>(expected: string, error: E) =>
  fn((chars: wstr, i: number) => {
    return match(List.at(chars, i)).with({
      ok: (code) => {
        if (code === expected) {
          return Fect.ok(i + 1);
        } else {
          return Fect.err(error);
        }
      },
      err: () => Fect.err(error),
    });
  });

const expectMulLiteral = fn(
  (chars: wstr, i: number) => {
    if (strEq(List.slice(chars, i, i + mulLiteralLength), mulLiteral)) {
      return i + mulLiteralLength;
    } else {
      return NotMul.err();
    }
  },
);

const parseMulAt = fn(
  (chars: wstr, i: number) => {
    const afterMul: FectValue<number, { result: NotMul }> = expectMulLiteral(chars, i);
    const digit = readRequiredDigit(chars, afterMul); //propagates
    const leftStep = extendDigits(chars, digit, 1);
    const afterComma = expectCharAt(",", ExpectedComma.of())(chars, Fect.get(leftStep, "next"));
    const rightStep = extendDigits(chars, readRequiredDigit(chars, afterComma), 1);
    const afterClose = expectCharAt(")", ExpectedCloseParen.of())(chars, Fect.get(rightStep, "next"));
    return makeStep(
      mul(Fect.get(leftStep, "value"), Fect.get(rightStep, "value")),
      afterClose,
    );
  },
);

const scan = fn(
  (chars: wstr, i: number, acc: number): number => {
    return match(List.at(chars, i)).with({
      err: () => acc,
      ok: () => {
        return match(parseMulAt(chars, i)).with({
          ok: (step) => {
            return scan(chars, step.next, acc + step.value);
          },
          err: (err) => {
            console.log(err);
            console.log(`skipping at ${i}`);
            return scan(chars, i + 1, acc);
          },
        });
      },
    });
  },
);

const corruptedMemory = "xmul(2,4)%&mul[3,7]!@^do_not_mul(5,5)+mul(32,64]then(mul(11,8)mul(8,5))";

const main = () => {
  const chars = [...corruptedMemory];
  console.log(scan(chars, 0, 0));
};

if (import.meta.main) {
  main();
}
