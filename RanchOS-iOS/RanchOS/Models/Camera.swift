import Foundation

struct Camera: Codable, Identifiable {
    let camera: String
    let name: String
    let location: String
    let status: CameraStatus
    let embedUrl: String?
    let predator_detected: Bool

    var id: String { camera }

    enum CameraStatus: String, Codable {
        case online
        case offline
    }
}

struct CamerasResponse: Codable {
    let cameras: [Camera]
}
