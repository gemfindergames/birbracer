// ─────────────────────────────────────────────
// BirbRacer — Car Exports (bridge)
// ─────────────────────────────────────────────
// Central config lives at @/config/cars.
// This file re-exports so existing imports from
// "@/lib/cars" continue working unchanged.
// ─────────────────────────────────────────────

export {
  CARS,
  getCarById,
  getAvailableCars,
  getAllCars,
  getCarColor,
} from "@/config/cars";

export type { CarConfig } from "@/config/cars";
