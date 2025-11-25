//
//  RanchModels.swift
//  RanchOS
//
//  Data models matching the RanchOS API responses
//

import Foundation
import CoreLocation

// MARK: - Authentication

struct LoginRequest: Codable {
    let username: String
    let password: String
}

struct LoginResponse: Codable {
    let status: String
    let user: String
    let role: String
}

// MARK: - Configuration

struct ConfigResponse: Codable {
    let mapboxToken: String
    let ranchCenter: Coordinates
    let fence: [Coordinates]

    struct Coordinates: Codable {
        let lat: Double
        let lon: Double

        var coordinate: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: lat, longitude: lon)
        }
    }
}

// MARK: - Sensors

struct SensorsResponse: Codable {
    let sensors: [String: SensorReading]
    let sensorsList: [SensorDetail]?

    struct SensorReading: Codable {
        let value: String?
        let status: String
        let detail: String?
        let bars: Int?
    }

    struct SensorDetail: Codable {
        let id: String
        let name: String
        let type: String
        let location: String?
        let lat: Double?
        let lon: Double?
        let status: String?
        let reading: String?
    }
}

// MARK: - Herd

struct HerdResponse: Codable {
    let herd: [Cattle]

    struct Cattle: Codable, Identifiable {
        let id: String
        let name: String
        let lat: Double
        let lon: Double
        let weight: Int
        let temperature: Double
        let vaccines: [Vaccine]?

        var coordinate: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: lat, longitude: lon)
        }
    }

    struct Vaccine: Codable {
        let name: String
        let date: String
    }
}

// MARK: - Gates

struct GatesResponse: Codable {
    let gates: [Gate]

    struct Gate: Codable, Identifiable {
        let id: String
        let lat: Double
        let lon: Double
        let status: String

        var coordinate: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: lat, longitude: lon)
        }

        var isOpen: Bool {
            status == "open"
        }
    }
}

// MARK: - Cameras

struct CamerasResponse: Codable {
    let cameras: [Camera]

    struct Camera: Codable, Identifiable {
        let camera: String
        let name: String
        let location: String
        let status: String
        let embedUrl: String?
        let predator_detected: Bool?

        var id: String { camera }

        var isOnline: Bool {
            status == "online"
        }

        var hasPredator: Bool {
            predator_detected ?? false
        }
    }
}

// MARK: - Chute

struct ChuteResponse: Codable {
    let chute: ChuteTransaction

    struct ChuteTransaction: Codable, Identifiable {
        let id: String
        let weight: Int
        let temperature: Double
        let operator: String
        let notes: String?
        let last_weighed: String

        var timestamp: Date? {
            ISO8601DateFormatter().date(from: last_weighed)
        }
    }
}

// MARK: - Stray Alerts

struct StrayAlertsResponse: Codable {
    let alerts: [StrayAlert]

    struct StrayAlert: Codable, Identifiable {
        let cowId: String
        let name: String
        let lat: Double
        let lon: Double
        let altitude: Int
        let duration: String
        let distanceToClosest: Int?
        let closestCow: ClosestCow?

        var id: String { cowId }

        var coordinate: CLLocationCoordinate2D {
            CLLocationCoordinate2D(latitude: lat, longitude: lon)
        }

        struct ClosestCow: Codable {
            let id: String
            let name: String
        }
    }
}

// MARK: - Pastures

struct PasturesResponse: Codable {
    let pastures: [Pasture]

    struct Pasture: Codable, Identifiable {
        let id: String
        let name: String
        let polygon: [[Double]]
        let color: String?

        var coordinates: [CLLocationCoordinate2D] {
            polygon.compactMap { point in
                guard point.count >= 2 else { return nil }
                return CLLocationCoordinate2D(latitude: point[1], longitude: point[0])
            }
        }
    }
}

// MARK: - Version Info

struct VersionResponse: Codable {
    let version: String
    let buildNumber: String
    let buildDate: String
}
