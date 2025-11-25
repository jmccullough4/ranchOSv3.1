//
//  MapTabView.swift
//  RanchOS
//
//  Interactive map with real-time cattle tracking
//  Uses MapKit with custom annotations for cattle, gates, sensors
//

import SwiftUI
import MapKit

struct MapTabView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @EnvironmentObject var appState: AppState
    @State private var selectedCattle: HerdResponse.Cattle?
    @State private var showCattleDetail: Bool = false
    @State private var cameraPosition: MapCameraPosition = .automatic

    var body: some View {
        NavigationStack {
            ZStack {
                // Map View
                Map(position: $cameraPosition) {
                    // Ranch center marker
                    if let center = dataManager.config?.ranchCenter {
                        Annotation("Ranch Center", coordinate: center.coordinate) {
                            ZStack {
                                Circle()
                                    .fill(Color(red: 0.8, green: 0.6, blue: 0.4))
                                    .frame(width: 20, height: 20)
                                Image(systemName: "house.fill")
                                    .foregroundColor(.white)
                                    .font(.system(size: 10))
                            }
                        }
                    }

                    // Cattle markers
                    ForEach(dataManager.herd) { cattle in
                        Annotation(cattle.name, coordinate: cattle.coordinate) {
                            Button(action: {
                                selectedCattle = cattle
                                showCattleDetail = true
                            }) {
                                ZStack {
                                    Circle()
                                        .fill(Color.brown)
                                        .frame(width: 24, height: 24)
                                        .shadow(radius: 2)

                                    Image(systemName: "pawprint.fill")
                                        .foregroundColor(.white)
                                        .font(.system(size: 10))
                                }
                            }
                        }
                    }

                    // Gate markers
                    ForEach(dataManager.gates) { gate in
                        Annotation(gate.id, coordinate: gate.coordinate) {
                            ZStack {
                                Circle()
                                    .fill(gate.isOpen ? Color.red : Color.green)
                                    .frame(width: 18, height: 18)
                                    .shadow(radius: 2)

                                Image(systemName: gate.isOpen ? "lock.open.fill" : "lock.fill")
                                    .foregroundColor(.white)
                                    .font(.system(size: 8))
                            }
                        }
                    }

                    // Stray alert markers
                    ForEach(dataManager.strayAlerts) { alert in
                        Annotation("Stray: \(alert.name)", coordinate: alert.coordinate) {
                            ZStack {
                                Circle()
                                    .fill(Color.orange)
                                    .frame(width: 28, height: 28)
                                    .shadow(radius: 3)

                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.white)
                                    .font(.system(size: 12))
                            }
                        }
                    }

                    // Fence polygon
                    if let fence = dataManager.config?.fence, fence.count > 2 {
                        let coordinates = fence.map { $0.coordinate }
                        MapPolygon(coordinates: coordinates)
                            .stroke(Color.yellow.opacity(0.7), lineWidth: 2)
                    }

                    // Pastures
                    ForEach(dataManager.pastures) { pasture in
                        MapPolygon(coordinates: pasture.coordinates)
                            .stroke(Color.blue.opacity(0.5), lineWidth: 1)
                            .foregroundStyle(Color.blue.opacity(0.1))
                    }
                }
                .mapStyle(.hybrid)
                .mapControls {
                    MapUserLocationButton()
                    MapCompass()
                    MapScaleView()
                }

                // Stats Overlay
                VStack {
                    HStack {
                        Spacer()

                        // Herd Stats Card
                        VStack(alignment: .trailing, spacing: 4) {
                            HStack(spacing: 8) {
                                Text("\(dataManager.herd.count)")
                                    .font(.system(size: 24, weight: .bold, design: .rounded))
                                Image(systemName: "pawprint.fill")
                                    .font(.system(size: 16))
                            }
                            .foregroundColor(.white)

                            Text("Total Cattle")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))

                            if !dataManager.strayAlerts.isEmpty {
                                HStack(spacing: 4) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 10))
                                    Text("\(dataManager.strayAlerts.count) Strays")
                                        .font(.system(size: 11, weight: .semibold))
                                }
                                .foregroundColor(.orange)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.2))
                                .cornerRadius(8)
                            }
                        }
                        .padding(12)
                        .background(.ultraThinMaterial)
                        .cornerRadius(12)
                        .shadow(radius: 4)
                    }
                    .padding()

                    Spacer()
                }
            }
            .navigationTitle("Live Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        Task {
                            await dataManager.refresh()
                        }
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        // Center on ranch
                        if let center = dataManager.config?.ranchCenter {
                            cameraPosition = .region(
                                MKCoordinateRegion(
                                    center: center.coordinate,
                                    span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                                )
                            )
                        }
                    }) {
                        Image(systemName: "scope")
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
            .sheet(isPresented: $showCattleDetail) {
                if let cattle = selectedCattle {
                    CattleDetailView(cattle: cattle)
                        .presentationDetents([.medium])
                }
            }
            .onAppear {
                // Set initial camera position
                if let center = dataManager.config?.ranchCenter {
                    cameraPosition = .region(
                        MKCoordinateRegion(
                            center: center.coordinate,
                            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                        )
                    )
                }
            }
        }
    }
}

// MARK: - Cattle Detail Sheet

struct CattleDetailView: View {
    let cattle: HerdResponse.Cattle
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(cattle.id)
                                .font(.system(size: 14, design: .monospaced))
                                .foregroundColor(.secondary)

                            Spacer()

                            Image(systemName: "pawprint.fill")
                                .foregroundColor(Color(red: 0.8, green: 0.6, blue: 0.4))
                        }

                        Text(cattle.name)
                            .font(.system(size: 28, weight: .bold))
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Stats Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        StatCard(label: "Weight", value: "\(cattle.weight) lbs", icon: "scalemass.fill")
                        StatCard(label: "Temperature", value: String(format: "%.1f°F", cattle.temperature), icon: "thermometer")
                        StatCard(label: "Latitude", value: String(format: "%.5f°", cattle.lat), icon: "location.fill")
                        StatCard(label: "Longitude", value: String(format: "%.5f°", cattle.lon), icon: "location.fill")
                    }

                    // Vaccines
                    if let vaccines = cattle.vaccines, !vaccines.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Label("Vaccine Records", systemImage: "cross.case.fill")
                                .font(.system(size: 16, weight: .semibold))

                            ForEach(vaccines, id: \.name) { vaccine in
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(vaccine.name)
                                            .font(.system(size: 14, weight: .medium))
                                        Text(vaccine.date)
                                            .font(.system(size: 12))
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                }
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Cattle Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct StatCard: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(Color(red: 0.8, green: 0.6, blue: 0.4))
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
            }

            Text(value)
                .font(.system(size: 18, weight: .semibold))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview {
    MapTabView()
        .environmentObject(RanchDataManager())
        .environmentObject(AppState())
}
