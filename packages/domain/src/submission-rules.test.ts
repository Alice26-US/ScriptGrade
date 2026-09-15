import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ExerciseStatus, PageQuality } from "./enums";
import {
  canReplacePageDuringGrace,
  canStudentInitiateResubmit,
} from "./submission-rules";

describe("canStudentInitiateResubmit", () => {
  const base = {
    exerciseStatus: ExerciseStatus.OPEN,
    closesAt: new Date("2026-09-20T12:00:00Z"),
    now: new Date("2026-09-10T12:00:00Z"),
    reviewStarted: false,
    finalizedOrReleased: false,
    studentResubmitCount: 0,
    lecturerReturnActive: false,
  };

  it("allows resubmit while open and before review", () => {
    assert.equal(canStudentInitiateResubmit(base).ok, true);
  });

  it("blocks after lecturer starts review", () => {
    const r = canStudentInitiateResubmit({ ...base, reviewStarted: true });
    assert.equal(r.ok, false);
  });

  it("blocks after close unless lecturer return is active", () => {
    const closed = canStudentInitiateResubmit({
      ...base,
      exerciseStatus: ExerciseStatus.CLOSED,
      now: new Date("2026-09-21T12:00:00Z"),
    });
    assert.equal(closed.ok, false);
    const returned = canStudentInitiateResubmit({
      ...base,
      exerciseStatus: ExerciseStatus.CLOSED,
      now: new Date("2026-09-21T12:00:00Z"),
      lecturerReturnActive: true,
    });
    assert.equal(returned.ok, true);
  });

  it("enforces the 10-cap", () => {
    const r = canStudentInitiateResubmit({ ...base, studentResubmitCount: 10 });
    assert.equal(r.ok, false);
  });
});

describe("canReplacePageDuringGrace", () => {
  const expires = new Date("2026-09-10T12:30:00Z");
  const now = new Date("2026-09-10T12:10:00Z");

  it("allows replace only for technical/upload failure", () => {
    assert.equal(
      canReplacePageDuringGrace({
        reservationActive: true,
        graceExpiresAt: expires,
        now,
        quality: PageQuality.FAIL_BLUR,
        checksumFailed: false,
      }).ok,
      true,
    );
    assert.equal(
      canReplacePageDuringGrace({
        reservationActive: true,
        graceExpiresAt: expires,
        now,
        quality: PageQuality.OK,
        checksumFailed: false,
      }).ok,
      false,
    );
  });

  it("rejects after grace", () => {
    assert.equal(
      canReplacePageDuringGrace({
        reservationActive: true,
        graceExpiresAt: expires,
        now: new Date("2026-09-10T12:31:00Z"),
        quality: PageQuality.FAIL_BLUR,
        checksumFailed: false,
      }).ok,
      false,
    );
  });
});
