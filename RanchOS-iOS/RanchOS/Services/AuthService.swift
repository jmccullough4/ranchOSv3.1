import Foundation
import Security

/// Handles authentication and secure credential storage using Keychain
class AuthService {
    static let shared = AuthService()

    private let userDefaults = UserDefaults.standard
    private let usernameKey = "ranchOS_username"
    private let userRoleKey = "ranchOS_userRole"
    private let keychainService = "com.3strands.ranchos"
    private let keychainAccount = "currentUser"

    private init() {}

    /// Attempt login with username and password
    func login(username: String, password: String) async throws -> User {
        guard let baseURL = ConfigService.shared.getAPIBaseURL() else {
            throw AuthError.noServerConfigured
        }

        let loginRequest = LoginRequest(username: username, password: password)

        guard let url = URL(string: "\(baseURL)/api/login") else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(loginRequest)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            throw AuthError.invalidCredentials
        }

        let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)

        let role = UserRole(rawValue: loginResponse.role) ?? .user
        let user = User(id: UUID().uuidString, username: loginResponse.user, role: role)

        // Save credentials securely
        try saveCredentials(username: username, password: password)
        saveUserInfo(user: user)

        return user
    }

    /// Get the currently logged-in user
    func getCurrentUser() -> User? {
        guard let username = userDefaults.string(forKey: usernameKey),
              let roleString = userDefaults.string(forKey: userRoleKey),
              let role = UserRole(rawValue: roleString) else {
            return nil
        }

        return User(id: UUID().uuidString, username: username, role: role)
    }

    /// Logout the current user
    func logout() {
        deleteCredentials()
        userDefaults.removeObject(forKey: usernameKey)
        userDefaults.removeObject(forKey: userRoleKey)
    }

    // MARK: - Private Keychain Methods

    private func saveCredentials(username: String, password: String) throws {
        let credentials = "\(username):\(password)"
        guard let data = credentials.data(using: .utf8) else {
            throw AuthError.keychainError
        }

        // Delete existing item first
        deleteCredentials()

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecValueData as String: data
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw AuthError.keychainError
        }
    }

    private func loadCredentials() -> (username: String, password: String)? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let credentials = String(data: data, encoding: .utf8) else {
            return nil
        }

        let parts = credentials.split(separator: ":", maxSplits: 1)
        guard parts.count == 2 else { return nil }

        return (String(parts[0]), String(parts[1]))
    }

    private func deleteCredentials() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keychainAccount
        ]

        SecItemDelete(query as CFDictionary)
    }

    private func saveUserInfo(user: User) {
        userDefaults.set(user.username, forKey: usernameKey)
        userDefaults.set(user.role.rawValue, forKey: userRoleKey)
    }
}

enum AuthError: LocalizedError {
    case noServerConfigured
    case invalidURL
    case invalidResponse
    case invalidCredentials
    case keychainError

    var errorDescription: String? {
        switch self {
        case .noServerConfigured:
            return "No server URL configured. Please configure your ranch server first."
        case .invalidURL:
            return "Invalid server URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .invalidCredentials:
            return "Invalid username or password"
        case .keychainError:
            return "Failed to store credentials securely"
        }
    }
}
