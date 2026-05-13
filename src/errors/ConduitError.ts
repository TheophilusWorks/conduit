/**
 * Base error class for all Conduit-related runtime errors.
 *
 * Extends the native `Error` class with a consistent naming scheme
 * and helper factory methods for common failure cases.
 *
 * @remarks
 * All errors thrown by Conduit should use this class or its factories
 * to ensure consistent debugging and error handling behavior.
 */
export class ConduitError extends Error {
  /**
   * Creates a new ConduitError instance.
   *
   * @param message - Human-readable error message
   * @returns A new ConduitError
   */
  constructor(message: string) {
    super(message);
    this.name = "ConduitError";
  }

  /**
   * Creates a new ConduitError instance.
   *
   * @param message - Error message
   * @returns A ConduitError instance
   *
   * @remarks
   * This is a convenience factory method used for consistency across the codebase.
   */
  public static new(message: string) {
    return new ConduitError(message);
  }

  /**
   * Error thrown when the Conduit client is accessed before initialization.
   *
   * @returns A ConduitError describing the uninitialized client state
   *
   * @remarks
   * This usually means `login(credentials)` was not called before accessing APIs or events.
   */
  public static uninitializedClient() {
    return ConduitError.new(
      "Conduit client not yet initialized. Please call the .login(credentials) method",
    );
  }
}
