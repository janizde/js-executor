!function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=9)}({10:function(e,t,n){"use strict";var r,o=this&&this.__extends||(r=function(e,t){return(r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n])})(e,t)},function(e,t){function n(){this.constructor=e}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n)}),i=this&&this.__awaiter||function(e,t,n,r){return new(n||(n=Promise))(function(o,i){function s(e){try{a(r.next(e))}catch(e){i(e)}}function u(e){try{a(r.throw(e))}catch(e){i(e)}}function a(e){e.done?o(e.value):new n(function(t){t(e.value)}).then(s,u)}a((r=r.apply(e,t||[])).next())})},s=this&&this.__generator||function(e,t){var n,r,o,i,s={label:0,sent:function(){if(1&o[0])throw o[1];return o[1]},trys:[],ops:[]};return i={next:u(0),throw:u(1),return:u(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function u(i){return function(u){return function(i){if(n)throw new TypeError("Generator is already executing.");for(;s;)try{if(n=1,r&&(o=2&i[0]?r.return:i[0]?r.throw||((o=r.return)&&o.call(r),0):r.next)&&!(o=o.call(r,i[1])).done)return o;switch(r=0,o&&(i=[2&i[0],o.value]),i[0]){case 0:case 1:o=i;break;case 4:return s.label++,{value:i[1],done:!1};case 5:s.label++,r=i[1],i=[0];continue;case 7:i=s.ops.pop(),s.trys.pop();continue;default:if(!(o=(o=s.trys).length>0&&o[o.length-1])&&(6===i[0]||2===i[0])){s=0;continue}if(3===i[0]&&(!o||i[1]>o[0]&&i[1]<o[3])){s.label=i[1];break}if(6===i[0]&&s.label<o[1]){s.label=o[1],o=i;break}if(o&&s.label<o[2]){s.label=o[2],s.ops.push(i);break}o[2]&&s.ops.pop(),s.trys.pop();continue}i=t.call(e,s)}catch(e){i=[6,e],r=0}finally{n=o=0}if(5&i[0])throw i[1];return{value:i[0]?i[1]:void 0,done:!0}}([i,u])}}};t.__esModule=!0;var u=function(e){function t(){var t=null!==e&&e.apply(this,arguments)||this;return t.isInternal=!0,t}return o(t,e),t}(Error);t.InternalError=u,t.foo={};var a=function(){function e(){this.contexts={}}return e.prototype.registerContextValue=function(e,t){if(this.contexts.hasOwnProperty(e))throw new u("A context value with id "+e+" already exists and cannot be overwritten");this.contexts[e]=t},e.prototype.getContextValue=function(e){if(!this.contexts.hasOwnProperty(e))throw new u("The requested context with id "+e+" does not exist in this worker");return this.contexts[e]},e}();function c(e,t){return void 0===t&&(t="default"),i(this,void 0,void 0,function(){return s(this,function(r){return[2,Promise.resolve().then(function(){return n(6)(e)}).then(function(n){var r=n[t];if(!r||"function"!=typeof r)throw new u("A function with name "+t+" is not exported from module "+e+" or is not a function");return r})]})})}function f(e,r){return void 0===r&&(r=[]),i(this,void 0,void 0,function(){return s(this,function(o){return[2,Promise.resolve().then(function(){return n(6)(e)}).then(function(n){for(var o=0,i=r;o<i.length;o++){var s=i[o];if(!n[s]||"function"!=typeof n[s])throw new u('Function "'+s+'" is not exported from module '+e+" or is not a function");t.functionsRegister[s]=n[s]}})]})})}function l(e,t,n){if(!0===e.isInternal){var r={cmd:"error",kind:"internal",message:e.message,index:n};t.postMessage(r)}else{r={cmd:"error",kind:"execution",message:e.message,stack:e.stack,index:n};t.postMessage(r)}}function d(e,t,n,r,o){return i(this,void 0,void 0,function(){var u,a,c,f,d,p,h,v,y=this;return s(this,function(m){switch(m.label){case 0:u=!1,function(){u=!0},a=function(e,t){return i(y,void 0,void 0,function(){var n,o,i,u,a;return s(this,function(s){switch(s.label){case 0:return s.trys.push([0,2,,3]),[4,Promise.resolve(e)];case 1:return n=s.sent(),o="object"==typeof n&&!0===n.$$transfer,i=o?n.value:n,u=o?n.transferList:[],a={cmd:"result",value:i,index:t},r.postMessage(a,u),[3,3];case 2:return l(s.sent(),r,t),[3,3];case 3:return[2]}})})},m.label=1;case 1:if(m.trys.push([1,10,11,12]),!(c=e(t,n))||!c[Symbol.asyncIterator]&&!c[Symbol.iterator])return[3,8];f=!!c[Symbol.asyncIterator],d=f?c[Symbol.asyncIterator]():c[Symbol.iterator](),p=-1,h=null,m.label=2;case 2:return p++,u?[3,7]:f?[4,d.next()]:[3,4];case 3:return v=m.sent(),[3,5];case 4:v=d.next(),m.label=5;case 5:(h=v).done||("number"!=typeof o?a(h.value,p):"function"==typeof h.value.then&&h.value.then(null,function(){})),m.label=6;case 6:if(!h.done)return[3,2];m.label=7;case 7:return[2,a(h.value,o)];case 8:return[2,a(c,o)];case 9:return[3,12];case 10:return[2,l(m.sent(),r,o)];case 11:return[7];case 12:return[2]}})})}function p(e,t,n){var r=e.port,o=function(e){var i=e.data;"mapEnd"!==i.cmd?"mapElement"===i.cmd&&d(t,i.element,n,r,i.index):r.removeEventListener("message",o)};r.addEventListener("message",o),r.start()}function h(e){return i(this,void 0,void 0,function(){var n,r;return s(this,function(o){switch(o.label){case 0:return o.trys.push([0,2,,3]),[4,v(e.fn)];case 1:switch(n=o.sent(),r="number"==typeof e.contextId?t.contextRegister.getContextValue(e.contextId):void 0,e.cmd){case"execute":d(n,e.data,r,e.port);break;case"map":p(e,n,r)}return[3,3];case 2:return l(o.sent(),e.port),[3,3];case 3:return[2]}})})}function v(e){return i(this,void 0,void 0,function(){var n;return s(this,function(r){switch(r.label){case 0:switch(e.$$exec_type){case"transfer":return[3,1];case"ref":return[3,2];case"load":return[3,3]}return[3,5];case 1:return[2,new Function("data","context","return ("+e.fn+")(data, context);")];case 2:if(!(n=t.functionsRegister[e.name]))throw new u("Global function "+e.name+" has not been registered as a global task function.");return[2,n];case 3:return[4,c(e.path,e.name)];case 4:return[2,n=r.sent()];case 5:throw new u('Function descriptor $$exec_type "'+e.$$exec_type+'" is not supported')}})})}t.ContextRegister=a,t.contextRegister=new a,t.functionsRegister={},t.handleMessage=function(e,n){try{switch(e.cmd){case"execute":case"map":h(e);break;case"sendContext":t.contextRegister.registerContextValue(e.id,e.value);break;case"importFunction":f(e.path,e.fnNames)}}catch(e){l(e,n)}},t.importFunctionFromModule=c,t.importGlobalFunctionsFromModule=f,t.sendError=l,t.runTaskFunction=d,t.startMapSession=p,t.spawnExecution=h,t.getFunctionFromDescriptor=v},6:function(e,t){function n(e){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}n.keys=function(){return[]},n.resolve=n,e.exports=n,n.id=6},9:function(e,t,n){var r=n(10).handleMessage;onmessage=function(e){var t=e.data;r(t,{postMessage:postMessage})}}});