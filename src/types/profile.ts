import { z } from 'zod';

// Education levels
export const educationLevels = [
  'elementary',   // 5-11 años (primaria)
  'middle',       // 12-14 años (secundaria)
  'high',         // 15-18 años (preparatoria)
  'college',      // 18+ años (universidad)
  'other'         // Otro
] as const;

export type EducationLevel = typeof educationLevels[number];

// Interest categories
export const interestCategories = [
  'sports',       // Deportes
  'music',        // Música
  'science',      // Ciencia
  'technology',   // Tecnología
  'art',          // Arte
  'games',        // Videojuegos
  'nature',       // Naturaleza
  'space',        // Espacio
  'history',      // Historia
  'literature'    // Literatura
] as const;

export type InterestCategory = typeof interestCategories[number];

// User profile interface
export interface UserProfile {
  age?: number; // 5-99
  educationLevel?: EducationLevel;
  interests?: InterestCategory[];
  preferredDifficulty?: number; // 1-10
}

// Zod schema for validation
export const userProfileSchema = z.object({
  age: z.number().min(5).max(99).optional(),
  educationLevel: z.enum(educationLevels).optional(),
  interests: z.array(z.enum(interestCategories)).max(5).optional(),
  preferredDifficulty: z.number().min(1).max(10).default(5).optional(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

// Default profile for users without complete profile
export const defaultUserProfile: UserProfile = {
  age: 12,
  educationLevel: 'middle',
  interests: [],
  preferredDifficulty: 5,
};

// Helper function to get age-appropriate education level
export function getEducationLevelFromAge(age: number): EducationLevel {
  if (age <= 11) return 'elementary';
  if (age <= 14) return 'middle';
  if (age <= 18) return 'high';
  return 'college';
}

// Helper function to merge user profile with defaults
export function getUserProfileWithDefaults(profile: Partial<UserProfile>): UserProfile {
  return {
    age: profile.age ?? defaultUserProfile.age,
    educationLevel: profile.educationLevel ?? defaultUserProfile.educationLevel,
    interests: profile.interests ?? defaultUserProfile.interests,
    preferredDifficulty: profile.preferredDifficulty ?? defaultUserProfile.preferredDifficulty,
  };
}
