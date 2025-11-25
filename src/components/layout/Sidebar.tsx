'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Swords, 
  Library, 
  Settings, 
  LogOut,
  Menu,
  Store,
  Scroll
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { UserButton } from '@/components/auth/AuthComponents';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className, collapsed = false }: SidebarProps & { collapsed?: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/', label: 'Battle Arena', icon: Swords },
    { href: '/dashboard/collection', label: 'My Collection', icon: Library },
    { href: '/dashboard/library', label: 'Arcane Library', icon: Store },
    { href: '/dashboard/missions', label: 'Missions', icon: Scroll },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={cn(
      "flex flex-col h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      <div className={cn("flex items-center border-b border-zinc-800", collapsed ? "justify-center p-4" : "p-6")}>
        {collapsed ? (
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg" />
        ) : (
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
            MindSpark Duel
          </h1>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-2">
        <TooltipProvider>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            const LinkContent = (
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-sm font-medium w-full",
                  isActive 
                    ? "bg-zinc-800 text-white" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon size={20} />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={link.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {LinkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={link.href}>{LinkContent}</div>;
          })}
        </TooltipProvider>
      </nav>

      <div className="p-2 border-t border-zinc-800">
        <div className={cn(
          "flex items-center gap-3 rounded-lg bg-zinc-900/50",
          collapsed ? "justify-center p-2" : "px-4 py-3"
        )}>
          <UserButton collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
}
