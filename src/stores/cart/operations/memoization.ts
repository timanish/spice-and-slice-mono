const memoizedResults = new Map<string, { data: unknown; timestamp: number }>();
const MEMO_TTL = 30_000; // 30 seconds cache TTL

let clerkUserId: string | null = null;

function getMemoizedResult(key: string) {
  const cachedResult = memoizedResults.get(key);
  if (cachedResult && Date.now() - cachedResult.timestamp < MEMO_TTL) {
    return cachedResult.data;
  }
  return null;
}

function storeMemoizedResult(key: string, data: unknown) {
  memoizedResults.set(key, { data, timestamp: Date.now() });
}

function clearMemoizedResult(key: string) {
  memoizedResults.delete(key);
}

function getCurrentUserId(): string {
  if (clerkUserId) {
    return clerkUserId;
  }
  return "anonymous";
}

function isAnonymousUser(): boolean {
  return clerkUserId === null;
}

function setClerkUserId(userId: string | null) {
  if (userId !== clerkUserId) {
    clerkUserId = userId;
    memoizedResults.clear();
  }
}

function clearUserCache() {
  clerkUserId = null;
  memoizedResults.clear();
}

export const memoizationUtils = {
  getMemoizedResult,
  storeMemoizedResult,
  clearMemoizedResult,
  getCurrentUserId,
  isAnonymousUser,
  setClerkUserId,
  clearUserCache,
};
