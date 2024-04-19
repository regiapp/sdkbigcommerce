(()=>{"use strict";var t={780:t=>{t.exports=require("iframe-resizer")},252:t=>{t.exports=require("iframe-resizer/js/iframeResizer.contentWindow")}},e={};function o(n){var r=e[n];if(void 0!==r)return r.exports;var i=e[n]={exports:{}};return t[n](i,i.exports,o),i.exports}o.n=t=>{var e=t&&t.__esModule?()=>t.default:()=>t;return o.d(e,{a:e}),e},o.d=(t,e)=>{for(var n in e)o.o(e,n)&&!o.o(t,n)&&Object.defineProperty(t,n,{enumerable:!0,get:e[n]})},o.o=(t,e)=>Object.prototype.hasOwnProperty.call(t,e),o.r=t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})};var n={};(()=>{o.r(n),o.d(n,{createEmbeddedCheckoutMessenger:()=>U,embedCheckout:()=>A});const t=require("@bigcommerce/request-sender"),e=require("tslib");var r={size:70,color:"#d9d9d9",backgroundColor:"#ffffff"},i="embedded-checkout-loading-indicator-rotation";const s=function(){function t(t){this.styles=(0,e.__assign)((0,e.__assign)({},r),t&&t.styles),this.containerStyles=(0,e.__assign)({},t&&t.containerStyles),this.defineAnimation(),this.container=this.buildContainer(),this.indicator=this.buildIndicator(),this.container.appendChild(this.indicator)}return t.prototype.show=function(t){if(t){var e=document.getElementById(t);if(!e)throw new Error("Unable to attach the loading indicator because the parent ID is not valid.");e.appendChild(this.container)}this.container.style.visibility="visible",this.container.style.opacity="1"},t.prototype.hide=function(){var t=this,e=function(){t.container.style.visibility="hidden",t.container.removeEventListener("transitionend",e)};this.container.addEventListener("transitionend",e),this.container.style.opacity="0"},t.prototype.buildContainer=function(){var t=document.createElement("div");return t.style.display="block",t.style.bottom="0",t.style.left="0",t.style.height="100%",t.style.width="100%",t.style.position="absolute",t.style.right="0",t.style.top="0",t.style.transition="all 250ms ease-out",t.style.opacity="0",this.setStyleAttribute(t,this.containerStyles),t},t.prototype.buildIndicator=function(){var t=document.createElement("div");return t.style.display="block",t.style.width=this.styles.size+"px",t.style.height=this.styles.size+"px",t.style.borderRadius=this.styles.size+"px",t.style.border="solid 1px",t.style.borderColor=this.styles.backgroundColor+" "+this.styles.backgroundColor+" "+this.styles.color+" "+this.styles.color,t.style.margin="0 auto",t.style.position="absolute",t.style.left="0",t.style.right="0",t.style.top="50%",t.style.transform="translateY(-50%) rotate(0deg)",t.style.transformStyle="preserve-3d",t.style.animation=i+" 500ms infinite cubic-bezier(0.69, 0.31, 0.56, 0.83)",t},t.prototype.setStyleAttribute=function(t,e){Object.keys(e).forEach((function(o){t.style.setProperty(o,e[o])}))},t.prototype.defineAnimation=function(){var t;if(!document.getElementById(i)){var e=document.createElement("style");e.id=i,null===(t=document.head)||void 0===t||t.appendChild(e),e.sheet instanceof CSSStyleSheet&&e.sheet.insertRule("\n                @keyframes "+i+" {\n                    0% { transform: translateY(-50%) rotate(0deg); }\n                    100% { transform: translateY(-50%) rotate(360deg); }\n                }\n            ",0)}},t}(),a=function(t){function o(e){var o,n,r=this.constructor,i=t.call(this,e||"An unexpected error has occurred.")||this;return i.name="StandardError",i.type="standard",o=i,n=r.prototype,Object.setPrototypeOf?Object.setPrototypeOf(o,n):o.__proto__=n,"function"==typeof Error.captureStackTrace?Error.captureStackTrace(i,r):i.stack=new Error(i.message).stack,i}return(0,e.__extends)(o,t),o}(Error),c=function(t){function o(e){var o=t.call(this,e||"Invalid arguments have been provided.")||this;return o.name="InvalidArgumentError",o.type="invalid_argument",o}return(0,e.__extends)(o,t),o}(a);function d(t){if(!/^(https?:)?\/\//.test(t))throw new c("The provided URL must be absolute.");var e=document.createElement("a");e.href=t;var o=e.port&&-1!==t.indexOf(e.hostname+":"+e.port)?e.port:"";return{hash:e.hash,hostname:e.hostname,href:e.href,origin:e.protocol+"//"+e.hostname+(o?":"+o:""),pathname:e.pathname,port:o,protocol:e.protocol,search:e.search}}function u(t){return d(0===t.hostname.indexOf("www")?t.href:t.href.replace(t.hostname,"www."+t.hostname))}const p=function(t,o,n){return o&&n?h(0,o,n):function(t){var o=function(t){function o(){return null!==t&&t.apply(this,arguments)||this}return(0,e.__extends)(o,t),o}(t);return Object.getOwnPropertyNames(t.prototype).forEach((function(e){var n=Object.getOwnPropertyDescriptor(t.prototype,e);n&&"constructor"!==e&&Object.defineProperty(o.prototype,e,h(t.prototype,e,n))})),o}(t)};function h(t,o,n){if("function"!=typeof n.value)return n;var r=n.value;return{get:function(){var t=r.bind(this);return Object.defineProperty(this,o,(0,e.__assign)((0,e.__assign)({},n),{value:t})),t},set:function(t){r=t}}}function l(t,e){return t.type===e}const f=function(){function t(t){this._sourceOrigins=[d(t).origin,u(d(t)).origin],this._isListening=!1,this._listeners={}}return t.prototype.listen=function(){this._isListening||(this._isListening=!0,window.addEventListener("message",this._handleMessage))},t.prototype.stopListen=function(){this._isListening&&(this._isListening=!1,window.removeEventListener("message",this._handleMessage))},t.prototype.addListener=function(t,e){var o=this._listeners[t];o||(this._listeners[t]=o=[]),-1===o.indexOf(e)&&o.push(e)},t.prototype.removeListener=function(t,e){var o=this._listeners[t];if(o){var n=o.indexOf(e);n>=0&&o.splice(n,1)}},t.prototype.trigger=function(t,e){var o=this._listeners[t.type];o&&o.forEach((function(o){return e?o(t,e):o(t)}))},t.prototype._handleMessage=function(t){if(-1!==this._sourceOrigins.indexOf(t.origin)&&l(t.data,t.data.type)){var o=t.data,n=o.context,r=(0,e.__rest)(o,["context"]);this.trigger(r,n)}},(0,e.__decorate)([p],t.prototype,"_handleMessage",null),t}(),m=require("rxjs"),y=require("rxjs/operators"),_=function(){function t(t,e,o){this._targetWindow=e,this._context=o,this._targetOrigin="*"===t?"*":d(t).origin}return t.prototype.post=function(t,o){var n=this,r=this._targetWindow;if(window!==r){if(!r)throw new Error("Unable to post message because target window is not set.");var i=o&&(0,m.fromEvent)(window,"message").pipe((0,y.filter)((function(t){return t.origin===n._targetOrigin&&l(t.data,t.data.type)&&-1!==[o.successType,o.errorType].indexOf(t.data.type)})),(0,y.map)((function(t){if(o.errorType===t.data.type)throw t.data;return t.data})),(0,y.take)(1)).toPromise();return r.postMessage((0,e.__assign)((0,e.__assign)({},t),{context:this._context}),this._targetOrigin),i}},t.prototype.setTarget=function(t){this._targetWindow=t},t.prototype.setContext=function(t){this._context=t},t}(),g=require("local-storage-fallback");var v=o.n(g);const w=function(){function t(t){this._namespace=t}return t.prototype.getItem=function(t){var e=v().getItem(this.withNamespace(t));if(null===e)return null;try{return JSON.parse(e)}catch(e){return this.removeItem(this.withNamespace(t)),null}},t.prototype.getItemOnce=function(t){var e=this.getItem(t);return this.removeItem(t),e},t.prototype.setItem=function(t,e){return v().setItem(this.withNamespace(t),JSON.stringify(e))},t.prototype.removeItem=function(t){return v().removeItem(this.withNamespace(t))},t.prototype.withNamespace=function(t){return this._namespace+"."+t},t}();var b;!function(t){t.CheckoutComplete="CHECKOUT_COMPLETE",t.CheckoutError="CHECKOUT_ERROR",t.CheckoutLoaded="CHECKOUT_LOADED",t.FrameError="FRAME_ERROR",t.FrameLoaded="FRAME_LOADED",t.SignedOut="SIGNED_OUT"}(b||(b={}));var E={body:{},headers:{},status:0};const C=function(t){function o(e){var o=t.call(this,e,{message:e.body.title})||this;return o.name="InvalidLoginTokenError",o.type="invalid_login_token",o}return(0,e.__extends)(o,t),o}(function(t){function o(e,o){var n=void 0===o?{}:o,r=n.message,i=n.errors,s=this,a=e||E,c=a.body,d=a.headers,u=a.status;return(s=t.call(this,r||"An unexpected error has occurred.")||this).name="RequestError",s.type="request",s.body=c,s.headers=d,s.status=u,s.errors=i||[],s}return(0,e.__extends)(o,t),o}(a));var L;!function(t){t.MissingContainer="missing_container",t.MissingContent="missing_content",t.UnknownError="unknown_error"}(L||(L={}));const O=function(t){function o(e,o){void 0===o&&(o=L.UnknownError);var n=t.call(this,e||"Unable to embed the checkout form.")||this;return n.subtype=o,n.name="NotEmbeddableError",n.type="not_embeddable",n}return(0,e.__extends)(o,t),o}(a);var k;!function(t){t.StyleConfigured="STYLE_CONFIGURED"}(k||(k={}));var S="isCookieAllowed",I="lastAllowCookieAttempt";const x=function(){function t(t,e,o,n,r,i,s,a){var c=this;this._iframeCreator=t,this._messageListener=e,this._messagePoster=o,this._loadingIndicator=n,this._requestSender=r,this._storage=i,this._location=s,this._options=a,this._isAttached=!1,this._options.onComplete&&this._messageListener.addListener(b.CheckoutComplete,this._options.onComplete),this._options.onError&&this._messageListener.addListener(b.CheckoutError,this._options.onError),this._options.onLoad&&this._messageListener.addListener(b.CheckoutLoaded,this._options.onLoad),this._options.onFrameLoad&&this._messageListener.addListener(b.FrameLoaded,this._options.onFrameLoad),this._options.onSignOut&&this._messageListener.addListener(b.SignedOut,this._options.onSignOut),this._messageListener.addListener(b.FrameLoaded,(function(){return c._configureStyles()}))}return t.prototype.attach=function(){var t=this;return this._isAttached?Promise.resolve(this):(this._isAttached=!0,this._messageListener.listen(),this._loadingIndicator.show(this._options.containerId),this._allowCookie().then((function(){return t._attemptLogin()})).then((function(e){return t._iframeCreator.createFrame(e,t._options.containerId)})).then((function(e){t._iframe=e,t._configureStyles(),t._loadingIndicator.hide()})).catch((function(e){return t._isAttached=!1,t._retryAllowCookie(e).catch((function(){throw t._messageListener.trigger({type:b.FrameError,payload:e}),t._loadingIndicator.hide(),e}))})).then((function(){return t})))},t.prototype.detach=function(){this._isAttached&&(this._isAttached=!1,this._messageListener.stopListen(),this._iframe&&this._iframe.parentNode&&(this._iframe.parentNode.removeChild(this._iframe),this._iframe.iFrameResizer.close()))},t.prototype._configureStyles=function(){this._iframe&&this._iframe.contentWindow&&this._options.styles&&(this._messagePoster.setTarget(this._iframe.contentWindow),this._messagePoster.post({type:k.StyleConfigured,payload:this._options.styles}))},t.prototype._attemptLogin=function(){return/^\/login\/token/.test(d(this._options.url).pathname)?this._requestSender.post(this._options.url).then((function(t){return t.body.redirectUrl})).catch((function(t){return Promise.reject(new C(t))})):Promise.resolve(this._options.url)},t.prototype._allowCookie=function(){if(this._storage.getItem(S))return Promise.resolve();this._storage.setItem(S,!0),this._storage.setItem(I,Date.now());var t=d(this._options.url).origin+"/embedded-checkout/allow-cookie?returnUrl="+encodeURIComponent(this._location.href);return document.body.style.visibility="hidden",this._location.replace(t),new Promise((function(){}))},t.prototype._retryAllowCookie=function(t){var e=Number(this._storage.getItem(I));return(!e||Date.now()-e>6e5)&&t instanceof O&&t.subtype===L.MissingContent?(this._storage.removeItem(I),this._storage.removeItem(S),this._allowCookie()):Promise.reject()},(0,e.__decorate)([p],t)}(),M=function(){function t(t){this._options=t}return t.prototype.createFrame=function(t,e){var o=document.getElementById(e),n=(this._options||{}).timeout,r=void 0===n?6e4:n;if(!o)throw new O("Unable to embed the iframe because the container element could not be found.",L.MissingContainer);var i=document.createElement("iframe");return i.src=t,i.style.border="none",i.style.display="none",i.style.width="100%",i.allowPaymentRequest=!0,o.appendChild(i),this._toResizableFrame(i,r).catch((function(t){throw o.removeChild(i),t}))},t.prototype._toResizableFrame=function(t,e){return new Promise((function(n,r){var i=window.setTimeout((function(){r(new O("Unable to embed the iframe because the content could not be loaded."))}),e),s=function(e){var i,s;if((e.origin===d(t.src).origin||e.origin===u(d(t.src)).origin)&&(l(e.data,b.FrameError)&&(a(),r(new O(e.data.payload.message,L.MissingContent))),l(e.data,b.FrameLoaded))){t.style.display="";var c=(i={scrolling:!1,sizeWidth:!1,heightCalculationMethod:e.data.payload&&e.data.payload.contentId?"taggedElement":"lowestElement"},s=t,(0,o(780).iframeResizer)(i,s));a(),n(c[c.length-1])}},a=function(){window.removeEventListener("message",s),window.clearTimeout(i)};window.addEventListener("message",s)}))},t}();var P="BigCommerce.EmbeddedCheckout";function A(e){var o=d(e.url).origin;return new x(new M,new f(o),new _(o),new s({styles:e.styles&&e.styles.loadingIndicator}),(0,t.createRequestSender)(),new w(P),window.location,e).attach()}function F(t){if(t.payload&&t.payload.contentId){var e=document.getElementById(t.payload.contentId);e&&!e.hasAttribute("data-iframe-height")&&e.setAttribute("data-iframe-height","")}}function R(t){return"object"==typeof t&&null!==t&&"message"in t&&"type"in t}const T=function(){function t(t,e,o,n){void 0===n&&(n={}),this._messageListener=t,this._messagePoster=e,this._untargetedMessagePoster=o,this._messageHandlers=n,this._messageListener.listen()}return t.prototype.postComplete=function(){var t={type:b.CheckoutComplete};this._postMessage(t)},t.prototype.postError=function(t){var e={type:b.CheckoutError,payload:this._transformError(t)};this._postMessage(e)},t.prototype.postFrameError=function(t){var e={type:b.FrameError,payload:this._transformError(t)};this._postMessage(e,{untargeted:!0})},t.prototype.postFrameLoaded=function(t){var e={type:b.FrameLoaded,payload:t};this._postMessage(e)},t.prototype.postLoaded=function(){var t={type:b.CheckoutLoaded};this._postMessage(t)},t.prototype.postSignedOut=function(){var t={type:b.SignedOut};this._postMessage(t)},t.prototype.receiveStyles=function(t){this._messageListener.addListener(k.StyleConfigured,(function(e){var o=e.payload;t(o)}))},t.prototype._postMessage=function(t,e){if(this._notifyMessageHandlers(t),e&&e.untargeted)return this._untargetedMessagePoster.post(t);this._messagePoster.post(t)},t.prototype._notifyMessageHandlers=function(t){var e=this;Object.keys(this._messageHandlers).forEach((function(o){if(t.type===o){var n=e._messageHandlers[o];n&&n.call(null,t)}}))},t.prototype._transformError=function(t){return{message:t.message,type:R(t)?t.type:void 0,subtype:R(t)?t.subtype:void 0}},(0,e.__decorate)([p],t)}(),j=function(){function t(){}return t.prototype.postComplete=function(){},t.prototype.postError=function(){},t.prototype.postFrameError=function(){},t.prototype.postFrameLoaded=function(){},t.prototype.postLoaded=function(){},t.prototype.postSignedOut=function(){},t.prototype.receiveStyles=function(){},(0,e.__decorate)([p],t)}();function U(t){var e;o(252);var n=t.parentWindow||window.parent;return window===n?new j:new T(new f(t.parentOrigin),new _(t.parentOrigin,n),new _("*",n),((e={})[b.FrameLoaded]=F,e))}})(),module.exports=n})();
//# sourceMappingURL=embedded-checkout.js.map