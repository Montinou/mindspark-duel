'use client';

import { MissionCard } from "@/components/gamification/MissionCard";
import { claimMission } from "@/app/actions/missions";
import { toast } from "sonner";
import { useTransition } from "react";

interface Mission {
  id: string;
  title: string;
  description: string;
  requirementCount: number;
  rewardAmount: number;
}

interface UserMission {
  id: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  missionId: string;
}

interface MissionsClientProps {
  missions: {
    um: UserMission;
    m: Mission;
  }[];
}

export function MissionsClient({ missions }: MissionsClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleClaim = async (userMissionId: string, rewardAmount: number) => {
    startTransition(async () => {
      const result = await claimMission(userMissionId);
      
      if (result.success) {
        toast.success(`Claimed ${rewardAmount} Sparks!`);
      } else {
        toast.error("Failed to claim reward");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {missions.map(({ um, m }) => (
        <MissionCard 
          key={um.id}
          title={m.title}
          description={m.description}
          progress={um.progress}
          total={m.requirementCount}
          reward={m.rewardAmount}
          completed={um.completed}
          claimed={um.claimed}
          onClaim={() => handleClaim(um.id, m.rewardAmount)}
        />
      ))}
      {missions.length === 0 && (
        <div className="col-span-full text-zinc-500 italic">
          No active missions. Check back tomorrow!
        </div>
      )}
    </div>
  );
}
