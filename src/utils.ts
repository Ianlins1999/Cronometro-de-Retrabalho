/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Session } from "./types";

/**
 * Formats a duration in seconds to "HH:MM:SS"
 */
export function formatTimeHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

/**
 * Formats a duration in seconds into a friendly description like "Xh Ymin" or "X min"
 */
export function formatFriendlyDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  }
  return `${Math.max(1, m)} min`;
}

/**
 * Formats an ISO date string to a beautiful presentation format like "May 28, 2026"
 */
export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Calculates payment amount based on seconds of work and hourly rate
 */
export function calculateEarnings(seconds: number, hourlyRate: number): number {
  const hours = seconds / 3600;
  return Number((hours * hourlyRate).toFixed(2));
}

/**
 * Checks if a session date is within the last 7 days (including today)
 */
export function isWithinLast7Days(isoString: string, referenceDateStr: string = "2026-05-29T13:54:20Z"): boolean {
  const sessionDate = new Date(isoString);
  const refDate = new Date(referenceDateStr);
  
  // Set times to midnight for precise date range checks
  const sessionMidnight = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
  const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  
  const diffTime = refMidnight.getTime() - sessionMidnight.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays >= 0 && diffDays < 7;
}

/**
 * Helper to get initial sessions matching mockups but with relative, current dates
 */
export function getInitialMockSessions(userId: string): Session[] {
  const baseDate = new Date("2026-05-29T13:54:20Z");
  
  const d = (daysAgo: number, timeStr: string) => {
    const res = new Date(baseDate);
    res.setDate(baseDate.getDate() - daysAgo);
    const [hours, minutes] = timeStr.split(":").map(Number);
    res.setHours(hours, minutes, 0, 0);
    return res.toISOString();
  };

  return [
    {
      id: "mock-1",
      userId,
      description: "retrabalho por briefing vago",
      project: "Brand Identity",
      secondsElapsed: 15150, // 04:12:30 -> $252.50 at $60/hr
      hourlyRate: 60,
      createdAt: d(1, "14:30"), // yesterday
    },
    {
      id: "mock-2",
      userId,
      description: "Final UI Design - ChronoFocus Shell",
      project: "Product Design",
      secondsElapsed: 30240, // 08:24:00 -> $504.00 at $60/hr
      hourlyRate: 60,
      createdAt: d(2, "09:15"), // 2 days ago
    },
    {
      id: "mock-3",
      userId,
      description: "Moodboard exploration for Indigo palette",
      project: "Brand Identity",
      secondsElapsed: 8145, // 02:15:45 -> $135.75 at $60/hr
      hourlyRate: 60,
      createdAt: d(2, "16:00"), // 2 days ago
    },
    {
      id: "mock-4",
      userId,
      description: "Heuristic evaluation and copywriting for landing page",
      project: "UX Writing",
      secondsElapsed: 43200, // 12h 00m -> $720.00 at $60/hr
      hourlyRate: 60,
      createdAt: d(4, "10:00"), // 4 days ago
    },
    {
      id: "mock-5",
      userId,
      description: "Design-system token setup and layout tests",
      project: "Product Design",
      secondsElapsed: 42600, // 11h 50m -> $710.00 at $60/hr
      hourlyRate: 60,
      createdAt: d(5, "08:30"), // 5 days ago
    },
  ];
}
