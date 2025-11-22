'use client';

import { Battlefield } from "./Battlefield";
import { AppShell } from "@/components/layout/AppShell";

interface GamePageProps {
  userName: string;
  userId: string;
}

export function GamePage({ userName, userId }: GamePageProps) {
  return (
    <AppShell>
      <div className="relative h-full">
        <Battlefield />
      </div>
    </AppShell>
  );
}
