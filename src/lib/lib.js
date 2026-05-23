"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteConversationState = exports.loadConversationState = exports.saveConversationState = exports.redisClient = void 0;
var redis_1 = require("@upstash/redis");
exports.redisClient = new redis_1.Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
});
var RedisCache = /** @class */ (function () {
    function RedisCache() {
        this.saveConversationState = this.saveConversationState.bind(this);
        this.loadConversationState = this.loadConversationState.bind(this);
        this.deleteConversationState = this.deleteConversationState.bind(this);
    }
    RedisCache.prototype.saveConversationState = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var phoneNumber = _b.phoneNumber, threadId = _b.threadId, intent = _b.intent, step = _b.step, service = _b.service, date = _b.date, time = _b.time;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, exports.redisClient.set("".concat(phoneNumber, "_thread_id"), {
                            threadId: threadId,
                            intent: intent,
                            step: step,
                            service: service,
                            date: date,
                            time: time
                        }, { ex: 60 * 60 * 24 * 7 })];
                    case 1:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisCache.prototype.loadConversationState = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var phoneNumber = _b.phoneNumber;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, exports.redisClient.get("".concat(phoneNumber, "_thread_id"))];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    RedisCache.prototype.deleteConversationState = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var phoneNumber = _b.phoneNumber;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, exports.redisClient.del("".concat(phoneNumber, "_thread_id"))];
                    case 1: return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    return RedisCache;
}());
exports.saveConversationState = (_a = new RedisCache(), _a.saveConversationState), exports.loadConversationState = _a.loadConversationState, exports.deleteConversationState = _a.deleteConversationState;
