import * as React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Moon, Sun, Search, Bell, LogOut, ChevronsUpDown, Command, Stethoscope, UserCircle,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { NAV_ITEMS, visibleNav, type NavItem } from "@/app/navigation";
import { DEMO_PERSONAS } from "@/demo/personas";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandMenu } from "@/components/layout/command-menu";

const GROUP_ORDER: NavItem["group"][] = ["Work", "Operate", "People", "System"];

export function AppShell() {
  const { ctx, signOut, isDemo, setPersona, personaId } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const items = React.useMemo(() => visibleNav(NAV_ITEMS, ctx), [ctx]);
  const grouped = GROUP_ORDER.map((g) => ({ group: g, items: items.filter((i) => i.group === g) })).filter(
    (g) => g.items.length > 0,
  );
  const mobileItems = items.filter((i) => i.mobile).slice(0, 5);

  return (
    <div className="flex min-h-svh bg-background">
      <CommandMenu />

      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Gumbo Connect</span>
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-4">
            {grouped.map(({ group, items }) => (
              <div key={group} className="space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-2 text-muted-foreground sm:flex"
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true }),
              );
            }}
          >
            <Search className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border px-1 text-[10px]">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            {isDemo ? (
              <Badge variant="attention" className="hidden sm:inline-flex">Demo data</Badge>
            ) : null}

            {isDemo ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    <span className="max-w-28 truncate">
                      {DEMO_PERSONAS.find((p) => p.id === personaId)?.label ?? "Persona"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>View the app as…</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {DEMO_PERSONAS.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onSelect={() => {
                        setPersona(p.id);
                        navigate("/");
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm">{p.label}</span>
                        <span className="text-xs text-muted-foreground">{p.blurb}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Button variant="ghost" size="icon" onClick={() => navigate("/notifications")} aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>{initials(ctx?.profile?.full_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{ctx?.profile?.full_name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {ctx?.roles?.join(", ")}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/profile")}>
                  <UserCircle className="h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/notifications")}>
                  <Bell className="h-4 w-4" /> Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => signOut()}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Routed content */}
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 backdrop-blur md:hidden">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[10px]",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
