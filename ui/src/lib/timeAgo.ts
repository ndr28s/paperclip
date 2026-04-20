import i18n from "./i18n";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.round((now - then) / 1000);
  const isKo = i18n.language === "ko";

  if (seconds < MINUTE) return isKo ? "방금 전" : "just now";
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return isKo ? `${m}분 전` : `${m}m ago`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return isKo ? `${h}시간 전` : `${h}h ago`;
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return isKo ? `${d}일 전` : `${d}d ago`;
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return isKo ? `${w}주 전` : `${w}w ago`;
  }
  const mo = Math.floor(seconds / MONTH);
  return isKo ? `${mo}개월 전` : `${mo}mo ago`;
}
