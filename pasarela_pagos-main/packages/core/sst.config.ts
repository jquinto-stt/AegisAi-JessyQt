/// <reference path="./.sst/platform/config.d.ts" />
const createApp = (await import("./infra/app.js")).default;
export default createApp().resolve();
