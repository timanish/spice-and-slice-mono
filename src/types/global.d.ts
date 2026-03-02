
interface Window {
  globalAdminCache?: Record<string, {
    isAdmin: boolean;
    timestamp: number;
  }>;
}
