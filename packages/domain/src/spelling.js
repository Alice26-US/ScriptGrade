"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSpellingScore = computeSpellingScore;
const money_1 = require("./money");
function computeSpellingScore(input) {
    if (input.criterionMax < 0 || input.deduction < 0) {
        throw new Error("Spelling criterion max and deduction must be non-negative");
    }
    if (input.undismissedErrors < 0) {
        throw new Error("Error count must be non-negative");
    }
    const raw = (0, money_1.toHundredths)(input.criterionMax) -
        input.undismissedErrors * (0, money_1.toHundredths)(input.deduction);
    const floored = Math.max((0, money_1.toHundredths)(input.floor), raw);
    const clamped = Math.min((0, money_1.toHundredths)(input.criterionMax), Math.max(0, floored));
    return (0, money_1.roundMarks)(clamped / 100);
}
//# sourceMappingURL=spelling.js.map