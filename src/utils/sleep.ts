/**
 * Resolves after a random delay between `min` and `max` milliseconds.
 *
 * @remarks
 * Used to introduce natural timing variation (e.g. for message queues)
 * and reduce the risk of rate-limiting.
 */
export function sleep(min: number, max: number) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;

  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
