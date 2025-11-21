'use client';

import { useState } from "react";
import { ThemeSelector } from "@/components/onboarding/ThemeSelector";
import { startDeckGeneration } from "@/app/actions/deck";

export function ThemeSelectorWrapper() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (themeId: string) => {
    setIsSubmitting(true);
    try {
      await startDeckGeneration(themeId);
    } catch (error) {
      console.error("Failed to start generation:", error);
      setIsSubmitting(false);
    }
  };

  return <ThemeSelector onSelect={handleSelect} isSubmitting={isSubmitting} />;
}
