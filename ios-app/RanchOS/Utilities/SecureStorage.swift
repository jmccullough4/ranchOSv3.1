//
//  SecureStorage.swift
//  RanchOS
//
//  Secure credential storage using iOS Keychain Services
//  Stores username/password with encryption at rest
//

import Foundation
import Security

class SecureStorage {
    static let shared = SecureStorage()

    private let service = "com.3strandscattle.RanchOS"
    private let usernameKey = "username"
    private let passwordKey = "password"

    private init() {}

    // MARK: - Save Credentials

    /// Save username to Keychain
    func saveUsername(_ username: String) {
        save(key: usernameKey, value: username)
    }

    /// Save password to Keychain
    func savePassword(_ password: String) {
        save(key: passwordKey, value: password)
    }

    /// Save both username and password
    func saveCredentials(username: String, password: String) {
        saveUsername(username)
        savePassword(password)
    }

    // MARK: - Retrieve Credentials

    /// Retrieve username from Keychain
    func getUsername() -> String? {
        return retrieve(key: usernameKey)
    }

    /// Retrieve password from Keychain
    func getPassword() -> String? {
        return retrieve(key: passwordKey)
    }

    /// Retrieve both credentials
    func getCredentials() -> (username: String, password: String)? {
        guard let username = getUsername(),
              let password = getPassword() else {
            return nil
        }
        return (username, password)
    }

    // MARK: - Delete Credentials

    /// Clear all stored credentials
    func clearCredentials() {
        delete(key: usernameKey)
        delete(key: passwordKey)
    }

    // MARK: - Private Keychain Operations

    private func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        // Check if item already exists
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        // Delete existing item if present
        SecItemDelete(query as CFDictionary)

        // Add new item
        var addQuery = query
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly

        let status = SecItemAdd(addQuery as CFDictionary, nil)

        if status != errSecSuccess {
            print("⚠️ Keychain save failed for key '\(key)': \(status)")
        }
    }

    private func retrieve(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    private func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
