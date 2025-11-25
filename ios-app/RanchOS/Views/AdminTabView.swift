//
//  AdminTabView.swift
//  RanchOS
//
//  Admin settings and configuration (admin role only)
//

import SwiftUI

struct AdminTabView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @EnvironmentObject var appState: AppState
    @State private var showServerConfig = false

    var body: some View {
        NavigationStack {
            List {
                // Server Configuration
                Section {
                    HStack {
                        Label("Server URL", systemImage: "server.rack")
                        Spacer()
                        Text(appState.serverURL ?? "Not configured")
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .truncationMode(.middle)
                    }

                    Button(action: {
                        showServerConfig = true
                    }) {
                        Label("Change Server", systemImage: "arrow.triangle.2.circlepath")
                    }
                } header: {
                    Text("Server Configuration")
                }

                // User Info
                Section {
                    HStack {
                        Label("Username", systemImage: "person.fill")
                        Spacer()
                        Text(appState.currentUser ?? "Unknown")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Label("Role", systemImage: "shield.fill")
                        Spacer()
                        Text(appState.userRole.uppercased())
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(red: 0.8, green: 0.6, blue: 0.4))
                    }
                } header: {
                    Text("Account")
                }

                // Ranch Statistics
                Section {
                    StatRow(label: "Total Cattle", value: "\(dataManager.herd.count)")
                    StatRow(label: "Stray Alerts", value: "\(dataManager.strayAlerts.count)")
                    StatRow(label: "Active Gates", value: "\(dataManager.gates.count)")
                    StatRow(label: "Camera Feeds", value: "\(dataManager.cameras.count)")
                    StatRow(label: "Online Cameras", value: "\(dataManager.cameras.filter { $0.isOnline }.count)")
                    StatRow(label: "Pastures", value: "\(dataManager.pastures.count)")
                } header: {
                    Text("Ranch Statistics")
                }

                // Version Info
                Section {
                    if let version = dataManager.versionInfo {
                        HStack {
                            Label("Version", systemImage: "app.badge")
                            Spacer()
                            Text(version.version)
                                .foregroundColor(.secondary)
                        }

                        HStack {
                            Label("Build", systemImage: "number")
                            Spacer()
                            Text(version.buildNumber)
                                .foregroundColor(.secondary)
                        }

                        HStack {
                            Label("Build Date", systemImage: "calendar")
                            Spacer()
                            Text(version.buildDate)
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Text("Version info unavailable")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("Application Info")
                }

                // Actions
                Section {
                    Button(action: {
                        Task { await dataManager.refresh() }
                    }) {
                        Label("Refresh All Data", systemImage: "arrow.clockwise")
                    }

                    Button(role: .destructive, action: {
                        appState.logout()
                    }) {
                        Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } header: {
                    Text("Actions")
                }

                // App Info
                Section {
                    HStack {
                        Label("Platform", systemImage: "iphone")
                        Spacer()
                        Text("iOS Native")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Label("Built with", systemImage: "swift")
                        Spacer()
                        Text("SwiftUI")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("App Information")
                } footer: {
                    Text("RanchOS Native iOS Application\n© 2024 3 Strands Cattle Co., LLC")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 20)
                }
            }
            .navigationTitle("Admin Panel")
            .sheet(isPresented: $showServerConfig) {
                ServerConfigView()
                    .environmentObject(appState)
            }
        }
    }
}

// MARK: - Stat Row

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
            Spacer()
            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(Color(red: 0.8, green: 0.6, blue: 0.4))
        }
    }
}

#Preview {
    AdminTabView()
        .environmentObject(RanchDataManager())
        .environmentObject(AppState())
}
