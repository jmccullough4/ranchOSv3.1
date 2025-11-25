import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.isFirstLaunch {
                ServerConfigView()
            } else if !appState.isAuthenticated {
                LoginView()
            } else {
                MainTabView()
            }
        }
        .animation(.easeInOut, value: appState.isAuthenticated)
        .animation(.easeInOut, value: appState.isFirstLaunch)
    }
}

struct MainTabView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var dataManager = RanchDataManager()

    var body: some View {
        TabView {
            MapView()
                .tabItem {
                    Label("Map", systemImage: "map.fill")
                }

            SensorDashboardView()
                .tabItem {
                    Label("Sensors", systemImage: "sensor.fill")
                }

            CameraGridView()
                .tabItem {
                    Label("Cameras", systemImage: "video.fill")
                }

            CattleListView()
                .tabItem {
                    Label("Cattle", systemImage: "leaf.fill")
                }

            if appState.currentUser?.role == .admin {
                AdminPanelView()
                    .tabItem {
                        Label("Admin", systemImage: "gear")
                    }
            }
        }
        .environmentObject(dataManager)
        .onAppear {
            dataManager.startPolling()
        }
        .onDisappear {
            dataManager.stopPolling()
        }
    }
}
