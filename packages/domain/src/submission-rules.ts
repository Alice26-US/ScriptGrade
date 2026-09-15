import {
  DEFAULT_GRACE_SECONDS,
  MAX_GRACE_SECONDS,
  MIN_GRACE_SECONDS,
  STUDENT_RESUBMIT_CAP,
  SYSTEM_MAX_PAGES,
} from "./constants";
import { ExerciseStatus, PageQuality, SubmissionStatus } from "./enums";

export function assertGraceSeconds(seconds: number): void {
  if (
    !Number.isInteger(seconds) ||
    seconds < MIN_GRACE_SECONDS ||
    seconds > MAX_GRACE_SECONDS
  ) {
    throw new Error("Grace period must be an integer 0–3600 seconds");
  }
}

export function defaultGraceSeconds(): number {
  return DEFAULT_GRACE_SECONDS;
}

export type StudentResubmitContext = {
  exerciseStatus: ExerciseStatus;
  closesAt: Date;
  now: Date;
  reviewStarted: boolean;
  finalizedOrReleased: boolean;
  studentResubmitCount: number;
  lecturerReturnActive: boolean;
};

export function canStudentInitiateResubmit(ctx: StudentResubmitContext): {
  ok: boolean;
  reason?: string;
} {
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
  if (ctx.exerciseStatus === ExerciseStatus.CLOSED || ctx.now >= ctx.closesAt) {
    return {
      ok: false,
      reason: "Exercise is closed; late submit requires lecturer Return",
    };
  }
  if (
    ctx.exerciseStatus !== ExerciseStatus.OPEN &&
    ctx.exerciseStatus !== ExerciseStatus.PUBLISHED
  ) {
    return { ok: false, reason: "Exercise is not open for submission" };
  }
  if (ctx.studentResubmitCount >= STUDENT_RESUBMIT_CAP) {
    return { ok: false, reason: `Student resubmit cap of ${STUDENT_RESUBMIT_CAP} reached` };
  }
  return { ok: true };
}

export function isTechnicalQualityFailure(quality: PageQuality): boolean {
  return (
    quality === PageQuality.FAIL_BLUR ||
    quality === PageQuality.FAIL_DARK ||
    quality === PageQuality.FAIL_RESOLUTION ||
    quality === PageQuality.FAIL_BLANK ||
    quality === PageQuality.FAIL_CHECKSUM
  );
}

export function canReplacePageDuringGrace(args: {
  reservationActive: boolean;
  graceExpiresAt: Date;
  now: Date;
  quality: PageQuality;
  checksumFailed: boolean;
}): { ok: boolean; reason?: string } {
  if (!args.reservationActive || args.now >= args.graceExpiresAt) {
    return { ok: false, reason: "Grace period is not active" };
  }
  if (args.checksumFailed || isTechnicalQualityFailure(args.quality)) {
    return { ok: true };
  }
  return {
    ok: false,
    reason:
      "Replace is only allowed for upload/checksum failure or automatic technical quality failure",
  };
}

export function reservationIsOnTime(reservationCreatedAt: Date, closesAt: Date): boolean {
  return reservationCreatedAt < closesAt;
}

export function allRequiredPagesPresent(args: {
  slots: number;
  pagesWithStorage: number;
  emptySlots: number;
}): boolean {
  return args.emptySlots === 0 && args.pagesWithStorage === args.slots;
}

export function assertSlotCount(slotCount: number, minPages: number, maxPages: number): void {
  if (slotCount < minPages || slotCount > maxPages || slotCount > SYSTEM_MAX_PAGES) {
    throw new Error(
      `Submission must have between ${minPages} and ${maxPages} pages (system cap ${SYSTEM_MAX_PAGES})`,
    );
  }
}

export function deriveExerciseStatus(args: {
  stored: ExerciseStatus;
  opensAt: Date | null;
  closesAt: Date | null;
  now: Date;
}): ExerciseStatus {
  if (args.stored === ExerciseStatus.DRAFT || args.stored === ExerciseStatus.ARCHIVED) {
    return args.stored;
  }
  if (args.closesAt && args.now >= args.closesAt) {
    return ExerciseStatus.CLOSED;
  }
  if (args.opensAt && args.now >= args.opensAt) {
    return ExerciseStatus.OPEN;
  }
  return ExerciseStatus.PUBLISHED;
}

export const STUDENT_VISIBLE_BEFORE_RELEASE: ReadonlySet<SubmissionStatus> = new Set([
  SubmissionStatus.DRAFT,
  SubmissionStatus.RESERVING,
  SubmissionStatus.UPLOADING,
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.PROCESSING,
  SubmissionStatus.AI_PROPOSED,
  SubmissionStatus.IN_REVIEW,
  SubmissionStatus.RETURNED,
  SubmissionStatus.GRADED,
]);

export function studentFacingStatus(
  status: SubmissionStatus,
  released: boolean,
): string {
  if (released && status === SubmissionStatus.RELEASED) {
    return "released";
  }
  if (
    status === SubmissionStatus.SUBMITTED ||
    status === SubmissionStatus.PROCESSING ||
    status === SubmissionStatus.AI_PROPOSED ||
    status === SubmissionStatus.IN_REVIEW ||
    status === SubmissionStatus.GRADED
  ) {
    return released ? status.toLowerCase() : "received";
  }
  if (status === SubmissionStatus.UPLOADING || status === SubmissionStatus.RESERVING) {
    return "uploading";
  }
  if (status === SubmissionStatus.RETURNED) {
    return "returned";
  }
  if (status === SubmissionStatus.DRAFT) {
    return "draft";
  }
  return "received";
}
