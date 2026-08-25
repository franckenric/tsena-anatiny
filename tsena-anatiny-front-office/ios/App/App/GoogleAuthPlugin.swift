import Foundation
import Capacitor
import GoogleSignIn

@objc(GoogleAuthPlugin)
public class GoogleAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleAuthPlugin"
    public let jsName = "GoogleAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refresh", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signOut", returnType: CAPPluginReturnPromise)
    ]

    private var googleSignIn: GIDSignIn { GIDSignIn.sharedInstance }
    private var signInCall: CAPPluginCall?
    private var callClientId: String?

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOpenUrl(_:)),
            name: Notification.Name.capacitorOpenURL,
            object: nil
        )
    }

    @objc func initialize(_ call: CAPPluginCall) {
        callClientId = call.getString("clientId")
        ensureConfiguration()
        guard googleSignIn.configuration != nil else {
            call.reject("No Google client ID configured")
            return
        }
        call.resolve()
    }

    private func ensureConfiguration() {
        guard googleSignIn.configuration == nil else { return }
        let clientId = callClientId ?? pluginConfig?.getString("clientId") ?? ""
        let serverClientId = pluginConfig?.getString("serverClientId")
        let config: GIDConfiguration
        if !clientId.isEmpty {
            config = GIDConfiguration(clientID: clientId, serverClientID: serverClientId)
        } else if let serverClientId = serverClientId, !serverClientId.isEmpty {
            config = GIDConfiguration(clientID: serverClientId)
        } else {
            return
        }
        googleSignIn.configuration = config
    }

    @objc func signIn(_ call: CAPPluginCall) {
        signInCall = call
        ensureConfiguration()

        guard googleSignIn.configuration != nil else {
            call.reject("No Google client ID configured")
            return
        }

        guard let presentingVc = self.bridge?.viewController else {
            call.reject("No view controller available")
            return
        }

        DispatchQueue.main.async {
            if self.googleSignIn.hasPreviousSignIn() {
                self.googleSignIn.restorePreviousSignIn { user, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription)
                        return
                    }
                    guard let user = user else {
                        self.signInCall?.reject("No user found")
                        return
                    }
                    self.resolveSignIn(user: user)
                }
            } else {
                self.googleSignIn.signIn(
                    withPresenting: presentingVc,
                    hint: nil,
                    additionalScopes: self.getScopes()
                ) { result, error in
                    if let error = error {
                        self.signInCall?.reject(error.localizedDescription)
                        return
                    }
                    guard let result = result else {
                        self.signInCall?.reject("Sign in failed")
                        return
                    }
                    self.resolveSignIn(user: result.user, serverAuthCode: result.serverAuthCode)
                }
            }
        }
    }

    @objc func refresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.ensureConfiguration()
            guard self.googleSignIn.currentUser != nil else {
                call.reject("User not logged in")
                return
            }
            self.googleSignIn.restorePreviousSignIn { user, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                guard let user = user else {
                    call.reject("No user found")
                    return
                }
                self.resolveSignIn(user: user)
            }
        }
    }

    @objc func signOut(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.googleSignIn.signOut()
            call.resolve()
        }
    }

    @objc private func handleOpenUrl(_ notification: Notification) {
        guard let object = notification.object as? [String: Any],
              let url = object["url"] as? URL else {
            return
        }
        googleSignIn.handle(url)
    }

    private func resolveSignIn(user: GIDGoogleUser, serverAuthCode: String? = nil) {
        let userData: [String: Any] = [
            "authentication": [
                "accessToken": user.accessToken.tokenString ?? "",
                "idToken": user.idToken?.tokenString ?? "",
                "refreshToken": user.refreshToken.tokenString ?? ""
            ],
            "serverAuthCode": serverAuthCode ?? NSNull(),
            "email": user.profile?.email ?? NSNull(),
            "familyName": user.profile?.familyName ?? NSNull(),
            "givenName": user.profile?.givenName ?? NSNull(),
            "id": user.userID ?? NSNull(),
            "name": user.profile?.name ?? NSNull()
        ]
        signInCall?.resolve(userData)
    }

    private func getScopes() -> [String] {
        let defaultScopes = ["email", "profile", "openid"]
        let configScopes = pluginConfig?.getArray("scopes")?.compactMap { $0 as? String } ?? []
        guard !configScopes.isEmpty else {
            return defaultScopes
        }
        return Array(Set(configScopes + defaultScopes))
    }

    private var pluginConfig: PluginConfig? {
        bridge?.config.getPluginConfig(jsName)
    }
}
