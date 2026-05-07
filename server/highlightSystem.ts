/**
 * Highlight/Replay system for epic game moments
 */

import { nanoid } from "nanoid";

export interface Highlight {
  id: string;
  roomId: string;
  gameHistoryId?: string;
  title: string;
  description: string;
  players: Array<{
    id: number;
    name: string;
    score: number;
  }>;
  epicMoment: string; // Description of what made it epic
  views: number;
  likes: number;
  createdAt: number;
}

const highlights = new Map<string, Highlight>();

/**
 * Create a highlight
 */
export function createHighlight(
  roomId: string,
  title: string,
  description: string,
  players: Array<{ id: number; name: string; score: number }>,
  epicMoment: string
): Highlight {
  const highlight: Highlight = {
    id: nanoid(),
    roomId,
    title,
    description,
    players,
    epicMoment,
    views: 0,
    likes: 0,
    createdAt: Date.now(),
  };

  highlights.set(highlight.id, highlight);
  return highlight;
}

/**
 * Get highlight by ID
 */
export function getHighlight(id: string): Highlight | null {
  return highlights.get(id) || null;
}

/**
 * Get all highlights
 */
export function getAllHighlights(): Highlight[] {
  return Array.from(highlights.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get top highlights by views
 */
export function getTopHighlights(limit: number = 10): Highlight[] {
  return Array.from(highlights.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/**
 * Get trending highlights
 */
export function getTrendingHighlights(limit: number = 10): Highlight[] {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  return Array.from(highlights.values())
    .filter((h) => now - h.createdAt < oneDayMs) // Last 24 hours
    .sort((a, b) => {
      // Score based on views and likes
      const scoreA = a.views * 0.7 + a.likes * 0.3;
      const scoreB = b.views * 0.7 + b.likes * 0.3;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Increment view count
 */
export function incrementViews(id: string): Highlight | null {
  const highlight = highlights.get(id);
  if (highlight) {
    highlight.views++;
    highlights.set(id, highlight);
    return highlight;
  }
  return null;
}

/**
 * Like a highlight
 */
export function likeHighlight(id: string): Highlight | null {
  const highlight = highlights.get(id);
  if (highlight) {
    highlight.likes++;
    highlights.set(id, highlight);
    return highlight;
  }
  return null;
}

/**
 * Get highlights by player
 */
export function getHighlightsByPlayer(playerId: number): Highlight[] {
  return Array.from(highlights.values())
    .filter((h) => h.players.some((p) => p.id === playerId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Delete highlight
 */
export function deleteHighlight(id: string): boolean {
  return highlights.delete(id);
}

/**
 * Get highlight statistics
 */
export function getHighlightStats() {
  const allHighlights = Array.from(highlights.values());
  const totalViews = allHighlights.reduce((sum, h) => sum + h.views, 0);
  const totalLikes = allHighlights.reduce((sum, h) => sum + h.likes, 0);

  return {
    totalHighlights: allHighlights.length,
    totalViews,
    totalLikes,
    averageViews: allHighlights.length > 0 ? Math.round(totalViews / allHighlights.length) : 0,
    averageLikes: allHighlights.length > 0 ? Math.round(totalLikes / allHighlights.length) : 0,
  };
}
