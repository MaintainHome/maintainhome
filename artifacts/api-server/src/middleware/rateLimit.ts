import type { Request, Response, NextFunction, RequestHandler } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) store.delete(key);
  }
}, 60_000);

function getRecord(key: string, windowMs: number): RateLimitRecord {
  const now = Date.now();
  let record = store.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
    store.set(key, record);
  }
  return record;
}

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown"
  );
}

export function createRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  message?: string;
}): RequestHandler {
  const {
    maxRequests,
    windowMs,
    keyPrefix = "ip",
    message = "Too many requests. Please wait a moment before trying again.",
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getIp(req);
    const key = `${keyPrefix}:${ip}`;
    const record = getRecord(key, windowMs);

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - Date.now()) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: message, retryAfter });
    }

    record.count++;
    return next();
  };
}

export function checkUserChatLimit(
  userId: number,
  isPro: boolean,
): { allowed: boolean; retryAfter?: number; error?: string } {
  const maxFree = 20;
  const maxPro = 200;
  const windowMs = 60 * 60 * 1000;

  const key = `chat:${userId}`;
  const record = getRecord(key, windowMs);

  if (!isPro && record.count >= maxFree) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - Date.now()) / 1000),
      error: "You've reached the hourly chat limit (20 messages). Upgrade to Pro for unlimited access.",
    };
  }

  if (isPro && record.count >= maxPro) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - Date.now()) / 1000),
      error: "You've reached the hourly chat limit. Please try again in a little while.",
    };
  }

  record.count++;
  return { allowed: true };
}
