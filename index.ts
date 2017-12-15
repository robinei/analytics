import * as m from "./mithril";
import { Vnode } from "./mithril";

enum AggregatorName {
    select_if = "select_if",
    funnel = "funnel",
    state_machine = "state_machine",
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

interface SelectIfAggregatorAttrs {
    onChange(expr: AggregatorExpr): void;
}
interface SelectIfAggregatorState {
    eventName: EventName;
    propName: PropName;
}
function onSelectIfAggregatorChanged(vnode: Vnode<SelectIfAggregatorAttrs, SelectIfAggregatorState>): void {
    if (vnode.state.eventName && vnode.state.propName)  {
        vnode.attrs.onChange([AggregatorName.select_if, vnode.state.eventName, vnode.state.propName]);                            
    }
}
const SelectIfAggregatorComponent: m.Component<SelectIfAggregatorAttrs, SelectIfAggregatorState> = {
    oninit(vnode) {
        vnode.state.eventName = (getKeys(EventName) as EventName[])[0];
        vnode.state.propName = (getKeys(PropName) as PropName[])[0];
    },
    view(vnode) {
        return m("div",
            m(EventComponent, {
                onChange(eventName: EventName) {
                    vnode.state.eventName = eventName;
                    onSelectIfAggregatorChanged(vnode);
                }
            }),
            m(EventPropertyComponent, {
                eventName: vnode.state.eventName,
                onChange(propName: PropName) {
                    vnode.state.propName = propName;
                    onSelectIfAggregatorChanged(vnode);
                }
            })
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
                    case AggregatorName.select_if:
                        return m(SelectIfAggregatorComponent, {
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
    readonly name: EventName;
    readonly time: number;
    readonly [prop: string]: Value;
}

interface Env {
    readonly event: Event;
}

interface Expr {
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





interface Aggregator {
    readonly name: string;
    readonly currentValue: Value;
    processEvent(env: Env): void;
}

class SelectIfAggregator implements Aggregator {
    private value: Value = null;

    constructor(
        readonly name: string,
        private readonly condExpr: Expr,
        private readonly valueExpr: Expr
    ) {}

    get currentValue(): Value {
        return this.value;
    }

    processEvent(env: Env): void {
        if (this.condExpr.eval(env)) {
            this.value = this.valueExpr.eval(env);
        }
    }
}

class FunnelAggregator implements Aggregator {
    private counter: number = 0;

    constructor(
        readonly name: string,
        private readonly condExprs: ReadonlyArray<Expr>
    ) {}

    get currentValue(): Value {
        return this.counter;
    }

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
        readonly name: string,
        private readonly stateExprs: ReadonlyArray<Expr>
    ) {}

    get currentValue(): Value {
        return this.state;
    }

    processEvent(env: Env): void {
        const stateExpr = this.stateExprs[this.state];
        if (stateExpr) {
            const nextState = stateExpr.eval(env);
            if (typeof nextState !== "number") {
                throw new Error("bad state: " + nextState);
            }
            this.state = nextState;
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

    processEvent(env: Env): void {
        for (const agg of this.aggregators) {
            agg.processEvent(env);
        }
    }
}


interface AnalyticsSpec {
    aggregators: { [name: string]: any[] }
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

function parseArgs(form: ReadonlyArray<any>, minArgs: number): ReadonlyArray<Expr> {
    if (form.length < minArgs + 1) {
        throw new Error(`require ${minArgs} arguments, but found ${form.length - 1}`);
    }
    return form.slice(1).map(parseExpr);
}

function parseExpr(form: any): Expr {
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




function parseEventProcessor(spec: any): EventProcessor {
    const resultAggregators: Aggregator[] = [];

    const aggregators = spec.aggregators;
    for (const aggName in aggregators) {
        const params = aggregators[aggName];
        switch (toAggregatorName(params[0])) {
            case AggregatorName.select_if:
                resultAggregators.push(new SelectIfAggregator(
                    aggName,
                    parseExpr(params[1]),
                    parseExpr(params[2])
                ));
                break;
            case AggregatorName.funnel:
                resultAggregators.push(new FunnelAggregator(
                    aggName,
                    params.slice(1).map(parseExpr)
                ));
                break;
            case AggregatorName.state_machine:
                resultAggregators.push(new StateMachineAggregator(
                    aggName,
                    params.slice(1).map(parseExpr)
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
        "platform": [ "select_if", ["=", "event.name", "platform_changed"], "event.platform" ],
        "app_version": [ "select_if", ["=", "event.name", "app_version_changed"], "event.app_version" ],
        "signup_funnel": [ "funnel",
            ["=", "event.name", "swipe_to_login"],
            ["and", ["=", "event.name", "login_complete"], "event.was_signup"],
            ["=", "event.name", "postlogin_settings_complete"],
            ["=", "event.name", "postlogin_tutorial_complete"]
        ],
        "signup_funnel2": [ "state_machine",
            ["if", ["=", "event.name", "swipe_to_login"], 1, 0],
            ["if", ["and", ["=", "event.name", "login_complete"], "event.was_signup"], 2, 1],
            ["if", ["=", "event.name", "postlogin_settings_complete"], 3, 2],
            ["if", ["=", "event.name", "postlogin_tutorial_complete"], 4, 3]
        ],
    }
};

const expr = parseExpr(["if", ["=", "event.app_version", "1.1"], 10, 20]);
const env: {event:Event} = {
    event: {
        name: EventName.app_version_changed,
        time: 0,
        app_version: "1.0"
    }
};
console.log("VAL: " + expr.eval(env));

const proc = parseEventProcessor(processorSpec);
for (const e of events) {
    env.event = e;
    proc.processEvent(env);
}

const values = proc.currentValues;
for (const name in values) {
    console.log(name + ": " + values[name]);
}
