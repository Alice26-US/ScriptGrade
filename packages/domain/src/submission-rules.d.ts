import { ExerciseStatus, PageQuality, SubmissionStatus } from "./enums";
export declare function assertGraceSeconds(seconds: number): void;
export declare function defaultGraceSeconds(): number;
export type StudentResubmitContext = {
    exerciseStatus: ExerciseStatus;
    closesAt: Date;
    now: Date;
    reviewStarted: boolean;
    finalizedOrReleased: boolean;
    studentResubmitCount: number;
    lecturerReturnActive: boolean;
};
export declare function canStudentInitiateResubmit(ctx: StudentResubmitContext): {
    ok: boolean;
    reason?: string;
};
export declare function isTechnicalQualityFailure(quality: PageQuality): boolean;
export declare function canReplacePageDuringGrace(args: {
    reservationActive: boolean;
    graceExpiresAt: Date;
    now: Date;
    quality: PageQuality;
    checksumFailed: boolean;
}): {
    ok: boolean;
    reason?: string;
};
export declare function reservationIsOnTime(reservationCreatedAt: Date, closesAt: Date): boolean;
export declare function allRequiredPagesPresent(args: {
    slots: number;
    pagesWithStorage: number;
    emptySlots: number;
}): boolean;
export declare function assertSlotCount(slotCount: number, minPages: number, maxPages: number): void;
export declare function deriveExerciseStatus(args: {
    stored: ExerciseStatus;
    opensAt: Date | null;
    closesAt: Date | null;
    now: Date;
}): ExerciseStatus;
export declare const STUDENT_VISIBLE_BEFORE_RELEASE: ReadonlySet<SubmissionStatus>;
export declare function studentFacingStatus(status: SubmissionStatus, released: boolean): string;
