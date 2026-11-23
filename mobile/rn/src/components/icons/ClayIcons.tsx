/**
 * ClayIcons — unified vector icon set using react-native-svg.
 *
 * Each icon shares the same stroke width, line-cap style, and color tokens.
 * Replaces the random-emoji icon language across the Home screen and
 * BottomTabs with one consistent visual system.
 *
 * Used everywhere a feature/tab needs a clear icon. Children can inherit
 * color via the `color` prop.
 */
import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

export type ClayIconName =
  | 'home'
  | 'book'
  | 'compass'
  | 'games'
  | 'cards'
  | 'paw'
  | 'profile'
  | 'lexi'
  | 'star'
  | 'sparkle'
  | 'arrowRight'
  | 'arrowUp'
  | 'arrowLeft'
  | 'flame'
  | 'bolt'
  | 'check'
  | 'close'
  | 'refresh'
  | 'send'
  | 'mic'
  | 'play'
  | 'pause'
  | 'plus'
  | 'minus'
  | 'lock'
  | 'camera'
  | 'cloud';

export interface ClayIconProps {
  name: ClayIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const ClayIcon: React.FC<ClayIconProps> = ({
  name,
  size = 24,
  color = '#1A2744',
  strokeWidth = 2,
}) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'home':
      return (
        <Svg {...props}>
          <Path d="M3 11.5L12 4l9 7.5" />
          <Path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </Svg>
      );
    case 'book':
      return (
        <Svg {...props}>
          <Path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5" />
          <Path d="M4 4.5v15" />
          <Path d="M9 6h7M9 9h7M9 12h5" />
        </Svg>
      );
    case 'compass':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="9" />
          <Polyline points="15.5,8.5 13,13 8.5,15.5 11,11 15.5,8.5" />
        </Svg>
      );
    case 'games':
      return (
        <Svg {...props}>
          <Rect x="2" y="7" width="20" height="11" rx="5.5" />
          <Line x1="7" y1="11.5" x2="11" y2="11.5" />
          <Line x1="9" y1="9.5" x2="9" y2="13.5" />
          <Circle cx="16" cy="11.5" r="0.5" fill={color} stroke="none" />
          <Circle cx="18.5" cy="13.5" r="0.5" fill={color} stroke="none" />
        </Svg>
      );
    case 'cards':
      return (
        <Svg {...props}>
          <Rect x="3" y="5" width="14" height="18" rx="2.5" />
          <Path d="M7 10h6M7 14h6M7 18h3" />
          <Rect x="6" y="3" width="14" height="18" rx="2.5" transform="skewY(-6)" opacity="0.4" />
        </Svg>
      );
    case 'paw':
      return (
        <Svg {...props}>
          <Circle cx="6" cy="9" r="2" />
          <Circle cx="18" cy="9" r="2" />
          <Circle cx="9" cy="14" r="1.8" />
          <Circle cx="15" cy="14" r="1.8" />
          <Path d="M8 19c0-2.2 1.8-4 4-4s4 1.8 4 4c0 0.9-0.7 1.5-1.5 1.5h-5C8.7 20.5 8 19.9 8 19z" />
        </Svg>
      );
    case 'profile':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </Svg>
      );
    case 'lexi':
      // butterfly
      return (
        <Svg {...props}>
          <Path d="M12 21V12" />
          <Path d="M12 12c-3-3-7-3-8-1s1 5 4 5 4-2 4-4z" />
          <Path d="M12 12c3-3 7-3 8-1s-1 5-4 5-4-2-4-4z" />
          <Path d="M12 12c-2-2-4-2-5-0.5" />
          <Path d="M12 12c2-2 4-2 5-0.5" />
          <Circle cx="12" cy="9" r="0.8" fill={color} stroke="none" />
        </Svg>
      );
    case 'star':
      return (
        <Svg {...props} fill={color} stroke="none">
          <Path d="M12 2l3 6.5 7 0.8-5.3 4.7 1.6 6.9L12 17.7 5.7 20.9l1.6-6.9L2 9.3l7-0.8L12 2z" />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg {...props}>
          <Path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
          <Path d="M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" />
        </Svg>
      );
    case 'arrowRight':
      return (
        <Svg {...props}>
          <Line x1="4" y1="12" x2="20" y2="12" />
          <Polyline points="14,6 20,12 14,18" />
        </Svg>
      );
    case 'arrowUp':
      return (
        <Svg {...props}>
          <Line x1="12" y1="20" x2="12" y2="4" />
          <Polyline points="6,10 12,4 18,10" />
        </Svg>
      );
    case 'arrowLeft':
      return (
        <Svg {...props}>
          <Line x1="4" y1="12" x2="20" y2="12" />
          <Polyline points="10,6 4,12 10,18" />
        </Svg>
      );
    case 'flame':
      return (
        <Svg {...props}>
          <Path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-6-1 1-1.5 2.5-2 3-1-1-1-4-1-6-2 2-5 5-5 9 0 4 3 7 7 7z" />
          <Path d="M12 18c1.7 0 3-1.3 3-3 0-1.5-1.5-2.5-2-3-0.5 0.5-1 1.5-2 1.5" />
        </Svg>
      );
    case 'bolt':
      return (
        <Svg {...props} fill={color} stroke={color}>
          <Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...props}>
          <Polyline points="4,12 10,18 20,6" />
        </Svg>
      );
    case 'close':
      return (
        <Svg {...props}>
          <Line x1="6" y1="6" x2="18" y2="18" />
          <Line x1="18" y1="6" x2="6" y2="18" />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg {...props}>
          <Path d="M3 12a9 9 0 0 1 15.5-6.4M21 12a9 9 0 0 1-15.5 6.4" />
          <Polyline points="18,3 19,5 17,6.5" />
          <Polyline points="6,21 5,19 7,17.5" />
        </Svg>
      );
    case 'send':
      return (
        <Svg {...props}>
          <Path d="M3 11l18-8-7 18-3-7-8-3z" />
        </Svg>
      );
    case 'mic':
      return (
        <Svg {...props}>
          <Rect x="9" y="3" width="6" height="11" rx="3" />
          <Path d="M5 11a7 7 0 0 0 14 0" />
          <Line x1="12" y1="18" x2="12" y2="22" />
          <Line x1="8" y1="22" x2="16" y2="22" />
        </Svg>
      );
    case 'play':
      return (
        <Svg {...props} fill={color} stroke="none">
          <Path d="M7 5v14l11-7z" />
        </Svg>
      );
    case 'pause':
      return (
        <Svg {...props} fill={color} stroke="none">
          <Rect x="6" y="5" width="4" height="14" rx="1.5" />
          <Rect x="14" y="5" width="4" height="14" rx="1.5" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...props}>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );
    case 'minus':
      return (
        <Svg {...props}>
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );
    case 'lock':
      return (
        <Svg {...props}>
          <Rect x="5" y="11" width="14" height="10" rx="2" />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </Svg>
      );
    case 'camera':
      return (
        <Svg {...props}>
          <Path d="M3 7h4l2-3h6l2 3h4v12H3z" />
          <Circle cx="12" cy="13" r="4" />
        </Svg>
      );
    case 'cloud':
      return (
        <Svg {...props}>
          <Path d="M7 18a5 5 0 0 1-1-9.9 6 6 0 0 1 11.7 1.4A4.5 4.5 0 0 1 17 18z" />
        </Svg>
      );
  }
};

export default ClayIcon;