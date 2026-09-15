export type PortalRole = "STUDENT" | "LECTURER" | "ADMIN";

export function homePath(role?: string | null): string {
  if (role === "LECTURER") return "/lecturer/dashboard";
  if (role === "ADMIN") return "/admin";
  if (role === "STUDENT") return "/student/dashboard";
  return "/";
}

export function loginPath(role?: string | null): string {
  if (role === "LECTURER") return "/lecturer/login";
  if (role === "ADMIN") return "/admin/login";
  if (role === "STUDENT") return "/student/login";
  return "/";
}

export function portalPath(role?: string | null): string {
  if (role === "LECTURER") return "/lecturer";
  if (role === "ADMIN") return "/admin";
  if (role === "STUDENT") return "/student";
  return "/";
}
