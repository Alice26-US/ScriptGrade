import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { studentFacingStatus } from "./student-visibility";

describe("studentFacingStatus", () => {
  it("does not expose AI_PROPOSED, IN_REVIEW, or GRADED before release", () => {
    for (const status of [
      "SUBMITTED",
      "PROCESSING",
      "AI_PROPOSED",
      "IN_REVIEW",
      "GRADED",
      "RELEASED",
    ]) {
      assert.equal(studentFacingStatus(status), "received");
    }
  });
});
