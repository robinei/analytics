
export enum TypeName {
    string = "string",
    boolean = "boolean",
    number = "number",
}

export enum VariableName {
    album_layout_grid_is_default = "album_layout_grid_is_default",
    album_layout_editable = "album_layout_editable",
}

export const variableTypes: { readonly [name in VariableName]: TypeName } = {
    album_layout_grid_is_default: TypeName.boolean,
    album_layout_editable: TypeName.boolean,
};

export enum AggregatorName {
    select_if = "select_if",
    funnel = "funnel",
    state_machine = "state_machine",
}

export enum PropName {
    name = "name",
    time = "time",
    platform = "platform",
    app_version = "app_version",
    was_signup = "was_signup",
}

export const propTypes: { readonly [name in PropName]: TypeName } = {
    name: TypeName.string,
    time: TypeName.number,
    platform: TypeName.string,
    app_version: TypeName.string,
    was_signup: TypeName.boolean,
};

export enum EventName {
    platform_changed = "platform_changed",
    app_version_changed = "app_version_changed",
    swipe_to_login = "swipe_to_login",
    login_complete = "login_complete",
    postlogin_settings_complete = "postlogin_settings_complete",
    postlogin_tutorial_complete = "postlogin_tutorial_complete",
}

export const eventProps: { readonly [name in EventName]: ReadonlyArray<PropName> } = {
    platform_changed: makeEventProps(PropName.platform),
    app_version_changed: makeEventProps(PropName.app_version),
    swipe_to_login: makeEventProps(),
    login_complete: makeEventProps(PropName.was_signup),
    postlogin_settings_complete: makeEventProps(),
    postlogin_tutorial_complete: makeEventProps(),
};

function makeEventProps(...props: PropName[]): ReadonlyArray<PropName> {
    return [PropName.name, PropName.time, ...props];
}

export function toVariableName(name: string): VariableName {
    if (VariableName.hasOwnProperty(name)) {
        return name as VariableName;
    }
    throw new Error("bad variable name: " + name);
}

export function toAggregatorName(name: string): AggregatorName {
    if (AggregatorName.hasOwnProperty(name)) {
        return name as AggregatorName;
    }
    throw new Error("bad aggregator name: " + name);
}

export function toPropName(name: string): PropName {
    if (PropName.hasOwnProperty(name)) {
        return name as PropName;
    }
    throw new Error("bad prop name: " + name);
}

export function toEventName(name: string): EventName {
    if (EventName.hasOwnProperty(name)) {
        return name as EventName;
    }
    throw new Error("bad event name: " + name);
}

export function getKeys<T>(obj: T): ReadonlyArray<keyof T> {
    const names: (keyof T)[] = [];
    for (const name in obj) {
        names.push(name);
    }
    return names;
}
