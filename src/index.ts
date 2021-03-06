import * as m from "mithril";
import { AggregatorPage } from "./admin/interface";
import { EventName } from "./common/defs";
import { parseExpr } from "./client/expr";
import { Event, AnalyticsContext, AnalyticsSpec } from "./client/context";

m.mount(document.body, AggregatorPage);


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

let analyticsSpec: AnalyticsSpec = {
    variables: {
        album_layout_grid_is_default: true,
        album_layout_editable: true,
    },
    functions: {
        "fac": ["if", ["<", "arg.0", 2],
                      1,
                      ["*", "arg.0",
                            ["func.fac", ["-", "arg.0", 1]]]]
    },
    aggregators: {
        test: [ "select_if", true, "var.album_layout_grid_is_default" ],
        test2: [ "select_if", true, "agg.test" ],
        test3: [ "select_if", true, ["func.fac", 10] ],
        platform: [ "select_if", ["=", "event.name", "platform_changed"], "event.platform" ],
        app_version: [ "select_if", ["=", "event.name", "app_version_changed"], "event.app_version" ],
        signup_funnel: [ "funnel",
            ["=", "event.name", "swipe_to_login"],
            ["and", ["=", "event.name", "login_complete"], "event.was_signup"],
            ["=", "event.name", "postlogin_settings_complete"],
            ["=", "event.name", "postlogin_tutorial_complete"]
        ],
        signup_funnel2: [ "state_machine",
            ["if", ["=", "event.name", "swipe_to_login"], 1, 0],
            ["if", ["and", ["=", "event.name", "login_complete"], "event.was_signup"], 2, 1],
            ["if", ["=", "event.name", "postlogin_settings_complete"], 3, 2],
            ["if", ["=", "event.name", "postlogin_tutorial_complete"], 4, 3]
        ],
    },
    triggers: {
        after_signup: {
            condition: ["=", "agg.signup_funnel2", 4],
            action: {
                name: "alert",
                message: "Hello World!"
            }
        }
    }
};


const context = new AnalyticsContext();
context.updateWithSpec(analyticsSpec);

for (const e of events) {
    context.trackEvent(e);
}

analyticsSpec = JSON.parse(JSON.stringify(analyticsSpec));
//analyticsSpec.variables.album_layout_grid_is_default = false;
context.updateWithSpec(analyticsSpec);

const values = context.currentValues;
for (const name in values) {
    console.log(name + ": " + values[name]);
}
