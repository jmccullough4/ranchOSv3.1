import Foundation
import Combine

/// Manages real-time data polling and state for all ranch data
@MainActor
class RanchDataManager: ObservableObject {
    // Published properties for SwiftUI
    @Published var config: ConfigResponse?
    @Published var sensors: [String: SensorReading] = [:]
    @Published var sensorsList: [SensorLocation] = []
    @Published var herd: [Cattle] = []
    @Published var gates: [Gate] = []
    @Published var cameras: [Camera] = []
    @Published var chute: ChuteTransaction?
    @Published var pastures: [Pasture] = []
    @Published var strayAlerts: [StrayAlert] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared

    // Polling timers
    private var sensorTimer: Timer?
    private var herdTimer: Timer?
    private var gateTimer: Timer?
    private var cameraTimer: Timer?
    private var chuteTimer: Timer?
    private var strayTimer: Timer?

    // Polling intervals (matching web app)
    private let sensorInterval: TimeInterval = 5.0
    private let herdInterval: TimeInterval = 4.0
    private let gateInterval: TimeInterval = 6.0
    private let cameraInterval: TimeInterval = 10.0
    private let chuteInterval: TimeInterval = 8.0
    private let strayInterval: TimeInterval = 7.0

    /// Start polling all data sources
    func startPolling() {
        // Initial fetch
        Task {
            await loadInitialData()
        }

        // Set up timers
        sensorTimer = Timer.scheduledTimer(withTimeInterval: sensorInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchSensors()
            }
        }

        herdTimer = Timer.scheduledTimer(withTimeInterval: herdInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchHerd()
            }
        }

        gateTimer = Timer.scheduledTimer(withTimeInterval: gateInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchGates()
            }
        }

        cameraTimer = Timer.scheduledTimer(withTimeInterval: cameraInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchCameras()
            }
        }

        chuteTimer = Timer.scheduledTimer(withTimeInterval: chuteInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchChute()
            }
        }

        strayTimer = Timer.scheduledTimer(withTimeInterval: strayInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.fetchStrayAlerts()
            }
        }
    }

    /// Stop all polling timers
    func stopPolling() {
        sensorTimer?.invalidate()
        herdTimer?.invalidate()
        gateTimer?.invalidate()
        cameraTimer?.invalidate()
        chuteTimer?.invalidate()
        strayTimer?.invalidate()

        sensorTimer = nil
        herdTimer = nil
        gateTimer = nil
        cameraTimer = nil
        chuteTimer = nil
        strayTimer = nil
    }

    /// Load initial data on app start
    private func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        async let configTask = fetchConfig()
        async let sensorsTask = fetchSensors()
        async let herdTask = fetchHerd()
        async let gatesTask = fetchGates()
        async let camerasTask = fetchCameras()
        async let pasturesTask = fetchPastures()

        // Wait for all initial data
        _ = await (configTask, sensorsTask, herdTask, gatesTask, camerasTask, pasturesTask)

        isLoading = false
    }

    // MARK: - Individual Fetch Methods

    func fetchConfig() async {
        do {
            config = try await apiService.fetchConfig()
        } catch {
            handleError(error, context: "loading configuration")
        }
    }

    func fetchSensors() async {
        do {
            let response = try await apiService.fetchSensors()
            sensors = response.sensors
            if let list = response.sensorsList {
                sensorsList = list
            }
        } catch {
            handleError(error, context: "loading sensors")
        }
    }

    func fetchHerd() async {
        do {
            let response = try await apiService.fetchHerd()
            herd = response.herd
        } catch {
            handleError(error, context: "loading herd")
        }
    }

    func fetchGates() async {
        do {
            let response = try await apiService.fetchGates()
            gates = response.gates
        } catch {
            handleError(error, context: "loading gates")
        }
    }

    func fetchCameras() async {
        do {
            let response = try await apiService.fetchCameras()
            cameras = response.cameras
        } catch {
            handleError(error, context: "loading cameras")
        }
    }

    func fetchChute() async {
        do {
            let response = try await apiService.fetchChute()
            chute = response.chute
        } catch {
            handleError(error, context: "loading chute")
        }
    }

    func fetchPastures() async {
        do {
            let response = try await apiService.fetchPastures()
            pastures = response.pastures
        } catch {
            handleError(error, context: "loading pastures")
        }
    }

    func fetchStrayAlerts() async {
        do {
            let response = try await apiService.fetchStrayAlerts()
            strayAlerts = response.alerts
        } catch {
            handleError(error, context: "loading stray alerts")
        }
    }

    func toggleGate(gateId: String) async {
        do {
            try await apiService.toggleGate(gateId: gateId)
            await fetchGates() // Refresh gate status
        } catch {
            handleError(error, context: "toggling gate")
        }
    }

    // MARK: - Error Handling

    private func handleError(_ error: Error, context: String) {
        print("Error \(context): \(error.localizedDescription)")
        errorMessage = "Error \(context): \(error.localizedDescription)"
    }
}
