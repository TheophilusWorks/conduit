/**
 * Generates a random number between `min` and `max`.
 *
 * @param min - Lower bound of the range
 * @param max - Upper bound of the range
 * @param inclusive - If true, range includes `max + 1` in calculation
 *
 * @returns A random floating-point number within the range
 *
 * @remarks
 * This function does NOT return an integer. If integer behavior is needed,
 * wrap the result with `Math.floor()` or adjust the implementation.
 */
export function randomRange(
  min: number,
  max: number,
  inclusive = false,
): number {
  if (inclusive) {
    return Math.random() * (max - min + 1) + min;
  } else {
    return Math.random() * (max - min) + min;
  }
}
