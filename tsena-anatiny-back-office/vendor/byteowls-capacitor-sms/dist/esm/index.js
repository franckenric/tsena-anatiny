import { registerPlugin } from '@capacitor/core';
const SmsManager = registerPlugin('SmsManager', {
    web: () => import('./web').then(m => new m.SmsManagerPluginWeb()),
});
export * from './definitions';
export { SmsManager };
//# sourceMappingURL=index.js.map