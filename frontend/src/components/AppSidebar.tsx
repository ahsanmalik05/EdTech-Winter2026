import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "motion/react";
import {
  BarChart3,
  ChevronsUpDown,
  ClipboardCheck,
  Globe,
  KeyRound,
  Languages,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";

interface AppSidebarProps {
  userEmail: string;
  userRole: 'user' | 'admin';
  apiKey: string;
  onLogout: () => void;
  isBusy?: boolean;
}

const sidebarMotion = {
  open: { width: "14rem" },
  closed: { width: "3.05rem" },
};

const fadeVariant = {
  open: {
    x: 0,
    opacity: 1,
    transition: { x: { stiffness: 1000, velocity: -100 } },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: { x: { stiffness: 100 } },
  },
};

const staggerContainer = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
  staggerChildren: 0.1,
};

const NAV_ITEMS = [
  {
    section: "main",
    items: [
      { to: "/translate", label: "Translate", icon: Languages },
      { to: "/generate", label: "Generate", icon: Sparkles },
    ],
  },
  {
    section: "history",
    items: [
      { to: "/logs", label: "Translation Logs", icon: ScrollText },
      { to: "/template-logs", label: "Template Logs", icon: ScrollText },
    ],
  },
  {
    section: "config",
    items: [
      { to: "/languages", label: "Languages", icon: Globe },
    ],
  },
];

const ADMIN_NAV_ITEMS = [
  {
    section: "admin",
    items: [
      { to: "/admin/stats", label: "Platform Stats", icon: BarChart3 },
      { to: "/admin/translation-validations", label: "Translation QA", icon: ClipboardCheck },
      { to: "/admin/generation-validations", label: "Generation QA", icon: ClipboardCheck },
    ],
  },
];

export function AppSidebar({ userEmail, userRole, apiKey, onLogout }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();

  const navItems = userRole === 'admin'
    ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
    : NAV_ITEMS;

  const initials = userEmail
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.aside
      className={cn(
        "fixed left-0 z-40 h-dvh shrink-0 border-r border-zinc-200 bg-white",
      )}
      initial="closed"
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarMotion}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className="relative z-40 flex h-full shrink-0 flex-col text-zinc-500"
        variants={{ open: { opacity: 1 }, closed: { opacity: 1 } }}
      >
        <motion.ul variants={staggerContainer} className="flex h-full flex-col">
          <div className="flex grow flex-col">
            {/* Brand header */}
            <div className="flex h-14 w-full shrink-0 items-center border-b border-zinc-100 px-2">
              {isCollapsed ? (
                <div className="flex size-8 shrink-0 items-center justify-center">
                  <span className="font-display text-lg text-zinc-900 select-none">
                    M
                  </span>
                </div>
              ) : (
                <span className="font-display text-lg text-zinc-900 select-none">
                  METY
                </span>
              )}
            </div>

            {/* Nav links */}
            <div className="flex h-full w-full flex-col">
              <div className="flex grow flex-col">
                <ScrollArea className="h-16 grow p-2">
                  <div className="flex w-full flex-col gap-0.5">
                    {navItems.map((section, sIdx) => (
                      <div key={section.section}>
                        {sIdx > 0 && <Separator className="my-2 w-full" />}
                        {section.section === 'admin' && !isCollapsed && (
                          <div className="flex items-center gap-1.5 px-2 py-1">
                            <ShieldCheck className="size-3 text-zinc-300" />
                            <span className="text-[10px] font-medium text-zinc-300 uppercase tracking-wider">Admin</span>
                          </div>
                        )}
                        {section.items.map((item) => {
                          const isActive = location.pathname === item.to;
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              className={cn(
                                "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
                                isActive && "bg-zinc-100 text-zinc-900",
                              )}
                            >
                              <item.icon className="size-4 shrink-0" />
                              <motion.li
                                variants={fadeVariant}
                                className="list-none"
                              >
                                {!isCollapsed && (
                                  <p
                                    className={cn(
                                      "ml-2 text-sm",
                                      isActive ? "font-medium" : "font-normal",
                                    )}
                                  >
                                    {item.label}
                                  </p>
                                )}
                              </motion.li>
                            </NavLink>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Bottom section */}
              <div className="flex flex-col gap-0.5 border-t border-zinc-100 p-2">
                <NavLink
                  to="/keys"
                  className={cn(
                    "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
                    location.pathname === "/keys" && "bg-zinc-100 text-zinc-900",
                  )}
                >
                  <KeyRound className="size-4 shrink-0" />
                  <motion.li variants={fadeVariant} className="list-none">
                    {!isCollapsed && (
                      <div className="ml-2 flex items-center gap-2">
                        <p className="text-sm font-normal">API Keys</p>
                        {!apiKey && (
                          <span className="size-1.5 rounded-full bg-amber-400" />
                        )}
                      </div>
                    )}
                  </motion.li>
                </NavLink>

                {/* User account dropdown */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full" asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex h-8 w-full items-center justify-start gap-2 px-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      <Avatar className="size-4 rounded">
                        <AvatarFallback className="text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <motion.li
                        variants={fadeVariant}
                        className="flex list-none items-center gap-2"
                      >
                        {!isCollapsed && (
                          <>
                            <p className="text-sm font-normal truncate max-w-24">
                              {userEmail.split("@")[0]}
                            </p>
                            <ChevronsUpDown className="ml-auto size-3.5 text-zinc-400" />
                          </>
                        )}
                      </motion.li>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={8}>
                    <div className="flex flex-row items-center gap-2 p-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium text-zinc-900">
                          {userEmail.split("@")[0]}
                        </span>
                        <span className="line-clamp-1 text-xs text-zinc-400">
                          {userEmail}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center gap-2"
                      asChild
                    >
                      <NavLink to="/keys">
                        <Settings className="size-4" /> Manage Keys
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 text-red-500 focus:text-red-600"
                      onClick={onLogout}
                    >
                      <LogOut className="size-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.aside>
  );
}
