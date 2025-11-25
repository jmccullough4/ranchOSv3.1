import Foundation

struct RanchConfig: Codable {
    let mapboxToken: String
    let ranchCenter: Coordinate?
    let fence: Fence?
}

struct Fence: Codable {
    let coordinates: [[Double]]
}

struct Pasture: Codable, Identifiable {
    let id: String
    let name: String
    let boundary: [[Double]]
    let isProperty: Bool?
}

struct PasturesResponse: Codable {
    let pastures: [Pasture]
}

struct ConfigResponse: Codable {
    let mapboxToken: String
    let ranchCenter: Coordinate?
    let fence: Fence?
}

struct ChuteTransaction: Codable {
    let id: String
    let weight: Double
    let temperature: Double
    let operator: String
    let last_weighed: String
}

struct ChuteResponse: Codable {
    let chute: ChuteTransaction
}

struct StrayAlert: Codable, Identifiable {
    let cowId: String
    let name: String
    let lat: Double
    let lon: Double
    let altitude: Int
    let duration: String
    let distanceToClosest: String?
    let closestCow: ClosestCowInfo?

    var id: String { cowId }

    struct ClosestCowInfo: Codable {
        let name: String
        let lon: Double
        let lat: Double
    }
}

struct StrayAlertsResponse: Codable {
    let alerts: [StrayAlert]
}
