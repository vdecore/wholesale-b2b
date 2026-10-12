const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ValidationError(`${field} is required`);
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${field} is too long`);
  }
  return trimmed;
}

export function optionalString(value, field, { max = 2000 } = {}) {
  if (value == null || value === "") return null;
  return requireString(String(value), field, { min: 1, max });
}

export function requireEmail(value) {
  const email = requireString(value, "email", { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError("Invalid email address");
  }
  return email;
}

export function requirePositiveInt(value, field, { max = 1_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new ValidationError(`${field} must be a positive integer`);
  }
  return n;
}

export function requireNonNegativeInt(value, field, { max = 1_000_000_000 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) {
    throw new ValidationError(`${field} must be a non-negative integer`);
  }
  return n;
}

export function requirePriceRupees(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) {
    throw new ValidationError("price must be a valid non-negative number");
  }
  return Math.round(n * 100) / 100;
}

export function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export function parseStatus(value, allowed, field = "status") {
  const s = requireString(value, field, { max: 40 }).toLowerCase();
  if (!allowed.includes(s)) {
    throw new ValidationError(`Invalid ${field}`);
  }
  return s;
}
