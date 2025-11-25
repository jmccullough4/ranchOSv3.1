import Foundation
import SwiftUI

struct SensorReading: Codable {
    let value: String
    let status: SensorStatus
    let detail: String?
}

enum SensorStatus: String, Codable {
    case green
    case yellow
    case red

    var color: Color {
        switch self {
        case .green: return .green
        case .yellow: return .yellow
        case .red: return .red
        }
    }

    var displayName: String {
        switch self {
        case .green: return "Normal"
        case .yellow: return "Warning"
        case .red: return "Critical"
        }
    }
}

struct SensorsResponse: Codable {
    let sensors: [String: SensorReading]
    let sensorsList: [SensorLocation]?
}

struct SensorLocation: Codable, Identifiable {
    let id: String
    let name: String
    let type: String
    let lat: Double
    let lon: Double
    let status: String?

    var coordinate: Coordinate {
        Coordinate(latitude: lat, longitude: lon)
    }
}

enum SensorType: String, CaseIterable {
    case SYSTEM
    case WATER
    case FENCE
    case GATE
    case NETWORK
    case ALERTS

    var icon: String {
        switch self {
        case .SYSTEM: return "bolt.fill"
        case .WATER: return "drop.fill"
        case .FENCE: return "line.diagonal"
        case .GATE: return "door.left.hand.open"
        case .NETWORK: return "antenna.radiowaves.left.and.right"
        case .ALERTS: return "exclamationmark.triangle.fill"
        }
    }
}
