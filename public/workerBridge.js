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
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/web-workers/bridge.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/web-workers sync recursive":
/*!******************************!*\
  !*** ./src/web-workers sync ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("function webpackEmptyContext(req) {\n\tvar e = new Error(\"Cannot find module '\" + req + \"'\");\n\te.code = 'MODULE_NOT_FOUND';\n\tthrow e;\n}\nwebpackEmptyContext.keys = function() { return []; };\nwebpackEmptyContext.resolve = webpackEmptyContext;\nmodule.exports = webpackEmptyContext;\nwebpackEmptyContext.id = \"./src/web-workers sync recursive\";\n\n//# sourceURL=webpack:///./src/web-workers_sync?");

/***/ }),

/***/ "./src/web-workers/bridge-lib.ts":
/*!***************************************!*\
  !*** ./src/web-workers/bridge-lib.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\nObject.defineProperty(exports, \"__esModule\", { value: true });\nclass InternalError extends Error {\n    constructor() {\n        super(...arguments);\n        this.isInternal = true;\n    }\n}\nexports.InternalError = InternalError;\nexports.foo = {};\n/**\n * Class wrapping a register of contexts with the methods to register\n * new context values and retrieve existing context values\n */\nclass ContextRegister {\n    constructor() {\n        this.contexts = {};\n    }\n    /**\n     * Registers a context value under the key of `id`.\n     *\n     * @param   id        The id for which to register the context\n     * @param   value     The context value to register\n     * @throws            When the context already exists\n     */\n    registerContextValue(id, value) {\n        if (this.contexts.hasOwnProperty(id)) {\n            throw new InternalError(`A context value with id ${id} already exists and cannot be overwritten`);\n        }\n        this.contexts[id] = value;\n    }\n    /**\n     * Retrieves a context value by id from the `contexts` record.\n     *\n     * @param     id      The id of the context to retrieve\n     * @returns           The context value\n     * @throws            When the context does not exist\n     */\n    getContextValue(id) {\n        if (!this.contexts.hasOwnProperty(id)) {\n            throw new InternalError(`The requested context with id ${id} does not exist in this worker`);\n        }\n        return this.contexts[id];\n    }\n}\nexports.ContextRegister = ContextRegister;\nexports.contextRegister = new ContextRegister();\nexports.functionsRegister = {};\n/**\n * Handler function for messages received at the standard worker port.\n * Delegates messages of different kinds to individual handler functions.\n *\n * @param   message     The message object received\n * @param   replyPort   The port to which to reply with error messages\n */\nfunction handleMessage(message, replyPort) {\n    try {\n        switch (message.cmd) {\n            case \"execute\" /* execute */:\n            case \"map\" /* map */:\n                spawnExecution(message);\n                break;\n            case \"sendContext\" /* sendContext */:\n                exports.contextRegister.registerContextValue(message.id, message.value);\n                break;\n            case \"importFunction\" /* importFunction */:\n                importGlobalFunctionsFromModule(message.path, message.fnNames);\n                break;\n        }\n    }\n    catch (error) {\n        sendError(error, replyPort);\n    }\n}\nexports.handleMessage = handleMessage;\n/**\n * Imports a single function by its name from the module under `path` and returns\n * this function\n *\n * @param       path      Path to the module from which to import the function\n * @param       name      The name of the exported member of the module\n * @returns               Promise resolving with the function or rejecting with an error\n */\nasync function importFunctionFromModule(path, name = 'default') {\n    return Promise.resolve().then(() => __webpack_require__(\"./src/web-workers sync recursive\")(path)).then(exportedModule => {\n        const fn = exportedModule[name];\n        if (!fn || typeof fn !== 'function') {\n            throw new InternalError(`A function with name ${name} is not exported from module ${path} or is not a function`);\n        }\n        return fn;\n    });\n}\nexports.importFunctionFromModule = importFunctionFromModule;\n/**\n * Imports one or more functions from the module under `path` into the global function\n * register. The names of the exported members to import must be specified in `fnNames`.\n * The default export can be referred to with the string \"default\".\n *\n * @param     path        Path to the module from which to import the function\n * @param     fnNames     Names of the functions to import\n */\nasync function importGlobalFunctionsFromModule(path, fnNames = []) {\n    return Promise.resolve().then(() => __webpack_require__(\"./src/web-workers sync recursive\")(path)).then(exportedModule => {\n        for (const name of fnNames) {\n            if (!exportedModule[name] || typeof exportedModule[name] !== 'function') {\n                throw new InternalError(`Function \"${name}\" is not exported from module ${path} or is not a function`);\n            }\n            exports.functionsRegister[name] = exportedModule[name];\n        }\n    });\n}\nexports.importGlobalFunctionsFromModule = importGlobalFunctionsFromModule;\n/**\n * Creates an error command depending on the constructor of the provided error\n * and sends it as a message over `port`.\n *\n * @param   error     The error to send as message\n * @param   port      The port over which to send the message\n * @param   index     Optional index of an error when used with `map`\n */\nfunction sendError(error, port, index) {\n    if (error.isInternal === true) {\n        const message = {\n            cmd: \"error\" /* error */,\n            kind: \"internal\" /* internal */,\n            message: error.message,\n            index\n        };\n        port.postMessage(message);\n    }\n    else {\n        const message = {\n            cmd: \"error\" /* error */,\n            kind: \"execution\" /* execution */,\n            message: error.message,\n            stack: error.stack,\n            index\n        };\n        port.postMessage(message);\n    }\n}\nexports.sendError = sendError;\n/**\n * Runs the function `taskFunction` by passing it `data` and `context` and sends the results\n * to the `port`.\n *\n * `taskFunction` may be a synchronous function, an async function, or a function returning\n * a synchronous or asynchronous iterator, e.g. `GeneratorFunction` or `AsyncGeneratorFunction`.\n *\n * This function can be called with an index, which will be sent in the `.result` or `.error` messages.\n * When no index is set and a function returning an iterator is passed, the iterator results will be\n * sent as intermediate results. When an index is set, intermediate values are not sent (e.g. when calling `.map`)\n *\n * When Promises are returned from functions or iterators, they will be awaited before sending the result.\n * A rejected Promise results in an `.error` message.\n *\n * @async\n * @param     taskFunction    Function to call with `data` and `context`\n * @param     data            Data to pass as the first parameter\n * @param     context         Context to pass as the second parameter\n * @param     port            MessagePort to send `.result` and `.error` messages to\n * @param     index           Index for the execution\n * @returns                   Promise resolving when the function has been run\n */\nasync function runTaskFunction(taskFunction, data, context, port, index) {\n    // Keep track of the aborted state to stop generators from being iterated\n    let isAborted = false;\n    const handleClosePort = () => {\n        isAborted = true;\n    };\n    // port.on('close', handleClosePort);\n    /**\n     * Sends a result or a promise with the specified index as a `.result` message to `port`.\n     * When `resultOrPromise` is PromiseLike, it will be awaited. Rejections are sent as `.error` messages.\n     * When the result is a `$$Transfer` wrapper, the `transferList` is be passed to `port.postMessage`.\n     *\n     * @param   resultOrPromise     The result or Promise resolving with the result\n     * @param   resultIndex         The index of the result\n     */\n    const sendResult = async (resultOrPromise, resultIndex) => {\n        try {\n            const result = await Promise.resolve(resultOrPromise);\n            const hasTransfer = typeof result === 'object' && result.$$transfer === true;\n            const resultValue = hasTransfer ? result.value : result;\n            const transferList = hasTransfer ? result.transferList : [];\n            const message = {\n                cmd: \"result\" /* result */,\n                value: resultValue,\n                index: resultIndex\n            };\n            port.postMessage(message, transferList);\n        }\n        catch (err) {\n            sendError(err, port, resultIndex);\n        }\n    };\n    try {\n        // Run the task function with data and context\n        const result = taskFunction(data, context);\n        if (result && (result[Symbol.asyncIterator] || result[Symbol.iterator])) {\n            // If the result has an `asyncIterator` or `iterator`, this iterator is spun\n            // until the iterator is done\n            const isAsync = !!result[Symbol.asyncIterator];\n            const iterator = isAsync\n                ? result[Symbol.asyncIterator]()\n                : result[Symbol.iterator]();\n            let iterCount = -1;\n            let iterResult = null;\n            do {\n                iterCount++;\n                // If the session is aborted no more iterator steps\n                // have to be run\n                if (isAborted) {\n                    break;\n                }\n                // When the iterator is asynchronous, the iterator result is awaited\n                // otherwise it is returned synchronously\n                iterResult = isAsync\n                    ? await iterator.next()\n                    : iterator.next();\n                if (!iterResult.done) {\n                    if (typeof index !== 'number') {\n                        // When an intermediate result arrives and no index for the execution\n                        // is specified, fork the sending of the intermediate result with the iteration index\n                        sendResult(iterResult.value, iterCount);\n                    }\n                    else if (typeof iterResult.value.then === 'function') {\n                        // The only case when an iterator can return a Promise is a synchronous generator function\n                        // yielding a Promise. When this promise rejects in a `.map` session, the rejection is silenced\n                        iterResult.value.then(null, () => undefined);\n                    }\n                }\n            } while (!iterResult.done);\n            return sendResult(iterResult.value, index);\n        }\n        else {\n            return sendResult(result, index);\n        }\n    }\n    catch (error) {\n        return sendError(error, port, index);\n    }\n    finally {\n        // port.off('close', handleClosePort);\n    }\n}\nexports.runTaskFunction = runTaskFunction;\n/**\n * Performs the execution of `taskFunction` for each elements, which is sent as `.mapElement`\n * commands over the exclusive message channel.\n *\n * Results of executions are sent as `.result` messages including the corresponding index of the element.\n * When the `.mapEnd` command is sent, the message handler is unregistered.\n *\n * @param     command         The `.map` command object containing the exclusive MessagePort\n * @param     taskFunction    The task function to call for each element\n * @param     contextValue    The value of the context to pass to the task function\n */\nfunction startMapSession(command, taskFunction, contextValue) {\n    const port = command.port;\n    /**\n     * Handles for a single command sent over the exclusive MessageChannel for\n     * the current map session.\n     *\n     * @param   message     The message sent over the message channel.\n     */\n    const handleMapMessage = (event) => {\n        const message = event.data;\n        if (message.cmd === \"mapEnd\" /* mapEnd */) {\n            // Remove the listener so no reference to the function exists\n            port.removeEventListener('message', handleMapMessage);\n            return;\n        }\n        if (message.cmd === \"mapElement\" /* mapElement */) {\n            runTaskFunction(taskFunction, message.element, contextValue, port, message.index);\n        }\n    };\n    port.addEventListener('message', handleMapMessage);\n}\nexports.startMapSession = startMapSession;\n/**\n * Handles a call to `execute` or `map` by preparing the task function and\n * the context and calling the individual handler functions.\n *\n * Errors thrown during the execution or preparation of function and context\n * are caught and sent as `.error` commands over the exclusive MessageChannel\n *\n * @param     command       The command representing the execution\n */\nasync function spawnExecution(command) {\n    try {\n        const taskFunction = await getFunctionFromDescriptor(command.fn);\n        const contextValue = typeof command.contextId === 'number'\n            ? exports.contextRegister.getContextValue(command.contextId)\n            : undefined;\n        switch (command.cmd) {\n            case \"execute\" /* execute */:\n                runTaskFunction(taskFunction, command.data, contextValue, command.port);\n                break;\n            case \"map\" /* map */: {\n                startMapSession(command, taskFunction, contextValue);\n            }\n        }\n    }\n    catch (err) {\n        sendError(err, command.port);\n    }\n}\nexports.spawnExecution = spawnExecution;\n/**\n * Converts the descriptor object of a function to a callable function\n * based on the descriptor `$$exec_type`\n *\n * @param   fnDescriptor    The descriptor object of the function\n * @returns                 Callable task function\n * @throws                  When the function could not be retrieved\n */\nasync function getFunctionFromDescriptor(fnDescriptor) {\n    switch (fnDescriptor.$$exec_type) {\n        case \"transfer\" /* transfer */:\n            return new Function('data', 'context', `return (${fnDescriptor.fn})(data, context);`);\n        case \"ref\" /* ref */: {\n            const fn = exports.functionsRegister[fnDescriptor.name];\n            if (!fn) {\n                throw new InternalError(`Global function ${fnDescriptor.name} has not been registered as a global task function.`);\n            }\n            return fn;\n        }\n        case \"load\" /* load */: {\n            const fn = await importFunctionFromModule(fnDescriptor.path, fnDescriptor.name);\n            return fn;\n        }\n        default:\n            throw new InternalError(`Function descriptor $$exec_type \"${fnDescriptor.$$exec_type}\" is not supported`);\n    }\n}\nexports.getFunctionFromDescriptor = getFunctionFromDescriptor;\n\n\n//# sourceURL=webpack:///./src/web-workers/bridge-lib.ts?");

/***/ }),

/***/ "./src/web-workers/bridge.ts":
/*!***********************************!*\
  !*** ./src/web-workers/bridge.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("(function () {\n    const handleMessage = __webpack_require__(/*! ./bridge-lib */ \"./src/web-workers/bridge-lib.ts\").handleMessage;\n    onmessage = (event) => {\n        const message = event.data;\n        handleMessage(message, { postMessage });\n    };\n})();\n\n\n//# sourceURL=webpack:///./src/web-workers/bridge.ts?");

/***/ })

/******/ });