/*! For license information please see main.js.LICENSE.txt */
var Alien;
(() => {
    var t = {
            7627: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.HyperionSocketClient = void 0;
                const n = r(6643),
                    i = r(7276);

                function o(t) {
                    return t.endsWith("/") ? t.slice(0, t.length - 1) : t
                }
                e.HyperionSocketClient = class {
                    constructor(t, e) {
                        if (this.reversibleBuffer = [], this.online = !1, this.savedRequests = [], this.setEndpoint(t), e && (this.options = e, this.options.libStream && console.log("Client configured for lib stream"), this.options.chainApi && (this.options.chainApi = o(this.options.chainApi))), this.options.fetch) globalThis.fetch = this.options.fetch;
                        else {
                            if ("undefined" == typeof window) throw new Error("No fetch support!");
                            globalThis.fetch = window.fetch
                        }
                    }
                    disconnect() {
                        this.socket ? (this.lastReceivedBlock = null, this.socket.disconnect(), this.savedRequests = []) : console.log("Nothing to disconnect!")
                    }
                    get lastBlockNum() {
                        return this.lastReceivedBlock
                    }
                    setEndpoint(t) {
                        t ? this.socketURL = o(t) : console.error("URL not informed")
                    }
                    pushToBuffer(t) {
                        this.options.libStream && this.reversibleBuffer.push(t)
                    }
                    connect(t) {
                        if (this.dataQueue = n(((t, e) => {
                                t.irreversible = !1, this.onData ? this.options.async ? (this.pushToBuffer(t), this.onData(t, (() => {
                                    e()
                                }))) : (this.onData(t), this.pushToBuffer(t), e()) : (this.pushToBuffer(t), e())
                            }), 1), this.dataQueue.error((function(t) {
                                t && console.error("task experienced an error")
                            })), this.dataQueue.drain((function() {})), this.dataQueue.empty(this.onEmpty), this.options.libStream && (this.libDataQueue = n(((t, e) => {
                                t.irreversible = !0, this.onLibData ? this.options.async ? this.onLibData(t, (() => {
                                    e()
                                })) : (this.onLibData(t), e()) : e()
                            }), 1)), !this.socketURL) throw new Error("endpoint was not defined!");
                        this.socket = i(this.socketURL, {
                            transports: ["websocket", "polling"]
                        }), this.socket.on("connect", (() => {
                            this.online = !0, this.onConnect && this.onConnect(), t && t()
                        })), this.socket.on("error", (t => {
                            console.log(t)
                        })), this.socket.on("lib_update", (t => {
                            if (this.options.libStream)
                                for (; this.reversibleBuffer.length > 0 && this.reversibleBuffer[0].content.block_num <= t.block_num;) this.libDataQueue.push(this.reversibleBuffer.shift());
                            this.onLIB && this.onLIB(t);
                            for (const e of this.savedRequests) e.req.read_until && 0 !== e.req.read_until && e.req.read_until < t.block_num && this.disconnect()
                        })), this.socket.on("fork_event", (t => {
                            this.onFork && this.onFork(t)
                        })), this.socket.on("message", (t => {
                            if ((this.onData || this.onLibData) && (t.message || t.messages)) switch (t.type) {
                                case "delta_trace":
                                    t.messages ? t.messages.forEach((e => {
                                        this.processDeltaTrace(e, t.mode)
                                    })) : this.processDeltaTrace(JSON.parse(t.message), t.mode);
                                    break;
                                case "action_trace":
                                    t.messages ? t.messages.forEach((e => {
                                        this.processActionTrace(e, t.mode)
                                    })) : this.processActionTrace(JSON.parse(t.message), t.mode)
                            }
                        })), this.socket.on("status", (t => {
                            switch (t) {
                                case "relay_restored":
                                    this.online || (this.online = !0, this.resendRequests().catch(console.log));
                                    break;
                                case "relay_down":
                                    this.online = !1;
                                    break;
                                default:
                                    console.log(t)
                            }
                        })), this.socket.on("disconnect", (() => {
                            this.online = !1, console.log("disconnected!")
                        }))
                    }
                    processActionTrace(t, e) {
                        const r = "@" + t.act.name;
                        if (t[r]) {
                            const e = t[r];
                            Object.keys(e).forEach((r => {
                                t.act.data || (t.act.data = {}), t.act.data[r] = e[r]
                            })), delete t[r]
                        }
                        this.dataQueue.push({
                            type: "action",
                            mode: e,
                            content: t
                        }), this.lastReceivedBlock = t.block_num
                    }
                    processDeltaTrace(t, e) {
                        let r = "@" + t.table;
                        if (t[r + ".data"] && (r += ".data"), t[r]) {
                            const e = t[r];
                            Object.keys(e).forEach((r => {
                                t.data || (t.data = {}), t.data[r] = e[r]
                            })), delete t[r]
                        }
                        this.dataQueue.push({
                            type: "delta",
                            mode: e,
                            content: t
                        }), this.lastReceivedBlock = t.block_num
                    }
                    async resendRequests() {
                        console.log("resending saved requests");
                        const t = [...this.savedRequests];
                        this.savedRequests = [];
                        for (const e of t) switch (e.type) {
                            case "action":
                                await this.streamActions(e.req);
                                break;
                            case "delta":
                                await this.streamDeltas(e.req)
                        }
                    }
                    async streamActions(t) {
                        if (this.socket.connected) {
                            try {
                                await this.checkLastBlock(t)
                            } catch (t) {
                                return {
                                    status: "ERROR",
                                    error: t.message
                                }
                            }
                            return new Promise(((e, r) => {
                                this.socket.emit("action_stream_request", t, (n => {
                                    "OK" === n.status ? (this.savedRequests.push({
                                        type: "action",
                                        req: t
                                    }), n.startingBlock = t.start_from, e(n)) : r(n)
                                }))
                            }))
                        }
                    }
                    async streamDeltas(t) {
                        if (this.socket.connected) {
                            try {
                                await this.checkLastBlock(t)
                            } catch (t) {
                                return {
                                    status: "ERROR",
                                    error: t.message
                                }
                            }
                            return new Promise(((e, r) => {
                                this.socket.emit("delta_stream_request", t, (n => {
                                    "OK" === n.status ? (this.savedRequests.push({
                                        type: "delta",
                                        req: t
                                    }), n.startingBlock = t.start_from, e(n)) : r(n)
                                }))
                            }))
                        }
                    }
                    async checkLastBlock(t) {
                        if ("LIB" === String(t.start_from).toUpperCase()) {
                            let e, r, n = "";
                            e = this.options.chainApi ? this.options.chainApi : this.socketURL, e += "/v1/chain/get_info";
                            try {
                                const i = await globalThis.fetch(e).then((t => t.json())).catch((t => {
                                    n = t.message
                                }));
                                i && (i.last_irreversible_block_num ? (t.start_from = i.last_irreversible_block_num, console.log(`Requesting history stream starting at lib (block ${t.start_from})`), r = !0) : r = !1)
                            } catch (t) {
                                throw new Error(`get_info failed on: ${e} | error: ${t.message}`)
                            }
                            if (!r) throw new Error(`get_info failed on: ${e} | error: ${n}`)
                        } else 0 !== t.start_from && this.lastReceivedBlock && t.start_from < this.lastReceivedBlock && (t.start_from = this.lastReceivedBlock)
                    }
                }
            },
            1554: function(t, e, r) {
                "use strict";
                var n = this && this.__createBinding || (Object.create ? function(t, e, r, n) {
                        void 0 === n && (n = r), Object.defineProperty(t, n, {
                            enumerable: !0,
                            get: function() {
                                return e[r]
                            }
                        })
                    } : function(t, e, r, n) {
                        void 0 === n && (n = r), t[n] = e[r]
                    }),
                    i = this && this.__exportStar || function(t, e) {
                        for (var r in t) "default" === r || e.hasOwnProperty(r) || n(e, t, r)
                    };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const o = r(7627);
                i(r(5934), e), e.default = o.HyperionSocketClient
            },
            5934: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                })
            },
            7512: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.default = function(t) {
                    return (0, o.isAsync)(t) ? function(...e) {
                        const r = e.pop();
                        return a(t.apply(this, e), r)
                    } : (0, n.default)((function(e, r) {
                        var n;
                        try {
                            n = t.apply(this, e)
                        } catch (t) {
                            return r(t)
                        }
                        if (n && "function" == typeof n.then) return a(n, r);
                        r(null, n)
                    }))
                };
                var n = s(r(2472)),
                    i = s(r(337)),
                    o = r(2531);

                function s(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                }

                function a(t, e) {
                    return t.then((t => {
                        c(e, null, t)
                    }), (t => {
                        c(e, t && t.message ? t : new Error(t))
                    }))
                }

                function c(t, e, r) {
                    try {
                        t(e, r)
                    } catch (t) {
                        (0, i.default)((t => {
                            throw t
                        }), t)
                    }
                }
                t.exports = e.default
            },
            1044: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                class r {
                    constructor() {
                        this.head = this.tail = null, this.length = 0
                    }
                    removeLink(t) {
                        return t.prev ? t.prev.next = t.next : this.head = t.next, t.next ? t.next.prev = t.prev : this.tail = t.prev, t.prev = t.next = null, this.length -= 1, t
                    }
                    empty() {
                        for (; this.head;) this.shift();
                        return this
                    }
                    insertAfter(t, e) {
                        e.prev = t, e.next = t.next, t.next ? t.next.prev = e : this.tail = e, t.next = e, this.length += 1
                    }
                    insertBefore(t, e) {
                        e.prev = t.prev, e.next = t, t.prev ? t.prev.next = e : this.head = e, t.prev = e, this.length += 1
                    }
                    unshift(t) {
                        this.head ? this.insertBefore(this.head, t) : n(this, t)
                    }
                    push(t) {
                        this.tail ? this.insertAfter(this.tail, t) : n(this, t)
                    }
                    shift() {
                        return this.head && this.removeLink(this.head)
                    }
                    pop() {
                        return this.tail && this.removeLink(this.tail)
                    }
                    toArray() {
                        return [...this]
                    }*[Symbol.iterator]() {
                        for (var t = this.head; t;) yield t.data, t = t.next
                    }
                    remove(t) {
                        for (var e = this.head; e;) {
                            var {
                                next: r
                            } = e;
                            t(e) && this.removeLink(e), e = r
                        }
                        return this
                    }
                }

                function n(t, e) {
                    t.length = 1, t.head = t.tail = e
                }
                e.default = r, t.exports = e.default
            },
            2472: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.default = function(t) {
                    return function(...e) {
                        var r = e.pop();
                        return t.call(this, e, r)
                    }
                }, t.exports = e.default
            },
            4594: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.default = function(t) {
                    return function(...e) {
                        if (null === t) throw new Error("Callback was already called.");
                        var r = t;
                        t = null, r.apply(this, e)
                    }
                }, t.exports = e.default
            },
            405: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.default = function(t, e, r) {
                    if (null == e) e = 1;
                    else if (0 === e) throw new RangeError("Concurrency must not be zero");
                    var a = (0, s.default)(t),
                        c = 0,
                        u = [];
                    const h = {
                        error: [],
                        drain: [],
                        saturated: [],
                        unsaturated: [],
                        empty: []
                    };

                    function f(t, e) {
                        return t ? e ? void(h[t] = h[t].filter((t => t !== e))) : h[t] = [] : Object.keys(h).forEach((t => h[t] = []))
                    }

                    function l(t, ...e) {
                        h[t].forEach((t => t(...e)))
                    }
                    var p = !1;

                    function d(t, e, r, n) {
                        if (null != n && "function" != typeof n) throw new Error("task callback must be a function");
                        var o, s;

                        function a(t, ...e) {
                            return t ? r ? s(t) : o() : e.length <= 1 ? o(e[0]) : void o(e)
                        }
                        w.started = !0;
                        var c = {
                            data: t,
                            callback: r ? a : n || a
                        };
                        if (e ? w._tasks.unshift(c) : w._tasks.push(c), p || (p = !0, (0, i.default)((() => {
                                p = !1, w.process()
                            }))), r || !n) return new Promise(((t, e) => {
                            o = t, s = e
                        }))
                    }

                    function y(t) {
                        return function(e, ...r) {
                            c -= 1;
                            for (var n = 0, i = t.length; n < i; n++) {
                                var o = t[n],
                                    s = u.indexOf(o);
                                0 === s ? u.shift() : s > 0 && u.splice(s, 1), o.callback(e, ...r), null != e && l("error", e, o.data)
                            }
                            c <= w.concurrency - w.buffer && l("unsaturated"), w.idle() && l("drain"), w.process()
                        }
                    }

                    function g(t) {
                        return !(0 !== t.length || !w.idle() || ((0, i.default)((() => l("drain"))), 0))
                    }
                    const m = t => e => {
                        if (!e) return new Promise(((e, r) => {
                            ! function(t, n) {
                                const i = (...n) => {
                                    f(t, i), ((t, n) => {
                                        if (t) return r(t);
                                        e(n)
                                    })(...n)
                                };
                                h[t].push(i)
                            }(t)
                        }));
                        f(t),
                            function(t, e) {
                                h[t].push(e)
                            }(t, e)
                    };
                    var v = !1,
                        w = {
                            _tasks: new o.default,
                            *[Symbol.iterator]() {
                                yield* w._tasks[Symbol.iterator]()
                            },
                            concurrency: e,
                            payload: r,
                            buffer: e / 4,
                            started: !1,
                            paused: !1,
                            push(t, e) {
                                if (Array.isArray(t)) {
                                    if (g(t)) return;
                                    return t.map((t => d(t, !1, !1, e)))
                                }
                                return d(t, !1, !1, e)
                            },
                            pushAsync(t, e) {
                                if (Array.isArray(t)) {
                                    if (g(t)) return;
                                    return t.map((t => d(t, !1, !0, e)))
                                }
                                return d(t, !1, !0, e)
                            },
                            kill() {
                                f(), w._tasks.empty()
                            },
                            unshift(t, e) {
                                if (Array.isArray(t)) {
                                    if (g(t)) return;
                                    return t.map((t => d(t, !0, !1, e)))
                                }
                                return d(t, !0, !1, e)
                            },
                            unshiftAsync(t, e) {
                                if (Array.isArray(t)) {
                                    if (g(t)) return;
                                    return t.map((t => d(t, !0, !0, e)))
                                }
                                return d(t, !0, !0, e)
                            },
                            remove(t) {
                                w._tasks.remove(t)
                            },
                            process() {
                                if (!v) {
                                    for (v = !0; !w.paused && c < w.concurrency && w._tasks.length;) {
                                        var t = [],
                                            e = [],
                                            r = w._tasks.length;
                                        w.payload && (r = Math.min(r, w.payload));
                                        for (var i = 0; i < r; i++) {
                                            var o = w._tasks.shift();
                                            t.push(o), u.push(o), e.push(o.data)
                                        }
                                        c += 1, 0 === w._tasks.length && l("empty"), c === w.concurrency && l("saturated");
                                        var s = (0, n.default)(y(t));
                                        a(e, s)
                                    }
                                    v = !1
                                }
                            },
                            length: () => w._tasks.length,
                            running: () => c,
                            workersList: () => u,
                            idle: () => w._tasks.length + c === 0,
                            pause() {
                                w.paused = !0
                            },
                            resume() {
                                !1 !== w.paused && (w.paused = !1, (0, i.default)(w.process))
                            }
                        };
                    return Object.defineProperties(w, {
                        saturated: {
                            writable: !1,
                            value: m("saturated")
                        },
                        unsaturated: {
                            writable: !1,
                            value: m("unsaturated")
                        },
                        empty: {
                            writable: !1,
                            value: m("empty")
                        },
                        drain: {
                            writable: !1,
                            value: m("drain")
                        },
                        error: {
                            writable: !1,
                            value: m("error")
                        }
                    }), w
                };
                var n = a(r(4594)),
                    i = a(r(337)),
                    o = a(r(1044)),
                    s = a(r(2531));

                function a(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                }
                t.exports = e.default
            },
            337: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.fallback = o, e.wrap = s;
                var r, n = e.hasSetImmediate = "function" == typeof setImmediate && setImmediate,
                    i = e.hasNextTick = "object" == typeof process && "function" == typeof process.nextTick;

                function o(t) {
                    setTimeout(t, 0)
                }

                function s(t) {
                    return (e, ...r) => t((() => e(...r)))
                }
                r = n ? setImmediate : i ? process.nextTick : o, e.default = s(r)
            },
            2531: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.isAsyncIterable = e.isAsyncGenerator = e.isAsync = void 0;
                var n, i = (n = r(7512)) && n.__esModule ? n : {
                    default: n
                };

                function o(t) {
                    return "AsyncFunction" === t[Symbol.toStringTag]
                }
                e.default = function(t) {
                    if ("function" != typeof t) throw new Error("expected a function");
                    return o(t) ? (0, i.default)(t) : t
                }, e.isAsync = o, e.isAsyncGenerator = function(t) {
                    return "AsyncGenerator" === t[Symbol.toStringTag]
                }, e.isAsyncIterable = function(t) {
                    return "function" == typeof t[Symbol.asyncIterator]
                }
            },
            6643: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.default = function(t, e) {
                    var r = (0, i.default)(t);
                    return (0, n.default)(((t, e) => {
                        r(t[0], e)
                    }), e, 1)
                };
                var n = o(r(405)),
                    i = o(r(2531));

                function o(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                }
                t.exports = e.default
            },
            5598: (t, e, r) => {
                function n() {
                    var t;
                    try {
                        t = e.storage.debug
                    } catch (t) {}
                    return !t && "undefined" != typeof process && "env" in process && (t = process.env.DEBUG), t
                }(e = t.exports = r(7564)).log = function() {
                    return "object" == typeof console && console.log && Function.prototype.apply.call(console.log, console, arguments)
                }, e.formatArgs = function(t) {
                    var r = this.useColors;
                    if (t[0] = (r ? "%c" : "") + this.namespace + (r ? " %c" : " ") + t[0] + (r ? "%c " : " ") + "+" + e.humanize(this.diff), r) {
                        var n = "color: " + this.color;
                        t.splice(1, 0, n, "color: inherit");
                        var i = 0,
                            o = 0;
                        t[0].replace(/%[a-zA-Z%]/g, (function(t) {
                            "%%" !== t && (i++, "%c" === t && (o = i))
                        })), t.splice(o, 0, n)
                    }
                }, e.save = function(t) {
                    try {
                        null == t ? e.storage.removeItem("debug") : e.storage.debug = t
                    } catch (t) {}
                }, e.load = n, e.useColors = function() {
                    return !("undefined" == typeof window || !window.process || "renderer" !== window.process.type) || ("undefined" == typeof navigator || !navigator.userAgent || !navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) && ("undefined" != typeof document && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || "undefined" != typeof window && window.console && (window.console.firebug || window.console.exception && window.console.table) || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || "undefined" != typeof navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/))
                }, e.storage = "undefined" != typeof chrome && void 0 !== chrome.storage ? chrome.storage.local : function() {
                    try {
                        return window.localStorage
                    } catch (t) {}
                }(), e.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"], e.formatters.j = function(t) {
                    try {
                        return JSON.stringify(t)
                    } catch (t) {
                        return "[UnexpectedJSONParseError]: " + t.message
                    }
                }, e.enable(n())
            },
            7564: (t, e, r) => {
                function n(t) {
                    var r;

                    function n() {
                        if (n.enabled) {
                            var t = n,
                                i = +new Date,
                                o = i - (r || i);
                            t.diff = o, t.prev = r, t.curr = i, r = i;
                            for (var s = new Array(arguments.length), a = 0; a < s.length; a++) s[a] = arguments[a];
                            s[0] = e.coerce(s[0]), "string" != typeof s[0] && s.unshift("%O");
                            var c = 0;
                            s[0] = s[0].replace(/%([a-zA-Z%])/g, (function(r, n) {
                                if ("%%" === r) return r;
                                c++;
                                var i = e.formatters[n];
                                if ("function" == typeof i) {
                                    var o = s[c];
                                    r = i.call(t, o), s.splice(c, 1), c--
                                }
                                return r
                            })), e.formatArgs.call(t, s);
                            var u = n.log || e.log || console.log.bind(console);
                            u.apply(t, s)
                        }
                    }
                    return n.namespace = t, n.enabled = e.enabled(t), n.useColors = e.useColors(), n.color = function(t) {
                        var r, n = 0;
                        for (r in t) n = (n << 5) - n + t.charCodeAt(r), n |= 0;
                        return e.colors[Math.abs(n) % e.colors.length]
                    }(t), n.destroy = i, "function" == typeof e.init && e.init(n), e.instances.push(n), n
                }

                function i() {
                    var t = e.instances.indexOf(this);
                    return -1 !== t && (e.instances.splice(t, 1), !0)
                }(e = t.exports = n.debug = n.default = n).coerce = function(t) {
                    return t instanceof Error ? t.stack || t.message : t
                }, e.disable = function() {
                    e.enable("")
                }, e.enable = function(t) {
                    var r;
                    e.save(t), e.names = [], e.skips = [];
                    var n = ("string" == typeof t ? t : "").split(/[\s,]+/),
                        i = n.length;
                    for (r = 0; r < i; r++) n[r] && ("-" === (t = n[r].replace(/\*/g, ".*?"))[0] ? e.skips.push(new RegExp("^" + t.substr(1) + "$")) : e.names.push(new RegExp("^" + t + "$")));
                    for (r = 0; r < e.instances.length; r++) {
                        var o = e.instances[r];
                        o.enabled = e.enabled(o.namespace)
                    }
                }, e.enabled = function(t) {
                    if ("*" === t[t.length - 1]) return !0;
                    var r, n;
                    for (r = 0, n = e.skips.length; r < n; r++)
                        if (e.skips[r].test(t)) return !1;
                    for (r = 0, n = e.names.length; r < n; r++)
                        if (e.names[r].test(t)) return !0;
                    return !1
                }, e.humanize = r(1246), e.instances = [], e.names = [], e.skips = [], e.formatters = {}
            },
            1516: t => {
                t.exports = "undefined" != typeof self ? self : "undefined" != typeof window ? window : Function("return this")()
            },
            4633: (t, e, r) => {
                t.exports = r(2483), t.exports.parser = r(6790)
            },
            2483: (t, e, r) => {
                var n = r(8096),
                    i = r(8767),
                    o = r(5598)("engine.io-client:socket"),
                    s = r(7355),
                    a = r(6790),
                    c = r(4187),
                    u = r(1830);

                function h(t, e) {
                    if (!(this instanceof h)) return new h(t, e);
                    e = e || {}, t && "object" == typeof t && (e = t, t = null), t ? (t = c(t), e.hostname = t.host, e.secure = "https" === t.protocol || "wss" === t.protocol, e.port = t.port, t.query && (e.query = t.query)) : e.host && (e.hostname = c(e.host).host), this.secure = null != e.secure ? e.secure : "undefined" != typeof location && "https:" === location.protocol, e.hostname && !e.port && (e.port = this.secure ? "443" : "80"), this.agent = e.agent || !1, this.hostname = e.hostname || ("undefined" != typeof location ? location.hostname : "localhost"), this.port = e.port || ("undefined" != typeof location && location.port ? location.port : this.secure ? 443 : 80), this.query = e.query || {}, "string" == typeof this.query && (this.query = u.decode(this.query)), this.upgrade = !1 !== e.upgrade, this.path = (e.path || "/engine.io").replace(/\/$/, "") + "/", this.forceJSONP = !!e.forceJSONP, this.jsonp = !1 !== e.jsonp, this.forceBase64 = !!e.forceBase64, this.enablesXDR = !!e.enablesXDR, this.withCredentials = !1 !== e.withCredentials, this.timestampParam = e.timestampParam || "t", this.timestampRequests = e.timestampRequests, this.transports = e.transports || ["polling", "websocket"], this.transportOptions = e.transportOptions || {}, this.readyState = "", this.writeBuffer = [], this.prevBufferLen = 0, this.policyPort = e.policyPort || 843, this.rememberUpgrade = e.rememberUpgrade || !1, this.binaryType = null, this.onlyBinaryUpgrades = e.onlyBinaryUpgrades, this.perMessageDeflate = !1 !== e.perMessageDeflate && (e.perMessageDeflate || {}), !0 === this.perMessageDeflate && (this.perMessageDeflate = {}), this.perMessageDeflate && null == this.perMessageDeflate.threshold && (this.perMessageDeflate.threshold = 1024), this.pfx = e.pfx || void 0, this.key = e.key || void 0, this.passphrase = e.passphrase || void 0, this.cert = e.cert || void 0, this.ca = e.ca || void 0, this.ciphers = e.ciphers || void 0, this.rejectUnauthorized = void 0 === e.rejectUnauthorized || e.rejectUnauthorized, this.forceNode = !!e.forceNode, this.isReactNative = "undefined" != typeof navigator && "string" == typeof navigator.product && "reactnative" === navigator.product.toLowerCase(), ("undefined" == typeof self || this.isReactNative) && (e.extraHeaders && Object.keys(e.extraHeaders).length > 0 && (this.extraHeaders = e.extraHeaders), e.localAddress && (this.localAddress = e.localAddress)), this.id = null, this.upgrades = null, this.pingInterval = null, this.pingTimeout = null, this.pingIntervalTimer = null, this.pingTimeoutTimer = null, this.open()
                }
                t.exports = h, h.priorWebsocketSuccess = !1, i(h.prototype), h.protocol = a.protocol, h.Socket = h, h.Transport = r(2874), h.transports = r(8096), h.parser = r(6790), h.prototype.createTransport = function(t) {
                    o('creating transport "%s"', t);
                    var e = function(t) {
                        var e = {};
                        for (var r in t) t.hasOwnProperty(r) && (e[r] = t[r]);
                        return e
                    }(this.query);
                    e.EIO = a.protocol, e.transport = t;
                    var r = this.transportOptions[t] || {};
                    return this.id && (e.sid = this.id), new n[t]({
                        query: e,
                        socket: this,
                        agent: r.agent || this.agent,
                        hostname: r.hostname || this.hostname,
                        port: r.port || this.port,
                        secure: r.secure || this.secure,
                        path: r.path || this.path,
                        forceJSONP: r.forceJSONP || this.forceJSONP,
                        jsonp: r.jsonp || this.jsonp,
                        forceBase64: r.forceBase64 || this.forceBase64,
                        enablesXDR: r.enablesXDR || this.enablesXDR,
                        withCredentials: r.withCredentials || this.withCredentials,
                        timestampRequests: r.timestampRequests || this.timestampRequests,
                        timestampParam: r.timestampParam || this.timestampParam,
                        policyPort: r.policyPort || this.policyPort,
                        pfx: r.pfx || this.pfx,
                        key: r.key || this.key,
                        passphrase: r.passphrase || this.passphrase,
                        cert: r.cert || this.cert,
                        ca: r.ca || this.ca,
                        ciphers: r.ciphers || this.ciphers,
                        rejectUnauthorized: r.rejectUnauthorized || this.rejectUnauthorized,
                        perMessageDeflate: r.perMessageDeflate || this.perMessageDeflate,
                        extraHeaders: r.extraHeaders || this.extraHeaders,
                        forceNode: r.forceNode || this.forceNode,
                        localAddress: r.localAddress || this.localAddress,
                        requestTimeout: r.requestTimeout || this.requestTimeout,
                        protocols: r.protocols || void 0,
                        isReactNative: this.isReactNative
                    })
                }, h.prototype.open = function() {
                    var t;
                    if (this.rememberUpgrade && h.priorWebsocketSuccess && -1 !== this.transports.indexOf("websocket")) t = "websocket";
                    else {
                        if (0 === this.transports.length) {
                            var e = this;
                            return void setTimeout((function() {
                                e.emit("error", "No transports available")
                            }), 0)
                        }
                        t = this.transports[0]
                    }
                    this.readyState = "opening";
                    try {
                        t = this.createTransport(t)
                    } catch (t) {
                        return this.transports.shift(), void this.open()
                    }
                    t.open(), this.setTransport(t)
                }, h.prototype.setTransport = function(t) {
                    o("setting transport %s", t.name);
                    var e = this;
                    this.transport && (o("clearing existing transport %s", this.transport.name), this.transport.removeAllListeners()), this.transport = t, t.on("drain", (function() {
                        e.onDrain()
                    })).on("packet", (function(t) {
                        e.onPacket(t)
                    })).on("error", (function(t) {
                        e.onError(t)
                    })).on("close", (function() {
                        e.onClose("transport close")
                    }))
                }, h.prototype.probe = function(t) {
                    o('probing transport "%s"', t);
                    var e = this.createTransport(t, {
                            probe: 1
                        }),
                        r = !1,
                        n = this;

                    function i() {
                        if (n.onlyBinaryUpgrades) {
                            var i = !this.supportsBinary && n.transport.supportsBinary;
                            r = r || i
                        }
                        r || (o('probe transport "%s" opened', t), e.send([{
                            type: "ping",
                            data: "probe"
                        }]), e.once("packet", (function(i) {
                            if (!r)
                                if ("pong" === i.type && "probe" === i.data) {
                                    if (o('probe transport "%s" pong', t), n.upgrading = !0, n.emit("upgrading", e), !e) return;
                                    h.priorWebsocketSuccess = "websocket" === e.name, o('pausing current transport "%s"', n.transport.name), n.transport.pause((function() {
                                        r || "closed" !== n.readyState && (o("changing transport and sending upgrade packet"), l(), n.setTransport(e), e.send([{
                                            type: "upgrade"
                                        }]), n.emit("upgrade", e), e = null, n.upgrading = !1, n.flush())
                                    }))
                                } else {
                                    o('probe transport "%s" failed', t);
                                    var s = new Error("probe error");
                                    s.transport = e.name, n.emit("upgradeError", s)
                                }
                        })))
                    }

                    function s() {
                        r || (r = !0, l(), e.close(), e = null)
                    }

                    function a(r) {
                        var i = new Error("probe error: " + r);
                        i.transport = e.name, s(), o('probe transport "%s" failed because of error: %s', t, r), n.emit("upgradeError", i)
                    }

                    function c() {
                        a("transport closed")
                    }

                    function u() {
                        a("socket closed")
                    }

                    function f(t) {
                        e && t.name !== e.name && (o('"%s" works - aborting "%s"', t.name, e.name), s())
                    }

                    function l() {
                        e.removeListener("open", i), e.removeListener("error", a), e.removeListener("close", c), n.removeListener("close", u), n.removeListener("upgrading", f)
                    }
                    h.priorWebsocketSuccess = !1, e.once("open", i), e.once("error", a), e.once("close", c), this.once("close", u), this.once("upgrading", f), e.open()
                }, h.prototype.onOpen = function() {
                    if (o("socket open"), this.readyState = "open", h.priorWebsocketSuccess = "websocket" === this.transport.name, this.emit("open"), this.flush(), "open" === this.readyState && this.upgrade && this.transport.pause) {
                        o("starting upgrade probes");
                        for (var t = 0, e = this.upgrades.length; t < e; t++) this.probe(this.upgrades[t])
                    }
                }, h.prototype.onPacket = function(t) {
                    if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) switch (o('socket receive: type "%s", data "%s"', t.type, t.data), this.emit("packet", t), this.emit("heartbeat"), t.type) {
                        case "open":
                            this.onHandshake(JSON.parse(t.data));
                            break;
                        case "pong":
                            this.setPing(), this.emit("pong");
                            break;
                        case "error":
                            var e = new Error("server error");
                            e.code = t.data, this.onError(e);
                            break;
                        case "message":
                            this.emit("data", t.data), this.emit("message", t.data)
                    } else o('packet received with socket readyState "%s"', this.readyState)
                }, h.prototype.onHandshake = function(t) {
                    this.emit("handshake", t), this.id = t.sid, this.transport.query.sid = t.sid, this.upgrades = this.filterUpgrades(t.upgrades), this.pingInterval = t.pingInterval, this.pingTimeout = t.pingTimeout, this.onOpen(), "closed" !== this.readyState && (this.setPing(), this.removeListener("heartbeat", this.onHeartbeat), this.on("heartbeat", this.onHeartbeat))
                }, h.prototype.onHeartbeat = function(t) {
                    clearTimeout(this.pingTimeoutTimer);
                    var e = this;
                    e.pingTimeoutTimer = setTimeout((function() {
                        "closed" !== e.readyState && e.onClose("ping timeout")
                    }), t || e.pingInterval + e.pingTimeout)
                }, h.prototype.setPing = function() {
                    var t = this;
                    clearTimeout(t.pingIntervalTimer), t.pingIntervalTimer = setTimeout((function() {
                        o("writing ping packet - expecting pong within %sms", t.pingTimeout), t.ping(), t.onHeartbeat(t.pingTimeout)
                    }), t.pingInterval)
                }, h.prototype.ping = function() {
                    var t = this;
                    this.sendPacket("ping", (function() {
                        t.emit("ping")
                    }))
                }, h.prototype.onDrain = function() {
                    this.writeBuffer.splice(0, this.prevBufferLen), this.prevBufferLen = 0, 0 === this.writeBuffer.length ? this.emit("drain") : this.flush()
                }, h.prototype.flush = function() {
                    "closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length && (o("flushing %d packets in socket", this.writeBuffer.length), this.transport.send(this.writeBuffer), this.prevBufferLen = this.writeBuffer.length, this.emit("flush"))
                }, h.prototype.write = h.prototype.send = function(t, e, r) {
                    return this.sendPacket("message", t, e, r), this
                }, h.prototype.sendPacket = function(t, e, r, n) {
                    if ("function" == typeof e && (n = e, e = void 0), "function" == typeof r && (n = r, r = null), "closing" !== this.readyState && "closed" !== this.readyState) {
                        (r = r || {}).compress = !1 !== r.compress;
                        var i = {
                            type: t,
                            data: e,
                            options: r
                        };
                        this.emit("packetCreate", i), this.writeBuffer.push(i), n && this.once("flush", n), this.flush()
                    }
                }, h.prototype.close = function() {
                    if ("opening" === this.readyState || "open" === this.readyState) {
                        this.readyState = "closing";
                        var t = this;
                        this.writeBuffer.length ? this.once("drain", (function() {
                            this.upgrading ? n() : e()
                        })) : this.upgrading ? n() : e()
                    }

                    function e() {
                        t.onClose("forced close"), o("socket closing - telling transport to close"), t.transport.close()
                    }

                    function r() {
                        t.removeListener("upgrade", r), t.removeListener("upgradeError", r), e()
                    }

                    function n() {
                        t.once("upgrade", r), t.once("upgradeError", r)
                    }
                    return this
                }, h.prototype.onError = function(t) {
                    o("socket error %j", t), h.priorWebsocketSuccess = !1, this.emit("error", t), this.onClose("transport error", t)
                }, h.prototype.onClose = function(t, e) {
                    "opening" !== this.readyState && "open" !== this.readyState && "closing" !== this.readyState || (o('socket close with reason: "%s"', t), clearTimeout(this.pingIntervalTimer), clearTimeout(this.pingTimeoutTimer), this.transport.removeAllListeners("close"), this.transport.close(), this.transport.removeAllListeners(), this.readyState = "closed", this.id = null, this.emit("close", t, e), this.writeBuffer = [], this.prevBufferLen = 0)
                }, h.prototype.filterUpgrades = function(t) {
                    for (var e = [], r = 0, n = t.length; r < n; r++) ~s(this.transports, t[r]) && e.push(t[r]);
                    return e
                }
            },
            2874: (t, e, r) => {
                var n = r(6790),
                    i = r(8767);

                function o(t) {
                    this.path = t.path, this.hostname = t.hostname, this.port = t.port, this.secure = t.secure, this.query = t.query, this.timestampParam = t.timestampParam, this.timestampRequests = t.timestampRequests, this.readyState = "", this.agent = t.agent || !1, this.socket = t.socket, this.enablesXDR = t.enablesXDR, this.withCredentials = t.withCredentials, this.pfx = t.pfx, this.key = t.key, this.passphrase = t.passphrase, this.cert = t.cert, this.ca = t.ca, this.ciphers = t.ciphers, this.rejectUnauthorized = t.rejectUnauthorized, this.forceNode = t.forceNode, this.isReactNative = t.isReactNative, this.extraHeaders = t.extraHeaders, this.localAddress = t.localAddress
                }
                t.exports = o, i(o.prototype), o.prototype.onError = function(t, e) {
                    var r = new Error(t);
                    return r.type = "TransportError", r.description = e, this.emit("error", r), this
                }, o.prototype.open = function() {
                    return "closed" !== this.readyState && "" !== this.readyState || (this.readyState = "opening", this.doOpen()), this
                }, o.prototype.close = function() {
                    return "opening" !== this.readyState && "open" !== this.readyState || (this.doClose(), this.onClose()), this
                }, o.prototype.send = function(t) {
                    if ("open" !== this.readyState) throw new Error("Transport not open");
                    this.write(t)
                }, o.prototype.onOpen = function() {
                    this.readyState = "open", this.writable = !0, this.emit("open")
                }, o.prototype.onData = function(t) {
                    var e = n.decodePacket(t, this.socket.binaryType);
                    this.onPacket(e)
                }, o.prototype.onPacket = function(t) {
                    this.emit("packet", t)
                }, o.prototype.onClose = function() {
                    this.readyState = "closed", this.emit("close")
                }
            },
            8096: (t, e, r) => {
                var n = r(6801),
                    i = r(6410),
                    o = r(8452),
                    s = r(4227);
                e.polling = function(t) {
                    var e = !1,
                        r = !1,
                        s = !1 !== t.jsonp;
                    if ("undefined" != typeof location) {
                        var a = "https:" === location.protocol,
                            c = location.port;
                        c || (c = a ? 443 : 80), e = t.hostname !== location.hostname || c !== t.port, r = t.secure !== a
                    }
                    if (t.xdomain = e, t.xscheme = r, "open" in new n(t) && !t.forceJSONP) return new i(t);
                    if (!s) throw new Error("JSONP disabled");
                    return new o(t)
                }, e.websocket = s
            },
            8452: (t, e, r) => {
                var n = r(9819),
                    i = r(3861),
                    o = r(1516);
                t.exports = h;
                var s, a = /\n/g,
                    c = /\\n/g;

                function u() {}

                function h(t) {
                    n.call(this, t), this.query = this.query || {}, s || (s = o.___eio = o.___eio || []), this.index = s.length;
                    var e = this;
                    s.push((function(t) {
                        e.onData(t)
                    })), this.query.j = this.index, "function" == typeof addEventListener && addEventListener("beforeunload", (function() {
                        e.script && (e.script.onerror = u)
                    }), !1)
                }
                i(h, n), h.prototype.supportsBinary = !1, h.prototype.doClose = function() {
                    this.script && (this.script.parentNode.removeChild(this.script), this.script = null), this.form && (this.form.parentNode.removeChild(this.form), this.form = null, this.iframe = null), n.prototype.doClose.call(this)
                }, h.prototype.doPoll = function() {
                    var t = this,
                        e = document.createElement("script");
                    this.script && (this.script.parentNode.removeChild(this.script), this.script = null), e.async = !0, e.src = this.uri(), e.onerror = function(e) {
                        t.onError("jsonp poll error", e)
                    };
                    var r = document.getElementsByTagName("script")[0];
                    r ? r.parentNode.insertBefore(e, r) : (document.head || document.body).appendChild(e), this.script = e, "undefined" != typeof navigator && /gecko/i.test(navigator.userAgent) && setTimeout((function() {
                        var t = document.createElement("iframe");
                        document.body.appendChild(t), document.body.removeChild(t)
                    }), 100)
                }, h.prototype.doWrite = function(t, e) {
                    var r = this;
                    if (!this.form) {
                        var n, i = document.createElement("form"),
                            o = document.createElement("textarea"),
                            s = this.iframeId = "eio_iframe_" + this.index;
                        i.className = "socketio", i.style.position = "absolute", i.style.top = "-1000px", i.style.left = "-1000px", i.target = s, i.method = "POST", i.setAttribute("accept-charset", "utf-8"), o.name = "d", i.appendChild(o), document.body.appendChild(i), this.form = i, this.area = o
                    }

                    function u() {
                        h(), e()
                    }

                    function h() {
                        if (r.iframe) try {
                            r.form.removeChild(r.iframe)
                        } catch (t) {
                            r.onError("jsonp polling iframe removal error", t)
                        }
                        try {
                            var t = '<iframe src="javascript:0" name="' + r.iframeId + '">';
                            n = document.createElement(t)
                        } catch (t) {
                            (n = document.createElement("iframe")).name = r.iframeId, n.src = "javascript:0"
                        }
                        n.id = r.iframeId, r.form.appendChild(n), r.iframe = n
                    }
                    this.form.action = this.uri(), h(), t = t.replace(c, "\\\n"), this.area.value = t.replace(a, "\\n");
                    try {
                        this.form.submit()
                    } catch (t) {}
                    this.iframe.attachEvent ? this.iframe.onreadystatechange = function() {
                        "complete" === r.iframe.readyState && u()
                    } : this.iframe.onload = u
                }
            },
            6410: (t, e, r) => {
                var n = r(6801),
                    i = r(9819),
                    o = r(8767),
                    s = r(3861),
                    a = r(5598)("engine.io-client:polling-xhr"),
                    c = r(1516);

                function u() {}

                function h(t) {
                    if (i.call(this, t), this.requestTimeout = t.requestTimeout, this.extraHeaders = t.extraHeaders, "undefined" != typeof location) {
                        var e = "https:" === location.protocol,
                            r = location.port;
                        r || (r = e ? 443 : 80), this.xd = "undefined" != typeof location && t.hostname !== location.hostname || r !== t.port, this.xs = t.secure !== e
                    }
                }

                function f(t) {
                    this.method = t.method || "GET", this.uri = t.uri, this.xd = !!t.xd, this.xs = !!t.xs, this.async = !1 !== t.async, this.data = void 0 !== t.data ? t.data : null, this.agent = t.agent, this.isBinary = t.isBinary, this.supportsBinary = t.supportsBinary, this.enablesXDR = t.enablesXDR, this.withCredentials = t.withCredentials, this.requestTimeout = t.requestTimeout, this.pfx = t.pfx, this.key = t.key, this.passphrase = t.passphrase, this.cert = t.cert, this.ca = t.ca, this.ciphers = t.ciphers, this.rejectUnauthorized = t.rejectUnauthorized, this.extraHeaders = t.extraHeaders, this.create()
                }

                function l() {
                    for (var t in f.requests) f.requests.hasOwnProperty(t) && f.requests[t].abort()
                }
                t.exports = h, t.exports.Request = f, s(h, i), h.prototype.supportsBinary = !0, h.prototype.request = function(t) {
                    return (t = t || {}).uri = this.uri(), t.xd = this.xd, t.xs = this.xs, t.agent = this.agent || !1, t.supportsBinary = this.supportsBinary, t.enablesXDR = this.enablesXDR, t.withCredentials = this.withCredentials, t.pfx = this.pfx, t.key = this.key, t.passphrase = this.passphrase, t.cert = this.cert, t.ca = this.ca, t.ciphers = this.ciphers, t.rejectUnauthorized = this.rejectUnauthorized, t.requestTimeout = this.requestTimeout, t.extraHeaders = this.extraHeaders, new f(t)
                }, h.prototype.doWrite = function(t, e) {
                    var r = "string" != typeof t && void 0 !== t,
                        n = this.request({
                            method: "POST",
                            data: t,
                            isBinary: r
                        }),
                        i = this;
                    n.on("success", e), n.on("error", (function(t) {
                        i.onError("xhr post error", t)
                    })), this.sendXhr = n
                }, h.prototype.doPoll = function() {
                    a("xhr poll");
                    var t = this.request(),
                        e = this;
                    t.on("data", (function(t) {
                        e.onData(t)
                    })), t.on("error", (function(t) {
                        e.onError("xhr poll error", t)
                    })), this.pollXhr = t
                }, o(f.prototype), f.prototype.create = function() {
                    var t = {
                        agent: this.agent,
                        xdomain: this.xd,
                        xscheme: this.xs,
                        enablesXDR: this.enablesXDR
                    };
                    t.pfx = this.pfx, t.key = this.key, t.passphrase = this.passphrase, t.cert = this.cert, t.ca = this.ca, t.ciphers = this.ciphers, t.rejectUnauthorized = this.rejectUnauthorized;
                    var e = this.xhr = new n(t),
                        r = this;
                    try {
                        a("xhr open %s: %s", this.method, this.uri), e.open(this.method, this.uri, this.async);
                        try {
                            if (this.extraHeaders)
                                for (var i in e.setDisableHeaderCheck && e.setDisableHeaderCheck(!0), this.extraHeaders) this.extraHeaders.hasOwnProperty(i) && e.setRequestHeader(i, this.extraHeaders[i])
                        } catch (t) {}
                        if ("POST" === this.method) try {
                            this.isBinary ? e.setRequestHeader("Content-type", "application/octet-stream") : e.setRequestHeader("Content-type", "text/plain;charset=UTF-8")
                        } catch (t) {}
                        try {
                            e.setRequestHeader("Accept", "*/*")
                        } catch (t) {}
                        "withCredentials" in e && (e.withCredentials = this.withCredentials), this.requestTimeout && (e.timeout = this.requestTimeout), this.hasXDR() ? (e.onload = function() {
                            r.onLoad()
                        }, e.onerror = function() {
                            r.onError(e.responseText)
                        }) : e.onreadystatechange = function() {
                            if (2 === e.readyState) try {
                                var t = e.getResponseHeader("Content-Type");
                                (r.supportsBinary && "application/octet-stream" === t || "application/octet-stream; charset=UTF-8" === t) && (e.responseType = "arraybuffer")
                            } catch (t) {}
                            4 === e.readyState && (200 === e.status || 1223 === e.status ? r.onLoad() : setTimeout((function() {
                                r.onError("number" == typeof e.status ? e.status : 0)
                            }), 0))
                        }, a("xhr data %s", this.data), e.send(this.data)
                    } catch (t) {
                        return void setTimeout((function() {
                            r.onError(t)
                        }), 0)
                    }
                    "undefined" != typeof document && (this.index = f.requestsCount++, f.requests[this.index] = this)
                }, f.prototype.onSuccess = function() {
                    this.emit("success"), this.cleanup()
                }, f.prototype.onData = function(t) {
                    this.emit("data", t), this.onSuccess()
                }, f.prototype.onError = function(t) {
                    this.emit("error", t), this.cleanup(!0)
                }, f.prototype.cleanup = function(t) {
                    if (void 0 !== this.xhr && null !== this.xhr) {
                        if (this.hasXDR() ? this.xhr.onload = this.xhr.onerror = u : this.xhr.onreadystatechange = u, t) try {
                            this.xhr.abort()
                        } catch (t) {}
                        "undefined" != typeof document && delete f.requests[this.index], this.xhr = null
                    }
                }, f.prototype.onLoad = function() {
                    var t;
                    try {
                        var e;
                        try {
                            e = this.xhr.getResponseHeader("Content-Type")
                        } catch (t) {}
                        t = ("application/octet-stream" === e || "application/octet-stream; charset=UTF-8" === e) && this.xhr.response || this.xhr.responseText
                    } catch (t) {
                        this.onError(t)
                    }
                    null != t && this.onData(t)
                }, f.prototype.hasXDR = function() {
                    return "undefined" != typeof XDomainRequest && !this.xs && this.enablesXDR
                }, f.prototype.abort = function() {
                    this.cleanup()
                }, f.requestsCount = 0, f.requests = {}, "undefined" != typeof document && ("function" == typeof attachEvent ? attachEvent("onunload", l) : "function" == typeof addEventListener && addEventListener("onpagehide" in c ? "pagehide" : "unload", l, !1))
            },
            9819: (t, e, r) => {
                var n = r(2874),
                    i = r(1830),
                    o = r(6790),
                    s = r(3861),
                    a = r(2281),
                    c = r(5598)("engine.io-client:polling");
                t.exports = h;
                var u = null != new(r(6801))({
                    xdomain: !1
                }).responseType;

                function h(t) {
                    var e = t && t.forceBase64;
                    u && !e || (this.supportsBinary = !1), n.call(this, t)
                }
                s(h, n), h.prototype.name = "polling", h.prototype.doOpen = function() {
                    this.poll()
                }, h.prototype.pause = function(t) {
                    var e = this;

                    function r() {
                        c("paused"), e.readyState = "paused", t()
                    }
                    if (this.readyState = "pausing", this.polling || !this.writable) {
                        var n = 0;
                        this.polling && (c("we are currently polling - waiting to pause"), n++, this.once("pollComplete", (function() {
                            c("pre-pause polling complete"), --n || r()
                        }))), this.writable || (c("we are currently writing - waiting to pause"), n++, this.once("drain", (function() {
                            c("pre-pause writing complete"), --n || r()
                        })))
                    } else r()
                }, h.prototype.poll = function() {
                    c("polling"), this.polling = !0, this.doPoll(), this.emit("poll")
                }, h.prototype.onData = function(t) {
                    var e = this;
                    c("polling got data %s", t), o.decodePayload(t, this.socket.binaryType, (function(t, r, n) {
                        if ("opening" === e.readyState && "open" === t.type && e.onOpen(), "close" === t.type) return e.onClose(), !1;
                        e.onPacket(t)
                    })), "closed" !== this.readyState && (this.polling = !1, this.emit("pollComplete"), "open" === this.readyState ? this.poll() : c('ignoring poll - transport state "%s"', this.readyState))
                }, h.prototype.doClose = function() {
                    var t = this;

                    function e() {
                        c("writing close packet"), t.write([{
                            type: "close"
                        }])
                    }
                    "open" === this.readyState ? (c("transport open - closing"), e()) : (c("transport not open - deferring close"), this.once("open", e))
                }, h.prototype.write = function(t) {
                    var e = this;
                    this.writable = !1;
                    var r = function() {
                        e.writable = !0, e.emit("drain")
                    };
                    o.encodePayload(t, this.supportsBinary, (function(t) {
                        e.doWrite(t, r)
                    }))
                }, h.prototype.uri = function() {
                    var t = this.query || {},
                        e = this.secure ? "https" : "http",
                        r = "";
                    return !1 !== this.timestampRequests && (t[this.timestampParam] = a()), this.supportsBinary || t.sid || (t.b64 = 1), t = i.encode(t), this.port && ("https" === e && 443 !== Number(this.port) || "http" === e && 80 !== Number(this.port)) && (r = ":" + this.port), t.length && (t = "?" + t), e + "://" + (-1 !== this.hostname.indexOf(":") ? "[" + this.hostname + "]" : this.hostname) + r + this.path + t
                }
            },
            4227: (t, e, r) => {
                var n, i, o = r(8764).Buffer,
                    s = r(2874),
                    a = r(6790),
                    c = r(1830),
                    u = r(3861),
                    h = r(2281),
                    f = r(5598)("engine.io-client:websocket");
                if ("undefined" != typeof WebSocket ? n = WebSocket : "undefined" != typeof self && (n = self.WebSocket || self.MozWebSocket), "undefined" == typeof window) try {
                    i = r(328)
                } catch (t) {}
                var l = n || i;

                function p(t) {
                    t && t.forceBase64 && (this.supportsBinary = !1), this.perMessageDeflate = t.perMessageDeflate, this.usingBrowserWebSocket = n && !t.forceNode, this.protocols = t.protocols, this.usingBrowserWebSocket || (l = i), s.call(this, t)
                }
                t.exports = p, u(p, s), p.prototype.name = "websocket", p.prototype.supportsBinary = !0, p.prototype.doOpen = function() {
                    if (this.check()) {
                        var t = this.uri(),
                            e = this.protocols,
                            r = {};
                        this.isReactNative || (r.agent = this.agent, r.perMessageDeflate = this.perMessageDeflate, r.pfx = this.pfx, r.key = this.key, r.passphrase = this.passphrase, r.cert = this.cert, r.ca = this.ca, r.ciphers = this.ciphers, r.rejectUnauthorized = this.rejectUnauthorized), this.extraHeaders && (r.headers = this.extraHeaders), this.localAddress && (r.localAddress = this.localAddress);
                        try {
                            this.ws = this.usingBrowserWebSocket && !this.isReactNative ? e ? new l(t, e) : new l(t) : new l(t, e, r)
                        } catch (t) {
                            return this.emit("error", t)
                        }
                        void 0 === this.ws.binaryType && (this.supportsBinary = !1), this.ws.supports && this.ws.supports.binary ? (this.supportsBinary = !0, this.ws.binaryType = "nodebuffer") : this.ws.binaryType = "arraybuffer", this.addEventListeners()
                    }
                }, p.prototype.addEventListeners = function() {
                    var t = this;
                    this.ws.onopen = function() {
                        t.onOpen()
                    }, this.ws.onclose = function() {
                        t.onClose()
                    }, this.ws.onmessage = function(e) {
                        t.onData(e.data)
                    }, this.ws.onerror = function(e) {
                        t.onError("websocket error", e)
                    }
                }, p.prototype.write = function(t) {
                    var e = this;
                    this.writable = !1;
                    for (var r = t.length, n = 0, i = r; n < i; n++) ! function(t) {
                        a.encodePacket(t, e.supportsBinary, (function(n) {
                            if (!e.usingBrowserWebSocket) {
                                var i = {};
                                t.options && (i.compress = t.options.compress), e.perMessageDeflate && ("string" == typeof n ? o.byteLength(n) : n.length) < e.perMessageDeflate.threshold && (i.compress = !1)
                            }
                            try {
                                e.usingBrowserWebSocket ? e.ws.send(n) : e.ws.send(n, i)
                            } catch (t) {
                                f("websocket closed before onclose event")
                            }--r || (e.emit("flush"), setTimeout((function() {
                                e.writable = !0, e.emit("drain")
                            }), 0))
                        }))
                    }(t[n])
                }, p.prototype.onClose = function() {
                    s.prototype.onClose.call(this)
                }, p.prototype.doClose = function() {
                    void 0 !== this.ws && this.ws.close()
                }, p.prototype.uri = function() {
                    var t = this.query || {},
                        e = this.secure ? "wss" : "ws",
                        r = "";
                    return this.port && ("wss" === e && 443 !== Number(this.port) || "ws" === e && 80 !== Number(this.port)) && (r = ":" + this.port), this.timestampRequests && (t[this.timestampParam] = h()), this.supportsBinary || (t.b64 = 1), (t = c.encode(t)).length && (t = "?" + t), e + "://" + (-1 !== this.hostname.indexOf(":") ? "[" + this.hostname + "]" : this.hostname) + r + this.path + t
                }, p.prototype.check = function() {
                    return !(!l || "__initialize" in l && this.name === p.prototype.name)
                }
            },
            6801: (t, e, r) => {
                var n = r(8058),
                    i = r(1516);
                t.exports = function(t) {
                    var e = t.xdomain,
                        r = t.xscheme,
                        o = t.enablesXDR;
                    try {
                        if ("undefined" != typeof XMLHttpRequest && (!e || n)) return new XMLHttpRequest
                    } catch (t) {}
                    try {
                        if ("undefined" != typeof XDomainRequest && !r && o) return new XDomainRequest
                    } catch (t) {}
                    if (!e) try {
                        return new(i[["Active"].concat("Object").join("X")])("Microsoft.XMLHTTP")
                    } catch (t) {}
                }
            },
            6790: (t, e, r) => {
                var n, i = r(6985),
                    o = r(3466),
                    s = r(9718),
                    a = r(6906),
                    c = r(1788);
                "undefined" != typeof ArrayBuffer && (n = r(3704));
                var u = "undefined" != typeof navigator && /Android/i.test(navigator.userAgent),
                    h = "undefined" != typeof navigator && /PhantomJS/i.test(navigator.userAgent),
                    f = u || h;
                e.protocol = 3;
                var l = e.packets = {
                        open: 0,
                        close: 1,
                        ping: 2,
                        pong: 3,
                        message: 4,
                        upgrade: 5,
                        noop: 6
                    },
                    p = i(l),
                    d = {
                        type: "error",
                        data: "parser error"
                    },
                    y = r(5548);

                function g(t, e, r) {
                    for (var n = new Array(t.length), i = a(t.length, r), o = function(t, r, i) {
                            e(r, (function(e, r) {
                                n[t] = r, i(e, n)
                            }))
                        }, s = 0; s < t.length; s++) o(s, t[s], i)
                }
                e.encodePacket = function(t, r, n, i) {
                    "function" == typeof r && (i = r, r = !1), "function" == typeof n && (i = n, n = null);
                    var o = void 0 === t.data ? void 0 : t.data.buffer || t.data;
                    if ("undefined" != typeof ArrayBuffer && o instanceof ArrayBuffer) return function(t, r, n) {
                        if (!r) return e.encodeBase64Packet(t, n);
                        var i = t.data,
                            o = new Uint8Array(i),
                            s = new Uint8Array(1 + i.byteLength);
                        s[0] = l[t.type];
                        for (var a = 0; a < o.length; a++) s[a + 1] = o[a];
                        return n(s.buffer)
                    }(t, r, i);
                    if (void 0 !== y && o instanceof y) return function(t, r, n) {
                        if (!r) return e.encodeBase64Packet(t, n);
                        if (f) return function(t, r, n) {
                            if (!r) return e.encodeBase64Packet(t, n);
                            var i = new FileReader;
                            return i.onload = function() {
                                e.encodePacket({
                                    type: t.type,
                                    data: i.result
                                }, r, !0, n)
                            }, i.readAsArrayBuffer(t.data)
                        }(t, r, n);
                        var i = new Uint8Array(1);
                        return i[0] = l[t.type], n(new y([i.buffer, t.data]))
                    }(t, r, i);
                    if (o && o.base64) return function(t, r) {
                        return r("b" + e.packets[t.type] + t.data.data)
                    }(t, i);
                    var s = l[t.type];
                    return void 0 !== t.data && (s += n ? c.encode(String(t.data), {
                        strict: !1
                    }) : String(t.data)), i("" + s)
                }, e.encodeBase64Packet = function(t, r) {
                    var n, i = "b" + e.packets[t.type];
                    if (void 0 !== y && t.data instanceof y) {
                        var o = new FileReader;
                        return o.onload = function() {
                            var t = o.result.split(",")[1];
                            r(i + t)
                        }, o.readAsDataURL(t.data)
                    }
                    try {
                        n = String.fromCharCode.apply(null, new Uint8Array(t.data))
                    } catch (e) {
                        for (var s = new Uint8Array(t.data), a = new Array(s.length), c = 0; c < s.length; c++) a[c] = s[c];
                        n = String.fromCharCode.apply(null, a)
                    }
                    return i += btoa(n), r(i)
                }, e.decodePacket = function(t, r, n) {
                    if (void 0 === t) return d;
                    if ("string" == typeof t) {
                        if ("b" === t.charAt(0)) return e.decodeBase64Packet(t.substr(1), r);
                        if (n && !1 === (t = function(t) {
                                try {
                                    t = c.decode(t, {
                                        strict: !1
                                    })
                                } catch (t) {
                                    return !1
                                }
                                return t
                            }(t))) return d;
                        var i = t.charAt(0);
                        return Number(i) == i && p[i] ? t.length > 1 ? {
                            type: p[i],
                            data: t.substring(1)
                        } : {
                            type: p[i]
                        } : d
                    }
                    i = new Uint8Array(t)[0];
                    var o = s(t, 1);
                    return y && "blob" === r && (o = new y([o])), {
                        type: p[i],
                        data: o
                    }
                }, e.decodeBase64Packet = function(t, e) {
                    var r = p[t.charAt(0)];
                    if (!n) return {
                        type: r,
                        data: {
                            base64: !0,
                            data: t.substr(1)
                        }
                    };
                    var i = n.decode(t.substr(1));
                    return "blob" === e && y && (i = new y([i])), {
                        type: r,
                        data: i
                    }
                }, e.encodePayload = function(t, r, n) {
                    "function" == typeof r && (n = r, r = null);
                    var i = o(t);
                    return r && i ? y && !f ? e.encodePayloadAsBlob(t, n) : e.encodePayloadAsArrayBuffer(t, n) : t.length ? void g(t, (function(t, n) {
                        e.encodePacket(t, !!i && r, !1, (function(t) {
                            n(null, function(t) {
                                return t.length + ":" + t
                            }(t))
                        }))
                    }), (function(t, e) {
                        return n(e.join(""))
                    })) : n("0:")
                }, e.decodePayload = function(t, r, n) {
                    if ("string" != typeof t) return e.decodePayloadAsBinary(t, r, n);
                    var i;
                    if ("function" == typeof r && (n = r, r = null), "" === t) return n(d, 0, 1);
                    for (var o, s, a = "", c = 0, u = t.length; c < u; c++) {
                        var h = t.charAt(c);
                        if (":" === h) {
                            if ("" === a || a != (o = Number(a))) return n(d, 0, 1);
                            if (a != (s = t.substr(c + 1, o)).length) return n(d, 0, 1);
                            if (s.length) {
                                if (i = e.decodePacket(s, r, !1), d.type === i.type && d.data === i.data) return n(d, 0, 1);
                                if (!1 === n(i, c + o, u)) return
                            }
                            c += o, a = ""
                        } else a += h
                    }
                    return "" !== a ? n(d, 0, 1) : void 0
                }, e.encodePayloadAsArrayBuffer = function(t, r) {
                    if (!t.length) return r(new ArrayBuffer(0));
                    g(t, (function(t, r) {
                        e.encodePacket(t, !0, !0, (function(t) {
                            return r(null, t)
                        }))
                    }), (function(t, e) {
                        var n = e.reduce((function(t, e) {
                                var r;
                                return t + (r = "string" == typeof e ? e.length : e.byteLength).toString().length + r + 2
                            }), 0),
                            i = new Uint8Array(n),
                            o = 0;
                        return e.forEach((function(t) {
                            var e = "string" == typeof t,
                                r = t;
                            if (e) {
                                for (var n = new Uint8Array(t.length), s = 0; s < t.length; s++) n[s] = t.charCodeAt(s);
                                r = n.buffer
                            }
                            i[o++] = e ? 0 : 1;
                            var a = r.byteLength.toString();
                            for (s = 0; s < a.length; s++) i[o++] = parseInt(a[s]);
                            for (i[o++] = 255, n = new Uint8Array(r), s = 0; s < n.length; s++) i[o++] = n[s]
                        })), r(i.buffer)
                    }))
                }, e.encodePayloadAsBlob = function(t, r) {
                    g(t, (function(t, r) {
                        e.encodePacket(t, !0, !0, (function(t) {
                            var e = new Uint8Array(1);
                            if (e[0] = 1, "string" == typeof t) {
                                for (var n = new Uint8Array(t.length), i = 0; i < t.length; i++) n[i] = t.charCodeAt(i);
                                t = n.buffer, e[0] = 0
                            }
                            var o = (t instanceof ArrayBuffer ? t.byteLength : t.size).toString(),
                                s = new Uint8Array(o.length + 1);
                            for (i = 0; i < o.length; i++) s[i] = parseInt(o[i]);
                            if (s[o.length] = 255, y) {
                                var a = new y([e.buffer, s.buffer, t]);
                                r(null, a)
                            }
                        }))
                    }), (function(t, e) {
                        return r(new y(e))
                    }))
                }, e.decodePayloadAsBinary = function(t, r, n) {
                    "function" == typeof r && (n = r, r = null);
                    for (var i = t, o = []; i.byteLength > 0;) {
                        for (var a = new Uint8Array(i), c = 0 === a[0], u = "", h = 1; 255 !== a[h]; h++) {
                            if (u.length > 310) return n(d, 0, 1);
                            u += a[h]
                        }
                        i = s(i, 2 + u.length), u = parseInt(u);
                        var f = s(i, 0, u);
                        if (c) try {
                            f = String.fromCharCode.apply(null, new Uint8Array(f))
                        } catch (t) {
                            var l = new Uint8Array(f);
                            for (f = "", h = 0; h < l.length; h++) f += String.fromCharCode(l[h])
                        }
                        o.push(f), i = s(i, u)
                    }
                    var p = o.length;
                    o.forEach((function(t, i) {
                        n(e.decodePacket(t, r, !0), i, p)
                    }))
                }
            },
            6985: t => {
                t.exports = Object.keys || function(t) {
                    var e = [],
                        r = Object.prototype.hasOwnProperty;
                    for (var n in t) r.call(t, n) && e.push(n);
                    return e
                }
            },
            1788: t => {
                var e, r, n, i = String.fromCharCode;

                function o(t) {
                    for (var e, r, n = [], i = 0, o = t.length; i < o;)(e = t.charCodeAt(i++)) >= 55296 && e <= 56319 && i < o ? 56320 == (64512 & (r = t.charCodeAt(i++))) ? n.push(((1023 & e) << 10) + (1023 & r) + 65536) : (n.push(e), i--) : n.push(e);
                    return n
                }

                function s(t, e) {
                    if (t >= 55296 && t <= 57343) {
                        if (e) throw Error("Lone surrogate U+" + t.toString(16).toUpperCase() + " is not a scalar value");
                        return !1
                    }
                    return !0
                }

                function a(t, e) {
                    return i(t >> e & 63 | 128)
                }

                function c(t, e) {
                    if (0 == (4294967168 & t)) return i(t);
                    var r = "";
                    return 0 == (4294965248 & t) ? r = i(t >> 6 & 31 | 192) : 0 == (4294901760 & t) ? (s(t, e) || (t = 65533), r = i(t >> 12 & 15 | 224), r += a(t, 6)) : 0 == (4292870144 & t) && (r = i(t >> 18 & 7 | 240), r += a(t, 12), r += a(t, 6)), r + i(63 & t | 128)
                }

                function u() {
                    if (n >= r) throw Error("Invalid byte index");
                    var t = 255 & e[n];
                    if (n++, 128 == (192 & t)) return 63 & t;
                    throw Error("Invalid continuation byte")
                }

                function h(t) {
                    var i, o;
                    if (n > r) throw Error("Invalid byte index");
                    if (n == r) return !1;
                    if (i = 255 & e[n], n++, 0 == (128 & i)) return i;
                    if (192 == (224 & i)) {
                        if ((o = (31 & i) << 6 | u()) >= 128) return o;
                        throw Error("Invalid continuation byte")
                    }
                    if (224 == (240 & i)) {
                        if ((o = (15 & i) << 12 | u() << 6 | u()) >= 2048) return s(o, t) ? o : 65533;
                        throw Error("Invalid continuation byte")
                    }
                    if (240 == (248 & i) && (o = (7 & i) << 18 | u() << 12 | u() << 6 | u()) >= 65536 && o <= 1114111) return o;
                    throw Error("Invalid UTF-8 detected")
                }
                t.exports = {
                    version: "2.1.2",
                    encode: function(t, e) {
                        for (var r = !1 !== (e = e || {}).strict, n = o(t), i = n.length, s = -1, a = ""; ++s < i;) a += c(n[s], r);
                        return a
                    },
                    decode: function(t, s) {
                        var a = !1 !== (s = s || {}).strict;
                        e = o(t), r = e.length, n = 0;
                        for (var c, u = []; !1 !== (c = h(a));) u.push(c);
                        return function(t) {
                            for (var e, r = t.length, n = -1, o = ""; ++n < r;)(e = t[n]) > 65535 && (o += i((e -= 65536) >>> 10 & 1023 | 55296), e = 56320 | 1023 & e), o += i(e);
                            return o
                        }(u)
                    }
                }
            },
            1814: t => {
                var e = {}.toString;
                t.exports = Array.isArray || function(t) {
                    return "[object Array]" == e.call(t)
                }
            },
            1246: t => {
                var e = 1e3,
                    r = 60 * e,
                    n = 60 * r,
                    i = 24 * n;

                function o(t, e, r) {
                    if (!(t < e)) return t < 1.5 * e ? Math.floor(t / e) + " " + r : Math.ceil(t / e) + " " + r + "s"
                }
                t.exports = function(t, s) {
                    s = s || {};
                    var a, c = typeof t;
                    if ("string" === c && t.length > 0) return function(t) {
                        if (!((t = String(t)).length > 100)) {
                            var o = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(t);
                            if (o) {
                                var s = parseFloat(o[1]);
                                switch ((o[2] || "ms").toLowerCase()) {
                                    case "years":
                                    case "year":
                                    case "yrs":
                                    case "yr":
                                    case "y":
                                        return 315576e5 * s;
                                    case "days":
                                    case "day":
                                    case "d":
                                        return s * i;
                                    case "hours":
                                    case "hour":
                                    case "hrs":
                                    case "hr":
                                    case "h":
                                        return s * n;
                                    case "minutes":
                                    case "minute":
                                    case "mins":
                                    case "min":
                                    case "m":
                                        return s * r;
                                    case "seconds":
                                    case "second":
                                    case "secs":
                                    case "sec":
                                    case "s":
                                        return s * e;
                                    case "milliseconds":
                                    case "millisecond":
                                    case "msecs":
                                    case "msec":
                                    case "ms":
                                        return s;
                                    default:
                                        return
                                }
                            }
                        }
                    }(t);
                    if ("number" === c && !1 === isNaN(t)) return s.long ? o(a = t, i, "day") || o(a, n, "hour") || o(a, r, "minute") || o(a, e, "second") || a + " ms" : function(t) {
                        return t >= i ? Math.round(t / i) + "d" : t >= n ? Math.round(t / n) + "h" : t >= r ? Math.round(t / r) + "m" : t >= e ? Math.round(t / e) + "s" : t + "ms"
                    }(t);
                    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(t))
                }
            },
            7276: (t, e, r) => {
                var n = r(732),
                    i = r(3410),
                    o = r(6282),
                    s = r(5598)("socket.io-client");
                t.exports = e = c;
                var a = e.managers = {};

                function c(t, e) {
                    "object" == typeof t && (e = t, t = void 0), e = e || {};
                    var r, i = n(t),
                        c = i.source,
                        u = i.id,
                        h = i.path,
                        f = a[u] && h in a[u].nsps;
                    return e.forceNew || e["force new connection"] || !1 === e.multiplex || f ? (s("ignoring socket cache for %s", c), r = o(c, e)) : (a[u] || (s("new io instance for %s", c), a[u] = o(c, e)), r = a[u]), i.query && !e.query && (e.query = i.query), r.socket(i.path, e)
                }
                e.protocol = i.protocol, e.connect = c, e.Manager = r(6282), e.Socket = r(9909)
            },
            6282: (t, e, r) => {
                var n = r(4633),
                    i = r(9909),
                    o = r(8767),
                    s = r(3410),
                    a = r(2210),
                    c = r(6077),
                    u = r(5598)("socket.io-client:manager"),
                    h = r(7355),
                    f = r(3010),
                    l = Object.prototype.hasOwnProperty;

                function p(t, e) {
                    if (!(this instanceof p)) return new p(t, e);
                    t && "object" == typeof t && (e = t, t = void 0), (e = e || {}).path = e.path || "/socket.io", this.nsps = {}, this.subs = [], this.opts = e, this.reconnection(!1 !== e.reconnection), this.reconnectionAttempts(e.reconnectionAttempts || 1 / 0), this.reconnectionDelay(e.reconnectionDelay || 1e3), this.reconnectionDelayMax(e.reconnectionDelayMax || 5e3), this.randomizationFactor(e.randomizationFactor || .5), this.backoff = new f({
                        min: this.reconnectionDelay(),
                        max: this.reconnectionDelayMax(),
                        jitter: this.randomizationFactor()
                    }), this.timeout(null == e.timeout ? 2e4 : e.timeout), this.readyState = "closed", this.uri = t, this.connecting = [], this.lastPing = null, this.encoding = !1, this.packetBuffer = [];
                    var r = e.parser || s;
                    this.encoder = new r.Encoder, this.decoder = new r.Decoder, this.autoConnect = !1 !== e.autoConnect, this.autoConnect && this.open()
                }
                t.exports = p, p.prototype.emitAll = function() {
                    for (var t in this.emit.apply(this, arguments), this.nsps) l.call(this.nsps, t) && this.nsps[t].emit.apply(this.nsps[t], arguments)
                }, p.prototype.updateSocketIds = function() {
                    for (var t in this.nsps) l.call(this.nsps, t) && (this.nsps[t].id = this.generateId(t))
                }, p.prototype.generateId = function(t) {
                    return ("/" === t ? "" : t + "#") + this.engine.id
                }, o(p.prototype), p.prototype.reconnection = function(t) {
                    return arguments.length ? (this._reconnection = !!t, this) : this._reconnection
                }, p.prototype.reconnectionAttempts = function(t) {
                    return arguments.length ? (this._reconnectionAttempts = t, this) : this._reconnectionAttempts
                }, p.prototype.reconnectionDelay = function(t) {
                    return arguments.length ? (this._reconnectionDelay = t, this.backoff && this.backoff.setMin(t), this) : this._reconnectionDelay
                }, p.prototype.randomizationFactor = function(t) {
                    return arguments.length ? (this._randomizationFactor = t, this.backoff && this.backoff.setJitter(t), this) : this._randomizationFactor
                }, p.prototype.reconnectionDelayMax = function(t) {
                    return arguments.length ? (this._reconnectionDelayMax = t, this.backoff && this.backoff.setMax(t), this) : this._reconnectionDelayMax
                }, p.prototype.timeout = function(t) {
                    return arguments.length ? (this._timeout = t, this) : this._timeout
                }, p.prototype.maybeReconnectOnOpen = function() {
                    !this.reconnecting && this._reconnection && 0 === this.backoff.attempts && this.reconnect()
                }, p.prototype.open = p.prototype.connect = function(t, e) {
                    if (u("readyState %s", this.readyState), ~this.readyState.indexOf("open")) return this;
                    u("opening %s", this.uri), this.engine = n(this.uri, this.opts);
                    var r = this.engine,
                        i = this;
                    this.readyState = "opening", this.skipReconnect = !1;
                    var o = a(r, "open", (function() {
                            i.onopen(), t && t()
                        })),
                        s = a(r, "error", (function(e) {
                            if (u("connect_error"), i.cleanup(), i.readyState = "closed", i.emitAll("connect_error", e), t) {
                                var r = new Error("Connection error");
                                r.data = e, t(r)
                            } else i.maybeReconnectOnOpen()
                        }));
                    if (!1 !== this._timeout) {
                        var c = this._timeout;
                        u("connect attempt will timeout after %d", c), 0 === c && o.destroy();
                        var h = setTimeout((function() {
                            u("connect attempt timed out after %d", c), o.destroy(), r.close(), r.emit("error", "timeout"), i.emitAll("connect_timeout", c)
                        }), c);
                        this.subs.push({
                            destroy: function() {
                                clearTimeout(h)
                            }
                        })
                    }
                    return this.subs.push(o), this.subs.push(s), this
                }, p.prototype.onopen = function() {
                    u("open"), this.cleanup(), this.readyState = "open", this.emit("open");
                    var t = this.engine;
                    this.subs.push(a(t, "data", c(this, "ondata"))), this.subs.push(a(t, "ping", c(this, "onping"))), this.subs.push(a(t, "pong", c(this, "onpong"))), this.subs.push(a(t, "error", c(this, "onerror"))), this.subs.push(a(t, "close", c(this, "onclose"))), this.subs.push(a(this.decoder, "decoded", c(this, "ondecoded")))
                }, p.prototype.onping = function() {
                    this.lastPing = new Date, this.emitAll("ping")
                }, p.prototype.onpong = function() {
                    this.emitAll("pong", new Date - this.lastPing)
                }, p.prototype.ondata = function(t) {
                    this.decoder.add(t)
                }, p.prototype.ondecoded = function(t) {
                    this.emit("packet", t)
                }, p.prototype.onerror = function(t) {
                    u("error", t), this.emitAll("error", t)
                }, p.prototype.socket = function(t, e) {
                    var r = this.nsps[t];
                    if (!r) {
                        r = new i(this, t, e), this.nsps[t] = r;
                        var n = this;
                        r.on("connecting", o), r.on("connect", (function() {
                            r.id = n.generateId(t)
                        })), this.autoConnect && o()
                    }

                    function o() {
                        ~h(n.connecting, r) || n.connecting.push(r)
                    }
                    return r
                }, p.prototype.destroy = function(t) {
                    var e = h(this.connecting, t);
                    ~e && this.connecting.splice(e, 1), this.connecting.length || this.close()
                }, p.prototype.packet = function(t) {
                    u("writing packet %j", t);
                    var e = this;
                    t.query && 0 === t.type && (t.nsp += "?" + t.query), e.encoding ? e.packetBuffer.push(t) : (e.encoding = !0, this.encoder.encode(t, (function(r) {
                        for (var n = 0; n < r.length; n++) e.engine.write(r[n], t.options);
                        e.encoding = !1, e.processPacketQueue()
                    })))
                }, p.prototype.processPacketQueue = function() {
                    if (this.packetBuffer.length > 0 && !this.encoding) {
                        var t = this.packetBuffer.shift();
                        this.packet(t)
                    }
                }, p.prototype.cleanup = function() {
                    u("cleanup");
                    for (var t = this.subs.length, e = 0; e < t; e++) this.subs.shift().destroy();
                    this.packetBuffer = [], this.encoding = !1, this.lastPing = null, this.decoder.destroy()
                }, p.prototype.close = p.prototype.disconnect = function() {
                    u("disconnect"), this.skipReconnect = !0, this.reconnecting = !1, "opening" === this.readyState && this.cleanup(), this.backoff.reset(), this.readyState = "closed", this.engine && this.engine.close()
                }, p.prototype.onclose = function(t) {
                    u("onclose"), this.cleanup(), this.backoff.reset(), this.readyState = "closed", this.emit("close", t), this._reconnection && !this.skipReconnect && this.reconnect()
                }, p.prototype.reconnect = function() {
                    if (this.reconnecting || this.skipReconnect) return this;
                    var t = this;
                    if (this.backoff.attempts >= this._reconnectionAttempts) u("reconnect failed"), this.backoff.reset(), this.emitAll("reconnect_failed"), this.reconnecting = !1;
                    else {
                        var e = this.backoff.duration();
                        u("will wait %dms before reconnect attempt", e), this.reconnecting = !0;
                        var r = setTimeout((function() {
                            t.skipReconnect || (u("attempting reconnect"), t.emitAll("reconnect_attempt", t.backoff.attempts), t.emitAll("reconnecting", t.backoff.attempts), t.skipReconnect || t.open((function(e) {
                                e ? (u("reconnect attempt error"), t.reconnecting = !1, t.reconnect(), t.emitAll("reconnect_error", e.data)) : (u("reconnect success"), t.onreconnect())
                            })))
                        }), e);
                        this.subs.push({
                            destroy: function() {
                                clearTimeout(r)
                            }
                        })
                    }
                }, p.prototype.onreconnect = function() {
                    var t = this.backoff.attempts;
                    this.reconnecting = !1, this.backoff.reset(), this.updateSocketIds(), this.emitAll("reconnect", t)
                }
            },
            2210: t => {
                t.exports = function(t, e, r) {
                    return t.on(e, r), {
                        destroy: function() {
                            t.removeListener(e, r)
                        }
                    }
                }
            },
            9909: (t, e, r) => {
                var n = r(3410),
                    i = r(8767),
                    o = r(4042),
                    s = r(2210),
                    a = r(6077),
                    c = r(5598)("socket.io-client:socket"),
                    u = r(1830),
                    h = r(3466);
                t.exports = p;
                var f = {
                        connect: 1,
                        connect_error: 1,
                        connect_timeout: 1,
                        connecting: 1,
                        disconnect: 1,
                        error: 1,
                        reconnect: 1,
                        reconnect_attempt: 1,
                        reconnect_failed: 1,
                        reconnect_error: 1,
                        reconnecting: 1,
                        ping: 1,
                        pong: 1
                    },
                    l = i.prototype.emit;

                function p(t, e, r) {
                    this.io = t, this.nsp = e, this.json = this, this.ids = 0, this.acks = {}, this.receiveBuffer = [], this.sendBuffer = [], this.connected = !1, this.disconnected = !0, this.flags = {}, r && r.query && (this.query = r.query), this.io.autoConnect && this.open()
                }
                i(p.prototype), p.prototype.subEvents = function() {
                    if (!this.subs) {
                        var t = this.io;
                        this.subs = [s(t, "open", a(this, "onopen")), s(t, "packet", a(this, "onpacket")), s(t, "close", a(this, "onclose"))]
                    }
                }, p.prototype.open = p.prototype.connect = function() {
                    return this.connected || (this.subEvents(), this.io.reconnecting || this.io.open(), "open" === this.io.readyState && this.onopen(), this.emit("connecting")), this
                }, p.prototype.send = function() {
                    var t = o(arguments);
                    return t.unshift("message"), this.emit.apply(this, t), this
                }, p.prototype.emit = function(t) {
                    if (f.hasOwnProperty(t)) return l.apply(this, arguments), this;
                    var e = o(arguments),
                        r = {
                            type: (void 0 !== this.flags.binary ? this.flags.binary : h(e)) ? n.BINARY_EVENT : n.EVENT,
                            data: e,
                            options: {}
                        };
                    return r.options.compress = !this.flags || !1 !== this.flags.compress, "function" == typeof e[e.length - 1] && (c("emitting packet with ack id %d", this.ids), this.acks[this.ids] = e.pop(), r.id = this.ids++), this.connected ? this.packet(r) : this.sendBuffer.push(r), this.flags = {}, this
                }, p.prototype.packet = function(t) {
                    t.nsp = this.nsp, this.io.packet(t)
                }, p.prototype.onopen = function() {
                    if (c("transport is open - connecting"), "/" !== this.nsp)
                        if (this.query) {
                            var t = "object" == typeof this.query ? u.encode(this.query) : this.query;
                            c("sending connect packet with query %s", t), this.packet({
                                type: n.CONNECT,
                                query: t
                            })
                        } else this.packet({
                            type: n.CONNECT
                        })
                }, p.prototype.onclose = function(t) {
                    c("close (%s)", t), this.connected = !1, this.disconnected = !0, delete this.id, this.emit("disconnect", t)
                }, p.prototype.onpacket = function(t) {
                    var e = t.nsp === this.nsp,
                        r = t.type === n.ERROR && "/" === t.nsp;
                    if (e || r) switch (t.type) {
                        case n.CONNECT:
                            this.onconnect();
                            break;
                        case n.EVENT:
                        case n.BINARY_EVENT:
                            this.onevent(t);
                            break;
                        case n.ACK:
                        case n.BINARY_ACK:
                            this.onack(t);
                            break;
                        case n.DISCONNECT:
                            this.ondisconnect();
                            break;
                        case n.ERROR:
                            this.emit("error", t.data)
                    }
                }, p.prototype.onevent = function(t) {
                    var e = t.data || [];
                    c("emitting event %j", e), null != t.id && (c("attaching ack callback to event"), e.push(this.ack(t.id))), this.connected ? l.apply(this, e) : this.receiveBuffer.push(e)
                }, p.prototype.ack = function(t) {
                    var e = this,
                        r = !1;
                    return function() {
                        if (!r) {
                            r = !0;
                            var i = o(arguments);
                            c("sending ack %j", i), e.packet({
                                type: h(i) ? n.BINARY_ACK : n.ACK,
                                id: t,
                                data: i
                            })
                        }
                    }
                }, p.prototype.onack = function(t) {
                    var e = this.acks[t.id];
                    "function" == typeof e ? (c("calling ack %s with %j", t.id, t.data), e.apply(this, t.data), delete this.acks[t.id]) : c("bad ack %s", t.id)
                }, p.prototype.onconnect = function() {
                    this.connected = !0, this.disconnected = !1, this.emit("connect"), this.emitBuffered()
                }, p.prototype.emitBuffered = function() {
                    var t;
                    for (t = 0; t < this.receiveBuffer.length; t++) l.apply(this, this.receiveBuffer[t]);
                    for (this.receiveBuffer = [], t = 0; t < this.sendBuffer.length; t++) this.packet(this.sendBuffer[t]);
                    this.sendBuffer = []
                }, p.prototype.ondisconnect = function() {
                    c("server disconnect (%s)", this.nsp), this.destroy(), this.onclose("io server disconnect")
                }, p.prototype.destroy = function() {
                    if (this.subs) {
                        for (var t = 0; t < this.subs.length; t++) this.subs[t].destroy();
                        this.subs = null
                    }
                    this.io.destroy(this)
                }, p.prototype.close = p.prototype.disconnect = function() {
                    return this.connected && (c("performing disconnect (%s)", this.nsp), this.packet({
                        type: n.DISCONNECT
                    })), this.destroy(), this.connected && this.onclose("io client disconnect"), this
                }, p.prototype.compress = function(t) {
                    return this.flags.compress = t, this
                }, p.prototype.binary = function(t) {
                    return this.flags.binary = t, this
                }
            },
            732: (t, e, r) => {
                var n = r(4187),
                    i = r(5598)("socket.io-client:url");
                t.exports = function(t, e) {
                    var r = t;
                    e = e || "undefined" != typeof location && location, null == t && (t = e.protocol + "//" + e.host), "string" == typeof t && ("/" === t.charAt(0) && (t = "/" === t.charAt(1) ? e.protocol + t : e.host + t), /^(https?|wss?):\/\//.test(t) || (i("protocol-less url %s", t), t = void 0 !== e ? e.protocol + "//" + t : "https://" + t), i("parse %s", t), r = n(t)), r.port || (/^(http|ws)$/.test(r.protocol) ? r.port = "80" : /^(http|ws)s$/.test(r.protocol) && (r.port = "443")), r.path = r.path || "/";
                    var o = -1 !== r.host.indexOf(":") ? "[" + r.host + "]" : r.host;
                    return r.id = r.protocol + "://" + o + ":" + r.port, r.href = r.protocol + "://" + o + (e && e.port === r.port ? "" : ":" + r.port), r
                }
            },
            4209: (t, e, r) => {
                var n = r(1814),
                    i = r(1839),
                    o = Object.prototype.toString,
                    s = "function" == typeof Blob || "undefined" != typeof Blob && "[object BlobConstructor]" === o.call(Blob),
                    a = "function" == typeof File || "undefined" != typeof File && "[object FileConstructor]" === o.call(File);

                function c(t, e) {
                    if (!t) return t;
                    if (i(t)) {
                        var r = {
                            _placeholder: !0,
                            num: e.length
                        };
                        return e.push(t), r
                    }
                    if (n(t)) {
                        for (var o = new Array(t.length), s = 0; s < t.length; s++) o[s] = c(t[s], e);
                        return o
                    }
                    if ("object" == typeof t && !(t instanceof Date)) {
                        for (var a in o = {}, t) o[a] = c(t[a], e);
                        return o
                    }
                    return t
                }

                function u(t, e) {
                    if (!t) return t;
                    if (t && t._placeholder) return e[t.num];
                    if (n(t))
                        for (var r = 0; r < t.length; r++) t[r] = u(t[r], e);
                    else if ("object" == typeof t)
                        for (var i in t) t[i] = u(t[i], e);
                    return t
                }
                e.deconstructPacket = function(t) {
                    var e = [],
                        r = t.data,
                        n = t;
                    return n.data = c(r, e), n.attachments = e.length, {
                        packet: n,
                        buffers: e
                    }
                }, e.reconstructPacket = function(t, e) {
                    return t.data = u(t.data, e), t.attachments = void 0, t
                }, e.removeBlobs = function(t, e) {
                    var r = 0,
                        o = t;
                    ! function t(c, u, h) {
                        if (!c) return c;
                        if (s && c instanceof Blob || a && c instanceof File) {
                            r++;
                            var f = new FileReader;
                            f.onload = function() {
                                h ? h[u] = this.result : o = this.result, --r || e(o)
                            }, f.readAsArrayBuffer(c)
                        } else if (n(c))
                            for (var l = 0; l < c.length; l++) t(c[l], l, c);
                        else if ("object" == typeof c && !i(c))
                            for (var p in c) t(c[p], p, c)
                    }(o), r || e(o)
                }
            },
            3410: (t, e, r) => {
                var n = r(5598)("socket.io-parser"),
                    i = r(8767),
                    o = r(4209),
                    s = r(1814),
                    a = r(1839);

                function c() {}
                e.protocol = 4, e.types = ["CONNECT", "DISCONNECT", "EVENT", "ACK", "ERROR", "BINARY_EVENT", "BINARY_ACK"], e.CONNECT = 0, e.DISCONNECT = 1, e.EVENT = 2, e.ACK = 3, e.ERROR = 4, e.BINARY_EVENT = 5, e.BINARY_ACK = 6, e.Encoder = c, e.Decoder = f;
                var u = e.ERROR + '"encode error"';

                function h(t) {
                    var r = "" + t.type;
                    if (e.BINARY_EVENT !== t.type && e.BINARY_ACK !== t.type || (r += t.attachments + "-"), t.nsp && "/" !== t.nsp && (r += t.nsp + ","), null != t.id && (r += t.id), null != t.data) {
                        var i = function(t) {
                            try {
                                return JSON.stringify(t)
                            } catch (t) {
                                return !1
                            }
                        }(t.data);
                        if (!1 === i) return u;
                        r += i
                    }
                    return n("encoded %j as %s", t, r), r
                }

                function f() {
                    this.reconstructor = null
                }

                function l(t) {
                    this.reconPack = t, this.buffers = []
                }

                function p(t) {
                    return {
                        type: e.ERROR,
                        data: "parser error: " + t
                    }
                }
                c.prototype.encode = function(t, r) {
                    n("encoding packet %j", t), e.BINARY_EVENT === t.type || e.BINARY_ACK === t.type ? function(t, e) {
                        o.removeBlobs(t, (function(t) {
                            var r = o.deconstructPacket(t),
                                n = h(r.packet),
                                i = r.buffers;
                            i.unshift(n), e(i)
                        }))
                    }(t, r) : r([h(t)])
                }, i(f.prototype), f.prototype.add = function(t) {
                    var r;
                    if ("string" == typeof t) r = function(t) {
                        var r = 0,
                            i = {
                                type: Number(t.charAt(0))
                            };
                        if (null == e.types[i.type]) return p("unknown packet type " + i.type);
                        if (e.BINARY_EVENT === i.type || e.BINARY_ACK === i.type) {
                            for (var o = r + 1;
                                "-" !== t.charAt(++r) && r != t.length;);
                            var a = t.substring(o, r);
                            if (a != Number(a) || "-" !== t.charAt(r)) throw new Error("Illegal attachments");
                            i.attachments = Number(a)
                        }
                        if ("/" === t.charAt(r + 1)) {
                            for (o = r + 1; ++r && "," !== (u = t.charAt(r)) && r !== t.length;);
                            i.nsp = t.substring(o, r)
                        } else i.nsp = "/";
                        var c = t.charAt(r + 1);
                        if ("" !== c && Number(c) == c) {
                            for (o = r + 1; ++r;) {
                                var u;
                                if (null == (u = t.charAt(r)) || Number(u) != u) {
                                    --r;
                                    break
                                }
                                if (r === t.length) break
                            }
                            i.id = Number(t.substring(o, r + 1))
                        }
                        if (t.charAt(++r)) {
                            var h = function(t) {
                                try {
                                    return JSON.parse(t)
                                } catch (t) {
                                    return !1
                                }
                            }(t.substr(r));
                            if (!1 === h || i.type !== e.ERROR && !s(h)) return p("invalid payload");
                            i.data = h
                        }
                        return n("decoded %s as %j", t, i), i
                    }(t), e.BINARY_EVENT === r.type || e.BINARY_ACK === r.type ? (this.reconstructor = new l(r), 0 === this.reconstructor.reconPack.attachments && this.emit("decoded", r)) : this.emit("decoded", r);
                    else {
                        if (!a(t) && !t.base64) throw new Error("Unknown type: " + t);
                        if (!this.reconstructor) throw new Error("got binary data when not reconstructing a packet");
                        (r = this.reconstructor.takeBinaryData(t)) && (this.reconstructor = null, this.emit("decoded", r))
                    }
                }, f.prototype.destroy = function() {
                    this.reconstructor && this.reconstructor.finishedReconstruction()
                }, l.prototype.takeBinaryData = function(t) {
                    if (this.buffers.push(t), this.buffers.length === this.reconPack.attachments) {
                        var e = o.reconstructPacket(this.reconPack, this.buffers);
                        return this.finishedReconstruction(), e
                    }
                    return null
                }, l.prototype.finishedReconstruction = function() {
                    this.reconPack = null, this.buffers = []
                }
            },
            1839: (t, e, r) => {
                var n = r(8764).Buffer;
                t.exports = function(t) {
                    return i && n.isBuffer(t) || o && (t instanceof ArrayBuffer || function(t) {
                        return "function" == typeof ArrayBuffer.isView ? ArrayBuffer.isView(t) : t.buffer instanceof ArrayBuffer
                    }(t))
                };
                var i = "function" == typeof n && "function" == typeof n.isBuffer,
                    o = "function" == typeof ArrayBuffer
            },
            4273: function(t, e) {
                "use strict";
                var r = this && this.__awaiter || function(t, e, r, n) {
                    return new(r || (r = Promise))((function(i, o) {
                        function s(t) {
                            try {
                                c(n.next(t))
                            } catch (t) {
                                o(t)
                            }
                        }

                        function a(t) {
                            try {
                                c(n.throw(t))
                            } catch (t) {
                                o(t)
                            }
                        }

                        function c(t) {
                            var e;
                            t.done ? i(t.value) : (e = t.value, e instanceof r ? e : new r((function(t) {
                                t(e)
                            }))).then(s, a)
                        }
                        c((n = n.apply(t, e || [])).next())
                    }))
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.WaxEventSource = class {
                    constructor(t = "http://localhost:3000") {
                        this.waxSigningURL = t, this.timeout = () => new Promise(((t, e) => {
                            const r = setTimeout((() => {
                                clearTimeout(r), e(new Error("Timeout"))
                            }), 2e3)
                        })), this.openEventSource = this.openEventSource.bind(this), this.onceEvent = this.onceEvent.bind(this)
                    }
                    openEventSource(t, e, n) {
                        return r(this, void 0, void 0, (function*() {
                            const i = n || (yield window.open(t, "WaxPopup", "height=800,width=600"));
                            if (!i) throw new Error("Unable to open a popup window");
                            if (void 0 === e) return i;
                            const o = this.onceEvent(i, this.waxSigningURL, (t => r(this, void 0, void 0, (function*() {
                                "READY" === t.data.type && i.postMessage(e, this.waxSigningURL)
                            }))));
                            return yield Promise.race([o, this.timeout()]).catch((t => {
                                if ("Timeout" !== t.message) throw t;
                                i.postMessage(e, this.waxSigningURL)
                            })), i
                        }))
                    }
                    onceEvent(t, e, n) {
                        return r(this, void 0, void 0, (function*() {
                            return new Promise(((i, o) => {
                                window.addEventListener("message", (function s(a) {
                                    return r(this, void 0, void 0, (function*() {
                                        if (a.origin === e && a.source === t && "object" == typeof a.data) {
                                            try {
                                                const t = yield n(a);
                                                i(t)
                                            } catch (t) {
                                                o(t)
                                            }
                                            window.removeEventListener("message", s, !1)
                                        }
                                    }))
                                }), !1)
                            }))
                        }))
                    }
                }
            },
            5335: function(t, e, r) {
                "use strict";
                var n = this && this.__awaiter || function(t, e, r, n) {
                    return new(r || (r = Promise))((function(i, o) {
                        function s(t) {
                            try {
                                c(n.next(t))
                            } catch (t) {
                                o(t)
                            }
                        }

                        function a(t) {
                            try {
                                c(n.throw(t))
                            } catch (t) {
                                o(t)
                            }
                        }

                        function c(t) {
                            var e;
                            t.done ? i(t.value) : (e = t.value, e instanceof r ? e : new r((function(t) {
                                t(e)
                            }))).then(s, a)
                        }
                        c((n = n.apply(t, e || [])).next())
                    }))
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = r(9886),
                    o = r(4273);
                e.WaxJS = class {
                    constructor(t, e = null, r = null, n = !0, s = null, a = "https://all-access.wax.io", c = "https://api-idm.wax.io/v1/accounts/auto-accept/") {
                        if (this.apiSigner = s, this.waxSigningURL = a, this.waxAutoSigningURL = c, this.waxEventSource = new o.WaxEventSource(a), this.rpc = new i.JsonRpc(t), e && Array.isArray(r)) {
                            const t = {
                                userAccount: e,
                                pubKeys: r,
                                verified: !0
                            };
                            this.receiveLogin({
                                data: t
                            })
                        } else n && this.loginViaEndpoint()
                    }
                    login() {
                        return n(this, void 0, void 0, (function*() {
                            return this.userAccount && Array.isArray(this.pubKeys) ? this.userAccount : this.loginViaWindow()
                        }))
                    }
                    isAutoLoginAvailable() {
                        return n(this, void 0, void 0, (function*() {
                            if (this.userAccount && Array.isArray(this.pubKeys)) return !0;
                            try {
                                return yield this.loginViaEndpoint(), !0
                            } catch (t) {
                                return !1
                            }
                            return !1
                        }))
                    }
                    loginViaWindow() {
                        return n(this, void 0, void 0, (function*() {
                            const t = yield this.waxEventSource.openEventSource(this.waxSigningURL + "/cloud-wallet/login/");
                            return this.waxEventSource.onceEvent(t, this.waxSigningURL, this.receiveLogin.bind(this))
                        }))
                    }
                    loginViaEndpoint() {
                        return n(this, void 0, void 0, (function*() {
                            const t = yield fetch(this.waxAutoSigningURL + "login", {
                                credentials: "include",
                                method: "get"
                            });
                            if (!t.ok) throw new Error(`Login Endpoint Error ${t.status} ${t.statusText}`);
                            const e = yield t.json();
                            if (e.processed && e.processed.except) throw new Error(e);
                            return this.receiveLogin({
                                data: e
                            })
                        }))
                    }
                    receiveLogin(t) {
                        return n(this, void 0, void 0, (function*() {
                            const {
                                verified: e,
                                userAccount: r,
                                pubKeys: o,
                                whitelistedContracts: s,
                                autoLogin: a
                            } = t.data;
                            if (!e) throw new Error("User declined to share their user account");
                            if (null == r || null == o) throw new Error("User does not have a blockchain account");
                            localStorage.setItem("autoLogin", a), this.whitelistedContracts = s || [], this.userAccount = r, this.pubKeys = o;
                            const c = {
                                getAvailableKeys: () => n(this, void 0, void 0, (function*() {
                                    return [...this.pubKeys, ...this.apiSigner && (yield this.apiSigner.getAvailableKeys()) || []]
                                })),
                                sign: t => n(this, void 0, void 0, (function*() {
                                    return {
                                        serializedTransaction: t.serializedTransaction,
                                        signatures: [...yield this.signing(t.serializedTransaction), ...this.apiSigner && (yield this.apiSigner.sign(t)).signatures || []]
                                    }
                                }))
                            };
                            this.api = new i.Api({
                                rpc: this.rpc,
                                signatureProvider: c
                            });
                            const u = this.api.transact.bind(this.api),
                                h = this.waxSigningURL + "/cloud-wallet/signing/";
                            return this.api.transact = (t, e) => n(this, void 0, void 0, (function*() {
                                return (yield this.canAutoSign(t)) || (this.signingWindow = yield window.open(h, "WaxPopup", "height=800,width=600")), yield u(t, e)
                            })), this.userAccount
                        }))
                    }
                    canAutoSign(t) {
                        return n(this, void 0, void 0, (function*() {
                            return !(t.actions ? t : yield this.api.deserializeTransactionWithActions(t)).actions.find((t => !this.isWhitelisted(t)))
                        }))
                    }
                    isWhitelisted(t) {
                        return !!this.whitelistedContracts.find((e => e.contract === t.account && ("eosio.token" !== t.account || "transfer" !== t.name || e.recipients.includes(t.data.to))))
                    }
                    signing(t) {
                        return n(this, void 0, void 0, (function*() {
                            return (yield this.canAutoSign(t)) ? this.signViaEndpoint(t).catch((() => this.signViaWindow(void 0, t))) : this.signViaWindow(this.signingWindow, t)
                        }))
                    }
                    signViaEndpoint(t) {
                        return n(this, void 0, void 0, (function*() {
                            try {
                                const e = yield fetch(this.waxAutoSigningURL + "signing", {
                                    body: JSON.stringify({
                                        transaction: Object.values(t)
                                    }),
                                    credentials: "include",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    method: "POST"
                                });
                                if (!e.ok) throw new Error(`Signing Endpoint Error ${e.status} ${e.statusText}`);
                                const r = yield e.json();
                                if (r.processed && r.processed.except) throw new Error(r);
                                return this.receiveSignatures({
                                    data: r
                                })
                            } catch (t) {
                                throw this.whitelistedContracts = [], t
                            }
                        }))
                    }
                    signViaWindow(t, e) {
                        return n(this, void 0, void 0, (function*() {
                            const r = yield this.waxEventSource.openEventSource(this.waxSigningURL + "/cloud-wallet/signing/", {
                                type: "TRANSACTION",
                                transaction: e
                            }, t);
                            return this.waxEventSource.onceEvent(r, this.waxSigningURL, this.receiveSignatures.bind(this))
                        }))
                    }
                    receiveSignatures(t) {
                        return n(this, void 0, void 0, (function*() {
                            if ("TX_SIGNED" === t.data.type) {
                                const {
                                    verified: e,
                                    signatures: r,
                                    whitelistedContracts: n
                                } = t.data;
                                if (!e || null == r) throw new Error("User declined to sign the transaction");
                                return this.whitelistedContracts = n || [], r
                            }
                            if ("READY" !== t.data.type) throw new Error(`Unexpected response received when attempting signing: ${JSON.stringify(t.data, void 0, 2)}`);
                            return []
                        }))
                    }
                }
            },
            1455: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                })
            },
            1506: function(t, e, r) {
                "use strict";
                var n = this && this.__assign || function() {
                        return (n = Object.assign || function(t) {
                            for (var e, r = 1, n = arguments.length; r < n; r++)
                                for (var i in e = arguments[r]) Object.prototype.hasOwnProperty.call(e, i) && (t[i] = e[i]);
                            return t
                        }).apply(this, arguments)
                    },
                    i = this && this.__awaiter || function(t, e, r, n) {
                        return new(r || (r = Promise))((function(i, o) {
                            function s(t) {
                                try {
                                    c(n.next(t))
                                } catch (t) {
                                    o(t)
                                }
                            }

                            function a(t) {
                                try {
                                    c(n.throw(t))
                                } catch (t) {
                                    o(t)
                                }
                            }

                            function c(t) {
                                t.done ? i(t.value) : new r((function(e) {
                                    e(t.value)
                                })).then(s, a)
                            }
                            c((n = n.apply(t, e || [])).next())
                        }))
                    },
                    o = this && this.__generator || function(t, e) {
                        var r, n, i, o, s = {
                            label: 0,
                            sent: function() {
                                if (1 & i[0]) throw i[1];
                                return i[1]
                            },
                            trys: [],
                            ops: []
                        };
                        return o = {
                            next: a(0),
                            throw: a(1),
                            return: a(2)
                        }, "function" == typeof Symbol && (o[Symbol.iterator] = function() {
                            return this
                        }), o;

                        function a(o) {
                            return function(a) {
                                return function(o) {
                                    if (r) throw new TypeError("Generator is already executing.");
                                    for (; s;) try {
                                        if (r = 1, n && (i = 2 & o[0] ? n.return : o[0] ? n.throw || ((i = n.return) && i.call(n), 0) : n.next) && !(i = i.call(n, o[1])).done) return i;
                                        switch (n = 0, i && (o = [2 & o[0], i.value]), o[0]) {
                                            case 0:
                                            case 1:
                                                i = o;
                                                break;
                                            case 4:
                                                return s.label++, {
                                                    value: o[1],
                                                    done: !1
                                                };
                                            case 5:
                                                s.label++, n = o[1], o = [0];
                                                continue;
                                            case 7:
                                                o = s.ops.pop(), s.trys.pop();
                                                continue;
                                            default:
                                                if (!((i = (i = s.trys).length > 0 && i[i.length - 1]) || 6 !== o[0] && 2 !== o[0])) {
                                                    s = 0;
                                                    continue
                                                }
                                                if (3 === o[0] && (!i || o[1] > i[0] && o[1] < i[3])) {
                                                    s.label = o[1];
                                                    break
                                                }
                                                if (6 === o[0] && s.label < i[1]) {
                                                    s.label = i[1], i = o;
                                                    break
                                                }
                                                if (i && s.label < i[2]) {
                                                    s.label = i[2], s.ops.push(o);
                                                    break
                                                }
                                                i[2] && s.ops.pop(), s.trys.pop();
                                                continue
                                        }
                                        o = e.call(t, s)
                                    } catch (t) {
                                        o = [6, t], n = 0
                                    } finally {
                                        r = i = 0
                                    }
                                    if (5 & o[0]) throw o[1];
                                    return {
                                        value: o[0] ? o[1] : void 0,
                                        done: !0
                                    }
                                }([o, a])
                            }
                        }
                    },
                    s = this && this.__rest || function(t, e) {
                        var r = {};
                        for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e.indexOf(n) < 0 && (r[n] = t[n]);
                        if (null != t && "function" == typeof Object.getOwnPropertySymbols) {
                            var i = 0;
                            for (n = Object.getOwnPropertySymbols(t); i < n.length; i++) e.indexOf(n[i]) < 0 && (r[n[i]] = t[n[i]])
                        }
                        return r
                    },
                    a = this && this.__read || function(t, e) {
                        var r = "function" == typeof Symbol && t[Symbol.iterator];
                        if (!r) return t;
                        var n, i, o = r.call(t),
                            s = [];
                        try {
                            for (;
                                (void 0 === e || e-- > 0) && !(n = o.next()).done;) s.push(n.value)
                        } catch (t) {
                            i = {
                                error: t
                            }
                        } finally {
                            try {
                                n && !n.done && (r = o.return) && r.call(o)
                            } finally {
                                if (i) throw i.error
                            }
                        }
                        return s
                    },
                    c = this && this.__spread || function() {
                        for (var t = [], e = 0; e < arguments.length; e++) t = t.concat(a(arguments[e]));
                        return t
                    },
                    u = this && this.__values || function(t) {
                        var e = "function" == typeof Symbol && t[Symbol.iterator],
                            r = 0;
                        return e ? e.call(t) : {
                            next: function() {
                                return t && r >= t.length && (t = void 0), {
                                    value: t && t[r++],
                                    done: !t
                                }
                            }
                        }
                    };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                var h = r(1749),
                    f = r(335),
                    l = r(9790),
                    p = function() {
                        function t(t) {
                            this.contracts = new Map, this.cachedAbis = new Map, this.rpc = t.rpc, this.authorityProvider = t.authorityProvider || t.rpc, this.abiProvider = t.abiProvider || t.rpc, this.signatureProvider = t.signatureProvider, this.chainId = t.chainId, this.textEncoder = t.textEncoder, this.textDecoder = t.textDecoder, this.abiTypes = h.getTypesFromAbi(h.createInitialTypes(), f), this.transactionTypes = h.getTypesFromAbi(h.createInitialTypes(), l)
                        }
                        return t.prototype.rawAbiToJson = function(t) {
                            var e = new h.SerialBuffer({
                                textEncoder: this.textEncoder,
                                textDecoder: this.textDecoder,
                                array: t
                            });
                            if (!h.supportedAbiVersion(e.getString())) throw new Error("Unsupported abi version");
                            return e.restartRead(), this.abiTypes.get("abi_def").deserialize(e)
                        }, t.prototype.getCachedAbi = function(t, e) {
                            return void 0 === e && (e = !1), i(this, void 0, void 0, (function() {
                                var r, n, i, s;
                                return o(this, (function(o) {
                                    switch (o.label) {
                                        case 0:
                                            if (!e && this.cachedAbis.get(t)) return [2, this.cachedAbis.get(t)];
                                            o.label = 1;
                                        case 1:
                                            return o.trys.push([1, 3, , 4]), [4, this.abiProvider.getRawAbi(t)];
                                        case 2:
                                            return n = o.sent().abi, i = this.rawAbiToJson(n), r = {
                                                rawAbi: n,
                                                abi: i
                                            }, [3, 4];
                                        case 3:
                                            throw (s = o.sent()).message = "fetching abi for " + t + ": " + s.message, s;
                                        case 4:
                                            if (!r) throw new Error("Missing abi for " + t);
                                            return this.cachedAbis.set(t, r), [2, r]
                                    }
                                }))
                            }))
                        }, t.prototype.getAbi = function(t, e) {
                            return void 0 === e && (e = !1), i(this, void 0, void 0, (function() {
                                return o(this, (function(r) {
                                    switch (r.label) {
                                        case 0:
                                            return [4, this.getCachedAbi(t, e)];
                                        case 1:
                                            return [2, r.sent().abi]
                                    }
                                }))
                            }))
                        }, t.prototype.getTransactionAbis = function(t, e) {
                            return void 0 === e && (e = !1), i(this, void 0, void 0, (function() {
                                var r, n, s, a = this;
                                return o(this, (function(u) {
                                    return r = t.actions.map((function(t) {
                                        return t.account
                                    })), n = new Set(r), s = c(n).map((function(t) {
                                        return i(a, void 0, void 0, (function() {
                                            var r;
                                            return o(this, (function(n) {
                                                switch (n.label) {
                                                    case 0:
                                                        return r = {
                                                            accountName: t
                                                        }, [4, this.getCachedAbi(t, e)];
                                                    case 1:
                                                        return [2, (r.abi = n.sent().rawAbi, r)]
                                                }
                                            }))
                                        }))
                                    })), [2, Promise.all(s)]
                                }))
                            }))
                        }, t.prototype.getContract = function(t, e) {
                            return void 0 === e && (e = !1), i(this, void 0, void 0, (function() {
                                var r, n, i, s, a, c, f, l, p, d, y;
                                return o(this, (function(o) {
                                    switch (o.label) {
                                        case 0:
                                            return !e && this.contracts.get(t) ? [2, this.contracts.get(t)] : [4, this.getAbi(t, e)];
                                        case 1:
                                            i = o.sent(), s = h.getTypesFromAbi(h.createInitialTypes(), i), a = new Map;
                                            try {
                                                for (c = u(i.actions), f = c.next(); !f.done; f = c.next()) l = f.value, p = l.name, d = l.type, a.set(p, h.getType(s, d))
                                            } catch (t) {
                                                r = {
                                                    error: t
                                                }
                                            } finally {
                                                try {
                                                    f && !f.done && (n = c.return) && n.call(c)
                                                } finally {
                                                    if (r) throw r.error
                                                }
                                            }
                                            return y = {
                                                types: s,
                                                actions: a
                                            }, this.contracts.set(t, y), [2, y]
                                    }
                                }))
                            }))
                        }, t.prototype.serialize = function(t, e, r) {
                            this.transactionTypes.get(e).serialize(t, r)
                        }, t.prototype.deserialize = function(t, e) {
                            return this.transactionTypes.get(e).deserialize(t)
                        }, t.prototype.serializeTransaction = function(t) {
                            var e = new h.SerialBuffer({
                                textEncoder: this.textEncoder,
                                textDecoder: this.textDecoder
                            });
                            return this.serialize(e, "transaction", n({
                                max_net_usage_words: 0,
                                max_cpu_usage_ms: 0,
                                delay_sec: 0,
                                context_free_actions: [],
                                actions: [],
                                transaction_extensions: []
                            }, t)), e.asUint8Array()
                        }, t.prototype.deserializeTransaction = function(t) {
                            var e = new h.SerialBuffer({
                                textEncoder: this.textEncoder,
                                textDecoder: this.textDecoder
                            });
                            return e.pushArray(t), this.deserialize(e, "transaction")
                        }, t.prototype.serializeActions = function(t) {
                            return i(this, void 0, void 0, (function() {
                                var e = this;
                                return o(this, (function(r) {
                                    switch (r.label) {
                                        case 0:
                                            return [4, Promise.all(t.map((function(t) {
                                                var r = t.account,
                                                    n = t.name,
                                                    s = t.authorization,
                                                    a = t.data;
                                                return i(e, void 0, void 0, (function() {
                                                    var t;
                                                    return o(this, (function(e) {
                                                        switch (e.label) {
                                                            case 0:
                                                                return [4, this.getContract(r)];
                                                            case 1:
                                                                return t = e.sent(), [2, h.serializeAction(t, r, n, s, a, this.textEncoder, this.textDecoder)]
                                                        }
                                                    }))
                                                }))
                                            })))];
                                        case 1:
                                            return [2, r.sent()]
                                    }
                                }))
                            }))
                        }, t.prototype.deserializeActions = function(t) {
                            return i(this, void 0, void 0, (function() {
                                var e = this;
                                return o(this, (function(r) {
                                    switch (r.label) {
                                        case 0:
                                            return [4, Promise.all(t.map((function(t) {
                                                var r = t.account,
                                                    n = t.name,
                                                    s = t.authorization,
                                                    a = t.data;
                                                return i(e, void 0, void 0, (function() {
                                                    var t;
                                                    return o(this, (function(e) {
                                                        switch (e.label) {
                                                            case 0:
                                                                return [4, this.getContract(r)];
                                                            case 1:
                                                                return t = e.sent(), [2, h.deserializeAction(t, r, n, s, a, this.textEncoder, this.textDecoder)]
                                                        }
                                                    }))
                                                }))
                                            })))];
                                        case 1:
                                            return [2, r.sent()]
                                    }
                                }))
                            }))
                        }, t.prototype.deserializeTransactionWithActions = function(t) {
                            return i(this, void 0, void 0, (function() {
                                var e, r;
                                return o(this, (function(i) {
                                    switch (i.label) {
                                        case 0:
                                            return "string" == typeof t && (t = h.hexToUint8Array(t)), e = this.deserializeTransaction(t), [4, this.deserializeActions(e.actions)];
                                        case 1:
                                            return r = i.sent(), [2, n({}, e, {
                                                actions: r
                                            })]
                                    }
                                }))
                            }))
                        }, t.prototype.transact = function(t, e) {
                            var r = void 0 === e ? {} : e,
                                s = r.broadcast,
                                a = void 0 === s || s,
                                c = r.sign,
                                u = void 0 === c || c,
                                f = r.blocksBehind,
                                l = r.expireSeconds;
                            return i(this, void 0, void 0, (function() {
                                var e, r, i, s, c, p, d, y, g;
                                return o(this, (function(o) {
                                    switch (o.label) {
                                        case 0:
                                            return this.chainId ? [3, 2] : [4, this.rpc.get_info()];
                                        case 1:
                                            e = o.sent(), this.chainId = e.chain_id, o.label = 2;
                                        case 2:
                                            return "number" == typeof f && l ? e ? [3, 4] : [4, this.rpc.get_info()] : [3, 6];
                                        case 3:
                                            e = o.sent(), o.label = 4;
                                        case 4:
                                            return [4, this.rpc.get_block(e.head_block_num - f)];
                                        case 5:
                                            r = o.sent(), t = n({}, h.transactionHeader(r, l), t), o.label = 6;
                                        case 6:
                                            if (!this.hasRequiredTaposFields(t)) throw new Error("Required configuration or TAPOS fields are not present");
                                            return [4, this.getTransactionAbis(t)];
                                        case 7:
                                            return i = o.sent(), s = [{}, t], c = {}, [4, this.serializeActions(t.actions)];
                                        case 8:
                                            return t = n.apply(void 0, s.concat([(c.actions = o.sent(), c)])), p = this.serializeTransaction(t), d = {
                                                serializedTransaction: p,
                                                signatures: []
                                            }, u ? [4, this.signatureProvider.getAvailableKeys()] : [3, 12];
                                        case 9:
                                            return y = o.sent(), [4, this.authorityProvider.getRequiredKeys({
                                                transaction: t,
                                                availableKeys: y
                                            })];
                                        case 10:
                                            return g = o.sent(), [4, this.signatureProvider.sign({
                                                chainId: this.chainId,
                                                requiredKeys: g,
                                                serializedTransaction: p,
                                                abis: i
                                            })];
                                        case 11:
                                            d = o.sent(), o.label = 12;
                                        case 12:
                                            return a ? [2, this.pushSignedTransaction(d)] : [2, d]
                                    }
                                }))
                            }))
                        }, t.prototype.pushSignedTransaction = function(t) {
                            var e = t.signatures,
                                r = t.serializedTransaction;
                            return i(this, void 0, void 0, (function() {
                                return o(this, (function(t) {
                                    return [2, this.rpc.push_transaction({
                                        signatures: e,
                                        serializedTransaction: r
                                    })]
                                }))
                            }))
                        }, t.prototype.hasRequiredTaposFields = function(t) {
                            var e = t.expiration,
                                r = t.ref_block_num,
                                n = t.ref_block_prefix;
                            return s(t, ["expiration", "ref_block_num", "ref_block_prefix"]), !!(e && r && n)
                        }, t
                    }();
                e.Api = p
            },
            671: function(t, e, r) {
                "use strict";
                var n = this && this.__awaiter || function(t, e, r, n) {
                        return new(r || (r = Promise))((function(i, o) {
                            function s(t) {
                                try {
                                    c(n.next(t))
                                } catch (t) {
                                    o(t)
                                }
                            }

                            function a(t) {
                                try {
                                    c(n.throw(t))
                                } catch (t) {
                                    o(t)
                                }
                            }

                            function c(t) {
                                t.done ? i(t.value) : new r((function(e) {
                                    e(t.value)
                                })).then(s, a)
                            }
                            c((n = n.apply(t, e || [])).next())
                        }))
                    },
                    i = this && this.__generator || function(t, e) {
                        var r, n, i, o, s = {
                            label: 0,
                            sent: function() {
                                if (1 & i[0]) throw i[1];
                                return i[1]
                            },
                            trys: [],
                            ops: []
                        };
                        return o = {
                            next: a(0),
                            throw: a(1),
                            return: a(2)
                        }, "function" == typeof Symbol && (o[Symbol.iterator] = function() {
                            return this
                        }), o;

                        function a(o) {
                            return function(a) {
                                return function(o) {
                                    if (r) throw new TypeError("Generator is already executing.");
                                    for (; s;) try {
                                        if (r = 1, n && (i = 2 & o[0] ? n.return : o[0] ? n.throw || ((i = n.return) && i.call(n), 0) : n.next) && !(i = i.call(n, o[1])).done) return i;
                                        switch (n = 0, i && (o = [2 & o[0], i.value]), o[0]) {
                                            case 0:
                                            case 1:
                                                i = o;
                                                break;
                                            case 4:
                                                return s.label++, {
                                                    value: o[1],
                                                    done: !1
                                                };
                                            case 5:
                                                s.label++, n = o[1], o = [0];
                                                continue;
                                            case 7:
                                                o = s.ops.pop(), s.trys.pop();
                                                continue;
                                            default:
                                                if (!((i = (i = s.trys).length > 0 && i[i.length - 1]) || 6 !== o[0] && 2 !== o[0])) {
                                                    s = 0;
                                                    continue
                                                }
                                                if (3 === o[0] && (!i || o[1] > i[0] && o[1] < i[3])) {
                                                    s.label = o[1];
                                                    break
                                                }
                                                if (6 === o[0] && s.label < i[1]) {
                                                    s.label = i[1], i = o;
                                                    break
                                                }
                                                if (i && s.label < i[2]) {
                                                    s.label = i[2], s.ops.push(o);
                                                    break
                                                }
                                                i[2] && s.ops.pop(), s.trys.pop();
                                                continue
                                        }
                                        o = e.call(t, s)
                                    } catch (t) {
                                        o = [6, t], n = 0
                                    } finally {
                                        r = i = 0
                                    }
                                    if (5 & o[0]) throw o[1];
                                    return {
                                        value: o[0] ? o[1] : void 0,
                                        done: !0
                                    }
                                }([o, a])
                            }
                        }
                    },
                    o = this && this.__values || function(t) {
                        var e = "function" == typeof Symbol && t[Symbol.iterator],
                            r = 0;
                        return e ? e.call(t) : {
                            next: function() {
                                return t && r >= t.length && (t = void 0), {
                                    value: t && t[r++],
                                    done: !t
                                }
                            }
                        }
                    };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                var s = r(3099),
                    a = r(3820);

                function c(t) {
                    var e, r, n = "";
                    try {
                        for (var i = o(t), s = i.next(); !s.done; s = i.next()) n += ("00" + s.value.toString(16)).slice(-2)
                    } catch (t) {
                        e = {
                            error: t
                        }
                    } finally {
                        try {
                            s && !s.done && (r = i.return) && r.call(i)
                        } finally {
                            if (e) throw e.error
                        }
                    }
                    return n
                }
                var u = function() {
                    function t(t, e) {
                        void 0 === e && (e = {}), this.endpoint = t, e.fetch ? this.fetchBuiltin = e.fetch : this.fetchBuiltin = r.g.fetch
                    }
                    return t.prototype.fetch = function(t, e) {
                        return n(this, void 0, void 0, (function() {
                            var r, n, o;
                            return i(this, (function(i) {
                                switch (i.label) {
                                    case 0:
                                        return i.trys.push([0, 3, , 4]), [4, (0, this.fetchBuiltin)(this.endpoint + t, {
                                            body: JSON.stringify(e),
                                            method: "POST"
                                        })];
                                    case 1:
                                        return [4, (r = i.sent()).json()];
                                    case 2:
                                        if ((n = i.sent()).processed && n.processed.except) throw new a.RpcError(n);
                                        return [3, 4];
                                    case 3:
                                        throw (o = i.sent()).isFetchError = !0, o;
                                    case 4:
                                        if (!r.ok) throw new a.RpcError(n);
                                        return [2, n]
                                }
                            }))
                        }))
                    }, t.prototype.get_abi = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_abi", {
                                            account_name: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_account = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_account", {
                                            account_name: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_block_header_state = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_block_header_state", {
                                            block_num_or_id: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_block = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_block", {
                                            block_num_or_id: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_code = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_code", {
                                            account_name: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_currency_balance = function(t, e, r) {
                        return void 0 === r && (r = null), n(this, void 0, void 0, (function() {
                            return i(this, (function(n) {
                                switch (n.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_currency_balance", {
                                            code: t,
                                            account: e,
                                            symbol: r
                                        })];
                                    case 1:
                                        return [2, n.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_currency_stats = function(t, e) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(r) {
                                switch (r.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_currency_stats", {
                                            code: t,
                                            symbol: e
                                        })];
                                    case 1:
                                        return [2, r.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_info = function() {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(t) {
                                switch (t.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_info", {})];
                                    case 1:
                                        return [2, t.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_producer_schedule = function() {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(t) {
                                switch (t.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_producer_schedule", {})];
                                    case 1:
                                        return [2, t.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_producers = function(t, e, r) {
                        return void 0 === t && (t = !0), void 0 === e && (e = ""), void 0 === r && (r = 50), n(this, void 0, void 0, (function() {
                            return i(this, (function(n) {
                                switch (n.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_producers", {
                                            json: t,
                                            lower_bound: e,
                                            limit: r
                                        })];
                                    case 1:
                                        return [2, n.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_raw_code_and_abi = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_raw_code_and_abi", {
                                            account_name: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.getRawAbi = function(t) {
                        return n(this, void 0, void 0, (function() {
                            var e, r;
                            return i(this, (function(n) {
                                switch (n.label) {
                                    case 0:
                                        return [4, this.get_raw_code_and_abi(t)];
                                    case 1:
                                        return e = n.sent(), r = s.base64ToBinary(e.abi), [2, {
                                            accountName: e.account_name,
                                            abi: r
                                        }]
                                }
                            }))
                        }))
                    }, t.prototype.get_table_rows = function(t) {
                        var e = t.json,
                            r = void 0 === e || e,
                            o = t.code,
                            s = t.scope,
                            a = t.table,
                            c = t.table_key,
                            u = void 0 === c ? "" : c,
                            h = t.lower_bound,
                            f = void 0 === h ? "" : h,
                            l = t.upper_bound,
                            p = void 0 === l ? "" : l,
                            d = t.index_position,
                            y = void 0 === d ? 1 : d,
                            g = t.key_type,
                            m = void 0 === g ? "" : g,
                            v = t.limit,
                            w = void 0 === v ? 10 : v,
                            b = t.reverse,
                            _ = void 0 !== b && b,
                            A = t.show_payer,
                            E = void 0 !== A && A;
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(t) {
                                switch (t.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_table_rows", {
                                            json: r,
                                            code: o,
                                            scope: s,
                                            table: a,
                                            table_key: u,
                                            lower_bound: f,
                                            upper_bound: p,
                                            index_position: y,
                                            key_type: m,
                                            limit: w,
                                            reverse: _,
                                            show_payer: E
                                        })];
                                    case 1:
                                        return [2, t.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.get_table_by_scope = function(t) {
                        var e = t.code,
                            r = t.table,
                            o = t.lower_bound,
                            s = void 0 === o ? "" : o,
                            a = t.upper_bound,
                            c = void 0 === a ? "" : a,
                            u = t.limit,
                            h = void 0 === u ? 10 : u;
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(t) {
                                switch (t.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/get_table_by_scope", {
                                            code: e,
                                            table: r,
                                            lower_bound: s,
                                            upper_bound: c,
                                            limit: h
                                        })];
                                    case 1:
                                        return [2, t.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.getRequiredKeys = function(t) {
                        return n(this, void 0, void 0, (function() {
                            var e;
                            return i(this, (function(r) {
                                switch (r.label) {
                                    case 0:
                                        return e = s.convertLegacyPublicKeys, [4, this.fetch("/v1/chain/get_required_keys", {
                                            transaction: t.transaction,
                                            available_keys: t.availableKeys
                                        })];
                                    case 1:
                                        return [2, e.apply(void 0, [r.sent().required_keys])]
                                }
                            }))
                        }))
                    }, t.prototype.push_transaction = function(t) {
                        var e = t.signatures,
                            r = t.serializedTransaction;
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(t) {
                                switch (t.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/chain/push_transaction", {
                                            signatures: e,
                                            compression: 0,
                                            packed_context_free_data: "",
                                            packed_trx: c(r)
                                        })];
                                    case 1:
                                        return [2, t.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.db_size_get = function() {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(t) {
                                switch (t.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/db_size/get", {})];
                                    case 1:
                                        return [2, t.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.history_get_actions = function(t, e, r) {
                        return void 0 === e && (e = null), void 0 === r && (r = null), n(this, void 0, void 0, (function() {
                            return i(this, (function(n) {
                                switch (n.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/history/get_actions", {
                                            account_name: t,
                                            pos: e,
                                            offset: r
                                        })];
                                    case 1:
                                        return [2, n.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.history_get_transaction = function(t, e) {
                        return void 0 === e && (e = null), n(this, void 0, void 0, (function() {
                            return i(this, (function(r) {
                                switch (r.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/history/get_transaction", {
                                            id: t,
                                            block_num_hint: e
                                        })];
                                    case 1:
                                        return [2, r.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.history_get_key_accounts = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/history/get_key_accounts", {
                                            public_key: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t.prototype.history_get_controlled_accounts = function(t) {
                        return n(this, void 0, void 0, (function() {
                            return i(this, (function(e) {
                                switch (e.label) {
                                    case 0:
                                        return [4, this.fetch("/v1/history/get_controlled_accounts", {
                                            controlling_account: t
                                        })];
                                    case 1:
                                        return [2, e.sent()]
                                }
                            }))
                        }))
                    }, t
                }();
                e.JsonRpc = u
            },
            3099: function(t, e, r) {
                "use strict";
                var n = this && this.__read || function(t, e) {
                        var r = "function" == typeof Symbol && t[Symbol.iterator];
                        if (!r) return t;
                        var n, i, o = r.call(t),
                            s = [];
                        try {
                            for (;
                                (void 0 === e || e-- > 0) && !(n = o.next()).done;) s.push(n.value)
                        } catch (t) {
                            i = {
                                error: t
                            }
                        } finally {
                            try {
                                n && !n.done && (r = o.return) && r.call(o)
                            } finally {
                                if (i) throw i.error
                            }
                        }
                        return s
                    },
                    i = this && this.__spread || function() {
                        for (var t = [], e = 0; e < arguments.length; e++) t = t.concat(n(arguments[e]));
                        return t
                    },
                    o = this && this.__values || function(t) {
                        var e = "function" == typeof Symbol && t[Symbol.iterator],
                            r = 0;
                        return e ? e.call(t) : {
                            next: function() {
                                return t && r >= t.length && (t = void 0), {
                                    value: t && t[r++],
                                    done: !t
                                }
                            }
                        }
                    };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                var s, a = r(6322).RIPEMD160.hash,
                    c = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
                    u = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
                    h = function() {
                        for (var t = Array(256).fill(-1), e = 0; e < c.length; ++e) t[c.charCodeAt(e)] = e;
                        return t
                    }(),
                    f = function() {
                        for (var t = Array(256).fill(-1), e = 0; e < u.length; ++e) t[u.charCodeAt(e)] = e;
                        return t["=".charCodeAt(0)] = 0, t
                    }();

                function l(t) {
                    return 0 != (128 & t[t.length - 1])
                }

                function p(t) {
                    for (var e = 1, r = 0; r < t.length; ++r) {
                        var n = (255 & ~t[r]) + e;
                        t[r] = n, e = n >> 8
                    }
                }

                function d(t, e) {
                    for (var r = new Uint8Array(t), n = 0; n < e.length; ++n) {
                        var i = e.charCodeAt(n);
                        if (i < "0".charCodeAt(0) || i > "9".charCodeAt(0)) throw new Error("invalid number");
                        for (var o = i - "0".charCodeAt(0), s = 0; s < t; ++s) {
                            var a = 10 * r[s] + o;
                            r[s] = a, o = a >> 8
                        }
                        if (o) throw new Error("number is out of range")
                    }
                    return r
                }

                function y(t, e) {
                    void 0 === e && (e = 1);
                    for (var r = Array(e).fill("0".charCodeAt(0)), n = t.length - 1; n >= 0; --n) {
                        for (var o = t[n], s = 0; s < r.length; ++s) {
                            var a = (r[s] - "0".charCodeAt(0) << 8) + o;
                            r[s] = "0".charCodeAt(0) + a % 10, o = a / 10 | 0
                        }
                        for (; o;) r.push("0".charCodeAt(0) + o % 10), o = o / 10 | 0
                    }
                    return r.reverse(), String.fromCharCode.apply(String, i(r))
                }

                function g(t, e) {
                    for (var r = new Uint8Array(t), n = 0; n < e.length; ++n) {
                        var i = h[e.charCodeAt(n)];
                        if (i < 0) throw new Error("invalid base-58 value");
                        for (var o = 0; o < t; ++o) {
                            var s = 58 * r[o] + i;
                            r[o] = s, i = s >> 8
                        }
                        if (i) throw new Error("base-58 value is out of range")
                    }
                    return r.reverse(), r
                }

                function m(t, e) {
                    var r, n, s, a;
                    void 0 === e && (e = 1);
                    var u = [];
                    try {
                        for (var f = o(t), l = f.next(); !l.done; l = f.next()) {
                            for (var p = l.value, d = 0; d < u.length; ++d) {
                                var y = (h[u[d]] << 8) + p;
                                u[d] = c.charCodeAt(y % 58), p = y / 58 | 0
                            }
                            for (; p;) u.push(c.charCodeAt(p % 58)), p = p / 58 | 0
                        }
                    } catch (t) {
                        r = {
                            error: t
                        }
                    } finally {
                        try {
                            l && !l.done && (n = f.return) && n.call(f)
                        } finally {
                            if (r) throw r.error
                        }
                    }
                    try {
                        for (var g = o(t), m = g.next(); !m.done && !m.value; m = g.next()) u.push("1".charCodeAt(0))
                    } catch (t) {
                        s = {
                            error: t
                        }
                    } finally {
                        try {
                            m && !m.done && (a = g.return) && a.call(g)
                        } finally {
                            if (s) throw s.error
                        }
                    }
                    return u.reverse(), String.fromCharCode.apply(String, i(u))
                }

                function v(t, e) {
                    for (var r = new Uint8Array(t.length + e.length), n = 0; n < t.length; ++n) r[n] = t[n];
                    for (n = 0; n < e.length; ++n) r[t.length + n] = e.charCodeAt(n);
                    return a(r)
                }

                function w(t, e, r, n) {
                    var i = g(r + 4, t),
                        o = {
                            type: e,
                            data: new Uint8Array(i.buffer, 0, r)
                        },
                        s = new Uint8Array(v(o.data, n));
                    if (s[0] !== i[r + 0] || s[1] !== i[r + 1] || s[2] !== i[r + 2] || s[3] !== i[r + 3]) throw new Error("checksum doesn't match");
                    return o
                }

                function b(t, e, r) {
                    for (var n = new Uint8Array(v(t.data, e)), i = new Uint8Array(t.data.length + 4), o = 0; o < t.data.length; ++o) i[o] = t.data[o];
                    for (o = 0; o < 4; ++o) i[o + t.data.length] = n[o];
                    return r + m(i)
                }

                function _(t) {
                    if ("string" != typeof t) throw new Error("expected string containing public key");
                    if ("EOS" === t.substr(0, 3)) {
                        for (var r = g(e.publicKeyDataSize + 4, t.substr(3)), n = {
                                type: s.k1,
                                data: new Uint8Array(e.publicKeyDataSize)
                            }, i = 0; i < e.publicKeyDataSize; ++i) n.data[i] = r[i];
                        var o = new Uint8Array(a(n.data));
                        if (o[0] !== r[e.publicKeyDataSize] || o[1] !== r[34] || o[2] !== r[35] || o[3] !== r[36]) throw new Error("checksum doesn't match");
                        return n
                    }
                    if ("PUB_K1_" === t.substr(0, 7)) return w(t.substr(7), s.k1, e.publicKeyDataSize, "K1");
                    if ("PUB_R1_" === t.substr(0, 7)) return w(t.substr(7), s.r1, e.publicKeyDataSize, "R1");
                    throw new Error("unrecognized public key format")
                }

                function A(t) {
                    if (t.type === s.k1 && t.data.length === e.publicKeyDataSize) return b(t, "K1", "PUB_K1_");
                    if (t.type === s.r1 && t.data.length === e.publicKeyDataSize) return b(t, "R1", "PUB_R1_");
                    throw new Error("unrecognized public key format")
                }

                function E(t) {
                    return "EOS" === t.substr(0, 3) ? A(_(t)) : t
                }
                e.isNegative = l, e.negate = p, e.decimalToBinary = d, e.signedDecimalToBinary = function(t, e) {
                        var r = "-" === e[0];
                        r && (e = e.substr(1));
                        var n = d(t, e);
                        if (r) {
                            if (p(n), !l(n)) throw new Error("number is out of range")
                        } else if (l(n)) throw new Error("number is out of range");
                        return n
                    }, e.binaryToDecimal = y, e.signedBinaryToDecimal = function(t, e) {
                        if (void 0 === e && (e = 1), l(t)) {
                            var r = t.slice();
                            return p(r), "-" + y(r, e)
                        }
                        return y(t, e)
                    }, e.base58ToBinary = g, e.binaryToBase58 = m, e.base64ToBinary = function(t) {
                        var e = t.length;
                        if (1 == (3 & e) && "=" === t[e - 1] && (e -= 1), 0 != (3 & e)) throw new Error("base-64 value is not padded correctly");
                        var r = e >> 2,
                            n = 3 * r;
                        e > 0 && "=" === t[e - 1] && ("=" === t[e - 2] ? n -= 2 : n -= 1);
                        for (var i = new Uint8Array(n), o = 0; o < r; ++o) {
                            var s = f[t.charCodeAt(4 * o + 0)],
                                a = f[t.charCodeAt(4 * o + 1)],
                                c = f[t.charCodeAt(4 * o + 2)],
                                u = f[t.charCodeAt(4 * o + 3)];
                            i[3 * o + 0] = s << 2 | a >> 4, 3 * o + 1 < n && (i[3 * o + 1] = (15 & a) << 4 | c >> 2), 3 * o + 2 < n && (i[3 * o + 2] = (3 & c) << 6 | u)
                        }
                        return i
                    },
                    function(t) {
                        t[t.k1 = 0] = "k1", t[t.r1 = 1] = "r1"
                    }(s = e.KeyType || (e.KeyType = {})), e.publicKeyDataSize = 33, e.privateKeyDataSize = 32, e.signatureDataSize = 65, e.stringToPublicKey = _, e.publicKeyToString = A, e.convertLegacyPublicKey = E, e.convertLegacyPublicKeys = function(t) {
                        return t.map(E)
                    }, e.stringToPrivateKey = function(t) {
                        if ("string" != typeof t) throw new Error("expected string containing private key");
                        if ("PVT_R1_" === t.substr(0, 7)) return w(t.substr(7), s.r1, e.privateKeyDataSize, "R1");
                        throw new Error("unrecognized private key format")
                    }, e.privateKeyToString = function(t) {
                        if (t.type === s.r1) return b(t, "R1", "PVT_R1_");
                        throw new Error("unrecognized private key format")
                    }, e.stringToSignature = function(t) {
                        if ("string" != typeof t) throw new Error("expected string containing signature");
                        if ("SIG_K1_" === t.substr(0, 7)) return w(t.substr(7), s.k1, e.signatureDataSize, "K1");
                        if ("SIG_R1_" === t.substr(0, 7)) return w(t.substr(7), s.r1, e.signatureDataSize, "R1");
                        throw new Error("unrecognized signature format")
                    }, e.signatureToString = function(t) {
                        if (t.type === s.k1) return b(t, "K1", "SIG_K1_");
                        if (t.type === s.r1) return b(t, "R1", "SIG_R1_");
                        throw new Error("unrecognized signature format")
                    }
            },
            7406: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                })
            },
            3820: function(t, e) {
                "use strict";
                var r, n = this && this.__extends || (r = function(t, e) {
                    return (r = Object.setPrototypeOf || {
                            __proto__: []
                        }
                        instanceof Array && function(t, e) {
                            t.__proto__ = e
                        } || function(t, e) {
                            for (var r in e) e.hasOwnProperty(r) && (t[r] = e[r])
                        })(t, e)
                }, function(t, e) {
                    function n() {
                        this.constructor = t
                    }
                    r(t, e), t.prototype = null === e ? Object.create(e) : (n.prototype = e.prototype, new n)
                });
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                var i = function(t) {
                    function e(r) {
                        var n = this;
                        return n = r.error && r.error.details && r.error.details.length && r.error.details[0].message ? t.call(this, r.error.details[0].message) || this : r.processed && r.processed.except && r.processed.except.message ? t.call(this, r.processed.except.message) || this : t.call(this, r.message) || this, Object.setPrototypeOf(n, e.prototype), n.json = r, n
                    }
                    return n(e, t), e
                }(Error);
                e.RpcError = i
            },
            1749: function(t, e, r) {
                "use strict";
                var n = this && this.__assign || function() {
                        return (n = Object.assign || function(t) {
                            for (var e, r = 1, n = arguments.length; r < n; r++)
                                for (var i in e = arguments[r]) Object.prototype.hasOwnProperty.call(e, i) && (t[i] = e[i]);
                            return t
                        }).apply(this, arguments)
                    },
                    i = this && this.__read || function(t, e) {
                        var r = "function" == typeof Symbol && t[Symbol.iterator];
                        if (!r) return t;
                        var n, i, o = r.call(t),
                            s = [];
                        try {
                            for (;
                                (void 0 === e || e-- > 0) && !(n = o.next()).done;) s.push(n.value)
                        } catch (t) {
                            i = {
                                error: t
                            }
                        } finally {
                            try {
                                n && !n.done && (r = o.return) && r.call(o)
                            } finally {
                                if (i) throw i.error
                            }
                        }
                        return s
                    },
                    o = this && this.__spread || function() {
                        for (var t = [], e = 0; e < arguments.length; e++) t = t.concat(i(arguments[e]));
                        return t
                    },
                    s = this && this.__values || function(t) {
                        var e = "function" == typeof Symbol && t[Symbol.iterator],
                            r = 0;
                        return e ? e.call(t) : {
                            next: function() {
                                return t && r >= t.length && (t = void 0), {
                                    value: t && t[r++],
                                    done: !t
                                }
                            }
                        }
                    };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                var a = r(3099),
                    c = function(t) {
                        void 0 === t && (t = {}), this.skippedBinaryExtension = !1, this.options = t
                    };
                e.SerializerState = c;
                var u = function() {
                    function t(t) {
                        var e = void 0 === t ? {} : t,
                            r = e.textEncoder,
                            n = e.textDecoder,
                            i = e.array;
                        this.readPos = 0, this.array = i || new Uint8Array(1024), this.length = i ? i.length : 0, this.textEncoder = r || new TextEncoder, this.textDecoder = n || new TextDecoder("utf-8", {
                            fatal: !0
                        })
                    }
                    return t.prototype.reserve = function(t) {
                        if (!(this.length + t <= this.array.length)) {
                            for (var e = this.array.length; this.length + t > e;) e = Math.ceil(1.5 * e);
                            var r = new Uint8Array(e);
                            r.set(this.array), this.array = r
                        }
                    }, t.prototype.haveReadData = function() {
                        return this.readPos < this.length
                    }, t.prototype.restartRead = function() {
                        this.readPos = 0
                    }, t.prototype.asUint8Array = function() {
                        return new Uint8Array(this.array.buffer, this.array.byteOffset, this.length)
                    }, t.prototype.pushArray = function(t) {
                        this.reserve(t.length), this.array.set(t, this.length), this.length += t.length
                    }, t.prototype.push = function() {
                        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
                        this.pushArray(t)
                    }, t.prototype.get = function() {
                        if (this.readPos < this.length) return this.array[this.readPos++];
                        throw new Error("Read past end of buffer")
                    }, t.prototype.pushUint8ArrayChecked = function(t, e) {
                        if (t.length !== e) throw new Error("Binary data has incorrect size");
                        this.pushArray(t)
                    }, t.prototype.getUint8Array = function(t) {
                        if (this.readPos + t > this.length) throw new Error("Read past end of buffer");
                        var e = new Uint8Array(this.array.buffer, this.array.byteOffset + this.readPos, t);
                        return this.readPos += t, e
                    }, t.prototype.pushUint16 = function(t) {
                        this.push(t >> 0 & 255, t >> 8 & 255)
                    }, t.prototype.getUint16 = function() {
                        var t = 0;
                        return (t |= this.get() << 0) | this.get() << 8
                    }, t.prototype.pushUint32 = function(t) {
                        this.push(t >> 0 & 255, t >> 8 & 255, t >> 16 & 255, t >> 24 & 255)
                    }, t.prototype.getUint32 = function() {
                        var t = 0;
                        return t |= this.get() << 0, t |= this.get() << 8, t |= this.get() << 16, (t |= this.get() << 24) >>> 0
                    }, t.prototype.pushNumberAsUint64 = function(t) {
                        this.pushUint32(t >>> 0), this.pushUint32(Math.floor(t / 4294967296) >>> 0)
                    }, t.prototype.getUint64AsNumber = function() {
                        var t = this.getUint32();
                        return 4294967296 * (this.getUint32() >>> 0) + (t >>> 0)
                    }, t.prototype.pushVaruint32 = function(t) {
                        for (;;) {
                            if (!(t >>> 7)) {
                                this.push(t);
                                break
                            }
                            this.push(128 | 127 & t), t >>>= 7
                        }
                    }, t.prototype.getVaruint32 = function() {
                        for (var t = 0, e = 0;;) {
                            var r = this.get();
                            if (t |= (127 & r) << e, e += 7, !(128 & r)) break
                        }
                        return t >>> 0
                    }, t.prototype.pushVarint32 = function(t) {
                        this.pushVaruint32(t << 1 ^ t >> 31)
                    }, t.prototype.getVarint32 = function() {
                        var t = this.getVaruint32();
                        return 1 & t ? ~t >> 1 | 2147483648 : t >>> 1
                    }, t.prototype.pushFloat32 = function(t) {
                        this.pushArray(new Uint8Array(new Float32Array([t]).buffer))
                    }, t.prototype.getFloat32 = function() {
                        return new Float32Array(this.getUint8Array(4).slice().buffer)[0]
                    }, t.prototype.pushFloat64 = function(t) {
                        this.pushArray(new Uint8Array(new Float64Array([t]).buffer))
                    }, t.prototype.getFloat64 = function() {
                        return new Float64Array(this.getUint8Array(8).slice().buffer)[0]
                    }, t.prototype.pushName = function(t) {
                        if ("string" != typeof t) throw new Error("Expected string containing name");

                        function e(t) {
                            return t >= "a".charCodeAt(0) && t <= "z".charCodeAt(0) ? t - "a".charCodeAt(0) + 6 : t >= "1".charCodeAt(0) && t <= "5".charCodeAt(0) ? t - "1".charCodeAt(0) + 1 : 0
                        }
                        for (var r = new Uint8Array(8), n = 63, i = 0; i < t.length; ++i) {
                            var o = e(t.charCodeAt(i));
                            n < 5 && (o <<= 1);
                            for (var s = 4; s >= 0; --s) n >= 0 && (r[Math.floor(n / 8)] |= (o >> s & 1) << n % 8, --n)
                        }
                        this.pushArray(r)
                    }, t.prototype.getName = function() {
                        for (var t = this.getUint8Array(8), e = "", r = 63; r >= 0;) {
                            for (var n = 0, i = 0; i < 5; ++i) r >= 0 && (n = n << 1 | t[Math.floor(r / 8)] >> r % 8 & 1, --r);
                            e += n >= 6 ? String.fromCharCode(n + "a".charCodeAt(0) - 6) : n >= 1 ? String.fromCharCode(n + "1".charCodeAt(0) - 1) : "."
                        }
                        for (; e.endsWith(".");) e = e.substr(0, e.length - 1);
                        return e
                    }, t.prototype.pushBytes = function(t) {
                        this.pushVaruint32(t.length), this.pushArray(t)
                    }, t.prototype.getBytes = function() {
                        return this.getUint8Array(this.getVaruint32())
                    }, t.prototype.pushString = function(t) {
                        this.pushBytes(this.textEncoder.encode(t))
                    }, t.prototype.getString = function() {
                        return this.textDecoder.decode(this.getBytes())
                    }, t.prototype.pushSymbolCode = function(t) {
                        if ("string" != typeof t) throw new Error("Expected string containing symbol_code");
                        var e = [];
                        for (e.push.apply(e, o(this.textEncoder.encode(t))); e.length < 8;) e.push(0);
                        this.pushArray(e.slice(0, 8))
                    }, t.prototype.getSymbolCode = function() {
                        var t, e = this.getUint8Array(8);
                        for (t = 0; t < e.length && e[t]; ++t);
                        return this.textDecoder.decode(new Uint8Array(e.buffer, e.byteOffset, t))
                    }, t.prototype.pushSymbol = function(t) {
                        var e = t.name,
                            r = [255 & t.precision];
                        for (r.push.apply(r, o(this.textEncoder.encode(e))); r.length < 8;) r.push(0);
                        this.pushArray(r.slice(0, 8))
                    }, t.prototype.getSymbol = function() {
                        var t, e = this.get(),
                            r = this.getUint8Array(7);
                        for (t = 0; t < r.length && r[t]; ++t);
                        return {
                            name: this.textDecoder.decode(new Uint8Array(r.buffer, r.byteOffset, t)),
                            precision: e
                        }
                    }, t.prototype.pushAsset = function(t) {
                        if ("string" != typeof t) throw new Error("Expected string containing asset");
                        var e = 0,
                            r = "",
                            n = 0;
                        "-" === (t = t.trim())[e] && (r += "-", ++e);
                        for (var i = !1; e < t.length && t.charCodeAt(e) >= "0".charCodeAt(0) && t.charCodeAt(e) <= "9".charCodeAt(0);) i = !0, r += t[e], ++e;
                        if (!i) throw new Error("Asset must begin with a number");
                        if ("." === t[e])
                            for (++e; e < t.length && t.charCodeAt(e) >= "0".charCodeAt(0) && t.charCodeAt(e) <= "9".charCodeAt(0);) r += t[e], ++n, ++e;
                        var o = t.substr(e).trim();
                        this.pushArray(a.signedDecimalToBinary(8, r)), this.pushSymbol({
                            name: o,
                            precision: n
                        })
                    }, t.prototype.getAsset = function() {
                        var t = this.getUint8Array(8),
                            e = this.getSymbol(),
                            r = e.name,
                            n = e.precision,
                            i = a.signedBinaryToDecimal(t, n + 1);
                        return n && (i = i.substr(0, i.length - n) + "." + i.substr(i.length - n)), i + " " + r
                    }, t.prototype.pushPublicKey = function(t) {
                        var e = a.stringToPublicKey(t);
                        this.push(e.type), this.pushArray(e.data)
                    }, t.prototype.getPublicKey = function() {
                        var t = this.get(),
                            e = this.getUint8Array(a.publicKeyDataSize);
                        return a.publicKeyToString({
                            type: t,
                            data: e
                        })
                    }, t.prototype.pushPrivateKey = function(t) {
                        var e = a.stringToPrivateKey(t);
                        this.push(e.type), this.pushArray(e.data)
                    }, t.prototype.getPrivateKey = function() {
                        var t = this.get(),
                            e = this.getUint8Array(a.privateKeyDataSize);
                        return a.privateKeyToString({
                            type: t,
                            data: e
                        })
                    }, t.prototype.pushSignature = function(t) {
                        var e = a.stringToSignature(t);
                        this.push(e.type), this.pushArray(e.data)
                    }, t.prototype.getSignature = function() {
                        var t = this.get(),
                            e = this.getUint8Array(a.signatureDataSize);
                        return a.signatureToString({
                            type: t,
                            data: e
                        })
                    }, t
                }();

                function h(t) {
                    var e = Date.parse(t);
                    if (Number.isNaN(e)) throw new Error("Invalid time format");
                    return e
                }

                function f(t) {
                    return Math.round(1e3 * h(t + "Z"))
                }

                function l(t) {
                    var e = new Date(t / 1e3).toISOString();
                    return e.substr(0, e.length - 1)
                }

                function p(t) {
                    return Math.round(h(t + "Z") / 1e3)
                }

                function d(t) {
                    var e = new Date(1e3 * t).toISOString();
                    return e.substr(0, e.length - 1)
                }

                function y(t) {
                    return Math.round((h(t + "Z") - 9466848e5) / 500)
                }

                function g(t) {
                    var e = new Date(500 * t + 9466848e5).toISOString();
                    return e.substr(0, e.length - 1)
                }

                function m(t) {
                    if ("string" != typeof t) throw new Error("Expected string containing symbol");
                    var e = t.match(/^([0-9]+),([A-Z]+)$/);
                    if (!e) throw new Error("Invalid symbol");
                    return {
                        name: e[2],
                        precision: +e[1]
                    }
                }

                function v(t) {
                    var e = t.name;
                    return t.precision + "," + e
                }

                function w(t) {
                    var e, r, n = "";
                    try {
                        for (var i = s(t), o = i.next(); !o.done; o = i.next()) n += ("00" + o.value.toString(16)).slice(-2)
                    } catch (t) {
                        e = {
                            error: t
                        }
                    } finally {
                        try {
                            o && !o.done && (r = i.return) && r.call(i)
                        } finally {
                            if (e) throw e.error
                        }
                    }
                    return n.toUpperCase()
                }

                function b(t) {
                    if ("string" != typeof t) throw new Error("Expected string containing hex digits");
                    if (t.length % 2) throw new Error("Odd number of hex digits");
                    for (var e = t.length / 2, r = new Uint8Array(e), n = 0; n < e; ++n) {
                        var i = parseInt(t.substr(2 * n, 2), 16);
                        if (Number.isNaN(i)) throw new Error("Expected hex string");
                        r[n] = i
                    }
                    return r
                }

                function _(t, e) {
                    throw new Error("Don't know how to serialize " + this.name)
                }

                function A(t) {
                    throw new Error("Don't know how to deserialize " + this.name)
                }

                function E(t, e, r, n) {
                    var i, o;
                    if (void 0 === r && (r = new c), void 0 === n && (n = !0), "object" != typeof e) throw new Error("expected object containing data: " + JSON.stringify(e));
                    this.base && this.base.serialize(t, e, r, n);
                    try {
                        for (var a = s(this.fields), u = a.next(); !u.done; u = a.next()) {
                            var h = u.value;
                            if (h.name in e) {
                                if (r.skippedBinaryExtension) throw new Error("unexpected " + this.name + "." + h.name);
                                h.type.serialize(t, e[h.name], r, n && h === this.fields[this.fields.length - 1])
                            } else {
                                if (!n || !h.type.extensionOf) throw new Error("missing " + this.name + "." + h.name + " (type=" + h.type.name + ")");
                                r.skippedBinaryExtension = !0
                            }
                        }
                    } catch (t) {
                        i = {
                            error: t
                        }
                    } finally {
                        try {
                            u && !u.done && (o = a.return) && o.call(a)
                        } finally {
                            if (i) throw i.error
                        }
                    }
                }

                function x(t, e, r) {
                    var n, i, o;
                    void 0 === e && (e = new c), void 0 === r && (r = !0), o = this.base ? this.base.deserialize(t, e, r) : {};
                    try {
                        for (var a = s(this.fields), u = a.next(); !u.done; u = a.next()) {
                            var h = u.value;
                            r && h.type.extensionOf && !t.haveReadData() ? e.skippedBinaryExtension = !0 : o[h.name] = h.type.deserialize(t, e, r)
                        }
                    } catch (t) {
                        n = {
                            error: t
                        }
                    } finally {
                        try {
                            u && !u.done && (i = a.return) && i.call(a)
                        } finally {
                            if (n) throw n.error
                        }
                    }
                    return o
                }

                function k(t, e, r, n) {
                    if (!Array.isArray(e) || 2 !== e.length || "string" != typeof e[0]) throw new Error('expected variant: ["type", value]');
                    var i = this.fields.findIndex((function(t) {
                        return t.name === e[0]
                    }));
                    if (i < 0) throw new Error('type "' + e[0] + '" is not valid for variant');
                    t.pushVaruint32(i), this.fields[i].type.serialize(t, e[1], r, n)
                }

                function S(t, e, r) {
                    var n = t.getVaruint32();
                    if (n >= this.fields.length) throw new Error("type index " + n + " is not valid for variant");
                    var i = this.fields[n];
                    return [i.name, i.type.deserialize(t, e, r)]
                }

                function B(t, e, r, n) {
                    var i, o;
                    t.pushVaruint32(e.length);
                    try {
                        for (var a = s(e), c = a.next(); !c.done; c = a.next()) {
                            var u = c.value;
                            this.arrayOf.serialize(t, u, r, !1)
                        }
                    } catch (t) {
                        i = {
                            error: t
                        }
                    } finally {
                        try {
                            c && !c.done && (o = a.return) && o.call(a)
                        } finally {
                            if (i) throw i.error
                        }
                    }
                }

                function O(t, e, r) {
                    for (var n = t.getVaruint32(), i = [], o = 0; o < n; ++o) i.push(this.arrayOf.deserialize(t, e, !1));
                    return i
                }

                function C(t, e, r, n) {
                    null == e ? t.push(0) : (t.push(1), this.optionalOf.serialize(t, e, r, n))
                }

                function T(t, e, r) {
                    return t.get() ? this.optionalOf.deserialize(t, e, r) : null
                }

                function P(t, e, r, n) {
                    this.extensionOf.serialize(t, e, r, n)
                }

                function z(t, e, r) {
                    return this.extensionOf.deserialize(t, e, r)
                }

                function U(t) {
                    return n({
                        name: "<missing name>",
                        aliasOfName: "",
                        arrayOf: null,
                        optionalOf: null,
                        extensionOf: null,
                        baseName: "",
                        base: null,
                        fields: [],
                        serialize: _,
                        deserialize: A
                    }, t)
                }

                function M(t, e) {
                    if (Number.isNaN(+t) || Number.isNaN(+e) || "number" != typeof t && "string" != typeof t) throw new Error("Expected number");
                    if (+t != +e) throw new Error("Number is out of range");
                    return +t
                }

                function R(t, e) {
                    var r = t.get(e);
                    if (r && r.aliasOfName) return R(t, r.aliasOfName);
                    if (r) return r;
                    if (e.endsWith("[]")) return U({
                        name: e,
                        arrayOf: R(t, e.substr(0, e.length - 2)),
                        serialize: B,
                        deserialize: O
                    });
                    if (e.endsWith("?")) return U({
                        name: e,
                        optionalOf: R(t, e.substr(0, e.length - 1)),
                        serialize: C,
                        deserialize: T
                    });
                    if (e.endsWith("$")) return U({
                        name: e,
                        extensionOf: R(t, e.substr(0, e.length - 1)),
                        serialize: P,
                        deserialize: z
                    });
                    throw new Error("Unknown type: " + e)
                }

                function j(t, e, r, n, i, o) {
                    var s = t.actions.get(r);
                    if (!s) throw new Error("Unknown action " + r + " in contract " + e);
                    var a = new u({
                        textEncoder: i,
                        textDecoder: o
                    });
                    return s.serialize(a, n), w(a.asUint8Array())
                }

                function D(t, e, r, n, i, o) {
                    var s = t.actions.get(r);
                    if ("string" == typeof n && (n = b(n)), !s) throw new Error("Unknown action " + r + " in contract " + e);
                    var a = new u({
                        textDecoder: o,
                        textEncoder: i
                    });
                    return a.pushArray(n), s.deserialize(a)
                }
                e.SerialBuffer = u, e.supportedAbiVersion = function(t) {
                    return t.startsWith("eosio::abi/1.")
                }, e.dateToTimePoint = f, e.timePointToDate = l, e.dateToTimePointSec = p, e.timePointSecToDate = d, e.dateToBlockTimestamp = y, e.blockTimestampToDate = g, e.stringToSymbol = m, e.symbolToString = v, e.arrayToHex = w, e.hexToUint8Array = b, e.createInitialTypes = function() {
                    var t = new Map(Object.entries({
                        bool: U({
                            name: "bool",
                            serialize: function(t, e) {
                                if ("boolean" != typeof e) throw new Error("Expected true or false");
                                t.push(e ? 1 : 0)
                            },
                            deserialize: function(t) {
                                return !!t.get()
                            }
                        }),
                        uint8: U({
                            name: "uint8",
                            serialize: function(t, e) {
                                t.push(M(e, 255 & e))
                            },
                            deserialize: function(t) {
                                return t.get()
                            }
                        }),
                        int8: U({
                            name: "int8",
                            serialize: function(t, e) {
                                t.push(M(e, e << 24 >> 24))
                            },
                            deserialize: function(t) {
                                return t.get() << 24 >> 24
                            }
                        }),
                        uint16: U({
                            name: "uint16",
                            serialize: function(t, e) {
                                t.pushUint16(M(e, 65535 & e))
                            },
                            deserialize: function(t) {
                                return t.getUint16()
                            }
                        }),
                        int16: U({
                            name: "int16",
                            serialize: function(t, e) {
                                t.pushUint16(M(e, e << 16 >> 16))
                            },
                            deserialize: function(t) {
                                return t.getUint16() << 16 >> 16
                            }
                        }),
                        uint32: U({
                            name: "uint32",
                            serialize: function(t, e) {
                                t.pushUint32(M(e, e >>> 0))
                            },
                            deserialize: function(t) {
                                return t.getUint32()
                            }
                        }),
                        uint64: U({
                            name: "uint64",
                            serialize: function(t, e) {
                                t.pushArray(a.decimalToBinary(8, "" + e))
                            },
                            deserialize: function(t) {
                                return a.binaryToDecimal(t.getUint8Array(8))
                            }
                        }),
                        int64: U({
                            name: "int64",
                            serialize: function(t, e) {
                                t.pushArray(a.signedDecimalToBinary(8, "" + e))
                            },
                            deserialize: function(t) {
                                return a.signedBinaryToDecimal(t.getUint8Array(8))
                            }
                        }),
                        int32: U({
                            name: "int32",
                            serialize: function(t, e) {
                                t.pushUint32(M(e, 0 | e))
                            },
                            deserialize: function(t) {
                                return 0 | t.getUint32()
                            }
                        }),
                        varuint32: U({
                            name: "varuint32",
                            serialize: function(t, e) {
                                t.pushVaruint32(M(e, e >>> 0))
                            },
                            deserialize: function(t) {
                                return t.getVaruint32()
                            }
                        }),
                        varint32: U({
                            name: "varint32",
                            serialize: function(t, e) {
                                t.pushVarint32(M(e, 0 | e))
                            },
                            deserialize: function(t) {
                                return t.getVarint32()
                            }
                        }),
                        uint128: U({
                            name: "uint128",
                            serialize: function(t, e) {
                                t.pushArray(a.decimalToBinary(16, "" + e))
                            },
                            deserialize: function(t) {
                                return a.binaryToDecimal(t.getUint8Array(16))
                            }
                        }),
                        int128: U({
                            name: "int128",
                            serialize: function(t, e) {
                                t.pushArray(a.signedDecimalToBinary(16, "" + e))
                            },
                            deserialize: function(t) {
                                return a.signedBinaryToDecimal(t.getUint8Array(16))
                            }
                        }),
                        float32: U({
                            name: "float32",
                            serialize: function(t, e) {
                                t.pushFloat32(e)
                            },
                            deserialize: function(t) {
                                return t.getFloat32()
                            }
                        }),
                        float64: U({
                            name: "float64",
                            serialize: function(t, e) {
                                t.pushFloat64(e)
                            },
                            deserialize: function(t) {
                                return t.getFloat64()
                            }
                        }),
                        float128: U({
                            name: "float128",
                            serialize: function(t, e) {
                                t.pushUint8ArrayChecked(b(e), 16)
                            },
                            deserialize: function(t) {
                                return w(t.getUint8Array(16))
                            }
                        }),
                        bytes: U({
                            name: "bytes",
                            serialize: function(t, e) {
                                e instanceof Uint8Array || Array.isArray(e) ? t.pushBytes(e) : t.pushBytes(b(e))
                            },
                            deserialize: function(t, e) {
                                return e && e.options.bytesAsUint8Array ? t.getBytes() : w(t.getBytes())
                            }
                        }),
                        string: U({
                            name: "string",
                            serialize: function(t, e) {
                                t.pushString(e)
                            },
                            deserialize: function(t) {
                                return t.getString()
                            }
                        }),
                        name: U({
                            name: "name",
                            serialize: function(t, e) {
                                t.pushName(e)
                            },
                            deserialize: function(t) {
                                return t.getName()
                            }
                        }),
                        time_point: U({
                            name: "time_point",
                            serialize: function(t, e) {
                                t.pushNumberAsUint64(f(e))
                            },
                            deserialize: function(t) {
                                return l(t.getUint64AsNumber())
                            }
                        }),
                        time_point_sec: U({
                            name: "time_point_sec",
                            serialize: function(t, e) {
                                t.pushUint32(p(e))
                            },
                            deserialize: function(t) {
                                return d(t.getUint32())
                            }
                        }),
                        block_timestamp_type: U({
                            name: "block_timestamp_type",
                            serialize: function(t, e) {
                                t.pushUint32(y(e))
                            },
                            deserialize: function(t) {
                                return g(t.getUint32())
                            }
                        }),
                        symbol_code: U({
                            name: "symbol_code",
                            serialize: function(t, e) {
                                t.pushSymbolCode(e)
                            },
                            deserialize: function(t) {
                                return t.getSymbolCode()
                            }
                        }),
                        symbol: U({
                            name: "symbol",
                            serialize: function(t, e) {
                                t.pushSymbol(m(e))
                            },
                            deserialize: function(t) {
                                return v(t.getSymbol())
                            }
                        }),
                        asset: U({
                            name: "asset",
                            serialize: function(t, e) {
                                t.pushAsset(e)
                            },
                            deserialize: function(t) {
                                return t.getAsset()
                            }
                        }),
                        checksum160: U({
                            name: "checksum160",
                            serialize: function(t, e) {
                                t.pushUint8ArrayChecked(b(e), 20)
                            },
                            deserialize: function(t) {
                                return w(t.getUint8Array(20))
                            }
                        }),
                        checksum256: U({
                            name: "checksum256",
                            serialize: function(t, e) {
                                t.pushUint8ArrayChecked(b(e), 32)
                            },
                            deserialize: function(t) {
                                return w(t.getUint8Array(32))
                            }
                        }),
                        checksum512: U({
                            name: "checksum512",
                            serialize: function(t, e) {
                                t.pushUint8ArrayChecked(b(e), 64)
                            },
                            deserialize: function(t) {
                                return w(t.getUint8Array(64))
                            }
                        }),
                        public_key: U({
                            name: "public_key",
                            serialize: function(t, e) {
                                t.pushPublicKey(e)
                            },
                            deserialize: function(t) {
                                return t.getPublicKey()
                            }
                        }),
                        private_key: U({
                            name: "private_key",
                            serialize: function(t, e) {
                                t.pushPrivateKey(e)
                            },
                            deserialize: function(t) {
                                return t.getPrivateKey()
                            }
                        }),
                        signature: U({
                            name: "signature",
                            serialize: function(t, e) {
                                t.pushSignature(e)
                            },
                            deserialize: function(t) {
                                return t.getSignature()
                            }
                        })
                    }));
                    return t.set("extended_asset", U({
                        name: "extended_asset",
                        baseName: "",
                        fields: [{
                            name: "quantity",
                            typeName: "asset",
                            type: t.get("asset")
                        }, {
                            name: "contract",
                            typeName: "name",
                            type: t.get("name")
                        }],
                        serialize: E,
                        deserialize: x
                    })), t
                }, e.getType = R, e.getTypesFromAbi = function(t, e) {
                    var r, n, o, a, c, u, h, f, l, p, d = new Map(t);
                    if (e.types) try {
                        for (var y = s(e.types), g = y.next(); !g.done; g = y.next()) {
                            var m = g.value,
                                v = m.new_type_name,
                                w = m.type;
                            d.set(v, U({
                                name: v,
                                aliasOfName: w
                            }))
                        }
                    } catch (t) {
                        r = {
                            error: t
                        }
                    } finally {
                        try {
                            g && !g.done && (n = y.return) && n.call(y)
                        } finally {
                            if (r) throw r.error
                        }
                    }
                    if (e.structs) try {
                        for (var b = s(e.structs), _ = b.next(); !_.done; _ = b.next()) {
                            var A = _.value,
                                B = A.name,
                                O = A.base,
                                C = A.fields;
                            d.set(B, U({
                                name: B,
                                baseName: O,
                                fields: C.map((function(t) {
                                    return {
                                        name: t.name,
                                        typeName: t.type,
                                        type: null
                                    }
                                })),
                                serialize: E,
                                deserialize: x
                            }))
                        }
                    } catch (t) {
                        o = {
                            error: t
                        }
                    } finally {
                        try {
                            _ && !_.done && (a = b.return) && a.call(b)
                        } finally {
                            if (o) throw o.error
                        }
                    }
                    if (e.variants) try {
                        for (var T = s(e.variants), P = T.next(); !P.done; P = T.next()) {
                            var z = P.value,
                                M = z.name,
                                j = z.types;
                            d.set(M, U({
                                name: M,
                                fields: j.map((function(t) {
                                    return {
                                        name: t,
                                        typeName: t,
                                        type: null
                                    }
                                })),
                                serialize: k,
                                deserialize: S
                            }))
                        }
                    } catch (t) {
                        c = {
                            error: t
                        }
                    } finally {
                        try {
                            P && !P.done && (u = T.return) && u.call(T)
                        } finally {
                            if (c) throw c.error
                        }
                    }
                    try {
                        for (var D = s(d), N = D.next(); !N.done; N = D.next()) {
                            var I = i(N.value, 2);
                            I[0], (w = I[1]).baseName && (w.base = R(d, w.baseName));
                            try {
                                for (var L = s(w.fields), q = L.next(); !q.done; q = L.next()) {
                                    var F = q.value;
                                    F.type = R(d, F.typeName)
                                }
                            } catch (t) {
                                l = {
                                    error: t
                                }
                            } finally {
                                try {
                                    q && !q.done && (p = L.return) && p.call(L)
                                } finally {
                                    if (l) throw l.error
                                }
                            }
                        }
                    } catch (t) {
                        h = {
                            error: t
                        }
                    } finally {
                        try {
                            N && !N.done && (f = D.return) && f.call(D)
                        } finally {
                            if (h) throw h.error
                        }
                    }
                    return d
                }, e.transactionHeader = function(t, e) {
                    return {
                        expiration: d(p(t.timestamp) + e),
                        ref_block_num: 65535 & t.block_num,
                        ref_block_prefix: t.ref_block_prefix
                    }
                }, e.serializeActionData = j, e.serializeAction = function(t, e, r, n, i, o, s) {
                    return {
                        account: e,
                        name: r,
                        authorization: n,
                        data: j(t, e, r, i, o, s)
                    }
                }, e.deserializeActionData = D, e.deserializeAction = function(t, e, r, n, i, o, s) {
                    return {
                        account: e,
                        name: r,
                        authorization: n,
                        data: D(t, e, r, i, o, s)
                    }
                }
            },
            9886: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                var n = r(1506);
                e.Api = n.Api;
                var i = r(1455);
                e.ApiInterfaces = i;
                var o = r(671);
                e.JsonRpc = o.JsonRpc;
                var s = r(3099);
                e.Numeric = s;
                var a = r(7406);
                e.RpcInterfaces = a;
                var c = r(3820);
                e.RpcError = c.RpcError;
                var u = r(1749);
                e.Serialize = u
            },
            6322: t => {
                "use strict";
                var e = function() {
                        function t(t, e) {
                            for (var r = 0; r < e.length; r++) {
                                var n = e[r];
                                n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, n.key, n)
                            }
                        }
                        return function(e, r, n) {
                            return r && t(e.prototype, r), n && t(e, n), e
                        }
                    }(),
                    r = function() {
                        function t() {
                            ! function(t, e) {
                                if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                            }(this, t)
                        }
                        return e(t, null, [{
                            key: "get_n_pad_bytes",
                            value: function(t) {
                                return 64 - (t + 8 & 63)
                            }
                        }, {
                            key: "pad",
                            value: function(e) {
                                var r, n, i = e.byteLength,
                                    o = t.get_n_pad_bytes(i),
                                    s = function(t, e) {
                                        if (Array.isArray(t)) return t;
                                        if (Symbol.iterator in Object(t)) return function(t, e) {
                                            var r = [],
                                                n = !0,
                                                i = !1,
                                                o = void 0;
                                            try {
                                                for (var s, a = t[Symbol.iterator](); !(n = (s = a.next()).done) && (r.push(s.value), !e || r.length !== e); n = !0);
                                            } catch (t) {
                                                i = !0, o = t
                                            } finally {
                                                try {
                                                    !n && a.return && a.return()
                                                } finally {
                                                    if (i) throw o
                                                }
                                            }
                                            return r
                                        }(t, e);
                                        throw new TypeError("Invalid attempt to destructure non-iterable instance")
                                    }((r = i, n = 536870912, [Math.floor(r / n), r % n]).map((function(t, e) {
                                        return e ? 8 * t : t
                                    })), 2),
                                    a = s[0],
                                    c = s[1],
                                    u = new Uint8Array(i + o + 8);
                                u.set(new Uint8Array(e), 0);
                                var h = new DataView(u.buffer);
                                return h.setUint8(i, 128), h.setUint32(i + o, c, !0), h.setUint32(i + o + 4, a, !0), u.buffer
                            }
                        }, {
                            key: "f",
                            value: function(t, e, r, n) {
                                return 0 <= t && t <= 15 ? e ^ r ^ n : 16 <= t && t <= 31 ? e & r | ~e & n : 32 <= t && t <= 47 ? (e | ~r) ^ n : 48 <= t && t <= 63 ? e & n | r & ~n : 64 <= t && t <= 79 ? e ^ (r | ~n) : void 0
                            }
                        }, {
                            key: "K",
                            value: function(t) {
                                return 0 <= t && t <= 15 ? 0 : 16 <= t && t <= 31 ? 1518500249 : 32 <= t && t <= 47 ? 1859775393 : 48 <= t && t <= 63 ? 2400959708 : 64 <= t && t <= 79 ? 2840853838 : void 0
                            }
                        }, {
                            key: "KP",
                            value: function(t) {
                                return 0 <= t && t <= 15 ? 1352829926 : 16 <= t && t <= 31 ? 1548603684 : 32 <= t && t <= 47 ? 1836072691 : 48 <= t && t <= 63 ? 2053994217 : 64 <= t && t <= 79 ? 0 : void 0
                            }
                        }, {
                            key: "add_modulo32",
                            value: function() {
                                return 0 | Array.from(arguments).reduce((function(t, e) {
                                    return t + e
                                }), 0)
                            }
                        }, {
                            key: "rol32",
                            value: function(t, e) {
                                return t << e | t >>> 32 - e
                            }
                        }, {
                            key: "hash",
                            value: function(e) {
                                for (var r = t.pad(e), n = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13], i = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11], o = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6], s = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11], a = r.byteLength / 64, c = new Array(a).fill(void 0).map((function(t, e) {
                                        return function(t) {
                                            return new DataView(r, 64 * e, 64).getUint32(4 * t, !0)
                                        }
                                    })), u = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], h = 0; h < a; ++h) {
                                    for (var f = u[0], l = u[1], p = u[2], d = u[3], y = u[4], g = f, m = l, v = p, w = d, b = y, _ = 0; _ < 80; ++_) {
                                        var A = t.add_modulo32(t.rol32(t.add_modulo32(f, t.f(_, l, p, d), c[h](n[_]), t.K(_)), o[_]), y);
                                        f = y, y = d, d = t.rol32(p, 10), p = l, l = A, A = t.add_modulo32(t.rol32(t.add_modulo32(g, t.f(79 - _, m, v, w), c[h](i[_]), t.KP(_)), s[_]), b), g = b, b = w, w = t.rol32(v, 10), v = m, m = A
                                    }
                                    var E = t.add_modulo32(u[1], p, w);
                                    u[1] = t.add_modulo32(u[2], d, b), u[2] = t.add_modulo32(u[3], y, g), u[3] = t.add_modulo32(u[4], f, m), u[4] = t.add_modulo32(u[0], l, v), u[0] = E
                                }
                                var x = new ArrayBuffer(20),
                                    k = new DataView(x);
                                return u.forEach((function(t, e) {
                                    return k.setUint32(4 * e, t, !0)
                                })), x
                            }
                        }]), t
                    }();
                t.exports = {
                    RIPEMD160: r
                }
            },
            335: t => {
                "use strict";
                t.exports = JSON.parse('{"version":"eosio::abi/1.1","structs":[{"name":"extensions_entry","base":"","fields":[{"name":"tag","type":"uint16"},{"name":"value","type":"bytes"}]},{"name":"type_def","base":"","fields":[{"name":"new_type_name","type":"string"},{"name":"type","type":"string"}]},{"name":"field_def","base":"","fields":[{"name":"name","type":"string"},{"name":"type","type":"string"}]},{"name":"struct_def","base":"","fields":[{"name":"name","type":"string"},{"name":"base","type":"string"},{"name":"fields","type":"field_def[]"}]},{"name":"action_def","base":"","fields":[{"name":"name","type":"name"},{"name":"type","type":"string"},{"name":"ricardian_contract","type":"string"}]},{"name":"table_def","base":"","fields":[{"name":"name","type":"name"},{"name":"index_type","type":"string"},{"name":"key_names","type":"string[]"},{"name":"key_types","type":"string[]"},{"name":"type","type":"string"}]},{"name":"clause_pair","base":"","fields":[{"name":"id","type":"string"},{"name":"body","type":"string"}]},{"name":"error_message","base":"","fields":[{"name":"error_code","type":"uint64"},{"name":"error_msg","type":"string"}]},{"name":"variant_def","base":"","fields":[{"name":"name","type":"string"},{"name":"types","type":"string[]"}]},{"name":"abi_def","base":"","fields":[{"name":"version","type":"string"},{"name":"types","type":"type_def[]"},{"name":"structs","type":"struct_def[]"},{"name":"actions","type":"action_def[]"},{"name":"tables","type":"table_def[]"},{"name":"ricardian_clauses","type":"clause_pair[]"},{"name":"error_messages","type":"error_message[]"},{"name":"abi_extensions","type":"extensions_entry[]"},{"name":"variants","type":"variant_def[]$"}]}]}')
            },
            9790: t => {
                "use strict";
                t.exports = JSON.parse('{"version":"eosio::abi/1.0","types":[{"new_type_name":"account_name","type":"name"},{"new_type_name":"action_name","type":"name"},{"new_type_name":"permission_name","type":"name"}],"structs":[{"name":"permission_level","base":"","fields":[{"name":"actor","type":"account_name"},{"name":"permission","type":"permission_name"}]},{"name":"action","base":"","fields":[{"name":"account","type":"account_name"},{"name":"name","type":"action_name"},{"name":"authorization","type":"permission_level[]"},{"name":"data","type":"bytes"}]},{"name":"extension","base":"","fields":[{"name":"type","type":"uint16"},{"name":"data","type":"bytes"}]},{"name":"transaction_header","base":"","fields":[{"name":"expiration","type":"time_point_sec"},{"name":"ref_block_num","type":"uint16"},{"name":"ref_block_prefix","type":"uint32"},{"name":"max_net_usage_words","type":"varuint32"},{"name":"max_cpu_usage_ms","type":"uint8"},{"name":"delay_sec","type":"varuint32"}]},{"name":"transaction","base":"transaction_header","fields":[{"name":"context_free_actions","type":"action[]"},{"name":"actions","type":"action[]"},{"name":"transaction_extensions","type":"extension[]"}]}]}')
            },
            6906: t => {
                function e() {}
                t.exports = function(t, r, n) {
                    var i = !1;
                    return n = n || e, o.count = t, 0 === t ? r() : o;

                    function o(t, e) {
                        if (o.count <= 0) throw new Error("after called too many times");
                        --o.count, t ? (i = !0, r(t), r = n) : 0 !== o.count || i || r(null, e)
                    }
                }
            },
            9718: t => {
                t.exports = function(t, e, r) {
                    var n = t.byteLength;
                    if (e = e || 0, r = r || n, t.slice) return t.slice(e, r);
                    if (e < 0 && (e += n), r < 0 && (r += n), r > n && (r = n), e >= n || e >= r || 0 === n) return new ArrayBuffer(0);
                    for (var i = new Uint8Array(t), o = new Uint8Array(r - e), s = e, a = 0; s < r; s++, a++) o[a] = i[s];
                    return o.buffer
                }
            },
            5516: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(8299)),
                    o = n(r(46));

                function s(t, e) {
                    const r = Object.keys(e),
                        n = {};
                    for (const t of r) "number" == typeof e[t] ? n["data:number." + t] = e[t] : "boolean" == typeof e[t] ? n["data:bool." + t] = e[t] : n["data." + t] = e[t];
                    return Object.assign({}, t, n)
                }
                e.default = class {
                    constructor(t, e, r) {
                        this.endpoint = t, this.namespace = e, r.fetch ? this.fetchBuiltin = r.fetch : this.fetchBuiltin = window.fetch, this.action = (async () => new i.default((await this.getConfig()).contract, this))()
                    }
                    async getConfig() {
                        return await this.fetchEndpoint("/v1/config", {})
                    }
                    async getAssets(t = {}, e = 1, r = 100, n = {}) {
                        return await this.fetchEndpoint("/v1/assets", Object.assign({
                            page: e,
                            limit: r
                        }, s(t, n)))
                    }
                    async countAssets(t, e = {}) {
                        return await this.countEndpoint("/v1/assets", s(t, e))
                    }
                    async getAsset(t) {
                        return await this.fetchEndpoint("/v1/assets/" + t, {})
                    }
                    async getAssetStats(t) {
                        return await this.fetchEndpoint("/v1/assets/" + t + "/stats", {})
                    }
                    async getAssetLogs(t, e = 1, r = 100, n = "desc") {
                        return await this.fetchEndpoint("/v1/assets/" + t + "/logs", {
                            page: e,
                            limit: r,
                            order: n
                        })
                    }
                    async getCollections(t = {}, e = 1, r = 100) {
                        return await this.fetchEndpoint("/v1/collections", Object.assign({
                            page: e,
                            limit: r
                        }, t))
                    }
                    async countCollections(t = {}) {
                        return await this.countEndpoint("/v1/collections", t)
                    }
                    async getCollection(t) {
                        return await this.fetchEndpoint("/v1/collections/" + t, {})
                    }
                    async getCollectionStats(t) {
                        return await this.fetchEndpoint("/v1/collections/" + t + "/stats", {})
                    }
                    async getCollectionLogs(t, e = 1, r = 100, n = "desc") {
                        return await this.fetchEndpoint("/v1/collections/" + t + "/logs", {
                            page: e,
                            limit: r,
                            order: n
                        })
                    }
                    async getSchemas(t = {}, e = 1, r = 100) {
                        return await this.fetchEndpoint("/v1/schemas", Object.assign({
                            page: e,
                            limit: r
                        }, t))
                    }
                    async countSchemas(t = {}) {
                        return await this.countEndpoint("/v1/schemas", t)
                    }
                    async getSchema(t, e) {
                        return await this.fetchEndpoint("/v1/schemas/" + t + "/" + e, {})
                    }
                    async getSchemaStats(t, e) {
                        return await this.fetchEndpoint("/v1/schemas/" + t + "/" + e + "/stats", {})
                    }
                    async getSchemaLogs(t, e, r = 1, n = 100, i = "desc") {
                        return await this.fetchEndpoint("/v1/schemas/" + t + "/" + e + "/logs", {
                            page: r,
                            limit: n,
                            order: i
                        })
                    }
                    async getTemplates(t = {}, e = 1, r = 100, n = {}) {
                        return await this.fetchEndpoint("/v1/templates", Object.assign({
                            page: e,
                            limit: r
                        }, s(t, n)))
                    }
                    async countTemplates(t = {}, e = {}) {
                        return await this.countEndpoint("/v1/templates", s(t, e))
                    }
                    async getTemplate(t, e) {
                        return await this.fetchEndpoint("/v1/templates/" + t + "/" + e, {})
                    }
                    async getTemplateStats(t, e) {
                        return await this.fetchEndpoint("/v1/templates/" + t + "/" + e + "/stats", {})
                    }
                    async getTemplateLogs(t, e, r = 1, n = 100, i = "desc") {
                        return await this.fetchEndpoint("/v1/templates/" + t + "/" + e + "/logs", {
                            page: r,
                            limit: n,
                            order: i
                        })
                    }
                    async getTransfers(t = {}, e = 1, r = 100) {
                        return await this.fetchEndpoint("/v1/transfers", Object.assign({
                            page: e,
                            limit: r
                        }, t))
                    }
                    async countTransfers(t = {}) {
                        return await this.countEndpoint("/v1/transfers", t)
                    }
                    async getOffers(t = {}, e = 1, r = 100) {
                        return await this.fetchEndpoint("/v1/offers", Object.assign({
                            page: e,
                            limit: r
                        }, t))
                    }
                    async countOffers(t = {}) {
                        return await this.countEndpoint("/v1/offers", t)
                    }
                    async getOffer(t) {
                        return await this.fetchEndpoint("/v1/offers/" + t, {})
                    }
                    async getAccounts(t = {}, e = 1, r = 100) {
                        return await this.fetchEndpoint("/v1/accounts", Object.assign({
                            page: e,
                            limit: r
                        }, t))
                    }
                    async getBurns(t = {}, e = 1, r = 100) {
                        return await this.fetchEndpoint("/v1/burns", Object.assign({
                            page: e,
                            limit: r
                        }, t))
                    }
                    async countAccounts(t = {}) {
                        return await this.countEndpoint("/v1/accounts", t)
                    }
                    async getAccount(t, e = {}) {
                        return await this.fetchEndpoint("/v1/accounts/" + t, e)
                    }
                    async getAccountCollection(t, e) {
                        return await this.fetchEndpoint("/v1/accounts/" + t + "/" + e, {})
                    }
                    async getAccountBurns(t, e = {}) {
                        return await this.fetchEndpoint("/v1/burns/" + t, e)
                    }
                    async fetchEndpoint(t, e) {
                        let r, n;
                        const i = this.fetchBuiltin,
                            s = Object.keys(e).map((t => {
                                let r = e[t];
                                return !0 === r && (r = "true"), !1 === r && (r = "false"), t + "=" + encodeURIComponent(r)
                            })).join("&");
                        try {
                            r = await i(this.endpoint + "/" + this.namespace + t + (s.length > 0 ? "?" + s : "")), n = await r.json()
                        } catch (t) {
                            throw new o.default(t.message, 500)
                        }
                        if (200 !== r.status) throw new o.default(n.message, r.status);
                        if (!n.success) throw new o.default(n.message, r.status);
                        return n.data
                    }
                    async countEndpoint(t, e) {
                        const r = await this.fetchEndpoint(t + "/_count", e);
                        return parseInt(r, 10)
                    }
                }
            },
            8210: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = r(6047),
                    o = n(r(1251)),
                    s = n(r(4606)),
                    a = n(r(120));
                e.default = class {
                    constructor(t, e, r, n, i, c, u, h = !0) {
                        this.api = t, this.owner = e, this.id = r, this._data = new Promise((async (i, o) => {
                            if (n) i(n);
                            else try {
                                i(await t.queue.fetchAsset(e, r, h))
                            } catch (t) {
                                o(t)
                            }
                        })), this._template = new Promise((async (e, r) => {
                            if (u) e(u);
                            else try {
                                const r = await this._data;
                                if (Number(r.template_id) < 0) return e(null);
                                e(new a.default(t, r.collection_name, r.template_id, void 0, void 0, h))
                            } catch (t) {
                                r(t)
                            }
                        })), this._collection = new Promise((async (e, r) => {
                            if (i) e(i);
                            else try {
                                const r = await this._data;
                                e(new o.default(t, r.collection_name, void 0, h))
                            } catch (t) {
                                r(t)
                            }
                        })), this._schema = new Promise((async (e, r) => {
                            if (c) e(c);
                            else try {
                                const r = await this._data;
                                e(new s.default(t, r.collection_name, r.schema_name, void 0, h))
                            } catch (t) {
                                r(t)
                            }
                        }))
                    }
                    async template() {
                        return await this._template
                    }
                    async collection() {
                        return await this._collection
                    }
                    async schema() {
                        return await this._schema
                    }
                    async backedTokens() {
                        return (await this._data).backed_tokens
                    }
                    async immutableData() {
                        const t = await this.schema(),
                            e = await this._data;
                        return i.deserialize(e.immutable_serialized_data, await t.format())
                    }
                    async mutableData() {
                        const t = await this.schema(),
                            e = await this._data;
                        return i.deserialize(e.mutable_serialized_data, await t.format())
                    }
                    async data() {
                        const t = await this.mutableData(),
                            e = await this.immutableData(),
                            r = await this.template(),
                            n = r ? await r.immutableData() : {};
                        return Object.assign({}, t, e, n)
                    }
                    async toObject() {
                        const t = await this.template(),
                            e = await this.collection(),
                            r = await this.schema();
                        return {
                            asset_id: this.id,
                            collection: await e.toObject(),
                            schema: await r.toObject(),
                            template: t ? await t.toObject() : null,
                            backedTokens: await this.backedTokens(),
                            immutableData: await this.immutableData(),
                            mutableData: await this.mutableData(),
                            data: await this.data()
                        }
                    }
                }
            },
            1393: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(5746));
                e.default = class {
                    constructor() {
                        this.cache = new i.default({
                            expiryCheckInterval: 6e4
                        })
                    }
                    getAsset(t, e) {
                        return e && (e.mutable_serialized_data = new Uint8Array(e.mutable_serialized_data), e.immutable_serialized_data = new Uint8Array(e.immutable_serialized_data)), this.access("assets", t, e)
                    }
                    deleteAsset(t) {
                        this.delete("assets", t)
                    }
                    getTemplate(t, e, r) {
                        return r && (r.immutable_serialized_data = new Uint8Array(r.immutable_serialized_data)), this.access("templates", t + ":" + e, r)
                    }
                    deleteTemplate(t, e) {
                        this.delete("templates", t + ":" + e)
                    }
                    getSchema(t, e, r) {
                        return this.access("schemas", t + ":" + e, r)
                    }
                    deleteSchema(t, e) {
                        this.delete("schemas", t + ":" + e)
                    }
                    getCollection(t, e) {
                        return this.access("collections", t, e)
                    }
                    deleteCollection(t) {
                        this.delete("collections", t)
                    }
                    getOffer(t, e) {
                        return this.access("offers", t, e)
                    }
                    deleteOffer(t) {
                        this.delete("offers", t)
                    }
                    access(t, e, r) {
                        if (void 0 === r) {
                            const r = this.cache.get(t + ":" + e);
                            return null === r ? null : r.value
                        }
                        return this.cache.put(t + ":" + e, r, 9e5), r
                    }
                    delete(t, e) {
                        this.cache.remove(t + ":" + e)
                    }
                }
            },
            1251: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const n = r(1939),
                    i = r(6047);
                e.default = class {
                    constructor(t, e, r, n = !0) {
                        this.api = t, this.name = e, this._data = new Promise((async (i, o) => {
                            if (r) i(r);
                            else try {
                                i(await t.queue.fetchCollection(e, n))
                            } catch (t) {
                                o(t)
                            }
                        }))
                    }
                    async author() {
                        return (await this._data).author
                    }
                    async allowNotify() {
                        return (await this._data).allow_notify
                    }
                    async authorizedAccounts() {
                        return (await this._data).authorized_accounts
                    }
                    async notifyAccounts() {
                        return (await this._data).notify_accounts
                    }
                    async marketFee() {
                        return Number((await this._data).market_fee)
                    }
                    async data() {
                        return i.deserialize((await this._data).serialized_data, n.ObjectSchema((await this.api.config()).collection_format))
                    }
                    async toObject() {
                        return {
                            collection_name: this.name,
                            author: await this.author(),
                            allowNotify: await this.allowNotify(),
                            authorizedAccounts: await this.authorizedAccounts(),
                            notifyAccounts: await this.notifyAccounts(),
                            marketFee: await this.marketFee(),
                            data: await this.data()
                        }
                    }
                }
            },
            8400: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(8210));
                e.default = class {
                    constructor(t, e, r, n, o, s = !0) {
                        this.api = t, this.id = e, this._data = new Promise((async (t, n) => {
                            if (r) t(r);
                            else try {
                                t(await this.api.queue.fetchOffer(e, s))
                            } catch (t) {
                                n(t)
                            }
                        })), this._senderAssets = new Promise((async (t, e) => {
                            if (n) t(n);
                            else try {
                                const e = await this._data,
                                    r = await this.api.queue.fetchAccountAssets(e.sender);
                                return t(e.sender_asset_ids.map((t => {
                                    const n = r.find((e => e.asset_id === t));
                                    return n ? new i.default(this.api, e.sender, t, n, void 0, void 0, void 0, s) : t
                                })))
                            } catch (t) {
                                return e(t)
                            }
                        })), this._recipientAssets = new Promise((async (t, e) => {
                            if (o) t(o);
                            else try {
                                const e = await this._data,
                                    r = await this.api.queue.fetchAccountAssets(e.recipient);
                                return t(e.recipient_asset_ids.map((t => {
                                    const n = r.find((e => e.asset_id === t));
                                    return n ? new i.default(this.api, e.recipient, t, n, void 0, void 0, void 0, s) : t
                                })))
                            } catch (t) {
                                return e(t)
                            }
                        }))
                    }
                    async sender() {
                        return (await this._data).sender
                    }
                    async recipient() {
                        return (await this._data).recipient
                    }
                    async senderAssets() {
                        return await this._senderAssets
                    }
                    async recipientAssets() {
                        return await this._recipientAssets
                    }
                    async memo() {
                        return (await this._data).memo
                    }
                    async toObject() {
                        return {
                            offer_id: this.id,
                            sender: {
                                account: await this.sender(),
                                assets: await Promise.all((await this.senderAssets()).map((async t => "string" == typeof t ? t : await t.toObject())))
                            },
                            recipient: {
                                account: await this.recipient(),
                                assets: await Promise.all((await this.recipientAssets()).map((async t => "string" == typeof t ? t : await t.toObject())))
                            },
                            memo: await this.memo()
                        }
                    }
                }
            },
            6880: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.default = class {
                    constructor(t, e = 4) {
                        this.api = t, this.requestLimit = e, this.elements = [], this.interval = null, this.preloadedCollections = {}
                    }
                    async fetchAsset(t, e, r = !0) {
                        return await this.fetch_single_row("assets", t, e, (t => r || void 0 !== t ? this.api.cache.getAsset(e, t) : null))
                    }
                    async fetchAccountAssets(t) {
                        return (await this.fetch_all_rows("assets", t, "asset_id")).map((t => this.api.cache.getAsset(t.asset_id, t)))
                    }
                    async fetchTemplate(t, e, r = !0) {
                        return await this.fetch_single_row("templates", t, e, (n => r || void 0 !== n ? this.api.cache.getTemplate(t, e, n) : null))
                    }
                    async fetchSchema(t, e, r = !0) {
                        return await this.fetch_single_row("schemas", t, e, (n => r || void 0 !== n ? this.api.cache.getSchema(t, e, n) : null))
                    }
                    async fetchCollection(t, e = !0) {
                        return await this.fetch_single_row("collections", this.api.contract, t, (r => e || void 0 !== r ? this.api.cache.getCollection(t, r) : null))
                    }
                    async fetchCollectionSchemas(t) {
                        return (await this.fetch_all_rows("schemas", t, "schema_name")).map((e => this.api.cache.getSchema(t, e.schema_name, e)))
                    }
                    async fetchCollectionTemplates(t) {
                        return (await this.fetch_all_rows("templates", t, "template_id")).map((e => this.api.cache.getTemplate(t, String(e.template_id), e)))
                    }
                    async preloadCollection(t, e = !0) {
                        (!e || !this.preloadedCollections[t] || this.preloadedCollections[t] + 9e5 < Date.now()) && (await this.fetchCollectionSchemas(t), await this.fetchCollectionTemplates(t))
                    }
                    async fetchOffer(t, e = !0) {
                        return await this.fetch_single_row("offers", this.api.contract, t, (r => e || void 0 !== r ? this.api.cache.getOffer(t, r) : null))
                    }
                    async fetchAccountOffers(t) {
                        const e = await Promise.all([this.fetch_all_rows("offers", this.api.contract, "offer_sender", t, t, 2, "name"), this.fetch_all_rows("offers", this.api.contract, "offer_recipient", t, t, 3, "name")]);
                        return e[0].concat(e[1]).map((t => this.api.cache.getOffer(t.offer_id, t)))
                    }
                    dequeue() {
                        this.interval || (this.interval = setInterval((async () => {
                            this.elements.length > 0 ? this.elements.shift()() : (clearInterval(this.interval), this.interval = null)
                        }), Math.ceil(1e3 / this.requestLimit)))
                    }
                    async fetch_single_row(t, e, r, n, i = 1, o = "") {
                        return new Promise(((s, a) => {
                            let c = n();
                            if (null !== c) return s(c);
                            this.elements.push((async () => {
                                if (c = n(), null !== c) return s(c);
                                try {
                                    const c = {
                                            code: this.api.contract,
                                            table: t,
                                            scope: e,
                                            limit: 1,
                                            lower_bound: r,
                                            upper_bound: r,
                                            index_position: i,
                                            key_type: o
                                        },
                                        u = await this.api.getTableRows(c);
                                    return 0 === u.rows.length ? a(new Error("Row not found for " + JSON.stringify(c))) : s(n(u.rows[0]))
                                } catch (t) {
                                    return a(t)
                                }
                            })), this.dequeue()
                        }))
                    }
                    async fetch_all_rows(t, e, r, n = "", i = "", o = 1, s = "") {
                        return new Promise((async (a, c) => {
                            this.elements.push((async () => {
                                const u = await this.api.getTableRows({
                                    code: this.api.contract,
                                    scope: e,
                                    table: t,
                                    lower_bound: n,
                                    upper_bound: i,
                                    limit: 1e3,
                                    index_position: o,
                                    key_type: s
                                });
                                u.more && 1 === o ? (this.elements.unshift((async () => {
                                    try {
                                        const n = await this.fetch_all_rows(t, e, r, u.rows[u.rows.length - 1][r], i, o, s);
                                        n.length > 0 && n.shift(), a(u.rows.concat(n))
                                    } catch (t) {
                                        c(t)
                                    }
                                })), this.dequeue()) : a(u.rows)
                            })), this.dequeue()
                        }))
                    }
                }
            },
            4606: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = r(1939),
                    o = n(r(1251));
                e.default = class {
                    constructor(t, e, r, n, i = !0) {
                        this.api = t, this.collection = e, this.name = r, this._data = new Promise((async (o, s) => {
                            if (n) o(n);
                            else try {
                                o(await t.queue.fetchSchema(e, r, i))
                            } catch (t) {
                                s(t)
                            }
                        })), this._collection = new Promise((async (r, n) => {
                            try {
                                r(new o.default(t, e, void 0, i))
                            } catch (t) {
                                n(t)
                            }
                        }))
                    }
                    async format() {
                        return i.ObjectSchema((await this._data).format)
                    }
                    async rawFormat() {
                        return (await this._data).format
                    }
                    async toObject() {
                        return {
                            collection_name: this.collection,
                            schema_name: this.name,
                            format: await this.rawFormat()
                        }
                    }
                }
            },
            120: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = r(6047),
                    o = n(r(4606));
                e.default = class {
                    constructor(t, e, r, n, i, s = !0) {
                        this.api = t, this.collection = e, this.id = r, this._data = new Promise((async (i, o) => {
                            if (n) i(n);
                            else try {
                                i(await t.queue.fetchTemplate(e, r, s))
                            } catch (t) {
                                o(t)
                            }
                        })), this._schema = new Promise((async (t, r) => {
                            if (i) t(i);
                            else try {
                                const r = await this._data;
                                t(new o.default(this.api, e, r.schema_name, void 0, s))
                            } catch (t) {
                                r(t)
                            }
                        }))
                    }
                    async schema() {
                        return await this._schema
                    }
                    async immutableData() {
                        const t = await this._schema;
                        return i.deserialize((await this._data).immutable_serialized_data, await t.format())
                    }
                    async isTransferable() {
                        return (await this._data).transferable
                    }
                    async isBurnable() {
                        return (await this._data).burnable
                    }
                    async maxSupply() {
                        return (await this._data).max_supply
                    }
                    async circulation() {
                        return (await this._data).issued_supply
                    }
                    async toObject() {
                        return {
                            collection_name: this.collection,
                            template_id: this.id,
                            schema: await (await this.schema()).toObject(),
                            immutableData: await this.immutableData(),
                            transferable: await this.isTransferable(),
                            burnable: await this.isBurnable(),
                            maxSupply: await this.maxSupply(),
                            circulation: await this.circulation()
                        }
                    }
                }
            },
            1770: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(7009)),
                    o = n(r(9191)),
                    s = n(r(8210)),
                    a = n(r(1393)),
                    c = n(r(1251)),
                    u = n(r(8400)),
                    h = n(r(6880)),
                    f = n(r(4606)),
                    l = n(r(120));
                e.default = class {
                    constructor(t, e, n = {
                        rateLimit: 4
                    }) {
                        this.endpoint = t, this.contract = e, n.fetch ? this.fetchBuiltin = n.fetch : this.fetchBuiltin = r.g.fetch, this.queue = new h.default(this, n.rateLimit), this.cache = new a.default, this.action = new i.default(this), this._config = new Promise((async (t, e) => {
                            try {
                                const r = await this.getTableRows({
                                    code: this.contract,
                                    scope: this.contract,
                                    table: "config"
                                });
                                return 1 !== r.rows.length ? e("invalid config") : t(r.rows[0])
                            } catch (t) {
                                e(t)
                            }
                        }))
                    }
                    async config() {
                        return await this._config
                    }
                    async getAsset(t, e, r = !0) {
                        r || this.cache.deleteAsset(e);
                        const n = await this.queue.fetchAsset(t, e, r);
                        return new s.default(this, t, e, n, void 0, void 0, void 0, r)
                    }
                    async getTemplate(t, e, r = !0) {
                        r || this.cache.deleteTemplate(t, e);
                        const n = await this.queue.fetchTemplate(t, e, r);
                        return new l.default(this, t, e, n, void 0, r)
                    }
                    async getCollection(t, e = !0) {
                        e || this.cache.deleteCollection(t);
                        const r = await this.queue.fetchCollection(t, e);
                        return new c.default(this, t, r, e)
                    }
                    async getCollectionTemplates(t) {
                        return (await this.queue.fetchCollectionTemplates(t)).map((e => new l.default(this, t, String(e.template_id), e, void 0)))
                    }
                    async getCollectionsSchemas(t) {
                        return (await this.queue.fetchCollectionSchemas(t)).map((e => new f.default(this, t, e.schema_name, void 0)))
                    }
                    async getSchema(t, e, r = !0) {
                        r || this.cache.deleteSchema(t, e);
                        const n = await this.queue.fetchSchema(t, e, r);
                        return new f.default(this, t, e, n, r)
                    }
                    async getOffer(t, e = !0) {
                        e || this.cache.deleteOffer(t);
                        const r = await this.queue.fetchOffer(t, e);
                        return new u.default(this, t, r, void 0, void 0, e)
                    }
                    async getAccountOffers(t) {
                        return (await this.queue.fetchAccountOffers(t)).map((t => new u.default(this, t.offer_id, t, void 0, void 0)))
                    }
                    async getAccountAssets(t) {
                        return (await this.queue.fetchAccountAssets(t)).map((e => new s.default(this, t, e.asset_id, e, void 0, void 0, void 0)))
                    }
                    async getCollectionInventory(t, e) {
                        return await this.queue.preloadCollection(t, !0), (await this.queue.fetchAccountAssets(e)).filter((e => e.collection_name === t)).map((t => new s.default(this, e, t.asset_id, t, void 0, void 0, void 0)))
                    }
                    async preloadCollection(t, e = !0) {
                        await this.queue.preloadCollection(t, e)
                    }
                    async getTableRows({
                        code: t,
                        scope: e,
                        table: r,
                        table_key: n = "",
                        lower_bound: i = "",
                        upper_bound: o = "",
                        index_position: s = 1,
                        key_type: a = ""
                    }) {
                        return await this.fetchRpc("/v1/chain/get_table_rows", {
                            code: t,
                            scope: e,
                            table: r,
                            table_key: n,
                            lower_bound: i,
                            upper_bound: o,
                            index_position: s,
                            key_type: a,
                            limit: 101,
                            reverse: !1,
                            show_payer: !1,
                            json: !0
                        })
                    }
                    async fetchRpc(t, e) {
                        let r, n;
                        try {
                            const i = this.fetchBuiltin;
                            r = await i(this.endpoint + t, {
                                body: JSON.stringify(e),
                                method: "POST"
                            }), n = await r.json()
                        } catch (t) {
                            throw t.isFetchError = !0, t
                        }
                        if (n.processed && n.processed.except || !r.ok) throw new o.default(n);
                        return n
                    }
                }
            },
            8299: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const n = r(429);
                class i extends n.ActionGenerator {
                    constructor(t, e) {
                        super(t), this.api = e, this.config = e.getConfig()
                    }
                    async createcol(t, e, r, i, o, s, a, c) {
                        return super.createcol(t, e, r, i, o, s, a, n.toAttributeMap(c, (await this.config).collection_format))
                    }
                    async createtempl(t, e, r, i, o, s, a, c) {
                        const u = await this.api.getSchema(r, i),
                            h = n.toAttributeMap(c, u.format);
                        return super.createtempl(t, e, r, i, o, s, a, h)
                    }
                    async mintasset(t, e, r, i, o, s, a, c, u) {
                        const h = await this.api.getSchema(r, i),
                            f = n.toAttributeMap(a, h.format),
                            l = n.toAttributeMap(c, h.format);
                        return super.mintasset(t, e, r, i, o, s, f, l, u)
                    }
                    async setassetdata(t, e, r, i, o) {
                        const s = await this.api.getAsset(i),
                            a = n.toAttributeMap(o, s.schema.format);
                        return super.setassetdata(t, e, r, i, a)
                    }
                    async setcoldata(t, e, r) {
                        const i = n.toAttributeMap(r, (await this.config).collection_format);
                        return super.setcoldata(t, e, i)
                    }
                }
                e.default = i
            },
            429: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.toAttributeMap = e.ActionGenerator = void 0;
                const i = n(r(7308));
                e.ActionGenerator = class {
                    constructor(t) {
                        this.contract = t
                    }
                    async acceptoffer(t, e) {
                        return this._pack(t, "acceptoffer", {
                            offer_id: e
                        })
                    }
                    async addcolauth(t, e, r) {
                        return this._pack(t, "addcolauth", {
                            collection_name: e,
                            account_to_add: r
                        })
                    }
                    async addconftoken(t, e, r) {
                        return this._pack(t, "addconftoken", {
                            token_contract: e,
                            token_symbol: r
                        })
                    }
                    async addnotifyacc(t, e, r) {
                        return this._pack(t, "addnotifyacc", {
                            collection_name: e,
                            account_to_add: r
                        })
                    }
                    async announcedepo(t, e, r) {
                        return this._pack(t, "announcedepo", {
                            owner: e,
                            symbol_to_announce: r
                        })
                    }
                    async backasset(t, e, r, n, i) {
                        return this._pack(t, "backasset", {
                            payer: e,
                            asset_owner: r,
                            asset_id: n,
                            token_to_back: i
                        })
                    }
                    async burnasset(t, e, r) {
                        return this._pack(t, "burnasset", {
                            asset_owner: e,
                            asset_id: r
                        })
                    }
                    async canceloffer(t, e) {
                        return this._pack(t, "canceloffer", {
                            offer_id: e
                        })
                    }
                    async createcol(t, e, r, n, i, o, s, a) {
                        return this._pack(t, "createcol", {
                            author: e,
                            collection_name: r,
                            allow_notify: n,
                            authorized_accounts: i,
                            notify_accounts: o,
                            market_fee: s,
                            data: a
                        })
                    }
                    async createoffer(t, e, r, n, i, o) {
                        return this._pack(t, "createoffer", {
                            sender: e,
                            recipient: r,
                            sender_asset_ids: n,
                            recipient_asset_ids: i,
                            memo: o
                        })
                    }
                    async createtempl(t, e, r, n, i, o, s, a) {
                        return this._pack(t, "createtempl", {
                            authorized_creator: e,
                            collection_name: r,
                            schema_name: n,
                            transferable: i,
                            burnable: o,
                            max_supply: s,
                            immutable_data: a
                        })
                    }
                    async createschema(t, e, r, n, i) {
                        return this._pack(t, "createschema", {
                            authorized_creator: e,
                            collection_name: r,
                            schema_name: n,
                            schema_format: i
                        })
                    }
                    async declineoffer(t, e) {
                        return this._pack(t, "declineoffer", {
                            offer_id: e
                        })
                    }
                    async extendschema(t, e, r, n, i) {
                        return this._pack(t, "extendschema", {
                            authorized_editor: e,
                            collection_name: r,
                            schema_name: n,
                            schema_format_extension: i
                        })
                    }
                    async forbidnotify(t, e) {
                        return this._pack(t, "forbidnotify", {
                            collection_name: e
                        })
                    }
                    async locktemplate(t, e, r, n) {
                        return this._pack(t, "locktemplate", {
                            authorized_editor: e,
                            collection_name: r,
                            template_id: n
                        })
                    }
                    async mintasset(t, e, r, n, i, o, s, a, c) {
                        return this._pack(t, "mintasset", {
                            authorized_minter: e,
                            collection_name: r,
                            schema_name: n,
                            template_id: i,
                            new_asset_owner: o,
                            immutable_data: s,
                            mutable_data: a,
                            tokens_to_back: c
                        })
                    }
                    async payofferram(t, e, r) {
                        return this._pack(t, "payofferram", {
                            payer: e,
                            offer_id: r
                        })
                    }
                    async remcolauth(t, e, r) {
                        return this._pack(t, "remcolauth", {
                            collection_name: e,
                            account_to_remove: r
                        })
                    }
                    async remnotifyacc(t, e, r) {
                        return this._pack(t, "remnotifyacc", {
                            collection_name: e,
                            account_to_remove: r
                        })
                    }
                    async setassetdata(t, e, r, n, i) {
                        return this._pack(t, "setassetdata", {
                            authorized_editor: e,
                            asset_owner: r,
                            asset_id: n,
                            new_mutable_data: i
                        })
                    }
                    async setcoldata(t, e, r) {
                        return this._pack(t, "setcoldata", {
                            collection_name: e,
                            data: r
                        })
                    }
                    async setmarketfee(t, e, r) {
                        return this._pack(t, "setmarketfee", {
                            collection_name: e,
                            market_fee: r
                        })
                    }
                    async transfer(t, e, r, n, i) {
                        return this._pack(t, "transfer", {
                            from: e,
                            to: r,
                            asset_ids: n,
                            memo: i
                        })
                    }
                    async withdraw(t, e, r) {
                        return this._pack(t, "withdraw", {
                            owner: e,
                            token_to_withdraw: r
                        })
                    }
                    _pack(t, e, r) {
                        return [{
                            account: this.contract,
                            name: e,
                            authorization: t,
                            data: r
                        }]
                    }
                }, e.toAttributeMap = function(t, e) {
                    const r = {},
                        n = [];
                    for (const t of e) r[t.name] = t.type;
                    const o = Object.keys(t);
                    for (const e of o) {
                        if (void 0 !== r[e]) throw new i.default("field not defined in schema");
                        n.push({
                            key: e,
                            value: [r[e], t[e]]
                        })
                    }
                    return n
                }
            },
            7009: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const n = r(429);
                class i extends n.ActionGenerator {
                    constructor(t) {
                        super(t.contract), this.api = t
                    }
                    async createcol(t, e, r, i, o, s, a, c) {
                        const u = await this.api.config();
                        return super.createcol(t, e, r, i, o, s, a, n.toAttributeMap(c, u.collection_format))
                    }
                    async createtempl(t, e, r, i, o, s, a, c) {
                        const u = await this.api.getSchema(r, i),
                            h = n.toAttributeMap(c, await u.rawFormat());
                        return super.createtempl(t, e, r, i, o, s, a, h)
                    }
                    async mintasset(t, e, r, i, o, s, a, c, u) {
                        const h = await this.api.getTemplate(r, o),
                            f = n.toAttributeMap(a, await (await h.schema()).rawFormat()),
                            l = n.toAttributeMap(c, await (await h.schema()).rawFormat());
                        return super.mintasset(t, e, r, i, o, s, f, l, u)
                    }
                    async setassetdata(t, e, r, i, o) {
                        const s = await this.api.getAsset(r, i),
                            a = await s.schema(),
                            c = n.toAttributeMap(o, await a.rawFormat());
                        return super.setassetdata(t, e, r, i, c)
                    }
                    async setcoldata(t, e, r) {
                        const i = n.toAttributeMap(r, (await this.api.config()).collection_format);
                        return super.setcoldata(t, e, i)
                    }
                }
                e.default = i
            },
            46: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                class r extends Error {
                    constructor(t, e) {
                        super(t), this.message = t, this.status = e, this.isApiError = !0
                    }
                }
                e.default = r
            },
            8379: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                class r extends Error {}
                e.default = r
            },
            9191: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                class r extends Error {
                    constructor(t) {
                        t.error && t.error.details && t.error.details.length && t.error.details[0].message ? super(t.error.details[0].message) : t.processed && t.processed.except && t.processed.except.message ? super(t.processed.except.message) : super(t.message), this.json = t
                    }
                }
                e.default = r
            },
            193: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                class r extends Error {}
                e.default = r
            },
            7308: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                class r extends Error {}
                e.default = r
            },
            6843: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(193)),
                    o = r(826);
                e.default = class {
                    constructor(t) {
                        this.attributes = t, this.reserved = 4
                    }
                    deserialize(t, e = !1) {
                        const r = {};
                        for (; t.position < t.data.length;) {
                            const n = o.varint_decode(t);
                            if (n.equals(0)) break;
                            const i = this.getAttribute(n.toJSNumber(), !e);
                            i && (r[i.name] = i.value.deserialize(t))
                        }
                        return r
                    }
                    serialize(t) {
                        const e = [];
                        for (let r = 0; r < this.attributes.length; r++) {
                            const n = this.attributes[r];
                            void 0 !== t[n.name] && (e.push(o.varint_encode(r + this.reserved)), e.push(n.value.serialize(t[n.name])))
                        }
                        return e.push(o.varint_encode(0)), o.concat_byte_arrays(e)
                    }
                    getAttribute(t, e = !0) {
                        const r = t - this.reserved;
                        if (!(r >= this.attributes.length)) return this.attributes[Number(r)];
                        if (e) throw new i.default("attribute does not exists")
                    }
                }
            },
            9749: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(193)),
                    o = r(8838);
                e.default = class {
                    constructor(t) {
                        if (void 0 === o.ParserTypes[t]) throw new i.default(`attribute type '${t}' not defined`);
                        this.parser = o.ParserTypes[t]
                    }
                    deserialize(t) {
                        return this.parser.deserialize(t)
                    }
                    serialize(t) {
                        return this.parser.serialize(t)
                    }
                }
            },
            7643: (t, e, r) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const n = r(826);
                e.default = class {
                    constructor(t) {
                        this.element = t
                    }
                    deserialize(t) {
                        const e = n.varint_decode(t).toJSNumber(),
                            r = [];
                        for (let n = 0; n < e; n++) r.push(this.element.deserialize(t));
                        return r
                    }
                    serialize(t) {
                        const e = [n.varint_encode(t.length)];
                        for (const r of t) e.push(this.element.serialize(r));
                        return n.concat_byte_arrays(e)
                    }
                }
            },
            1939: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.ObjectSchema = void 0;
                const i = n(r(193)),
                    o = n(r(6843)),
                    s = n(r(9749)),
                    a = n(r(7643));

                function c(t, e) {
                    const r = [];
                    let n = e[t];
                    void 0 === n && (n = []), delete e[t];
                    for (const t of n) r.push({
                        name: t.name,
                        value: u(t.type, e)
                    });
                    return new o.default(r)
                }

                function u(t, e) {
                    if (t.endsWith("[]")) return new a.default(u(t.substring(0, t.length - 2), e));
                    if (t.startsWith("object{") && t.endsWith("}")) {
                        const r = parseInt(t.substring(7, t.length - 1), 10);
                        if (isNaN(r)) throw new i.default(`invalid type '${t}'`);
                        return c(r, e)
                    }
                    return new s.default(t)
                }
                e.ObjectSchema = function(t) {
                    const e = {};
                    for (const r of t) {
                        const t = void 0 === r.parent ? 0 : r.parent;
                        void 0 === e[t] && (e[t] = []), e[t].push(r)
                    }
                    return c(0, e)
                }
            },
            826: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.byte_vector_to_int = e.int_to_byte_vector = e.concat_byte_arrays = e.hex_encode = e.hex_decode = e.base58_encode = e.base58_decode = e.zigzag_decode = e.zigzag_encode = e.integer_unsign = e.integer_sign = e.varint_decode = e.varint_encode = void 0;
                const i = n(r(4736)),
                    o = n(r(8379)),
                    s = n(r(7308)),
                    a = n(r(9580));
                e.varint_encode = function(t) {
                    const e = [];
                    let r = i.default(t);
                    if (r.lesser(0)) throw new s.default("cant pack negative integer");
                    for (;;) {
                        const t = r.and(127);
                        if (r = r.shiftRight(7), r.equals(0)) {
                            e.push(t.toJSNumber());
                            break
                        }
                        e.push(t.toJSNumber() + 128)
                    }
                    return new Uint8Array(e)
                }, e.varint_decode = function(t) {
                    let e = i.default(0);
                    for (let r = 0;; r++) {
                        if (t.position >= t.data.length) throw new o.default("failed to unpack integer");
                        const n = i.default(t.data[t.position]);
                        if (t.position += 1, n.lesser(128)) {
                            e = e.plus(n.shiftLeft(7 * r));
                            break
                        }
                        e = e.plus(n.and(127).shiftLeft(7 * r))
                    }
                    return e
                }, e.integer_sign = function(t, e) {
                    const r = i.default(t);
                    if (r.greaterOrEquals(i.default(2).pow(8 * e - 1))) throw new Error("cannot sign integer: too big");
                    return r.greaterOrEquals(0) ? r : r.negate().xor(i.default(2).pow(8 * e).minus(1)).plus(1)
                }, e.integer_unsign = function(t, e) {
                    const r = i.default(t);
                    if (r.greater(i.default(2).pow(8 * e))) throw new Error("cannot unsign integer: too big");
                    return r.greater(i.default(2).pow(8 * e - 1)) ? r.minus(1).xor(i.default(2).pow(8 * e).minus(1)).negate() : r
                }, e.zigzag_encode = function(t) {
                    const e = i.default(t);
                    return e.lesser(0) ? e.plus(1).multiply(-2).plus(1) : e.multiply(2)
                }, e.zigzag_decode = function(t) {
                    const e = i.default(t);
                    return e.mod(2).equals(0) ? e.divmod(2).quotient : e.divmod(2).quotient.multiply(-1).minus(1)
                };
                const c = new a.default("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
                e.base58_decode = function(t) {
                    return c.decode(t)
                }, e.base58_encode = function(t) {
                    return c.encode(t)
                }, e.hex_decode = function(t) {
                    const e = t.match(/.{1,2}/g);
                    return e ? new Uint8Array(e.map((t => parseInt(t, 16)))) : new Uint8Array(0)
                }, e.hex_encode = function(t) {
                    return t.reduce(((t, e) => t + e.toString(16).padStart(2, "0")), "")
                }, e.concat_byte_arrays = function(t) {
                    const e = new Uint8Array(t.reduce(((t, e) => t + e.length), 0));
                    let r = 0;
                    for (const n of t) e.set(n, r), r += n.length;
                    return e
                }, e.int_to_byte_vector = function(t) {
                    const e = [];
                    let r = i.default(t);
                    for (; r.notEquals(0);) e.push(r.and(255).toJSNumber()), r = r.shiftRight(8);
                    return new Uint8Array(e)
                }, e.byte_vector_to_int = function(t) {
                    let e = i.default(0);
                    for (let r = 0; r < t.length; r++) e = e.plus(i.default(t[r]).shiftLeft(8 * r));
                    return e.toJSNumber()
                }
            },
            9580: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.default = class {
                    constructor(t) {
                        if (this.ALPHABET = t, t.length >= 255) throw new TypeError("Alphabet too long");
                        this.BASE_MAP = new Uint8Array(256);
                        for (let t = 0; t < this.BASE_MAP.length; t++) this.BASE_MAP[t] = 255;
                        for (let e = 0; e < t.length; e++) {
                            const r = t.charAt(e),
                                n = r.charCodeAt(0);
                            if (255 !== this.BASE_MAP[n]) throw new TypeError(r + " is ambiguous");
                            this.BASE_MAP[n] = e
                        }
                        this.BASE = t.length, this.LEADER = t.charAt(0), this.FACTOR = Math.log(this.BASE) / Math.log(256), this.iFACTOR = Math.log(256) / Math.log(this.BASE)
                    }
                    encode(t) {
                        if (0 === t.length) return "";
                        let e = 0,
                            r = 0,
                            n = 0;
                        const i = t.length;
                        for (; n !== i && 0 === t[n];) n++, e++;
                        const o = (i - n) * this.iFACTOR + 1 >>> 0,
                            s = new Uint8Array(o);
                        for (; n !== i;) {
                            let e = t[n],
                                i = 0;
                            for (let t = o - 1;
                                (0 !== e || i < r) && -1 !== t; t--, i++) e += 256 * s[t] >>> 0, s[t] = e % this.BASE >>> 0, e = e / this.BASE >>> 0;
                            if (0 !== e) throw new Error("Non-zero carry");
                            r = i, n++
                        }
                        let a = o - r;
                        for (; a !== o && 0 === s[a];) a++;
                        let c = this.LEADER.repeat(e);
                        for (; a < o; ++a) c += this.ALPHABET.charAt(s[a]);
                        return c
                    }
                    decode(t) {
                        const e = this.decodeUnsafe(t);
                        if (e) return e;
                        throw new Error("Non-base" + this.BASE + " character")
                    }
                    decodeUnsafe(t) {
                        if (0 === t.length) return new Uint8Array(0);
                        let e = 0;
                        if (" " === t[e]) return new Uint8Array(0);
                        let r = 0,
                            n = 0;
                        for (; t[e] === this.LEADER;) r++, e++;
                        const i = (t.length - e) * this.FACTOR + 1 >>> 0,
                            o = new Uint8Array(i);
                        for (; t[e];) {
                            let r = this.BASE_MAP[t.charCodeAt(e)];
                            if (255 === r) return new Uint8Array(0);
                            let s = 0;
                            for (let t = i - 1;
                                (0 !== r || s < n) && -1 !== t; t--, s++) r += this.BASE * o[t] >>> 0, o[t] = r % 256 >>> 0, r = r / 256 >>> 0;
                            if (0 !== r) throw new Error("Non-zero carry");
                            n = s, e++
                        }
                        if (" " === t[e]) return new Uint8Array(0);
                        let s = i - n;
                        for (; s !== i && 0 === o[s];) s++;
                        const a = new Uint8Array(r + (i - s));
                        a.fill(0, 0, r);
                        let c = r;
                        for (; s !== i;) a[c++] = o[s++];
                        return a
                    }
                }
            },
            6016: (t, e) => {
                "use strict";
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.prepare = void 0;
                class r {
                    constructor(t, e = 0) {
                        this.data = t, this.position = e
                    }
                }
                e.default = r, e.prepare = function(t) {
                    return new r(t, 0)
                }
            },
            3202: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(4613));
                class o extends i.default {
                    constructor() {
                        super(1)
                    }
                    deserialize(t) {
                        return 1 === super.deserialize(t)[0] ? 1 : 0
                    }
                    serialize(t) {
                        return super.serialize(new Uint8Array([t ? 1 : 0]))
                    }
                }
                e.default = o
            },
            2052: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.ByteParser = void 0;
                const i = n(r(413));
                class o extends i.default {
                    deserialize(t) {
                        return super.deserialize(t)
                    }
                    serialize(t) {
                        return super.serialize(t)
                    }
                }
                e.ByteParser = o
            },
            9330: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(4736)),
                    o = n(r(4613));
                class s extends o.default {
                    deserialize(t) {
                        const e = super.deserialize(t).reverse();
                        let r = i.default(0);
                        for (const t of e) r = r.shiftLeft(8), r = r.plus(t);
                        return this.size <= 6 ? r.toJSNumber() : r.toString()
                    }
                    serialize(t) {
                        let e = i.default(t);
                        const r = [];
                        for (let t = 0; t < this.size; t++) r.push(e.and(255).toJSNumber()), e = e.shiftRight(8);
                        return super.serialize(new Uint8Array(r))
                    }
                }
                e.default = s
            },
            4613: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(8379)),
                    o = n(r(7308));
                e.default = class {
                    constructor(t) {
                        this.size = t
                    }
                    deserialize(t) {
                        t.position += this.size;
                        const e = t.data.slice(t.position - this.size, t.position);
                        if (e.length !== this.size) throw new i.default("FixedParser: read past end");
                        return e
                    }
                    serialize(t) {
                        if (t.length !== this.size) throw new o.default("input data does not conform fixed size");
                        return t
                    }
                }
            },
            4618: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(4613)),
                    o = r(5453);
                class s extends i.default {
                    constructor(t) {
                        super(t ? 8 : 4), this.isDouble = t
                    }
                    deserialize(t) {
                        return this.isDouble ? o.readDoubleLE(super.deserialize(t)) : o.readFloatLE(super.deserialize(t))
                    }
                    serialize(t) {
                        let e = [];
                        return this.isDouble ? (o.writeDoubleLE(e, t), super.serialize(new Uint8Array(e))) : (o.writeFloatLE(e, t), super.serialize(new Uint8Array(e)))
                    }
                }
                e.default = s
            },
            495: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = r(826),
                    o = n(r(413));
                class s extends o.default {
                    deserialize(t) {
                        return i.base58_encode(super.deserialize(t))
                    }
                    serialize(t) {
                        return super.serialize(i.base58_decode(t))
                    }
                }
                e.default = s
            },
            6947: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(413));
                class o extends i.default {
                    deserialize(t) {
                        return (new TextDecoder).decode(super.deserialize(t))
                    }
                    serialize(t) {
                        return super.serialize((new TextEncoder).encode(t))
                    }
                }
                e.default = o
            },
            3530: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(4736)),
                    o = n(r(8379)),
                    s = n(r(7308)),
                    a = r(826);
                e.default = class {
                    constructor(t, e) {
                        this.size = t, this.unsigned = e
                    }
                    deserialize(t) {
                        let e = a.varint_decode(t);
                        if (this.unsigned || (e = a.zigzag_decode(e)), e.greaterOrEquals(i.default(2).pow(8 * this.size - (this.unsigned ? 0 : 1)))) throw new o.default("number '" + e.toString() + "' too large for given type");
                        return this.size <= 6 ? e.toJSNumber() : e.toString()
                    }
                    serialize(t) {
                        let e = i.default(t);
                        if (e.greaterOrEquals(i.default(2).pow(8 * this.size - (this.unsigned ? 0 : 1)))) throw new s.default("number '" + e.toString() + "' too large for given type");
                        return this.unsigned || (e = a.zigzag_encode(e)), a.varint_encode(e)
                    }
                }
            },
            413: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                });
                const i = n(r(8379)),
                    o = r(826);
                e.default = class {
                    deserialize(t) {
                        const e = o.varint_decode(t).toJSNumber();
                        t.position += e;
                        const r = t.data.slice(t.position - e, t.position);
                        if (r.length !== e) throw new i.default("VariableParser: read past end");
                        return r
                    }
                    serialize(t) {
                        return o.concat_byte_arrays([o.varint_encode(t.length), t])
                    }
                }
            },
            5713: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.ParserTypes = void 0;
                const i = n(r(3202)),
                    o = r(2052),
                    s = n(r(9330)),
                    a = n(r(4618)),
                    c = n(r(495)),
                    u = n(r(6947)),
                    h = n(r(3530));
                e.ParserTypes = {
                    int8: new h.default(1, !1),
                    int16: new h.default(2, !1),
                    int32: new h.default(4, !1),
                    int64: new h.default(8, !1),
                    uint8: new h.default(1, !0),
                    uint16: new h.default(2, !0),
                    uint32: new h.default(4, !0),
                    uint64: new h.default(8, !0),
                    fixed8: new s.default(1),
                    fixed16: new s.default(2),
                    fixed32: new s.default(4),
                    fixed64: new s.default(8),
                    bool: new i.default,
                    bytes: new o.ByteParser,
                    string: new u.default,
                    image: new u.default,
                    ipfs: new c.default,
                    float: new a.default(!1),
                    double: new a.default(!0)
                }
            },
            6047: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.deserialize = e.serialize = void 0;
                const i = n(r(6843)),
                    o = r(826),
                    s = n(r(6016));
                e.serialize = function(t, e) {
                    const r = e.serialize(t);
                    return e instanceof i.default ? r.slice(0, r.length - 1) : r
                }, e.deserialize = function(t, e) {
                    e instanceof i.default && (t = o.concat_byte_arrays([t, o.varint_encode(0)]));
                    const r = new s.default(t, 0);
                    return e.deserialize(r)
                }
            },
            8838: function(t, e, r) {
                "use strict";
                var n = this && this.__importDefault || function(t) {
                    return t && t.__esModule ? t : {
                        default: t
                    }
                };
                Object.defineProperty(e, "__esModule", {
                    value: !0
                }), e.ActionGenerator = e.ExplorerActionGenerator = e.RpcActionGenerator = e.ParserTypes = e.serialize = e.deserialize = e.ObjectSchema = e.ExplorerApi = e.RpcApi = void 0;
                const i = n(r(8299));
                e.ExplorerActionGenerator = i.default;
                const o = r(429);
                Object.defineProperty(e, "ActionGenerator", {
                    enumerable: !0,
                    get: function() {
                        return o.ActionGenerator
                    }
                });
                const s = n(r(7009));
                e.RpcActionGenerator = s.default;
                const a = n(r(5516));
                e.ExplorerApi = a.default;
                const c = n(r(1770));
                e.RpcApi = c.default;
                const u = r(1939);
                Object.defineProperty(e, "ObjectSchema", {
                    enumerable: !0,
                    get: function() {
                        return u.ObjectSchema
                    }
                });
                const h = r(6047);
                Object.defineProperty(e, "deserialize", {
                    enumerable: !0,
                    get: function() {
                        return h.deserialize
                    }
                }), Object.defineProperty(e, "serialize", {
                    enumerable: !0,
                    get: function() {
                        return h.serialize
                    }
                });
                const f = r(5713);
                Object.defineProperty(e, "ParserTypes", {
                    enumerable: !0,
                    get: function() {
                        return f.ParserTypes
                    }
                })
            },
            5453: function(t) {
                "use strict";
                var e, r, n, i, o, s, a, c, u, h, f, l, p = !1;

                function d(t, e, r) {
                    var n = t[e++],
                        i = t[e++],
                        o = t[e++],
                        s = t[e];
                    return "bige" === r ? 256 * (256 * (256 * n + i) + o) + s : 256 * (256 * (256 * s + o) + i) + n
                }

                function y(t, e, r, n) {
                    var i = e >>> 24 & 255,
                        o = e >> 16 & 255,
                        s = e >> 8 & 255,
                        a = 255 & e;
                    "bige" === n ? (t[r++] = i, t[r++] = o, t[r++] = s, t[r] = a) : (t[r++] = a, t[r++] = s, t[r++] = o, t[r] = i)
                }

                function g(t, e, r, n, i) {
                    "bige" === i ? (y(t, e, n, i), y(t, r, n + 4, i)) : (y(t, r, n, i), y(t, e, n + 4, i))
                }
                "function" == typeof Float32Array && (u = new Float32Array(1), h = new Uint8Array(u.buffer), u[0] = -1, p = 0 === h[3], e = function(t, e) {
                    return (e = e || 0) < 0 || e + 4 > t.length ? 0 : (h[0] = t[e++], h[1] = t[e++], h[2] = t[e++], h[3] = t[e], u[0])
                }, n = function(t, e) {
                    return (e = e || 0) < 0 || e + 4 > t.length ? 0 : (h[3] = t[e++], h[2] = t[e++], h[1] = t[e++], h[0] = t[e], u[0])
                }, r = function(t, e, r) {
                    r = r || 0, u[0] = e, t[r++] = h[0], t[r++] = h[1], t[r++] = h[2], t[r] = h[3]
                }, i = function(t, e, r) {
                    r = r || 0, u[0] = e, t[r++] = h[3], t[r++] = h[2], t[r++] = h[1], t[r] = h[0]
                }), "function" == typeof Float64Array && (f = new Float64Array(1), l = new Uint8Array(f.buffer), o = function(t, e) {
                    return (e = e || 0) < 0 || e + 8 > t.length ? 0 : (l[0] = t[e + 0], l[1] = t[e + 1], l[2] = t[e + 2], l[3] = t[e + 3], l[4] = t[e + 4], l[5] = t[e + 5], l[6] = t[e + 6], l[7] = t[e + 7], f[0])
                }, a = function(t, e) {
                    return (e = e || 0) < 0 || e + 8 > t.length ? 0 : (l[7] = t[e + 0], l[6] = t[e + 1], l[5] = t[e + 2], l[4] = t[e + 3], l[3] = t[e + 4], l[2] = t[e + 5], l[1] = t[e + 6], l[0] = t[e + 7], f[0])
                }, s = function(t, e, r) {
                    r = r || 0, f[0] = e, t[r + 0] = l[0], t[r + 1] = l[1], t[r + 2] = l[2], t[r + 3] = l[3], t[r + 4] = l[4], t[r + 5] = l[5], t[r + 6] = l[6], t[r + 7] = l[7]
                }, c = function(t, e, r) {
                    r = r || 0, f[0] = e, t[r + 0] = l[7], t[r + 1] = l[6], t[r + 2] = l[5], t[r + 3] = l[4], t[r + 4] = l[3], t[r + 5] = l[2], t[r + 6] = l[1], t[r + 7] = l[0]
                });
                for (var m = new Array, v = 0; v < 1200; v++) m[v] = Math.pow(2, v);
                var w = new Array;
                for (v = 0; v < 1200; v++) w[v] = Math.pow(2, -v);

                function b(t) {
                    return t >= 0 ? m[t] : w[-t]
                }

                function _(t, e, r) {
                    var n, i, o = d(t, e, r),
                        s = d(t, e + 4, r);
                    "bige" === r ? (n = o, i = s) : (n = s, i = o);
                    var a = 4294967296 * (1048575 & n) + i,
                        c = (2146435072 & n) >>> 20;
                    return (n >> 31 || 1) * (0 === c ? a ? a * b(-1074) : 0 : c < 2047 ? a >= 0 ? (1 + 2220446049250313e-31 * a) * b(c - 1023) : 0 : a ? NaN : 1 / 0)
                }
                b(-1023);
                var A = Math.pow(2, -23),
                    E = Math.pow(2, -127);

                function x(t, e, r) {
                    var n = d(t, e, r),
                        i = 8388607 & n,
                        o = (2139095040 & n) >>> 23;
                    return (n >> 31 || 1) * (0 === o ? i ? i * A * 2 * E : 0 : o < 255 ? (1 + i * A) * b(o - 127) : i ? NaN : 1 / 0)
                }
                var k = {
                    exp: 0,
                    mant: 0
                };

                function S(t) {
                    var e = 0;
                    return t >= 2 ? (t *= b(-(e = O(1, t)))) >= 2 && (t /= 2, e += 1) : t < 1 && ((e = O(t, 2)) <= 1023 ? t *= b(e) : (t *= b(e - 100), t *= b(100)), e = -e), k.exp = e, k.mant = t, k
                }
                var B = Math.pow(2, 192);

                function O(t, e) {
                    for (var r = 0; t * B < e;) t *= B, r += 192;
                    for (; 0x10000000000000000 * t < e;) t *= 0x10000000000000000, r += 64;
                    for (; 65536 * t < e;) t *= 65536, r += 16;
                    for (; 64 * t < e;) t *= 64, r += 6;
                    for (; 2 * t < e;) t *= 2, r += 1;
                    return r
                }

                function C(t, e) {
                    return (t *= e) - Math.floor(t) != .5 || 1 & t ? t + .5 : t
                }

                function T(t, e, r, n) {
                    var i, o = 0;
                    e < 0 && (o = 2147483648, e = -e), e && e < 1 / 0 ? ((i = S(e)).exp += 127, i.exp <= 0 ? i.exp <= -25 ? (i.mant = 0, i.exp = 0) : (i.mant = C(i.mant, b(22 + i.exp)), i.exp = 0, i.mant >= 8388608 && (i.mant -= 8388608, i.exp += 1)) : (i.mant = C(i.mant - 1, 8388608), i.mant >= 8388608 && (i.mant -= 8388608, i.exp += 1), i.exp > 254 && (i.mant = 0, i.exp = 255)), y(t, o | i.exp << 23 | i.mant, r, n)) : y(t, 0 === e ? 1 / e < 0 ? 2147483648 : 0 : e === 1 / 0 ? 2139095040 | o : 2143289344, r, n)
                }
                new Uint8Array(8);
                var P = Math.pow(2, 52);

                function z(t, e, r, n) {
                    var i, o, s, a = 0;
                    e < 0 && (a = 2147483648, e = -e), e && e < 1 / 0 ? ((i = S(e)).exp += 1023, i.exp <= 0 ? (i.mant *= b(51 + i.exp), i.exp = 0) : i.mant = (i.mant - 1) * P, g(t, o = a | i.exp << 20 | i.mant / 4294967296, s = i.mant >>> 0, r, n)) : (0 === e ? (o = 1 / e < 0 ? 2147483648 : 0, s = 0) : e === 1 / 0 ? (o = a + 2146435072, s = 0) : (o = 2146959360, s = 0), g(t, o, s, r, n))
                }(function u() {
                    var h = t.exports || this;
                    h.readWord = d, h.writeWord = y, h.writeDoubleWord = g, h.readFloat = x, h.writeFloat = T, h.readDouble = _, h.writeDouble = z, h._useFloatArray = function(t) {
                        h._usingFloatArray = t, t ? ("full" == t && (h.readFloatLE = p ? n : e), h.writeFloatLE = p ? i : r, "full" == t && (h.readFloatBE = p ? e : n), h.writeFloatBE = p ? r : i, h.readDoubleLE = p ? a : o, h.writeDoubleLE = p ? c : s, h.readDoubleBE = p ? o : a, h.writeDoubleBE = p ? s : c) : (h._usingFloatArray = "", h.readFloatLE = function(t, e) {
                            return h.readFloat(t, e || 0, "le")
                        }, h.writeFloatLE = function(t, e, r) {
                            h.writeFloat(t, e, r || 0, "le")
                        }, h.readFloatBE = function(t, e) {
                            return h.readFloat(t, e || 0, "bige")
                        }, h.writeFloatBE = function(t, e, r) {
                            h.writeFloat(t, e, r || 0, "bige")
                        }, h.readDoubleLE = function(t, e) {
                            return h.readDouble(t, e || 0, "le")
                        }, h.writeDoubleLE = function(t, e, r) {
                            h.writeDouble(t, e, r || 0, "le")
                        }, h.readDoubleBE = function(t, e) {
                            return h.readDouble(t, e || 0, "bige")
                        }, h.writeDoubleBE = function(t, e, r) {
                            h.writeDouble(t, e, r || 0, "bige")
                        })
                    }, h._getBigeCpu = function() {
                        return p
                    }, h._setBigeCpu = function(t) {
                        p = t
                    }, h._useFloatArray(!1), h._useFloatArray(e && o && "fastest"), u.prototype = h
                }).call(this)
            },
            7248: (t, e, r) => {
                function n(t, e) {
                    var r = Object.keys(t);
                    if (Object.getOwnPropertySymbols) {
                        var n = Object.getOwnPropertySymbols(t);
                        e && (n = n.filter((function(e) {
                            return Object.getOwnPropertyDescriptor(t, e).enumerable
                        }))), r.push.apply(r, n)
                    }
                    return r
                }

                function i(t) {
                    for (var e = 1; e < arguments.length; e++) {
                        var r = null != arguments[e] ? arguments[e] : {};
                        e % 2 ? n(Object(r), !0).forEach((function(e) {
                            o(t, e, r[e])
                        })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r)) : n(Object(r)).forEach((function(e) {
                            Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(r, e))
                        }))
                    }
                    return t
                }

                function o(t, e, r) {
                    return e in t ? Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }) : t[e] = r, t
                }

                function s(t, e, r, n, i, o, s) {
                    try {
                        var a = t[o](s),
                            c = a.value
                    } catch (t) {
                        return void r(t)
                    }
                    a.done ? e(c) : Promise.resolve(c).then(n, i)
                }

                function a(t) {
                    return function() {
                        var e = this,
                            r = arguments;
                        return new Promise((function(n, i) {
                            var o = t.apply(e, r);

                            function a(t) {
                                s(o, n, i, a, c, "next", t)
                            }

                            function c(t) {
                                s(o, n, i, a, c, "throw", t)
                            }
                            a(void 0)
                        }))
                    }
                }
                var c = r(7187),
                    {
                        ExplorerApi: u
                    } = r(8838),
                    h = r(4098),
                    f = r(1554).default,
                    {
                        poll: l
                    } = r(2580),
                    p = new u("https://wax.api.atomicassets.io", "atomicassets", {
                        fetch: h,
                        rateLimit: 4
                    });
                class d {
                    constructor(t, e, r) {
                        if (!t) throw new Error("Contract publisher account is required");
                        if (this.account = t, !e) throw new Error("Action name is required");
                        this.name = e, this.data = r || {}
                    }
                }
                class y {
                    constructor(t, e) {
                        var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : "active";
                        this.api = t, this.actor = e, this.permission = r
                    }
                    transact() {
                        for (var t = arguments.length, e = new Array(t), r = 0; r < t; r++) e[r] = arguments[r];
                        if (!e || !e.length) throw new Error("At least one action is required");
                        return e = e.map(this.addAuthorization, this), this.api.transact({
                            actions: e
                        }, {
                            blocksBehind: 3,
                            expireSeconds: 90
                        })
                    }
                    waitForTransaction(t, e) {
                        var r = this;
                        return a((function*() {
                            return l((() => r.getTransaction(t, e)))
                        }))()
                    }
                    getTransaction(t, e) {
                        var r = this;
                        return a((function*() {
                            var n = yield r.api.rpc.history_get_transaction(t);
                            if (n.error) throw r.toError(n);
                            if (e && !e(n)) throw new Error("Try again later");
                            return n
                        }))()
                    }
                    toError(t) {
                        if (!t.error) throw new Error("Unknown Error");
                        var e = new Error(t.message.what);
                        throw e.name = t.error.name, e
                    }
                    transfer(t, e, r) {
                        return this.transact(new d("eosio.token", "transfer", {
                            from: this.actor,
                            memo: r || "",
                            quantity: "".concat(e.toFixed(8), " WAX"),
                            to: t
                        }))
                    }
                    getRow(t, e, r) {
                        var n = this;
                        return a((function*() {
                            var i = yield n.api.rpc.get_table_rows({
                                code: t,
                                scope: t,
                                table: e,
                                lower_bound: r,
                                upper_bound: r
                            });
                            return i.rows.length ? i.rows[0] : null
                        }))()
                    }
                    addAuthorization(t) {
                        return i(i({}, t), {}, {
                            authorization: [{
                                actor: this.actor,
                                permission: this.permission
                            }]
                        })
                    }
                }
                var g = "0000000000000000000000000000000000000000000000000000000000000000";
                class m extends y {
                    constructor(t, e) {
                        var {
                            account: r = "federation",
                            permission: n = "active"
                        } = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
                        super(t, e, n), this.account = r
                    }
                    getUserTerms() {
                        return this.getRow(this.account, "userterms", this.actor)
                    }
                    getBalance() {
                        var {
                            code: t = "alien.worlds",
                            symbol: e = "TLM"
                        } = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                        return this.api.rpc.get_currency_balance(t, this.actor, e)
                    }
                }
                class v extends y {
                    constructor(t, e) {
                        var {
                            account: r = "m.federation",
                            permission: n = "active"
                        } = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
                        super(t, e, n), this.account = r
                    }
                    getMiner() {
                        var t = this;
                        return a((function*() {
                            var e = yield t.getRow(t.account, "miners", t.actor);
                            return e ? {
                                lastMineTransaction: e.last_mine_tx || g,
                                landId: e.current_land,
                                lastMineTime: e.last_mine ? Date.parse(e.last_mine + ".000Z") : 0
                            } : {
                                lastMineTransaction: g
                            }
                        }))()
                    }
                    getBag() {
                        var t = this;
                        return a((function*() {
                            var e = yield t.getRow(t.account, "bags", t.actor);
                            return e ? Promise.all(e.items.map((t => p.getAsset(t)))) : []
                        }))()
                    }
                    setBag(t) {
                        var e = {
                            account: this.actor,
                            items: t.slice(0, 3)
                        };
                        return this.transact(new d(this.account, "setbag", e))
                    }
                    getLand(t) {
                        return p.getAsset(t)
                    }
                    setLand(t) {
                        var e = {
                            account: this.actor,
                            land_id: t
                        };
                        return this.transact(new d(this.account, "setland", e))
                    }
                    claim(t) {
                        var e = {
                            miner: this.actor,
                            nonce: t
                        };
                        return this.transact(new d(this.account, "mine", e))
                    }
                }
                t.exports = {
                    MiningApi: v,
                    AlienApi: class extends c {
                        constructor(t, e) {
                            super(), this.api = t, this.actor = e
                        }
                        get FederationApi() {
                            return this.federationApi || (this.federationApi = new m(this.api, this.actor))
                        }
                        get MiningApi() {
                            return this.miningApi || (this.miningApi = new v(this.api, this.actor))
                        }
                        connect() {
                            var t = this;
                            this.disconnect();
                            var e = "https://wax.eosrio.io";
                            return this.client = new f(e, {
                                async: !0,
                                fetch: h
                            }), new Promise(((r, n) => {
                                this.client.onConnect = a((function*() {
                                    var e = {
                                            contract: "alien.worlds",
                                            action: "transfer",
                                            account: "",
                                            filters: [{
                                                field: "@transfer.from",
                                                value: "m.federation"
                                            }, {
                                                field: "@transfer.to",
                                                value: t.actor
                                            }]
                                        },
                                        r = {
                                            contract: "m.federation",
                                            action: "mine",
                                            account: t.actor,
                                            read_until: 0,
                                            filters: []
                                        },
                                        n = {
                                            contract: "atomicassets",
                                            action: "logmint",
                                            account: "m.federation",
                                            filters: [{
                                                field: "act.data.authorized_minter",
                                                value: "m.federation"
                                            }, {
                                                field: "act.data.new_asset_owner",
                                                value: t.actor
                                            }]
                                        };
                                    console.log("Streaming ".concat(JSON.stringify(r))), yield t.client.streamActions(r), console.log("Streaming ".concat(JSON.stringify(e))), yield t.client.streamActions(e), console.log("Streaming ".concat(JSON.stringify(n))), yield t.client.streamActions(n)
                                })), this.client.onData = function() {
                                    var e = a((function*(e, r) {
                                        if ("logmint" === e.content.act.name) {
                                            var {
                                                asset_id: n,
                                                authorized_minter: i,
                                                schema_name: o,
                                                template_id: s,
                                                new_asset_owner: a,
                                                immutable_template_data: c
                                            } = e.content.act.data, {
                                                name: u,
                                                description: h,
                                                img: f
                                            } = function(t) {
                                                return t.reduce(((t, e) => (t[e.key] = e.value[1], t)), {})
                                            }(c);
                                            console.log("".concat(a, " got ").concat(n, " (a ").concat(o, " ").concat(u, " : https://cloudflare-ipfs.com/ipfs/").concat(f, ")")), t.emit("nft", {
                                                id: n,
                                                name: u,
                                                description: h,
                                                url: "https://cloudflare-ipfs.com/ipfs/".concat(f)
                                            })
                                        }
                                        if ("mine" === e.content.act.name) {
                                            var {
                                                miner: l,
                                                nonce: p
                                            } = e.content.act.data, d = e.content.trx_id;
                                            console.log("".concat(l, " mined ").concat(p, " in transaction ").concat(d)), t.emit("mine", {
                                                nonce: p,
                                                txId: d
                                            })
                                        }
                                        if ("transfer" === e.content.act.name) {
                                            var {
                                                quantity: y,
                                                to: g,
                                                from: m,
                                                memo: v
                                            } = e.content.act.data;
                                            console.log("".concat(g, " got ").concat(y, " from ").concat(m)), t.emit("transfer", {
                                                from: m,
                                                quantity: y
                                            })
                                        }
                                        r()
                                    }));
                                    return function(t, r) {
                                        return e.apply(this, arguments)
                                    }
                                }(), this.client.connect((() => {
                                    console.log("connected to ".concat(e)), r()
                                }))
                            }))
                        }
                        disconnect() {
                            this.client && (this.client.disconnect(), this.client = null)
                        }
                    }
                }
            },
            2580: t => {
                function e(t, e, r, n, i, o, s) {
                    try {
                        var a = t[o](s),
                            c = a.value
                    } catch (t) {
                        return void r(t)
                    }
                    a.done ? e(c) : Promise.resolve(c).then(n, i)
                }

                function r(t) {
                    return function() {
                        var r = this,
                            n = arguments;
                        return new Promise((function(i, o) {
                            var s = t.apply(r, n);

                            function a(t) {
                                e(s, i, o, a, c, "next", t)
                            }

                            function c(t) {
                                e(s, i, o, a, c, "throw", t)
                            }
                            a(void 0)
                        }))
                    }
                }

                function n(t) {
                    return new Promise((e => setTimeout(e, t)))
                }

                function i() {
                    return (i = r((function*(t) {
                        for (var {
                                k: e = 1e3,
                                n: r = 5,
                                z: i = 1.5
                            } = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};;) try {
                            return yield t()
                        } catch (t) {
                            if (r-- <= 0) throw t;
                            yield n(e), e *= i
                        }
                    }))).apply(this, arguments)
                }
                t.exports = {
                    sleep: n,
                    poll: function(t) {
                        return i.apply(this, arguments)
                    }
                }
            },
            8852: (t, e, r) => {
                var {
                    deserializeEosName: n
                } = r(8893), i = r(1166).Int64LE;
                t.exports = {
                    getTraces: function(t) {
                        var {
                            receiver: e,
                            action: r
                        } = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
                        return t.traces.filter((t => !(e && t.receipt.receiver !== e || r && t.act.name !== r)))
                    },
                    idToName: function(t) {
                        return n(new i(t).toArray())
                    }
                }
            },
            5107: (t, e, r) => {
                function n(t, e) {
                    var r = Object.keys(t);
                    if (Object.getOwnPropertySymbols) {
                        var n = Object.getOwnPropertySymbols(t);
                        e && (n = n.filter((function(e) {
                            return Object.getOwnPropertyDescriptor(t, e).enumerable
                        }))), r.push.apply(r, n)
                    }
                    return r
                }

                function i(t) {
                    for (var e = 1; e < arguments.length; e++) {
                        var r = null != arguments[e] ? arguments[e] : {};
                        e % 2 ? n(Object(r), !0).forEach((function(e) {
                            o(t, e, r[e])
                        })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r)) : n(Object(r)).forEach((function(e) {
                            Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(r, e))
                        }))
                    }
                    return t
                }

                function o(t, e, r) {
                    return e in t ? Object.defineProperty(t, e, {
                        value: r,
                        enumerable: !0,
                        configurable: !0,
                        writable: !0
                    }) : t[e] = r, t
                }

                function s(t, e, r, n, i, o, s) {
                    try {
                        var a = t[o](s),
                            c = a.value
                    } catch (t) {
                        return void r(t)
                    }
                    a.done ? e(c) : Promise.resolve(c).then(n, i)
                }

                function a(t) {
                    return function() {
                        var e = this,
                            r = arguments;
                        return new Promise((function(n, i) {
                            var o = t.apply(e, r);

                            function a(t) {
                                s(o, n, i, a, c, "next", t)
                            }

                            function c(t) {
                                s(o, n, i, a, c, "throw", t)
                            }
                            a(void 0)
                        }))
                    }
                }
                var c = r(4098),
                    u = r(4763);

                function h(t, e) {
                    return f.apply(this, arguments)
                }

                function f() {
                    return (f = a((function*(t, e) {
                        return console.log("Delegating work to " + e), yield c(e, {
                            method: "POST",
                            body: JSON.stringify(t),
                            headers: {
                                "content-type": "application/json"
                            }
                        }).then((t => {
                            if (!t.ok) throw new Error("Work server returned HTTP ".concat(t.status));
                            return t.json()
                        }))
                    }))).apply(this, arguments)
                }

                function l() {
                    var t = 2;
                    return "undefined" != typeof navigator && (t = navigator.hardwareConcurrency || 2), t
                }

                function p(t) {
                    var {
                        workers: e,
                        limit: r = Number.MAX_SAFE_INTEGER
                    } = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
                    e || (e = l()), console.log("Working locally with ".concat(e, " threads"));
                    var n = [],
                        o = 1e5,
                        s = 0,
                        a = 0;

                    function c(e) {
                        e.postMessage({
                            target: "hash-solver",
                            payload: i(i({}, t), {}, {
                                seed: null,
                                length: o
                            })
                        })
                    }
                    return new Promise(((t, h) => {
                        for (var f = function(u) {
                                var f = u.data;
                                f.error && h(new Error(f.error)), a++, f.solution ? (s += f.iterations * e, n.forEach((t => t.terminate())), t(i(i({}, f), {}, {
                                    iterations: s
                                }))) : (s += o, a >= r ? (u.target.terminate(), (n = n.filter((t => t === u.target))).length || t({
                                    iterations: s
                                })) : c(u.target))
                            }, l = 0; l < e; l++) {
                            var p = new u("./worker.js");
                            p.onmessage = f, p.onerror = h, n.push(p), c(p)
                        }
                    }))
                }

                function d(t, e) {
                    var r = function(t) {
                            var e = t.reduce(((t, e) => (t.delay += e.data.delay, t.difficulty += e.data.difficulty, e.data.delay < t.lowestDelay && (t.lowestDelay = e.data.delay), t)), {
                                delay: 0,
                                difficulty: 0,
                                lowestDelay: Number.MAX_SAFE_INTEGER
                            });
                            return 2 === t.length ? e.delay -= Math.floor(e.lowestDelay / 2) : 3 === t.length && (e.delay -= e.lowestDelay), e
                        }(t),
                        n = function(t) {
                            return {
                                delay: t.data.delay,
                                difficulty: t.data.difficulty,
                                commission: t.data.commission
                            }
                        }(e);
                    return {
                        delay: r.delay * (n.delay / 10),
                        difficulty: r.difficulty + n.difficulty
                    }
                }

                function y() {
                    return (y = a((function*(t, e) {
                        var [r, n] = yield Promise.all([t.getMiner(), t.getBag()]), i = yield t.getLand(r.landId);
                        r.land = i, console.log("Location: ".concat(i.name, " (").concat(i.data.x, ", ").concat(i.data.y, "). Commission: ").concat(i.data.commission)), console.log("Bag:"), n.forEach((t => console.log(t.name)));
                        var o, s = d(n, i),
                            a = r.lastMineTime,
                            c = 1e3 * s.delay,
                            u = {
                                account: t.actor,
                                difficulty: s.difficulty,
                                transaction: r.lastMineTransaction
                            },
                            f = Date.now();
                        return o = null != e ? yield h(u, e): yield p(u), console.log("Work time: ".concat(Date.now() - f, "ms")), console.log("Work: ".concat(JSON.stringify(o, null, 2))), {
                            miner: r,
                            land: i,
                            work: o,
                            lastMineTime: a,
                            mineDelay: c
                        }
                    }))).apply(this, arguments)
                }
                t.exports = {
                    getConcurrency: l,
                    localWork: p,
                    calculateMineDelay: function(t, e) {
                        if (t) {
                            var r = t + e - Date.now();
                            return r <= 0 ? 0 : r
                        }
                        return 0
                    },
                    mine: function(t, e) {
                        return y.apply(this, arguments)
                    },
                    formatInterval: function(t) {
                        var e = String(Math.floor(t % 60)),
                            r = String(Math.floor(t / 60 % 60));
                        return String(Math.floor(t / 3600)).padStart(2, "0") + ":" + r.padStart(2, "0") + ":" + e.padStart(2, "0")
                    }
                }
            },
            8893: t => {
                var e = new RegExp(/^[.1-5a-z]{0,12}[.1-5a-j]?$/);

                function r(t) {
                    return e.test(t)
                }

                function n(t) {
                    return t >= "a".charCodeAt(0) && t <= "z".charCodeAt(0) ? t - "a".charCodeAt(0) + 6 : t >= "1".charCodeAt(0) && t <= "5".charCodeAt(0) ? t - "1".charCodeAt(0) + 1 : 0
                }
                var i = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
                t.exports = {
                    fromHex: function(t) {
                        for (var e = [], r = 0; r < t.length; r += 2) e.push(parseInt(t.substr(r, 2), 16));
                        return e
                    },
                    toHex: function(t) {
                        for (var e = "", r = 0; r < t.length; r++) {
                            var n = t[r];
                            e += i[n >>> 4 & 15], e += i[15 & n]
                        }
                        return e
                    },
                    randomBytes: function(t) {
                        for (var e = [], r = 0; r < t; r++) e.push(Math.floor(256 * Math.random()));
                        return e
                    },
                    isEosName: r,
                    serializeEosName: function(t) {
                        if ("string" != typeof t) throw new Error("Expected string containing EOS name");
                        if (!r(t)) throw new Error("Not an EOS name");
                        for (var e = new Uint8Array(8), i = 63, o = 0; o < t.length; ++o) {
                            var s = n(t.charCodeAt(o));
                            i < 5 && (s <<= 1);
                            for (var a = 4; a >= 0; --a) i >= 0 && (e[Math.floor(i / 8)] |= (s >> a & 1) << i % 8, --i)
                        }
                        return e
                    },
                    deserializeEosName: function(t) {
                        for (var e = "", r = 63; r >= 0;) {
                            for (var n = 0, i = 0; i < 5; ++i) r >= 0 && (n = n << 1 | t[Math.floor(r / 8)] >> r % 8 & 1, --r);
                            e += n >= 6 ? String.fromCharCode(n + "a".charCodeAt(0) - 6) : n >= 1 ? String.fromCharCode(n + "1".charCodeAt(0) - 1) : "."
                        }
                        for (; e.endsWith(".");) e = e.substr(0, e.length - 1);
                        return e
                    }
                }
            },
            3010: t => {
                function e(t) {
                    t = t || {}, this.ms = t.min || 100, this.max = t.max || 1e4, this.factor = t.factor || 2, this.jitter = t.jitter > 0 && t.jitter <= 1 ? t.jitter : 0, this.attempts = 0
                }
                t.exports = e, e.prototype.duration = function() {
                    var t = this.ms * Math.pow(this.factor, this.attempts++);
                    if (this.jitter) {
                        var e = Math.random(),
                            r = Math.floor(e * this.jitter * t);
                        t = 0 == (1 & Math.floor(10 * e)) ? t - r : t + r
                    }
                    return 0 | Math.min(t, this.max)
                }, e.prototype.reset = function() {
                    this.attempts = 0
                }, e.prototype.setMin = function(t) {
                    this.ms = t
                }, e.prototype.setMax = function(t) {
                    this.max = t
                }, e.prototype.setJitter = function(t) {
                    this.jitter = t
                }
            },
            3704: (t, e) => {
                ! function(t) {
                    "use strict";
                    e.encode = function(e) {
                        var r, n = new Uint8Array(e),
                            i = n.length,
                            o = "";
                        for (r = 0; r < i; r += 3) o += t[n[r] >> 2], o += t[(3 & n[r]) << 4 | n[r + 1] >> 4], o += t[(15 & n[r + 1]) << 2 | n[r + 2] >> 6], o += t[63 & n[r + 2]];
                        return i % 3 == 2 ? o = o.substring(0, o.length - 1) + "=" : i % 3 == 1 && (o = o.substring(0, o.length - 2) + "=="), o
                    }, e.decode = function(e) {
                        var r, n, i, o, s, a = .75 * e.length,
                            c = e.length,
                            u = 0;
                        "=" === e[e.length - 1] && (a--, "=" === e[e.length - 2] && a--);
                        var h = new ArrayBuffer(a),
                            f = new Uint8Array(h);
                        for (r = 0; r < c; r += 4) n = t.indexOf(e[r]), i = t.indexOf(e[r + 1]), o = t.indexOf(e[r + 2]), s = t.indexOf(e[r + 3]), f[u++] = n << 2 | i >> 4, f[u++] = (15 & i) << 4 | o >> 2, f[u++] = (3 & o) << 6 | 63 & s;
                        return h
                    }
                }("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")
            },
            9742: (t, e) => {
                "use strict";
                e.byteLength = function(t) {
                    var e = c(t),
                        r = e[0],
                        n = e[1];
                    return 3 * (r + n) / 4 - n
                }, e.toByteArray = function(t) {
                    var e, r, o = c(t),
                        s = o[0],
                        a = o[1],
                        u = new i(function(t, e, r) {
                            return 3 * (e + r) / 4 - r
                        }(0, s, a)),
                        h = 0,
                        f = a > 0 ? s - 4 : s;
                    for (r = 0; r < f; r += 4) e = n[t.charCodeAt(r)] << 18 | n[t.charCodeAt(r + 1)] << 12 | n[t.charCodeAt(r + 2)] << 6 | n[t.charCodeAt(r + 3)], u[h++] = e >> 16 & 255, u[h++] = e >> 8 & 255, u[h++] = 255 & e;
                    return 2 === a && (e = n[t.charCodeAt(r)] << 2 | n[t.charCodeAt(r + 1)] >> 4, u[h++] = 255 & e), 1 === a && (e = n[t.charCodeAt(r)] << 10 | n[t.charCodeAt(r + 1)] << 4 | n[t.charCodeAt(r + 2)] >> 2, u[h++] = e >> 8 & 255, u[h++] = 255 & e), u
                }, e.fromByteArray = function(t) {
                    for (var e, n = t.length, i = n % 3, o = [], s = 16383, a = 0, c = n - i; a < c; a += s) o.push(u(t, a, a + s > c ? c : a + s));
                    return 1 === i ? (e = t[n - 1], o.push(r[e >> 2] + r[e << 4 & 63] + "==")) : 2 === i && (e = (t[n - 2] << 8) + t[n - 1], o.push(r[e >> 10] + r[e >> 4 & 63] + r[e << 2 & 63] + "=")), o.join("")
                };
                for (var r = [], n = [], i = "undefined" != typeof Uint8Array ? Uint8Array : Array, o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", s = 0, a = o.length; s < a; ++s) r[s] = o[s], n[o.charCodeAt(s)] = s;

                function c(t) {
                    var e = t.length;
                    if (e % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
                    var r = t.indexOf("=");
                    return -1 === r && (r = e), [r, r === e ? 0 : 4 - r % 4]
                }

                function u(t, e, n) {
                    for (var i, o, s = [], a = e; a < n; a += 3) i = (t[a] << 16 & 16711680) + (t[a + 1] << 8 & 65280) + (255 & t[a + 2]), s.push(r[(o = i) >> 18 & 63] + r[o >> 12 & 63] + r[o >> 6 & 63] + r[63 & o]);
                    return s.join("")
                }
                n["-".charCodeAt(0)] = 62, n["_".charCodeAt(0)] = 63
            },
            4736: (t, e, r) => {
                var n;
                t = r.nmd(t);
                var i = function(t) {
                    "use strict";
                    var e = 1e7,
                        r = 9007199254740992,
                        n = l(r),
                        o = "0123456789abcdefghijklmnopqrstuvwxyz",
                        s = "function" == typeof BigInt;

                    function a(t, e, r, n) {
                        return void 0 === t ? a[0] : void 0 === e || 10 == +e && !r ? X(t) : J(t, e, r, n)
                    }

                    function c(t, e) {
                        this.value = t, this.sign = e, this.isSmall = !1
                    }

                    function u(t) {
                        this.value = t, this.sign = t < 0, this.isSmall = !0
                    }

                    function h(t) {
                        this.value = t
                    }

                    function f(t) {
                        return -r < t && t < r
                    }

                    function l(t) {
                        return t < 1e7 ? [t] : t < 1e14 ? [t % 1e7, Math.floor(t / 1e7)] : [t % 1e7, Math.floor(t / 1e7) % 1e7, Math.floor(t / 1e14)]
                    }

                    function p(t) {
                        d(t);
                        var r = t.length;
                        if (r < 4 && T(t, n) < 0) switch (r) {
                            case 0:
                                return 0;
                            case 1:
                                return t[0];
                            case 2:
                                return t[0] + t[1] * e;
                            default:
                                return t[0] + (t[1] + t[2] * e) * e
                        }
                        return t
                    }

                    function d(t) {
                        for (var e = t.length; 0 === t[--e];);
                        t.length = e + 1
                    }

                    function y(t) {
                        for (var e = new Array(t), r = -1; ++r < t;) e[r] = 0;
                        return e
                    }

                    function g(t) {
                        return t > 0 ? Math.floor(t) : Math.ceil(t)
                    }

                    function m(t, r) {
                        var n, i, o = t.length,
                            s = r.length,
                            a = new Array(o),
                            c = 0,
                            u = e;
                        for (i = 0; i < s; i++) c = (n = t[i] + r[i] + c) >= u ? 1 : 0, a[i] = n - c * u;
                        for (; i < o;) c = (n = t[i] + c) === u ? 1 : 0, a[i++] = n - c * u;
                        return c > 0 && a.push(c), a
                    }

                    function v(t, e) {
                        return t.length >= e.length ? m(t, e) : m(e, t)
                    }

                    function w(t, r) {
                        var n, i, o = t.length,
                            s = new Array(o),
                            a = e;
                        for (i = 0; i < o; i++) n = t[i] - a + r, r = Math.floor(n / a), s[i] = n - r * a, r += 1;
                        for (; r > 0;) s[i++] = r % a, r = Math.floor(r / a);
                        return s
                    }

                    function b(t, r) {
                        var n, i, o = t.length,
                            s = r.length,
                            a = new Array(o),
                            c = 0,
                            u = e;
                        for (n = 0; n < s; n++)(i = t[n] - c - r[n]) < 0 ? (i += u, c = 1) : c = 0, a[n] = i;
                        for (n = s; n < o; n++) {
                            if (!((i = t[n] - c) < 0)) {
                                a[n++] = i;
                                break
                            }
                            i += u, a[n] = i
                        }
                        for (; n < o; n++) a[n] = t[n];
                        return d(a), a
                    }

                    function _(t, r, n) {
                        var i, o, s = t.length,
                            a = new Array(s),
                            h = -r,
                            f = e;
                        for (i = 0; i < s; i++) o = t[i] + h, h = Math.floor(o / f), o %= f, a[i] = o < 0 ? o + f : o;
                        return "number" == typeof(a = p(a)) ? (n && (a = -a), new u(a)) : new c(a, n)
                    }

                    function A(t, r) {
                        var n, i, o, s, a = t.length,
                            c = r.length,
                            u = y(a + c),
                            h = e;
                        for (o = 0; o < a; ++o) {
                            s = t[o];
                            for (var f = 0; f < c; ++f) n = s * r[f] + u[o + f], i = Math.floor(n / h), u[o + f] = n - i * h, u[o + f + 1] += i
                        }
                        return d(u), u
                    }

                    function E(t, r) {
                        var n, i, o = t.length,
                            s = new Array(o),
                            a = e,
                            c = 0;
                        for (i = 0; i < o; i++) n = t[i] * r + c, c = Math.floor(n / a), s[i] = n - c * a;
                        for (; c > 0;) s[i++] = c % a, c = Math.floor(c / a);
                        return s
                    }

                    function x(t, e) {
                        for (var r = []; e-- > 0;) r.push(0);
                        return r.concat(t)
                    }

                    function k(t, e) {
                        var r = Math.max(t.length, e.length);
                        if (r <= 30) return A(t, e);
                        r = Math.ceil(r / 2);
                        var n = t.slice(r),
                            i = t.slice(0, r),
                            o = e.slice(r),
                            s = e.slice(0, r),
                            a = k(i, s),
                            c = k(n, o),
                            u = k(v(i, n), v(s, o)),
                            h = v(v(a, x(b(b(u, a), c), r)), x(c, 2 * r));
                        return d(h), h
                    }

                    function S(t, r, n) {
                        return new c(t < e ? E(r, t) : A(r, l(t)), n)
                    }

                    function B(t) {
                        var r, n, i, o, s = t.length,
                            a = y(s + s),
                            c = e;
                        for (i = 0; i < s; i++) {
                            n = 0 - (o = t[i]) * o;
                            for (var u = i; u < s; u++) r = o * t[u] * 2 + a[i + u] + n, n = Math.floor(r / c), a[i + u] = r - n * c;
                            a[i + s] = n
                        }
                        return d(a), a
                    }

                    function O(t, e) {
                        var r, n, i, o, s = t.length,
                            a = y(s);
                        for (i = 0, r = s - 1; r >= 0; --r) i = (o = 1e7 * i + t[r]) - (n = g(o / e)) * e, a[r] = 0 | n;
                        return [a, 0 | i]
                    }

                    function C(t, r) {
                        var n, i = X(r);
                        if (s) return [new h(t.value / i.value), new h(t.value % i.value)];
                        var o, f = t.value,
                            m = i.value;
                        if (0 === m) throw new Error("Cannot divide by zero");
                        if (t.isSmall) return i.isSmall ? [new u(g(f / m)), new u(f % m)] : [a[0], t];
                        if (i.isSmall) {
                            if (1 === m) return [t, a[0]];
                            if (-1 == m) return [t.negate(), a[0]];
                            var v = Math.abs(m);
                            if (v < e) {
                                o = p((n = O(f, v))[0]);
                                var w = n[1];
                                return t.sign && (w = -w), "number" == typeof o ? (t.sign !== i.sign && (o = -o), [new u(o), new u(w)]) : [new c(o, t.sign !== i.sign), new u(w)]
                            }
                            m = l(v)
                        }
                        var _ = T(f, m);
                        if (-1 === _) return [a[0], t];
                        if (0 === _) return [a[t.sign === i.sign ? 1 : -1], a[0]];
                        o = (n = f.length + m.length <= 200 ? function(t, r) {
                            var n, i, o, s, a, c, u, h = t.length,
                                f = r.length,
                                l = e,
                                d = y(r.length),
                                g = r[f - 1],
                                m = Math.ceil(l / (2 * g)),
                                v = E(t, m),
                                w = E(r, m);
                            for (v.length <= h && v.push(0), w.push(0), g = w[f - 1], i = h - f; i >= 0; i--) {
                                for (n = l - 1, v[i + f] !== g && (n = Math.floor((v[i + f] * l + v[i + f - 1]) / g)), o = 0, s = 0, c = w.length, a = 0; a < c; a++) o += n * w[a], u = Math.floor(o / l), s += v[i + a] - (o - u * l), o = u, s < 0 ? (v[i + a] = s + l, s = -1) : (v[i + a] = s, s = 0);
                                for (; 0 !== s;) {
                                    for (n -= 1, o = 0, a = 0; a < c; a++)(o += v[i + a] - l + w[a]) < 0 ? (v[i + a] = o + l, o = 0) : (v[i + a] = o, o = 1);
                                    s += o
                                }
                                d[i] = n
                            }
                            return v = O(v, m)[0], [p(d), p(v)]
                        }(f, m) : function(t, r) {
                            for (var n, i, o, s, a, c = t.length, u = r.length, h = [], f = [], l = e; c;)
                                if (f.unshift(t[--c]), d(f), T(f, r) < 0) h.push(0);
                                else {
                                    o = f[(i = f.length) - 1] * l + f[i - 2], s = r[u - 1] * l + r[u - 2], i > u && (o = (o + 1) * l), n = Math.ceil(o / s);
                                    do {
                                        if (T(a = E(r, n), f) <= 0) break;
                                        n--
                                    } while (n);
                                    h.push(n), f = b(f, a)
                                } return h.reverse(), [p(h), p(f)]
                        }(f, m))[0];
                        var A = t.sign !== i.sign,
                            x = n[1],
                            k = t.sign;
                        return "number" == typeof o ? (A && (o = -o), o = new u(o)) : o = new c(o, A), "number" == typeof x ? (k && (x = -x), x = new u(x)) : x = new c(x, k), [o, x]
                    }

                    function T(t, e) {
                        if (t.length !== e.length) return t.length > e.length ? 1 : -1;
                        for (var r = t.length - 1; r >= 0; r--)
                            if (t[r] !== e[r]) return t[r] > e[r] ? 1 : -1;
                        return 0
                    }

                    function P(t) {
                        var e = t.abs();
                        return !e.isUnit() && (!!(e.equals(2) || e.equals(3) || e.equals(5)) || !(e.isEven() || e.isDivisibleBy(3) || e.isDivisibleBy(5)) && (!!e.lesser(49) || void 0))
                    }

                    function z(t, e) {
                        for (var r, n, o, s = t.prev(), a = s, c = 0; a.isEven();) a = a.divide(2), c++;
                        t: for (n = 0; n < e.length; n++)
                            if (!t.lesser(e[n]) && !(o = i(e[n]).modPow(a, t)).isUnit() && !o.equals(s)) {
                                for (r = c - 1; 0 != r; r--) {
                                    if ((o = o.square().mod(t)).isUnit()) return !1;
                                    if (o.equals(s)) continue t
                                }
                                return !1
                            }
                        return !0
                    }
                    c.prototype = Object.create(a.prototype), u.prototype = Object.create(a.prototype), h.prototype = Object.create(a.prototype), c.prototype.add = function(t) {
                        var e = X(t);
                        if (this.sign !== e.sign) return this.subtract(e.negate());
                        var r = this.value,
                            n = e.value;
                        return e.isSmall ? new c(w(r, Math.abs(n)), this.sign) : new c(v(r, n), this.sign)
                    }, c.prototype.plus = c.prototype.add, u.prototype.add = function(t) {
                        var e = X(t),
                            r = this.value;
                        if (r < 0 !== e.sign) return this.subtract(e.negate());
                        var n = e.value;
                        if (e.isSmall) {
                            if (f(r + n)) return new u(r + n);
                            n = l(Math.abs(n))
                        }
                        return new c(w(n, Math.abs(r)), r < 0)
                    }, u.prototype.plus = u.prototype.add, h.prototype.add = function(t) {
                        return new h(this.value + X(t).value)
                    }, h.prototype.plus = h.prototype.add, c.prototype.subtract = function(t) {
                        var e = X(t);
                        if (this.sign !== e.sign) return this.add(e.negate());
                        var r = this.value,
                            n = e.value;
                        return e.isSmall ? _(r, Math.abs(n), this.sign) : function(t, e, r) {
                            var n;
                            return T(t, e) >= 0 ? n = b(t, e) : (n = b(e, t), r = !r), "number" == typeof(n = p(n)) ? (r && (n = -n), new u(n)) : new c(n, r)
                        }(r, n, this.sign)
                    }, c.prototype.minus = c.prototype.subtract, u.prototype.subtract = function(t) {
                        var e = X(t),
                            r = this.value;
                        if (r < 0 !== e.sign) return this.add(e.negate());
                        var n = e.value;
                        return e.isSmall ? new u(r - n) : _(n, Math.abs(r), r >= 0)
                    }, u.prototype.minus = u.prototype.subtract, h.prototype.subtract = function(t) {
                        return new h(this.value - X(t).value)
                    }, h.prototype.minus = h.prototype.subtract, c.prototype.negate = function() {
                        return new c(this.value, !this.sign)
                    }, u.prototype.negate = function() {
                        var t = this.sign,
                            e = new u(-this.value);
                        return e.sign = !t, e
                    }, h.prototype.negate = function() {
                        return new h(-this.value)
                    }, c.prototype.abs = function() {
                        return new c(this.value, !1)
                    }, u.prototype.abs = function() {
                        return new u(Math.abs(this.value))
                    }, h.prototype.abs = function() {
                        return new h(this.value >= 0 ? this.value : -this.value)
                    }, c.prototype.multiply = function(t) {
                        var r, n, i, o = X(t),
                            s = this.value,
                            u = o.value,
                            h = this.sign !== o.sign;
                        if (o.isSmall) {
                            if (0 === u) return a[0];
                            if (1 === u) return this;
                            if (-1 === u) return this.negate();
                            if ((r = Math.abs(u)) < e) return new c(E(s, r), h);
                            u = l(r)
                        }
                        return new c(-.012 * (n = s.length) - .012 * (i = u.length) + 15e-6 * n * i > 0 ? k(s, u) : A(s, u), h)
                    }, c.prototype.times = c.prototype.multiply, u.prototype._multiplyBySmall = function(t) {
                        return f(t.value * this.value) ? new u(t.value * this.value) : S(Math.abs(t.value), l(Math.abs(this.value)), this.sign !== t.sign)
                    }, c.prototype._multiplyBySmall = function(t) {
                        return 0 === t.value ? a[0] : 1 === t.value ? this : -1 === t.value ? this.negate() : S(Math.abs(t.value), this.value, this.sign !== t.sign)
                    }, u.prototype.multiply = function(t) {
                        return X(t)._multiplyBySmall(this)
                    }, u.prototype.times = u.prototype.multiply, h.prototype.multiply = function(t) {
                        return new h(this.value * X(t).value)
                    }, h.prototype.times = h.prototype.multiply, c.prototype.square = function() {
                        return new c(B(this.value), !1)
                    }, u.prototype.square = function() {
                        var t = this.value * this.value;
                        return f(t) ? new u(t) : new c(B(l(Math.abs(this.value))), !1)
                    }, h.prototype.square = function(t) {
                        return new h(this.value * this.value)
                    }, c.prototype.divmod = function(t) {
                        var e = C(this, t);
                        return {
                            quotient: e[0],
                            remainder: e[1]
                        }
                    }, h.prototype.divmod = u.prototype.divmod = c.prototype.divmod, c.prototype.divide = function(t) {
                        return C(this, t)[0]
                    }, h.prototype.over = h.prototype.divide = function(t) {
                        return new h(this.value / X(t).value)
                    }, u.prototype.over = u.prototype.divide = c.prototype.over = c.prototype.divide, c.prototype.mod = function(t) {
                        return C(this, t)[1]
                    }, h.prototype.mod = h.prototype.remainder = function(t) {
                        return new h(this.value % X(t).value)
                    }, u.prototype.remainder = u.prototype.mod = c.prototype.remainder = c.prototype.mod, c.prototype.pow = function(t) {
                        var e, r, n, i = X(t),
                            o = this.value,
                            s = i.value;
                        if (0 === s) return a[1];
                        if (0 === o) return a[0];
                        if (1 === o) return a[1];
                        if (-1 === o) return i.isEven() ? a[1] : a[-1];
                        if (i.sign) return a[0];
                        if (!i.isSmall) throw new Error("The exponent " + i.toString() + " is too large.");
                        if (this.isSmall && f(e = Math.pow(o, s))) return new u(g(e));
                        for (r = this, n = a[1]; !0 & s && (n = n.times(r), --s), 0 !== s;) s /= 2, r = r.square();
                        return n
                    }, u.prototype.pow = c.prototype.pow, h.prototype.pow = function(t) {
                        var e = X(t),
                            r = this.value,
                            n = e.value,
                            i = BigInt(0),
                            o = BigInt(1),
                            s = BigInt(2);
                        if (n === i) return a[1];
                        if (r === i) return a[0];
                        if (r === o) return a[1];
                        if (r === BigInt(-1)) return e.isEven() ? a[1] : a[-1];
                        if (e.isNegative()) return new h(i);
                        for (var c = this, u = a[1];
                            (n & o) === o && (u = u.times(c), --n), n !== i;) n /= s, c = c.square();
                        return u
                    }, c.prototype.modPow = function(t, e) {
                        if (t = X(t), (e = X(e)).isZero()) throw new Error("Cannot take modPow with modulus 0");
                        var r = a[1],
                            n = this.mod(e);
                        for (t.isNegative() && (t = t.multiply(a[-1]), n = n.modInv(e)); t.isPositive();) {
                            if (n.isZero()) return a[0];
                            t.isOdd() && (r = r.multiply(n).mod(e)), t = t.divide(2), n = n.square().mod(e)
                        }
                        return r
                    }, h.prototype.modPow = u.prototype.modPow = c.prototype.modPow, c.prototype.compareAbs = function(t) {
                        var e = X(t),
                            r = this.value,
                            n = e.value;
                        return e.isSmall ? 1 : T(r, n)
                    }, u.prototype.compareAbs = function(t) {
                        var e = X(t),
                            r = Math.abs(this.value),
                            n = e.value;
                        return e.isSmall ? r === (n = Math.abs(n)) ? 0 : r > n ? 1 : -1 : -1
                    }, h.prototype.compareAbs = function(t) {
                        var e = this.value,
                            r = X(t).value;
                        return (e = e >= 0 ? e : -e) === (r = r >= 0 ? r : -r) ? 0 : e > r ? 1 : -1
                    }, c.prototype.compare = function(t) {
                        if (t === 1 / 0) return -1;
                        if (t === -1 / 0) return 1;
                        var e = X(t),
                            r = this.value,
                            n = e.value;
                        return this.sign !== e.sign ? e.sign ? 1 : -1 : e.isSmall ? this.sign ? -1 : 1 : T(r, n) * (this.sign ? -1 : 1)
                    }, c.prototype.compareTo = c.prototype.compare, u.prototype.compare = function(t) {
                        if (t === 1 / 0) return -1;
                        if (t === -1 / 0) return 1;
                        var e = X(t),
                            r = this.value,
                            n = e.value;
                        return e.isSmall ? r == n ? 0 : r > n ? 1 : -1 : r < 0 !== e.sign ? r < 0 ? -1 : 1 : r < 0 ? 1 : -1
                    }, u.prototype.compareTo = u.prototype.compare, h.prototype.compare = function(t) {
                        if (t === 1 / 0) return -1;
                        if (t === -1 / 0) return 1;
                        var e = this.value,
                            r = X(t).value;
                        return e === r ? 0 : e > r ? 1 : -1
                    }, h.prototype.compareTo = h.prototype.compare, c.prototype.equals = function(t) {
                        return 0 === this.compare(t)
                    }, h.prototype.eq = h.prototype.equals = u.prototype.eq = u.prototype.equals = c.prototype.eq = c.prototype.equals, c.prototype.notEquals = function(t) {
                        return 0 !== this.compare(t)
                    }, h.prototype.neq = h.prototype.notEquals = u.prototype.neq = u.prototype.notEquals = c.prototype.neq = c.prototype.notEquals, c.prototype.greater = function(t) {
                        return this.compare(t) > 0
                    }, h.prototype.gt = h.prototype.greater = u.prototype.gt = u.prototype.greater = c.prototype.gt = c.prototype.greater, c.prototype.lesser = function(t) {
                        return this.compare(t) < 0
                    }, h.prototype.lt = h.prototype.lesser = u.prototype.lt = u.prototype.lesser = c.prototype.lt = c.prototype.lesser, c.prototype.greaterOrEquals = function(t) {
                        return this.compare(t) >= 0
                    }, h.prototype.geq = h.prototype.greaterOrEquals = u.prototype.geq = u.prototype.greaterOrEquals = c.prototype.geq = c.prototype.greaterOrEquals, c.prototype.lesserOrEquals = function(t) {
                        return this.compare(t) <= 0
                    }, h.prototype.leq = h.prototype.lesserOrEquals = u.prototype.leq = u.prototype.lesserOrEquals = c.prototype.leq = c.prototype.lesserOrEquals, c.prototype.isEven = function() {
                        return 0 == (1 & this.value[0])
                    }, u.prototype.isEven = function() {
                        return 0 == (1 & this.value)
                    }, h.prototype.isEven = function() {
                        return (this.value & BigInt(1)) === BigInt(0)
                    }, c.prototype.isOdd = function() {
                        return 1 == (1 & this.value[0])
                    }, u.prototype.isOdd = function() {
                        return 1 == (1 & this.value)
                    }, h.prototype.isOdd = function() {
                        return (this.value & BigInt(1)) === BigInt(1)
                    }, c.prototype.isPositive = function() {
                        return !this.sign
                    }, u.prototype.isPositive = function() {
                        return this.value > 0
                    }, h.prototype.isPositive = u.prototype.isPositive, c.prototype.isNegative = function() {
                        return this.sign
                    }, u.prototype.isNegative = function() {
                        return this.value < 0
                    }, h.prototype.isNegative = u.prototype.isNegative, c.prototype.isUnit = function() {
                        return !1
                    }, u.prototype.isUnit = function() {
                        return 1 === Math.abs(this.value)
                    }, h.prototype.isUnit = function() {
                        return this.abs().value === BigInt(1)
                    }, c.prototype.isZero = function() {
                        return !1
                    }, u.prototype.isZero = function() {
                        return 0 === this.value
                    }, h.prototype.isZero = function() {
                        return this.value === BigInt(0)
                    }, c.prototype.isDivisibleBy = function(t) {
                        var e = X(t);
                        return !e.isZero() && (!!e.isUnit() || (0 === e.compareAbs(2) ? this.isEven() : this.mod(e).isZero()))
                    }, h.prototype.isDivisibleBy = u.prototype.isDivisibleBy = c.prototype.isDivisibleBy, c.prototype.isPrime = function(e) {
                        var r = P(this);
                        if (r !== t) return r;
                        var n = this.abs(),
                            o = n.bitLength();
                        if (o <= 64) return z(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
                        for (var s = Math.log(2) * o.toJSNumber(), a = Math.ceil(!0 === e ? 2 * Math.pow(s, 2) : s), c = [], u = 0; u < a; u++) c.push(i(u + 2));
                        return z(n, c)
                    }, h.prototype.isPrime = u.prototype.isPrime = c.prototype.isPrime, c.prototype.isProbablePrime = function(e, r) {
                        var n = P(this);
                        if (n !== t) return n;
                        for (var o = this.abs(), s = e === t ? 5 : e, a = [], c = 0; c < s; c++) a.push(i.randBetween(2, o.minus(2), r));
                        return z(o, a)
                    }, h.prototype.isProbablePrime = u.prototype.isProbablePrime = c.prototype.isProbablePrime, c.prototype.modInv = function(t) {
                        for (var e, r, n, o = i.zero, s = i.one, a = X(t), c = this.abs(); !c.isZero();) e = a.divide(c), r = o, n = a, o = s, a = c, s = r.subtract(e.multiply(s)), c = n.subtract(e.multiply(c));
                        if (!a.isUnit()) throw new Error(this.toString() + " and " + t.toString() + " are not co-prime");
                        return -1 === o.compare(0) && (o = o.add(t)), this.isNegative() ? o.negate() : o
                    }, h.prototype.modInv = u.prototype.modInv = c.prototype.modInv, c.prototype.next = function() {
                        var t = this.value;
                        return this.sign ? _(t, 1, this.sign) : new c(w(t, 1), this.sign)
                    }, u.prototype.next = function() {
                        var t = this.value;
                        return t + 1 < r ? new u(t + 1) : new c(n, !1)
                    }, h.prototype.next = function() {
                        return new h(this.value + BigInt(1))
                    }, c.prototype.prev = function() {
                        var t = this.value;
                        return this.sign ? new c(w(t, 1), !0) : _(t, 1, this.sign)
                    }, u.prototype.prev = function() {
                        var t = this.value;
                        return t - 1 > -r ? new u(t - 1) : new c(n, !0)
                    }, h.prototype.prev = function() {
                        return new h(this.value - BigInt(1))
                    };
                    for (var U = [1]; 2 * U[U.length - 1] <= e;) U.push(2 * U[U.length - 1]);
                    var M = U.length,
                        R = U[M - 1];

                    function j(t) {
                        return Math.abs(t) <= e
                    }

                    function D(t, e, r) {
                        e = X(e);
                        for (var n = t.isNegative(), o = e.isNegative(), s = n ? t.not() : t, a = o ? e.not() : e, c = 0, u = 0, h = null, f = null, l = []; !s.isZero() || !a.isZero();) c = (h = C(s, R))[1].toJSNumber(), n && (c = R - 1 - c), u = (f = C(a, R))[1].toJSNumber(), o && (u = R - 1 - u), s = h[0], a = f[0], l.push(r(c, u));
                        for (var p = 0 !== r(n ? 1 : 0, o ? 1 : 0) ? i(-1) : i(0), d = l.length - 1; d >= 0; d -= 1) p = p.multiply(R).add(i(l[d]));
                        return p
                    }
                    c.prototype.shiftLeft = function(t) {
                        var e = X(t).toJSNumber();
                        if (!j(e)) throw new Error(String(e) + " is too large for shifting.");
                        if (e < 0) return this.shiftRight(-e);
                        var r = this;
                        if (r.isZero()) return r;
                        for (; e >= M;) r = r.multiply(R), e -= M - 1;
                        return r.multiply(U[e])
                    }, h.prototype.shiftLeft = u.prototype.shiftLeft = c.prototype.shiftLeft, c.prototype.shiftRight = function(t) {
                        var e, r = X(t).toJSNumber();
                        if (!j(r)) throw new Error(String(r) + " is too large for shifting.");
                        if (r < 0) return this.shiftLeft(-r);
                        for (var n = this; r >= M;) {
                            if (n.isZero() || n.isNegative() && n.isUnit()) return n;
                            n = (e = C(n, R))[1].isNegative() ? e[0].prev() : e[0], r -= M - 1
                        }
                        return (e = C(n, U[r]))[1].isNegative() ? e[0].prev() : e[0]
                    }, h.prototype.shiftRight = u.prototype.shiftRight = c.prototype.shiftRight, c.prototype.not = function() {
                        return this.negate().prev()
                    }, h.prototype.not = u.prototype.not = c.prototype.not, c.prototype.and = function(t) {
                        return D(this, t, (function(t, e) {
                            return t & e
                        }))
                    }, h.prototype.and = u.prototype.and = c.prototype.and, c.prototype.or = function(t) {
                        return D(this, t, (function(t, e) {
                            return t | e
                        }))
                    }, h.prototype.or = u.prototype.or = c.prototype.or, c.prototype.xor = function(t) {
                        return D(this, t, (function(t, e) {
                            return t ^ e
                        }))
                    }, h.prototype.xor = u.prototype.xor = c.prototype.xor;
                    var N = 1 << 30;

                    function I(t) {
                        var r = t.value,
                            n = "number" == typeof r ? r | N : "bigint" == typeof r ? r | BigInt(N) : r[0] + r[1] * e | 1073758208;
                        return n & -n
                    }

                    function L(t, e) {
                        if (e.compareTo(t) <= 0) {
                            var r = L(t, e.square(e)),
                                n = r.p,
                                o = r.e,
                                s = n.multiply(e);
                            return s.compareTo(t) <= 0 ? {
                                p: s,
                                e: 2 * o + 1
                            } : {
                                p: n,
                                e: 2 * o
                            }
                        }
                        return {
                            p: i(1),
                            e: 0
                        }
                    }

                    function q(t, e) {
                        return t = X(t), e = X(e), t.greater(e) ? t : e
                    }

                    function F(t, e) {
                        return t = X(t), e = X(e), t.lesser(e) ? t : e
                    }

                    function K(t, e) {
                        if (t = X(t).abs(), e = X(e).abs(), t.equals(e)) return t;
                        if (t.isZero()) return e;
                        if (e.isZero()) return t;
                        for (var r, n, i = a[1]; t.isEven() && e.isEven();) r = F(I(t), I(e)), t = t.divide(r), e = e.divide(r), i = i.multiply(r);
                        for (; t.isEven();) t = t.divide(I(t));
                        do {
                            for (; e.isEven();) e = e.divide(I(e));
                            t.greater(e) && (n = e, e = t, t = n), e = e.subtract(t)
                        } while (!e.isZero());
                        return i.isUnit() ? t : t.multiply(i)
                    }
                    c.prototype.bitLength = function() {
                        var t = this;
                        return t.compareTo(i(0)) < 0 && (t = t.negate().subtract(i(1))), 0 === t.compareTo(i(0)) ? i(0) : i(L(t, i(2)).e).add(i(1))
                    }, h.prototype.bitLength = u.prototype.bitLength = c.prototype.bitLength;
                    var J = function(t, e, r, n) {
                        r = r || o, t = String(t), n || (t = t.toLowerCase(), r = r.toLowerCase());
                        var i, s = t.length,
                            a = Math.abs(e),
                            c = {};
                        for (i = 0; i < r.length; i++) c[r[i]] = i;
                        for (i = 0; i < s; i++)
                            if ("-" !== (f = t[i]) && f in c && c[f] >= a) {
                                if ("1" === f && 1 === a) continue;
                                throw new Error(f + " is not a valid digit in base " + e + ".")
                            } e = X(e);
                        var u = [],
                            h = "-" === t[0];
                        for (i = h ? 1 : 0; i < t.length; i++) {
                            var f;
                            if ((f = t[i]) in c) u.push(X(c[f]));
                            else {
                                if ("<" !== f) throw new Error(f + " is not a valid character");
                                var l = i;
                                do {
                                    i++
                                } while (">" !== t[i] && i < t.length);
                                u.push(X(t.slice(l + 1, i)))
                            }
                        }
                        return H(u, e, h)
                    };

                    function H(t, e, r) {
                        var n, i = a[0],
                            o = a[1];
                        for (n = t.length - 1; n >= 0; n--) i = i.add(t[n].times(o)), o = o.times(e);
                        return r ? i.negate() : i
                    }

                    function W(t, e) {
                        if ((e = i(e)).isZero()) {
                            if (t.isZero()) return {
                                value: [0],
                                isNegative: !1
                            };
                            throw new Error("Cannot convert nonzero numbers to base 0.")
                        }
                        if (e.equals(-1)) {
                            if (t.isZero()) return {
                                value: [0],
                                isNegative: !1
                            };
                            if (t.isNegative()) return {
                                value: [].concat.apply([], Array.apply(null, Array(-t.toJSNumber())).map(Array.prototype.valueOf, [1, 0])),
                                isNegative: !1
                            };
                            var r = Array.apply(null, Array(t.toJSNumber() - 1)).map(Array.prototype.valueOf, [0, 1]);
                            return r.unshift([1]), {
                                value: [].concat.apply([], r),
                                isNegative: !1
                            }
                        }
                        var n = !1;
                        if (t.isNegative() && e.isPositive() && (n = !0, t = t.abs()), e.isUnit()) return t.isZero() ? {
                            value: [0],
                            isNegative: !1
                        } : {
                            value: Array.apply(null, Array(t.toJSNumber())).map(Number.prototype.valueOf, 1),
                            isNegative: n
                        };
                        for (var o, s = [], a = t; a.isNegative() || a.compareAbs(e) >= 0;) {
                            o = a.divmod(e), a = o.quotient;
                            var c = o.remainder;
                            c.isNegative() && (c = e.minus(c).abs(), a = a.next()), s.push(c.toJSNumber())
                        }
                        return s.push(a.toJSNumber()), {
                            value: s.reverse(),
                            isNegative: n
                        }
                    }

                    function $(t, e, r) {
                        var n = W(t, e);
                        return (n.isNegative ? "-" : "") + n.value.map((function(t) {
                            return function(t, e) {
                                return t < (e = e || o).length ? e[t] : "<" + t + ">"
                            }(t, r)
                        })).join("")
                    }

                    function V(t) {
                        if (f(+t)) {
                            var e = +t;
                            if (e === g(e)) return s ? new h(BigInt(e)) : new u(e);
                            throw new Error("Invalid integer: " + t)
                        }
                        var r = "-" === t[0];
                        r && (t = t.slice(1));
                        var n = t.split(/e/i);
                        if (n.length > 2) throw new Error("Invalid integer: " + n.join("e"));
                        if (2 === n.length) {
                            var i = n[1];
                            if ("+" === i[0] && (i = i.slice(1)), (i = +i) !== g(i) || !f(i)) throw new Error("Invalid integer: " + i + " is not a valid exponent.");
                            var o = n[0],
                                a = o.indexOf(".");
                            if (a >= 0 && (i -= o.length - a - 1, o = o.slice(0, a) + o.slice(a + 1)), i < 0) throw new Error("Cannot include negative exponent part for integers");
                            t = o += new Array(i + 1).join("0")
                        }
                        if (!/^([0-9][0-9]*)$/.test(t)) throw new Error("Invalid integer: " + t);
                        if (s) return new h(BigInt(r ? "-" + t : t));
                        for (var l = [], p = t.length, y = p - 7; p > 0;) l.push(+t.slice(y, p)), (y -= 7) < 0 && (y = 0), p -= 7;
                        return d(l), new c(l, r)
                    }

                    function X(t) {
                        return "number" == typeof t ? function(t) {
                            if (s) return new h(BigInt(t));
                            if (f(t)) {
                                if (t !== g(t)) throw new Error(t + " is not an integer.");
                                return new u(t)
                            }
                            return V(t.toString())
                        }(t) : "string" == typeof t ? V(t) : "bigint" == typeof t ? new h(t) : t
                    }
                    c.prototype.toArray = function(t) {
                        return W(this, t)
                    }, u.prototype.toArray = function(t) {
                        return W(this, t)
                    }, h.prototype.toArray = function(t) {
                        return W(this, t)
                    }, c.prototype.toString = function(e, r) {
                        if (e === t && (e = 10), 10 !== e) return $(this, e, r);
                        for (var n, i = this.value, o = i.length, s = String(i[--o]); --o >= 0;) n = String(i[o]), s += "0000000".slice(n.length) + n;
                        return (this.sign ? "-" : "") + s
                    }, u.prototype.toString = function(e, r) {
                        return e === t && (e = 10), 10 != e ? $(this, e, r) : String(this.value)
                    }, h.prototype.toString = u.prototype.toString, h.prototype.toJSON = c.prototype.toJSON = u.prototype.toJSON = function() {
                        return this.toString()
                    }, c.prototype.valueOf = function() {
                        return parseInt(this.toString(), 10)
                    }, c.prototype.toJSNumber = c.prototype.valueOf, u.prototype.valueOf = function() {
                        return this.value
                    }, u.prototype.toJSNumber = u.prototype.valueOf, h.prototype.valueOf = h.prototype.toJSNumber = function() {
                        return parseInt(this.toString(), 10)
                    };
                    for (var G = 0; G < 1e3; G++) a[G] = X(G), G > 0 && (a[-G] = X(-G));
                    return a.one = a[1], a.zero = a[0], a.minusOne = a[-1], a.max = q, a.min = F, a.gcd = K, a.lcm = function(t, e) {
                        return t = X(t).abs(), e = X(e).abs(), t.divide(K(t, e)).multiply(e)
                    }, a.isInstance = function(t) {
                        return t instanceof c || t instanceof u || t instanceof h
                    }, a.randBetween = function(t, r, n) {
                        t = X(t), r = X(r);
                        var i = n || Math.random,
                            o = F(t, r),
                            s = q(t, r).subtract(o).add(1);
                        if (s.isSmall) return o.add(Math.floor(i() * s));
                        for (var c = W(s, e).value, u = [], h = !0, f = 0; f < c.length; f++) {
                            var l = h ? c[f] : e,
                                p = g(i() * l);
                            u.push(p), p < l && (h = !1)
                        }
                        return o.add(a.fromArray(u, e, !1))
                    }, a.fromArray = function(t, e, r) {
                        return H(t.map(X), X(e || 10), r)
                    }, a
                }();
                t.hasOwnProperty("exports") && (t.exports = i), void 0 === (n = function() {
                    return i
                }.call(e, r, e, t)) || (t.exports = n)
            },
            5548: t => {
                var e = void 0 !== e ? e : "undefined" != typeof WebKitBlobBuilder ? WebKitBlobBuilder : "undefined" != typeof MSBlobBuilder ? MSBlobBuilder : "undefined" != typeof MozBlobBuilder && MozBlobBuilder,
                    r = function() {
                        try {
                            return 2 === new Blob(["hi"]).size
                        } catch (t) {
                            return !1
                        }
                    }(),
                    n = r && function() {
                        try {
                            return 2 === new Blob([new Uint8Array([1, 2])]).size
                        } catch (t) {
                            return !1
                        }
                    }(),
                    i = e && e.prototype.append && e.prototype.getBlob;

                function o(t) {
                    return t.map((function(t) {
                        if (t.buffer instanceof ArrayBuffer) {
                            var e = t.buffer;
                            if (t.byteLength !== e.byteLength) {
                                var r = new Uint8Array(t.byteLength);
                                r.set(new Uint8Array(e, t.byteOffset, t.byteLength)), e = r.buffer
                            }
                            return e
                        }
                        return t
                    }))
                }

                function s(t, r) {
                    r = r || {};
                    var n = new e;
                    return o(t).forEach((function(t) {
                        n.append(t)
                    })), r.type ? n.getBlob(r.type) : n.getBlob()
                }

                function a(t, e) {
                    return new Blob(o(t), e || {})
                }
                "undefined" != typeof Blob && (s.prototype = Blob.prototype, a.prototype = Blob.prototype), t.exports = r ? n ? Blob : a : i ? s : void 0
            },
            8764: (t, e, r) => {
                "use strict";
                const n = r(9742),
                    i = r(645),
                    o = "function" == typeof Symbol && "function" == typeof Symbol.for ? Symbol.for("nodejs.util.inspect.custom") : null;
                e.Buffer = c, e.SlowBuffer = function(t) {
                    return +t != t && (t = 0), c.alloc(+t)
                }, e.INSPECT_MAX_BYTES = 50;
                const s = 2147483647;

                function a(t) {
                    if (t > s) throw new RangeError('The value "' + t + '" is invalid for option "size"');
                    const e = new Uint8Array(t);
                    return Object.setPrototypeOf(e, c.prototype), e
                }

                function c(t, e, r) {
                    if ("number" == typeof t) {
                        if ("string" == typeof e) throw new TypeError('The "string" argument must be of type string. Received type number');
                        return f(t)
                    }
                    return u(t, e, r)
                }

                function u(t, e, r) {
                    if ("string" == typeof t) return function(t, e) {
                        if ("string" == typeof e && "" !== e || (e = "utf8"), !c.isEncoding(e)) throw new TypeError("Unknown encoding: " + e);
                        const r = 0 | y(t, e);
                        let n = a(r);
                        const i = n.write(t, e);
                        return i !== r && (n = n.slice(0, i)), n
                    }(t, e);
                    if (ArrayBuffer.isView(t)) return function(t) {
                        if (X(t, Uint8Array)) {
                            const e = new Uint8Array(t);
                            return p(e.buffer, e.byteOffset, e.byteLength)
                        }
                        return l(t)
                    }(t);
                    if (null == t) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof t);
                    if (X(t, ArrayBuffer) || t && X(t.buffer, ArrayBuffer)) return p(t, e, r);
                    if ("undefined" != typeof SharedArrayBuffer && (X(t, SharedArrayBuffer) || t && X(t.buffer, SharedArrayBuffer))) return p(t, e, r);
                    if ("number" == typeof t) throw new TypeError('The "value" argument must not be of type number. Received type number');
                    const n = t.valueOf && t.valueOf();
                    if (null != n && n !== t) return c.from(n, e, r);
                    const i = function(t) {
                        if (c.isBuffer(t)) {
                            const e = 0 | d(t.length),
                                r = a(e);
                            return 0 === r.length || t.copy(r, 0, 0, e), r
                        }
                        return void 0 !== t.length ? "number" != typeof t.length || G(t.length) ? a(0) : l(t) : "Buffer" === t.type && Array.isArray(t.data) ? l(t.data) : void 0
                    }(t);
                    if (i) return i;
                    if ("undefined" != typeof Symbol && null != Symbol.toPrimitive && "function" == typeof t[Symbol.toPrimitive]) return c.from(t[Symbol.toPrimitive]("string"), e, r);
                    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof t)
                }

                function h(t) {
                    if ("number" != typeof t) throw new TypeError('"size" argument must be of type number');
                    if (t < 0) throw new RangeError('The value "' + t + '" is invalid for option "size"')
                }

                function f(t) {
                    return h(t), a(t < 0 ? 0 : 0 | d(t))
                }

                function l(t) {
                    const e = t.length < 0 ? 0 : 0 | d(t.length),
                        r = a(e);
                    for (let n = 0; n < e; n += 1) r[n] = 255 & t[n];
                    return r
                }

                function p(t, e, r) {
                    if (e < 0 || t.byteLength < e) throw new RangeError('"offset" is outside of buffer bounds');
                    if (t.byteLength < e + (r || 0)) throw new RangeError('"length" is outside of buffer bounds');
                    let n;
                    return n = void 0 === e && void 0 === r ? new Uint8Array(t) : void 0 === r ? new Uint8Array(t, e) : new Uint8Array(t, e, r), Object.setPrototypeOf(n, c.prototype), n
                }

                function d(t) {
                    if (t >= s) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + s.toString(16) + " bytes");
                    return 0 | t
                }

                function y(t, e) {
                    if (c.isBuffer(t)) return t.length;
                    if (ArrayBuffer.isView(t) || X(t, ArrayBuffer)) return t.byteLength;
                    if ("string" != typeof t) throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof t);
                    const r = t.length,
                        n = arguments.length > 2 && !0 === arguments[2];
                    if (!n && 0 === r) return 0;
                    let i = !1;
                    for (;;) switch (e) {
                        case "ascii":
                        case "latin1":
                        case "binary":
                            return r;
                        case "utf8":
                        case "utf-8":
                            return W(t).length;
                        case "ucs2":
                        case "ucs-2":
                        case "utf16le":
                        case "utf-16le":
                            return 2 * r;
                        case "hex":
                            return r >>> 1;
                        case "base64":
                            return $(t).length;
                        default:
                            if (i) return n ? -1 : W(t).length;
                            e = ("" + e).toLowerCase(), i = !0
                    }
                }

                function g(t, e, r) {
                    let n = !1;
                    if ((void 0 === e || e < 0) && (e = 0), e > this.length) return "";
                    if ((void 0 === r || r > this.length) && (r = this.length), r <= 0) return "";
                    if ((r >>>= 0) <= (e >>>= 0)) return "";
                    for (t || (t = "utf8");;) switch (t) {
                        case "hex":
                            return T(this, e, r);
                        case "utf8":
                        case "utf-8":
                            return S(this, e, r);
                        case "ascii":
                            return O(this, e, r);
                        case "latin1":
                        case "binary":
                            return C(this, e, r);
                        case "base64":
                            return k(this, e, r);
                        case "ucs2":
                        case "ucs-2":
                        case "utf16le":
                        case "utf-16le":
                            return P(this, e, r);
                        default:
                            if (n) throw new TypeError("Unknown encoding: " + t);
                            t = (t + "").toLowerCase(), n = !0
                    }
                }

                function m(t, e, r) {
                    const n = t[e];
                    t[e] = t[r], t[r] = n
                }

                function v(t, e, r, n, i) {
                    if (0 === t.length) return -1;
                    if ("string" == typeof r ? (n = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), G(r = +r) && (r = i ? 0 : t.length - 1), r < 0 && (r = t.length + r), r >= t.length) {
                        if (i) return -1;
                        r = t.length - 1
                    } else if (r < 0) {
                        if (!i) return -1;
                        r = 0
                    }
                    if ("string" == typeof e && (e = c.from(e, n)), c.isBuffer(e)) return 0 === e.length ? -1 : w(t, e, r, n, i);
                    if ("number" == typeof e) return e &= 255, "function" == typeof Uint8Array.prototype.indexOf ? i ? Uint8Array.prototype.indexOf.call(t, e, r) : Uint8Array.prototype.lastIndexOf.call(t, e, r) : w(t, [e], r, n, i);
                    throw new TypeError("val must be string, number or Buffer")
                }

                function w(t, e, r, n, i) {
                    let o, s = 1,
                        a = t.length,
                        c = e.length;
                    if (void 0 !== n && ("ucs2" === (n = String(n).toLowerCase()) || "ucs-2" === n || "utf16le" === n || "utf-16le" === n)) {
                        if (t.length < 2 || e.length < 2) return -1;
                        s = 2, a /= 2, c /= 2, r /= 2
                    }

                    function u(t, e) {
                        return 1 === s ? t[e] : t.readUInt16BE(e * s)
                    }
                    if (i) {
                        let n = -1;
                        for (o = r; o < a; o++)
                            if (u(t, o) === u(e, -1 === n ? 0 : o - n)) {
                                if (-1 === n && (n = o), o - n + 1 === c) return n * s
                            } else -1 !== n && (o -= o - n), n = -1
                    } else
                        for (r + c > a && (r = a - c), o = r; o >= 0; o--) {
                            let r = !0;
                            for (let n = 0; n < c; n++)
                                if (u(t, o + n) !== u(e, n)) {
                                    r = !1;
                                    break
                                } if (r) return o
                        }
                    return -1
                }

                function b(t, e, r, n) {
                    r = Number(r) || 0;
                    const i = t.length - r;
                    n ? (n = Number(n)) > i && (n = i) : n = i;
                    const o = e.length;
                    let s;
                    for (n > o / 2 && (n = o / 2), s = 0; s < n; ++s) {
                        const n = parseInt(e.substr(2 * s, 2), 16);
                        if (G(n)) return s;
                        t[r + s] = n
                    }
                    return s
                }

                function _(t, e, r, n) {
                    return V(W(e, t.length - r), t, r, n)
                }

                function A(t, e, r, n) {
                    return V(function(t) {
                        const e = [];
                        for (let r = 0; r < t.length; ++r) e.push(255 & t.charCodeAt(r));
                        return e
                    }(e), t, r, n)
                }

                function E(t, e, r, n) {
                    return V($(e), t, r, n)
                }

                function x(t, e, r, n) {
                    return V(function(t, e) {
                        let r, n, i;
                        const o = [];
                        for (let s = 0; s < t.length && !((e -= 2) < 0); ++s) r = t.charCodeAt(s), n = r >> 8, i = r % 256, o.push(i), o.push(n);
                        return o
                    }(e, t.length - r), t, r, n)
                }

                function k(t, e, r) {
                    return 0 === e && r === t.length ? n.fromByteArray(t) : n.fromByteArray(t.slice(e, r))
                }

                function S(t, e, r) {
                    r = Math.min(t.length, r);
                    const n = [];
                    let i = e;
                    for (; i < r;) {
                        const e = t[i];
                        let o = null,
                            s = e > 239 ? 4 : e > 223 ? 3 : e > 191 ? 2 : 1;
                        if (i + s <= r) {
                            let r, n, a, c;
                            switch (s) {
                                case 1:
                                    e < 128 && (o = e);
                                    break;
                                case 2:
                                    r = t[i + 1], 128 == (192 & r) && (c = (31 & e) << 6 | 63 & r, c > 127 && (o = c));
                                    break;
                                case 3:
                                    r = t[i + 1], n = t[i + 2], 128 == (192 & r) && 128 == (192 & n) && (c = (15 & e) << 12 | (63 & r) << 6 | 63 & n, c > 2047 && (c < 55296 || c > 57343) && (o = c));
                                    break;
                                case 4:
                                    r = t[i + 1], n = t[i + 2], a = t[i + 3], 128 == (192 & r) && 128 == (192 & n) && 128 == (192 & a) && (c = (15 & e) << 18 | (63 & r) << 12 | (63 & n) << 6 | 63 & a, c > 65535 && c < 1114112 && (o = c))
                            }
                        }
                        null === o ? (o = 65533, s = 1) : o > 65535 && (o -= 65536, n.push(o >>> 10 & 1023 | 55296), o = 56320 | 1023 & o), n.push(o), i += s
                    }
                    return function(t) {
                        const e = t.length;
                        if (e <= B) return String.fromCharCode.apply(String, t);
                        let r = "",
                            n = 0;
                        for (; n < e;) r += String.fromCharCode.apply(String, t.slice(n, n += B));
                        return r
                    }(n)
                }
                e.kMaxLength = s, c.TYPED_ARRAY_SUPPORT = function() {
                    try {
                        const t = new Uint8Array(1),
                            e = {
                                foo: function() {
                                    return 42
                                }
                            };
                        return Object.setPrototypeOf(e, Uint8Array.prototype), Object.setPrototypeOf(t, e), 42 === t.foo()
                    } catch (t) {
                        return !1
                    }
                }(), c.TYPED_ARRAY_SUPPORT || "undefined" == typeof console || "function" != typeof console.error || console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."), Object.defineProperty(c.prototype, "parent", {
                    enumerable: !0,
                    get: function() {
                        if (c.isBuffer(this)) return this.buffer
                    }
                }), Object.defineProperty(c.prototype, "offset", {
                    enumerable: !0,
                    get: function() {
                        if (c.isBuffer(this)) return this.byteOffset
                    }
                }), c.poolSize = 8192, c.from = function(t, e, r) {
                    return u(t, e, r)
                }, Object.setPrototypeOf(c.prototype, Uint8Array.prototype), Object.setPrototypeOf(c, Uint8Array), c.alloc = function(t, e, r) {
                    return function(t, e, r) {
                        return h(t), t <= 0 ? a(t) : void 0 !== e ? "string" == typeof r ? a(t).fill(e, r) : a(t).fill(e) : a(t)
                    }(t, e, r)
                }, c.allocUnsafe = function(t) {
                    return f(t)
                }, c.allocUnsafeSlow = function(t) {
                    return f(t)
                }, c.isBuffer = function(t) {
                    return null != t && !0 === t._isBuffer && t !== c.prototype
                }, c.compare = function(t, e) {
                    if (X(t, Uint8Array) && (t = c.from(t, t.offset, t.byteLength)), X(e, Uint8Array) && (e = c.from(e, e.offset, e.byteLength)), !c.isBuffer(t) || !c.isBuffer(e)) throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
                    if (t === e) return 0;
                    let r = t.length,
                        n = e.length;
                    for (let i = 0, o = Math.min(r, n); i < o; ++i)
                        if (t[i] !== e[i]) {
                            r = t[i], n = e[i];
                            break
                        } return r < n ? -1 : n < r ? 1 : 0
                }, c.isEncoding = function(t) {
                    switch (String(t).toLowerCase()) {
                        case "hex":
                        case "utf8":
                        case "utf-8":
                        case "ascii":
                        case "latin1":
                        case "binary":
                        case "base64":
                        case "ucs2":
                        case "ucs-2":
                        case "utf16le":
                        case "utf-16le":
                            return !0;
                        default:
                            return !1
                    }
                }, c.concat = function(t, e) {
                    if (!Array.isArray(t)) throw new TypeError('"list" argument must be an Array of Buffers');
                    if (0 === t.length) return c.alloc(0);
                    let r;
                    if (void 0 === e)
                        for (e = 0, r = 0; r < t.length; ++r) e += t[r].length;
                    const n = c.allocUnsafe(e);
                    let i = 0;
                    for (r = 0; r < t.length; ++r) {
                        let e = t[r];
                        if (X(e, Uint8Array)) i + e.length > n.length ? (c.isBuffer(e) || (e = c.from(e)), e.copy(n, i)) : Uint8Array.prototype.set.call(n, e, i);
                        else {
                            if (!c.isBuffer(e)) throw new TypeError('"list" argument must be an Array of Buffers');
                            e.copy(n, i)
                        }
                        i += e.length
                    }
                    return n
                }, c.byteLength = y, c.prototype._isBuffer = !0, c.prototype.swap16 = function() {
                    const t = this.length;
                    if (t % 2 != 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
                    for (let e = 0; e < t; e += 2) m(this, e, e + 1);
                    return this
                }, c.prototype.swap32 = function() {
                    const t = this.length;
                    if (t % 4 != 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
                    for (let e = 0; e < t; e += 4) m(this, e, e + 3), m(this, e + 1, e + 2);
                    return this
                }, c.prototype.swap64 = function() {
                    const t = this.length;
                    if (t % 8 != 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
                    for (let e = 0; e < t; e += 8) m(this, e, e + 7), m(this, e + 1, e + 6), m(this, e + 2, e + 5), m(this, e + 3, e + 4);
                    return this
                }, c.prototype.toString = function() {
                    const t = this.length;
                    return 0 === t ? "" : 0 === arguments.length ? S(this, 0, t) : g.apply(this, arguments)
                }, c.prototype.toLocaleString = c.prototype.toString, c.prototype.equals = function(t) {
                    if (!c.isBuffer(t)) throw new TypeError("Argument must be a Buffer");
                    return this === t || 0 === c.compare(this, t)
                }, c.prototype.inspect = function() {
                    let t = "";
                    const r = e.INSPECT_MAX_BYTES;
                    return t = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim(), this.length > r && (t += " ... "), "<Buffer " + t + ">"
                }, o && (c.prototype[o] = c.prototype.inspect), c.prototype.compare = function(t, e, r, n, i) {
                    if (X(t, Uint8Array) && (t = c.from(t, t.offset, t.byteLength)), !c.isBuffer(t)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof t);
                    if (void 0 === e && (e = 0), void 0 === r && (r = t ? t.length : 0), void 0 === n && (n = 0), void 0 === i && (i = this.length), e < 0 || r > t.length || n < 0 || i > this.length) throw new RangeError("out of range index");
                    if (n >= i && e >= r) return 0;
                    if (n >= i) return -1;
                    if (e >= r) return 1;
                    if (this === t) return 0;
                    let o = (i >>>= 0) - (n >>>= 0),
                        s = (r >>>= 0) - (e >>>= 0);
                    const a = Math.min(o, s),
                        u = this.slice(n, i),
                        h = t.slice(e, r);
                    for (let t = 0; t < a; ++t)
                        if (u[t] !== h[t]) {
                            o = u[t], s = h[t];
                            break
                        } return o < s ? -1 : s < o ? 1 : 0
                }, c.prototype.includes = function(t, e, r) {
                    return -1 !== this.indexOf(t, e, r)
                }, c.prototype.indexOf = function(t, e, r) {
                    return v(this, t, e, r, !0)
                }, c.prototype.lastIndexOf = function(t, e, r) {
                    return v(this, t, e, r, !1)
                }, c.prototype.write = function(t, e, r, n) {
                    if (void 0 === e) n = "utf8", r = this.length, e = 0;
                    else if (void 0 === r && "string" == typeof e) n = e, r = this.length, e = 0;
                    else {
                        if (!isFinite(e)) throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
                        e >>>= 0, isFinite(r) ? (r >>>= 0, void 0 === n && (n = "utf8")) : (n = r, r = void 0)
                    }
                    const i = this.length - e;
                    if ((void 0 === r || r > i) && (r = i), t.length > 0 && (r < 0 || e < 0) || e > this.length) throw new RangeError("Attempt to write outside buffer bounds");
                    n || (n = "utf8");
                    let o = !1;
                    for (;;) switch (n) {
                        case "hex":
                            return b(this, t, e, r);
                        case "utf8":
                        case "utf-8":
                            return _(this, t, e, r);
                        case "ascii":
                        case "latin1":
                        case "binary":
                            return A(this, t, e, r);
                        case "base64":
                            return E(this, t, e, r);
                        case "ucs2":
                        case "ucs-2":
                        case "utf16le":
                        case "utf-16le":
                            return x(this, t, e, r);
                        default:
                            if (o) throw new TypeError("Unknown encoding: " + n);
                            n = ("" + n).toLowerCase(), o = !0
                    }
                }, c.prototype.toJSON = function() {
                    return {
                        type: "Buffer",
                        data: Array.prototype.slice.call(this._arr || this, 0)
                    }
                };
                const B = 4096;

                function O(t, e, r) {
                    let n = "";
                    r = Math.min(t.length, r);
                    for (let i = e; i < r; ++i) n += String.fromCharCode(127 & t[i]);
                    return n
                }

                function C(t, e, r) {
                    let n = "";
                    r = Math.min(t.length, r);
                    for (let i = e; i < r; ++i) n += String.fromCharCode(t[i]);
                    return n
                }

                function T(t, e, r) {
                    const n = t.length;
                    (!e || e < 0) && (e = 0), (!r || r < 0 || r > n) && (r = n);
                    let i = "";
                    for (let n = e; n < r; ++n) i += Z[t[n]];
                    return i
                }

                function P(t, e, r) {
                    const n = t.slice(e, r);
                    let i = "";
                    for (let t = 0; t < n.length - 1; t += 2) i += String.fromCharCode(n[t] + 256 * n[t + 1]);
                    return i
                }

                function z(t, e, r) {
                    if (t % 1 != 0 || t < 0) throw new RangeError("offset is not uint");
                    if (t + e > r) throw new RangeError("Trying to access beyond buffer length")
                }

                function U(t, e, r, n, i, o) {
                    if (!c.isBuffer(t)) throw new TypeError('"buffer" argument must be a Buffer instance');
                    if (e > i || e < o) throw new RangeError('"value" argument is out of bounds');
                    if (r + n > t.length) throw new RangeError("Index out of range")
                }

                function M(t, e, r, n, i) {
                    F(e, n, i, t, r, 7);
                    let o = Number(e & BigInt(4294967295));
                    t[r++] = o, o >>= 8, t[r++] = o, o >>= 8, t[r++] = o, o >>= 8, t[r++] = o;
                    let s = Number(e >> BigInt(32) & BigInt(4294967295));
                    return t[r++] = s, s >>= 8, t[r++] = s, s >>= 8, t[r++] = s, s >>= 8, t[r++] = s, r
                }

                function R(t, e, r, n, i) {
                    F(e, n, i, t, r, 7);
                    let o = Number(e & BigInt(4294967295));
                    t[r + 7] = o, o >>= 8, t[r + 6] = o, o >>= 8, t[r + 5] = o, o >>= 8, t[r + 4] = o;
                    let s = Number(e >> BigInt(32) & BigInt(4294967295));
                    return t[r + 3] = s, s >>= 8, t[r + 2] = s, s >>= 8, t[r + 1] = s, s >>= 8, t[r] = s, r + 8
                }

                function j(t, e, r, n, i, o) {
                    if (r + n > t.length) throw new RangeError("Index out of range");
                    if (r < 0) throw new RangeError("Index out of range")
                }

                function D(t, e, r, n, o) {
                    return e = +e, r >>>= 0, o || j(t, 0, r, 4), i.write(t, e, r, n, 23, 4), r + 4
                }

                function N(t, e, r, n, o) {
                    return e = +e, r >>>= 0, o || j(t, 0, r, 8), i.write(t, e, r, n, 52, 8), r + 8
                }
                c.prototype.slice = function(t, e) {
                    const r = this.length;
                    (t = ~~t) < 0 ? (t += r) < 0 && (t = 0) : t > r && (t = r), (e = void 0 === e ? r : ~~e) < 0 ? (e += r) < 0 && (e = 0) : e > r && (e = r), e < t && (e = t);
                    const n = this.subarray(t, e);
                    return Object.setPrototypeOf(n, c.prototype), n
                }, c.prototype.readUintLE = c.prototype.readUIntLE = function(t, e, r) {
                    t >>>= 0, e >>>= 0, r || z(t, e, this.length);
                    let n = this[t],
                        i = 1,
                        o = 0;
                    for (; ++o < e && (i *= 256);) n += this[t + o] * i;
                    return n
                }, c.prototype.readUintBE = c.prototype.readUIntBE = function(t, e, r) {
                    t >>>= 0, e >>>= 0, r || z(t, e, this.length);
                    let n = this[t + --e],
                        i = 1;
                    for (; e > 0 && (i *= 256);) n += this[t + --e] * i;
                    return n
                }, c.prototype.readUint8 = c.prototype.readUInt8 = function(t, e) {
                    return t >>>= 0, e || z(t, 1, this.length), this[t]
                }, c.prototype.readUint16LE = c.prototype.readUInt16LE = function(t, e) {
                    return t >>>= 0, e || z(t, 2, this.length), this[t] | this[t + 1] << 8
                }, c.prototype.readUint16BE = c.prototype.readUInt16BE = function(t, e) {
                    return t >>>= 0, e || z(t, 2, this.length), this[t] << 8 | this[t + 1]
                }, c.prototype.readUint32LE = c.prototype.readUInt32LE = function(t, e) {
                    return t >>>= 0, e || z(t, 4, this.length), (this[t] | this[t + 1] << 8 | this[t + 2] << 16) + 16777216 * this[t + 3]
                }, c.prototype.readUint32BE = c.prototype.readUInt32BE = function(t, e) {
                    return t >>>= 0, e || z(t, 4, this.length), 16777216 * this[t] + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3])
                }, c.prototype.readBigUInt64LE = Y((function(t) {
                    K(t >>>= 0, "offset");
                    const e = this[t],
                        r = this[t + 7];
                    void 0 !== e && void 0 !== r || J(t, this.length - 8);
                    const n = e + 256 * this[++t] + 65536 * this[++t] + this[++t] * 2 ** 24,
                        i = this[++t] + 256 * this[++t] + 65536 * this[++t] + r * 2 ** 24;
                    return BigInt(n) + (BigInt(i) << BigInt(32))
                })), c.prototype.readBigUInt64BE = Y((function(t) {
                    K(t >>>= 0, "offset");
                    const e = this[t],
                        r = this[t + 7];
                    void 0 !== e && void 0 !== r || J(t, this.length - 8);
                    const n = e * 2 ** 24 + 65536 * this[++t] + 256 * this[++t] + this[++t],
                        i = this[++t] * 2 ** 24 + 65536 * this[++t] + 256 * this[++t] + r;
                    return (BigInt(n) << BigInt(32)) + BigInt(i)
                })), c.prototype.readIntLE = function(t, e, r) {
                    t >>>= 0, e >>>= 0, r || z(t, e, this.length);
                    let n = this[t],
                        i = 1,
                        o = 0;
                    for (; ++o < e && (i *= 256);) n += this[t + o] * i;
                    return i *= 128, n >= i && (n -= Math.pow(2, 8 * e)), n
                }, c.prototype.readIntBE = function(t, e, r) {
                    t >>>= 0, e >>>= 0, r || z(t, e, this.length);
                    let n = e,
                        i = 1,
                        o = this[t + --n];
                    for (; n > 0 && (i *= 256);) o += this[t + --n] * i;
                    return i *= 128, o >= i && (o -= Math.pow(2, 8 * e)), o
                }, c.prototype.readInt8 = function(t, e) {
                    return t >>>= 0, e || z(t, 1, this.length), 128 & this[t] ? -1 * (255 - this[t] + 1) : this[t]
                }, c.prototype.readInt16LE = function(t, e) {
                    t >>>= 0, e || z(t, 2, this.length);
                    const r = this[t] | this[t + 1] << 8;
                    return 32768 & r ? 4294901760 | r : r
                }, c.prototype.readInt16BE = function(t, e) {
                    t >>>= 0, e || z(t, 2, this.length);
                    const r = this[t + 1] | this[t] << 8;
                    return 32768 & r ? 4294901760 | r : r
                }, c.prototype.readInt32LE = function(t, e) {
                    return t >>>= 0, e || z(t, 4, this.length), this[t] | this[t + 1] << 8 | this[t + 2] << 16 | this[t + 3] << 24
                }, c.prototype.readInt32BE = function(t, e) {
                    return t >>>= 0, e || z(t, 4, this.length), this[t] << 24 | this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]
                }, c.prototype.readBigInt64LE = Y((function(t) {
                    K(t >>>= 0, "offset");
                    const e = this[t],
                        r = this[t + 7];
                    void 0 !== e && void 0 !== r || J(t, this.length - 8);
                    const n = this[t + 4] + 256 * this[t + 5] + 65536 * this[t + 6] + (r << 24);
                    return (BigInt(n) << BigInt(32)) + BigInt(e + 256 * this[++t] + 65536 * this[++t] + this[++t] * 2 ** 24)
                })), c.prototype.readBigInt64BE = Y((function(t) {
                    K(t >>>= 0, "offset");
                    const e = this[t],
                        r = this[t + 7];
                    void 0 !== e && void 0 !== r || J(t, this.length - 8);
                    const n = (e << 24) + 65536 * this[++t] + 256 * this[++t] + this[++t];
                    return (BigInt(n) << BigInt(32)) + BigInt(this[++t] * 2 ** 24 + 65536 * this[++t] + 256 * this[++t] + r)
                })), c.prototype.readFloatLE = function(t, e) {
                    return t >>>= 0, e || z(t, 4, this.length), i.read(this, t, !0, 23, 4)
                }, c.prototype.readFloatBE = function(t, e) {
                    return t >>>= 0, e || z(t, 4, this.length), i.read(this, t, !1, 23, 4)
                }, c.prototype.readDoubleLE = function(t, e) {
                    return t >>>= 0, e || z(t, 8, this.length), i.read(this, t, !0, 52, 8)
                }, c.prototype.readDoubleBE = function(t, e) {
                    return t >>>= 0, e || z(t, 8, this.length), i.read(this, t, !1, 52, 8)
                }, c.prototype.writeUintLE = c.prototype.writeUIntLE = function(t, e, r, n) {
                    t = +t, e >>>= 0, r >>>= 0, n || U(this, t, e, r, Math.pow(2, 8 * r) - 1, 0);
                    let i = 1,
                        o = 0;
                    for (this[e] = 255 & t; ++o < r && (i *= 256);) this[e + o] = t / i & 255;
                    return e + r
                }, c.prototype.writeUintBE = c.prototype.writeUIntBE = function(t, e, r, n) {
                    t = +t, e >>>= 0, r >>>= 0, n || U(this, t, e, r, Math.pow(2, 8 * r) - 1, 0);
                    let i = r - 1,
                        o = 1;
                    for (this[e + i] = 255 & t; --i >= 0 && (o *= 256);) this[e + i] = t / o & 255;
                    return e + r
                }, c.prototype.writeUint8 = c.prototype.writeUInt8 = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 1, 255, 0), this[e] = 255 & t, e + 1
                }, c.prototype.writeUint16LE = c.prototype.writeUInt16LE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 2, 65535, 0), this[e] = 255 & t, this[e + 1] = t >>> 8, e + 2
                }, c.prototype.writeUint16BE = c.prototype.writeUInt16BE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 2, 65535, 0), this[e] = t >>> 8, this[e + 1] = 255 & t, e + 2
                }, c.prototype.writeUint32LE = c.prototype.writeUInt32LE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 4, 4294967295, 0), this[e + 3] = t >>> 24, this[e + 2] = t >>> 16, this[e + 1] = t >>> 8, this[e] = 255 & t, e + 4
                }, c.prototype.writeUint32BE = c.prototype.writeUInt32BE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 4, 4294967295, 0), this[e] = t >>> 24, this[e + 1] = t >>> 16, this[e + 2] = t >>> 8, this[e + 3] = 255 & t, e + 4
                }, c.prototype.writeBigUInt64LE = Y((function(t, e = 0) {
                    return M(this, t, e, BigInt(0), BigInt("0xffffffffffffffff"))
                })), c.prototype.writeBigUInt64BE = Y((function(t, e = 0) {
                    return R(this, t, e, BigInt(0), BigInt("0xffffffffffffffff"))
                })), c.prototype.writeIntLE = function(t, e, r, n) {
                    if (t = +t, e >>>= 0, !n) {
                        const n = Math.pow(2, 8 * r - 1);
                        U(this, t, e, r, n - 1, -n)
                    }
                    let i = 0,
                        o = 1,
                        s = 0;
                    for (this[e] = 255 & t; ++i < r && (o *= 256);) t < 0 && 0 === s && 0 !== this[e + i - 1] && (s = 1), this[e + i] = (t / o >> 0) - s & 255;
                    return e + r
                }, c.prototype.writeIntBE = function(t, e, r, n) {
                    if (t = +t, e >>>= 0, !n) {
                        const n = Math.pow(2, 8 * r - 1);
                        U(this, t, e, r, n - 1, -n)
                    }
                    let i = r - 1,
                        o = 1,
                        s = 0;
                    for (this[e + i] = 255 & t; --i >= 0 && (o *= 256);) t < 0 && 0 === s && 0 !== this[e + i + 1] && (s = 1), this[e + i] = (t / o >> 0) - s & 255;
                    return e + r
                }, c.prototype.writeInt8 = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 1, 127, -128), t < 0 && (t = 255 + t + 1), this[e] = 255 & t, e + 1
                }, c.prototype.writeInt16LE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 2, 32767, -32768), this[e] = 255 & t, this[e + 1] = t >>> 8, e + 2
                }, c.prototype.writeInt16BE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 2, 32767, -32768), this[e] = t >>> 8, this[e + 1] = 255 & t, e + 2
                }, c.prototype.writeInt32LE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 4, 2147483647, -2147483648), this[e] = 255 & t, this[e + 1] = t >>> 8, this[e + 2] = t >>> 16, this[e + 3] = t >>> 24, e + 4
                }, c.prototype.writeInt32BE = function(t, e, r) {
                    return t = +t, e >>>= 0, r || U(this, t, e, 4, 2147483647, -2147483648), t < 0 && (t = 4294967295 + t + 1), this[e] = t >>> 24, this[e + 1] = t >>> 16, this[e + 2] = t >>> 8, this[e + 3] = 255 & t, e + 4
                }, c.prototype.writeBigInt64LE = Y((function(t, e = 0) {
                    return M(this, t, e, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"))
                })), c.prototype.writeBigInt64BE = Y((function(t, e = 0) {
                    return R(this, t, e, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"))
                })), c.prototype.writeFloatLE = function(t, e, r) {
                    return D(this, t, e, !0, r)
                }, c.prototype.writeFloatBE = function(t, e, r) {
                    return D(this, t, e, !1, r)
                }, c.prototype.writeDoubleLE = function(t, e, r) {
                    return N(this, t, e, !0, r)
                }, c.prototype.writeDoubleBE = function(t, e, r) {
                    return N(this, t, e, !1, r)
                }, c.prototype.copy = function(t, e, r, n) {
                    if (!c.isBuffer(t)) throw new TypeError("argument should be a Buffer");
                    if (r || (r = 0), n || 0 === n || (n = this.length), e >= t.length && (e = t.length), e || (e = 0), n > 0 && n < r && (n = r), n === r) return 0;
                    if (0 === t.length || 0 === this.length) return 0;
                    if (e < 0) throw new RangeError("targetStart out of bounds");
                    if (r < 0 || r >= this.length) throw new RangeError("Index out of range");
                    if (n < 0) throw new RangeError("sourceEnd out of bounds");
                    n > this.length && (n = this.length), t.length - e < n - r && (n = t.length - e + r);
                    const i = n - r;
                    return this === t && "function" == typeof Uint8Array.prototype.copyWithin ? this.copyWithin(e, r, n) : Uint8Array.prototype.set.call(t, this.subarray(r, n), e), i
                }, c.prototype.fill = function(t, e, r, n) {
                    if ("string" == typeof t) {
                        if ("string" == typeof e ? (n = e, e = 0, r = this.length) : "string" == typeof r && (n = r, r = this.length), void 0 !== n && "string" != typeof n) throw new TypeError("encoding must be a string");
                        if ("string" == typeof n && !c.isEncoding(n)) throw new TypeError("Unknown encoding: " + n);
                        if (1 === t.length) {
                            const e = t.charCodeAt(0);
                            ("utf8" === n && e < 128 || "latin1" === n) && (t = e)
                        }
                    } else "number" == typeof t ? t &= 255 : "boolean" == typeof t && (t = Number(t));
                    if (e < 0 || this.length < e || this.length < r) throw new RangeError("Out of range index");
                    if (r <= e) return this;
                    let i;
                    if (e >>>= 0, r = void 0 === r ? this.length : r >>> 0, t || (t = 0), "number" == typeof t)
                        for (i = e; i < r; ++i) this[i] = t;
                    else {
                        const o = c.isBuffer(t) ? t : c.from(t, n),
                            s = o.length;
                        if (0 === s) throw new TypeError('The value "' + t + '" is invalid for argument "value"');
                        for (i = 0; i < r - e; ++i) this[i + e] = o[i % s]
                    }
                    return this
                };
                const I = {};

                function L(t, e, r) {
                    I[t] = class extends r {
                        constructor() {
                            super(), Object.defineProperty(this, "message", {
                                value: e.apply(this, arguments),
                                writable: !0,
                                configurable: !0
                            }), this.name = `${this.name} [${t}]`, this.stack, delete this.name
                        }
                        get code() {
                            return t
                        }
                        set code(t) {
                            Object.defineProperty(this, "code", {
                                configurable: !0,
                                enumerable: !0,
                                value: t,
                                writable: !0
                            })
                        }
                        toString() {
                            return `${this.name} [${t}]: ${this.message}`
                        }
                    }
                }

                function q(t) {
                    let e = "",
                        r = t.length;
                    const n = "-" === t[0] ? 1 : 0;
                    for (; r >= n + 4; r -= 3) e = `_${t.slice(r - 3, r)}${e}`;
                    return `${t.slice(0, r)}${e}`
                }

                function F(t, e, r, n, i, o) {
                    if (t > r || t < e) {
                        const n = "bigint" == typeof e ? "n" : "";
                        let i;
                        throw i = o > 3 ? 0 === e || e === BigInt(0) ? `>= 0${n} and < 2${n} ** ${8 * (o + 1)}${n}` : `>= -(2${n} ** ${8 * (o + 1) - 1}${n}) and < 2 ** ${8 * (o + 1) - 1}${n}` : `>= ${e}${n} and <= ${r}${n}`, new I.ERR_OUT_OF_RANGE("value", i, t)
                    }! function(t, e, r) {
                        K(e, "offset"), void 0 !== t[e] && void 0 !== t[e + r] || J(e, t.length - (r + 1))
                    }(n, i, o)
                }

                function K(t, e) {
                    if ("number" != typeof t) throw new I.ERR_INVALID_ARG_TYPE(e, "number", t)
                }

                function J(t, e, r) {
                    if (Math.floor(t) !== t) throw K(t, r), new I.ERR_OUT_OF_RANGE(r || "offset", "an integer", t);
                    if (e < 0) throw new I.ERR_BUFFER_OUT_OF_BOUNDS;
                    throw new I.ERR_OUT_OF_RANGE(r || "offset", `>= ${r ? 1 : 0} and <= ${e}`, t)
                }
                L("ERR_BUFFER_OUT_OF_BOUNDS", (function(t) {
                    return t ? `${t} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds"
                }), RangeError), L("ERR_INVALID_ARG_TYPE", (function(t, e) {
                    return `The "${t}" argument must be of type number. Received type ${typeof e}`
                }), TypeError), L("ERR_OUT_OF_RANGE", (function(t, e, r) {
                    let n = `The value of "${t}" is out of range.`,
                        i = r;
                    return Number.isInteger(r) && Math.abs(r) > 2 ** 32 ? i = q(String(r)) : "bigint" == typeof r && (i = String(r), (r > BigInt(2) ** BigInt(32) || r < -(BigInt(2) ** BigInt(32))) && (i = q(i)), i += "n"), n += ` It must be ${e}. Received ${i}`, n
                }), RangeError);
                const H = /[^+/0-9A-Za-z-_]/g;

                function W(t, e) {
                    let r;
                    e = e || 1 / 0;
                    const n = t.length;
                    let i = null;
                    const o = [];
                    for (let s = 0; s < n; ++s) {
                        if (r = t.charCodeAt(s), r > 55295 && r < 57344) {
                            if (!i) {
                                if (r > 56319) {
                                    (e -= 3) > -1 && o.push(239, 191, 189);
                                    continue
                                }
                                if (s + 1 === n) {
                                    (e -= 3) > -1 && o.push(239, 191, 189);
                                    continue
                                }
                                i = r;
                                continue
                            }
                            if (r < 56320) {
                                (e -= 3) > -1 && o.push(239, 191, 189), i = r;
                                continue
                            }
                            r = 65536 + (i - 55296 << 10 | r - 56320)
                        } else i && (e -= 3) > -1 && o.push(239, 191, 189);
                        if (i = null, r < 128) {
                            if ((e -= 1) < 0) break;
                            o.push(r)
                        } else if (r < 2048) {
                            if ((e -= 2) < 0) break;
                            o.push(r >> 6 | 192, 63 & r | 128)
                        } else if (r < 65536) {
                            if ((e -= 3) < 0) break;
                            o.push(r >> 12 | 224, r >> 6 & 63 | 128, 63 & r | 128)
                        } else {
                            if (!(r < 1114112)) throw new Error("Invalid code point");
                            if ((e -= 4) < 0) break;
                            o.push(r >> 18 | 240, r >> 12 & 63 | 128, r >> 6 & 63 | 128, 63 & r | 128)
                        }
                    }
                    return o
                }

                function $(t) {
                    return n.toByteArray(function(t) {
                        if ((t = (t = t.split("=")[0]).trim().replace(H, "")).length < 2) return "";
                        for (; t.length % 4 != 0;) t += "=";
                        return t
                    }(t))
                }

                function V(t, e, r, n) {
                    let i;
                    for (i = 0; i < n && !(i + r >= e.length || i >= t.length); ++i) e[i + r] = t[i];
                    return i
                }

                function X(t, e) {
                    return t instanceof e || null != t && null != t.constructor && null != t.constructor.name && t.constructor.name === e.name
                }

                function G(t) {
                    return t != t
                }
                const Z = function() {
                    const t = "0123456789abcdef",
                        e = new Array(256);
                    for (let r = 0; r < 16; ++r) {
                        const n = 16 * r;
                        for (let i = 0; i < 16; ++i) e[n + i] = t[r] + t[i]
                    }
                    return e
                }();

                function Y(t) {
                    return "undefined" == typeof BigInt ? Q : t
                }

                function Q() {
                    throw new Error("BigInt not supported")
                }
            },
            6077: t => {
                var e = [].slice;
                t.exports = function(t, r) {
                    if ("string" == typeof r && (r = t[r]), "function" != typeof r) throw new Error("bind() requires a function");
                    var n = e.call(arguments, 2);
                    return function() {
                        return r.apply(t, n.concat(e.call(arguments)))
                    }
                }
            },
            8767: t => {
                function e(t) {
                    if (t) return function(t) {
                        for (var r in e.prototype) t[r] = e.prototype[r];
                        return t
                    }(t)
                }
                t.exports = e, e.prototype.on = e.prototype.addEventListener = function(t, e) {
                    return this._callbacks = this._callbacks || {}, (this._callbacks["$" + t] = this._callbacks["$" + t] || []).push(e), this
                }, e.prototype.once = function(t, e) {
                    function r() {
                        this.off(t, r), e.apply(this, arguments)
                    }
                    return r.fn = e, this.on(t, r), this
                }, e.prototype.off = e.prototype.removeListener = e.prototype.removeAllListeners = e.prototype.removeEventListener = function(t, e) {
                    if (this._callbacks = this._callbacks || {}, 0 == arguments.length) return this._callbacks = {}, this;
                    var r, n = this._callbacks["$" + t];
                    if (!n) return this;
                    if (1 == arguments.length) return delete this._callbacks["$" + t], this;
                    for (var i = 0; i < n.length; i++)
                        if ((r = n[i]) === e || r.fn === e) {
                            n.splice(i, 1);
                            break
                        } return 0 === n.length && delete this._callbacks["$" + t], this
                }, e.prototype.emit = function(t) {
                    this._callbacks = this._callbacks || {};
                    for (var e = new Array(arguments.length - 1), r = this._callbacks["$" + t], n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
                    if (r) {
                        n = 0;
                        for (var i = (r = r.slice(0)).length; n < i; ++n) r[n].apply(this, e)
                    }
                    return this
                }, e.prototype.listeners = function(t) {
                    return this._callbacks = this._callbacks || {}, this._callbacks["$" + t] || []
                }, e.prototype.hasListeners = function(t) {
                    return !!this.listeners(t).length
                }
            },
            3861: t => {
                t.exports = function(t, e) {
                    var r = function() {};
                    r.prototype = e.prototype, t.prototype = new r, t.prototype.constructor = t
                }
            },
            4098: function(t, e) {
                var r = "undefined" != typeof self ? self : this,
                    n = function() {
                        function t() {
                            this.fetch = !1, this.DOMException = r.DOMException
                        }
                        return t.prototype = r, new t
                    }();
                ! function(t) {
                    ! function(e) {
                        var r = "URLSearchParams" in t,
                            n = "Symbol" in t && "iterator" in Symbol,
                            i = "FileReader" in t && "Blob" in t && function() {
                                try {
                                    return new Blob, !0
                                } catch (t) {
                                    return !1
                                }
                            }(),
                            o = "FormData" in t,
                            s = "ArrayBuffer" in t;
                        if (s) var a = ["[object Int8Array]", "[object Uint8Array]", "[object Uint8ClampedArray]", "[object Int16Array]", "[object Uint16Array]", "[object Int32Array]", "[object Uint32Array]", "[object Float32Array]", "[object Float64Array]"],
                            c = ArrayBuffer.isView || function(t) {
                                return t && a.indexOf(Object.prototype.toString.call(t)) > -1
                            };

                        function u(t) {
                            if ("string" != typeof t && (t = String(t)), /[^a-z0-9\-#$%&'*+.^_`|~]/i.test(t)) throw new TypeError("Invalid character in header field name");
                            return t.toLowerCase()
                        }

                        function h(t) {
                            return "string" != typeof t && (t = String(t)), t
                        }

                        function f(t) {
                            var e = {
                                next: function() {
                                    var e = t.shift();
                                    return {
                                        done: void 0 === e,
                                        value: e
                                    }
                                }
                            };
                            return n && (e[Symbol.iterator] = function() {
                                return e
                            }), e
                        }

                        function l(t) {
                            this.map = {}, t instanceof l ? t.forEach((function(t, e) {
                                this.append(e, t)
                            }), this) : Array.isArray(t) ? t.forEach((function(t) {
                                this.append(t[0], t[1])
                            }), this) : t && Object.getOwnPropertyNames(t).forEach((function(e) {
                                this.append(e, t[e])
                            }), this)
                        }

                        function p(t) {
                            if (t.bodyUsed) return Promise.reject(new TypeError("Already read"));
                            t.bodyUsed = !0
                        }

                        function d(t) {
                            return new Promise((function(e, r) {
                                t.onload = function() {
                                    e(t.result)
                                }, t.onerror = function() {
                                    r(t.error)
                                }
                            }))
                        }

                        function y(t) {
                            var e = new FileReader,
                                r = d(e);
                            return e.readAsArrayBuffer(t), r
                        }

                        function g(t) {
                            if (t.slice) return t.slice(0);
                            var e = new Uint8Array(t.byteLength);
                            return e.set(new Uint8Array(t)), e.buffer
                        }

                        function m() {
                            return this.bodyUsed = !1, this._initBody = function(t) {
                                var e;
                                this._bodyInit = t, t ? "string" == typeof t ? this._bodyText = t : i && Blob.prototype.isPrototypeOf(t) ? this._bodyBlob = t : o && FormData.prototype.isPrototypeOf(t) ? this._bodyFormData = t : r && URLSearchParams.prototype.isPrototypeOf(t) ? this._bodyText = t.toString() : s && i && (e = t) && DataView.prototype.isPrototypeOf(e) ? (this._bodyArrayBuffer = g(t.buffer), this._bodyInit = new Blob([this._bodyArrayBuffer])) : s && (ArrayBuffer.prototype.isPrototypeOf(t) || c(t)) ? this._bodyArrayBuffer = g(t) : this._bodyText = t = Object.prototype.toString.call(t) : this._bodyText = "", this.headers.get("content-type") || ("string" == typeof t ? this.headers.set("content-type", "text/plain;charset=UTF-8") : this._bodyBlob && this._bodyBlob.type ? this.headers.set("content-type", this._bodyBlob.type) : r && URLSearchParams.prototype.isPrototypeOf(t) && this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8"))
                            }, i && (this.blob = function() {
                                var t = p(this);
                                if (t) return t;
                                if (this._bodyBlob) return Promise.resolve(this._bodyBlob);
                                if (this._bodyArrayBuffer) return Promise.resolve(new Blob([this._bodyArrayBuffer]));
                                if (this._bodyFormData) throw new Error("could not read FormData body as blob");
                                return Promise.resolve(new Blob([this._bodyText]))
                            }, this.arrayBuffer = function() {
                                return this._bodyArrayBuffer ? p(this) || Promise.resolve(this._bodyArrayBuffer) : this.blob().then(y)
                            }), this.text = function() {
                                var t, e, r, n = p(this);
                                if (n) return n;
                                if (this._bodyBlob) return t = this._bodyBlob, r = d(e = new FileReader), e.readAsText(t), r;
                                if (this._bodyArrayBuffer) return Promise.resolve(function(t) {
                                    for (var e = new Uint8Array(t), r = new Array(e.length), n = 0; n < e.length; n++) r[n] = String.fromCharCode(e[n]);
                                    return r.join("")
                                }(this._bodyArrayBuffer));
                                if (this._bodyFormData) throw new Error("could not read FormData body as text");
                                return Promise.resolve(this._bodyText)
                            }, o && (this.formData = function() {
                                return this.text().then(b)
                            }), this.json = function() {
                                return this.text().then(JSON.parse)
                            }, this
                        }
                        l.prototype.append = function(t, e) {
                            t = u(t), e = h(e);
                            var r = this.map[t];
                            this.map[t] = r ? r + ", " + e : e
                        }, l.prototype.delete = function(t) {
                            delete this.map[u(t)]
                        }, l.prototype.get = function(t) {
                            return t = u(t), this.has(t) ? this.map[t] : null
                        }, l.prototype.has = function(t) {
                            return this.map.hasOwnProperty(u(t))
                        }, l.prototype.set = function(t, e) {
                            this.map[u(t)] = h(e)
                        }, l.prototype.forEach = function(t, e) {
                            for (var r in this.map) this.map.hasOwnProperty(r) && t.call(e, this.map[r], r, this)
                        }, l.prototype.keys = function() {
                            var t = [];
                            return this.forEach((function(e, r) {
                                t.push(r)
                            })), f(t)
                        }, l.prototype.values = function() {
                            var t = [];
                            return this.forEach((function(e) {
                                t.push(e)
                            })), f(t)
                        }, l.prototype.entries = function() {
                            var t = [];
                            return this.forEach((function(e, r) {
                                t.push([r, e])
                            })), f(t)
                        }, n && (l.prototype[Symbol.iterator] = l.prototype.entries);
                        var v = ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"];

                        function w(t, e) {
                            var r, n, i = (e = e || {}).body;
                            if (t instanceof w) {
                                if (t.bodyUsed) throw new TypeError("Already read");
                                this.url = t.url, this.credentials = t.credentials, e.headers || (this.headers = new l(t.headers)), this.method = t.method, this.mode = t.mode, this.signal = t.signal, i || null == t._bodyInit || (i = t._bodyInit, t.bodyUsed = !0)
                            } else this.url = String(t);
                            if (this.credentials = e.credentials || this.credentials || "same-origin", !e.headers && this.headers || (this.headers = new l(e.headers)), this.method = (n = (r = e.method || this.method || "GET").toUpperCase(), v.indexOf(n) > -1 ? n : r), this.mode = e.mode || this.mode || null, this.signal = e.signal || this.signal, this.referrer = null, ("GET" === this.method || "HEAD" === this.method) && i) throw new TypeError("Body not allowed for GET or HEAD requests");
                            this._initBody(i)
                        }

                        function b(t) {
                            var e = new FormData;
                            return t.trim().split("&").forEach((function(t) {
                                if (t) {
                                    var r = t.split("="),
                                        n = r.shift().replace(/\+/g, " "),
                                        i = r.join("=").replace(/\+/g, " ");
                                    e.append(decodeURIComponent(n), decodeURIComponent(i))
                                }
                            })), e
                        }

                        function _(t, e) {
                            e || (e = {}), this.type = "default", this.status = void 0 === e.status ? 200 : e.status, this.ok = this.status >= 200 && this.status < 300, this.statusText = "statusText" in e ? e.statusText : "OK", this.headers = new l(e.headers), this.url = e.url || "", this._initBody(t)
                        }
                        w.prototype.clone = function() {
                            return new w(this, {
                                body: this._bodyInit
                            })
                        }, m.call(w.prototype), m.call(_.prototype), _.prototype.clone = function() {
                            return new _(this._bodyInit, {
                                status: this.status,
                                statusText: this.statusText,
                                headers: new l(this.headers),
                                url: this.url
                            })
                        }, _.error = function() {
                            var t = new _(null, {
                                status: 0,
                                statusText: ""
                            });
                            return t.type = "error", t
                        };
                        var A = [301, 302, 303, 307, 308];
                        _.redirect = function(t, e) {
                            if (-1 === A.indexOf(e)) throw new RangeError("Invalid status code");
                            return new _(null, {
                                status: e,
                                headers: {
                                    location: t
                                }
                            })
                        }, e.DOMException = t.DOMException;
                        try {
                            new e.DOMException
                        } catch (t) {
                            e.DOMException = function(t, e) {
                                this.message = t, this.name = e;
                                var r = Error(t);
                                this.stack = r.stack
                            }, e.DOMException.prototype = Object.create(Error.prototype), e.DOMException.prototype.constructor = e.DOMException
                        }

                        function E(t, r) {
                            return new Promise((function(n, o) {
                                var s = new w(t, r);
                                if (s.signal && s.signal.aborted) return o(new e.DOMException("Aborted", "AbortError"));
                                var a = new XMLHttpRequest;

                                function c() {
                                    a.abort()
                                }
                                a.onload = function() {
                                    var t, e, r = {
                                        status: a.status,
                                        statusText: a.statusText,
                                        headers: (t = a.getAllResponseHeaders() || "", e = new l, t.replace(/\r?\n[\t ]+/g, " ").split(/\r?\n/).forEach((function(t) {
                                            var r = t.split(":"),
                                                n = r.shift().trim();
                                            if (n) {
                                                var i = r.join(":").trim();
                                                e.append(n, i)
                                            }
                                        })), e)
                                    };
                                    r.url = "responseURL" in a ? a.responseURL : r.headers.get("X-Request-URL");
                                    var i = "response" in a ? a.response : a.responseText;
                                    n(new _(i, r))
                                }, a.onerror = function() {
                                    o(new TypeError("Network request failed"))
                                }, a.ontimeout = function() {
                                    o(new TypeError("Network request failed"))
                                }, a.onabort = function() {
                                    o(new e.DOMException("Aborted", "AbortError"))
                                }, a.open(s.method, s.url, !0), "include" === s.credentials ? a.withCredentials = !0 : "omit" === s.credentials && (a.withCredentials = !1), "responseType" in a && i && (a.responseType = "blob"), s.headers.forEach((function(t, e) {
                                    a.setRequestHeader(e, t)
                                })), s.signal && (s.signal.addEventListener("abort", c), a.onreadystatechange = function() {
                                    4 === a.readyState && s.signal.removeEventListener("abort", c)
                                }), a.send(void 0 === s._bodyInit ? null : s._bodyInit)
                            }))
                        }
                        E.polyfill = !0, t.fetch || (t.fetch = E, t.Headers = l, t.Request = w, t.Response = _), e.Headers = l, e.Request = w, e.Response = _, e.fetch = E, Object.defineProperty(e, "__esModule", {
                            value: !0
                        })
                    }({})
                }(n), n.fetch.ponyfill = !0, delete n.fetch.polyfill;
                var i = n;
                (e = i.fetch).default = i.fetch, e.fetch = i.fetch, e.Headers = i.Headers, e.Request = i.Request, e.Response = i.Response, t.exports = e
            },
            7187: t => {
                "use strict";
                var e, r = "object" == typeof Reflect ? Reflect : null,
                    n = r && "function" == typeof r.apply ? r.apply : function(t, e, r) {
                        return Function.prototype.apply.call(t, e, r)
                    };
                e = r && "function" == typeof r.ownKeys ? r.ownKeys : Object.getOwnPropertySymbols ? function(t) {
                    return Object.getOwnPropertyNames(t).concat(Object.getOwnPropertySymbols(t))
                } : function(t) {
                    return Object.getOwnPropertyNames(t)
                };
                var i = Number.isNaN || function(t) {
                    return t != t
                };

                function o() {
                    o.init.call(this)
                }
                t.exports = o, t.exports.once = function(t, e) {
                    return new Promise((function(r, n) {
                        function i(r) {
                            t.removeListener(e, o), n(r)
                        }

                        function o() {
                            "function" == typeof t.removeListener && t.removeListener("error", i), r([].slice.call(arguments))
                        }
                        y(t, e, o, {
                            once: !0
                        }), "error" !== e && function(t, e, r) {
                            "function" == typeof t.on && y(t, "error", e, {
                                once: !0
                            })
                        }(t, i)
                    }))
                }, o.EventEmitter = o, o.prototype._events = void 0, o.prototype._eventsCount = 0, o.prototype._maxListeners = void 0;
                var s = 10;

                function a(t) {
                    if ("function" != typeof t) throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof t)
                }

                function c(t) {
                    return void 0 === t._maxListeners ? o.defaultMaxListeners : t._maxListeners
                }

                function u(t, e, r, n) {
                    var i, o, s, u;
                    if (a(r), void 0 === (o = t._events) ? (o = t._events = Object.create(null), t._eventsCount = 0) : (void 0 !== o.newListener && (t.emit("newListener", e, r.listener ? r.listener : r), o = t._events), s = o[e]), void 0 === s) s = o[e] = r, ++t._eventsCount;
                    else if ("function" == typeof s ? s = o[e] = n ? [r, s] : [s, r] : n ? s.unshift(r) : s.push(r), (i = c(t)) > 0 && s.length > i && !s.warned) {
                        s.warned = !0;
                        var h = new Error("Possible EventEmitter memory leak detected. " + s.length + " " + String(e) + " listeners added. Use emitter.setMaxListeners() to increase limit");
                        h.name = "MaxListenersExceededWarning", h.emitter = t, h.type = e, h.count = s.length, u = h, console && console.warn && console.warn(u)
                    }
                    return t
                }

                function h() {
                    if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, 0 === arguments.length ? this.listener.call(this.target) : this.listener.apply(this.target, arguments)
                }

                function f(t, e, r) {
                    var n = {
                            fired: !1,
                            wrapFn: void 0,
                            target: t,
                            type: e,
                            listener: r
                        },
                        i = h.bind(n);
                    return i.listener = r, n.wrapFn = i, i
                }

                function l(t, e, r) {
                    var n = t._events;
                    if (void 0 === n) return [];
                    var i = n[e];
                    return void 0 === i ? [] : "function" == typeof i ? r ? [i.listener || i] : [i] : r ? function(t) {
                        for (var e = new Array(t.length), r = 0; r < e.length; ++r) e[r] = t[r].listener || t[r];
                        return e
                    }(i) : d(i, i.length)
                }

                function p(t) {
                    var e = this._events;
                    if (void 0 !== e) {
                        var r = e[t];
                        if ("function" == typeof r) return 1;
                        if (void 0 !== r) return r.length
                    }
                    return 0
                }

                function d(t, e) {
                    for (var r = new Array(e), n = 0; n < e; ++n) r[n] = t[n];
                    return r
                }

                function y(t, e, r, n) {
                    if ("function" == typeof t.on) n.once ? t.once(e, r) : t.on(e, r);
                    else {
                        if ("function" != typeof t.addEventListener) throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof t);
                        t.addEventListener(e, (function i(o) {
                            n.once && t.removeEventListener(e, i), r(o)
                        }))
                    }
                }
                Object.defineProperty(o, "defaultMaxListeners", {
                    enumerable: !0,
                    get: function() {
                        return s
                    },
                    set: function(t) {
                        if ("number" != typeof t || t < 0 || i(t)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + t + ".");
                        s = t
                    }
                }), o.init = function() {
                    void 0 !== this._events && this._events !== Object.getPrototypeOf(this)._events || (this._events = Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0
                }, o.prototype.setMaxListeners = function(t) {
                    if ("number" != typeof t || t < 0 || i(t)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + t + ".");
                    return this._maxListeners = t, this
                }, o.prototype.getMaxListeners = function() {
                    return c(this)
                }, o.prototype.emit = function(t) {
                    for (var e = [], r = 1; r < arguments.length; r++) e.push(arguments[r]);
                    var i = "error" === t,
                        o = this._events;
                    if (void 0 !== o) i = i && void 0 === o.error;
                    else if (!i) return !1;
                    if (i) {
                        var s;
                        if (e.length > 0 && (s = e[0]), s instanceof Error) throw s;
                        var a = new Error("Unhandled error." + (s ? " (" + s.message + ")" : ""));
                        throw a.context = s, a
                    }
                    var c = o[t];
                    if (void 0 === c) return !1;
                    if ("function" == typeof c) n(c, this, e);
                    else {
                        var u = c.length,
                            h = d(c, u);
                        for (r = 0; r < u; ++r) n(h[r], this, e)
                    }
                    return !0
                }, o.prototype.addListener = function(t, e) {
                    return u(this, t, e, !1)
                }, o.prototype.on = o.prototype.addListener, o.prototype.prependListener = function(t, e) {
                    return u(this, t, e, !0)
                }, o.prototype.once = function(t, e) {
                    return a(e), this.on(t, f(this, t, e)), this
                }, o.prototype.prependOnceListener = function(t, e) {
                    return a(e), this.prependListener(t, f(this, t, e)), this
                }, o.prototype.removeListener = function(t, e) {
                    var r, n, i, o, s;
                    if (a(e), void 0 === (n = this._events)) return this;
                    if (void 0 === (r = n[t])) return this;
                    if (r === e || r.listener === e) 0 == --this._eventsCount ? this._events = Object.create(null) : (delete n[t], n.removeListener && this.emit("removeListener", t, r.listener || e));
                    else if ("function" != typeof r) {
                        for (i = -1, o = r.length - 1; o >= 0; o--)
                            if (r[o] === e || r[o].listener === e) {
                                s = r[o].listener, i = o;
                                break
                            } if (i < 0) return this;
                        0 === i ? r.shift() : function(t, e) {
                            for (; e + 1 < t.length; e++) t[e] = t[e + 1];
                            t.pop()
                        }(r, i), 1 === r.length && (n[t] = r[0]), void 0 !== n.removeListener && this.emit("removeListener", t, s || e)
                    }
                    return this
                }, o.prototype.off = o.prototype.removeListener, o.prototype.removeAllListeners = function(t) {
                    var e, r, n;
                    if (void 0 === (r = this._events)) return this;
                    if (void 0 === r.removeListener) return 0 === arguments.length ? (this._events = Object.create(null), this._eventsCount = 0) : void 0 !== r[t] && (0 == --this._eventsCount ? this._events = Object.create(null) : delete r[t]), this;
                    if (0 === arguments.length) {
                        var i, o = Object.keys(r);
                        for (n = 0; n < o.length; ++n) "removeListener" !== (i = o[n]) && this.removeAllListeners(i);
                        return this.removeAllListeners("removeListener"), this._events = Object.create(null), this._eventsCount = 0, this
                    }
                    if ("function" == typeof(e = r[t])) this.removeListener(t, e);
                    else if (void 0 !== e)
                        for (n = e.length - 1; n >= 0; n--) this.removeListener(t, e[n]);
                    return this
                }, o.prototype.listeners = function(t) {
                    return l(this, t, !0)
                }, o.prototype.rawListeners = function(t) {
                    return l(this, t, !1)
                }, o.listenerCount = function(t, e) {
                    return "function" == typeof t.listenerCount ? t.listenerCount(e) : p.call(t, e)
                }, o.prototype.listenerCount = p, o.prototype.eventNames = function() {
                    return this._eventsCount > 0 ? e(this._events) : []
                }
            },
            3466: (t, e, r) => {
                var n = r(8764).Buffer,
                    i = r(579),
                    o = Object.prototype.toString,
                    s = "function" == typeof Blob || "undefined" != typeof Blob && "[object BlobConstructor]" === o.call(Blob),
                    a = "function" == typeof File || "undefined" != typeof File && "[object FileConstructor]" === o.call(File);
                t.exports = function t(e) {
                    if (!e || "object" != typeof e) return !1;
                    if (i(e)) {
                        for (var r = 0, o = e.length; r < o; r++)
                            if (t(e[r])) return !0;
                        return !1
                    }
                    if ("function" == typeof n && n.isBuffer && n.isBuffer(e) || "function" == typeof ArrayBuffer && e instanceof ArrayBuffer || s && e instanceof Blob || a && e instanceof File) return !0;
                    if (e.toJSON && "function" == typeof e.toJSON && 1 === arguments.length) return t(e.toJSON(), !0);
                    for (var c in e)
                        if (Object.prototype.hasOwnProperty.call(e, c) && t(e[c])) return !0;
                    return !1
                }
            },
            579: t => {
                var e = {}.toString;
                t.exports = Array.isArray || function(t) {
                    return "[object Array]" == e.call(t)
                }
            },
            8058: t => {
                try {
                    t.exports = "undefined" != typeof XMLHttpRequest && "withCredentials" in new XMLHttpRequest
                } catch (e) {
                    t.exports = !1
                }
            },
            645: (t, e) => {
                e.read = function(t, e, r, n, i) {
                    var o, s, a = 8 * i - n - 1,
                        c = (1 << a) - 1,
                        u = c >> 1,
                        h = -7,
                        f = r ? i - 1 : 0,
                        l = r ? -1 : 1,
                        p = t[e + f];
                    for (f += l, o = p & (1 << -h) - 1, p >>= -h, h += a; h > 0; o = 256 * o + t[e + f], f += l, h -= 8);
                    for (s = o & (1 << -h) - 1, o >>= -h, h += n; h > 0; s = 256 * s + t[e + f], f += l, h -= 8);
                    if (0 === o) o = 1 - u;
                    else {
                        if (o === c) return s ? NaN : 1 / 0 * (p ? -1 : 1);
                        s += Math.pow(2, n), o -= u
                    }
                    return (p ? -1 : 1) * s * Math.pow(2, o - n)
                }, e.write = function(t, e, r, n, i, o) {
                    var s, a, c, u = 8 * o - i - 1,
                        h = (1 << u) - 1,
                        f = h >> 1,
                        l = 23 === i ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
                        p = n ? 0 : o - 1,
                        d = n ? 1 : -1,
                        y = e < 0 || 0 === e && 1 / e < 0 ? 1 : 0;
                    for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (a = isNaN(e) ? 1 : 0, s = h) : (s = Math.floor(Math.log(e) / Math.LN2), e * (c = Math.pow(2, -s)) < 1 && (s--, c *= 2), (e += s + f >= 1 ? l / c : l * Math.pow(2, 1 - f)) * c >= 2 && (s++, c /= 2), s + f >= h ? (a = 0, s = h) : s + f >= 1 ? (a = (e * c - 1) * Math.pow(2, i), s += f) : (a = e * Math.pow(2, f - 1) * Math.pow(2, i), s = 0)); i >= 8; t[r + p] = 255 & a, p += d, a /= 256, i -= 8);
                    for (s = s << i | a, u += i; u > 0; t[r + p] = 255 & s, p += d, s /= 256, u -= 8);
                    t[r + p - d] |= 128 * y
                }
            },
            7355: t => {
                var e = [].indexOf;
                t.exports = function(t, r) {
                    if (e) return t.indexOf(r);
                    for (var n = 0; n < t.length; ++n)
                        if (t[n] === r) return n;
                    return -1
                }
            },
            1166: function(t, e, r) {
                var n = r(8764).Buffer;
                ! function(t) {
                    var e, r = "undefined",
                        i = r !== typeof n && n,
                        o = r !== typeof Uint8Array && Uint8Array,
                        s = r !== typeof ArrayBuffer && ArrayBuffer,
                        a = [0, 0, 0, 0, 0, 0, 0, 0],
                        c = Array.isArray || function(t) {
                            return !!t && "[object Array]" == Object.prototype.toString.call(t)
                        },
                        u = 4294967296;

                    function h(n, c, h) {
                        var _ = c ? 0 : 4,
                            A = c ? 4 : 0,
                            E = c ? 0 : 3,
                            x = c ? 1 : 2,
                            k = c ? 2 : 1,
                            S = c ? 3 : 0,
                            B = c ? m : w,
                            O = c ? v : b,
                            C = z.prototype,
                            T = "is" + n,
                            P = "_" + T;
                        return C.buffer = void 0, C.offset = 0, C[P] = !0, C.toNumber = U, C.toString = function(t) {
                            var e = this.buffer,
                                r = this.offset,
                                n = R(e, r + _),
                                i = R(e, r + A),
                                o = "",
                                s = !h && 2147483648 & n;
                            for (s && (n = ~n, i = u - i), t = t || 10;;) {
                                var a = n % t * u + i;
                                if (n = Math.floor(n / t), i = Math.floor(a / t), o = (a % t).toString(t) + o, !n && !i) break
                            }
                            return s && (o = "-" + o), o
                        }, C.toJSON = U, C.toArray = f, i && (C.toBuffer = l), o && (C.toArrayBuffer = p), z[T] = function(t) {
                            return !(!t || !t[P])
                        }, t[n] = z, z;

                        function z(t, n, c, h) {
                            return this instanceof z ? function(t, n, c, h, f) {
                                if (o && s && (n instanceof s && (n = new o(n)), h instanceof s && (h = new o(h))), n || c || h || e) {
                                    if (!d(n, c)) {
                                        var l = e || Array;
                                        f = c, h = n, c = 0, n = e === i ? i.alloc(8) : new l(8)
                                    }
                                    t.buffer = n, t.offset = c |= 0, r !== typeof h && ("string" == typeof h ? function(t, e, r, n) {
                                        var i = 0,
                                            o = r.length,
                                            s = 0,
                                            a = 0;
                                        "-" === r[0] && i++;
                                        for (var c = i; i < o;) {
                                            var h = parseInt(r[i++], n);
                                            if (!(h >= 0)) break;
                                            a = a * n + h, s = s * n + Math.floor(a / u), a %= u
                                        }
                                        c && (s = ~s, a ? a = u - a : s++), M(t, e + _, s), M(t, e + A, a)
                                    }(n, c, h, f || 10) : d(h, f) ? y(n, c, h, f) : "number" == typeof f ? (M(n, c + _, h), M(n, c + A, f)) : h > 0 ? B(n, c, h) : h < 0 ? O(n, c, h) : y(n, c, a, 0))
                                } else t.buffer = g(a, 0)
                            }(this, t, n, c, h) : new z(t, n, c, h)
                        }

                        function U() {
                            var t = this.buffer,
                                e = this.offset,
                                r = R(t, e + _),
                                n = R(t, e + A);
                            return h || (r |= 0), r ? r * u + n : n
                        }

                        function M(t, e, r) {
                            t[e + S] = 255 & r, r >>= 8, t[e + k] = 255 & r, r >>= 8, t[e + x] = 255 & r, r >>= 8, t[e + E] = 255 & r
                        }

                        function R(t, e) {
                            return 16777216 * t[e + E] + (t[e + x] << 16) + (t[e + k] << 8) + t[e + S]
                        }
                    }

                    function f(t) {
                        var r = this.buffer,
                            n = this.offset;
                        return e = null, !1 !== t && c(r) ? 8 === r.length ? r : r.slice(n, n + 8) : g(r, n)
                    }

                    function l(t) {
                        var r = this.buffer,
                            n = this.offset;
                        return e = i, !1 !== t && i.isBuffer(r) ? 8 === r.length ? r : r.slice(n, n + 8) : i.from(p.call(this, t))
                    }

                    function p(t) {
                        var r = this.buffer,
                            n = this.offset,
                            i = r.buffer;
                        if (e = o, !1 !== t && !r.offset && i instanceof s) return 8 === i.byteLength ? i : i.slice(n, n + 8);
                        var a = new o(8);
                        return y(a, 0, r, n), a.buffer
                    }

                    function d(t, e) {
                        var r = t && t.length;
                        return e |= 0, r && e + 8 <= r && "string" != typeof t[e]
                    }

                    function y(t, e, r, n) {
                        e |= 0, n |= 0;
                        for (var i = 0; i < 8; i++) t[e++] = 255 & r[n++]
                    }

                    function g(t, e) {
                        return Array.prototype.slice.call(t, e, e + 8)
                    }

                    function m(t, e, r) {
                        for (var n = e + 8; n > e;) t[--n] = 255 & r, r /= 256
                    }

                    function v(t, e, r) {
                        var n = e + 8;
                        for (r++; n > e;) t[--n] = 255 & -r ^ 255, r /= 256
                    }

                    function w(t, e, r) {
                        for (var n = e + 8; e < n;) t[e++] = 255 & r, r /= 256
                    }

                    function b(t, e, r) {
                        var n = e + 8;
                        for (r++; e < n;) t[e++] = 255 & -r ^ 255, r /= 256
                    }
                    h("Uint64BE", !0, !0), h("Int64BE", !0, !1), h("Uint64LE", !1, !0), h("Int64LE", !1, !1)
                }("string" != typeof e.nodeName ? e : this || {})
            },
            1830: (t, e) => {
                e.encode = function(t) {
                    var e = "";
                    for (var r in t) t.hasOwnProperty(r) && (e.length && (e += "&"), e += encodeURIComponent(r) + "=" + encodeURIComponent(t[r]));
                    return e
                }, e.decode = function(t) {
                    for (var e = {}, r = t.split("&"), n = 0, i = r.length; n < i; n++) {
                        var o = r[n].split("=");
                        e[decodeURIComponent(o[0])] = decodeURIComponent(o[1])
                    }
                    return e
                }
            },
            4187: t => {
                var e = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
                    r = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
                t.exports = function(t) {
                    var n, i, o = t,
                        s = t.indexOf("["),
                        a = t.indexOf("]"); - 1 != s && -1 != a && (t = t.substring(0, s) + t.substring(s, a).replace(/:/g, ";") + t.substring(a, t.length));
                    for (var c, u, h = e.exec(t || ""), f = {}, l = 14; l--;) f[r[l]] = h[l] || "";
                    return -1 != s && -1 != a && (f.source = o, f.host = f.host.substring(1, f.host.length - 1).replace(/;/g, ":"), f.authority = f.authority.replace("[", "").replace("]", "").replace(/;/g, ":"), f.ipv6uri = !0), f.pathNames = (n = f.path, i = n.replace(/\/{2,9}/g, "/").split("/"), "/" != n.substr(0, 1) && 0 !== n.length || i.splice(0, 1), "/" == n.substr(n.length - 1, 1) && i.splice(i.length - 1, 1), i), f.queryKey = (c = f.query, u = {}, c.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, (function(t, e, r) {
                        e && (u[e] = r)
                    })), u), f
                }
            },
            5746: function(t) {
                t.exports = function() {
                    "use strict";

                    function t(t, e) {
                        if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
                    }

                    function e(t, e) {
                        for (var r = 0; r < e.length; r++) {
                            var n = e[r];
                            n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(t, n.key, n)
                        }
                    }

                    function r(t, r, n) {
                        return r && e(t.prototype, r), n && e(t, n), t
                    }

                    function n(t, e, r) {
                        return e in t ? Object.defineProperty(t, e, {
                            value: r,
                            enumerable: !0,
                            configurable: !0,
                            writable: !0
                        }) : t[e] = r, t
                    }

                    function i(t) {
                        return t = t || Object.create(null), {
                            on: function(e, r) {
                                (t[e] || (t[e] = [])).push(r)
                            },
                            off: function(e, r) {
                                t[e] && t[e].splice(t[e].indexOf(r) >>> 0, 1)
                            },
                            emit: function(e, r) {
                                (t[e] || []).slice().map((function(t) {
                                    t(r)
                                })), (t["*"] || []).slice().map((function(t) {
                                    t(e, r)
                                }))
                            }
                        }
                    }
                    var o = "expiry",
                        s = function(t) {
                            if (t) throw new Error("Cannot use disposed instance.")
                        },
                        a = {
                            expiryCheckInterval: 100
                        },
                        c = function() {
                            function e() {
                                var r = this,
                                    i = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                                t(this, e), n(this, "expire", (function() {
                                    s(r.disposed);
                                    for (var t = Date.now(), e = t; e >= r.lastExpiredTime; e -= 1) {
                                        var n = r.queue[e];
                                        n && (delete r.queue[e], n.forEach((function(t) {
                                            var e = t.key;
                                            return (0, t.onExpire)(e)
                                        })))
                                    }
                                    r.lastExpiredTime = t
                                })), this.config = Object.assign({}, a, i), this.queue = {}, this.disposed = !1, this.lastExpiredTime = Date.now() - 1;
                                var o = this.config.expiryCheckInterval;
                                this.timer = setInterval(this.expire, o)
                            }
                            return r(e, [{
                                key: "add",
                                value: function(t, e, r) {
                                    return s(this.disposed), this.queue[t] || (this.queue[t] = []), this.queue[t].push({
                                        key: e,
                                        onExpire: r
                                    }), !0
                                }
                            }, {
                                key: "remove",
                                value: function(t, e) {
                                    s(this.disposed);
                                    var r = this.queue[t];
                                    if (r) {
                                        var n = r.filter((function(t) {
                                            return t.key !== e
                                        }));
                                        return n.length ? this.queue[t] = n : delete this.queue[t], !0
                                    }
                                    return !1
                                }
                            }, {
                                key: "dispose",
                                value: function() {
                                    return s(this.disposed), clearInterval(this.timer), this.timer = null, this.queue = {}, this.disposed = !0, !0
                                }
                            }]), e
                        }(),
                        u = {
                            defaultCacheExpiryIn: 6e4,
                            expiryCheckInterval: 100
                        };
                    return function() {
                        function e() {
                            var r = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
                                n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : c;
                            t(this, e), this.config = Object.assign({}, u, r);
                            var o = i(),
                                s = [o.on, o.off, o.emit];
                            this.on = s[0], this.off = s[1], this.emit = s[2], this.cacheStore = {}, this.disposed = !1;
                            var a = this.config.expiryCheckInterval;
                            this.cacheExpirer = new n({
                                expiryCheckInterval: a
                            })
                        }
                        return r(e, [{
                            key: "put",
                            value: function() {
                                var t = this,
                                    e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "",
                                    r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "",
                                    n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : this.config.defaultCacheExpiryIn;
                                s(this.disposed), this.cacheStore[e] && this.remove(e);
                                var i = Date.now(),
                                    a = n ? i + n : null,
                                    c = {
                                        value: r,
                                        addedAt: i,
                                        expiryAt: a
                                    };
                                if (this.cacheStore[e] = c, a) {
                                    var u = function() {
                                        t.remove(e), t.emit(o, {
                                            key: e,
                                            data: t.cacheStore[e]
                                        })
                                    };
                                    this.cacheExpirer.add(a, e, u)
                                }
                                return this.emit("add", {
                                    key: e,
                                    data: c
                                }), c
                            }
                        }, {
                            key: "get",
                            value: function() {
                                var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "";
                                s(this.disposed);
                                var e = this.cacheStore[t];
                                return e ? (this.emit("get", {
                                    key: t,
                                    data: e
                                }), e) : null
                            }
                        }, {
                            key: "remove",
                            value: function(t) {
                                s(this.disposed);
                                var e = this.cacheStore[t];
                                if (e) {
                                    delete this.cacheStore[t];
                                    var r = e.expiryAt;
                                    return this.cacheExpirer.remove(r, t), this.emit("remove", {
                                        key: t,
                                        data: e
                                    }), !0
                                }
                                return !1
                            }
                        }, {
                            key: "dispose",
                            value: function() {
                                var t = this;
                                return s(this.disposed), Object.keys(this.cacheStore).forEach((function(e) {
                                    return t.remove(e)
                                })), this.emit("clear", {}), this.cacheExpirer.dispose(), this.disposed = !0, !0
                            }
                        }]), e
                    }()
                }()
            },
            4042: t => {
                t.exports = function(t, e) {
                    for (var r = [], n = (e = e || 0) || 0; n < t.length; n++) r[n - e] = t[n];
                    return r
                }
            },
            4763: t => {
                t.exports = Worker
            },
            2281: t => {
                "use strict";
                var e, r = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split(""),
                    n = {},
                    i = 0,
                    o = 0;

                function s(t) {
                    var e = "";
                    do {
                        e = r[t % 64] + e, t = Math.floor(t / 64)
                    } while (t > 0);
                    return e
                }

                function a() {
                    var t = s(+new Date);
                    return t !== e ? (i = 0, e = t) : t + "." + s(i++)
                }
                for (; o < 64; o++) n[r[o]] = o;
                a.encode = s, a.decode = function(t) {
                    var e = 0;
                    for (o = 0; o < t.length; o++) e = 64 * e + n[t.charAt(o)];
                    return e
                }, t.exports = a
            },
            121: (t, e, r) => {
                "use strict";
                t.exports = r.p + "assets/bdfcac1111082a3405c7.mp3"
            },
            1820: (t, e, r) => {
                "use strict";
                t.exports = r.p + "assets/97cf2f35402c21d77a7a.mp3"
            },
            328: () => {}
        },
        e = {};

    function r(n) {
        var i = e[n];
        if (void 0 !== i) return i.exports;
        var o = e[n] = {
            id: n,
            loaded: !1,
            exports: {}
        };
        return t[n].call(o.exports, o, o.exports, r), o.loaded = !0, o.exports
    }
    r.n = t => {
        var e = t && t.__esModule ? () => t.default : () => t;
        return r.d(e, {
            a: e
        }), e
    }, r.d = (t, e) => {
        for (var n in e) r.o(e, n) && !r.o(t, n) && Object.defineProperty(t, n, {
            enumerable: !0,
            get: e[n]
        })
    }, r.g = function() {
        if ("object" == typeof globalThis) return globalThis;
        try {
            return this || new Function("return this")()
        } catch (t) {
            if ("object" == typeof window) return window
        }
    }(), r.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e), r.r = t => {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
            value: "Module"
        }), Object.defineProperty(t, "__esModule", {
            value: !0
        })
    }, r.nmd = t => (t.paths = [], t.children || (t.children = []), t), (() => {
        var t;
        r.g.importScripts && (t = r.g.location + "");
        var e = r.g.document;
        if (!t && e && (e.currentScript && (t = e.currentScript.src), !t)) {
            var n = e.getElementsByTagName("script");
            n.length && (t = n[n.length - 1].src)
        }
        if (!t) throw new Error("Automatic publicPath is not supported in this browser");
        t = t.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/"), r.p = t
    })();
    var n = {};
    (() => {
        "use strict";
        r.r(n), r.d(n, {
            autoLogin: () => A,
            login: () => x,
            assertAccount: () => B,
            enableSound: () => C,
            doMine: () => T,
            doClaim: () => j,
            doBench: () => z,
            doShowDonate: () => F,
            doHideDonate: () => K,
            doDonate: () => J
        });
        var t = r(5335),
            e = r(7248),
            i = r(5107),
            o = (r(2580), r(8852), r(121)),
            s = r(1820);

        function a(t, e, r, n, i, o, s) {
            try {
                var a = t[o](s),
                    c = a.value
            } catch (t) {
                return void r(t)
            }
            a.done ? e(c) : Promise.resolve(c).then(n, i)
        }

        function c(t) {
            return function() {
                var e = this,
                    r = arguments;
                return new Promise((function(n, i) {
                    var o = t.apply(e, r);

                    function s(t) {
                        a(o, n, i, s, c, "next", t)
                    }

                    function c(t) {
                        a(o, n, i, s, c, "throw", t)
                    }
                    s(void 0)
                }))
            }
        }
        var u, h, f, l = "user",
            p = new t.WaxJS("https://api.waxsweden.org", null, null, !1);

        function d(t) {
            return document.getElementById(t)
        }

        function y(t) {
            d(t).disabled = !0
        }

        function g(t) {
            d(t).hidden = !0
        }

        function m(t) {
            d(t).hidden = !1
        }

        function v(t) {
            d(t).disabled = !1
        }

        function w(t, e) {
            d(t).innerText = e
        }

        function b() {
            p.userAccount ? (y("login"), w("loginresponse", p.userAccount), localStorage.setItem(l, p.userAccount), (u = new e.AlienApi(p.api, p.userAccount)).on("mine", (t => {
                var {
                    txId: e
                } = t;
                console.log("mined: ".concat(e)), T(e)
            })), u.on("transfer", (t => {
                var {
                    quantity: e
                } = t;
                console.log("transfer: ".concat(e)), q(e)
            })), u.on("nft", (t => {
                var {
                    url: e,
                    name: r
                } = t;
                console.log("nft: ".concat(r, " ").concat(e)),
                    function(t, e) {
                        d("nft-img").src = t, d("nft-img").alt = e, d("nft").style.display = "inline-block"
                    }(e, r)
            })), u.connect(), S()) : q("Not logged in")
        }

        function _(t) {
            u && (u.disconnect(), u = null), localStorage.removeItem(l), q(t || " "), v("login")
        }

        function A() {
            return E.apply(this, arguments)
        }

        function E() {
            return (E = c((function*() {
                localStorage.getItem(l) && (yield p.isAutoLoginAvailable()) ? b() : _()
            }))).apply(this, arguments)
        }

        function x() {
            return k.apply(this, arguments)
        }

        function k() {
            return (k = c((function*() {
                try {
                    yield p.login(), b()
                } catch (t) {
                    _(t.message)
                }
            }))).apply(this, arguments)
        }

        function S() {
            f || (f = u.FederationApi.getBalance().then((t => w("balance", t))).catch((t => {
                console.log("Fetch balance failed: " + t.message)
            })).then((() => f = null)))
        }

        function B() {
            return O.apply(this, arguments)
        }

        function O() {
            return (O = c((function*() {
                if (!u) throw new Error("Not logged in");
                var t = localStorage.getItem(p.userAccount);
                if (!t) {
                    if (!(t = yield u.FederationApi.getUserTerms())) throw new Error("Not an Alien Worlds account");
                    localStorage.setItem(p.userAccount, JSON.stringify(t))
                }
            }))).apply(this, arguments)
        }

        function C(t) {
            d("enableSound").checked ? h || (h = new Audio(o)) : h = null
        }

        function T(t) {
            return P.apply(this, arguments)
        }

        function P() {
            return (P = c((function*(t) {
                if (u) {
                    I(), w("mine-result", ""), y("mine"), m("spinner");
                    try {
                        yield B();
                        var e = yield(0, i.mine)(u.MiningApi);
                        e.mineDelay += Math.floor(5e3 + 5e3 * Math.random());
                        var r = e.land.data;
                        w("mine-result", "Mined ".concat(r.name, " with commission ").concat((r.commission / 100).toFixed(2), "%")), N(e)
                    } catch (t) {
                        console.log(t), w("mine-result", ""), q(t.message)
                    } finally {
                        v("mine"), g("spinner")
                    }
                } else q("Not logged in")
            }))).apply(this, arguments)
        }

        function z() {
            return U.apply(this, arguments)
        }

        function U() {
            return (U = c((function*() {
                try {
                    y("bench");
                    var t = Date.now(),
                        e = yield(0, i.localWork)({
                            account: "11111111.wam",
                            difficulty: -1,
                            transaction: "0000000000000000000000000000000000000000000000000000000000000000"
                        }, {
                            limit: 100
                        }), r = (Date.now() - t) / 1e3, n = e.iterations / 1e6 / r;
                    q("".concat(n.toFixed(3), " MHash/s with ").concat((0, i.getConcurrency)(), " workers"))
                } catch (t) {
                    console.log(t), q(t.message)
                } finally {
                    v("bench")
                }
            }))).apply(this, arguments)
        }
        var M, R = null;

        function j() {
            return D.apply(this, arguments)
        }

        function D() {
            return (D = c((function*() {
                try {
                    yield u.MiningApi.claim(R.solution), I(), S()
                } catch (t) {
                    console.log(t), q(t.message)
                }
            }))).apply(this, arguments)
        }

        function N(t) {
            M = setTimeout(L, 1e3, t)
        }

        function I() {
            y("claim"), w("countdown", " "), clearTimeout(M), M = null, R = null
        }

        function L(t) {
            var e = (0, i.calculateMineDelay)(t.lastMineTime, t.mineDelay);
            e > 0 ? (w("countdown", (0, i.formatInterval)(e / 1e3)), N(t)) : (w("countdown", (0, i.formatInterval)(0)), v("claim"), R = t.work, function(t) {
                h && (h.src = t, h.play())
            }(s))
        }

        function q(t) {
            w("response", t || " ")
        }

        function F() {
            d("donate-form").style.display = "block"
        }

        function K() {
            d("donate-form").style.display = "none"
        }

        function J() {
            return H.apply(this, arguments)
        }

        function H() {
            return (H = c((function*() {
                if (K(), u) try {
                    var t = d("amount").value;
                    t > 0 && (yield u.MiningApi.transfer("pocketaliens", parseFloat(t)), q("Thank you!"))
                } catch (t) {
                    console.log(t), w("response", t.message)
                } else q("Not logged in")
            }))).apply(this, arguments)
        }
        A()
    })(), Alien = n
})();