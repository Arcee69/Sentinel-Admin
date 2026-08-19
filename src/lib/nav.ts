import {
  Activity,
  LayoutDashboard,
  Megaphone,
  Radio,
  Send,
  Vote,
  Settings,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  /** Small uppercase qualifier rendered after the label. */
  suffix?: string;
  icon: LucideIcon;
  /** Renders the blinking live dot on the rail. */
  live?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/intelligence", label: "Intelligence", suffix: "SMHP Pulse", icon: Activity },
  { to: "/operations", label: "Campaign Ops", icon: Megaphone },
  { to: "/communications", label: "Communications", icon: Send },
  { to: "/command", label: "Command Center", icon: Radio, live: true },
  { to: "/elections", label: "Election Matrix", icon: Vote },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/agents", label: "Agents & Structure", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];
