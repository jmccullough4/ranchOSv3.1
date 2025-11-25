import Foundation

struct Cattle: Codable, Identifiable {
    let id: String
    let name: String
    let weight: Double
    let temperature: Double
    let lat: Double
    let lon: Double
    let vaccines: [Vaccine]?

    var coordinate: Coordinate {
        Coordinate(latitude: lat, longitude: lon)
    }
}

struct Vaccine: Codable, Identifiable {
    let id: UUID
    let name: String
    let date: String

    init(name: String, date: String) {
        self.id = UUID()
        self.name = name
        self.date = date
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID()
        self.name = try container.decode(String.self, forKey: .name)
        self.date = try container.decode(String.self, forKey: .date)
    }

    enum CodingKeys: String, CodingKey {
        case name, date
    }
}

struct HerdResponse: Codable {
    let herd: [Cattle]
}

struct Coordinate: Codable {
    let latitude: Double
    let longitude: Double
}
