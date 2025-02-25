/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 265:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { Transform } = __nccwpck_require__(781)

const [cr] = Buffer.from('\r')
const [nl] = Buffer.from('\n')
const defaults = {
  escape: '"',
  headers: null,
  mapHeaders: ({ header }) => header,
  mapValues: ({ value }) => value,
  newline: '\n',
  quote: '"',
  raw: false,
  separator: ',',
  skipComments: false,
  skipLines: null,
  maxRowBytes: Number.MAX_SAFE_INTEGER,
  strict: false,
  outputByteOffset: false
}

class CsvParser extends Transform {
  constructor (opts = {}) {
    super({ objectMode: true, highWaterMark: 16 })

    if (Array.isArray(opts)) opts = { headers: opts }

    const options = Object.assign({}, defaults, opts)

    options.customNewline = options.newline !== defaults.newline

    for (const key of ['newline', 'quote', 'separator']) {
      if (typeof options[key] !== 'undefined') {
        ([options[key]] = Buffer.from(options[key]))
      }
    }

    // if escape is not defined on the passed options, use the end value of quote
    options.escape = (opts || {}).escape ? Buffer.from(options.escape)[0] : options.quote

    this.state = {
      empty: options.raw ? Buffer.alloc(0) : '',
      escaped: false,
      first: true,
      lineNumber: 0,
      previousEnd: 0,
      rowLength: 0,
      quoted: false
    }

    this._prev = null

    if (options.headers === false) {
      // enforce, as the column length check will fail if headers:false
      options.strict = false
    }

    if (options.headers || options.headers === false) {
      this.state.first = false
    }

    this.options = options
    this.headers = options.headers
    this.bytesRead = 0
  }

  parseCell (buffer, start, end) {
    const { escape, quote } = this.options
    // remove quotes from quoted cells
    if (buffer[start] === quote && buffer[end - 1] === quote) {
      start++
      end--
    }

    let y = start

    for (let i = start; i < end; i++) {
      // check for escape characters and skip them
      if (buffer[i] === escape && i + 1 < end && buffer[i + 1] === quote) {
        i++
      }

      if (y !== i) {
        buffer[y] = buffer[i]
      }
      y++
    }

    return this.parseValue(buffer, start, y)
  }

  parseLine (buffer, start, end) {
    const { customNewline, escape, mapHeaders, mapValues, quote, separator, skipComments, skipLines } = this.options

    end-- // trim newline
    if (!customNewline && buffer.length && buffer[end - 1] === cr) {
      end--
    }

    const comma = separator
    const cells = []
    let isQuoted = false
    let offset = start

    if (skipComments) {
      const char = typeof skipComments === 'string' ? skipComments : '#'
      if (buffer[start] === Buffer.from(char)[0]) {
        return
      }
    }

    const mapValue = (value) => {
      if (this.state.first) {
        return value
      }

      const index = cells.length
      const header = this.headers[index]

      return mapValues({ header, index, value })
    }

    for (let i = start; i < end; i++) {
      const isStartingQuote = !isQuoted && buffer[i] === quote
      const isEndingQuote = isQuoted && buffer[i] === quote && i + 1 <= end && buffer[i + 1] === comma
      const isEscape = isQuoted && buffer[i] === escape && i + 1 < end && buffer[i + 1] === quote

      if (isStartingQuote || isEndingQuote) {
        isQuoted = !isQuoted
        continue
      } else if (isEscape) {
        i++
        continue
      }

      if (buffer[i] === comma && !isQuoted) {
        let value = this.parseCell(buffer, offset, i)
        value = mapValue(value)
        cells.push(value)
        offset = i + 1
      }
    }

    if (offset < end) {
      let value = this.parseCell(buffer, offset, end)
      value = mapValue(value)
      cells.push(value)
    }

    if (buffer[end - 1] === comma) {
      cells.push(mapValue(this.state.empty))
    }

    const skip = skipLines && skipLines > this.state.lineNumber
    this.state.lineNumber++

    if (this.state.first && !skip) {
      this.state.first = false
      this.headers = cells.map((header, index) => mapHeaders({ header, index }))

      this.emit('headers', this.headers)
      return
    }

    if (!skip && this.options.strict && cells.length !== this.headers.length) {
      const e = new RangeError('Row length does not match headers')
      this.emit('error', e)
    } else {
      if (!skip) {
        const byteOffset = this.bytesRead - buffer.length + start
        this.writeRow(cells, byteOffset)
      }
    }
  }

  parseValue (buffer, start, end) {
    if (this.options.raw) {
      return buffer.slice(start, end)
    }

    return buffer.toString('utf-8', start, end)
  }

  writeRow (cells, byteOffset) {
    const headers = (this.headers === false) ? cells.map((value, index) => index) : this.headers

    const row = cells.reduce((o, cell, index) => {
      const header = headers[index]
      if (header === null) return o // skip columns
      if (header !== undefined) {
        o[header] = cell
      } else {
        o[`_${index}`] = cell
      }
      return o
    }, {})

    if (this.options.outputByteOffset) {
      this.push({ row, byteOffset })
    } else {
      this.push(row)
    }
  }

  _flush (cb) {
    if (this.state.escaped || !this._prev) return cb()
    this.parseLine(this._prev, this.state.previousEnd, this._prev.length + 1) // plus since online -1s
    cb()
  }

  _transform (data, enc, cb) {
    if (typeof data === 'string') {
      data = Buffer.from(data)
    }

    const { escape, quote } = this.options
    let start = 0
    let buffer = data
    this.bytesRead += data.byteLength

    if (this._prev) {
      start = this._prev.length
      buffer = Buffer.concat([this._prev, data])
      this._prev = null
    }

    const bufferLength = buffer.length

    for (let i = start; i < bufferLength; i++) {
      const chr = buffer[i]
      const nextChr = i + 1 < bufferLength ? buffer[i + 1] : null

      this.state.rowLength++
      if (this.state.rowLength > this.options.maxRowBytes) {
        return cb(new Error('Row exceeds the maximum size'))
      }

      if (!this.state.escaped && chr === escape && nextChr === quote && i !== start) {
        this.state.escaped = true
        continue
      } else if (chr === quote) {
        if (this.state.escaped) {
          this.state.escaped = false
          // non-escaped quote (quoting the cell)
        } else {
          this.state.quoted = !this.state.quoted
        }
        continue
      }

      if (!this.state.quoted) {
        if (this.state.first && !this.options.customNewline) {
          if (chr === nl) {
            this.options.newline = nl
          } else if (chr === cr) {
            if (nextChr !== nl) {
              this.options.newline = cr
            }
          }
        }

        if (chr === this.options.newline) {
          this.parseLine(buffer, this.state.previousEnd, i + 1)
          this.state.previousEnd = i + 1
          this.state.rowLength = 0
        }
      }
    }

    if (this.state.previousEnd === bufferLength) {
      this.state.previousEnd = 0
      return cb()
    }

    if (bufferLength - this.state.previousEnd < data.length) {
      this._prev = data
      this.state.previousEnd -= (bufferLength - data.length)
      return cb()
    }

    this._prev = buffer
    cb()
  }
}

module.exports = (opts) => new CsvParser(opts)


/***/ }),

/***/ 214:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
var csv_stringifier_factory_1 = __nccwpck_require__(770);
var csv_writer_factory_1 = __nccwpck_require__(131);
var csvStringifierFactory = new csv_stringifier_factory_1.CsvStringifierFactory();
var csvWriterFactory = new csv_writer_factory_1.CsvWriterFactory(csvStringifierFactory);
__webpack_unused_export__ = function (params) {
    return csvStringifierFactory.createArrayCsvStringifier(params);
};
__webpack_unused_export__ = function (params) {
    return csvStringifierFactory.createObjectCsvStringifier(params);
};
__webpack_unused_export__ = function (params) {
    return csvWriterFactory.createArrayCsvWriter(params);
};
exports.eD = function (params) {
    return csvWriterFactory.createObjectCsvWriter(params);
};
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 770:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
var array_1 = __nccwpck_require__(875);
var field_stringifier_1 = __nccwpck_require__(982);
var object_1 = __nccwpck_require__(437);
var CsvStringifierFactory = /** @class */ (function () {
    function CsvStringifierFactory() {
    }
    CsvStringifierFactory.prototype.createArrayCsvStringifier = function (params) {
        var fieldStringifier = field_stringifier_1.createFieldStringifier(params.fieldDelimiter, params.alwaysQuote);
        return new array_1.ArrayCsvStringifier(fieldStringifier, params.recordDelimiter, params.header);
    };
    CsvStringifierFactory.prototype.createObjectCsvStringifier = function (params) {
        var fieldStringifier = field_stringifier_1.createFieldStringifier(params.fieldDelimiter, params.alwaysQuote);
        return new object_1.ObjectCsvStringifier(fieldStringifier, params.header, params.recordDelimiter, params.headerIdDelimiter);
    };
    return CsvStringifierFactory;
}());
exports.CsvStringifierFactory = CsvStringifierFactory;
//# sourceMappingURL=csv-stringifier-factory.js.map

/***/ }),

/***/ 343:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
var DEFAULT_RECORD_DELIMITER = '\n';
var VALID_RECORD_DELIMITERS = [DEFAULT_RECORD_DELIMITER, '\r\n'];
var CsvStringifier = /** @class */ (function () {
    function CsvStringifier(fieldStringifier, recordDelimiter) {
        if (recordDelimiter === void 0) { recordDelimiter = DEFAULT_RECORD_DELIMITER; }
        this.fieldStringifier = fieldStringifier;
        this.recordDelimiter = recordDelimiter;
        _validateRecordDelimiter(recordDelimiter);
    }
    CsvStringifier.prototype.getHeaderString = function () {
        var headerRecord = this.getHeaderRecord();
        return headerRecord ? this.joinRecords([this.getCsvLine(headerRecord)]) : null;
    };
    CsvStringifier.prototype.stringifyRecords = function (records) {
        var _this = this;
        var csvLines = Array.from(records, function (record) { return _this.getCsvLine(_this.getRecordAsArray(record)); });
        return this.joinRecords(csvLines);
    };
    CsvStringifier.prototype.getCsvLine = function (record) {
        var _this = this;
        return record
            .map(function (fieldValue) { return _this.fieldStringifier.stringify(fieldValue); })
            .join(this.fieldStringifier.fieldDelimiter);
    };
    CsvStringifier.prototype.joinRecords = function (records) {
        return records.join(this.recordDelimiter) + this.recordDelimiter;
    };
    return CsvStringifier;
}());
exports.CsvStringifier = CsvStringifier;
function _validateRecordDelimiter(delimiter) {
    if (VALID_RECORD_DELIMITERS.indexOf(delimiter) === -1) {
        throw new Error("Invalid record delimiter `" + delimiter + "` is specified");
    }
}
//# sourceMappingURL=abstract.js.map

/***/ }),

/***/ 875:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
var abstract_1 = __nccwpck_require__(343);
var ArrayCsvStringifier = /** @class */ (function (_super) {
    __extends(ArrayCsvStringifier, _super);
    function ArrayCsvStringifier(fieldStringifier, recordDelimiter, header) {
        var _this = _super.call(this, fieldStringifier, recordDelimiter) || this;
        _this.header = header;
        return _this;
    }
    ArrayCsvStringifier.prototype.getHeaderRecord = function () {
        return this.header;
    };
    ArrayCsvStringifier.prototype.getRecordAsArray = function (record) {
        return record;
    };
    return ArrayCsvStringifier;
}(abstract_1.CsvStringifier));
exports.ArrayCsvStringifier = ArrayCsvStringifier;
//# sourceMappingURL=array.js.map

/***/ }),

/***/ 437:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
var abstract_1 = __nccwpck_require__(343);
var object_1 = __nccwpck_require__(486);
var ObjectCsvStringifier = /** @class */ (function (_super) {
    __extends(ObjectCsvStringifier, _super);
    function ObjectCsvStringifier(fieldStringifier, header, recordDelimiter, headerIdDelimiter) {
        var _this = _super.call(this, fieldStringifier, recordDelimiter) || this;
        _this.header = header;
        _this.headerIdDelimiter = headerIdDelimiter;
        return _this;
    }
    ObjectCsvStringifier.prototype.getHeaderRecord = function () {
        if (!this.isObjectHeader)
            return null;
        return this.header.map(function (field) { return field.title; });
    };
    ObjectCsvStringifier.prototype.getRecordAsArray = function (record) {
        var _this = this;
        return this.fieldIds.map(function (fieldId) { return _this.getNestedValue(record, fieldId); });
    };
    ObjectCsvStringifier.prototype.getNestedValue = function (obj, key) {
        if (!this.headerIdDelimiter)
            return obj[key];
        return key.split(this.headerIdDelimiter).reduce(function (subObj, keyPart) { return (subObj || {})[keyPart]; }, obj);
    };
    Object.defineProperty(ObjectCsvStringifier.prototype, "fieldIds", {
        get: function () {
            return this.isObjectHeader ? this.header.map(function (column) { return column.id; }) : this.header;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ObjectCsvStringifier.prototype, "isObjectHeader", {
        get: function () {
            return object_1.isObject(this.header && this.header[0]);
        },
        enumerable: true,
        configurable: true
    });
    return ObjectCsvStringifier;
}(abstract_1.CsvStringifier));
exports.ObjectCsvStringifier = ObjectCsvStringifier;
//# sourceMappingURL=object.js.map

/***/ }),

/***/ 131:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
var csv_writer_1 = __nccwpck_require__(140);
var CsvWriterFactory = /** @class */ (function () {
    function CsvWriterFactory(csvStringifierFactory) {
        this.csvStringifierFactory = csvStringifierFactory;
    }
    CsvWriterFactory.prototype.createArrayCsvWriter = function (params) {
        var csvStringifier = this.csvStringifierFactory.createArrayCsvStringifier({
            header: params.header,
            fieldDelimiter: params.fieldDelimiter,
            recordDelimiter: params.recordDelimiter,
            alwaysQuote: params.alwaysQuote
        });
        return new csv_writer_1.CsvWriter(csvStringifier, params.path, params.encoding, params.append);
    };
    CsvWriterFactory.prototype.createObjectCsvWriter = function (params) {
        var csvStringifier = this.csvStringifierFactory.createObjectCsvStringifier({
            header: params.header,
            fieldDelimiter: params.fieldDelimiter,
            recordDelimiter: params.recordDelimiter,
            headerIdDelimiter: params.headerIdDelimiter,
            alwaysQuote: params.alwaysQuote
        });
        return new csv_writer_1.CsvWriter(csvStringifier, params.path, params.encoding, params.append);
    };
    return CsvWriterFactory;
}());
exports.CsvWriterFactory = CsvWriterFactory;
//# sourceMappingURL=csv-writer-factory.js.map

/***/ }),

/***/ 140:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
var file_writer_1 = __nccwpck_require__(208);
var DEFAULT_INITIAL_APPEND_FLAG = false;
var CsvWriter = /** @class */ (function () {
    function CsvWriter(csvStringifier, path, encoding, append) {
        if (append === void 0) { append = DEFAULT_INITIAL_APPEND_FLAG; }
        this.csvStringifier = csvStringifier;
        this.append = append;
        this.fileWriter = new file_writer_1.FileWriter(path, this.append, encoding);
    }
    CsvWriter.prototype.writeRecords = function (records) {
        return __awaiter(this, void 0, void 0, function () {
            var recordsString, writeString;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        recordsString = this.csvStringifier.stringifyRecords(records);
                        writeString = this.headerString + recordsString;
                        return [4 /*yield*/, this.fileWriter.write(writeString)];
                    case 1:
                        _a.sent();
                        this.append = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(CsvWriter.prototype, "headerString", {
        get: function () {
            var headerString = !this.append && this.csvStringifier.getHeaderString();
            return headerString || '';
        },
        enumerable: true,
        configurable: true
    });
    return CsvWriter;
}());
exports.CsvWriter = CsvWriter;
//# sourceMappingURL=csv-writer.js.map

/***/ }),

/***/ 982:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
var DEFAULT_FIELD_DELIMITER = ',';
var VALID_FIELD_DELIMITERS = [DEFAULT_FIELD_DELIMITER, ';'];
var FieldStringifier = /** @class */ (function () {
    function FieldStringifier(fieldDelimiter) {
        this.fieldDelimiter = fieldDelimiter;
    }
    FieldStringifier.prototype.isEmpty = function (value) {
        return typeof value === 'undefined' || value === null || value === '';
    };
    FieldStringifier.prototype.quoteField = function (field) {
        return "\"" + field.replace(/"/g, '""') + "\"";
    };
    return FieldStringifier;
}());
exports.FieldStringifier = FieldStringifier;
var DefaultFieldStringifier = /** @class */ (function (_super) {
    __extends(DefaultFieldStringifier, _super);
    function DefaultFieldStringifier() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DefaultFieldStringifier.prototype.stringify = function (value) {
        if (this.isEmpty(value))
            return '';
        var str = String(value);
        return this.needsQuote(str) ? this.quoteField(str) : str;
    };
    DefaultFieldStringifier.prototype.needsQuote = function (str) {
        return str.includes(this.fieldDelimiter) || str.includes('\n') || str.includes('"');
    };
    return DefaultFieldStringifier;
}(FieldStringifier));
var ForceQuoteFieldStringifier = /** @class */ (function (_super) {
    __extends(ForceQuoteFieldStringifier, _super);
    function ForceQuoteFieldStringifier() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ForceQuoteFieldStringifier.prototype.stringify = function (value) {
        return this.isEmpty(value) ? '' : this.quoteField(String(value));
    };
    return ForceQuoteFieldStringifier;
}(FieldStringifier));
function createFieldStringifier(fieldDelimiter, alwaysQuote) {
    if (fieldDelimiter === void 0) { fieldDelimiter = DEFAULT_FIELD_DELIMITER; }
    if (alwaysQuote === void 0) { alwaysQuote = false; }
    _validateFieldDelimiter(fieldDelimiter);
    return alwaysQuote ? new ForceQuoteFieldStringifier(fieldDelimiter) : new DefaultFieldStringifier(fieldDelimiter);
}
exports.createFieldStringifier = createFieldStringifier;
function _validateFieldDelimiter(delimiter) {
    if (VALID_FIELD_DELIMITERS.indexOf(delimiter) === -1) {
        throw new Error("Invalid field delimiter `" + delimiter + "` is specified");
    }
}
//# sourceMappingURL=field-stringifier.js.map

/***/ }),

/***/ 208:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
Object.defineProperty(exports, "__esModule", ({ value: true }));
var promise_1 = __nccwpck_require__(41);
var fs_1 = __nccwpck_require__(147);
var writeFilePromise = promise_1.promisify(fs_1.writeFile);
var DEFAULT_ENCODING = 'utf8';
var FileWriter = /** @class */ (function () {
    function FileWriter(path, append, encoding) {
        if (encoding === void 0) { encoding = DEFAULT_ENCODING; }
        this.path = path;
        this.append = append;
        this.encoding = encoding;
    }
    FileWriter.prototype.write = function (string) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, writeFilePromise(this.path, string, this.getWriteOption())];
                    case 1:
                        _a.sent();
                        this.append = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    FileWriter.prototype.getWriteOption = function () {
        return {
            encoding: this.encoding,
            flag: this.append ? 'a' : 'w'
        };
    };
    return FileWriter;
}());
exports.FileWriter = FileWriter;
//# sourceMappingURL=file-writer.js.map

/***/ }),

/***/ 486:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isObject = function (value) {
    return Object.prototype.toString.call(value) === '[object Object]';
};
//# sourceMappingURL=object.js.map

/***/ }),

/***/ 41:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
function promisify(fn) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return new Promise(function (resolve, reject) {
            var nodeCallback = function (err, result) {
                if (err)
                    reject(err);
                else
                    resolve(result);
            };
            fn.apply(null, __spreadArrays(args, [nodeCallback]));
        });
    };
}
exports.promisify = promisify;
//# sourceMappingURL=promise.js.map

/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 781:
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const fs = __nccwpck_require__(147);
const csv = __nccwpck_require__(265);
const createCsvWriter = (__nccwpck_require__(214)/* .createObjectCsvWriter */ .eD);

const repoStatsFile = "repo-stats.csv";
const migrationAuditFile = "migration-audit.csv";
const outputCsvFile = "output.csv";

const types = new Set();

const readCsvFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => data.push(row))
      .on("end", () => resolve(data))
      .on("error", (error) => reject(error));
  });
};

// Combine data from both CSV files
const combineData = (firstCsvData, secondCsvData) => {
  secondCsvData.forEach((row) => types.add(row.type));

  return firstCsvData.map((firstRow) => {
    const matchingRows = secondCsvData.filter(
      (secondRow) => firstRow.Org_Name === secondRow.owner && firstRow.Repo_Name === secondRow.name
    );

    const combinedRow = { ...firstRow, Has_Unmigratable: matchingRows.length > 0 };

    matchingRows.forEach((row) => {
      combinedRow[row.type] = true; // or row.message;
    });

    // Set remaining new rows to false
    types.forEach((type) => {
      if (!combinedRow[type]) {
        combinedRow[type] = false;
      }
    });

    return combinedRow;
  });
};

const writeCsvFile = (filePath, headers, data) => {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: headers.map((header) => ({ id: header, title: header })),
  });

  return csvWriter.writeRecords(data);
};

const processCsvFiles = async () => {
  try {
    const [firstCsvData, secondCsvData] = await Promise.all([
      readCsvFile(repoStatsFile),
      readCsvFile(migrationAuditFile),
    ]);

    const combinedData = combineData(firstCsvData, secondCsvData);

    const headers = [...Object.keys(firstCsvData[0]), "Has_Unmigratable", ...Array.from(types)];

    await writeCsvFile(outputCsvFile, headers, combinedData);

    console.log("The CSV file was written successfully");
  } catch (error) {
    console.error("Error processing CSV files:", error);
  }
};

processCsvFiles();

})();

module.exports = __webpack_exports__;
/******/ })()
;