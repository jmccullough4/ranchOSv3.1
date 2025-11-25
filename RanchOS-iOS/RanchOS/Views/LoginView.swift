import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var rememberMe: Bool = true
    @State private var isLoggingIn = false
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            // Background gradient matching web app
            LinearGradient(
                colors: [Color(hex: "0a0e14"), Color(hex: "1a1f26")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 40) {
                    Spacer()
                        .frame(height: 80)

                    // Logo and branding
                    VStack(spacing: 16) {
                        Image(systemName: "leaf.circle.fill")
                            .resizable()
                            .frame(width: 100, height: 100)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color(hex: "c87533"), Color(hex: "2d5f4f")],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )

                        VStack(spacing: 8) {
                            Text("3 STRANDS CATTLE CO.")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Color(hex: "c87533"))
                                .tracking(2)

                            Text("ranchOS Command Center")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundColor(Color(hex: "9ca3af"))
                        }
                    }

                    // Login card
                    VStack(spacing: 24) {
                        VStack(alignment: .leading, spacing: 20) {
                            Text("Operator Login")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)

                            // Username field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Username")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color(hex: "9ca3af"))

                                HStack {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(Color(hex: "9ca3af"))
                                    TextField("Enter username", text: $username)
                                        .textInputAutocapitalization(.never)
                                        .autocorrectionDisabled()
                                        .foregroundColor(.white)
                                }
                                .padding()
                                .background(Color(hex: "1a1f26"))
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(hex: "2d5f4f").opacity(0.5), lineWidth: 1)
                                )
                            }

                            // Password field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color(hex: "9ca3af"))

                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(Color(hex: "9ca3af"))
                                    SecureField("Enter password", text: $password)
                                        .foregroundColor(.white)
                                }
                                .padding()
                                .background(Color(hex: "1a1f26"))
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(hex: "2d5f4f").opacity(0.5), lineWidth: 1)
                                )
                            }

                            // Remember me toggle
                            Toggle(isOn: $rememberMe) {
                                Text("Remember me")
                                    .font(.system(size: 15))
                                    .foregroundColor(Color(hex: "9ca3af"))
                            }
                            .tint(Color(hex: "c87533"))

                            // Error message
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

                            // Login button
                            Button(action: handleLogin) {
                                HStack {
                                    if isLoggingIn {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Sign In")
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
                            .disabled(username.isEmpty || password.isEmpty || isLoggingIn)
                            .opacity((username.isEmpty || password.isEmpty) ? 0.5 : 1.0)
                        }

                        // Test credentials hint
                        VStack(spacing: 8) {
                            Text("Demo Credentials")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: "9ca3af"))

                            Text("Users: jay, kevin, april, ashley")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "64748b"))

                            Text("Password: 3strands")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "64748b"))
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(hex: "1a1f26").opacity(0.5))
                        .cornerRadius(8)
                    }
                    .padding(28)
                    .background(Color(hex: "0f1419").opacity(0.9))
                    .cornerRadius(20)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color(hex: "2d5f4f").opacity(0.3), lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)

                    // Server info
                    if let serverURL = appState.serverURL {
                        HStack(spacing: 8) {
                            Image(systemName: "server.rack")
                                .font(.system(size: 12))
                            Text("Connected to: \(serverURL)")
                                .font(.system(size: 12))
                        }
                        .foregroundColor(Color(hex: "64748b"))
                    }

                    Spacer()
                }
                .padding(.horizontal, 24)
            }
        }
        .onAppear {
            // Auto-fill demo credentials for easier testing
            #if DEBUG
            if username.isEmpty {
                username = "jay"
                password = "3strands"
            }
            #endif
        }
    }

    private func handleLogin() {
        isLoggingIn = true
        errorMessage = nil

        Task {
            do {
                let user = try await AuthService.shared.login(username: username, password: password)

                await MainActor.run {
                    appState.currentUser = user
                    appState.isAuthenticated = true
                    isLoggingIn = false

                    // Clear password if not remembering
                    if !rememberMe {
                        password = ""
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoggingIn = false
                }
            }
        }
    }
}
