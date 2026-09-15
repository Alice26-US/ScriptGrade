"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDENT_VISIBLE_BEFORE_RELEASE = void 0;
exports.assertGraceSeconds = assertGraceSeconds;
exports.defaultGraceSeconds = defaultGraceSeconds;
exports.canStudentInitiateResubmit = canStudentInitiateResubmit;
exports.isTechnicalQualityFailure = isTechnicalQualityFailure;
exports.canReplacePageDuringGrace = canReplacePageDuringGrace;
exports.reservationIsOnTime = reservationIsOnTime;
exports.allRequiredPagesPresent = allRequiredPagesPresent;
exports.assertSlotCount = assertSlotCount;
exports.deriveExerciseStatus = deriveExerciseStatus;
exports.studentFacingStatus = studentFacingStatus;
const constants_1 = require("./constants");
const enums_1 = require("./enums");
function assertGraceSeconds(seconds) {
    if (!Number.isInteger(seconds) ||
        seconds < constants_1.MIN_GRACE_SECONDS ||
        seconds > constants_1.MAX_GRACE_SECONDS) {
        throw new Error("Grace period must be an integer 0–3600 seconds");
    }
}
function defaultGraceSeconds() {
    return constants_1.DEFAULT_GRACE_SECONDS;
}
function canStudentInitiateResubmit(ctx) {
    if (ctx.lecturerReturnActive) {
        return { ok: true };
    }
    if (ctx.finalizedOrReleased) {
        return { ok: false, reason: "Submission is finalized; lecturer must Return it" };
    }
    if (ctx.reviewStarted) {
        return {
            ok: false,
            reason: "Lecturer has started review; student cannot resubmit",
        };
    }
    if (ctx.exerciseStatus === enums_1.ExerciseStatus.CLOSED || ctx.now >= ctx.closesAt) {
        return {
            ok: false,
            reason: "Exercise is closed; late submit requires lecturer Return",
        };
    }
    if (ctx.exerciseStatus !== enums_1.ExerciseStatus.OPEN &&
        ctx.exerciseStatus !== enums_1.ExerciseStatus.PUBLISHED) {
        return { ok: false, reason: "Exercise is not open for submission" };
    }
    if (ctx.studentResubmitCount >= constants_1.STUDENT_RESUBMIT_CAP) {
        return { ok: false, reason: `Student resubmit cap of ${constants_1.STUDENT_RESUBMIT_CAP} reached` };
    }
    return { ok: true };
}
function isTechnicalQualityFailure(quality) {
    return (quality === enums_1.PageQuality.FAIL_BLUR ||
        quality === enums_1.PageQuality.FAIL_DARK ||
        quality === enums_1.PageQuality.FAIL_RESOLUTION ||
        quality === enums_1.PageQuality.FAIL_BLANK ||
        quality === enums_1.PageQuality.FAIL_CHECKSUM);
}
function canReplacePageDuringGrace(args) {
    if (!args.reservationActive || args.now >= args.graceExpiresAt) {
        return { ok: false, reason: "Grace period is not active" };
    }
    if (args.checksumFailed || isTechnicalQualityFailure(args.quality)) {
        return { ok: true };
    }
    return {
        ok: false,
        reason: "Replace is only allowed for upload/checksum failure or automatic technical quality failure",
    };
}
function reservationIsOnTime(reservationCreatedAt, closesAt) {
    return reservationCreatedAt < closesAt;
}
function allRequiredPagesPresent(args) {
    return args.emptySlots === 0 && args.pagesWithStorage === args.slots;
}
function assertSlotCount(slotCount, minPages, maxPages) {
    if (slotCount < minPages || slotCount > maxPages || slotCount > constants_1.SYSTEM_MAX_PAGES) {
        throw new Error(`Submission must have between ${minPages} and ${maxPages} pages (system cap ${constants_1.SYSTEM_MAX_PAGES})`);
    }
}
function deriveExerciseStatus(args) {
    if (args.stored === enums_1.ExerciseStatus.DRAFT || args.stored === enums_1.ExerciseStatus.ARCHIVED) {
        return args.stored;
    }
    if (args.closesAt && args.now >= args.closesAt) {
        return enums_1.ExerciseStatus.CLOSED;
    }
    if (args.opensAt && args.now >= args.opensAt) {
        return enums_1.ExerciseStatus.OPEN;
    }
    return enums_1.ExerciseStatus.PUBLISHED;
}
exports.STUDENT_VISIBLE_BEFORE_RELEASE = new Set([
    enums_1.SubmissionStatus.DRAFT,
    enums_1.SubmissionStatus.RESERVING,
    enums_1.SubmissionStatus.UPLOADING,
    enums_1.SubmissionStatus.SUBMITTED,
    enums_1.SubmissionStatus.PROCESSING,
    enums_1.SubmissionStatus.AI_PROPOSED,
    enums_1.SubmissionStatus.IN_REVIEW,
    enums_1.SubmissionStatus.RETURNED,
    enums_1.SubmissionStatus.GRADED,
]);
function studentFacingStatus(status, released) {
    if (released && status === enums_1.SubmissionStatus.RELEASED) {
        return "released";
    }
    if (status === enums_1.SubmissionStatus.SUBMITTED ||
        status === enums_1.SubmissionStatus.PROCESSING ||
        status === enums_1.SubmissionStatus.AI_PROPOSED ||
        status === enums_1.SubmissionStatus.IN_REVIEW ||
        status === enums_1.SubmissionStatus.GRADED) {
        return released ? status.toLowerCase() : "received";
    }
    if (status === enums_1.SubmissionStatus.UPLOADING || status === enums_1.SubmissionStatus.RESERVING) {
        return "uploading";
    }
    if (status === enums_1.SubmissionStatus.RETURNED) {
        return "returned";
    }
    if (status === enums_1.SubmissionStatus.DRAFT) {
        return "draft";
    }
    return "received";
}
//# sourceMappingURL=submission-rules.js.map