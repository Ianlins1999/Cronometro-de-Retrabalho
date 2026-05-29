/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  hourlyRate: number;
  avatarUrl: string;
}

export interface Session {
  id: string;
  userId: string;
  description: string;
  project: string; // e.g. "Brand Identity", "Product Design"
  secondsElapsed: number;
  hourlyRate?: number; // billing rate at the time of session tracking
  createdAt: string; // ISO string
}
