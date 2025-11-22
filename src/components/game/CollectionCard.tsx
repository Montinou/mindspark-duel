'use client';

import { Card as CardComponent } from "@/components/game/Card";

interface CollectionCardProps {
  card: any;
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
