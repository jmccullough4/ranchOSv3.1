//
//  APIClient.swift
//  RanchOS
//
//  URLSession-based REST API client for RanchOS backend
//  Handles all HTTP communication with configurable server URLs
//

import Foundation
import Combine

enum APIError: Error, LocalizedError {
    case serverNotConfigured
    case invalidURL
    case networkError(Error)
    case invalidResponse
    case httpError(statusCode: Int, message: String?)
    case decodingError(Error)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .serverNotConfigured:
            return "Server URL not configured. Please configure your ranch server."
        case .invalidURL:
            return "Invalid server URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode, let message):
            return "HTTP \(statusCode): \(message ?? "Unknown error")"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .unauthorized:
            return "Invalid credentials"
        }
    }
}

class APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Authentication

    /// Login to RanchOS
    func login(username: String, password: String) async throws -> LoginResponse {
        let endpoint = "/api/login"
        let request = LoginRequest(username: username, password: password)

        do {
            let response: LoginResponse = try await post(endpoint: endpoint, body: request)
            return response
        } catch APIError.httpError(let statusCode, _) where statusCode == 401 {
            throw APIError.unauthorized
        } catch {
            throw error
        }
    }

    // MARK: - Configuration

    /// Fetch ranch configuration (Mapbox token, center coordinates, fence)
    func fetchConfig() async throws -> ConfigResponse {
        return try await get(endpoint: "/api/config")
    }

    /// Fetch version information
    func fetchVersion() async throws -> VersionResponse {
        return try await get(endpoint: "/api/version")
    }

    // MARK: - Sensors

    /// Fetch current sensor readings
    func fetchSensors() async throws -> SensorsResponse {
        return try await get(endpoint: "/api/sensors")
    }

    // MARK: - Herd

    /// Fetch current herd positions and data
    func fetchHerd() async throws -> HerdResponse {
        return try await get(endpoint: "/api/herd")
    }

    // MARK: - Gates

    /// Fetch gate statuses
    func fetchGates() async throws -> GatesResponse {
        return try await get(endpoint: "/api/gates")
    }

    /// Toggle gate status
    func toggleGate(gateId: String) async throws -> GatesResponse {
        let body = ["gateId": gateId]
        return try await post(endpoint: "/api/gates", body: body)
    }

    // MARK: - Cameras

    /// Fetch camera feeds and status
    func fetchCameras() async throws -> CamerasResponse {
        return try await get(endpoint: "/api/cameras")
    }

    // MARK: - Chute

    /// Fetch latest chute transaction
    func fetchChute() async throws -> ChuteResponse {
        return try await get(endpoint: "/api/chute")
    }

    // MARK: - Stray Alerts

    /// Fetch AI-detected stray cattle alerts
    func fetchStrayAlerts() async throws -> StrayAlertsResponse {
        return try await get(endpoint: "/api/stray-alerts")
    }

    // MARK: - Pastures

    /// Fetch pasture boundaries
    func fetchPastures() async throws -> PasturesResponse {
        return try await get(endpoint: "/api/pastures")
    }

    // MARK: - Generic HTTP Methods

    private func get<T: Decodable>(endpoint: String) async throws -> T {
        guard let urlString = ServerConfigManager.shared.buildAPIURL(endpoint: endpoint) else {
            throw APIError.serverNotConfigured
        }

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        return try await performRequest(request)
    }

    private func post<T: Decodable, U: Encodable>(endpoint: String, body: U) async throws -> T {
        guard let urlString = ServerConfigManager.shared.buildAPIURL(endpoint: endpoint) else {
            throw APIError.serverNotConfigured
        }

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            request.httpBody = try encoder.encode(body)
        } catch {
            throw APIError.decodingError(error)
        }

        return try await performRequest(request)
    }

    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Log request for debugging
        #if DEBUG
        print("📡 \(request.httpMethod ?? "GET") \(request.url?.path ?? "") -> \(httpResponse.statusCode)")
        #endif

        guard (200...299).contains(httpResponse.statusCode) else {
            // Try to decode error message
            let errorMessage = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.httpError(
                statusCode: httpResponse.statusCode,
                message: errorMessage?["detail"] ?? errorMessage?["message"]
            )
        }

        do {
            let decoded = try decoder.decode(T.self, from: data)
            return decoded
        } catch {
            #if DEBUG
            print("⚠️ Decoding error: \(error)")
            if let jsonString = String(data: data, encoding: .utf8) {
                print("Response data: \(jsonString)")
            }
            #endif
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Server Health Check

    /// Check if server is reachable
    func checkServerHealth() async -> Bool {
        guard let urlString = ServerConfigManager.shared.getServerURL(),
              let url = URL(string: urlString) else {
            return false
        }

        do {
            var request = URLRequest(url: url)
            request.httpMethod = "HEAD"
            request.timeoutInterval = 5

            let (_, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else { return false }

            return (200...299).contains(httpResponse.statusCode)
        } catch {
            return false
        }
    }
}
