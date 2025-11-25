import SwiftUI

struct ServerConfigView: View {
    @EnvironmentObject var appState: AppState
    @State private var serverURL: String = ""
    @State private var errorMessage: String?
    @State private var isValidating = false

    // Common server URL suggestions
    private let suggestions = [
        "http://localhost:8082",
        "https://ranch-3strands.ranchos.app",
        "https://ranch-demo.ranchos.app"
    ]

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color(hex: "0a0e14"), Color(hex: "1a1f26")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 30) {
                    Spacer()
                        .frame(height: 60)

                    // Logo and title
                    VStack(spacing: 16) {
                        Image(systemName: "leaf.circle.fill")
                            .resizable()
                            .frame(width: 80, height: 80)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color(hex: "c87533"), Color(hex: "2d5f4f")],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )

                        Text("RanchOS")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(.white)

                        Text("3 STRANDS CATTLE CO.")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(Color(hex: "c87533"))
                            .tracking(2)
                    }

                    Spacer()
                        .frame(height: 20)

                    // Configuration card
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Configure Your Ranch")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)

                        Text("Enter your ranch's server URL to get started. Each ranch has its own unique URL provided during setup.")
                            .font(.system(size: 15))
                            .foregroundColor(Color(hex: "9ca3af"))
                            .lineSpacing(4)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Server URL")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(hex: "9ca3af"))

                            TextField("https://ranch-yourname.ranchos.app", text: $serverURL)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .keyboardType(.URL)
                                .padding()
                                .background(Color(hex: "1a1f26"))
                                .cornerRadius(8)
                                .foregroundColor(.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(hex: "2d5f4f").opacity(0.5), lineWidth: 1)
                                )
                        }

                        // Quick suggestions
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Quick Select:")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(Color(hex: "9ca3af"))

                            ForEach(suggestions, id: \.self) { suggestion in
                                Button(action: {
                                    serverURL = suggestion
                                }) {
                                    HStack {
                                        Image(systemName: "link")
                                            .font(.system(size: 12))
                                        Text(suggestion)
                                            .font(.system(size: 14))
                                        Spacer()
                                        Image(systemName: "arrow.right")
                                            .font(.system(size: 12))
                                    }
                                    .foregroundColor(Color(hex: "00d9ff"))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .background(Color(hex: "1a1f26"))
                                    .cornerRadius(6)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 6)
                                            .stroke(Color(hex: "00d9ff").opacity(0.3), lineWidth: 1)
                                    )
                                }
                            }
                        }

                        if let error = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.system(size: 14))
                                    .foregroundColor(.red)
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }

                        Button(action: validateAndSave) {
                            HStack {
                                if isValidating {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text("Continue")
                                        .font(.system(size: 16, weight: .semibold))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                LinearGradient(
                                    colors: [Color(hex: "c87533"), Color(hex: "d97706")],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                        .disabled(serverURL.isEmpty || isValidating)
                        .opacity(serverURL.isEmpty ? 0.5 : 1.0)
                    }
                    .padding(24)
                    .background(Color(hex: "0f1419").opacity(0.8))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color(hex: "2d5f4f").opacity(0.3), lineWidth: 1)
                    )

                    Spacer()
                }
                .padding(.horizontal, 24)
            }
        }
    }

    private func validateAndSave() {
        isValidating = true
        errorMessage = nil

        // Validate URL format
        guard ConfigService.shared.setServerURL(serverURL) else {
            errorMessage = "Invalid URL format. Please enter a valid http:// or https:// URL."
            isValidating = false
            return
        }

        // Test connection
        Task {
            do {
                // Try to fetch config to verify server is reachable
                _ = try await APIService.shared.fetchConfig()

                await MainActor.run {
                    appState.serverURL = serverURL
                    appState.isFirstLaunch = false
                    isValidating = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Cannot reach server at this URL. Please check the address and try again."
                    ConfigService.shared.clearServerURL()
                    isValidating = false
                }
            }
        }
    }
}

// Color extension for hex colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 6: // RGB (24-bit)
            (r, g, b) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255
        )
    }
}
