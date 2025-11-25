import Foundation

/// Handles all REST API communication with the RanchOS backend
class APIService {
    static let shared = APIService()

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: configuration)
        self.decoder = JSONDecoder()
    }

    /// Get the base API URL from configuration
    private func getBaseURL() throws -> String {
        guard let baseURL = ConfigService.shared.getAPIBaseURL() else {
            throw APIError.noServerConfigured
        }
        return baseURL
    }

    /// Build a full URL for an endpoint
    private func buildURL(endpoint: String) throws -> URL {
        let baseURL = try getBaseURL()
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        return url
    }

    /// Generic GET request
    private func get<T: Decodable>(endpoint: String) async throws -> T {
        let url = try buildURL(endpoint: endpoint)

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }

    /// Generic POST request
    private func post<T: Decodable, U: Encodable>(endpoint: String, body: U) async throws -> T {
        let url = try buildURL(endpoint: endpoint)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }

    // MARK: - API Endpoints

    /// Fetch ranch configuration (Mapbox token, center coordinates, fence)
    func fetchConfig() async throws -> ConfigResponse {
        return try await get(endpoint: "/api/config")
    }

    /// Fetch sensor readings
    func fetchSensors() async throws -> SensorsResponse {
        return try await get(endpoint: "/api/sensors")
    }

    /// Fetch cattle herd data
    func fetchHerd() async throws -> HerdResponse {
        return try await get(endpoint: "/api/herd")
    }

    /// Fetch gate statuses
    func fetchGates() async throws -> GatesResponse {
        return try await get(endpoint: "/api/gates")
    }

    /// Toggle gate open/closed
    func toggleGate(gateId: String) async throws {
        struct GateToggle: Codable {
            let id: String
        }
        struct EmptyResponse: Codable {}

        let _: EmptyResponse = try await post(endpoint: "/api/gates", body: GateToggle(id: gateId))
    }

    /// Fetch camera feeds
    func fetchCameras() async throws -> CamerasResponse {
        return try await get(endpoint: "/api/cameras")
    }

    /// Fetch chute transaction
    func fetchChute() async throws -> ChuteResponse {
        return try await get(endpoint: "/api/chute")
    }

    /// Fetch pasture boundaries
    func fetchPastures() async throws -> PasturesResponse {
        return try await get(endpoint: "/api/pastures")
    }

    /// Fetch stray alerts
    func fetchStrayAlerts() async throws -> StrayAlertsResponse {
        return try await get(endpoint: "/api/stray-alerts")
    }
}

enum APIError: LocalizedError {
    case noServerConfigured
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .noServerConfigured:
            return "No server URL configured"
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
