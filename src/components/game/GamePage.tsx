'use client';

import { Battlefield } from "./Battlefield";
import { AppShell } from "@/components/layout/AppShell";
import type { Card } from "@/types/game";

interface GamePageProps {
  userName: string;
  userId: string;
  userCards: Card[];
}

export function GamePage({ userName, userId, userCards }: GamePageProps) {
  return (
    <AppShell>
      <div className="relative h-full">
        <Battlefield userDeck={userCards} />
      </div>
    </AppShell>
  );
}
