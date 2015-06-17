
var functionList = ['range', 'floor', 'ceiling'];
var separationList = ['+', '-', '/', '*',]; //'=', ',', '.', '!'];

var parenList = ['(', ')', '[', ']', '{', '}'];

function interpret(input, line) {
    // Generate a stack from the input, separating each word and operand/separator/whatever
    var stack = [[]];
    var stackDepth = 0;
    var word = "";
    for (var i in input) {
        if (separationList.indexOf(input[i]) >= 0) { // if str contains one of these chars
            if (word !== "") {
                stack[stackDepth].push(evalWord(word));
                word = "";
            }
            stack[stackDepth].push(evalWord(input[i]));
        } else if (input[i] === '(') { // increase depth
            if (word === "range") {
                return "Range soon";
            } else {
                if (word !== "") {
                    stack[stackDepth].push(evalWord(word));
                    word = "";
                }
                stackDepth += 1;
                stack[stackDepth] = [];
                debug("Increasing stack depth, currently " + JSON.stringify(stack, null, '\t'));
            }
        } else if (input[i] === ')') { // decrease depth, evaluate
            if (word !== "") {
                stack[stackDepth].push(evalWord(word));
                word = "";
            }
            var eval = evalStack(stack[stackDepth]);
            stackDepth -= 1;
            stack[stackDepth].push(eval);
            debug("Decreasing stack depth, currently " + JSON.stringify(stack, null, '\t'));
        } else {
            word += input[i];
            if (word.startsWith('[') && word.endsWith(']')) {
                stack[stackDepth].push(evalWord(word));
                word = "";
            }
        }
    }
    if (word !== "") stack[stackDepth].push(evalWord(word));

    return stringify(evalStack(stack[stackDepth]));
}

function error(message) {
    return "Error: " + message;
}
function debug(message) {
    console.log("Debug: " + message);
}

function evalStack(stack) {
    // Setup for evaluation
    var inDoubleQuotes = false;
    var inSingleQuotes = false;
    var operands = [];
    var stall = false;
    var stallOperation = "";
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
    while ((stack.length > 1 || stall) && cycles < maxCycles) {
        cycles += 1;
        debug("Stack is currently " + JSON.stringify(stack, null, '\t') + ". Stack length is " + stack.length);
        var operand = stack.pop();
        if (operand[1] === "integer" || operand[1] === 'literal' || operand[1] === 'array') {
            if (stall === false) {
                operands.push(operand);
              //debug("Pushing " + operand[0] + " to operands, which now is " + JSON.stringify(operands, null, '\t'));
            } else { // perform operation
                stall = false;
                if (stallOperation === '+') {
                    //debug("Adding " + operand[0] + " and " + operands[operands.length-1][0])
                    var other = operands.pop();
                    if (operand[1] === 'integer' && other[1] === 'integer') { // integer + integer
                        result = parseInt(operand[0]) + parseInt(other[0]);
                        stack.push(evalWord(result, 'integer'));
                    } else if (operand[1] === 'literal' && other[1] === 'literal') { // literal + literal
                        stack.push(evalWord(operand[0] + other[0]));
                    } else if (((operand[1] === 'literal' && other[1] === 'integer')) || // literal + integer
                               ((operand[1] === 'integer' && other[1] === 'literal'))) {
                        result = parseInt(deString(operand[0])) + parseInt(deString(other[0]));
                      //debug("adding literal and integer: " + operand[0] + " and " + other[0] + " result: " + result);
                        stack.push(evalWord(result, 'literal'));
                      //debug("Pushing " + result + " to stack. Stack contains " + JSON.stringify(stack, null, '\t'));
                    } else if ((operand[1] === 'integer' && other[1] === 'array') ||
                               (operand[1] === 'array' && other[1] === 'integer') ||
                               (operand[1] === 'array' && other[1] === 'literal') ||
                               (operand[1] === 'literal' && other[1] === 'array')) {
                        var newArray = operand[1] === 'array' ? operand[0] : other[0];
                        var newValue = operand[1] === 'array' ? other[0] : operand[0];
                        var newType = operand[1] === 'array' ? other[1] : operand[1];
                        debug("arr: " + JSON.stringify(newArray) + "  val: " + newValue + "  type: " + newType);
                        if (newType === 'literal') {
                            newArray.push(parseInt(deString(newValue)));
                            debug("Created new literal array: " + JSON.stringify(newArray));
                            stack.push(evalWord(newArray, 'literal'));
                        } else { // array + number, check if number is in array
                            var result = true;
                            for (var i in newArray) if (newArray[i] == newValue) result = false; // soft comparison
                            debug("Checking if " + newValue + " is in array " + JSON.stringify(newArray) +
                                  ". Result: " + !result);
                            stack.push(evalWord(result));
                        }
                    } else {
                        debug("not sure how to add stuff" +
                              JSON.stringify(other) + "   " +
                              JSON.stringify(operand));
                    }
                    //debug("Pushing " + result + " to stack. Stack contains " + JSON.stringify(stack, null, '\t'));
                } else if (stallOperation === '-') {
                    result = parseInt(operand[0]) - parseInt(operands.pop()[0]);
                    stack.push(evalWord(result));
                } else if (stallOperation === '*') {
                    result = parseInt(operand[0]) * parseInt(operands.pop()[0]);
                    stack.push(evalWord(result));
                } else if (stallOperation === '/') {
                    other = operands.pop();
                    if (other[0] == 0) { // soft comparison intentional
                        stack.push(evalWord(42/'string'));
                    } else {
                        result = parseInt(operand[0]) / other[0];
                        stack.push(evalWord(result));
                    }
                }
            }
        } else if (operand[1] === 'operation') {
            stall = true;
            stallOperation = operand[0];
            debug("Setting stallOperation to " + operand[0] + ".");
        } else {
            debug("Not sure what's going on.... " + operand);
        }
    }
    return stack.pop();
}

function evalWord(word, type) {
    if (typeof type !== 'undefined') {
        debug("manual override for evalWord: [" + word + ", " + type + "]");
        return [word, type];
    }
    if (typeof word === 'boolean') return [word, 'boolean'];
    var testWord = "" + word;
    if ((testWord.startsWith('"') && testWord.endsWith('"')) ||
        (testWord.startsWith("'") && testWord.endsWith("'"))) {
        //debug("Literal: " + word);
        return [word, 'literal'];
    }
    if (Number.isInteger(parseInt(word))) {
        //debug("Number: " + word);
        return [word, 'integer'];
    }
    if (separationList.indexOf(word) >= 0) {
        return [word, 'operation'];
    }
    if (Number.isNaN(word)) {
        return [word, 'integer'];
    }
    if ((typeof word === 'object') && Array.isArray(word)) {
        return [word, 'array'];
    }
    if (word.startsWith('[') && word.endsWith(']')) {
        return [JSON.parse(word), 'array'];
    }
    debug("Did not identify " + JSON.stringify(word));
    return [word, 'unknown'];
}

function stringify(input) {
    debug("Stringifying " + JSON.stringify(input));
    if (input[1] === 'integer') return input[0] == 42 ? 'Life, the universe, and everything' : input[0];
    if (input[1] === 'literal' && (Number.isInteger(input[0])))//|| deString(input[0]) == input[0]))
        return "'" + input[0] + "'";
    if (input[1] === 'literal' && typeof input[0] === "object" && Array.isArray(input[0]))
        return '"' + JSON.stringify(input[0]) + '"';
    if (input[1] === 'literal') return input[0];
    if (input[1] === 'boolean') return input[0];
    return input;
}

function deString(input) {
    if (input.startsWith("'")) input = input.substring(1);
    if (input.startsWith('"')) input = input.substring(1);
    if (input.endsWith("'")) input = input.substring(0, input.length - 1);
    if (input.endsWith('"')) input = input.substring(0, input.length - 1);
    return input;
}


