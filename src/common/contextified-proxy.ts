import { Context, Executor } from './typings';

/**
 * Class encapsulating the logic of the contextified proxy.
 * Keeps a reference to the originating executor and the context value.
 * The methods `execute` and `map` pass through the call arguments appended with the context.
 * The typings of the modules must be specified per executor implementation, as the signatures vary.
 */
export default class ContextifiedProxy {
  private executor: Executor;
  private context: Context<any>;

  constructor(executor: Executor, context: Context<any>) {
    this.executor = executor;
    this.context = context;
  }

  execute(...args: Array<any>) {
    return this.executor.__execute(args, this.context);
  }

  map(...args: Array<any>) {
    return this.executor.__map(args, this.context);
  }

  provideContext(...args: Array<any>) {
    return this.executor.provideContext(...args);
  }
}
