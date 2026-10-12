/** Existing products.price REAL is stored as whole INR rupees (not paise). */
export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function paiseToRupees(paise) {
  return Math.round(paise) / 100;
}

export function formatInrFromPaise(paise) {
  return paiseToRupees(paise).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
