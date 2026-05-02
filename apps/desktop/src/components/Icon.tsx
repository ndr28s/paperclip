import React from "react";

interface IconProps {
  name: string;
  size?: number;
}

export function Icon({ name, size = 14 }: IconProps) {
  const s = size;
  const stroke = "currentColor";
  const sw = 1.5;
  switch (name) {
    case "grid": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke={stroke} strokeWidth={sw}/><rect x="9" y="2" width="5" height="5" rx="1" stroke={stroke} strokeWidth={sw}/><rect x="2" y="9" width="5" height="5" rx="1" stroke={stroke} strokeWidth={sw}/><rect x="9" y="9" width="5" height="5" rx="1" stroke={stroke} strokeWidth={sw}/></svg>;
    case "user": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.5" stroke={stroke} strokeWidth={sw}/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "issue": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth={sw}/><circle cx="8" cy="8" r="2" stroke={stroke} strokeWidth={sw}/></svg>;
    case "folder": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 5a1.5 1.5 0 0 1 1.5-1.5h2.4a1.5 1.5 0 0 1 1.05.43l.6.59A1.5 1.5 0 0 0 8.6 5H12.5A1.5 1.5 0 0 1 14 6.5v5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5V5Z" stroke={stroke} strokeWidth={sw}/></svg>;
    case "target": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth={sw}/><circle cx="8" cy="8" r="2.5" stroke={stroke} strokeWidth={sw}/><circle cx="8" cy="8" r="0.6" fill={stroke}/></svg>;
    case "tree": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="6" y="2" width="4" height="3" rx="0.5" stroke={stroke} strokeWidth={sw}/><rect x="2" y="11" width="4" height="3" rx="0.5" stroke={stroke} strokeWidth={sw}/><rect x="10" y="11" width="4" height="3" rx="0.5" stroke={stroke} strokeWidth={sw}/><path d="M8 5v3M4 11V8h8v3" stroke={stroke} strokeWidth={sw}/></svg>;
    case "check": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "coin": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth={sw}/><path d="M8 5v6M6 7h3a1.5 1.5 0 0 1 0 3H6" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "wave": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 8c1.2 0 1.2-3 2.4-3S5.6 11 6.8 11 8 5 9.2 5s1.2 3 2.4 3 1.2-2 2.4-2" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "calendar": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="1" stroke={stroke} strokeWidth={sw}/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "search": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke={stroke} strokeWidth={sw}/><path d="M10.5 10.5l3 3" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "plus": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "chev": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M5 6l3 3 3-3M5 10l3-3 3 3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/></svg>;
    case "filter": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2.5 4h11M4.5 8h7M6.5 12h3" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "bell": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 11V8a4 4 0 1 1 8 0v3l1 1.5H3L4 11Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "more": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="3.5" cy="8" r="1" fill={stroke}/><circle cx="8" cy="8" r="1" fill={stroke}/><circle cx="12.5" cy="8" r="1" fill={stroke}/></svg>;
    case "pulse": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 8h2.5l1.5-4 2.5 8 1.5-4 1.5 2H14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "lock": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke={stroke} strokeWidth={sw}/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke={stroke} strokeWidth={sw}/></svg>;
    case "chevron-right": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M6 3.5L10.5 8 6 12.5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "chevron-down": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3.5 6L8 10.5 12.5 6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "circle-check": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth={sw}/><path d="M5.5 8l2 2 3-3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "x": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke={stroke} strokeWidth={sw} strokeLinecap="round"/></svg>;
    case "send": return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 8L14 2.5l-3.5 12-2.5-5L2 8z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>;
    default: return null;
  }
}
