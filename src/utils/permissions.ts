import type { StaffUser } from "@/stores/authStore";

export function isAdmin(user?: StaffUser | null) {
  return user?.role === "admin";
}

export function isMecanico(user?: StaffUser | null) {
  return user?.role === "mecanico";
}

export function canManageWorkshop(user?: StaffUser | null) {
  return isAdmin(user) || isMecanico(user);
}

export function isChalan(user?: StaffUser | null) {
  return user?.role === "chalan";
}

export function roleLabel(user?: StaffUser | null) {
  if (isAdmin(user)) return "Admin";
  if (isMecanico(user)) return "Mecanico";
  return "Chalan";
}

export const workshopManagerOnlyMessage = "Solo el admin o mecanico principal puede realizar esta accion.";
