//
//  SensorsTabView.swift
//  RanchOS
//
//  Sensor monitoring dashboard with real-time status indicators
//

import SwiftUI

struct SensorsTabView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // System Status Banner
                    SystemStatusBanner(sensors: dataManager.sensors)
                        .padding(.horizontal)
                        .padding(.top)

                    // Sensor Grid
                    if let sensors = dataManager.sensors?.sensors, !sensors.isEmpty {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            ForEach(Array(sensors.keys.sorted()), id: \.self) { key in
                                if let reading = sensors[key] {
                                    SensorCard(sensorKey: key, reading: reading)
                                }
                            }
                        }
                        .padding(.horizontal)
                    } else {
                        EmptyStateView(
                            icon: "sensor.fill",
                            title: "No Sensors Configured",
                            message: "Contact admin to set up ranch sensors"
                        )
                        .padding()
                    }

                    // Gates Section
                    if !dataManager.gates.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Perimeter Gates")
                                .font(.system(size: 20, weight: .bold))
                                .padding(.horizontal)

                            ForEach(dataManager.gates) { gate in
                                GateCard(gate: gate) {
                                    Task {
                                        await dataManager.toggleGate(gateId: gate.id)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                        .padding(.top)
                    }

                    // Chute Transactions
                    if let chute = dataManager.chute {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Latest Chute Activity")
                                .font(.system(size: 20, weight: .bold))
                                .padding(.horizontal)

                            ChuteTransactionCard(transaction: chute)
                                .padding(.horizontal)
                        }
                        .padding(.top)
                    }
                }
                .padding(.bottom)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Sensors")
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

// MARK: - System Status Banner

struct SystemStatusBanner: View {
    let sensors: SensorsResponse?

    private var systemStatus: (color: Color, text: String) {
        guard let sensors = sensors?.sensors else {
            return (.gray, "Unknown")
        }

        let hasRed = sensors.values.contains { $0.status == "red" }
        let hasYellow = sensors.values.contains { $0.status == "yellow" }

        if hasRed {
            return (.red, "CRITICAL")
        } else if hasYellow {
            return (.orange, "WARNING")
        } else {
            return (.green, "NORMAL")
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(systemStatus.color)
                .frame(width: 12, height: 12)
                .shadow(color: systemStatus.color.opacity(0.5), radius: 4)

            Text("System Status: \(systemStatus.text)")
                .font(.system(size: 16, weight: .semibold))

            Spacer()
        }
        .padding()
        .background(systemStatus.color.opacity(0.1))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(systemStatus.color.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Sensor Card

struct SensorCard: View {
    let sensorKey: String
    let reading: SensorsResponse.SensorReading

    private var statusColor: Color {
        switch reading.status {
        case "red": return .red
        case "yellow": return .orange
        case "green": return .green
        default: return .gray
        }
    }

    private var icon: String {
        switch sensorKey {
        case "SYSTEM": return "bolt.fill"
        case "WATER": return "drop.fill"
        case "FENCE": return "bolt.shield.fill"
        case "GATE": return "lock.fill"
        case "NETWORK": return "wifi"
        case "ALERTS": return "exclamationmark.triangle.fill"
        default: return "circle.fill"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(statusColor)

                Spacer()

                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(sensorKey)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)

                Text(reading.value ?? "OK")
                    .font(.system(size: 16, weight: .bold))
            }

            if let detail = reading.detail {
                Text(detail)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Gate Card

struct GateCard: View {
    let gate: GatesResponse.Gate
    let onToggle: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                Text(gate.id)
                    .font(.system(size: 16, weight: .semibold))

                HStack(spacing: 4) {
                    Image(systemName: gate.isOpen ? "lock.open.fill" : "lock.fill")
                        .font(.system(size: 12))
                    Text(gate.status.uppercased())
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(gate.isOpen ? .red : .green)
            }

            Spacer()

            Button(action: onToggle) {
                Text(gate.isOpen ? "Close" : "Open")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(gate.isOpen ? Color.green : Color.red)
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Chute Transaction Card

struct ChuteTransactionCard: View {
    let transaction: ChuteResponse.ChuteTransaction

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "scalemass.fill")
                    .foregroundColor(Color(red: 0.8, green: 0.6, blue: 0.4))
                Text("Chute Scale")
                    .font(.system(size: 14, weight: .semibold))
                Spacer()
            }

            Divider()

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Tag ID")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    Text(transaction.id)
                        .font(.system(size: 14, weight: .semibold, design: .monospaced))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Weight")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    Text("\(transaction.weight) lbs")
                        .font(.system(size: 14, weight: .semibold))
                }

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Temp")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    Text(String(format: "%.1f°F", transaction.temperature))
                        .font(.system(size: 14, weight: .semibold))
                }
            }

            HStack {
                Text("Operator: \(transaction.operator)")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)

                Spacer()

                if let timestamp = transaction.timestamp {
                    Text(timestamp, style: .relative)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Empty State

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.secondary.opacity(0.5))

            Text(title)
                .font(.system(size: 18, weight: .semibold))

            Text(message)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }
}

#Preview {
    SensorsTabView()
        .environmentObject(RanchDataManager())
        .environmentObject(AppState())
}
