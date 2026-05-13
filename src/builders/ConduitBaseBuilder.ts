export abstract class ConduitBaseBuilder<T> {
  protected _data: T;

  protected constructor(initial: T) {
    this._data = initial;
  }

  public build(): T {
    return this._data;
  }

  public static create<B extends ConduitBaseBuilder<any>>(
    this: new () => B
  ): B {
    return new this();
  }
}
