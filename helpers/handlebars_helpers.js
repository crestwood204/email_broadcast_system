/**
 * Handlebar Functions to do mathematical and logical operations within .hbs files
 */

/**
  * functino to handle basic mathematical operations
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
  const operator = options.hash.operator || '==';

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

module.exports = {
  MATH: math,
  COMPARE: compare
};
