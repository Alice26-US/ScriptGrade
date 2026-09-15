/** Students never see AI_PROPOSED / GRADED / IN_REVIEW — only a coarse status until release. */
export function studentFacingStatus(status: string): string {
  if (status === "RETURNED") return "returned";
  if (status === "UPLOADING" || status === "RESERVING") return "uploading";
  if (status === "DRAFT") return "draft";
  return "received";
}
