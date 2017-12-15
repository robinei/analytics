import { EventName } from "../common/defs";
import { Value } from "./expr";

export interface Event {
    readonly name: EventName;
    readonly time: number;
    readonly [prop: string]: Value;
}
