//
//  LoginView.swift
//  RanchOS
//
//  User authentication screen with secure credential storage
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var isLoggingIn: Bool = false
    @State private var errorMessage: String?
    @State private var rememberCredentials: Bool = true
    @State private var showServerConfig: Bool = false

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
                    Spacer(minLength: 80)

                    // Logo and Branding
                    VStack(spacing: 16) {
                        // Logo placeholder (replace with actual logo)
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color(red: 0.8, green: 0.6, blue: 0.4),
                                            Color(red: 0.7, green: 0.5, blue: 0.3)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)

                            Image(systemName: "building.2.crop.circle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.white)
                        }

                        Text("RanchOS")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundColor(.white)

                        Text("Command Center")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))

                        // Server indicator
                        if let serverURL = appState.serverURL {
                            HStack(spacing: 6) {
                                Circle()
                                    .fill(Color.green)
                                    .frame(width: 6, height: 6)

                                Text(serverURL)
                                    .font(.system(size: 12, design: .monospaced))
                                    .foregroundColor(.white.opacity(0.5))
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(12)
                        }
                    }
                    .padding(.bottom, 20)

                    // Login Form
                    VStack(spacing: 20) {
                        // Username Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Username")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white.opacity(0.9))

                            HStack(spacing: 12) {
                                Image(systemName: "person.fill")
                                    .foregroundColor(.white.opacity(0.4))
                                    .frame(width: 24)

                                TextField("Enter username", text: $username)
                                    .textFieldStyle(.plain)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .foregroundColor(.white)
                                    .font(.system(size: 16, weight: .medium))
                            }
                            .padding()
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                            )
                        }

                        // Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white.opacity(0.9))

                            HStack(spacing: 12) {
                                Image(systemName: "lock.fill")
                                    .foregroundColor(.white.opacity(0.4))
                                    .frame(width: 24)

                                SecureField("Enter password", text: $password)
                                    .textFieldStyle(.plain)
                                    .foregroundColor(.white)
                                    .font(.system(size: 16, weight: .medium))
                            }
                            .padding()
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                            )
                        }

                        // Remember Credentials Toggle
                        Toggle(isOn: $rememberCredentials) {
                            HStack(spacing: 6) {
                                Image(systemName: "key.fill")
                                    .font(.system(size: 12))
                                Text("Remember credentials")
                                    .font(.system(size: 14))
                            }
                            .foregroundColor(.white.opacity(0.7))
                        }
                        .toggleStyle(SwitchToggleStyle(tint: Color(red: 0.8, green: 0.6, blue: 0.4)))
                        .padding(.vertical, 4)

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

                        // Login Button
                        Button(action: performLogin) {
                            HStack(spacing: 12) {
                                if isLoggingIn {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                } else {
                                    Text("Access System")
                                        .font(.system(size: 16, weight: .semibold))
                                    Image(systemName: "arrow.right.circle.fill")
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
                        .disabled(username.isEmpty || password.isEmpty || isLoggingIn)
                        .opacity(username.isEmpty || password.isEmpty || isLoggingIn ? 0.5 : 1.0)
                        .padding(.top, 8)

                        // Change Server Button
                        Button(action: {
                            showServerConfig = true
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "server.rack")
                                    .font(.system(size: 12))
                                Text("Change Server")
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .foregroundColor(.white.opacity(0.6))
                            .padding(.vertical, 12)
                        }
                    }
                    .padding(24)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(20)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                    .padding(.horizontal, 20)

                    // Demo Credentials Hint
                    VStack(spacing: 6) {
                        Text("Demo Credentials")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white.opacity(0.5))

                        Text("Users: jay, kevin, april, ashley • Password: 3strands")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.white.opacity(0.4))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 8)

                    Spacer()
                }
            }
        }
        .onAppear(perform: loadSavedCredentials)
        .sheet(isPresented: $showServerConfig) {
            ServerConfigView()
                .environmentObject(appState)
        }
    }

    private func loadSavedCredentials() {
        if let credentials = SecureStorage.shared.getCredentials() {
            username = credentials.username
            password = credentials.password
        }
    }

    private func performLogin() {
        errorMessage = nil
        isLoggingIn = true

        Task {
            do {
                let response = try await APIClient.shared.login(username: username, password: password)

                // Save credentials if requested
                if rememberCredentials {
                    SecureStorage.shared.saveCredentials(username: username, password: password)
                }

                await MainActor.run {
                    appState.login(username: response.user, role: response.role)
                    isLoggingIn = false
                }
            } catch let error as APIError {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoggingIn = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Login failed: \(error.localizedDescription)"
                    isLoggingIn = false
                }
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AppState())
}
