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

/***/ "./src/contextified-proxy.ts":
/*!***********************************!*\
  !*** ./src/contextified-proxy.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nclass ContextifiedProxy {\n    constructor(executor, context) {\n        this.executor = executor;\n        this.context = context;\n    }\n    execute(...args) {\n        return this.executor.__execute(args, this.context);\n    }\n    map(...args) {\n        return this.executor.__map(args, this.context);\n    }\n    provideContext(...args) {\n        return this.executor.provideContext(...args);\n    }\n}\nexports.default = ContextifiedProxy;\n\n\n//# sourceURL=webpack:///./src/contextified-proxy.ts?");

/***/ }),

/***/ "./src/executor-promise.ts":
/*!*********************************!*\
  !*** ./src/executor-promise.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\n/**\n * Encapsulated an array of Promises with the provided resolve and reject\n * callbacks and provides methods for chaining.\n *\n * When creating a `MultiPromise`, all promises from the constructor parameter\n * are immediately chained with the `elementCb` and `errorCb` callbacks.\n *\n * When calling `element` or `error`, a new `MultiPromise` is created with the\n * provided resolve and reject callbacks.\n *\n * When `introducePromise` is called with a new promise, this promise is immediately\n * chained with the `elementCb` and `errorCb` and inserted into the `promises` array.\n * The introduction of the new promise is propagated to the child promises.\n *\n * @template    T     The type with which the passed-in promises resolve\n * @template    R1    The return type of the success callback\n * @template    R2    The return type of the error callback\n */\nclass MultiPromise {\n    /**\n     * Creates a new `MultiPromise` by chaining the provided `promises` with\n     * the callbacks `elementCb` and `errorCb`\n     *\n     * @param     promises    The unchained promises to use\n     * @param     elementCb   The success callback to chain\n     * @param     errorCb     The error callback to chain\n     */\n    constructor(promises, elementCb, errorCb) {\n        this.elementCb = elementCb;\n        this.errorCb = errorCb;\n        this.promises = promises.map((p, i) => this.__chainPromise(p, i));\n        this.children = [];\n    }\n    /**\n     * Creates a new `MultiPromise`, which is chained with the provided\n     * `onElement` and `onError` callbacks.\n     *\n     * @template    RR1         Return type of the new elementCb\n     * @template    RR2         Return type of the new errorCb\n     * @param       onElement   Element callback to chain onto the existing promises\n     * @param       onError     Error callback to chain onto the existing promises\n     * @returns                 `MultiPromise` chained with `onElement` and `onError`\n     */\n    element(onElement, onError) {\n        const mp = new MultiPromise(this.promises, onElement, onError);\n        this.children.push(mp);\n        return mp;\n    }\n    /**\n     * Convenience method to pass only an `onError` callback to `.element`\n     *\n     * @template    RR2       Return type of the error function\n     * @param       onError   Error callback to chain onto the existing promises\n     * @returns               `MultiPromise` chained with `onError`\n     */\n    error(onError) {\n        return this.element(null, onError);\n    }\n    /**\n     * Introduces a new promise, which is not yet contained in `promises` to\n     * the `MultiPromise` by immediately chaining `elementCb` and `errorCb` onto\n     * that promise and inserting it into the `promises` array for further calls to\n     * `.element` and `.error`.\n     *\n     * The introduction is propagated to all children.\n     *\n     * @param     promise     The new promise to introduce\n     * @param     index       The index that this promise corresponds to\n     */\n    introducePromise(promise, index) {\n        const chained = this.__chainPromise(promise, index);\n        this.promises[index] = chained;\n        this.children.forEach(child => child.introducePromise(chained, index));\n    }\n    /**\n     * Chains a promise with callbacks, translating the regular promise callback\n     * signatures to the element and error callback signatures, containing an index.\n     *\n     * @param     promise     The promise object to chain\n     * @param     index       The index of this promise object\n     * @returns               Promise chained with `elementCb` and `errorCb`\n     */\n    __chainPromise(promise, index) {\n        if (!promise) {\n            return promise;\n        }\n        const thenCb = this.elementCb\n            ? value => this.elementCb(value, index)\n            : undefined;\n        const catchCb = this.errorCb\n            ? reason => this.errorCb(reason, index)\n            : undefined;\n        return promise.then(thenCb, catchCb);\n    }\n}\n/**\n * Extended promise, that provides callbacks for the handling of single\n * promise elements as success or error callbacks.\n *\n * The `.then` and `.catch` methods behave similar to the equivalents of\n * regular promises and support promise chaining.\n * The `.element` and `.error` callbacks are the equivalents of `.then` and `.catch`\n * for single elements of a combined promise.\n *\n * Instances should be created using the `ExecutorPromise.forExecutor(executor, onAbort)`\n * factory method, which receives a callback function `executor`, which is immediately\n * called on creation. `executor` receives a `PromiseManager` providing methods for the\n * management of `ExecutorPromise`.\n *\n * @template    E       The type that a single element resolves with\n * @template    A       The type that the combined promise resolves with\n */\nclass ExecutorPromise {\n    /**\n     * Creates a new ExecutorPromise\n     *\n     * @param     allPromise      Promise representing the combined promise\n     * @param     elementPromise  MultiPromise for single promise elements\n     * @param     onAbort         Callback to abort the asynchronous operation\n     */\n    constructor(allPromise, elementPromise, onAbort) {\n        this.allPromise = allPromise;\n        this.elementPromise = elementPromise;\n        this.onAbort = onAbort;\n    }\n    /**\n     * Creates a new `ExecutorPromise` for the use with an `executor` callback.\n     * The `executor` callback behaves like the first parameter to a `Promise` constructor\n     * and receives an object providing methods for the management of the promise state.\n     *\n     * @static\n     * @template    E         The type that a single element resolves with\n     * @template    A         The type that the combined promise resolves with\n     * @param       executor  Executor callback containing the asynchronous operation\n     * @param       onAbort   Function to be called when `abort()` is invoked\n     * @returns               `ExecutorPromise` for `executor`\n     */\n    static forExecutor(executor) {\n        let resolveAll;\n        let rejectAll;\n        const allPromise = new Promise((res, rej) => {\n            resolveAll = res;\n            rejectAll = rej;\n        });\n        let abortCallback = null;\n        const onAbort = () => {\n            if (abortCallback) {\n                abortCallback();\n            }\n        };\n        // Start with an empty promise array, promises will be introduced\n        // when calling `resolveElement` or `rejectElement`\n        const elementPromise = new MultiPromise([], undefined, undefined);\n        const promise = new ExecutorPromise(allPromise, elementPromise, onAbort);\n        const resolveElement = (element, index) => {\n            const promise = Promise.resolve(element);\n            elementPromise.introducePromise(promise, index);\n        };\n        const rejectElement = (reason, index) => {\n            const promise = Promise.reject(reason);\n            elementPromise.introducePromise(promise, index);\n        };\n        const setOnAbort = (callback) => {\n            abortCallback = callback;\n        };\n        const manager = {\n            resolveAll,\n            rejectAll,\n            resolveElement,\n            rejectElement,\n            setOnAbort\n        };\n        executor(manager);\n        return promise;\n    }\n    /**\n     * Chains the `onFulfilled` and `onRejects` callbacks onto the `allPromise`\n     * and returns a new `ExecutorPromise` holding this chained promise\n     *\n     * @template  R1              Return value of the success callback\n     * @template  R2              Return value of the error callback\n     * @param     onFulfilled     The success callback for the combined result\n     * @param     onRejected      The error callback for the combined result\n     * @returns                   New `ExecutorPromise` with chained `allPromise`\n     */\n    then(onFulfilled, onRejected) {\n        const chainedPromise = this.allPromise.then(onFulfilled, onRejected);\n        return new ExecutorPromise(chainedPromise, this.elementPromise, this.onAbort);\n    }\n    /**\n     * Convenience method to chain only a `onRejected` callback onto the `allPromise`\n     *\n     * @template  R2              Return type of the error callback\n     * @param     onRejected      Error callback for the combined result\n     * @returns                   New `ExecutorPromise` with chained `allPromise`\n     */\n    catch(onRejected) {\n        return this.then(null, onRejected);\n    }\n    /**\n     * Chains a `finally` callback onto the combined promise, which is invoked\n     * when the combined promise is settled.\n     *\n     * @param   onFinally         Callback invoked when the promise is settled\n     * @returns                   New `ExecutorPromise` with chained combined result\n     */\n    finally(onFinally) {\n        const chainedPromise = this.allPromise.finally(onFinally);\n        return new ExecutorPromise(chainedPromise, this.elementPromise, this.onAbort);\n    }\n    /**\n     * Chains the `onElement` and `onError` callbacks onto the single element\n     * promises and returns a new `ExecutorPromise`\n     *\n     *\n     * @template  R1              Return value of the success callback\n     * @template  R2              Return value of the error callback\n     * @param     onElement       The success callback for the element results\n     * @param     onError         The error callback for the element result\n     * @returns                   New `ExecutorPromise` with chained `elementPromise`\n     */\n    element(onElement, onError) {\n        const chainedPromise = this.elementPromise.element(onElement, onError);\n        return new ExecutorPromise(this.allPromise, chainedPromise, this.onAbort);\n    }\n    /**\n     * Convenience method to chain only an `onError` callback onto the `elementPromise`\n     *\n     * @template  R2              Return type of the error callback\n     * @param     onRejected      Error callback for the element results\n     * @returns                   New `ExecutorPromise` with chained `elementPromise`\n     */\n    error(onError) {\n        return this.element(null, onError);\n    }\n    /**\n     * Invokes the `onAbort` callback if set\n     */\n    abort() {\n        if (this.onAbort) {\n            this.onAbort();\n        }\n    }\n}\nexports.default = ExecutorPromise;\n\n\n//# sourceURL=webpack:///./src/executor-promise.ts?");

/***/ }),

/***/ "./src/idle-period-executor.ts":
/*!*************************************!*\
  !*** ./src/idle-period-executor.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst executor_promise_1 = __webpack_require__(/*! ./executor-promise */ \"./src/executor-promise.ts\");\nconst contextified_proxy_1 = __webpack_require__(/*! ./contextified-proxy */ \"./src/contextified-proxy.ts\");\nclass IdlePeriodExecutor {\n    constructor(threshold) {\n        this.queue = new IdlePeriodQueue(threshold);\n        this.contextCounter = 0;\n    }\n    provideContext(value) {\n        const context = {\n            id: this.contextCounter++,\n            value\n        };\n        return new contextified_proxy_1.default(this, context);\n    }\n    execute(fn, data) {\n        return this.__execute([fn, data], undefined);\n    }\n    __execute([fn, data], context) {\n        return executor_promise_1.default.forExecutor(manager => {\n            const handleElement = (value, index) => {\n                if (index === null) {\n                    manager.resolveAll(value);\n                }\n                else {\n                    manager.resolveElement(value, index);\n                }\n            };\n            const queueEl = {\n                fn,\n                data,\n                context: context ? context.value : undefined,\n                onElement: handleElement,\n                onError: reason => manager.rejectAll(reason)\n            };\n            this.queue.submit(queueEl);\n        });\n    }\n    map(fn, elements) {\n        return this.__map([fn, elements], undefined);\n    }\n    __map([fn, elements], context) {\n        return executor_promise_1.default.forExecutor(manager => {\n            let elementResults = new Array(elements.length);\n            let elementCount = 0;\n            let firstError = null;\n            const afterSettle = () => {\n                elementCount++;\n                if (elementCount >= elements.length) {\n                    Promise.resolve().then(() => {\n                        if (firstError !== null) {\n                            manager.rejectAll(firstError);\n                        }\n                        else {\n                            manager.resolveAll(elementResults);\n                        }\n                    });\n                }\n            };\n            elements.map((element, index) => {\n                const handleElement = (value, iterIndex) => {\n                    if (iterIndex === null) {\n                        manager.resolveElement(value, index);\n                    }\n                    afterSettle();\n                };\n                const handleError = (reason) => {\n                    manager.rejectElement(reason, index);\n                    afterSettle();\n                };\n                const queueEl = {\n                    fn,\n                    data: element,\n                    context: context ? context.value : undefined,\n                    index,\n                    onElement: handleElement,\n                    onError: handleError\n                };\n                this.queue.submit(queueEl);\n            });\n        });\n    }\n}\nexports.default = IdlePeriodExecutor;\nclass IdlePeriodQueue {\n    constructor(threshold, timeout = null) {\n        this.threshold = threshold;\n        this.timeout = timeout;\n        this.queue = [];\n        this.isCallbackScheduled = false;\n        this.currentSession = null;\n        this.__handleIdleCallback = this.__handleIdleCallback.bind(this);\n    }\n    submit(element) {\n        this.queue.push(element);\n        if (!this.isCallbackScheduled) {\n            window.requestIdleCallback(this.__handleIdleCallback, {\n                timeout: this.timeout\n            });\n        }\n    }\n    async __processElement(element) {\n        try {\n            const result = element.fn(element.data, element.context);\n            if (!result ||\n                !result[Symbol.iterator] ||\n                !result[Symbol.asyncIterator]) {\n                const settledResult = await Promise.resolve(result);\n                element.onElement(settledResult, null);\n                return null;\n            }\n            else {\n                return {\n                    element,\n                    iterator: result,\n                    iterIndex: 0\n                };\n            }\n        }\n        catch (err) {\n            element.onError(err);\n        }\n    }\n    async __processSessionTick(session) {\n        try {\n            const result = await session.iterator.next();\n            if (result.done) {\n                session.element.onElement(result.value, null);\n                return true;\n            }\n            else {\n                session.element.onElement(result.value, session.iterIndex);\n                session.iterIndex++;\n                return false;\n            }\n        }\n        catch (e) {\n            session.element.onError(e);\n            return true;\n        }\n    }\n    async __handleIdleCallback(deadline) {\n        while (deadline.timeRemaining() > this.threshold) {\n            if (this.currentSession !== null) {\n                const isSessionFinished = await this.__processSessionTick(this.currentSession);\n                if (isSessionFinished) {\n                    this.currentSession = null;\n                }\n                continue;\n            }\n            if (this.queue.length < 1) {\n                return;\n            }\n            const element = this.queue.shift();\n            const session = await this.__processElement(element);\n            if (!session) {\n                continue;\n            }\n            this.currentSession = session;\n        }\n        if (this.queue.length > 0) {\n            window.requestIdleCallback(this.__handleIdleCallback, {\n                timeout: this.timeout\n            });\n        }\n    }\n}\n\n\n//# sourceURL=webpack:///./src/idle-period-executor.ts?");

/***/ }),

/***/ "./src/webpack-entry.ts":
/*!******************************!*\
  !*** ./src/webpack-entry.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nconst idle_period_executor_1 = __webpack_require__(/*! ./idle-period-executor */ \"./src/idle-period-executor.ts\");\nconst exec = new idle_period_executor_1.default(5);\n\n\n//# sourceURL=webpack:///./src/webpack-entry.ts?");

/***/ })

/******/ });