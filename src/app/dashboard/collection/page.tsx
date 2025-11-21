import { db } from "@/db";
import { cards, userCards } from "@/db/schema";
import { stackServerApp } from "@/lib/stack";
import { eq } from "drizzle-orm";
import { Card as CardComponent } from "@/components/game/Card";

export default async function CollectionPage() {
  const user = await stackServerApp.getUser();
  if (!user) return null;

  const myCards = await db
    .select({
      card: cards
    })
    .from(userCards)
    .innerJoin(cards, eq(userCards.cardId, cards.id))
    .where(eq(userCards.userId, user.id));

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">My Collection</h1>
        <p className="text-zinc-400">Manage your deck and view your cards.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {myCards.map(({ card }) => (
          <div key={card.id} className="scale-75 origin-top-left">
            <CardComponent 
              card={{
                ...card,
                canAttack: false,
                isTapped: false
              }}
              onClick={() => {}}
            />
          </div>
        ))}
      </div>
      
      {myCards.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          No cards found. Visit the Arcane Library to start your collection!
        </div>
      )}
    </div>
  );
}
