"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHundredths = toHundredths;
exports.fromHundredths = fromHundredths;
exports.roundMarks = roundMarks;
function toHundredths(n) {
    return Math.round(n * 100);
}
function fromHundredths(n) {
    return n / 100;
}
function roundMarks(n) {
    return fromHundredths(toHundredths(n));
}
//# sourceMappingURL=money.js.map