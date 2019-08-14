import WorkerPoolExecutor from "./worker-pool-executor";
import { Context, FnDescriptor, TransferList } from "./common";

export default class ContextifiedProxy<C> {
  private readonly executor: WorkerPoolExecutor;
  private readonly context: Context<C>;

  constructor(executor: WorkerPoolExecutor, context: Context<C>) {
    this.executor = executor;
    this.context = context;
  }

  public execute<I, O>(
    fnDescriptor: FnDescriptor<I, O, C>,
    data: I,
    transferList?: TransferList
  ) {
    return this.executor.__execute<I, O, C>(
      fnDescriptor,
      data,
      transferList,
      this.context
    );
  }

  public map<I, O>(
    fnDescriptor: FnDescriptor<I, O, C>,
    elements: Array<I>,
    transferList?: TransferList
  ) {
    return this.executor.__map<I, O, C>(
      fnDescriptor,
      elements,
      transferList,
      this.context
    );
  }

  public provideContext<C2>(value: C2, transferList?: TransferList) {
    return this.executor.provideContext<C2>(value, transferList);
  }
}
