import SwiftUI
import WebKit

struct CameraGridView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @State private var selectedCamera: Camera?
    @State private var showFullscreen = false

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "0a0e14")
                    .ignoresSafeArea()

                if dataManager.cameras.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "video.slash.fill")
                            .resizable()
                            .frame(width: 60, height: 60)
                            .foregroundColor(Color(hex: "9ca3af"))
                            .opacity(0.5)

                        Text("No Cameras Configured")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)

                        Text("Contact admin to connect cameras")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "9ca3af"))
                    }
                } else {
                    ScrollView {
                        LazyVGrid(
                            columns: [
                                GridItem(.flexible(), spacing: 12),
                                GridItem(.flexible(), spacing: 12)
                            ],
                            spacing: 12
                        ) {
                            ForEach(dataManager.cameras) { camera in
                                CameraFeedView(camera: camera)
                                    .aspectRatio(4/3, contentMode: .fit)
                                    .onTapGesture {
                                        selectedCamera = camera
                                        showFullscreen = true
                                    }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Security Cameras")
            .navigationBarTitleDisplayMode(.large)
            .fullScreenCover(isPresented: $showFullscreen) {
                if let camera = selectedCamera {
                    CameraFullscreenView(camera: camera, isPresented: $showFullscreen)
                }
            }
        }
    }
}

struct CameraFeedView: View {
    let camera: Camera

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(camera.camera.uppercased())
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                Circle()
                    .fill(camera.status == .online ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(hex: "1a1f26"))

            // Video feed
            if camera.status == .online, let embedUrl = camera.embedUrl {
                WebVideoView(url: embedUrl)
                    .frame(height: 150)
            } else {
                ZStack {
                    Color(hex: "0f1419")

                    VStack(spacing: 8) {
                        Image(systemName: "video.slash")
                            .font(.system(size: 24))
                            .foregroundColor(Color(hex: "9ca3af"))

                        Text("Offline")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "9ca3af"))
                    }
                }
                .frame(height: 150)
            }

            // Footer
            HStack {
                Text(camera.location)
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "9ca3af"))

                Spacer()

                if camera.predator_detected {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("PREDATOR")
                    }
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.red)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.red.opacity(0.2))
                    .cornerRadius(4)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(hex: "1a1f26"))
        }
        .background(Color(hex: "1a1f26"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(camera.predator_detected ? Color.red : Color(hex: "2d5f4f").opacity(0.3), lineWidth: camera.predator_detected ? 2 : 1)
        )
    }
}

struct CameraFullscreenView: View {
    let camera: Camera
    @Binding var isPresented: Bool

    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(camera.name)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)

                        Text(camera.location)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "9ca3af"))
                    }

                    Spacer()

                    if camera.predator_detected {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                            Text("PREDATOR DETECTED")
                        }
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.red)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.red.opacity(0.2))
                        .cornerRadius(8)
                    }

                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                    }
                }
                .padding()
                .background(Color.black.opacity(0.8))

                // Video
                if let embedUrl = camera.embedUrl {
                    WebVideoView(url: embedUrl)
                } else {
                    Spacer()
                    Text("Video feed unavailable")
                        .foregroundColor(.white)
                    Spacer()
                }
            }
        }
    }
}

/// WKWebView wrapper for YouTube embeds
struct WebVideoView: UIViewRepresentable {
    let url: String

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.isScrollEnabled = false
        webView.backgroundColor = .black

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let videoURL = URL(string: url) else { return }
        let request = URLRequest(url: videoURL)
        webView.load(request)
    }
}
