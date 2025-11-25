import SwiftUI

struct SensorDashboardView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @State private var selectedSensor: (key: String, reading: SensorReading)?
    @State private var showSensorDetail = false

    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color(hex: "0a0e14")
                    .ignoresSafeArea()

                if dataManager.sensors.isEmpty {
                    // Empty state
                    VStack(spacing: 20) {
                        Image(systemName: "sensor.fill")
                            .resizable()
                            .frame(width: 60, height: 60)
                            .foregroundColor(Color(hex: "9ca3af"))
                            .opacity(0.5)

                        Text("No Sensors Configured")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)

                        Text("Contact admin to set up ranch sensors")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "9ca3af"))
                    }
                } else {
                    ScrollView {
                        LazyVGrid(
                            columns: [
                                GridItem(.flexible(), spacing: 16),
                                GridItem(.flexible(), spacing: 16)
                            ],
                            spacing: 16
                        ) {
                            ForEach(Array(dataManager.sensors.keys.sorted()), id: \.self) { key in
                                if let reading = dataManager.sensors[key] {
                                    SensorCard(
                                        type: key,
                                        reading: reading,
                                        onTap: {
                                            selectedSensor = (key, reading)
                                            showSensorDetail = true
                                        }
                                    )
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Sensors")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showSensorDetail) {
                if let selected = selectedSensor {
                    SensorDetailView(
                        type: selected.key,
                        reading: selected.reading,
                        gates: dataManager.gates
                    )
                }
            }
        }
    }
}

struct SensorCard: View {
    let type: String
    let reading: SensorReading
    let onTap: () -> Void

    private var sensorIcon: String {
        switch type.uppercased() {
        case "SYSTEM": return "bolt.fill"
        case "WATER": return "drop.fill"
        case "FENCE": return "line.diagonal"
        case "GATE": return "door.left.hand.open"
        case "NETWORK": return "antenna.radiowaves.left.and.right"
        case "ALERTS": return "exclamationmark.triangle.fill"
        default: return "sensor.fill"
        }
    }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 12) {
                // Icon
                Image(systemName: sensorIcon)
                    .font(.system(size: 32))
                    .foregroundColor(reading.status.color)

                // Label
                Text(type)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)

                // Value
                Text(reading.value)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(hex: "9ca3af"))
                    .multilineTextAlignment(.center)

                // Status indicator
                Circle()
                    .fill(reading.status.color)
                    .frame(width: 8, height: 8)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(hex: "1a1f26"))
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(reading.status.color.opacity(0.3), lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SensorDetailView: View {
    let type: String
    let reading: SensorReading
    let gates: [Gate]
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "0a0e14")
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Status card
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Status")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(Color(hex: "9ca3af"))

                                Spacer()

                                Text(reading.status.displayName.uppercased())
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(reading.status.color)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(reading.status.color.opacity(0.2))
                                    .cornerRadius(6)
                            }

                            Text(reading.value)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(hex: "1a1f26"))
                        .cornerRadius(12)

                        // Details card
                        if let detail = reading.detail {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Details")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(Color(hex: "9ca3af"))

                                Text(detail)
                                    .font(.system(size: 15))
                                    .foregroundColor(.white)
                                    .lineSpacing(4)
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(hex: "1a1f26"))
                            .cornerRadius(12)
                        }

                        // Gate status (if applicable)
                        if type.uppercased() == "GATE" && !gates.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Gate Status")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(Color(hex: "9ca3af"))

                                ForEach(gates) { gate in
                                    HStack {
                                        Text(gate.id)
                                            .font(.system(size: 15, weight: .semibold))
                                            .foregroundColor(.white)

                                        Spacer()

                                        Text(gate.status.rawValue.uppercased())
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(gate.status == .open ? .red : .green)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 4)
                                            .background((gate.status == .open ? Color.red : Color.green).opacity(0.2))
                                            .cornerRadius(6)
                                    }
                                    .padding()
                                    .background(Color(hex: "0f1419"))
                                    .cornerRadius(8)
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(hex: "1a1f26"))
                            .cornerRadius(12)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("\(type) Sensor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(Color(hex: "c87533"))
                }
            }
        }
    }
}
