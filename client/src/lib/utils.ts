import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Format date to relative time (today, yesterday, X days ago)
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const inputDate = new Date(date);
  
  const diffTime = Math.abs(now.getTime() - inputDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
}

// Get grade display label
export function getGradeLabel(grade: string): string {
  return grade === 'K' ? 'Kindergarten' : `Grade ${grade}`;
}

// Get badge for streaks
export function getStreakBadge(streakDays: number): string {
  if (streakDays >= 30) return "Math Master";
  if (streakDays >= 14) return "Math Pro";
  if (streakDays >= 7) return "On Fire!";
  if (streakDays >= 3) return "Getting Started";
  return "New Learner";
}

// Get token milestone
export function getTokenMilestone(tokens: number): string {
  if (tokens >= 1000) return "Math Genius";
  if (tokens >= 500) return "Math Wizard";
  if (tokens >= 200) return "Math Explorer";
  if (tokens >= 100) return "Math Apprentice";
  return "Math Beginner";
}

// Animate number counting up
export function animateValue(
  start: number, 
  end: number, 
  duration: number,
  callback: (value: number) => void
): void {
  let startTimestamp: number | null = null;
  const step = (timestamp: number) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentValue = Math.floor(progress * (end - start) + start);
    callback(currentValue);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}
