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
  Menu
} from 'lucide-react';
import { UserButton } from '@/components/auth/AuthComponents';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Battle Arena', icon: Swords },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/collection', label: 'Collection', icon: Library },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-64", className)}>
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          MindSpark Duel
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                isActive 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-900/50">
          <UserButton />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 truncate">Logged in</p>
          </div>
        </div>
      </div>
    </div>
  );
}
