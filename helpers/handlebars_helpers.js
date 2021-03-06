/**
 * Handlebar Functions to do mathematical and logical operations within .hbs files
 */
const Handlebars = require('handlebars');

/**
  * function to handle basic mathematical operations
  * @param {number} lvalue The first number.
  * @param {string} operator The operator.
  * @param {number} rvalue The second number.
  * @returns {number} The result of operations on the two numbers.
  */
const math = (lvalue, operator, rvalue) => {
  const levalue = parseFloat(lvalue);
  const revalue = parseFloat(rvalue);
  return {
    '+': levalue + revalue,
    '-': levalue - revalue,
    '*': levalue * revalue,
    '/': levalue / revalue,
    '%': levalue % revalue
  }[operator];
};


/**
  * function to handle basic logical operations
  * @param {number} lvalue The first number.
  * @param {number} rvalue The second number.
  * @param {string} options You can set custom operator from options.hash.operator, '==' by default
  * @returns {number} The result of operations on the two numbers.
  */
const compare = (lvalue, rvalue, options) => {
  const operator = options.hash.operator || '===';

  const operators = {
    '===': (l, r) => l === r,
    '!==': (l, r) => l !== r,
    '<': (l, r) => l < r,
    '>': (l, r) => l > r,
    '<=': (l, r) => l <= r,
    '>=': (l, r) => l >= r
  };

  if (!operators[operator]) {
    throw new Error(`Handlerbars Helper 'compare' doesn't know the operator ${operator}`);
  }

  const result = operators[operator](lvalue, rvalue);

  if (result) {
    return options.fn(this);
  }
  return options.inverse(this);
};

/**
  * function to handle substring
  * @param {string} str The string.
  * @param {number} startIndex The start index
  * @param {number} endIndex The end index
  * @returns {string} The resulting substring
  */
const substring = (str, startIndex, endIndex) =>
  (endIndex ? new Handlebars.SafeString(str.substring(startIndex, endIndex)) :
    new Handlebars.SafeString(str.substring(startIndex)));

/**
  * function to handle substring
  * @param {[Object]} arguments multiple chained helpers.
  * @returns {Object} The result of chained helpers
  */
const chain = () => {
  const helpers = [];
  let args = Array.prototype.slice.call(arguments);
  const argsLength = args.length;
  let index;
  let arg;

  for (index = 0, arg = args[index];
    index < argsLength;
    arg = args[index += 1]) {
    if (Handlebars.helpers[arg]) {
      helpers.push(Handlebars.helpers[arg]);
    } else {
      args = args.slice(index);
      break;
    }
  }

  while (helpers.length) {
    args = [helpers.pop().apply(Handlebars.helpers, args)];
  }

  return args.shift();
};
module.exports = {
  math,
  compare,
  substring,
  chain
};
