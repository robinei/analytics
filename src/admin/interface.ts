import * as m from "mithril";
import {
    AggregatorName,
    PropName,
    TypeName,
    EventName,
    eventProps,
    propTypes,
    toAggregatorName,
    toPropName,
    toEventName,
    getKeys
} from "../common/defs";


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
function onSelectIfAggregatorChanged(vnode: m.Vnode<SelectIfAggregatorAttrs, SelectIfAggregatorState>): void {
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


export const AggregatorPage: m.Component = {
    view() {
        return m(AggregatorMakerComponent, {
            onChange(expr: AggregatorExpr) {
                console.log(expr);
            }
        });
    }
};
