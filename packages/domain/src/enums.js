"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportKind = exports.VersionSource = exports.PageQuality = exports.ReservationStatus = exports.SpellingErrorStatus = exports.CriterionKind = exports.SubmissionStatus = exports.ExerciseStatus = exports.ExerciseLanguage = exports.Locale = exports.UserRole = void 0;
exports.UserRole = {
    STUDENT: "STUDENT",
    LECTURER: "LECTURER",
    ADMIN: "ADMIN",
};
exports.Locale = {
    EN: "EN",
    FR: "FR",
};
exports.ExerciseLanguage = {
    EN: "EN",
    FR: "FR",
};
exports.ExerciseStatus = {
    DRAFT: "DRAFT",
    PUBLISHED: "PUBLISHED",
    OPEN: "OPEN",
    CLOSED: "CLOSED",
    ARCHIVED: "ARCHIVED",
};
exports.SubmissionStatus = {
    DRAFT: "DRAFT",
    RESERVING: "RESERVING",
    UPLOADING: "UPLOADING",
    SUBMITTED: "SUBMITTED",
    PROCESSING: "PROCESSING",
    AI_PROPOSED: "AI_PROPOSED",
    IN_REVIEW: "IN_REVIEW",
    RETURNED: "RETURNED",
    GRADED: "GRADED",
    RELEASED: "RELEASED",
};
exports.CriterionKind = {
    NORMAL: "NORMAL",
    SPELLING: "SPELLING",
    LENGTH: "LENGTH",
};
exports.SpellingErrorStatus = {
    SUSPECT: "SUSPECT",
    CONFIRMED: "CONFIRMED",
    DISMISSED: "DISMISSED",
};
exports.ReservationStatus = {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    EXPIRED: "EXPIRED",
    CANCELLED: "CANCELLED",
};
exports.PageQuality = {
    PENDING: "PENDING",
    OK: "OK",
    FAIL_BLUR: "FAIL_BLUR",
    FAIL_DARK: "FAIL_DARK",
    FAIL_RESOLUTION: "FAIL_RESOLUTION",
    FAIL_BLANK: "FAIL_BLANK",
    FAIL_CHECKSUM: "FAIL_CHECKSUM",
};
exports.VersionSource = {
    STUDENT: "STUDENT",
    RETURN: "RETURN",
};
exports.ImportKind = {
    CAMPUSES: "CAMPUSES",
    PROGRAMMES: "PROGRAMMES",
    COURSES: "COURSES",
    TERMS: "TERMS",
    OFFERINGS: "OFFERINGS",
    STUDENTS: "STUDENTS",
    LECTURERS: "LECTURERS",
    ENROLMENTS: "ENROLMENTS",
    OFFERING_LECTURERS: "OFFERING_LECTURERS",
};
//# sourceMappingURL=enums.js.map