(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.JSONParser = factory();
  }
}(this, function () {
  var WHITESPACE = /^\s*/;
  var STRING = /^"(?:[^"\\\x00-\x1F\x7F\x80-\x9F]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*"/;
  var NUMBER = /^-?[1-9]*\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
  var KEYWORD = /^(?:true|false|null)/;

  function JSONLexer() {}

  JSONLexer.prototype = {
    tokenize: function (input) {
      this.tokens = [];
      this.input = input;
      var i = 0;
      while (this.chunk = input.slice(i)) {
        i += this.whitespace() || this.string() || this.number() || this.keyword() || this.literal();
      }
      return this.tokens;
    },

    token: function (tag, value) {
      this.tokens.push([ tag, value ]);
    },

    whitespace: function () {
      return WHITESPACE.exec(this.chunk)[0].length;
    },

    string: function () {
      var match = STRING.exec(this.chunk);
      if (!match) return 0;
      var value = match[0];
      this.token('STRING', value);
      return value.length;
    },

    number: function () {
      var match = NUMBER.exec(this.chunk);
      if (!match) return 0;
      var value = match[0];
      this.token('NUMBER', value);
      return value.length;
    },

    keyword: function () {
      var match = KEYWORD.exec(this.chunk);
      if (!match) return 0;
      var value = match[0];
      var tag = value.toUpperCase();
      this.token(tag, value);
      return value.length;
    },

    literal: function () {
      var tag = this.chunk.charAt(0);
      var value = tag;
      this.token(tag, value);
      return value.length;
    }
  };

  function JSONParser() {}

  JSONParser.prototype = {
    parse: function (input) {
      this.tokens = new JSONLexer().tokenize(input);
      this.i = 0;
      var value = this.value();
      if (!value) throw new TypeError('failed to parse JSON, expect value');
      return value;
    },

    format: function (input) {
      var indent = arguments.length > 1 ? arguments[1] : '  ';
      var ast = this.parse(input);
      return this.formatValue(ast, indent);
    },

    formatValue: function (node, indent) {
      switch (node.type) {
        case 'String':
          return JSON.stringify(JSON.parse(node.value));
        case 'Number':
        case 'True':
        case 'False':
        case 'Null':
          return node.value;
      }
      var begin = node.type === 'Object' ? '{' : '[';
      var end = node.type === 'Object' ? '}' : ']';
      var membersOrElements = node.value;
      if (!membersOrElements.length) return begin + end;
      var output = begin + '\n';
      for (var i = 0; i < membersOrElements.length; ) {
        output += indent;
        var memberOrElement = membersOrElements[i];
        if (node.type === 'Object') output += memberOrElement.key.value + ': ';
        var value = node.type === 'Object' ?
          this.formatValue(memberOrElement.value, indent).replace(/\n/g, '\n' + indent) :
          this.formatValue(memberOrElement, indent).replace(/\n/g, '\n' + indent);
        output += value;
        if (++i < membersOrElements.length) output += ',\n';
      }
      output += '\n' + end;
      return output;
    },

    value: function () {
      return this.string() || this.number() || this.object() || this.array() ||
        this['true']() || this['false']() || this['null']();
    },

    string: function () {
      var token = this.tokens[this.i];
      var tag = token[0];
      if (tag !== 'STRING') return null;
      this.i++;
      var value = token[1];
      return { type: 'String', value: value };
    },

    number: function () {
      var token = this.tokens[this.i];
      var tag = token[0];
      if (tag !== 'NUMBER') return null;
      this.i++;
      var value = token[1];
      return { type: 'Number', value: value };
    },

    object: function () {
      var token = this.tokens[this.i];
      if (token[0] !== '{') return null;
      this.i++;
      var members = this.members() || [];
      token = this.tokens[this.i];
      if (token[0] !== '}') throw new TypeError('failed to parse object, expect "}"');
      this.i++;
      return { type: 'Object', value: members };
    },

    members: function () {
      var pair = this.pair();
      if (!pair) return null;
      var members = [ pair ];
      while (true) {
        var token = this.tokens[this.i];
        if (token[0] !== ',') break;
        this.i++;
        if (!(pair = this.pair())) throw new TypeError('failed to parse members, expect pair');
        members.push(pair);
      }
      return members;
    },

    pair: function () {
      var string = this.string();
      if (!string) throw new TypeError('failed to parse pair, expect string');
      var token = this.tokens[this.i];
      if (token[0] !== ':') throw new TypeError('failed to parse pair, expect colon');
      this.i++;
      var value = this.value();
      if (!value) throw new TypeError('failed to parse pair, expect value');
      return { key: string, value: value };
    },

    array: function () {
      var token = this.tokens[this.i];
      if (token[0] !== '[') return null;
      this.i++;
      var elements = this.elements() || [];
      token = this.tokens[this.i];
      if (token[0] !== ']') throw new TypeError('failed to parse object, expect "]"');
      this.i++;
      return { type: 'Array', value: elements };
    },

    elements: function () {
      var value = this.value();
      if (!value) return null;
      var elements = [ value ];
      while (true) {
        var token = this.tokens[this.i];
        if (token[0] !== ',') break;
        this.i++;
        if (!(value = this.value())) throw new TypeError('failed to parse elements, expect value');
        elements.push(value);
      }
      return elements;
    },

    'true': function () {
      var token = this.tokens[this.i];
      if (token[0] !== 'TRUE') return null;
      this.i++;
      return { type: 'True', value: token[1] };
    },

    'false': function () {
      var token = this.tokens[this.i];
      if (token[0] !== 'FALSE') return null;
      this.i++;
      return { type: 'False', value: token[1] };
    },

    'null': function () {
      var token = this.tokens[this.i];
      if (token[0] !== 'NULL') return null;
      this.i++;
      return { type: 'Null', value: token[1] };
    }
  };

  return new JSONParser();
}));
