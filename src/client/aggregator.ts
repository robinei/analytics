import { AggregatorName, toAggregatorName } from "../common/defs";
import { Value, Env, Expr, parseExpr } from "./expr";

export interface Aggregator {
    readonly sourceCode: any;
    readonly currentValue: Value;
    saveState(): any;
    restoreState(savedState: any): void;
    reset(): void;
    processEvent(env: Env): void;
}

class SelectIfAggregator implements Aggregator {
    private value: Value = null;

    constructor(
        readonly sourceCode: any,
        private readonly condExpr: Expr,
        private readonly valueExpr: Expr
    ) {}

    get currentValue(): Value { return this.value; }
    saveState(): any { return this.value; }
    restoreState(savedState: any) { this.value = savedState; }
    reset() { this.value = null; }

    processEvent(env: Env): void {
        if (this.condExpr.eval(env)) {
            this.value = this.valueExpr.eval(env);
        }
    }
}

class FunnelAggregator implements Aggregator {
    private counter: number = 0;

    constructor(
        readonly sourceCode: any,
        private readonly condExprs: ReadonlyArray<Expr>
    ) {}

    get currentValue(): Value { return this.counter; }
    saveState(): any { return this.counter; }
    restoreState(savedState: any) { this.counter = savedState; }
    reset() { this.counter = 0; }

    processEvent(env: Env): void {
        const condExpr = this.condExprs[this.counter % this.condExprs.length];
        if (condExpr.eval(env)) {
            ++this.counter;
        }
    }
}

class StateMachineAggregator implements Aggregator {
    private state: number = 0;

    constructor(
        readonly sourceCode: any,
        private readonly stateExprs: ReadonlyArray<Expr>
    ) {}

    get currentValue(): Value { return this.state; }
    saveState(): any { return this.state; }
    restoreState(savedState: any) { this.state = savedState; }
    reset() { this.state = 0; }

    processEvent(env: Env): void {
        const stateExpr = this.stateExprs[this.state];
        if (stateExpr) {
            const nextState = stateExpr.eval(env);
            if (typeof nextState === "number") {
                this.state = nextState;
            } else {
                console.log("bad state: " + nextState);
            }
        }
    }
}

export function parseAggregator(form: ReadonlyArray<any>): Aggregator | null {
    switch (toAggregatorName(form[0])) {
        case AggregatorName.select_if:
            return new SelectIfAggregator(form, parseExpr(form[1]), parseExpr(form[2]));
        case AggregatorName.funnel:
            return new FunnelAggregator(form, form.slice(1).map(parseExpr));
        case AggregatorName.state_machine:
            return new StateMachineAggregator(form, form.slice(1).map(parseExpr));
    }
    return null;
}
