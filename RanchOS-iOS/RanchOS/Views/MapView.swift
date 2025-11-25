import SwiftUI
import MapboxMaps

struct MapView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @State private var selectedCattle: Cattle?
    @State private var showCattleDetails = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Mapbox map view
            if let config = dataManager.config,
               let center = config.ranchCenter {
                MapboxMapView(
                    config: config,
                    herd: dataManager.herd,
                    gates: dataManager.gates,
                    pastures: dataManager.pastures,
                    strayAlerts: dataManager.strayAlerts,
                    sensors: dataManager.sensorsList,
                    selectedCattle: $selectedCattle
                )
                .ignoresSafeArea()
            } else {
                // Empty state when no ranch is configured
                VStack(spacing: 20) {
                    Image(systemName: "map.fill")
                        .resizable()
                        .frame(width: 80, height: 80)
                        .foregroundColor(Color(hex: "9ca3af"))
                        .opacity(0.5)

                    Text("No Ranch Data Configured")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(.white)

                    Text("This ranch hasn't been set up yet. Use the Admin Panel to configure your property boundary, add cattle, and connect sensors.")
                        .font(.system(size: 15))
                        .foregroundColor(Color(hex: "9ca3af"))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(
                    LinearGradient(
                        colors: [Color(hex: "0a0e14"), Color(hex: "1a1f26")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            }

            // Cattle details sheet
            if showCattleDetails, let cattle = selectedCattle {
                CattleDetailsSheet(cattle: cattle, onClose: {
                    showCattleDetails = false
                    selectedCattle = nil
                })
                .transition(.move(edge: .bottom))
            }
        }
        .onChange(of: selectedCattle) { newValue in
            showCattleDetails = (newValue != nil)
        }
    }
}

/// Wraps Mapbox map for SwiftUI
struct MapboxMapView: UIViewRepresentable {
    let config: ConfigResponse
    let herd: [Cattle]
    let gates: [Gate]
    let pastures: [Pasture]
    let strayAlerts: [StrayAlert]
    let sensors: [SensorLocation]
    @Binding var selectedCattle: Cattle?

    func makeUIView(context: Context) -> MapView {
        let mapView = MapView(frame: .zero)

        // Configure Mapbox access token
        mapView.mapboxMap.setCamera(to: CameraOptions(
            center: CLLocationCoordinate2D(
                latitude: config.ranchCenter?.latitude ?? 39.8283,
                longitude: config.ranchCenter?.longitude ?? -98.5795
            ),
            zoom: 13,
            pitch: 55,
            bearing: -20
        ))

        // Set satellite style
        mapView.mapboxMap.style.uri = StyleURI(rawValue: "mapbox://styles/mapbox/satellite-streets-v12")

        return mapView
    }

    func updateUIView(_ mapView: MapView, context: Context) {
        // Update markers when data changes
        updateCattleMarkers(mapView)
        updateGateMarkers(mapView)
        updateSensorMarkers(mapView)
        updateFenceBoundary(mapView)
        updatePastureBoundaries(mapView)
    }

    private func updateCattleMarkers(_ mapView: MapView) {
        // Implementation would add cattle as point annotations
        // For production, use PointAnnotationManager from Mapbox
    }

    private func updateGateMarkers(_ mapView: MapView) {
        // Implementation would add gates as point annotations
    }

    private func updateSensorMarkers(_ mapView: MapView) {
        // Implementation would add sensors as point annotations
    }

    private func updateFenceBoundary(_ mapView: MapView) {
        // Implementation would draw fence as polygon layer
        guard let fence = config.fence else { return }
        // Convert coordinates and add as line/polygon layer
    }

    private func updatePastureBoundaries(_ mapView: MapView) {
        // Implementation would draw pasture boundaries
    }
}

/// Cattle details bottom sheet
struct CattleDetailsSheet: View {
    let cattle: Cattle
    let onClose: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Drag handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color(hex: "9ca3af"))
                .frame(width: 40, height: 5)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)

            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(cattle.id)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Color(hex: "9ca3af"))

                    Text(cattle.name)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                }

                Spacer()

                Button(action: onClose) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Color(hex: "9ca3af"))
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)

            Divider()
                .background(Color(hex: "2d5f4f"))
                .padding(.bottom, 20)

            // Stats grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                StatCard(icon: "scalemass.fill", label: "Weight", value: "\(Int(cattle.weight)) lbs")
                StatCard(icon: "thermometer.medium", label: "Temperature", value: "\(String(format: "%.1f", cattle.temperature))°F")
                StatCard(icon: "location.fill", label: "Latitude", value: String(format: "%.5f°", cattle.lat))
                StatCard(icon: "location.fill", label: "Longitude", value: String(format: "%.5f°", cattle.lon))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)

            // Vaccines section
            if let vaccines = cattle.vaccines, !vaccines.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Vaccines")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)

                    ForEach(vaccines) { vaccine in
                        HStack {
                            Text(vaccine.name)
                                .font(.system(size: 15))
                                .foregroundColor(.white)

                            Spacer()

                            Text(vaccine.date)
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "9ca3af"))
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                    }
                }
                .padding(.bottom, 20)
            }
        }
        .frame(maxWidth: .infinity)
        .background(Color(hex: "0f1419"))
        .cornerRadius(20, corners: [.topLeft, .topRight])
        .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: -5)
    }
}

struct StatCard: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(Color(hex: "c87533"))

            Text(label)
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "9ca3af"))

            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(hex: "1a1f26"))
        .cornerRadius(12)
    }
}

// Helper extension for corner radius
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
