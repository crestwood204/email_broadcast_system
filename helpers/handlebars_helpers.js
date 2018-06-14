/**
 * Handlebar Functions to do mathematical and logical operations within .hbs files
 */

/**
 * Function to handle basic mathemtical operations
 */
var math = function(lvalue, operator, rvalue) {
  lvalue = parseFloat(lvalue);
  rvalue = parseFloat(rvalue);
  return {
      "+": lvalue + rvalue,
      "-": lvalue - rvalue,
      "*": lvalue * rvalue,
      "/": lvalue / rvalue,
      "%": lvalue % rvalue
  }[operator];
}


/**
 * Function to handle basic logical operations
 */
var compare = function(lvalue, rvalue, options) {
  var operator = options.hash.operator || "==";

  var operators = {
      '==':       function(l,r) { return l == r; },
      '===':      function(l,r) { return l === r; },
      '!=':       function(l,r) { return l != r; },
      '!==':      function(l,r) { return l !== r; },
      '<':        function(l,r) { return l < r; },
      '>':        function(l,r) { return l > r; },
      '<=':       function(l,r) { return l <= r; },
      '>=':       function(l,r) { return l >= r; },
      'typeof':   function(l,r) { return typeof l == r; }
  }

  if (!operators[operator])
      throw new Error("Handlerbars Helper 'compare' doesn't know the operator " + operator);

  var result = operators[operator](lvalue,rvalue);

  if (result) {
      return options.fn(this);
  } else {
      return options.inverse(this);
  }
}

module.exports = {
  MATH: math,
  COMPARE: compare
}
