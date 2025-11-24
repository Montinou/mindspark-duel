/**
 * Test Users Configuration
 *
 * Define test users here for use in test scripts
 * These should be real users in the database with cards in their collection
 *
 * INSTRUCTIONS:
 * 1. Create a test user in your app
 * 2. Make sure the user has at least 20 cards in their collection
 * 3. Copy the user ID here
 * 4. Run the tests
 */

export interface TestUser {
  id: string; // User ID from database
  name: string; // Display name for logging
  description: string; // What this user is for
}

/**
 * Primary test user
 * This user should have a complete card collection (20-30 cards)
 */
export const TEST_USER: TestUser = {
  id: 'YOUR_USER_ID_HERE', // Replace with actual user ID from database
  name: 'Test Player',
  description: 'Main test user with full card collection',
};

/**
 * Alternative test users (optional, for multiplayer testing later)
 */
export const TEST_USERS = {
  player1: TEST_USER,

  player2: {
    id: 'OPTIONAL_SECOND_USER_ID',
    name: 'Test Opponent',
    description: 'Secondary test user for multiplayer tests',
  } as TestUser,
};

/**
 * Get the primary test user for single-player tests
 */
export function getTestUser(): TestUser {
  if (TEST_USER.id === 'YOUR_USER_ID_HERE') {
    throw new Error(
      'Please configure TEST_USER in scripts/test_users.ts before running tests.\n' +
      'Instructions:\n' +
      '1. Create a user in your app\n' +
      '2. Make sure they have at least 20 cards\n' +
      '3. Copy their user ID to TEST_USER.id in scripts/test_users.ts'
    );
  }

  return TEST_USER;
}

/**
 * Validate that test user is properly configured
 */
export function validateTestUser(user: TestUser): void {
  if (!user.id || user.id === 'YOUR_USER_ID_HERE') {
    throw new Error('Test user ID not configured');
  }

  if (!user.name) {
    throw new Error('Test user name not configured');
  }

  console.log(`✅ Using test user: ${user.name} (${user.id})`);
}
