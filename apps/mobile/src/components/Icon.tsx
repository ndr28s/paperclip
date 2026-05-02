// @ts-nocheck  — react-native-svg 15.x class types conflict with @types/react 18.3; runtime is correct
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = 'currentColor', strokeWidth = 1.8 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const };
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'grid': return (
      <Svg {...p}><Rect x="3" y="3" width="7" height="7" rx="1.5" {...s} /><Rect x="14" y="3" width="7" height="7" rx="1.5" {...s} /><Rect x="3" y="14" width="7" height="7" rx="1.5" {...s} /><Rect x="14" y="14" width="7" height="7" rx="1.5" {...s} /></Svg>
    );
    case 'user': return (
      <Svg {...p}><Circle cx="12" cy="8" r="4" {...s} /><Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" {...s} /></Svg>
    );
    case 'check': return (
      <Svg {...p}><Path d="M9 11l3 3L20 6" {...s} /><Path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" {...s} /></Svg>
    );
    case 'folder': return (
      <Svg {...p}><Path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" {...s} /></Svg>
    );
    case 'more': return (
      <Svg {...p}><Circle cx="6" cy="12" r="1.4" fill={color} /><Circle cx="12" cy="12" r="1.4" fill={color} /><Circle cx="18" cy="12" r="1.4" fill={color} /></Svg>
    );
    case 'bell': return (
      <Svg {...p}><Path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" {...s} /><Path d="M10 21a2 2 0 004 0" {...s} /></Svg>
    );
    case 'bell2': return (
      <Svg {...p}><Path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" {...s} /><Path d="M10 21a2 2 0 004 0" {...s} /></Svg>
    );
    case 'search': return (
      <Svg {...p}><Circle cx="11" cy="11" r="7" {...s} /><Path d="M21 21l-4.3-4.3" {...s} /></Svg>
    );
    case 'arrow': return (
      <Svg {...p}><Path d="M5 12h14M13 6l6 6-6 6" {...s} /></Svg>
    );
    case 'back': return (
      <Svg {...p}><Path d="M19 12H5M11 6l-6 6 6 6" {...s} /></Svg>
    );
    case 'plus': return (
      <Svg {...p}><Path d="M12 5v14M5 12h14" {...s} /></Svg>
    );
    case 'chev': return (
      <Svg {...p}><Path d="M9 6l6 6-6 6" {...s} /></Svg>
    );
    case 'caret': return (
      <Svg {...p}><Path d="M6 9l6 6 6-6" {...s} /></Svg>
    );
    case 'list': return (
      <Svg {...p}><Path d="M8 6h13M8 12h13M8 18h13" {...s} /><Circle cx="4" cy="6" r="1" fill={color} /><Circle cx="4" cy="12" r="1" fill={color} /><Circle cx="4" cy="18" r="1" fill={color} /></Svg>
    );
    case 'board': return (
      <Svg {...p}><Rect x="3" y="4" width="5" height="16" rx="1.5" {...s} /><Rect x="10" y="4" width="5" height="10" rx="1.5" {...s} /><Rect x="17" y="4" width="4" height="14" rx="1.5" {...s} /></Svg>
    );
    case 'wave': return (
      <Svg {...p}><Path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" {...s} /></Svg>
    );
    case 'coin': return (
      <Svg {...p}><Circle cx="12" cy="12" r="8" {...s} /><Path d="M9 9.5c0-1 1-2 3-2s3 1 3 2-1 1.5-3 2-3 1-3 2 1 2 3 2 3-1 3-2" {...s} /><Path d="M12 6v12" {...s} /></Svg>
    );
    case 'tree': return (
      <Svg {...p}><Circle cx="12" cy="5" r="2" {...s} /><Circle cx="5" cy="19" r="2" {...s} /><Circle cx="19" cy="19" r="2" {...s} /><Path d="M12 7v4M5 17v-2a2 2 0 012-2h10a2 2 0 012 2v2" {...s} /></Svg>
    );
    case 'cal': return (
      <Svg {...p}><Rect x="3" y="5" width="18" height="16" rx="2" {...s} /><Path d="M3 9h18M8 3v4M16 3v4" {...s} /></Svg>
    );
    case 'sun': return (
      <Svg {...p}><Circle cx="12" cy="12" r="4" {...s} /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...s} /></Svg>
    );
    case 'out': return (
      <Svg {...p}><Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" {...s} /></Svg>
    );
    case 'flag': return (
      <Svg {...p}><Path d="M5 21V4M5 4h11l-2 4 2 4H5" {...s} /></Svg>
    );
    case 'sparkle': return (
      <Svg {...p}><Path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2" {...s} /></Svg>
    );
    case 'zap': return (
      <Svg {...p}><Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" {...s} /></Svg>
    );
    case 'pause': return (
      <Svg {...p}><Rect x="6" y="5" width="4" height="14" rx="1" {...s} /><Rect x="14" y="5" width="4" height="14" rx="1" {...s} /></Svg>
    );
    case 'edit': return (
      <Svg {...p}><Path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" {...s} /><Path d="M18.5 2.5a2.1 2.1 0 113 3L12 15l-4 1 1-4 9.5-9.5z" {...s} /></Svg>
    );
    case 'msg': return (
      <Svg {...p}><Path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z" {...s} /></Svg>
    );
    case 'x': return (
      <Svg {...p}><Path d="M6 6l12 12M18 6l-12 12" {...s} /></Svg>
    );
    case 'ship': return (
      <Svg {...p}><Path d="M3 17l9 4 9-4M3 12l9 4 9-4M12 3L3 7l9 4 9-4-9-4z" {...s} /></Svg>
    );
    case 'note': return (
      <Svg {...p}><Path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" {...s} /><Path d="M14 3v6h6" {...s} /></Svg>
    );
    case 'ask': return (
      <Svg {...p}><Circle cx="12" cy="12" r="9" {...s} /><Path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4M12 17.5h0" {...s} /></Svg>
    );
    case 'spend': return (
      <Svg {...p}><Path d="M12 2v20M17 5H9a3 3 0 000 6h6a3 3 0 010 6H6" {...s} /></Svg>
    );
    default: return null;
  }
};
