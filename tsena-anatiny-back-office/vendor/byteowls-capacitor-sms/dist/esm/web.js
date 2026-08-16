import { WebPlugin } from '@capacitor/core';
export class SmsManagerPluginWeb extends WebPlugin {
    async send() {
        throw this.unimplemented('Not implemented on web.');
    }
}
//# sourceMappingURL=web.js.map