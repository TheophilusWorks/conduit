export class ConduitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConduitError";
  }

  public static new(message: string) {
    return new ConduitError(message);
  }

  public static uninitializedClient() {
    return ConduitError.new(
      "Conduit client not yet initialized. Please call the .login(credentials) method",
    );
  }
}
