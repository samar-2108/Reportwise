/**
 * Asserts that all supplied storage paths strictly belong to the specified user
 * under their dedicated folder prefix `${userId}/`. Prevents path traversal,
 * directory climbing, or deleting/accessing another user's files.
 */
export function assertOwnedPaths(userId: string, paths: string[]): string[] {
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId supplied for storage path authorization");
  }

  const prefix = `${userId}/`;

  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith(prefix)) {
      throw new Error(`Security violation: unauthorized storage path for user ${userId}: "${p}"`);
    }

    // Guard against path traversal attempts
    if (p.includes("..") || p.includes("\\") || p.includes("//")) {
      throw new Error(`Security violation: malicious characters detected in storage path: "${p}"`);
    }
  }

  return paths;
}

