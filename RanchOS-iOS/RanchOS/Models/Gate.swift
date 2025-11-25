import Foundation

struct Gate: Codable, Identifiable {
    let id: String
    let lat: Double
    let lon: Double
    let status: GateStatus

    var coordinate: Coordinate {
        Coordinate(latitude: lat, longitude: lon)
    }

    enum GateStatus: String, Codable {
        case open
        case closed
    }
}

struct GatesResponse: Codable {
    let gates: [Gate]
}
