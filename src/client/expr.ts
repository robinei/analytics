import {
    EventName,
    PropName, toPropName,
    VariableName, toVariableName,
} from "../common/defs";

export type Value = string | number | boolean | null;

export interface Env {
    readonly currentlyProcessingEvent?: { readonly [name: string]: Value };
    readonly aggregators: { readonly [name: string]: { readonly currentValue: Value} };
    readonly variables: { readonly [name: string]: Value };
    readonly funcExprs: { readonly [name: string]: Expr };
    readonly argStack: ReadonlyArray<Value>[];
}

export interface Expr {
    eval(env: Env): Value;
}

class ConstExpr {
    constructor(private readonly value: Value) {}
    eval(env: Env): Value {
        return this.value;
    }
}

class ArgExpr {
    constructor(private readonly index: number) {}
    eval(env: Env): Value {
        let value = undefined;
        if (env.argStack.length > 0) {
            value = env.argStack[env.argStack.length - 1][this.index];
        }
        if (value === undefined) {
            return null;
        }
        return value;
    }
}

class AggregatorExpr {
    constructor(private readonly name: string) {}
    eval(env: Env): Value {
        let value = undefined;
        const agg = env.aggregators[name];
        if (agg) {
            value = agg.currentValue;
        }
        if (value === undefined) {
            return null;
        }
        return value;
    }
}

class VariableExpr {
    constructor(private readonly name: VariableName) {}
    eval(env: Env): Value {
        const value = env.variables[this.name];
        if (value === undefined) {
            return null;
        }
        return value;
    }
}

class PropExpr {
    constructor(private readonly name: PropName) {}
    eval(env: Env): Value {
        let value = undefined;
        if (env.currentlyProcessingEvent !== undefined) {
            value = env.currentlyProcessingEvent[this.name];
        }
        if (value === undefined) {
            return null;
        }
        return value;
    }
}

class PrimitiveExpr {
    constructor(
        private readonly func: (args: ReadonlyArray<Value>) => Value,
        private readonly args: ReadonlyArray<Expr>
    ) {}
    eval(env: Env): Value {
        return this.func(this.args.map(e => e.eval(env)));
    }
}

class CallExpr {
    constructor(
        private readonly funcName: string,
        private readonly args: ReadonlyArray<Expr>
    ) {}
    eval(env: Env): Value {
        env.argStack.push(this.args.map(e => e.eval(env)));
        try {
            const expr = env.funcExprs[this.funcName];
            if (expr === undefined) {
                return null;
            }
            return expr.eval(env);
        } finally {
            env.argStack.pop();
        }
    }
}

class IfExpr {
    constructor(
        private readonly condExpr: Expr,
        private readonly thenExpr: Expr,
        private readonly elseExpr: Expr
    ) {}
    eval(env: Env): Value {
        return this.condExpr.eval(env) ? this.thenExpr.eval(env) : this.elseExpr.eval(env);
    }
}

export function parseExpr(form: any): Expr {
    if (typeof form === "number") {
        return new ConstExpr(form);
    }
    if (typeof form === "boolean") {
        return new ConstExpr(form);
    }
    if (typeof form === "string") {
        if (form.startsWith("arg.")) {
            return new ArgExpr(parseInt(form.slice(4)));
        }
        if (form.startsWith("agg.")) {
            return new AggregatorExpr(form.slice(4));
        }
        if (form.startsWith("var.")) {
            return new VariableExpr(toVariableName(form.slice(4)));
        }
        if (form.startsWith("event.")) {
            return new PropExpr(toPropName(form.slice(6)));
        }
        return new ConstExpr(form);
    }
    if (form === null) {
        return new ConstExpr(null);
    }
    if (!Array.isArray(form)) {
        throw new Error("unexpected expression form: " + form);
    }
    if (form.length === 0) {
        throw new Error("didn't expect empty array");
    }
    if (form[0].startsWith("func.")) {
        return new CallExpr(form[0].slice(5), parseArgs(form, 1));
    }
    switch (form[0]) {
        case "if": return new IfExpr(parseExpr(form[1]), parseExpr(form[2]), parseExpr(form[3]));
        case "=": return new PrimitiveExpr(args => args.reduce((a, b) => a === b), parseArgs(form, 2));
        case "!=": return new PrimitiveExpr(args => args.reduce((a, b) => a !== b), parseArgs(form, 2));
        case "and": return new PrimitiveExpr(args => args.reduce((a, b) => a && b), parseArgs(form, 2));
        case "or": return new PrimitiveExpr(args => args.reduce((a, b) => a || b), parseArgs(form, 2));
        case "+": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) + toNumber(b)), parseArgs(form, 2));
        case "-": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) - toNumber(b)), parseArgs(form, 2));
        case "*": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) * toNumber(b)), parseArgs(form, 2));
        case "/": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) / toNumber(b)), parseArgs(form, 2));
        case "%": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) % toNumber(b)), parseArgs(form, 2));
        case "<": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) < toNumber(b)), parseArgs(form, 2));
        case ">": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) > toNumber(b)), parseArgs(form, 2));
        case "<=": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) <= toNumber(b)), parseArgs(form, 2));
        case ">=": return new PrimitiveExpr(args => args.reduce((a, b) => toNumber(a) >= toNumber(b)), parseArgs(form, 2));
    }
    throw new Error("unexpected form in operator position: " + form[0]);
}

function parseArgs(form: ReadonlyArray<any>, minArgs: number): ReadonlyArray<Expr> {
    if (form.length < minArgs + 1) {
        throw new Error(`require ${minArgs} arguments, but found ${form.length - 1}`);
    }
    return form.slice(1).map(parseExpr);
}

function toNumber(value: Value): number {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            return num;
        }
    }
    throw new Error("expected number: " + value);
}
