//
//  ServerConfigManager.swift
//  RanchOS
//
//  Manages multi-tenant server URL configuration
//  Each ranch customer has their own unique server URL
//

import Foundation

class ServerConfigManager {
    static let shared = ServerConfigManager()

    private let serverURLKey = "ranchOS_serverURL"
    private let defaults = UserDefaults.standard

    private init() {}

    /// Get the configured server URL
    /// - Returns: Server URL string or nil if not configured
    func getServerURL() -> String? {
        return defaults.string(forKey: serverURLKey)
    }

    /// Save server URL to persistent storage
    /// - Parameter url: The server URL (e.g., "https://ranch-3strands.ranchos.app")
    func saveServerURL(_ url: String) {
        // Normalize URL by removing trailing slash
        let normalizedURL = url.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "/$", with: "", options: .regularExpression)

        defaults.set(normalizedURL, forKey: serverURLKey)
    }

    /// Clear saved server URL
    func clearServerURL() {
        defaults.removeObject(forKey: serverURLKey)
    }

    /// Validate server URL format
    /// - Parameter url: URL string to validate
    /// - Returns: True if URL is valid
    func validateURL(_ url: String) -> Bool {
        guard let urlObj = URL(string: url) else { return false }
        guard let scheme = urlObj.scheme else { return false }

        // Must be http or https
        guard scheme == "http" || scheme == "https" else { return false }

        // Must have a host
        guard urlObj.host != nil else { return false }

        return true
    }

    /// Build full API endpoint URL
    /// - Parameter endpoint: API endpoint path (e.g., "/api/login")
    /// - Returns: Full URL string or nil if server not configured
    func buildAPIURL(endpoint: String) -> String? {
        guard let serverURL = getServerURL() else { return nil }

        // Ensure endpoint starts with /
        let normalizedEndpoint = endpoint.hasPrefix("/") ? endpoint : "/\(endpoint)"

        return "\(serverURL)\(normalizedEndpoint)"
    }

    /// Check if server is configured
    var isConfigured: Bool {
        return getServerURL() != nil
    }
}
