//
//  RanchOSApp.swift
//  RanchOS
//
//  Native iOS application for RanchOS - Smart Ranch Management System
//  Supports multi-tenant architecture with configurable server URLs
//

import SwiftUI

@main
struct RanchOSApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

/// Global application state management
class AppState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var currentUser: String?
    @Published var userRole: String = "user"
    @Published var serverURL: String?

    init() {
        // Load saved authentication state
        self.isAuthenticated = UserDefaults.standard.bool(forKey: "ranchOS_authenticated")
        self.currentUser = UserDefaults.standard.string(forKey: "ranchOS_user")
        self.userRole = UserDefaults.standard.string(forKey: "ranchOS_role") ?? "user"
        self.serverURL = ServerConfigManager.shared.getServerURL()
    }

    func login(username: String, role: String) {
        self.currentUser = username
        self.userRole = role
        self.isAuthenticated = true

        // Persist to UserDefaults
        UserDefaults.standard.set(true, forKey: "ranchOS_authenticated")
        UserDefaults.standard.set(username, forKey: "ranchOS_user")
        UserDefaults.standard.set(role, forKey: "ranchOS_role")
    }

    func logout() {
        self.currentUser = nil
        self.userRole = "user"
        self.isAuthenticated = false

        // Clear persisted state
        UserDefaults.standard.removeObject(forKey: "ranchOS_authenticated")
        UserDefaults.standard.removeObject(forKey: "ranchOS_user")
        UserDefaults.standard.removeObject(forKey: "ranchOS_role")

        // Clear secure credentials
        SecureStorage.shared.clearCredentials()
    }

    func setServerURL(_ url: String) {
        self.serverURL = url
        ServerConfigManager.shared.saveServerURL(url)
    }
}
