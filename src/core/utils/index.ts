/**
 * Core utility functions for the application
 */

import { v4 as uuidv4 } from 'uuid';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// ============================================================================
// UUID UTILITIES
// ============================================================================

export const generateUUID = (): string => {
  return uuidv4();
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// ============================================================================
// PASSWORD HASHING UTILITIES
// ============================================================================

export const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
};

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

export const generateAccessToken = (
  payload: Record<string, any>,
  expiresIn: SignOptions['expiresIn'] = '15m'
): string => {
  const secret: Secret = process.env.JWT_SECRET || 'secret';

  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm:
      (process.env.JWT_ALGORITHM as SignOptions['algorithm']) || 'HS256',
  });
};

export const generateRefreshToken = (
  payload: Record<string, any>,
  expiresIn: SignOptions['expiresIn'] = '7d'
): string => {
  const secret: Secret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret';

  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const verifyAccessToken = (token: string): Record<string, any> | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as Record<string, any>;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): Record<string, any> | null => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || 'refresh-secret') as Record<
      string,
      any
    >;
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): Record<string, any> | null => {
  try {
    return jwt.decode(token) as Record<string, any>;
  } catch (error) {
    return null;
  }
};

// ============================================================================
// RANDOM TOKEN UTILITIES
// ============================================================================

export const generateRandomToken = (length: number = 32): string => {
  return randomBytes(length).toString('hex');
};

export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return otp;
};

export const generateSecureToken = (): string => {
  return randomBytes(32).toString('hex');
};

// ============================================================================
// HASH UTILITIES (for token hashing in database)
// ============================================================================

import * as crypto from 'crypto';
import { Secret, SignOptions } from 'jsonwebtoken';

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const verifyTokenHash = (token: string, hash: string): boolean => {
  return hashToken(token) === hash;
};

// ============================================================================
// STRING UTILITIES
// ============================================================================

export const generateCustomerId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `CUST${timestamp}${randomPart}`;
};

export const generateAccountNumber = (): string => {
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `${timestamp}${randomPart}`.slice(-16); // 16-digit account number
};

export const generateTransactionReference = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `TXN${timestamp}${randomPart}`;
};

export const generateEmployeeId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `EMP${timestamp}${randomPart}`;
};

export const generateLoanNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase();
  return `LOAN${timestamp}${randomPart}`;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const camelToSnakeCase = (text: string): string => {
  return text.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export const snakeToCamelCase = (text: string): string => {
  return text.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

export const addMinutesToDate = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const addHoursToDate = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 3600000);
};

export const addDaysToDate = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 24 * 3600000);
};

export const isDateExpired = (date: Date): boolean => {
  return new Date() > date;
};

export const getMinutesDifference = (date1: Date, date2: Date): number => {
  return Math.floor((date2.getTime() - date1.getTime()) / 60000);
};

export const getHoursDifference = (date1: Date, date2: Date): number => {
  return Math.floor((date2.getTime() - date1.getTime()) / 3600000);
};

export const getDaysDifference = (date1: Date, date2: Date): number => {
  return Math.floor((date2.getTime() - date1.getTime()) / (24 * 3600000));
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const isValidIBAN = (iban: string): boolean => {
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
};

export const isStrongPassword = (password: string): boolean => {
  const strongRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongRegex.test(password);
};

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

export const removeDuplicates = <T>(array: T[], key?: (item: T) => any): T[] => {
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

export const omit = <T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};

export const pick = <T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> => {
  const result: Partial<T> = {};
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};


/**
 * Sign a short-lived challenge token for the 2FA login second step.
 *
 * This token proves the user passed password verification but has NOT yet
 * completed 2FA. It is intentionally separate from the access token:
 *   - Different secret (CHALLENGE_TOKEN_SECRET) so it cannot be used on
 *     protected routes that validate against JWT_SECRET.
 *   - 5-minute expiry matching OTP lifetime — forces the user to complete
 *     the second step promptly.
 *   - Payload carries `challenge: true` so verifyChallengToken can reject
 *     any other JWT that happens to be sent to the verify-login endpoint.
 */
export const signChallengeToken = (
  payload: Record<string, any>
): string => {
  const secret: Secret = process.env.CHALLENGE_TOKEN_SECRET || 'challenge-secret';

  return jwt.sign(
    { ...payload, challenge: true },
    secret,
    { expiresIn: '5m' }
  );
};

/**
 * Verify and decode a challenge token.
 * Returns null if the token is invalid, expired, or missing `challenge: true`.
 */
export const verifyChallengeToken = (
  token: string
): Record<string, any> | null => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.CHALLENGE_TOKEN_SECRET || 'challenge-secret'
    ) as Record<string, any>;

    // Reject anything that isn't explicitly a challenge token —
    // prevents access tokens or refresh tokens being submitted here.
    if (!decoded.challenge) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
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
): Omit<PaginatedResponse<any>, 'data'> => {
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

export const calculateSkip = (page: number, limit: number): number => {
  return (page - 1) * limit;
};
