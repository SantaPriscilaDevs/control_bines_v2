import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
// Uno por archivo: así el bundle lleva solo estos íconos y no los 1600 de Lucide.
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import CircleAlert from 'lucide-react-native/icons/circle-exclamation-point';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import FileText from 'lucide-react-native/icons/file-text';
import FlaskConical from 'lucide-react-native/icons/flask-conical';
import History from 'lucide-react-native/icons/rotate-ccw-clock';
import House from 'lucide-react-native/icons/house';
import Info from 'lucide-react-native/icons/info';
import Keyboard from 'lucide-react-native/icons/keyboard';
import Lock from 'lucide-react-native/icons/lock';
import LogIn from 'lucide-react-native/icons/log-in';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapPin from 'lucide-react-native/icons/map-pin';
import Menu from 'lucide-react-native/icons/menu';
import Minus from 'lucide-react-native/icons/minus';
import Package from 'lucide-react-native/icons/package';
import Plus from 'lucide-react-native/icons/plus';
import Radio from 'lucide-react-native/icons/radio';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import ScanBarcode from 'lucide-react-native/icons/scan-barcode';
import Search from 'lucide-react-native/icons/search';
import Shield from 'lucide-react-native/icons/shield';
import Ship from 'lucide-react-native/icons/ship';
import Smartphone from 'lucide-react-native/icons/smartphone';
import TriangleAlert from 'lucide-react-native/icons/triangle-exclamation-point';
import Truck from 'lucide-react-native/icons/truck';
import User from 'lucide-react-native/icons/user';
import UserCheck from 'lucide-react-native/icons/user-check';
import Users from 'lucide-react-native/icons/users';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import X from 'lucide-react-native/icons/x';
import type { ColorToken } from '@/styles/theme';
import { useTheme } from '@/styles/useTheme';

/** Los íconos Lucide que usa la app, por nombre (los mismos de GS Mobile y del diseño). */
const ICONOS = {
  'arrow-right': ArrowRight,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  eye: Eye,
  'eye-off': EyeOff,
  'file-text': FileText,
  flask: FlaskConical,
  history: History,
  house: House,
  info: Info,
  keyboard: Keyboard,
  lock: Lock,
  'log-in': LogIn,
  'log-out': LogOut,
  mail: Mail,
  'map-pin': MapPin,
  menu: Menu,
  minus: Minus,
  package: Package,
  plus: Plus,
  radio: Radio,
  'refresh-cw': RefreshCw,
  'scan-barcode': ScanBarcode,
  search: Search,
  shield: Shield,
  ship: Ship,
  smartphone: Smartphone,
  'triangle-alert': TriangleAlert,
  truck: Truck,
  user: User,
  'user-check': UserCheck,
  users: Users,
  'wifi-off': WifiOff,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONOS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
  /** Solo si el ícono informa algo que no dice el texto de al lado. */
  accessibilityLabel?: string;
}

export default function Icon({ name, size = 20, color = 'text', accessibilityLabel }: IconProps) {
  const { color: esquema } = useTheme();
  const Componente = ICONOS[name];
  return (
    <Componente
      size={size}
      color={esquema[color]}
      strokeWidth={2}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
