import { Aggregator, parseAggregator } from "./aggregator";
import { Value, Env } from "./expr";
import { deepEqual } from "../common/util";
import { EventName } from "../common/defs";

export interface Event {
    readonly name: EventName;
    readonly time: number;
    readonly [prop: string]: Value;
}

export interface AnalyticsSpec {
    variables: { [name: string]: Value },
    aggregators: { [name: string]: any[] },
    triggers: { [name: string]: any },
}

export class AnalyticsContext {
    private readonly events: Event[] = [];
    private readonly aggregators: { [name: string]: Aggregator } = {};
    private variables: { readonly [name: string]: Value } = {};
    private currentlyProcessingEvent?: Event;
    private readonly env: Env;

    constructor() {
        const context = this;
        this.env = {
            readEventProp(name: string): Value | undefined {
                if (!context.currentlyProcessingEvent) {
                    throw new Error("only call during event processing");
                }
                return context.currentlyProcessingEvent[name];
            },
            readVariable(name: string): Value | undefined {
                return context.variables[name];
            },
            readAggregator(name: string): Value | undefined {
                return context.aggregators[name].currentValue;
            }
        }
    }

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
            this.aggregators[name].processEvent(this.env);
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
                this.aggregators[name].processEvent(this.env);
            }
        }
    }

    updateWithSpec(spec: AnalyticsSpec) {
        let needReplay = false;

        if (!deepEqual(spec.variables, this.variables)) {
            this.variables = spec.variables;
            needReplay = true;
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
