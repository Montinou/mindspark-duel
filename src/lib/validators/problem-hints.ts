import { z } from 'zod';

/**
 * Schema for validating ProblemHints JSON field
 * Used to ensure data integrity when storing/retrieving problem hints
 */
export const problemHintsSchema = z.object({
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  topics: z.array(z.string()).min(1, 'At least one topic is required'),
  difficulty: z.number().min(1).max(10).optional(),
  subCategory: z.string().optional(),
  contextType: z.enum(['fantasy', 'real_world', 'abstract']).optional(),
  suggestedTopics: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
});

export type ProblemHints = z.infer<typeof problemHintsSchema>;

/**
 * Validates problem hints data against the schema
 * @param data - Unknown data to validate
 * @returns SafeParseReturnType with success/error info
 */
export const validateProblemHints = (data: unknown) =>
  problemHintsSchema.safeParse(data);

/**
 * Validates and throws if invalid
 * @param data - Unknown data to validate
 * @returns Validated ProblemHints
 * @throws ZodError if validation fails
 */
export const parseProblemHints = (data: unknown): ProblemHints =>
  problemHintsSchema.parse(data);
