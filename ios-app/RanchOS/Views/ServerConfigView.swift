//
//  ServerConfigView.swift
//  RanchOS
//
//  Multi-tenant server URL configuration screen
//  Allows users to enter their ranch's unique server URL
//

import SwiftUI

struct ServerConfigView: View {
    @EnvironmentObject var appState: AppState
    @State private var serverURL: String = ""
    @State private var isValidating: Bool = false
    @State private var errorMessage: String?

    // Pre-configured ranch URLs for quick selection
    private let exampleRanches = [
        ("3 Strands Cattle Co.", "http://localhost:8082"),
        ("Custom Ranch URL", "")
    ]

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.15),
                    Color(red: 0.05, green: 0.05, blue: 0.1)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    Spacer(minLength: 60)

                    // Logo placeholder
                    VStack(spacing: 12) {
                        Image(systemName: "network")
                            .font(.system(size: 72))
                            .foregroundStyle(.white.opacity(0.9))

                        Text("RanchOS")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundColor(.white)

                        Text("Configure Your Ranch Server")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.bottom, 20)

                    // Configuration Card
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Server URL")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white.opacity(0.9))
                                .textCase(.uppercase)

                            Text("Enter your ranch's unique server address")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.5))
                        }

                        // URL Input Field
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "link")
                                    .foregroundColor(.white.opacity(0.4))
                                    .frame(width: 24)

                                TextField("https://ranch-yourname.ranchos.app", text: $serverURL)
                                    .textFieldStyle(.plain)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .keyboardType(.URL)
                                    .foregroundColor(.white)
                                    .font(.system(size: 16, weight: .medium, design: .monospaced))
                            }
                            .padding()
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                            )

                            // Example URLs
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(exampleRanches, id: \.0) { ranch in
                                    Button(action: {
                                        if !ranch.1.isEmpty {
                                            serverURL = ranch.1
                                        }
                                    }) {
                                        HStack {
                                            Image(systemName: "building.2")
                                                .font(.system(size: 11))
                                            Text(ranch.0)
                                                .font(.system(size: 12))
                                            Spacer()
                                            if !ranch.1.isEmpty {
                                                Image(systemName: "arrow.right.circle.fill")
                                                    .font(.system(size: 12))
                                            }
                                        }
                                        .foregroundColor(.white.opacity(0.6))
                                        .padding(.vertical, 6)
                                        .padding(.horizontal, 12)
                                    }
                                }
                            }
                            .padding(.top, 4)
                        }

                        // Error Message
                        if let error = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.system(size: 13))
                                    .foregroundColor(.red.opacity(0.9))
                            }
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }

                        // Continue Button
                        Button(action: validateAndSave) {
                            HStack(spacing: 12) {
                                if isValidating {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                } else {
                                    Text("Continue to Login")
                                        .font(.system(size: 16, weight: .semibold))
                                    Image(systemName: "arrow.right")
                                }
                            }
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color(red: 0.8, green: 0.6, blue: 0.4),
                                        Color(red: 0.7, green: 0.5, blue: 0.3)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                        }
                        .disabled(serverURL.isEmpty || isValidating)
                        .opacity(serverURL.isEmpty || isValidating ? 0.5 : 1.0)

                        // Help Text
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                Image(systemName: "info.circle")
                                    .font(.system(size: 12))
                                Text("Need help?")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundColor(.white.opacity(0.6))

                            Text("Contact your ranch administrator for your server URL. For local testing, use http://localhost:8082")
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.5))
                                .lineSpacing(2)
                        }
                        .padding(.top, 8)
                    }
                    .padding(24)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(20)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                    .padding(.horizontal, 20)

                    Spacer()
                }
            }
        }
    }

    private func validateAndSave() {
        errorMessage = nil

        // Validate URL format
        guard ServerConfigManager.shared.validateURL(serverURL) else {
            errorMessage = "Invalid URL format. Must start with http:// or https://"
            return
        }

        isValidating = true

        // Test server connectivity
        Task {
            let isReachable = await APIClient.shared.checkServerHealth()

            await MainActor.run {
                isValidating = false

                if isReachable {
                    // Save and proceed
                    appState.setServerURL(serverURL)
                } else {
                    errorMessage = "Cannot reach server at this URL. Please check the address and try again."
                }
            }
        }
    }
}

#Preview {
    ServerConfigView()
        .environmentObject(AppState())
}
