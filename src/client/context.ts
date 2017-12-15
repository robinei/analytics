import { Aggregator, parseAggregator } from "./aggregator";
import { Value } from "./expr";
import { Env } from "./env";
import { Event } from "./event";
import { deepEqual } from "../common/util";

export interface AnalyticsSpec {
    aggregators: { [name: string]: any[] },
    triggers: { [name: string]: any[] },
}

export class AnalyticsContext implements Env {
    private readonly aggregators: { [name: string]: Aggregator } = {};
    private readonly events: Event[] = [];
    private currentlyProcessingEvent?: Event;

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

    get event(): Event {
        if (!this.currentlyProcessingEvent) {
            throw new Error("only call during event processing");
        }
        return this.currentlyProcessingEvent;
    }

    trackEvent(event: Event): void {
        this.currentlyProcessingEvent = event;
        for (const name in this.aggregators) {
            this.aggregators[name].processEvent(this);
        }
    }

    replayEventLog(): void {
        for (const name in this.aggregators) {
            this.aggregators[name].reset();
        }
        for (const event of this.events) {
            this.currentlyProcessingEvent = event;
            for (const name in this.aggregators) {
                this.aggregators[name].processEvent(this);
            }
        }
    }

    updateWithSpec(spec: AnalyticsSpec) {
        let newAggregators = false;

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
                newAggregators = true;
            }
        }

        for (const name in this.aggregators) {
            if (!spec.aggregators[name]) {
                delete this.aggregators[name];
            }
        }

        if (newAggregators) {
            this.replayEventLog();
        }
    }
}
