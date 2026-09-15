export declare const UserRole: {
    readonly STUDENT: "STUDENT";
    readonly LECTURER: "LECTURER";
    readonly ADMIN: "ADMIN";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const Locale: {
    readonly EN: "EN";
    readonly FR: "FR";
};
export type Locale = (typeof Locale)[keyof typeof Locale];
export declare const ExerciseLanguage: {
    readonly EN: "EN";
    readonly FR: "FR";
};
export type ExerciseLanguage = (typeof ExerciseLanguage)[keyof typeof ExerciseLanguage];
export declare const ExerciseStatus: {
    readonly DRAFT: "DRAFT";
    readonly PUBLISHED: "PUBLISHED";
    readonly OPEN: "OPEN";
    readonly CLOSED: "CLOSED";
    readonly ARCHIVED: "ARCHIVED";
};
export type ExerciseStatus = (typeof ExerciseStatus)[keyof typeof ExerciseStatus];
export declare const SubmissionStatus: {
    readonly DRAFT: "DRAFT";
    readonly RESERVING: "RESERVING";
    readonly UPLOADING: "UPLOADING";
    readonly SUBMITTED: "SUBMITTED";
    readonly PROCESSING: "PROCESSING";
    readonly AI_PROPOSED: "AI_PROPOSED";
    readonly IN_REVIEW: "IN_REVIEW";
    readonly RETURNED: "RETURNED";
    readonly GRADED: "GRADED";
    readonly RELEASED: "RELEASED";
};
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];
export declare const CriterionKind: {
    readonly NORMAL: "NORMAL";
    readonly SPELLING: "SPELLING";
    readonly LENGTH: "LENGTH";
};
export type CriterionKind = (typeof CriterionKind)[keyof typeof CriterionKind];
export declare const SpellingErrorStatus: {
    readonly SUSPECT: "SUSPECT";
    readonly CONFIRMED: "CONFIRMED";
    readonly DISMISSED: "DISMISSED";
};
export type SpellingErrorStatus = (typeof SpellingErrorStatus)[keyof typeof SpellingErrorStatus];
export declare const ReservationStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly COMPLETED: "COMPLETED";
    readonly EXPIRED: "EXPIRED";
    readonly CANCELLED: "CANCELLED";
};
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];
export declare const PageQuality: {
    readonly PENDING: "PENDING";
    readonly OK: "OK";
    readonly FAIL_BLUR: "FAIL_BLUR";
    readonly FAIL_DARK: "FAIL_DARK";
    readonly FAIL_RESOLUTION: "FAIL_RESOLUTION";
    readonly FAIL_BLANK: "FAIL_BLANK";
    readonly FAIL_CHECKSUM: "FAIL_CHECKSUM";
};
export type PageQuality = (typeof PageQuality)[keyof typeof PageQuality];
export declare const VersionSource: {
    readonly STUDENT: "STUDENT";
    readonly RETURN: "RETURN";
};
export type VersionSource = (typeof VersionSource)[keyof typeof VersionSource];
export declare const ImportKind: {
    readonly CAMPUSES: "CAMPUSES";
    readonly PROGRAMMES: "PROGRAMMES";
    readonly COURSES: "COURSES";
    readonly TERMS: "TERMS";
    readonly OFFERINGS: "OFFERINGS";
    readonly STUDENTS: "STUDENTS";
    readonly LECTURERS: "LECTURERS";
    readonly ENROLMENTS: "ENROLMENTS";
    readonly OFFERING_LECTURERS: "OFFERING_LECTURERS";
};
export type ImportKind = (typeof ImportKind)[keyof typeof ImportKind];
