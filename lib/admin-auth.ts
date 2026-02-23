import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "lob_admin_session";
const ADMIN_COOKIE_SALT = "sitecampeonato-admin-v1";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function constantEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function getAdminPasswordFromEnv() {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value && value.length > 0 ? value : null;
}

export function isAdminConfigured() {
  return !!getAdminPasswordFromEnv();
}

export function getAdminAuthToken() {
  const password = getAdminPasswordFromEnv();
  if (!password) return null;
  return sha256(`${password}:${ADMIN_COOKIE_SALT}`);
}

export function verifyAdminPassword(input: string) {
  const expected = getAdminPasswordFromEnv();
  if (!expected) return false;
  return constantEquals(input, expected);
}

export function isAuthorizedAdminRequest(request: NextRequest) {
  const expectedToken = getAdminAuthToken();
  if (!expectedToken) return false;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return constantEquals(token, expectedToken);
}
