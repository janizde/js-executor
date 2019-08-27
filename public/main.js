/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/webpack-entry.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/common/contextified-proxy.ts":
/*!******************************************!*\
  !*** ./src/common/contextified-proxy.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nclass ContextifiedProxy {\n    constructor(executor, context) {\n        this.executor = executor;\n        this.context = context;\n    }\n    execute(...args) {\n        return this.executor.__execute(args, this.context);\n    }\n    map(...args) {\n        return this.executor.__map(args, this.context);\n    }\n    provideContext(...args) {\n        return this.executor.provideContext(...args);\n    }\n}\nexports.default = ContextifiedProxy;\n\n\n//# sourceURL=webpack:///./src/common/contextified-proxy.ts?");

/***/ }),

/***/ "./src/common/executor-promise.ts":
/*!****************************************!*\
  !*** ./src/common/executor-promise.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\n// Symbol with which the `ExecutorPromise` is rejected on abortion\nexports.ABORTED = Symbol('ABORTED');\n/**\n * Encapsulated an array of Promises with the provided resolve and reject\n * callbacks and provides methods for chaining.\n *\n * When creating a `MultiPromise`, all promises from the constructor parameter\n * are immediately chained with the `elementCb` and `errorCb` callbacks.\n *\n * When calling `element` or `error`, a new `MultiPromise` is created with the\n * provided resolve and reject callbacks.\n *\n * When `introducePromise` is called with a new promise, this promise is immediately\n * chained with the `elementCb` and `errorCb` and inserted into the `promises` array.\n * The introduction of the new promise is propagated to the child promises.\n *\n * @template    T     The type with which the passed-in promises resolve\n * @template    R1    The return type of the success callback\n * @template    R2    The return type of the error callback\n */\nclass MultiPromise {\n    /**\n     * Creates a new `MultiPromise` by chaining the provided `promises` with\n     * the callbacks `elementCb` and `errorCb`\n     *\n     * @param     promises    The unchained promises to use\n     * @param     elementCb   The success callback to chain\n     * @param     errorCb     The error callback to chain\n     */\n    constructor(promises, elementCb, errorCb) {\n        this.elementCb = elementCb;\n        this.errorCb = errorCb;\n        this.promises = promises.map((p, i) => this.__chainPromise(p, i));\n        this.children = [];\n    }\n    /**\n     * Creates a new `MultiPromise`, which is chained with the provided\n     * `onElement` and `onError` callbacks.\n     *\n     * @template    RR1         Return type of the new elementCb\n     * @template    RR2         Return type of the new errorCb\n     * @param       onElement   Element callback to chain onto the existing promises\n     * @param       onError     Error callback to chain onto the existing promises\n     * @returns                 `MultiPromise` chained with `onElement` and `onError`\n     */\n    element(onElement, onError) {\n        const mp = new MultiPromise(this.promises, onElement, onError);\n        this.children.push(mp);\n        return mp;\n    }\n    /**\n     * Convenience method to pass only an `onError` callback to `.element`\n     *\n     * @template    RR2       Return type of the error function\n     * @param       onError   Error callback to chain onto the existing promises\n     * @returns               `MultiPromise` chained with `onError`\n     */\n    error(onError) {\n        return this.element(null, onError);\n    }\n    /**\n     * Introduces a new promise, which is not yet contained in `promises` to\n     * the `MultiPromise` by immediately chaining `elementCb` and `errorCb` onto\n     * that promise and inserting it into the `promises` array for further calls to\n     * `.element` and `.error`.\n     *\n     * The introduction is propagated to all children.\n     *\n     * @param     promise     The new promise to introduce\n     * @param     index       The index that this promise corresponds to\n     */\n    introducePromise(promise, index) {\n        const chained = this.__chainPromise(promise, index);\n        this.promises[index] = chained;\n        this.children.forEach(child => child.introducePromise(chained, index));\n    }\n    /**\n     * Chains a promise with callbacks, translating the regular promise callback\n     * signatures to the element and error callback signatures, containing an index.\n     *\n     * @param     promise     The promise object to chain\n     * @param     index       The index of this promise object\n     * @returns               Promise chained with `elementCb` and `errorCb`\n     */\n    __chainPromise(promise, index) {\n        if (!promise) {\n            return promise;\n        }\n        const thenCb = this.elementCb\n            ? value => this.elementCb(value, index)\n            : undefined;\n        const catchCb = this.errorCb\n            ? reason => this.errorCb(reason, index)\n            : undefined;\n        return promise.then(thenCb, catchCb);\n    }\n}\n/**\n * Extended promise, that provides callbacks for the handling of single\n * promise elements as success or error callbacks.\n *\n * The `.then` and `.catch` methods behave similar to the equivalents of\n * regular promises and support promise chaining.\n * The `.element` and `.error` callbacks are the equivalents of `.then` and `.catch`\n * for single elements of a combined promise.\n *\n * Instances should be created using the `ExecutorPromise.forExecutor(executor, onAbort)`\n * factory method, which receives a callback function `executor`, which is immediately\n * called on creation. `executor` receives a `PromiseManager` providing methods for the\n * management of `ExecutorPromise`.\n *\n * @template    E       The type that a single element resolves with\n * @template    A       The type that the combined promise resolves with\n */\nclass ExecutorPromise {\n    /**\n     * Creates a new ExecutorPromise\n     *\n     * @param     allPromise      Promise representing the combined promise\n     * @param     elementPromise  MultiPromise for single promise elements\n     * @param     onAbort         Callback to abort the asynchronous operation\n     */\n    constructor(allPromise, elementPromise, onAbort) {\n        this.allPromise = allPromise;\n        this.elementPromise = elementPromise;\n        this.onAbort = onAbort;\n    }\n    /**\n     * Creates a new `ExecutorPromise` for the use with an `executor` callback.\n     * The `executor` callback behaves like the first parameter to a `Promise` constructor\n     * and receives an object providing methods for the management of the promise state.\n     *\n     * @static\n     * @template    E         The type that a single element resolves with\n     * @template    A         The type that the combined promise resolves with\n     * @param       executor  Executor callback containing the asynchronous operation\n     * @param       onAbort   Function to be called when `abort()` is invoked\n     * @returns               `ExecutorPromise` for `executor`\n     */\n    static forExecutor(executor) {\n        let resolveAll;\n        let rejectAll;\n        const allPromise = new Promise((res, rej) => {\n            resolveAll = res;\n            rejectAll = rej;\n        });\n        let abortCallback = null;\n        const onAbort = () => {\n            if (abortCallback) {\n                abortCallback();\n            }\n        };\n        // Start with an empty promise array, promises will be introduced\n        // when calling `resolveElement` or `rejectElement`\n        const elementPromise = new MultiPromise([], undefined, undefined);\n        const promise = new ExecutorPromise(allPromise, elementPromise, onAbort);\n        const resolveElement = (element, index) => {\n            const promise = Promise.resolve(element);\n            elementPromise.introducePromise(promise, index);\n        };\n        const rejectElement = (reason, index) => {\n            const promise = Promise.reject(reason);\n            elementPromise.introducePromise(promise, index);\n        };\n        const setOnAbort = (callback) => {\n            abortCallback = callback;\n        };\n        const manager = {\n            resolveAll,\n            rejectAll,\n            resolveElement,\n            rejectElement,\n            setOnAbort\n        };\n        executor(manager);\n        return promise;\n    }\n    /**\n     * Chains the `onFulfilled` and `onRejects` callbacks onto the `allPromise`\n     * and returns a new `ExecutorPromise` holding this chained promise\n     *\n     * @template  R1              Return value of the success callback\n     * @template  R2              Return value of the error callback\n     * @param     onFulfilled     The success callback for the combined result\n     * @param     onRejected      The error callback for the combined result\n     * @returns                   New `ExecutorPromise` with chained `allPromise`\n     */\n    then(onFulfilled, onRejected) {\n        const chainedPromise = this.allPromise.then(onFulfilled, onRejected);\n        return new ExecutorPromise(chainedPromise, this.elementPromise, this.onAbort);\n    }\n    /**\n     * Convenience method to chain only a `onRejected` callback onto the `allPromise`\n     *\n     * @template  R2              Return type of the error callback\n     * @param     onRejected      Error callback for the combined result\n     * @returns                   New `ExecutorPromise` with chained `allPromise`\n     */\n    catch(onRejected) {\n        return this.then(null, onRejected);\n    }\n    /**\n     * Chains a `finally` callback onto the combined promise, which is invoked\n     * when the combined promise is settled.\n     *\n     * @param   onFinally         Callback invoked when the promise is settled\n     * @returns                   New `ExecutorPromise` with chained combined result\n     */\n    finally(onFinally) {\n        const chainedPromise = this.allPromise.finally(onFinally);\n        return new ExecutorPromise(chainedPromise, this.elementPromise, this.onAbort);\n    }\n    /**\n     * Chains the `onElement` and `onError` callbacks onto the single element\n     * promises and returns a new `ExecutorPromise`\n     *\n     *\n     * @template  R1              Return value of the success callback\n     * @template  R2              Return value of the error callback\n     * @param     onElement       The success callback for the element results\n     * @param     onError         The error callback for the element result\n     * @returns                   New `ExecutorPromise` with chained `elementPromise`\n     */\n    element(onElement, onError) {\n        const chainedPromise = this.elementPromise.element(onElement, onError);\n        return new ExecutorPromise(this.allPromise, chainedPromise, this.onAbort);\n    }\n    /**\n     * Convenience method to chain only an `onError` callback onto the `elementPromise`\n     *\n     * @template  R2              Return type of the error callback\n     * @param     onRejected      Error callback for the element results\n     * @returns                   New `ExecutorPromise` with chained `elementPromise`\n     */\n    error(onError) {\n        return this.element(null, onError);\n    }\n    /**\n     * Invokes the `onAbort` callback if set\n     */\n    abort() {\n        if (this.onAbort) {\n            this.onAbort();\n        }\n    }\n}\nexports.default = ExecutorPromise;\n\n\n//# sourceURL=webpack:///./src/common/executor-promise.ts?");

/***/ }),

/***/ "./src/idle-period/idle-period-executor.ts":
/*!*************************************************!*\
  !*** ./src/idle-period/idle-period-executor.ts ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst executor_promise_1 = __webpack_require__(/*! ./../common/executor-promise */ \"./src/common/executor-promise.ts\");\nconst contextified_proxy_1 = __webpack_require__(/*! ./../common/contextified-proxy */ \"./src/common/contextified-proxy.ts\");\n/**\n * Executor implementation, which uses an `IdlePeriodQueue` to schedule tasks\n * on the main thread.\n */\nclass IdlePeriodExecutor {\n    /**\n     * Creates a new executor with threshold and timeout for the queue\n     *\n     * @param     threshold     Minimum required time of a loop iteration in ms\n     * @param     timeout       Timeout parameter for `requestIdleCallback`\n     */\n    constructor(threshold, timeout = undefined) {\n        this.queue = new IdlePeriodQueue(threshold, timeout);\n        this.contextCounter = 0;\n    }\n    /**\n     * Creates a new context with `value` and returns a `ContextifiedProxy` holding that context\n     *\n     * @param     value         The context value to use\n     * @returns                 ContextifiedProxy holding the context\n     */\n    provideContext(value) {\n        const context = {\n            id: this.contextCounter++,\n            value\n        };\n        return new contextified_proxy_1.default(this, context);\n    }\n    /**\n     * Public method for the execution of a single task element on the queue without context\n     *\n     * @param     fn        Task function to execute\n     * @param     data      Data to pass to the task function\n     * @returns             ExecutorPromise for chaining\n     */\n    execute(fn, data) {\n        return this.__execute([fn, data], undefined);\n    }\n    /**\n     * Internal method for the execution of a single task on the queue with or without context\n     *\n     * @param     args      Arguments for `execute`\n     * @param     context   Context value or undefined\n     * @returns             ExecutorPromise for chaining\n     */\n    __execute([fn, data], context) {\n        return executor_promise_1.default.forExecutor(manager => {\n            const handleElement = (value, index) => {\n                if (index === null) {\n                    // When the element is not an intermediate result, resolve the combined Promise\n                    manager.resolveAll(value);\n                }\n                else {\n                    // When the element is an intermediate result, resolve a single element\n                    manager.resolveElement(value, index);\n                }\n            };\n            const queueEl = {\n                fn,\n                data,\n                context: context ? context.value : undefined,\n                isAborted: false,\n                onElement: handleElement,\n                onError: reason => manager.rejectAll(reason)\n            };\n            const onAbort = () => {\n                queueEl.isAborted = true;\n                this.queue.clearAborted();\n                manager.rejectAll(executor_promise_1.ABORTED);\n            };\n            this.queue.submit(queueEl);\n            manager.setOnAbort(onAbort);\n        });\n    }\n    /**\n     * Public method for the distribution of multiple task elements onto\n     * the IdlePeriodQueue without context\n     *\n     * @param     fn        Task function to execute\n     * @param     elements  Elements to pass to the task function\n     * @returns             ExecutorPromise for chaining\n     */\n    map(fn, elements) {\n        return this.__map([fn, elements], undefined);\n    }\n    /**\n     * Internal method for the distribution of multiple task elements onto\n     * the IdlePeriodQueue with or without context\n     *\n     * @param     args      Arguments for `map` method\n     * @param     context   Context to pass to the task function\n     */\n    __map([fn, elements], context) {\n        return executor_promise_1.default.forExecutor(manager => {\n            // Keep track of the results, that have been sent back from the queue\n            let elementResults = new Array(elements.length);\n            let elementCount = 0;\n            let firstError = null;\n            /**\n             * Increases the element count and resolves the combined promise when all\n             * elements have been responded to with the array of all results.\n             * When an error has occurred, the combined Promise is rejects with the first\n             * error occurred.\n             */\n            const afterSettle = () => {\n                elementCount++;\n                if (elementCount >= elements.length) {\n                    Promise.resolve().then(() => {\n                        if (firstError !== null) {\n                            manager.rejectAll(firstError);\n                        }\n                        else {\n                            manager.resolveAll(elementResults);\n                        }\n                    });\n                }\n            };\n            // Create QueueElements for each input element\n            const queueElements = elements.map((element, index) => {\n                const handleElement = (value, iterIndex) => {\n                    if (iterIndex === null) {\n                        manager.resolveElement(value, index);\n                        elementResults[index] = value;\n                        afterSettle();\n                    }\n                };\n                const handleError = (reason) => {\n                    manager.rejectElement(reason, index);\n                    elementResults[index] = null;\n                    afterSettle();\n                };\n                const queueEl = {\n                    fn,\n                    data: element,\n                    context: context ? context.value : undefined,\n                    index,\n                    isAborted: false,\n                    onElement: handleElement,\n                    onError: handleError\n                };\n                return queueEl;\n            });\n            // Submit all elements to the queue\n            queueElements.forEach(queueElement => this.queue.submit(queueElement));\n            // Callback setting the `isAborted` flag on all QueueElements and rejecting\n            // the combined Promise with the `ABORTED` symbol\n            const onAbort = () => {\n                queueElements.forEach(el => {\n                    el.isAborted = true;\n                });\n                this.queue.clearAborted();\n                manager.rejectAll(executor_promise_1.ABORTED);\n            };\n            manager.setOnAbort(onAbort);\n        });\n    }\n}\nexports.default = IdlePeriodExecutor;\n/**\n * Queue of tasks, which are executed inside `window.requestIdleCallback` callback functions.\n *\n * When elements are added to the queue, a loop is started, which takes the oldest element from\n * the queue and processes it until the `deadline.timeRemaining()` is lower than `threshold`.\n *\n * When a task function returns a sync or async iterator, an `IterableSession` is created, which\n * will iterate the iterator in the next loop ticks.\n *\n * When the iterator is asynchronous, the session will be put into the `sessionQueue` when the Promise\n * resolves, which acts as a high priority queue.\n */\nclass IdlePeriodQueue {\n    /**\n     * Creates a new IdlePeriodQueue\n     *\n     * @param     threshold       The minimum time to execute a loop tick. When `deadline.timeRemaining()` is below\n     *                            this value, a new IdleCallback is requested\n     * @param     timeout         `timeout` parameter of `requestIdleCallback`, which enforces the execution after the timeout\n     */\n    constructor(threshold, timeout = null) {\n        this.threshold = threshold;\n        this.timeout = timeout;\n        this.queue = [];\n        this.isCallbackScheduled = false;\n        this.asyncSessionQueue = [];\n        this.currentSession = null;\n        this.__handleIdleCallback = this.__handleIdleCallback.bind(this);\n    }\n    /**\n     * Submits the QueueElement to the default queue and scheduled an idle callback\n     * if none is in progress.\n     *\n     * @param     element       The element to add to the queue\n     */\n    submit(element) {\n        this.queue.push(element);\n        if (!this.isCallbackScheduled) {\n            window.requestIdleCallback(this.__handleIdleCallback);\n            this.isCallbackScheduled = true;\n        }\n    }\n    /**\n     * Explicitly clears elements, whose `isAborted` flag is set from the `queue`.\n     * Aborted elements are not considered in the loop, but when multiple elements are aborted\n     * it is usually faster to clear them in advance.\n     */\n    clearAborted() {\n        for (let i = this.queue.length - 1; i >= 0; --i) {\n            if (this.queue[i].isAborted) {\n                this.queue.splice(i, 1);\n            }\n        }\n    }\n    /**\n     * Processes a single QueueElement by invoking the task function with data and context.\n     * When `fn` returns a Promise, `onElement` and `onError` will be called when the Promise has\n     * settled. Otherwise, the callbacks are invoked directly.\n     *\n     * When an `iterator` or `asyncIterator` is returned by the task function, an `IterableSession`\n     * is created and returned.\n     *\n     * @param     element       Queue element to be executed\n     * @returns                 IterableSession for an iterator or `null` if the task function\n     *                          does not return an iterator\n     */\n    __processElement(element) {\n        try {\n            const result = element.fn(element.data, element.context);\n            if (!result ||\n                (!result[Symbol.iterator] &&\n                    !result[Symbol.asyncIterator])) {\n                // When the result is not an iterator, call onElement and onError and return `null`\n                Promise.resolve(result).then(res => !element.isAborted && element.onElement(res, null), reason => !element.isAborted && element.onError(reason));\n                return null;\n            }\n            else {\n                // When the result is an iterator,\n                return {\n                    element,\n                    iterator: result,\n                    iterIndex: 0\n                };\n            }\n        }\n        catch (err) {\n            element.onError(err);\n        }\n    }\n    /**\n     * Processes the next tick of an `IterableSession` by invoking the `next` method and returns\n     * a boolean indicating whether the session should be removed from the `currentSession`.\n     *\n     * When `next` returns a Promise, this Promise is chained with a callback, which will insert\n     * the session into the `asyncSessionQueue` after finishing the step and returns `true` to remove\n     * the session as `currentSession`.\n     *\n     * When `next` synchronously returns an `IteratorResult`, the `onElement` and `onError` callbacks are\n     * invoked accordingly and the `done` flag is returned.\n     *\n     * @param     session     The `IterableSession` to iterate\n     * @returns               Whether the session is done as a synchronous session\n     */\n    __processSessionIteration(session) {\n        if (session.element.isAborted) {\n            session.iterator.return();\n        }\n        try {\n            const promiseOrResult = session.iterator.next();\n            if (typeof promiseOrResult.then === 'function') {\n                // When the result is PromiseLike, chain the Promise with completion callbacks\n                const promise = promiseOrResult;\n                promise.then(result => {\n                    if (session.element.isAborted) {\n                        return;\n                    }\n                    if (result.done) {\n                        session.element.onElement(result.value, null);\n                    }\n                    else {\n                        session.element.onElement(result.value, session.iterIndex);\n                        session.iterIndex++;\n                        // Push the session into the `asyncSessionQueue` once the Promise resolved\n                        this.asyncSessionQueue.push(session);\n                    }\n                }, reason => {\n                    // When an error occurs, call `onError` and do not add the session to the `asyncSessionQueue`\n                    !session.element.isAborted && session.element.onError(reason);\n                });\n                // Act as if the iterator is finished and will be removed as `currentSession`\n                return true;\n            }\n            else {\n                // When the iterator returns synchronously call `onElement` and `onError` accordingly\n                // and return the `done` flag of the iterator result\n                const result = promiseOrResult;\n                if (result.done) {\n                    session.element.onElement(result.value, null);\n                    return true;\n                }\n                else {\n                    session.element.onElement(result.value, session.iterIndex);\n                    session.iterIndex++;\n                    return false;\n                }\n            }\n        }\n        catch (e) {\n            // When an error occurs, treat iterator as finished\n            session.element.onError(e);\n            return true;\n        }\n    }\n    /**\n     * Callback function for `window.requestIdleCallback`. Loops until the `deadline.timeRemaining()` is less than `threshold`.\n     * In each loop iteration the following priorities exist:\n     *\n     * 1. When a `currentSession` exists, this session will be iterated by one iteration. Then the loop begins again.\n     * 2. When there are elements in the `asyncSessionQueue`, takes the oldest element and iterates this by one. Then the loop starts again.\n     * 3. When there are are elements in the `queue`, takes the oldest element from the queue and processes this element.\n     * 4. When none of the above match, the loop is stopped.\n     * 5. When the `timeRemaining` is lower than `threshold`, the loop is stopped and a new Idle Callback is requested.\n     *\n     * @param     deadline      Deadline containing the remaining time for the callback\n     */\n    __handleIdleCallback(deadline) {\n        while (deadline.timeRemaining() > this.threshold) {\n            // Process the next iteration tick of the current synchronous `IterableSession` if it exists\n            if (this.currentSession !== null) {\n                const isSessionFinished = this.__processSessionIteration(this.currentSession);\n                // When the session is finished, remove it\n                if (isSessionFinished) {\n                    this.currentSession = null;\n                }\n                continue;\n            }\n            // If there are elements in the `asyncSessionQueue`, take the oldest and process the next\n            // iteration.\n            if (this.asyncSessionQueue.length > 0) {\n                const session = this.asyncSessionQueue.shift();\n                const isSessionFinished = this.__processSessionIteration(session);\n                // When it is synchronous in the iteration, set it as the `currentSession`\n                if (!isSessionFinished) {\n                    this.currentSession = session;\n                }\n                continue;\n            }\n            // If the queue is empty, break the loop\n            if (this.queue.length < 1) {\n                this.isCallbackScheduled = false;\n                return;\n            }\n            // Take the oldest element from the queue\n            const element = this.queue.shift();\n            if (element.isAborted) {\n                continue;\n            }\n            const session = this.__processElement(element);\n            if (session) {\n                // If the element results in an `IterableSession`, perform the first tick\n                // in this loop cycle.\n                this.currentSession = this.__processSessionIteration(session)\n                    ? null\n                    : session;\n            }\n        }\n        // When the deadline is exceeded and there are still elements to process, schedule another Idle Callback\n        if (this.queue.length > 0 ||\n            this.currentSession ||\n            this.asyncSessionQueue.length > 0) {\n            window.requestIdleCallback(this.__handleIdleCallback, {\n                timeout: this.timeout\n            });\n        }\n        else {\n            this.isCallbackScheduled = false;\n        }\n    }\n}\n\n\n//# sourceURL=webpack:///./src/idle-period/idle-period-executor.ts?");

/***/ }),

/***/ "./src/webpack-entry.ts":
/*!******************************!*\
  !*** ./src/webpack-entry.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst idle_period_executor_1 = __webpack_require__(/*! ./idle-period/idle-period-executor */ \"./src/idle-period/idle-period-executor.ts\");\nconst exec = new idle_period_executor_1.default(0, 0);\nconst btn = document.createElement('button');\nbtn.innerText = 'Start';\ndocument.body.appendChild(btn);\n(() => {\n    const el = document.createElement('div');\n    el.style.backgroundColor = '#f00';\n    el.style.position = 'absolute';\n    el.style.width = '50px';\n    el.style.height = '50px';\n    document.body.appendChild(el);\n    let top = 0;\n    let left = 0;\n    const cb = () => {\n        top += 5;\n        left += 5;\n        el.style.top = `${top % window.innerHeight}px`;\n        el.style.left = `${left % window.innerWidth}px`;\n        window.requestAnimationFrame(cb);\n    };\n    window.requestAnimationFrame(cb);\n})();\nbtn.addEventListener('click', async function () {\n    const elements = [];\n    for (let i = 0; i < 50000; ++i) {\n        elements.push(Math.random() * 100);\n    }\n    const p1 = exec\n        .map(function* (data) {\n        for (let i = 0; i < 50000; ++i) { }\n        yield;\n        for (let i = 0; i < 50000; ++i) { }\n        yield;\n        //await new Promise(resolve => setTimeout(resolve, 10));\n        yield;\n        return data * 2;\n    }, elements)\n        .then(results => {\n        window.afterFirst = true;\n        console.log('first', results);\n    })\n        .catch(e => console.log('error', e));\n    btn.addEventListener('click', () => p1.abort(), { once: true });\n    Promise.all([p1]).then(() => document.writeln('finished'));\n}, { once: true });\n\n\n//# sourceURL=webpack:///./src/webpack-entry.ts?");

/***/ })

/******/ });