
var functionList = ['range', 'floor', 'ceiling', 'wall'];
var separationList = ['+', '-', '/', '*',]; //'=', ',', '.', '!'];
var parenList = ['(', ')', '[', ']', '{', '}'];

var binaryOperators = ['+', '-', '*', '/'];
var unaryOperators = ['!', '++', '--'];
var allOperators = binaryOperators.concat(unaryOperators);

// Easier than writing the function, and this is as big as JS goes without using BigNumber
var factorialValues = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800,
                       87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000, 'Far too big'];

function interpret(input, line) {
    // Generate a stack from the input, separating each word and operand/separator/whatever
    var stack = [[]];  // each level of stack is a higher level in this 2d array
    var stackDepth = 0;  // how deep we are diving into the array of stacks
    var word = '';
    for (var i in input) {
        if (allOperators.indexOf(input[i]) >= 0) {  // if input is an operator
            if (word.trim() !== '') {
                stack[stackDepth].push(evalWord(word));
                word = '';
            }
            stack[stackDepth].push(evalWord(input[i]));
        } else if (input[i] === '(') {  // increase depth
            var lcword = word.toLowerCase();
            if (functionList.indexOf(lcword) >= 0) {
                //
                return 'functions soonish'; // early exit via return
            } else {
                if (word !== '') {
                    stack[stackDepth].push(evalWord(word));
                    word = '';
                }
                stackDepth += 1;
                stack[stackDepth] = [];
                debug('Increasing stack depth, currently ' + JSON.stringify(stack, null, '\t'));
            }
        } else if (input[i] === ')') {  // decrease depth, evaluate
            if (word !== '') {
                stack[stackDepth].push(evalWord(word));
                word = '';
            }
            var eval = evalStack(stack[stackDepth]);
            stackDepth -= 1;
            stack[stackDepth].push(eval);
            debug('Decreasing stack depth, currently ' + JSON.stringify(stack, null, '\t'));
        } else {
            word += input[i];
            if (word.startsWith('[') && word.endsWith(']') &&
                word.split('[').length === word.split(']').length) {
                stack[stackDepth].push(evalWord(word));
                word = '';
            }
        }
    }
    if (word !== '') stack[stackDepth].push(evalWord(word));

    if (stackDepth != 0) debug('Stack depth is ' + stackDepth + ' during final evaluation. Likely bad input.');

    return stringify(evalStack(stack[stackDepth]));
}

function debug(message) {
    console.log('Debug: ' + message);
}

function evalStack(stack) {
    // Setup for evaluation
    var inDoubleQuotes = false;
    var inSingleQuotes = false;
    var operands = [];
    var stall = false;
    var stallOperation = '';
    // cleanup easy to clean spaces
    /*
    for (var i in stack) {
        if (!inDoubleQuotes && !inSingleQuotes) {
            var cleanup = stack[i] //debug
            stack[i] = stack[i].trim();
            if (cleanup != stack[i]) console.log("Cleaned up '" + cleanup + "' to '" + stack[i]); //debug
        }
        if (stack[i] === '"') inDoubleQuotes = !inDoubleQuotes;
        if (stack[i] === "'") inSingleQuotes = !inSingleQuotes;
    }*/

    var cycles = 0;
    var maxCycles = 50;
    // Start evaluating
    var b = null;
    var operation = null;
    while ((stack.length > 1 || operation != null || b != null) && cycles++ < maxCycles) {
        debug('Stack is currently ' + JSON.stringify(stack, null, '\t') + '. Stack length is ' + stack.length);
        var a = stack.pop();
        if (typeof a == 'undefined') {  // empty stack
            if (operation === null) return b;  // but we have something stored
            else if (b === null) return "'Danger Will Robinson, Danger'";  //we have an operation but nothing to operate
        }

        var value = a[0]; var type = a[1];

        /* We have effectively three states.
         *   1) We've got one single value we popped off the stack. Store it for now
         *   2) We've got a single value stored for later, and an operator is popped off the stack
         *     a) Operator is a single value operator, operate on the stored value (!, ++, etc)
         *     b) Operator is a dual value operator, store it and continue
         *   3) We've got a value stored, an operator stored, and a new value to use from the stack. Operate!
         */
        if (b === null) {
            if (a[1] === 'operation') operation = a;
            else b = a;
            if (b !== null && operation !== null) {
                stack.push(evalWord(unaryOperate(operation[0], b)));
                b = operation = null;
            }
        } else if (operation === null) {  // b is not null
            if (type === 'operation') {
                debug('Found operation');
                if (unaryOperators.indexOf(value) >= 0) {
                    stack.push(evalWord(unaryOperate(a[0], b)));
                    b = operation = null;
                } else if (binaryOperators.indexOf(value) >= 0) {
                    operation = a;  // store operation, move on to the next
                } else {
                    debug('Did not recognize unary operation ' + value);
                }
            } else {  // we popped a non-operator off the stack.. uh oh
                // should we assume multiplication? (e.g. 2(x) == 2*x?)
                debug('Popped a non-operator off the stack. ' + value + ', to be operated on ' + b);
            }
        } else {  // stored value b and operation
            stack.push(evalWord(binaryOperate(operation, a, b)));
            b = operation = null;
        }
    }
    return stack.pop()
}

function unaryOperate(operation, value) {
    var type = value[1];
    value = value[0];
    // debug('Attempting unary operation ' + operation + ' on ' + value + '[' + type + ']');
    if (operation === '!') {
        if (type === 'integer') {
            if (value > 19) value = 19;
            return factorialValues[value];  // see definition at top
        } else if (type === 'literal') {
            return "'" + value.toUpperCase() + "!!1'";
        } else {
            debug('WHAT ARE WE EXCLAIMING!? ' + value + '[' + type + ']');
        }
    } else if (operation === '++') {
    } else if (operation === '--') {
    } else {
        debug('Not sure what we are doing with ' + operation + ' on value ' + value + '[' + type + ']');
    }
    return "'Does not compute.'";
}

function binaryOperate(operation, a, b) {
    operation = operation[0];  // we can discard the extra data
    // If we've got simple stuff happening, just do it.
    if (a[1] === 'integer' && b[1] === 'integer') {
        a = parseInt(a[0]); b = parseInt(b[0]);  // simplify code / discard junk
        if (operation === '+') return a + b;
        if (operation === '-') return a - b;
        if (operation === '*') return a * b;
        if (operation === '/') {
            if (b !== 0) return a / b;
            else return NaN;  // Test Case 3
        }
    }
    if (a[1] === 'literal' && b[1] === 'literal')
        return reString(deString(a[0]) + deString(b[0]));
    if (a[1] === 'array' && b[1] === 'array')  // Personal interpretation of adding arrays
        if (a[0].length === b[0].length) {  // Same length, add values
            for (var i in a[0]) a[0][i] = a[0][i] + b[0][i];
            return a[0];
        } else return a[0].concat(b[0]);  // Different length, append arrays

    // Now begins the insane stack of different type combinations
    if (operation === '+') {
        if (ifTypes(a, b, 'integer', 'literal')) {
            var a_int = parseInt(deString(a[0]));  // literal number is "'N'"
            var b_int = parseInt(deString(b[0]));
            if (a_int + b_int) {  // Both are ints, add and return literal
                return reString(a_int + b_int);  // Test Case 1
            } else {
                return reString(deString(a[0]) + deString(b[0]));  // Just concatenate if the literal isn't a closet int
            }
        }
        if (ifTypes(a, b, 'integer', 'array')) {
            var n = a[1] === 'integer' ? parseInt(deString(a[0])) : parseInt(deString(b[0]));
            var arr = a[1] === 'array' ? a[0] : b[0];
            return arr.indexOf(n) < 0;  // Test Case 6 and 7
        }
        if (ifTypes(a, b, 'literal', 'array')) {
            var s = a[1] === 'literal' ? deString(a[0]) : deString(b[0]);
            if (parseInt(s)) s = parseInt(s);  // If it's an int convert it so we don't have extra "'s
            var arr = a[1] === 'array' ? a[0] : b[0];
            if (a[1] === 'array') arr.push(s);  // [1,2]+3 = [1,2,3],.. 3+[1,2] = [3,1,2]
            else arr.unshift(s);  // Easter Egg
            return reString(JSON.stringify(arr));  // Test Case 2
        }
        if (ifTypes(a, b, 'integer', 'NaN')) {
            var n = a[1] === 'NaN' ? b[0] : a[0];
            return 'Na' + String.fromCharCode(78 + parseInt(n));  // Test Case 4
        }
    } else if (operation === '-') {
    } else if (operation === '*') {
    } else if (operation === '/') {
    } else {
        debug('did not recognize binary operation ' + operation);
    }
    debug('need something for ' + a + ' ' + operation + ' ' + b);
    return "'Does not compute.'";
}

function ifTypes(a, b, type1, type2) {
    return (a[1] === type1 && b[1] === type2) || (a[1] === type2 && b[1] === type1);
}

function evalWord(word, type) {
    if (typeof type !== 'undefined') {
        debug('manual override for evalWord: [' + word + ', ' + type + ']');
        return [word, type];
    }
    if (typeof word === 'boolean') return [word, 'boolean'];
    var testWord = '' + word;
    if ((testWord.startsWith('"') && testWord.endsWith('"')) ||
        (testWord.startsWith("'") && testWord.endsWith("'"))) {
        return [word, 'literal'];
    }
    if (allOperators.indexOf(word) >= 0) {
        return [word, 'operation'];
    }
    if (Number.isNaN(word) || word === 'NaN') {
        return [NaN, 'NaN'];
    }
    if ((typeof word === 'object') && Array.isArray(word)) {
        return [word, 'array'];
    }
    if (Number.isInteger(parseInt(word))) {
        return [word, 'integer'];
    }
    if (word.startsWith('[') && word.endsWith(']')) {
        return [JSON.parse(word), 'array'];
    }
    debug('Did not identify ' + JSON.stringify(word));
    return [word, 'literal'];
    return [word, 'unknown'];
}

function stringify(input) {
    // debug('Stringifying ' + JSON.stringify(input));
    if (input[1] === 'integer') return input[0] == 42 ? 'Life, the universe, and everything' : input[0];  // Easter Egg
    if (input[1] === 'literal' && (Number.isInteger(input[0])))
        return "'" + input[0] + "'";
    if (input[1] === 'literal' && typeof input[0] === 'object' && Array.isArray(input[0]))
        return '"' + JSON.stringify(input[0]) + '"';
    if (input[1] === 'literal') return reString(deString(input[0]));
    if (input[1] === 'boolean') return input[0];
    if (input[1] === 'NaN') return NaN;
    if (input[1] === 'array') return JSON.stringify(input[0]);
    return input;
}

function deString(input) {
    if (input.startsWith("'")) input = input.substring(1);
    if (input.startsWith('"')) input = input.substring(1);
    if (input.endsWith("'")) input = input.substring(0, input.length - 1);
    if (input.endsWith('"')) input = input.substring(0, input.length - 1);
    return input;
}

function reString(input) {
    return "'" + input + "'";
}
