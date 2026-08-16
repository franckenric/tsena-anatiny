import Foundation
import Capacitor
import MessageUI

@objc(SmsManagerPlugin)
public class SmsManagerPlugin: CAPPlugin, CAPBridgedPlugin, MFMessageComposeViewControllerDelegate {
    public let identifier = "SmsManagerPlugin"
    public let jsName = "SmsManager"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise)
    ]

    private var pluginCall: CAPPluginCall?

    @objc public func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
        switch result {
        case .cancelled:
            self.pluginCall?.resolve(["cancelled": true])
        case .failed:
            self.pluginCall?.resolve(["error": "SEND_FAILED"])
        case .sent:
            self.pluginCall?.resolve()
        @unknown default:
            self.pluginCall?.resolve(["error": "UNKNOWN_STATE"])
        }
        controller.dismiss(animated: true, completion: nil)
    }

    @objc func send(_ call: CAPPluginCall) {
        self.pluginCall = call
        let rawNumbers = call.getArray("numbers", [])
        let numbers = rawNumbers.compactMap { $0 as? String }
        guard !numbers.isEmpty else {
            call.resolve(["error": "ERR_NO_NUMBERS"])
            return
        }
        let text = call.getString("text", "")

        if !MFMessageComposeViewController.canSendText() {
            call.resolve(["error": "ERR_SERVICE_NOTFOUND"])
            return
        }

        guard let viewController = (bridge as AnyObject).value(forKey: "viewController") as? UIViewController else {
            call.resolve(["error": "ERR_NO_VIEW_CONTROLLER"])
            return
        }

        DispatchQueue.main.async {
            let composeVC = MFMessageComposeViewController()
            composeVC.messageComposeDelegate = self
            composeVC.recipients = numbers
            composeVC.body = text
            viewController.present(composeVC, animated: true, completion: nil)
        }
    }
}
