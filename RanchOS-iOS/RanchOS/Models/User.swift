import Foundation

struct User: Codable, Identifiable {
    let id: String
    let username: String
    let role: UserRole

    enum UserRole: String, Codable {
        case user
        case admin
    }
}

struct LoginRequest: Codable {
    let username: String
    let password: String
}

struct LoginResponse: Codable {
    let user: String
    let role: String
}
