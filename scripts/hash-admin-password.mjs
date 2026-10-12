/**
 * Generate a PBKDF2 password hash compatible with the Worker (for first admin SQL insert).
 * Usage: node scripts/hash-admin-password.mjs "YourStrongPassword"
 */
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function toBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEY_BYTES * 8
  );
  return `pbkdf2-sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage: node scripts/hash-admin-password.mjs \"YourStrongPassword\" (min 12 chars)");
  process.exit(1);
}

const hash = await hashPassword(password);
console.log(hash);
