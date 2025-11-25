import SwiftUI

@main
struct RanchOSApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
    }
}

/// Global application state manager
@MainActor
class AppState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var currentUser: User?
    @Published var serverURL: String?
    @Published var isFirstLaunch: Bool = true

    private let authService = AuthService.shared
    private let configService = ConfigService.shared

    init() {
        loadConfiguration()
    }

    func loadConfiguration() {
        serverURL = configService.getServerURL()
        isFirstLaunch = (serverURL == nil)

        if let user = authService.getCurrentUser() {
            currentUser = user
            isAuthenticated = true
        }
    }

    func logout() {
        authService.logout()
        currentUser = nil
        isAuthenticated = false
    }
}
