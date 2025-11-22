'use client';

import { Card as CardComponent } from "@/components/game/Card";
import type { Card } from "@/db/schema";

interface CollectionCardProps {
  card: Card & {
    canAttack: boolean;
    isTapped: boolean;
  };
}

export function CollectionCard({ card }: CollectionCardProps) {
  return (
    <div className="scale-75 origin-top-left">
      <CardComponent
        card={card}
        onClick={() => {}}
      />
    </div>
  );
}
