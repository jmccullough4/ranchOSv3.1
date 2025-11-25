//
//  MainTabView.swift
//  RanchOS
//
//  Main dashboard with tabbed navigation
//  Map, Sensors, Cameras, Cattle, Admin
//

import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var dataManager = RanchDataManager()

    var body: some View {
        TabView {
            // Map View - Real-time cattle tracking
            MapTabView()
                .environmentObject(dataManager)
                .tabItem {
                    Label("Map", systemImage: "map.fill")
                }

            // Sensors View - Monitoring dashboard
            SensorsTabView()
                .environmentObject(dataManager)
                .tabItem {
                    Label("Sensors", systemImage: "sensor.fill")
                }

            // Cameras View - Security feeds
            CamerasTabView()
                .environmentObject(dataManager)
                .tabItem {
                    Label("Cameras", systemImage: "video.fill")
                }

            // Cattle View - Herd management
            CattleTabView()
                .environmentObject(dataManager)
                .tabItem {
                    Label("Cattle", systemImage: "pawprint.fill")
                }

            // Admin View - Settings and configuration
            if appState.userRole == "admin" {
                AdminTabView()
                    .environmentObject(dataManager)
                    .tabItem {
                        Label("Admin", systemImage: "gearshape.fill")
                    }
            }
        }
        .accentColor(Color(red: 0.8, green: 0.6, blue: 0.4))
        .onAppear {
            dataManager.startPolling()
        }
        .onDisappear {
            dataManager.stopPolling()
        }
    }
}

/// Central data manager with polling timers
class RanchDataManager: ObservableObject {
    // Published data from API
    @Published var config: ConfigResponse?
    @Published var sensors: SensorsResponse?
    @Published var herd: [HerdResponse.Cattle] = []
    @Published var gates: [GatesResponse.Gate] = []
    @Published var cameras: [CamerasResponse.Camera] = []
    @Published var chute: ChuteResponse.ChuteTransaction?
    @Published var chuteLog: [ChuteResponse.ChuteTransaction] = []
    @Published var strayAlerts: [StrayAlertsResponse.StrayAlert] = []
    @Published var pastures: [PasturesResponse.Pasture] = []
    @Published var versionInfo: VersionResponse?

    // Loading states
    @Published var isLoading: Bool = true
    @Published var lastError: String?

    // Polling timers
    private var sensorTimer: Timer?
    private var herdTimer: Timer?
    private var gateTimer: Timer?
    private var chuteTimer: Timer?
    private var cameraTimer: Timer?
    private var strayTimer: Timer?

    // Polling intervals (matching web app)
    private let sensorRefreshInterval: TimeInterval = 5.0
    private let herdRefreshInterval: TimeInterval = 4.0
    private let gateRefreshInterval: TimeInterval = 6.0
    private let chuteRefreshInterval: TimeInterval = 8.0
    private let cameraRefreshInterval: TimeInterval = 10.0
    private let strayRefreshInterval: TimeInterval = 7.0

    init() {}

    // MARK: - Start/Stop Polling

    func startPolling() {
        // Initial fetch
        Task {
            await fetchInitialData()
        }

        // Start timers
        sensorTimer = Timer.scheduledTimer(withTimeInterval: sensorRefreshInterval, repeats: true) { [weak self] _ in
            Task { await self?.fetchSensors() }
        }

        herdTimer = Timer.scheduledTimer(withTimeInterval: herdRefreshInterval, repeats: true) { [weak self] _ in
            Task { await self?.fetchHerd() }
        }

        gateTimer = Timer.scheduledTimer(withTimeInterval: gateRefreshInterval, repeats: true) { [weak self] _ in
            Task { await self?.fetchGates() }
        }

        chuteTimer = Timer.scheduledTimer(withTimeInterval: chuteRefreshInterval, repeats: true) { [weak self] _ in
            Task { await self?.fetchChute() }
        }

        cameraTimer = Timer.scheduledTimer(withTimeInterval: cameraRefreshInterval, repeats: true) { [weak self] _ in
            Task { await self?.fetchCameras() }
        }

        strayTimer = Timer.scheduledTimer(withTimeInterval: strayRefreshInterval, repeats: true) { [weak self] _ in
            Task { await self?.fetchStrayAlerts() }
        }
    }

    func stopPolling() {
        sensorTimer?.invalidate()
        herdTimer?.invalidate()
        gateTimer?.invalidate()
        chuteTimer?.invalidate()
        cameraTimer?.invalidate()
        strayTimer?.invalidate()
    }

    // MARK: - Initial Data Load

    private func fetchInitialData() async {
        await MainActor.run { isLoading = true }

        async let configTask = fetchConfig()
        async let sensorsTask = fetchSensors()
        async let herdTask = fetchHerd()
        async let gatesTask = fetchGates()
        async let camerasTask = fetchCameras()
        async let chuteTask = fetchChute()
        async let strayTask = fetchStrayAlerts()
        async let pasturesTask = fetchPastures()
        async let versionTask = fetchVersion()

        // Wait for all to complete
        await configTask
        await sensorsTask
        await herdTask
        await gatesTask
        await camerasTask
        await chuteTask
        await strayTask
        await pasturesTask
        await versionTask

        await MainActor.run { isLoading = false }
    }

    // MARK: - Individual Fetch Methods

    @MainActor
    func fetchConfig() async {
        do {
            let data = try await APIClient.shared.fetchConfig()
            self.config = data
        } catch {
            print("Failed to fetch config: \(error)")
            self.lastError = error.localizedDescription
        }
    }

    @MainActor
    func fetchSensors() async {
        do {
            let data = try await APIClient.shared.fetchSensors()
            self.sensors = data
        } catch {
            print("Failed to fetch sensors: \(error)")
        }
    }

    @MainActor
    func fetchHerd() async {
        do {
            let data = try await APIClient.shared.fetchHerd()
            self.herd = data.herd
        } catch {
            print("Failed to fetch herd: \(error)")
        }
    }

    @MainActor
    func fetchGates() async {
        do {
            let data = try await APIClient.shared.fetchGates()
            self.gates = data.gates
        } catch {
            print("Failed to fetch gates: \(error)")
        }
    }

    @MainActor
    func fetchCameras() async {
        do {
            let data = try await APIClient.shared.fetchCameras()
            self.cameras = data.cameras
        } catch {
            print("Failed to fetch cameras: \(error)")
        }
    }

    @MainActor
    func fetchChute() async {
        do {
            let data = try await APIClient.shared.fetchChute()
            self.chute = data.chute

            // Add to log if not already present
            if !chuteLog.contains(where: { $0.last_weighed == data.chute.last_weighed }) {
                chuteLog.insert(data.chute, at: 0)
                // Keep only last 40 entries
                if chuteLog.count > 40 {
                    chuteLog = Array(chuteLog.prefix(40))
                }
            }
        } catch {
            print("Failed to fetch chute: \(error)")
        }
    }

    @MainActor
    func fetchStrayAlerts() async {
        do {
            let data = try await APIClient.shared.fetchStrayAlerts()
            self.strayAlerts = data.alerts
        } catch {
            print("Failed to fetch stray alerts: \(error)")
        }
    }

    @MainActor
    func fetchPastures() async {
        do {
            let data = try await APIClient.shared.fetchPastures()
            self.pastures = data.pastures
        } catch {
            print("Failed to fetch pastures: \(error)")
        }
    }

    @MainActor
    func fetchVersion() async {
        do {
            let data = try await APIClient.shared.fetchVersion()
            self.versionInfo = data
        } catch {
            print("Failed to fetch version: \(error)")
        }
    }

    // MARK: - Actions

    @MainActor
    func toggleGate(gateId: String) async {
        do {
            let data = try await APIClient.shared.toggleGate(gateId: gateId)
            self.gates = data.gates
        } catch {
            print("Failed to toggle gate: \(error)")
        }
    }

    @MainActor
    func refresh() async {
        await fetchInitialData()
    }
}

#Preview {
    MainTabView()
        .environmentObject(AppState())
}
