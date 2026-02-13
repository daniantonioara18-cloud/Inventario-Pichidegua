"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_routes_1 = __importDefault(require("./health.routes"));
const db_routes_1 = __importDefault(require("./db.routes"));
const items_routes_1 = __importDefault(require("./items.routes"));
const catalogs_routes_1 = __importDefault(require("./catalogs.routes"));
const router = (0, express_1.Router)();
router.use(health_routes_1.default);
router.use(db_routes_1.default);
router.use(items_routes_1.default);
router.use(catalogs_routes_1.default);
exports.default = router;
