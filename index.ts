import * as m from "./mithril";

enum AggregatorName {
    last_value = "last_value",
    funnel = "funnel",
}

enum PropName {
    name = "name",
    time = "time",
    platform = "platform",
    app_version = "app_version",
    was_signup = "was_signup",
}

enum PropType {
    string = "string",
    boolean = "boolean",
    number = "number",
}

enum EventName {
    platform_changed = "platform_changed",
    app_version_changed = "app_version_changed",
    swipe_to_login = "swipe_to_login",
    login_complete = "login_complete",
    postlogin_settings_complete = "postlogin_settings_complete",
    postlogin_tutorial_complete = "postlogin_tutorial_complete",
}

const eventProps: { readonly [name in EventName]: ReadonlyArray<PropName> } = {
    platform_changed: makeEventProps(PropName.platform),
    app_version_changed: makeEventProps(PropName.app_version),
    swipe_to_login: makeEventProps(),
    login_complete: makeEventProps(PropName.was_signup),
    postlogin_settings_complete: makeEventProps(),
    postlogin_tutorial_complete: makeEventProps(),
};

const propTypes: { readonly [name in PropName]: PropType } = {
    name: PropType.string,
    time: PropType.number,
    platform: PropType.string,
    app_version: PropType.string,
    was_signup: PropType.boolean,
};


function makeEventProps(...props: PropName[]): ReadonlyArray<PropName> {
    return [PropName.name, PropName.time, ...props];
}

function getKeys<T>(obj: T): ReadonlyArray<keyof T> {
    const names: (keyof T)[] = [];
    for (const name in obj) {
        names.push(name);
    }
    return names;
}

function toPropName(name: string): PropName {
    if (PropName.hasOwnProperty(name)) {
        return name as PropName;
    }
    throw new Error("bad prop name: " + name);
}

function toEventName(name: string): EventName {
    if (EventName.hasOwnProperty(name)) {
        return name as EventName;
    }
    throw new Error("bad event name: " + name);
}

function toAggregatorName(name: string): AggregatorName {
    if (AggregatorName.hasOwnProperty(name)) {
        return name as AggregatorName;
    }
    throw new Error("bad aggregator name: " + name);
}



interface DropdownAttrs {
    readonly label: string;
    readonly choices: ReadonlyArray<string>;
    readonly onChange: (choice: string) => void;
    readonly getLabel?: (choice: string) => string;
}
const DropdownComponent: m.Component<DropdownAttrs> = {
    view(vnode) {
        return m("div",
            vnode.attrs.label, ": ",
            m("select",
                {
                    oncreate(selectnode) {
                        const value = (selectnode.dom as any).value;
                        if (value) {
                            vnode.attrs.onChange(value);
                            m.redraw();
                        }
                    },
                    oninput(e: any) {
                        const value = e.target.value;
                        if (value) {
                            vnode.attrs.onChange(value);
                        }
                    }
                },
                vnode.attrs.choices.map(name => m("option", {value: name},
                    vnode.attrs.getLabel ? vnode.attrs.getLabel(name) : name))
            )
        );
    }
};


interface EventPropertyAttrs {
    readonly eventName: EventName;
    onChange(propName: PropName): void;
}
const EventPropertyComponent: m.Component<EventPropertyAttrs> = {
    view(vnode) {
        const props = eventProps[vnode.attrs.eventName];
        return m(DropdownComponent, {
            label: "Property",
            choices: props,
            onChange(value: string) {
                vnode.attrs.onChange(toPropName(value));
            },
            getLabel(value: string): string {
                return value + ": " + propTypes[toPropName(value)];
            }
        });
    }
}


interface EventAttrs {
    onChange(eventName: EventName): void;
}
const EventComponent: m.Component<EventAttrs> = {
    view(vnode) {
        return m(DropdownComponent, {
            label: "Event",
            choices: getKeys(EventName),
            onChange(value: string) {
                vnode.attrs.onChange(toEventName(value));
            }
        });
    }
};


type AggregatorExpr = ReadonlyArray<any>;

interface LastValueAggregatorAttrs {
    onChange(expr: AggregatorExpr): void;
}
interface LastValueAggregatorState {
    eventName?: EventName;
    propName?: PropName;
}
const LastValueAggregatorComponent: m.Component<LastValueAggregatorAttrs, LastValueAggregatorState> = {
    view(vnode) {
        return m("div",
            m(EventComponent, {
                onChange(eventName: EventName) {
                    vnode.state.eventName = eventName;
                    if (vnode.state.eventName && vnode.state.propName)  {
                        vnode.attrs.onChange([AggregatorName.last_value, vnode.state.eventName, vnode.state.propName]);                            
                    }
                }
            }),
            (() => {
                if (!vnode.state.eventName) {
                    return null;
                }
                return m(EventPropertyComponent, {
                    eventName: vnode.state.eventName,
                    onChange(propName: PropName) {
                        vnode.state.propName = propName;
                        if (vnode.state.eventName && vnode.state.propName)  {
                            vnode.attrs.onChange([AggregatorName.last_value, vnode.state.eventName, vnode.state.propName]);                            
                        }
                    }
                });
            })()
        );
    }
};


interface FunnelAggregatorAttrs {
    onChange(expr: AggregatorExpr): void;
}
interface FunnelAggregatorState {
    events: EventName[];
}
const FunnelAggregatorComponent: m.Component<FunnelAggregatorAttrs, FunnelAggregatorState> = {
    oninit(vnode) {
        vnode.state.events = [];
    },
    view(vnode) {
        return m("div",
            m("button", {
                type: "button",
                onclick() {
                    vnode.state.events.push((getKeys(EventName) as EventName[])[0]);
                }
            }, "Add event"),
            vnode.state.events.map((e, index) => {
                return m(EventComponent, {
                    onChange(eventName: EventName) {
                        vnode.state.events[index] = eventName;
                        vnode.attrs.onChange([AggregatorName.funnel, ...vnode.state.events]);
                    }
                });
            })
        );
    }
};


interface AggregatorSpec {
    name: AggregatorName;
    expr: AggregatorExpr;
}

interface AggregatorMakerAttrs {
    onChange(expr: AggregatorExpr): void;
}
interface AggregatorMakerState {
    aggregatorName?: AggregatorName
}
const AggregatorMakerComponent: m.Component<AggregatorMakerAttrs, AggregatorMakerState> = {
    view(vnode) {
        return m("div",
            m(DropdownComponent, {
                label: "Aggregator",
                choices: getKeys(AggregatorName),
                onChange(value: string) {
                    vnode.state.aggregatorName = toAggregatorName(value);
                }
            }),
            (() => {
                switch (vnode.state.aggregatorName) {
                    case AggregatorName.last_value:
                        return m(LastValueAggregatorComponent, {
                            onChange: vnode.attrs.onChange
                        });
                    case AggregatorName.funnel:
                        return m(FunnelAggregatorComponent, {
                            onChange: vnode.attrs.onChange
                        });
                    default:
                        return "unknown aggregator";
                }
            })()
        );
    }
};


const AggregatorPage: m.Component = {
    view() {
        return m(AggregatorMakerComponent, {
            onChange(expr: AggregatorExpr) {
                console.log(expr);
            }
        });
    }
};


m.mount(document.body, AggregatorPage);






type Value = string | number | boolean | null;

interface Event {
    name: EventName;
    time: number;
    [prop: string]: Value;
}

interface Aggregator {
    readonly name: string;
    readonly currentValue: Value;
    processEvent(event: Event): void;
}

class LastValueAggregator implements Aggregator {
    private value: Value = null;

    constructor(
        readonly name: string,
        private readonly eventName: EventName,
        private readonly propertyName: string
    ) {}

    get currentValue(): Value {
        return this.value;
    }

    processEvent(event: Event): void {
        if (event.name === this.eventName) {
            this.value = event[this.propertyName];
        }
    }
}

class FunnelAggregator implements Aggregator {
    private counter: number = 0;

    constructor(
        readonly name: string,
        private readonly events: ReadonlyArray<EventName>
    ) {}

    get currentValue(): Value {
        return this.counter;
    }

    processEvent(event: Event): void {
        const counter = this.counter % this.events.length;
        if (event.name === this.events[counter]) {
            ++this.counter;
        }
    }
}

class EventProcessor {
    constructor(private readonly aggregators: ReadonlyArray<Aggregator>) {}

    get currentValues(): {[name: string]: Value} {
        const values: {[name: string]: Value} = {};
        for (const agg of this.aggregators) {
            values[agg.name] = agg.currentValue;
        }
        return values;
    }

    processEvent(event: Event): void {
        for (const agg of this.aggregators) {
            agg.processEvent(event);
        }
    }
}

function parseEventProcessor(spec: any): EventProcessor {
    const resultAggregators: Aggregator[] = [];

    const aggregators = spec.aggregators;
    for (const aggName in aggregators) {
        const params = aggregators[aggName];
        switch (toAggregatorName(params[0])) {
            case AggregatorName.last_value:
                resultAggregators.push(new LastValueAggregator(
                    aggName,
                    toEventName(params[1]),
                    toPropName(params[2])
                ));
                break;
            case AggregatorName.funnel:
                resultAggregators.push(new FunnelAggregator(
                    aggName,
                    params.slice(1).map(toEventName)
                ));
                break;
        }
    }

    return new EventProcessor(resultAggregators);
}


const events: Event[] = [
    {
        name: EventName.platform_changed,
        time: 123,
        platform: "Android"
    },
    {
        name: EventName.app_version_changed,
        time: 123,
        app_version: "1.0.2000.0"
    },
    {
        name: EventName.swipe_to_login,
        time: 123
    },
    {
        name: EventName.login_complete,
        time: 123,
        was_signup: true
    },
    {
        name: EventName.postlogin_settings_complete,
        time: 123
    },
    {
        name: EventName.postlogin_tutorial_complete,
        time: 123
    },
];

const processorSpec = {
    "aggregators": {
        "platform": [ "last_value", "platform_changed", "platform" ],
        "app_version": [ "last_value", "app_version_changed", "app_version" ],
        "signup_funnel": [ "funnel",
            "swipe_to_login",
            "login_complete",
            "postlogin_settings_complete",
            "postlogin_tutorial_complete"
        ]
    }
};

const proc = parseEventProcessor(processorSpec);
for (const e of events) {
    proc.processEvent(e);
}

const values = proc.currentValues;
for (const name in values) {
    console.log(name + ": " + values[name]);
}
