// ─────────────────────────────────────────────
// BirbRacer — Central Car Configuration (12 Cars)
// ─────────────────────────────────────────────
//
// TO ADD A NEW CAR:
//   1. Drop PNG at /public/cars/car-13.png
//   2. Add entry to CARS array below
//   3. Done.
// ─────────────────────────────────────────────

export interface CarConfig {
  id: string;
  name: string;
  imagePath: string;
  accentColor: string;
  available: boolean;
  wheelFrontX: number;
  wheelFrontY: number;
  wheelBackX: number;
  wheelBackY: number;
  exhaustX: number;
  exhaustY: number;
  scale: number;
  rarity?: "common" | "rare" | "epic" | "legendary";
  description?: string;
}

export const CARS: CarConfig[] = [
  {
    id: "car-01",
    name: "Ace Racer",
    imagePath: "/cars/car-01.png",
    accentColor: "#1e40af",
    available: true,
    wheelFrontX: 0.80, wheelFrontY: 0.82,
    wheelBackX: 0.28, wheelBackY: 0.82,
    exhaustX: 0.02, exhaustY: 0.58, scale: 1.0,
    rarity: "common",
    description: "Classic blue speedster with rocket boost",
  },
  {
    id: "car-02",
    name: "Tuk-Tuk Express",
    imagePath: "/cars/car-02.png",
    accentColor: "#eab308",
    available: true,
    wheelFrontX: 0.85, wheelFrontY: 0.85,
    wheelBackX: 0.20, wheelBackY: 0.85,
    exhaustX: 0.02, exhaustY: 0.60, scale: 1.0,
    rarity: "rare",
    description: "Three-wheeled chaos from the streets",
  },
  {
    id: "car-03",
    name: "Dark Knight",
    imagePath: "/cars/car-03.png",
    accentColor: "#1f2937",
    available: true,
    wheelFrontX: 0.80, wheelFrontY: 0.82,
    wheelBackX: 0.25, wheelBackY: 0.82,
    exhaustX: 0.02, exhaustY: 0.58, scale: 1.0,
    rarity: "epic",
    description: "The hero this race deserves",
  },
  {
    id: "car-04",
    name: "Vintage Cruiser",
    imagePath: "/cars/car-04.png",
    accentColor: "#dc2626",
    available: true,
    wheelFrontX: 0.82, wheelFrontY: 0.82,
    wheelBackX: 0.22, wheelBackY: 0.82,
    exhaustX: 0.02, exhaustY: 0.55, scale: 1.0,
    rarity: "rare",
    description: "Classy red convertible with style to spare",
  },
  {
    id: "car-05",
    name: "Ranch Rider",
    imagePath: "/cars/car-05.png",
    accentColor: "#b91c1c",
    available: true,
    wheelFrontX: 0.78, wheelFrontY: 0.84,
    wheelBackX: 0.25, wheelBackY: 0.84,
    exhaustX: 0.02, exhaustY: 0.60, scale: 1.0,
    rarity: "common",
    description: "Cowboy pickup with a chicken co-pilot",
  },
  {
    id: "car-06",
    name: "Bling Roller",
    imagePath: "/cars/car-06.png",
    accentColor: "#2563eb",
    available: true,
    wheelFrontX: 0.82, wheelFrontY: 0.82,
    wheelBackX: 0.20, wheelBackY: 0.82,
    exhaustX: 0.02, exhaustY: 0.55, scale: 1.0,
    rarity: "legendary",
    description: "Ice-cold luxury with all the drip",
  },
  {
    id: "car-07",
    name: "Star Fighter",
    imagePath: "/cars/car-07.png",
    accentColor: "#94a3b8",
    available: true,
    wheelFrontX: 0.85, wheelFrontY: 0.80,
    wheelBackX: 0.15, wheelBackY: 0.80,
    exhaustX: 0.02, exhaustY: 0.55, scale: 1.0,
    rarity: "legendary",
    description: "From a galaxy far, far away",
  },
  {
    id: "car-08",
    name: "Web Slinger",
    imagePath: "/cars/car-08.png",
    accentColor: "#ef4444",
    available: true,
    wheelFrontX: 0.80, wheelFrontY: 0.82,
    wheelBackX: 0.25, wheelBackY: 0.82,
    exhaustX: 0.02, exhaustY: 0.58, scale: 1.0,
    rarity: "epic",
    description: "With great speed comes great fun",
  },
  {
    id: "car-09",
    name: "Trail Blazer",
    imagePath: "/cars/car-09.png",
    accentColor: "#3b82f6",
    available: true,
    wheelFrontX: 0.78, wheelFrontY: 0.84,
    wheelBackX: 0.22, wheelBackY: 0.84,
    exhaustX: 0.02, exhaustY: 0.60, scale: 1.0,
    rarity: "common",
    description: "Rugged off-road adventurer",
  },
  {
    id: "car-10",
    name: "Cyber Truck",
    imagePath: "/cars/car-10.png",
    accentColor: "#6b7280",
    available: true,
    wheelFrontX: 0.80, wheelFrontY: 0.84,
    wheelBackX: 0.22, wheelBackY: 0.84,
    exhaustX: 0.02, exhaustY: 0.58, scale: 1.0,
    rarity: "rare",
    description: "Angular and unstoppable",
  },
  {
    id: "car-11",
    name: "Party Machine",
    imagePath: "/cars/car-11.png",
    accentColor: "#f59e0b",
    available: true,
    wheelFrontX: 0.80, wheelFrontY: 0.82,
    wheelBackX: 0.25, wheelBackY: 0.82,
    exhaustX: 0.02, exhaustY: 0.58, scale: 1.0,
    rarity: "epic",
    description: "Honk honk! The party has arrived",
  },
  {
    id: "car-12",
    name: "Time Machine",
    imagePath: "/cars/car-12.png",
    accentColor: "#a1a1aa",
    available: true,
    wheelFrontX: 0.82, wheelFrontY: 0.82,
    wheelBackX: 0.20, wheelBackY: 0.82,
    exhaustX: 0.02, exhaustY: 0.55, scale: 1.0,
    rarity: "legendary",
    description: "Where we're going, we don't need roads",
  },
];

export function getCarById(id: string): CarConfig | undefined {
  return CARS.find((c) => c.id === id);
}

export function getAvailableCars(): CarConfig[] {
  return CARS.filter((c) => c.available);
}

export function getAllCars(): CarConfig[] {
  return CARS;
}

const FALLBACK_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function getCarColor(car: CarConfig, index: number = 0): string {
  return car.accentColor || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}
