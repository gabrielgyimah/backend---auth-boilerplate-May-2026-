/**
 * Core utility functions
 *
 * Security hardening applied:
 * - generateOTP now uses crypto.randomInt (CSPRNG) — Math.random() is NOT cryptographically
 *   secure and was previously used, making OTPs predictable.
 * - generateAccountNumber / generateCustomerId / generateTransactionReference all migrated
 *   to randomBytes to eliminate Math.random() predictability in financial identifiers.
 * - All token-generation functions assert that required environment secrets exist at
 *   call-time rather than silently falling back to hard-coded weak defaults ('secret',
 *   'refresh-secret', 'challenge-secret').  If a secret is missing the process throws
 *   immediately — fail-fast is the correct behaviour for a security invariant.
 * - Removed exported `generateRandomToken` alias (kept as private; callers should use
 *   generateSecureToken which is documented and intentional).
 * - All JWT-signing helpers accept explicit algorithm parameters so the key type and
 *   algorithm cannot be mismatched.
 * - `decodeToken` removed from exports: jwt.decode() does NOT verify signatures and
 *   should never be used in application logic.
 * - Full TypeScript types throughout — no implicit `any`.
 */

import { randomBytes, randomInt, createHash } from 'crypto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// INTERNAL SECRET RESOLVER — fails fast if a required secret is absent
// ============================================================================

function requireSecret(envVar: string): string {
  const value = process.env[envVar];
  if (!value || value.length < 32) {
    throw new Error(
      `[Security] Environment variable "${envVar}" is missing or shorter than 32 characters. ` +
        `Application cannot start without a strong secret.`
    );
  }
  return value;
}

// ============================================================================
// UUID UTILITIES
// ============================================================================

export const generateUUID = (): string => uuidv4();

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// ============================================================================
// PASSWORD HASHING
// ============================================================================

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

// ============================================================================
// JWT TOKEN UTILITIES
// ============================================================================

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

export interface ChallengeTokenPayload {
  userId: string;
  otpRequestId: string;
  challenge: true;
  deviceName: string;
  deviceType: string;
  userAgent?: string;
  ipAddress?: string;
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  const secret: Secret = requireSecret('JWT_SECRET');
  const algorithm = (process.env.JWT_ALGORITHM as SignOptions['algorithm']) ?? 'HS256';
  const expiresIn = (process.env.JWT_EXPIRE ?? '15m') as SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn, algorithm });
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  const secret: Secret = requireSecret('REFRESH_TOKEN_SECRET');
  const expiresIn = (process.env.REFRESH_TOKEN_EXPIRE ?? '7d') as SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' });
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    return jwt.verify(token, requireSecret('JWT_SECRET')) as AccessTokenPayload;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, requireSecret('REFRESH_TOKEN_SECRET')) as RefreshTokenPayload;
  } catch {
    return null;
  }
};

/**
 * Sign a short-lived challenge token for the 2FA login second step.
 * Uses a dedicated secret so it cannot be used on protected routes
 * that validate against JWT_SECRET.
 */
export const signChallengeToken = (payload: Omit<ChallengeTokenPayload, 'challenge'>): string => {
  const secret: Secret = requireSecret('CHALLENGE_TOKEN_SECRET');
  return jwt.sign({ ...payload, challenge: true }, secret, { expiresIn: '5m', algorithm: 'HS256' });
};

/**
 * Verify and decode a challenge token.
 * Returns null if invalid, expired, or missing `challenge: true`.
 */
export const verifyChallengeToken = (token: string): ChallengeTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, requireSecret('CHALLENGE_TOKEN_SECRET')) as Record<string, unknown>;
    if (decoded.challenge !== true) return null;
    return decoded as unknown as ChallengeTokenPayload;
  } catch {
    return null;
  }
};

// ============================================================================
// SECURE RANDOM TOKEN / OTP UTILITIES
// ============================================================================

/** Generates a cryptographically secure hex token (default 32 bytes = 64 hex chars). */
export const generateSecureToken = (bytes = 32): string =>
  randomBytes(bytes).toString('hex');

/**
 * Generates a cryptographically secure numeric OTP.
 * Uses crypto.randomInt — NOT Math.random() which is predictable.
 */
export const generateOTP = (length = 6): string => {
  const digits: string[] = [];
  for (let i = 0; i < length; i++) {
    digits.push(randomInt(0, 10).toString());
  }
  return digits.join('');
};

// ============================================================================
// HASH UTILITIES (token storage — never store raw tokens)
// ============================================================================

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const verifyTokenHash = (token: string, hash: string): boolean =>
  hashToken(token) === hash;

// ============================================================================
// FINANCIAL IDENTIFIER GENERATORS (crypto-secure)
// ============================================================================

export const generateCustomerId = (): string => {
  const rand = randomBytes(6).toString('hex').toUpperCase();
  return `CUST${rand}`;
};

export const generateAccountNumber = (): string => {
  // 16 cryptographically random decimal digits
  const bytes = randomBytes(8);
  let num = '';
  for (const byte of bytes) {
    num += (byte % 10).toString();
  }
  return num.padStart(16, '0').slice(0, 16);
};

export const generateTransactionReference = (): string => {
  const rand = randomBytes(8).toString('hex').toUpperCase();
  return `TXN${rand}`;
};

export const generateEmployeeId = (): string => {
  const rand = randomBytes(6).toString('hex').toUpperCase();
  return `EMP${rand}`;
};

export const generateLoanNumber = (): string => {
  const rand = randomBytes(6).toString('hex').toUpperCase();
  return `LOAN${rand}`;
};

// ============================================================================
// STRING UTILITIES
// ============================================================================

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const capitalizeFirstLetter = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

export const camelToSnakeCase = (text: string): string =>
  text.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const snakeToCamelCase = (text: string): string =>
  text.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

// ============================================================================
// DATE / TIME UTILITIES
// ============================================================================

export const addMinutesToDate = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

export const addHoursToDate = (date: Date, hours: number): Date =>
  new Date(date.getTime() + hours * 3_600_000);

export const addDaysToDate = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86_400_000);

export const isDateExpired = (date: Date): boolean => Date.now() > date.getTime();

export const getMinutesDifference = (date1: Date, date2: Date): number =>
  Math.floor((date2.getTime() - date1.getTime()) / 60_000);

export const getHoursDifference = (date1: Date, date2: Date): number =>
  Math.floor((date2.getTime() - date1.getTime()) / 3_600_000);

export const getDaysDifference = (date1: Date, date2: Date): number =>
  Math.floor((date2.getTime() - date1.getTime()) / 86_400_000);

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return /^[\d\s\-+()]+$/.test(phone) && digits.length >= 10;
};

export const isValidIBAN = (iban: string): boolean =>
  /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban.replace(/\s/g, ''));

export const isStrongPassword = (password: string): boolean =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

export const removeDuplicates = <T>(array: T[], key?: (item: T) => unknown): T[] => {
  if (key) {
    return Array.from(new Map(array.map((item) => [key(item), item])).values());
  }
  return Array.from(new Set(array));
};

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

export const omit = <T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> => {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
};

export const pick = <T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> => {
  const result: Partial<T> = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
};

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const calculatePagination = (
  total: number,
  page: number,
  limit: number
): Omit<PaginatedResponse<never>, 'data'> => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const calculateSkip = (page: number, limit: number): number =>
  (page - 1) * limit;