import { Aggregator, parseAggregator } from "./aggregator";
import { Value, Env, Expr, parseExpr } from "./expr";
import { deepEqual } from "../common/util";
import { EventName } from "../common/defs";

export interface Event {
    readonly name: EventName;
    readonly time: number;
    readonly [prop: string]: Value;
}

export interface AnalyticsSpec {
    variables: { [name: string]: Value },
    functions: { [name: string]: any[] },
    aggregators: { [name: string]: any[] },
    triggers: { [name: string]: any },
}

export class AnalyticsContext implements Env {
    private readonly events: Event[] = [];

    currentlyProcessingEvent?: Event;
    readonly aggregators: { [name: string]: Aggregator } = {};
    variables: { readonly [name: string]: Value } = {};
    readonly argStack: ReadonlyArray<Value>[] = [];
    funcExprs: { [name: string]: Expr } = {};

    saveState(): { readonly [name: string]: any } {
        const savedState: { [name: string]: any[] } = {};
        for (const name in this.aggregators) {
            savedState[name] = this.aggregators[name].saveState();
        }
        return savedState;
    }

    restoreState(savedState: { readonly [name: string]: any }) {
        for (const name in this.aggregators) {
            this.aggregators[name].restoreState(savedState[name]);
        }
    }

    get currentValues(): {[name: string]: Value} {
        const values: {[name: string]: Value} = {};
        for (const name in this.aggregators) {
            values[name] = this.aggregators[name].currentValue;
        }
        return values;
    }

    trackEvent(event: Event): void {
        this.events.push(event);
        this.currentlyProcessingEvent = event;
        for (const name in this.aggregators) {
            this.aggregators[name].processEvent(this);
        }
    }

    replayEventLog(): void {
        for (const name in this.aggregators) {
            this.aggregators[name].reset();
        }
        if (this.events.length === 0) {
            return;
        }
        console.log("Replaying event log");
        for (const event of this.events) {
            this.currentlyProcessingEvent = event;
            for (const name in this.aggregators) {
                this.aggregators[name].processEvent(this);
            }
        }
    }

    updateWithSpec(spec: AnalyticsSpec) {
        let needReplay = false;

        if (!deepEqual(spec.variables, this.variables)) {
            this.variables = spec.variables;
            needReplay = true;
        }

        this.funcExprs = {};
        for (const name in spec.functions) {
            if (!spec.functions.hasOwnProperty(name)) {
                continue;
            }
            const form = spec.functions[name];
            const expr = parseExpr(form);
            this.funcExprs[name] = expr;
        }

        for (const name in spec.aggregators) {
            if (!spec.aggregators.hasOwnProperty(name)) {
                continue;
            }
            const form = spec.aggregators[name];
            const aggregator = this.aggregators[name];
            if (aggregator) {
                if (deepEqual(form, aggregator.sourceCode)) {
                    continue;
                }
            }
            const newAggregator = parseAggregator(form);
            if (!newAggregator) {
                delete this.aggregators[name];
            } else {
                this.aggregators[name] = newAggregator;
                needReplay = true;
            }
        }

        for (const name in this.aggregators) {
            if (!spec.aggregators[name]) {
                delete this.aggregators[name];
            }
        }

        if (needReplay) {
            this.replayEventLog();
        }
    }
}
