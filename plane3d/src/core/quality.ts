// Quality tiers for AIRCRAFT-001, keyed to the display resolution class the user
// asked for: 1080p, 1440p ("2K") and 2160p (4K). A tier controls everything that
// costs GPU time: device pixel ratio cap, geometry segment density, shadow map size,
// antialiasing and whether the cabin interior is built at all.
//
// The unit scale of the model does NOT affect performance; triangle count and pixel
// count do. That is why the tiers act on segments and pixels rather than on size.

export type QualityTier = 'T1080' | 'T1440' | 'T2160';

export interface QualityProfile {
  tier: QualityTier;
  /** Cap applied to window.devicePixelRatio. */
  maxPixelRatio: number;
  /** Multiplier for radial/lengthwise segment counts in procedural geometry (1 = base). */
  segmentScale: number;
  /** Shadow map resolution (square). */
  shadowMapSize: number;
  /** Multisample antialiasing on the renderer. */
  antialias: boolean;
  /** Whether to build the cabin interior (seats, bins) up front. */
  buildInterior: boolean;
  /** Approximate triangle budget the tier is designed for. */
  triangleBudget: number;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  T1080: { tier: 'T1080', maxPixelRatio: 1.0, segmentScale: 0.6, shadowMapSize: 1024, antialias: true, buildInterior: true, triangleBudget: 150_000 },
  T1440: { tier: 'T1440', maxPixelRatio: 1.5, segmentScale: 1.0, shadowMapSize: 2048, antialias: true, buildInterior: true, triangleBudget: 300_000 },
  T2160: { tier: 'T2160', maxPixelRatio: 2.0, segmentScale: 1.5, shadowMapSize: 4096, antialias: true, buildInterior: true, triangleBudget: 600_000 },
};

/**
 * Pick a tier from the physical pixel width of the drawing surface.
 * Boundaries: <= 1920 → 1080p tier, <= 2560 → 1440p tier, else 4K tier.
 * An explicit `?quality=T1080|T1440|T2160` URL override always wins so the same
 * machine can be tested at every tier.
 */
export function pickQualityTier(cssWidth: number, devicePixelRatio: number, override?: string | null): QualityTier {
  if (override && override in QUALITY_PROFILES) return override as QualityTier;
  const physical = Math.max(1, Math.round(cssWidth * Math.max(1, devicePixelRatio)));
  if (physical <= 1920) return 'T1080';
  if (physical <= 2560) return 'T1440';
  return 'T2160';
}

/** Scale a base segment count by the tier, clamped to a sane minimum. */
export function seg(base: number, profile: QualityProfile, min = 6): number {
  return Math.max(min, Math.round(base * profile.segmentScale));
}
