'use client';

import { Card as CardComponent } from "@/components/game/Card";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface CollectionCardProps {
  card: any;
}

export function CollectionCard({ card }: CollectionCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }

  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const rotateX = useTransform(mouseY, [-150, 150], [15, -15]);
  const rotateY = useTransform(mouseX, [-150, 150], [-15, 15]);

  return (
    <motion.div
      className="perspective-1000 relative flex justify-center items-center"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        perspective: 1000,
        transformStyle: "preserve-3d",
      }}
      initial={{ y: 0 }}
      whileHover={{ y: -10 }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full h-full flex justify-center"
      >
        <CardComponent
          card={card}
          onClick={() => {}}
          className="w-full h-auto aspect-[2.5/3.5] max-w-[280px] shadow-xl hover:shadow-2xl transition-shadow duration-300"
        />
      </motion.div>
    </motion.div>
  );
}
