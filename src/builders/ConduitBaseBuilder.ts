/**
 * Base class for fluent builder patterns in Conduit.
 *
 * Provides a shared structure for accumulating state and producing
 * a final constructed value via `.build()`.
 *
 * @typeParam T - The type of the final built output
 *
 * @remarks
 * All Conduit builders (e.g. MessageBuilder, AttachmentBuilder)
 * extend this class to inherit a consistent fluent API pattern.
 */
export abstract class ConduitBaseBuilder<T> {
  protected _data: T;

  /**
   * Initializes the builder with an initial value.
   *
   * @param initial - Starting state of the builder
   */
  protected constructor(initial: T) {
    this._data = initial;
  }

  /**
   * Finalizes and returns the built value.
   *
   * @returns The constructed output
   */
  public build(): T {
    return this._data;
  }

  /**
   * Creates a new builder instance using the concrete subclass.
   *
   * @typeParam B - The builder subclass type
   * @returns A new instance of the builder
   *
   * @remarks
   * This enables fluent factory usage like:
   * `MessageBuilder.create().body("hello")`
   */
  public static create<B extends ConduitBaseBuilder<any>>(
    this: new () => B,
  ): B {
    return new this();
  }
}
