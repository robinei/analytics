import { Event } from "./event";
import { Value } from "./expr";

export interface Env {
    readonly event: Event;
    readonly variables: { readonly [name: string]: Value };
}
