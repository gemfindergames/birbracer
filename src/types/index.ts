// ─────────────────────────────────────────────
// BirbRacer — Shared Types
// ─────────────────────────────────────────────

export type { CarConfig } from "@/config/cars";

export type RaceStatus = "LOBBY" | "CAR_SELECT" | "COUNTDOWN" | "RACING" | "FINISHED" | "ARCHIVED";
export type CarLockStatus = "LOCKED" | "CONFIRMED" | "EXPIRED";

// ─── Track Config ─────────────────────────────

export interface SceneryElement {
  type: "mountain" | "building" | "tree" | "star" | "cloud" | "cactus" | "rock" | "planet" | "snowpeak" | "lamppost" | "dune" | "mesa" | "barn" | "silo" | "fence";
  x: number;
  y: number;
  size: number;
  color: string;
  color2?: string;
  parallaxSpeed: number;
}

export interface TrackConfig {
  id: string;
  name: string;
  backgroundImage: string;
  groundColor: string;
  skyGradient: [string, string];
  laneLineColor: string;
  skyColors: string[];
  horizonColor: string;
  groundGradient: [string, string];
  trackSurface: string;
  trackLine: string;
  atmosphereColor: string;
  particleColor: string;
  sceneryElements: SceneryElement[];
  finishLineStyle: "classic" | "neon" | "ice" | "gold";
}

// ─── User ─────────────────────────────────────

export interface UserPublic {
  id: string;
  username: string;
  avatarEmoji: string | null;
  avatarImage: string | null;
  isAdmin: boolean;
}

export interface UserSecurity extends UserPublic {
  ipAddress: string | null;
  country: string | null;
  countryCode: string | null;
  createdAt: string;
}

// ─── Race ─────────────────────────────────────

export interface RacePublic {
  id: string;
  name: string;
  status: RaceStatus;
  trackId: string;
  maxPlayers: number;
  raceDuration: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  participants: ParticipantPublic[];
  carSelections: CarSelectionPublic[];
}

export interface ParticipantPublic {
  id: string;
  userId: string;
  username: string;
  avatarEmoji: string | null;
  avatarImage: string | null;
  lane: number | null;
  carId: string | null;
}

export interface CarSelectionPublic {
  id: string;
  raceId: string;
  userId: string;
  carId: string;
  lockStatus: CarLockStatus;
  lockedUntil: string;
  confirmedAt: string | null;
}

export interface RaceResultPublic {
  id: string;
  raceId: string;
  userId: string;
  username: string;
  avatarEmoji: string | null;
  avatarImage: string | null;
  carId: string;
  position: number;
  finishTime: number;
}

export interface EmojiReactionPublic {
  id: string;
  raceId: string;
  userId: string;
  username: string;
  emoji: string;
  createdAt: string;
}

// ─── SSE ──────────────────────────────────────

export type SSEEventType =
  | "race:update" | "race:countdown" | "race:positions" | "race:finished"
  | "car:locked" | "car:confirmed" | "car:released"
  | "player:joined" | "player:left" | "emoji:new";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: number;
}

export interface RacerAnimState {
  userId: string;
  username: string;
  carId: string;
  lane: number;
  progress: number;
  speed: number;
  finished: boolean;
  finishTime: number | null;
  avatarEmoji: string | null;
  avatarImage: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type Locale = "en" | "es" | "tr" | "zh" | "hi" | "ms" | "ru" | "fr" | "it";

export interface LocaleConfig {
  code: Locale;
  name: string;
  flag: string;
}
