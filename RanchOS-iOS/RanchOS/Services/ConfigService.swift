import Foundation

/// Manages server URL configuration for multi-tenant SaaS deployment
class ConfigService {
    static let shared = ConfigService()

    private let userDefaults = UserDefaults.standard
    private let serverURLKey = "ranchOS_serverURL"

    private init() {}

    /// Get the configured server URL
    func getServerURL() -> String? {
        return userDefaults.string(forKey: serverURLKey)
    }

    /// Set the server URL (validates format before saving)
    func setServerURL(_ url: String) -> Bool {
        // Validate URL format
        guard let urlComponents = URLComponents(string: url),
              let scheme = urlComponents.scheme,
              ["http", "https"].contains(scheme.lowercased()),
              urlComponents.host != nil else {
            return false
        }

        userDefaults.set(url, forKey: serverURLKey)
        return true
    }

    /// Clear the server URL (for reset/logout scenarios)
    func clearServerURL() {
        userDefaults.removeObject(forKey: serverURLKey)
    }

    /// Get the full API base URL
    func getAPIBaseURL() -> String? {
        guard let serverURL = getServerURL() else {
            return nil
        }

        // Ensure no trailing slash
        return serverURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
}
