/**
 * IconSymbol Component
 * 
 * Cross-platform icon component using SF Symbols on iOS and Material Icons elsewhere.
 * Provides consistent iconography across platforms.
 * 
 * @see https://icons.expo.fyi - Expo Icons Directory
 * @see https://developer.apple.com/sf-symbols/ - SF Symbols (iOS)
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;

/**
 * SF Symbols to Material Icons mapping
 * Add new icons here as needed
 * 
 * Format: 'sf-symbol-name': 'material-icon-name'
 */
const MAPPING: IconMapping = {
  // Navigation
  'house.fill': 'home',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  
  // Actions
  'magnifyingglass': 'search',
  'bell': 'notifications-none',
  'bell.fill': 'notifications',
  'gear': 'settings',
  'plus': 'add',
  'checkmark': 'check',
  'xmark': 'close',
  
  // Hardware/Device
  'camera': 'camera-alt',
  'camera.fill': 'camera-alt',
  'printer': 'print',
  'printer.fill': 'print',
  'creditcard': 'credit-card',
  'creditcard.fill': 'payment',
  'cpu': 'memory',
  'wifi': 'wifi',
  'wifi.slash': 'wifi-off',
  
  // Data/Analytics
  'chart.bar': 'bar-chart',
  'chart.bar.fill': 'bar-chart',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  
  // Business
  'dollarsign.circle': 'attach-money',
  'dollarsign.circle.fill': 'attach-money',
  'cart': 'shopping-cart',
  'cart.fill': 'shopping-cart',
  'bag': 'shopping-bag',
  'bag.fill': 'shopping-bag',
  
  // Status
  'exclamationmark.triangle': 'warning',
  'exclamationmark.triangle.fill': 'warning',
  'info.circle': 'info',
  'info.circle.fill': 'info',
  'checkmark.circle': 'check-circle',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle': 'cancel',
  'xmark.circle.fill': 'cancel',
  
  // Location
  'location': 'location-on',
  'location.fill': 'location-on',
  'map': 'map',
  'map.fill': 'map',
  
  // Time
  'clock': 'schedule',
  'clock.fill': 'schedule',
  'calendar': 'calendar-today',
  'calendar.fill': 'event',
  
  // People
  'person': 'person-outline',
  'person.fill': 'person',
  'person.2': 'people-outline',
  'person.2.fill': 'people',
  
  // Communication
  'envelope': 'mail-outline',
  'envelope.fill': 'mail',
  
  // Security
  'key': 'vpn-key',
  'key.fill': 'vpn-key',
  'lock': 'lock-outline',
  'lock.fill': 'lock',
  'paperplane': 'send',
  'paperplane.fill': 'send',
  
  // Media
  'photo': 'photo',
  'photo.fill': 'photo',
  'photo.stack': 'photo-library',
  'photo.stack.fill': 'photo-library',
  
  // Visibility
  'eye': 'visibility',
  'eye.fill': 'visibility',
  'eye.slash': 'visibility-off',
  'eye.slash.fill': 'visibility-off',
  
  // Copy/Clipboard
  'doc.on.doc': 'content-copy',
  'doc.on.doc.fill': 'content-copy',
  
  // QR Code
  'qrcode': 'qr-code-2',
  'qrcode.viewfinder': 'qr-code-scanner',
  
  // Misc
  'star': 'star-outline',
  'star.fill': 'star',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'trash': 'delete-outline',
  'trash.fill': 'delete',
  'ellipsis': 'more-horiz',
  'ellipsis.vertical': 'more-vert',
  'slider.horizontal.3': 'tune',
  'arrow.clockwise': 'refresh',
  'doc.text': 'description',
  'doc.text.fill': 'description',
  'square.and.arrow.up': 'ios-share',
  'bolt': 'bolt',
  'bolt.fill': 'bolt',
  
  // PhotoBooth specific
  'tshirt.fill': 'checkroom',
  'sparkles': 'auto-awesome',
};

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * 
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name as string] || 'help-outline';
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
