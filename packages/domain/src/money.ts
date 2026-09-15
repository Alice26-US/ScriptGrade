/** Integer hundredths to avoid IEEE float drift on 0.25 marks. */
export function toHundredths(n: number): number {
  return Math.round(n * 100);
}

export function fromHundredths(n: number): number {
  return n / 100;
}

export function roundMarks(n: number): number {
  return fromHundredths(toHundredths(n));
}
