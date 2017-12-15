import { EventName, PropName, toPropName } from "../common/defs";
import { Event } from "./event";
import { Env } from "./env";

export type Value = string | number | boolean | null;

export interface Expr {
    eval(env: Env): Value;
}

class ConstExpr {
    constructor(private readonly value: Value) {}
    eval(env: Env): Value {
        return this.value;
    }
}

class PropExpr {
    constructor(private readonly propName: PropName) {}
    eval(env: Env): Value {
        const value = env.event[this.propName];
        if (value === undefined) {
            return null;
        }
        return value;
    }
}

class FuncExpr {
    constructor(
        private readonly func: (args: ReadonlyArray<Value>) => Value,
        private readonly args: ReadonlyArray<Expr>
    ) {}
    eval(env: Env): Value {
        return this.func(this.args.map(e => e.eval(env)));
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
    if (typeof form == "number") {
        return new ConstExpr(form);
    }
    if (typeof form == "boolean") {
        return new ConstExpr(form);
    }
    if (typeof form === "string") {
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
    switch (form[0]) {
        case "if": return new IfExpr(parseExpr(form[1]), parseExpr(form[2]), parseExpr(form[3]));
        case "=": return new FuncExpr(args => args.reduce((a, b) => a === b), parseArgs(form, 2));
        case "!=": return new FuncExpr(args => args.reduce((a, b) => a !== b), parseArgs(form, 2));
        case "and": return new FuncExpr(args => args.reduce((a, b) => a && b), parseArgs(form, 2));
        case "or": return new FuncExpr(args => args.reduce((a, b) => a || b), parseArgs(form, 2));
        case "+": return new FuncExpr(args => args.reduce((a, b) => toNumber(a) + toNumber(b)), parseArgs(form, 2));
        case "-": return new FuncExpr(args => args.reduce((a, b) => toNumber(a) - toNumber(b)), parseArgs(form, 2));
        case "*": return new FuncExpr(args => args.reduce((a, b) => toNumber(a) * toNumber(b)), parseArgs(form, 2));
        case "/": return new FuncExpr(args => args.reduce((a, b) => toNumber(a) / toNumber(b)), parseArgs(form, 2));
        case "%": return new FuncExpr(args => args.reduce((a, b) => toNumber(a) % toNumber(b)), parseArgs(form, 2));
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