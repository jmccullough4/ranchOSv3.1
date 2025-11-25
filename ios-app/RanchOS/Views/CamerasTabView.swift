//
//  CamerasTabView.swift
//  RanchOS
//
//  Security camera grid with WKWebView YouTube embeds
//

import SwiftUI
import WebKit

struct CamerasTabView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @EnvironmentObject var appState: AppState

    private let gridColumns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Alert Banner if predators detected
                    if dataManager.cameras.contains(where: { $0.hasPredator }) {
                        PredatorAlertBanner(
                            cameras: dataManager.cameras.filter { $0.hasPredator }
                        )
                        .padding(.horizontal)
                        .padding(.top)
                    }

                    // Camera Grid
                    if dataManager.cameras.isEmpty {
                        EmptyStateView(
                            icon: "video.fill",
                            title: "No Cameras Available",
                            message: "Camera feeds will appear here when configured"
                        )
                        .padding()
                    } else {
                        LazyVGrid(columns: gridColumns, spacing: 16) {
                            ForEach(dataManager.cameras) { camera in
                                CameraFeedCard(camera: camera)
                                    .frame(height: 200)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.bottom)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Security Cameras")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        Task { await dataManager.refresh() }
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }

                ToolbarItem(placement: .topBarLeading) {
                    Button(action: {
                        appState.logout()
                    }) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
        }
    }
}

// MARK: - Predator Alert Banner

struct PredatorAlertBanner: View {
    let cameras: [CamerasResponse.Camera]

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 24))
                .foregroundColor(.red)

            VStack(alignment: .leading, spacing: 4) {
                Text("PREDATOR DETECTED")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.red)

                Text(cameras.map { $0.location }.joined(separator: ", "))
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.red.opacity(0.3), lineWidth: 2)
        )
    }
}

// MARK: - Camera Feed Card

struct CameraFeedCard: View {
    let camera: CamerasResponse.Camera
    @State private var showFullScreen = false

    var body: some View {
        Button(action: {
            showFullScreen = true
        }) {
            VStack(spacing: 0) {
                // Camera Feed
                ZStack {
                    if camera.isOnline, let embedUrl = camera.embedUrl {
                        YouTubeWebView(url: embedUrl)
                    } else {
                        // Offline placeholder
                        VStack(spacing: 12) {
                            Image(systemName: "video.slash.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.secondary.opacity(0.5))

                            Text("Camera Offline")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.8))
                    }
                }
                .frame(height: 140)

                // Camera Info Footer
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(camera.camera.uppercased())
                            .font(.system(size: 12, weight: .bold, design: .monospaced))

                        Spacer()

                        Circle()
                            .fill(camera.isOnline ? Color.green : Color.red)
                            .frame(width: 6, height: 6)

                        Text(camera.status.uppercased())
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(camera.isOnline ? .green : .red)
                    }

                    Text(camera.location)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    if camera.hasPredator {
                        HStack(spacing: 4) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 10))
                            Text("PREDATOR")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundColor(.red)
                    }
                }
                .padding(10)
                .background(Color(.systemBackground))
            }
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.1), radius: 5, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showFullScreen) {
            FullScreenCameraView(camera: camera)
        }
    }
}

// MARK: - YouTube WebView

struct YouTubeWebView: UIViewRepresentable {
    let url: String

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.isScrollEnabled = false
        webView.isOpaque = false
        webView.backgroundColor = .black

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let url = URL(string: url) {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }
}

// MARK: - Full Screen Camera View

struct FullScreenCameraView: View {
    let camera: CamerasResponse.Camera
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if camera.isOnline, let embedUrl = camera.embedUrl {
                    YouTubeWebView(url: embedUrl)
                        .ignoresSafeArea()
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "video.slash.fill")
                            .font(.system(size: 64))
                            .foregroundColor(.white.opacity(0.5))

                        Text("Camera Offline")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)

                        Text(camera.location)
                            .font(.system(size: 16))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }

                // Info Overlay
                VStack {
                    Spacer()

                    HStack {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(camera.isOnline ? Color.green : Color.red)
                                    .frame(width: 8, height: 8)

                                Text(camera.camera.uppercased())
                                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                                    .foregroundColor(.white)
                            }

                            Text(camera.location)
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.8))

                            if camera.hasPredator {
                                HStack(spacing: 6) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                    Text("PREDATOR DETECTED")
                                        .font(.system(size: 12, weight: .bold))
                                }
                                .foregroundColor(.red)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.red.opacity(0.2))
                                .cornerRadius(8)
                            }
                        }

                        Spacer()
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
        }
    }
}

#Preview {
    CamerasTabView()
        .environmentObject(RanchDataManager())
        .environmentObject(AppState())
}
