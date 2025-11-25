//
//  ContentView.swift
//  RanchOS
//
//  Main content router - shows server config, login, or dashboard
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.serverURL == nil {
                // First run - server configuration
                ServerConfigView()
            } else if !appState.isAuthenticated {
                // Server configured but not logged in
                LoginView()
            } else {
                // Authenticated - show dashboard
                MainTabView()
            }
        }
        .preferredColorScheme(.dark) // RanchOS uses dark theme
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
