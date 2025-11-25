//
//  CattleTabView.swift
//  RanchOS
//
//  Herd management and cattle listing
//

import SwiftUI

struct CattleTabView: View {
    @EnvironmentObject var dataManager: RanchDataManager
    @EnvironmentObject var appState: AppState
    @State private var searchText = ""
    @State private var selectedCattle: HerdResponse.Cattle?
    @State private var showDetail = false

    private var filteredHerd: [HerdResponse.Cattle] {
        if searchText.isEmpty {
            return dataManager.herd
        }
        return dataManager.herd.filter { cattle in
            cattle.id.localizedCaseInsensitiveContains(searchText) ||
            cattle.name.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if dataManager.herd.isEmpty {
                    EmptyStateView(
                        icon: "pawprint.fill",
                        title: "No Cattle Found",
                        message: "Herd data will appear here when available"
                    )
                } else {
                    List {
                        // Stray Alerts Section
                        if !dataManager.strayAlerts.isEmpty {
                            Section {
                                ForEach(dataManager.strayAlerts) { alert in
                                    StrayAlertRow(alert: alert) {
                                        if let cattle = dataManager.herd.first(where: { $0.id == alert.cowId }) {
                                            selectedCattle = cattle
                                            showDetail = true
                                        }
                                    }
                                }
                            } header: {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                    Text("AI Stray Detection")
                                }
                                .foregroundColor(.orange)
                            }
                        }

                        // Cattle List
                        Section {
                            ForEach(filteredHerd) { cattle in
                                CattleRow(cattle: cattle) {
                                    selectedCattle = cattle
                                    showDetail = true
                                }
                            }
                        } header: {
                            Text("Herd (\(filteredHerd.count))")
                        }

                        // Chute Log Section
                        if !dataManager.chuteLog.isEmpty {
                            Section {
                                ForEach(dataManager.chuteLog.prefix(10)) { transaction in
                                    ChuteLogRow(transaction: transaction)
                                }
                            } header: {
                                Text("Recent Chute Activity")
                            }
                        }
                    }
                    .searchable(text: $searchText, prompt: "Search by ID or name")
                }
            }
            .navigationTitle("Cattle Management")
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
            .sheet(isPresented: $showDetail) {
                if let cattle = selectedCattle {
                    CattleDetailView(cattle: cattle)
                }
            }
        }
    }
}

// MARK: - Stray Alert Row

struct StrayAlertRow: View {
    let alert: StrayAlertsResponse.StrayAlert
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.orange)

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(alert.cowId)
                            .font(.system(size: 14, weight: .semibold, design: .monospaced))
                        Text("•")
                            .foregroundColor(.secondary)
                        Text(alert.name)
                            .font(.system(size: 14, weight: .medium))
                    }

                    Text("Away from herd for \(alert.duration)")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)

                    HStack(spacing: 12) {
                        Label(String(format: "%.5f°", alert.lat), systemImage: "location.fill")
                        Label("\(alert.altitude) ft", systemImage: "arrow.up.arrow.down")
                    }
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Cattle Row

struct CattleRow: View {
    let cattle: HerdResponse.Cattle
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color(red: 0.8, green: 0.6, blue: 0.4))
                        .frame(width: 40, height: 40)

                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(cattle.id)
                            .font(.system(size: 14, weight: .semibold, design: .monospaced))
                        Text("•")
                            .foregroundColor(.secondary)
                        Text(cattle.name)
                            .font(.system(size: 14, weight: .medium))
                    }

                    HStack(spacing: 12) {
                        Label("\(cattle.weight) lbs", systemImage: "scalemass.fill")
                        Label(String(format: "%.1f°F", cattle.temperature), systemImage: "thermometer")
                    }
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Chute Log Row

struct ChuteLogRow: View {
    let transaction: ChuteResponse.ChuteTransaction

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(transaction.id)
                    .font(.system(size: 14, weight: .semibold, design: .monospaced))

                Spacer()

                if let timestamp = transaction.timestamp {
                    Text(timestamp, style: .relative)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }

            HStack(spacing: 16) {
                Label("\(transaction.weight) lbs", systemImage: "scalemass.fill")
                Label(String(format: "%.1f°F", transaction.temperature), systemImage: "thermometer")
                Label(transaction.operator, systemImage: "person.fill")
            }
            .font(.system(size: 12))
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    CattleTabView()
        .environmentObject(RanchDataManager())
        .environmentObject(AppState())
}
