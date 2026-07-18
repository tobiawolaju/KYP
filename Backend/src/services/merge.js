function isMeaningful(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function isRealImage(value) {
  if (!value || typeof value !== "string") return false;
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  );
}

function deepMerge(firebaseData, geminiData) {
  const result = {};

  for (const key of Object.keys(firebaseData)) {
    const val = firebaseData[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      result[key] = {};
    } else {
      result[key] = val;
    }
  }

  for (const key of Object.keys(geminiData)) {
    const geminiVal = geminiData[key];

    if (!isMeaningful(geminiVal)) continue;

    const firebaseVal = firebaseData[key];

    const bothObjects =
      firebaseVal !== null &&
      typeof firebaseVal === "object" &&
      !Array.isArray(firebaseVal) &&
      geminiVal !== null &&
      typeof geminiVal === "object" &&
      !Array.isArray(geminiVal);

    if (bothObjects) {
      result[key] = deepMerge(firebaseVal, geminiVal);
    } else {
      result[key] = geminiVal;
    }
  }

  return result;
}

function findChanges(existing, updated, prefix) {
  const changes = [];
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(updated)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = existing[key];
    const newVal = updated[key];

    const bothObjects =
      oldVal !== null &&
      typeof oldVal === "object" &&
      !Array.isArray(oldVal) &&
      newVal !== null &&
      typeof newVal === "object" &&
      !Array.isArray(newVal);

    if (bothObjects) {
      changes.push(...findChanges(oldVal, newVal, path));
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ path, old: oldVal, new: newVal });
    }
  }

  return changes;
}

module.exports = { isMeaningful, isRealImage, deepMerge, findChanges };
