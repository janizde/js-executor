// https://github.com/Microsoft/TypeScript/issues/21309#issuecomment-376338415
declare type RequestIdleCallbackHandle = any;
declare type RequestIdleCallbackOptions = {
  timeout: number;
};

declare type RequestIdleCallbackDeadline = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};

declare interface Window {
  requestIdleCallback: (
    callback: (deadline: RequestIdleCallbackDeadline) => void,
    opts?: RequestIdleCallbackOptions
  ) => RequestIdleCallbackHandle;
  cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void;
}
