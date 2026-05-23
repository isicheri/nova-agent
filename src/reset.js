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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var lib_1 = require("./lib/lib");
var db_1 = require("./db");
var schema_1 = require("./db/schema");
var drizzle_orm_1 = require("drizzle-orm");
function reset() {
    return __awaiter(this, void 0, void 0, function () {
        var phone, redisKey, customers, customerId, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    phone = "2347074026283";
                    console.log("Resetting state and database records for ".concat(phone, "..."));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    redisKey = "".concat(phone, "_thread_id");
                    return [4 /*yield*/, lib_1.redisClient.del(redisKey)];
                case 2:
                    _a.sent();
                    console.log("Deleted Redis key: ".concat(redisKey));
                    return [4 /*yield*/, db_1.db.select().from(schema_1.customerTable).where((0, drizzle_orm_1.eq)(schema_1.customerTable.phone, phone))];
                case 3:
                    customers = _a.sent();
                    if (!(customers.length > 0)) return [3 /*break*/, 7];
                    customerId = customers[0].id;
                    // Delete referencing bookings
                    return [4 /*yield*/, db_1.db.delete(schema_1.bookingTable).where((0, drizzle_orm_1.eq)(schema_1.bookingTable.customerId, customerId))
                        // Delete referencing conversations
                    ];
                case 4:
                    // Delete referencing bookings
                    _a.sent();
                    // Delete referencing conversations
                    return [4 /*yield*/, db_1.db.delete(schema_1.conversationTable).where((0, drizzle_orm_1.eq)(schema_1.conversationTable.customerId, customerId))
                        // Delete customer
                    ];
                case 5:
                    // Delete referencing conversations
                    _a.sent();
                    // Delete customer
                    return [4 /*yield*/, db_1.db.delete(schema_1.customerTable).where((0, drizzle_orm_1.eq)(schema_1.customerTable.id, customerId))];
                case 6:
                    // Delete customer
                    _a.sent();
                    console.log("Deleted customer ".concat(phone, " and all associated records from DB."));
                    return [3 /*break*/, 8];
                case 7:
                    console.log("No customer found with phone ".concat(phone, " in DB."));
                    _a.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_1 = _a.sent();
                    console.error("Error during reset:", error_1);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
reset();
