import { UserButton } from "@/components/auth/AuthComponents";
import { LayoutDashboard, Library, Scroll, Store, Sword } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg" />
          <span className="font-bold text-lg">Mindspark</span>
        </div>

        <nav className="flex flex-col gap-2">
          <NavLink href="/dashboard" icon={LayoutDashboard} label="Overview" />
          <NavLink href="/dashboard/collection" icon={Library} label="My Collection" />
          <NavLink href="/dashboard/library" icon={Store} label="Arcane Library" />
          <NavLink href="/dashboard/missions" icon={Scroll} label="Missions" />
          <div className="my-4 border-t border-zinc-800" />
          <NavLink href="/" icon={Sword} label="Play Game" />
        </nav>

        <div className="mt-auto">
          <UserButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
}
