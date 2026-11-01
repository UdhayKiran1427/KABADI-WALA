"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_src_lib_services_collectorService_ts";
exports.ids = ["_rsc_src_lib_services_collectorService_ts"];
exports.modules = {

/***/ "(rsc)/./src/lib/services/collectorService.ts":
/*!**********************************************!*\
  !*** ./src/lib/services/collectorService.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   generateUniqueShortCode: () => (/* binding */ generateUniqueShortCode)\n/* harmony export */ });\n/* harmony import */ var _prisma__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../prisma */ \"(rsc)/./src/lib/prisma.ts\");\n\n/**\n * Generates an alphanumeric 4-character shortCode for a collector (e.g. \"AB12\").\n * Used directly in offline lotRef: LOT-{shortCode}-{yyMMdd}-{seq}\n */ async function generateUniqueShortCode() {\n    const chars = \"ABCDEFGHJKLMNPQRSTUVWXYZ23456789\"; // unambiguous characters\n    for(let attempt = 0; attempt < 20; attempt++){\n        let code = \"\";\n        for(let i = 0; i < 4; i++){\n            code += chars[Math.floor(Math.random() * chars.length)];\n        }\n        const existing = await _prisma__WEBPACK_IMPORTED_MODULE_0__.prisma.collector.findUnique({\n            where: {\n                shortCode: code\n            }\n        });\n        if (!existing) {\n            return code;\n        }\n    }\n    // Fallback to timestamp based\n    return `C${Date.now().toString().slice(-3)}`;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL3NlcnZpY2VzL2NvbGxlY3RvclNlcnZpY2UudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBbUM7QUFFbkM7OztDQUdDLEdBQ00sZUFBZUM7SUFDcEIsTUFBTUMsUUFBUSxvQ0FBb0MseUJBQXlCO0lBQzNFLElBQUssSUFBSUMsVUFBVSxHQUFHQSxVQUFVLElBQUlBLFVBQVc7UUFDN0MsSUFBSUMsT0FBTztRQUNYLElBQUssSUFBSUMsSUFBSSxHQUFHQSxJQUFJLEdBQUdBLElBQUs7WUFDMUJELFFBQVFGLEtBQUssQ0FBQ0ksS0FBS0MsS0FBSyxDQUFDRCxLQUFLRSxNQUFNLEtBQUtOLE1BQU1PLE1BQU0sRUFBRTtRQUN6RDtRQUVBLE1BQU1DLFdBQVcsTUFBTVYsMkNBQU1BLENBQUNXLFNBQVMsQ0FBQ0MsVUFBVSxDQUFDO1lBQ2pEQyxPQUFPO2dCQUFFQyxXQUFXVjtZQUFLO1FBQzNCO1FBQ0EsSUFBSSxDQUFDTSxVQUFVO1lBQ2IsT0FBT047UUFDVDtJQUNGO0lBRUEsOEJBQThCO0lBQzlCLE9BQU8sQ0FBQyxDQUFDLEVBQUVXLEtBQUtDLEdBQUcsR0FBR0MsUUFBUSxHQUFHQyxLQUFLLENBQUMsQ0FBQyxJQUFJO0FBQzlDIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXHVkaGF5XFxPbmVEcml2ZVxcRGVza3RvcFxcUHJvamVjdHNcXEtBQkFESSBXQUxBXFxzcmNcXGxpYlxcc2VydmljZXNcXGNvbGxlY3RvclNlcnZpY2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJpc21hIH0gZnJvbSBcIi4uL3ByaXNtYVwiO1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhbiBhbHBoYW51bWVyaWMgNC1jaGFyYWN0ZXIgc2hvcnRDb2RlIGZvciBhIGNvbGxlY3RvciAoZS5nLiBcIkFCMTJcIikuXG4gKiBVc2VkIGRpcmVjdGx5IGluIG9mZmxpbmUgbG90UmVmOiBMT1Qte3Nob3J0Q29kZX0te3l5TU1kZH0te3NlcX1cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlVW5pcXVlU2hvcnRDb2RlKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGNoYXJzID0gXCJBQkNERUZHSEpLTE1OUFFSU1RVVldYWVoyMzQ1Njc4OVwiOyAvLyB1bmFtYmlndW91cyBjaGFyYWN0ZXJzXG4gIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgMjA7IGF0dGVtcHQrKykge1xuICAgIGxldCBjb2RlID0gXCJcIjtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgY29kZSArPSBjaGFyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpXTtcbiAgICB9XG5cbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHByaXNtYS5jb2xsZWN0b3IuZmluZFVuaXF1ZSh7XG4gICAgICB3aGVyZTogeyBzaG9ydENvZGU6IGNvZGUgfSxcbiAgICB9KTtcbiAgICBpZiAoIWV4aXN0aW5nKSB7XG4gICAgICByZXR1cm4gY29kZTtcbiAgICB9XG4gIH1cblxuICAvLyBGYWxsYmFjayB0byB0aW1lc3RhbXAgYmFzZWRcbiAgcmV0dXJuIGBDJHtEYXRlLm5vdygpLnRvU3RyaW5nKCkuc2xpY2UoLTMpfWA7XG59XG5cbiJdLCJuYW1lcyI6WyJwcmlzbWEiLCJnZW5lcmF0ZVVuaXF1ZVNob3J0Q29kZSIsImNoYXJzIiwiYXR0ZW1wdCIsImNvZGUiLCJpIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwibGVuZ3RoIiwiZXhpc3RpbmciLCJjb2xsZWN0b3IiLCJmaW5kVW5pcXVlIiwid2hlcmUiLCJzaG9ydENvZGUiLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJzbGljZSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/services/collectorService.ts\n");

/***/ })

};
;