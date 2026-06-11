import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'home' | 'list' | 'wallet' | 'chart' | 'cog' | 'plus'
  | 'arrow-up' | 'arrow-down' | 'arrow-up-right' | 'arrow-down-left' | 'transfer'
  | 'bell' | 'search' | 'filter' | 'calendar' | 'check' | 'x'
  | 'chevron-right' | 'chevron-left' | 'chevron-down' | 'chevron-up'
  | 'more-h' | 'more-v' | 'eye' | 'eye-off' | 'edit' | 'trash'
  | 'sun' | 'moon'
  | 'utensils' | 'cart' | 'car' | 'bolt' | 'sparkles' | 'heart' | 'bag' | 'rotate' | 'book'
  | 'briefcase' | 'laptop' | 'gift' | 'trending' | 'more'
  | 'plane' | 'shield' | 'piggy' | 'cash' | 'card'
  | 'logout' | 'globe' | 'lock' | 'help' | 'flame' | 'lightbulb' | 'pin'
  | 'tag' | 'note' | 'send' | 'target' | 'smartphone';

export interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 20, color = '#000', strokeWidth = 2, style }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };
  switch (name) {
    case 'home':
      return <Svg {...common}><Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z" /></Svg>;
    case 'list':
      return <Svg {...common}><Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>;
    case 'wallet':
      return <Svg {...common}>
        <Path d="M19 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
        <Path d="M21 12H17a2 2 0 0 0 0 4h4" />
        <Path d="M21 12V8a1 1 0 0 0-1-1H6a3 3 0 0 1-3-3" />
      </Svg>;
    case 'chart':
      return <Svg {...common}><Path d="M3 3v18h18M7 14l4-4 4 4 5-6" /></Svg>;
    case 'cog':
      return <Svg {...common}>
        <Circle cx="12" cy="12" r="3" />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </Svg>;
    case 'plus':
      return <Svg {...common}><Path d="M12 5v14M5 12h14" /></Svg>;
    case 'arrow-up':
      return <Svg {...common}><Path d="M12 19V5M5 12l7-7 7 7" /></Svg>;
    case 'arrow-down':
      return <Svg {...common}><Path d="M12 5v14M5 12l7 7 7-7" /></Svg>;
    case 'arrow-up-right':
      return <Svg {...common}><Path d="M7 17 17 7M7 7h10v10" /></Svg>;
    case 'arrow-down-left':
      return <Svg {...common}><Path d="M17 7 7 17M17 17H7V7" /></Svg>;
    case 'transfer':
      return <Svg {...common}><Path d="M17 3v18M21 7l-4-4-4 4M7 21V3M3 17l4 4 4-4" /></Svg>;
    case 'bell':
      return <Svg {...common}>
        <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </Svg>;
    case 'search':
      return <Svg {...common}>
        <Circle cx="11" cy="11" r="8" />
        <Path d="m21 21-4.3-4.3" />
      </Svg>;
    case 'filter':
      return <Svg {...common}><Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" /></Svg>;
    case 'calendar':
      return <Svg {...common}>
        <Rect width="18" height="18" x="3" y="4" rx="2" />
        <Path d="M16 2v4M8 2v4M3 10h18" />
      </Svg>;
    case 'check':
      return <Svg {...common}><Path d="M20 6 9 17l-5-5" /></Svg>;
    case 'x':
      return <Svg {...common}><Path d="M18 6 6 18M6 6l12 12" /></Svg>;
    case 'chevron-right':
      return <Svg {...common}><Path d="m9 18 6-6-6-6" /></Svg>;
    case 'chevron-left':
      return <Svg {...common}><Path d="m15 18-6-6 6-6" /></Svg>;
    case 'chevron-down':
      return <Svg {...common}><Path d="m6 9 6 6 6-6" /></Svg>;
    case 'chevron-up':
      return <Svg {...common}><Path d="m18 15-6-6-6 6" /></Svg>;
    case 'more-h':
      return <Svg {...common}>
        <Circle cx="12" cy="12" r="1" />
        <Circle cx="19" cy="12" r="1" />
        <Circle cx="5" cy="12" r="1" />
      </Svg>;
    case 'more-v':
      return <Svg {...common}>
        <Circle cx="12" cy="5" r="1" />
        <Circle cx="12" cy="12" r="1" />
        <Circle cx="12" cy="19" r="1" />
      </Svg>;
    case 'eye':
      return <Svg {...common}>
        <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <Circle cx="12" cy="12" r="3" />
      </Svg>;
    case 'eye-off':
      return <Svg {...common}>
        <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <Path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <Path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <Line x1="2" y1="2" x2="22" y2="22" />
      </Svg>;
    case 'edit':
      return <Svg {...common}>
        <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <Path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </Svg>;
    case 'trash':
      return <Svg {...common}><Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Svg>;
    case 'sun':
      return <Svg {...common}>
        <Circle cx="12" cy="12" r="4" />
        <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </Svg>;
    case 'moon':
      return <Svg {...common}><Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></Svg>;
    case 'utensils':
      return <Svg {...common}><Path d="M3 2v7c0 1.1.9 2 2 2h2v11h2V2H7v7H5V2H3zM21 15.5V2c-3 0-5 2-5 5v5c0 1.1.9 2 2 2h1v7h2v-5.5z" /></Svg>;
    case 'cart':
      return <Svg {...common}>
        <Circle cx="9" cy="21" r="1" />
        <Circle cx="20" cy="21" r="1" />
        <Path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
      </Svg>;
    case 'car':
      return <Svg {...common}>
        <Path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
        <Circle cx="6.5" cy="16.5" r="2.5" />
        <Circle cx="16.5" cy="16.5" r="2.5" />
      </Svg>;
    case 'bolt':
      return <Svg {...common}><Path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></Svg>;
    case 'sparkles':
      return <Svg {...common}><Path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" /></Svg>;
    case 'heart':
      return <Svg {...common}><Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></Svg>;
    case 'bag':
      return <Svg {...common}>
        <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <Line x1="3" y1="6" x2="21" y2="6" />
        <Path d="M16 10a4 4 0 0 1-8 0" />
      </Svg>;
    case 'rotate':
      return <Svg {...common}>
        <Path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <Polyline points="21 3 21 8 16 8" />
      </Svg>;
    case 'book':
      return <Svg {...common}><Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Svg>;
    case 'briefcase':
      return <Svg {...common}>
        <Rect width="20" height="14" x="2" y="7" rx="2" />
        <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </Svg>;
    case 'laptop':
      return <Svg {...common}>
        <Rect width="18" height="12" x="3" y="4" rx="2" />
        <Path d="M2 20h20" />
      </Svg>;
    case 'gift':
      return <Svg {...common}>
        <Polyline points="20 12 20 22 4 22 4 12" />
        <Rect x="2" y="7" width="20" height="5" />
        <Line x1="12" y1="22" x2="12" y2="7" />
        <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </Svg>;
    case 'trending':
      return <Svg {...common}>
        <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <Polyline points="16 7 22 7 22 13" />
      </Svg>;
    case 'more':
      return <Svg {...common}>
        <Circle cx="12" cy="12" r="9" />
        <Circle cx="12" cy="12" r="1" />
      </Svg>;
    case 'plane':
      return <Svg {...common}><Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></Svg>;
    case 'shield':
      return <Svg {...common}><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>;
    case 'piggy':
      return <Svg {...common}>
        <Path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-7.5 0-9 2-1.5 2-1.5 5 0 7 1.6 2.1 1 4 0 4h7c0-1.5.5-3 2-4 1.5-1 2-2.5 2-4 0-3-2.5-7-2-7 1.5 0 3-1.5 3-2 0-.5 0 0 0 0z" />
        <Circle cx="13" cy="9" r="1" />
      </Svg>;
    case 'cash':
      return <Svg {...common}>
        <Rect width="20" height="12" x="2" y="6" rx="2" />
        <Circle cx="12" cy="12" r="2" />
        <Path d="M6 12h.01M18 12h.01" />
      </Svg>;
    case 'card':
      return <Svg {...common}>
        <Rect width="20" height="14" x="2" y="5" rx="2" />
        <Line x1="2" y1="10" x2="22" y2="10" />
      </Svg>;
    case 'logout':
      return <Svg {...common}><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Svg>;
    case 'globe':
      return <Svg {...common}>
        <Circle cx="12" cy="12" r="10" />
        <Line x1="2" y1="12" x2="22" y2="12" />
        <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </Svg>;
    case 'lock':
      return <Svg {...common}>
        <Rect width="18" height="11" x="3" y="11" rx="2" />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </Svg>;
    case 'help':
      return <Svg {...common}>
        <Circle cx="12" cy="12" r="10" />
        <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <Line x1="12" y1="17" x2="12.01" y2="17" />
      </Svg>;
    case 'flame':
      return <Svg {...common}><Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></Svg>;
    case 'lightbulb':
      return <Svg {...common}><Path d="M9 18h6M10 22h4M15 14c.5-1 1.5-2 1.5-4a4.5 4.5 0 1 0-9 0c0 2 1 3 1.5 4z" /></Svg>;
    case 'pin':
      return <Svg {...common}>
        <Path d="M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13z" />
        <Circle cx="12" cy="9" r="3" />
      </Svg>;
    case 'tag':
      return <Svg {...common}>
        <Path d="M20.59 13.41 12 22l-9-9V3h10z" />
        <Line x1="7" y1="7" x2="7.01" y2="7" />
      </Svg>;
    case 'note':
      return <Svg {...common}>
        <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <Polyline points="14 2 14 8 20 8" />
      </Svg>;
    case 'send':
      return <Svg {...common}>
        <Path d="m22 2-7 20-4-9-9-4z" />
        <Path d="M22 2 11 13" />
      </Svg>;
    case 'target':
      return <Svg {...common}>
        <Circle cx="12" cy="12" r="10" />
        <Circle cx="12" cy="12" r="6" />
        <Circle cx="12" cy="12" r="2" />
      </Svg>;
    case 'smartphone':
      return <Svg {...common}>
        <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <Line x1="12" y1="18" x2="12.01" y2="18" />
      </Svg>;
    default:
      return <Svg {...common}><Circle cx="12" cy="12" r="8" /></Svg>;
  }
}
