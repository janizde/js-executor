import { Context, Executor } from './common';

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
