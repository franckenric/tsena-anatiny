import { WebPlugin } from '@capacitor/core';
import { SmsManagerPlugin } from "./definitions";
export declare class SmsManagerPluginWeb extends WebPlugin implements SmsManagerPlugin {
    send(): Promise<void>;
}
