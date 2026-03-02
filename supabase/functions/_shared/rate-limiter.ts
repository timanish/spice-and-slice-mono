
// Basic rate limiting implementation for Supabase Edge Functions
// Uses in-memory storage (will reset when function instance restarts)

/**
 * Simple in-memory rate limiter
 * Note: This is per-instance memory, so it will reset when functions cold start
 * For production, consider using Redis or a more persistent solution
 */

interface RequestRecord {
  count: number;
  firstRequest: number;
}

// Store rate limit data
const ipRequests = new Map<string, RequestRecord>();
const emailRequests = new Map<string, RequestRecord>();
const profileRequests = new Map<string, RequestRecord>();
const pathRequests = new Map<string, Map<string, RequestRecord>>();

// Clean old entries periodically
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  const now = Date.now();
  const expiryTime = now - CLEANUP_INTERVAL;
  
  for (const [key, record] of ipRequests.entries()) {
    if (record.firstRequest < expiryTime) {
      ipRequests.delete(key);
    }
  }
  
  for (const [key, record] of emailRequests.entries()) {
    if (record.firstRequest < expiryTime) {
      emailRequests.delete(key);
    }
  }
  
  for (const [key, record] of profileRequests.entries()) {
    if (record.firstRequest < expiryTime) {
      profileRequests.delete(key);
    }
  }
  
  for (const [path, ipMap] of pathRequests.entries()) {
    for (const [ip, record] of ipMap.entries()) {
      if (record.firstRequest < expiryTime) {
        ipMap.delete(ip);
      }
    }
    if (ipMap.size === 0) {
      pathRequests.delete(path);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Rate limit by IP address
 * @param ip The client IP address
 * @param limit Maximum number of requests allowed
 * @param window Time window in seconds
 * @returns {boolean} true if rate limit is exceeded
 */
export function isRateLimitedByIp(ip: string, limit: number = 60, window: number = 60): boolean {
  const now = Date.now();
  const windowMs = window * 1000;
  
  // Get or create request record
  let record = ipRequests.get(ip);
  if (!record) {
    record = { count: 0, firstRequest: now };
    ipRequests.set(ip, record);
  }
  
  // Check if we need to reset the window
  if (now - record.firstRequest > windowMs) {
    record.count = 0;
    record.firstRequest = now;
  }
  
  // Increment counter
  record.count++;
  
  // Check if rate limited
  return record.count > limit;
}

/**
 * Rate limit by email address
 * @param email The email address
 * @param limit Maximum number of requests allowed
 * @param window Time window in seconds
 * @returns {boolean} true if rate limit is exceeded
 */
export function isRateLimitedByEmail(email: string, limit: number = 5, window: number = 3600): boolean {
  const now = Date.now();
  const windowMs = window * 1000;
  
  // Get or create request record
  let record = emailRequests.get(email);
  if (!record) {
    record = { count: 0, firstRequest: now };
    emailRequests.set(email, record);
  }
  
  // Check if we need to reset the window
  if (now - record.firstRequest > windowMs) {
    record.count = 0;
    record.firstRequest = now;
  }
  
  // Increment counter
  record.count++;
  
  // Check if rate limited
  return record.count > limit;
}

/**
 * Rate limit by profile ID
 * @param profileId The profile ID
 * @param limit Maximum number of requests allowed
 * @param window Time window in seconds
 * @returns {boolean} true if rate limit is exceeded
 */
export function isRateLimitedByProfileId(profileId: string, limit: number = 30, window: number = 60): boolean {
  const now = Date.now();
  const windowMs = window * 1000;
  
  // Get or create request record
  let record = profileRequests.get(profileId);
  if (!record) {
    record = { count: 0, firstRequest: now };
    profileRequests.set(profileId, record);
  }
  
  // Check if we need to reset the window
  if (now - record.firstRequest > windowMs) {
    record.count = 0;
    record.firstRequest = now;
  }
  
  // Increment counter
  record.count++;
  
  // Check if rate limited
  return record.count > limit;
}

/**
 * Rate limit by path and IP
 * @param path The request path
 * @param ip The client IP address
 * @param limit Maximum number of requests allowed
 * @param window Time window in seconds
 * @returns {boolean} true if rate limit is exceeded
 */
export function isRateLimitedByPathAndIp(path: string, ip: string, limit: number = 30, window: number = 60): boolean {
  const now = Date.now();
  const windowMs = window * 1000;
  
  // Get or create path map
  let ipMap = pathRequests.get(path);
  if (!ipMap) {
    ipMap = new Map<string, RequestRecord>();
    pathRequests.set(path, ipMap);
  }
  
  // Get or create request record for this IP
  let record = ipMap.get(ip);
  if (!record) {
    record = { count: 0, firstRequest: now };
    ipMap.set(ip, record);
  }
  
  // Check if we need to reset the window
  if (now - record.firstRequest > windowMs) {
    record.count = 0;
    record.firstRequest = now;
  }
  
  // Increment counter
  record.count++;
  
  // Check if rate limited
  return record.count > limit;
}

/**
 * Check if a request should be rate limited based on path patterns
 * @param req The request object
 * @param ip The client IP
 * @returns {boolean} true if the request should be rate limited
 */
export function shouldRateLimitRequest(req: Request, ip: string): boolean {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Check for cart data access
  if (path.includes('/rest/v1/carts') || path.includes('/rest/v1/cart_items')) {
    // Strict rate limiting for cart data: 25 requests per minute
    return isRateLimitedByPathAndIp(path, ip, 25, 60);
  }
  
  // Check for profile data access
  if (path.includes('/rest/v1/profiles')) {
    // More strict rate limiting for profile data: 15 requests per minute
    return isRateLimitedByPathAndIp(path, ip, 15, 60);
  }
  
  // Check for authentication endpoints
  if (path.includes('/auth/')) {
    // Rate limit auth endpoints: 20 requests per minute
    return isRateLimitedByPathAndIp(path, ip, 20, 60);
  }
  
  // General API rate limiting
  if (path.includes('/rest/v1/')) {
    // Standard API rate limiting: 60 requests per minute
    return isRateLimitedByPathAndIp(path, ip, 60, 60);
  }
  
  // Default: no rate limiting
  return false;
}

/**
 * Get client IP from request
 * @param req Request object
 * @returns Client IP address
 */
export function getClientIp(req: Request): string {
  // Try to get IP from Cloudflare headers
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Try to get IP from forwarded headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback
  return '127.0.0.1';
}

/**
 * Create a rate limiter middleware for Supabase Edge Functions
 * @returns A function that handles rate limiting
 */
export function createRateLimiterMiddleware() {
  return async (req: Request): Promise<Response | null> => {
    const clientIp = getClientIp(req);
    
    if (shouldRateLimitRequest(req, clientIp)) {
      return new Response(
        JSON.stringify({
          error: "Too many requests, please try again later",
          code: "rate_limit_exceeded"
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60"
          }
        }
      );
    }
    
    // Continue processing the request
    return null;
  };
}

/**
 * Helper function to apply rate limiting middleware to a request
 * @param req The request object
 * @returns Response if rate limited, null if not
 */
export async function applyRateLimiter(req: Request): Promise<Response | null> {
  const middleware = createRateLimiterMiddleware();
  return await middleware(req);
}
