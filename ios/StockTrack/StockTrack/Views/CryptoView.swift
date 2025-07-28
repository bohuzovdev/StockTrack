import SwiftUI

struct CryptoView: View {
    @EnvironmentObject var viewModel: PortfolioViewModel
    @State private var showingConnectSheet = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Coming Soon Banner
                    comingSoonBanner
                    
                    // Summary Cards
                    cryptoSummaryCards
                    
                    // Top Cryptocurrencies
                    topCryptocurrenciesSection
                    
                    // Quick Actions
                    quickActionsSection
                    
                    // Portfolio Allocation
                    portfolioAllocationSection
                }
                .padding()
            }
            .navigationTitle("Crypto Trading")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        viewModel.loadCryptoData()
                    }
                }
            }
        }
        .sheet(isPresented: $showingConnectSheet) {
            ConnectBinanceView()
        }
    }
    
    // MARK: - Coming Soon Banner
    private var comingSoonBanner: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.orange.opacity(0.1))
            .frame(height: 80)
            .overlay(
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text("Binance Integration Coming Soon")
                                .font(.headline)
                                .fontWeight(.semibold)
                        }
                        Text("Monitor crypto markets with placeholder data for now")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding()
            )
    }
    
    // MARK: - Crypto Summary Cards
    private var cryptoSummaryCards: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            CryptoSummaryCard(
                title: "Portfolio Value",
                value: "$24,567.89",
                subtitle: "+12.34% (24h)",
                color: .orange,
                isLoading: viewModel.isLoadingCrypto
            )
            
            CryptoSummaryCard(
                title: "Total P&L",
                value: "+$3,456.78",
                subtitle: "+16.38% overall",
                color: .green,
                isLoading: viewModel.isLoadingCrypto
            )
            
            CryptoSummaryCard(
                title: "24h Volume",
                value: "$45.2B",
                subtitle: "Global market",
                color: .blue,
                isLoading: viewModel.isLoadingCrypto
            )
            
            CryptoSummaryCard(
                title: "Active Positions",
                value: "7",
                subtitle: "Across 4 pairs",
                color: .purple,
                isLoading: viewModel.isLoadingCrypto
            )
        }
    }
    
    // MARK: - Top Cryptocurrencies Section
    private var topCryptocurrenciesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Top Cryptocurrencies")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Button("Settings") {
                    // Settings action
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
            
            if viewModel.isLoadingCrypto {
                VStack {
                    ProgressView()
                    Text("Loading crypto data...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(height: 100)
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.cryptoCoins) { coin in
                        CryptoCoinRowView(coin: coin)
                    }
                }
            }
        }
    }
    
    // MARK: - Quick Actions Section
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(spacing: 12) {
                CryptoActionButton(
                    title: "Buy Crypto",
                    icon: "plus.circle.fill",
                    color: .blue,
                    isEnabled: false
                ) {
                    // Buy crypto action
                }
                
                CryptoActionButton(
                    title: "Start Trading",
                    icon: "chart.line.uptrend.xyaxis",
                    color: .green,
                    isEnabled: false
                ) {
                    // Start trading action
                }
                
                CryptoActionButton(
                    title: "Connect Binance",
                    icon: "link",
                    color: .orange,
                    isEnabled: true
                ) {
                    showingConnectSheet = true
                }
            }
        }
    }
    
    // MARK: - Portfolio Allocation Section
    private var portfolioAllocationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Portfolio Allocation")
                .font(.headline)
                .foregroundColor(.primary)
            
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6))
                .frame(height: 200)
                .overlay(
                    VStack(spacing: 16) {
                        AllocationRowView(
                            name: "Bitcoin",
                            percentage: "45.2%",
                            color: .orange
                        )
                        
                        AllocationRowView(
                            name: "Ethereum",
                            percentage: "32.1%",
                            color: .blue
                        )
                        
                        AllocationRowView(
                            name: "BNB",
                            percentage: "15.7%",
                            color: .yellow
                        )
                        
                        AllocationRowView(
                            name: "Others",
                            percentage: "7.0%",
                            color: .green
                        )
                    }
                    .padding()
                )
        }
    }
}

// MARK: - Supporting Views
struct CryptoSummaryCard: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color
    let isLoading: Bool
    
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color(.systemBackground))
            .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
            .frame(height: 100)
            .overlay(
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(title)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            if isLoading {
                                HStack {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("Loading...")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            } else {
                                Text(value)
                                    .font(.title3)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                            }
                            
                            Text(subtitle)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Circle()
                            .fill(color.opacity(0.2))
                            .frame(width: 32, height: 32)
                            .overlay(
                                Image(systemName: iconName(for: title))
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(color)
                            )
                    }
                }
                .padding()
            )
    }
    
    private func iconName(for title: String) -> String {
        switch title {
        case "Portfolio Value": return "wallet.pass.fill"
        case "Total P&L": return "chart.line.uptrend.xyaxis"
        case "24h Volume": return "chart.bar.fill"
        case "Active Positions": return "chart.pie.fill"
        default: return "circle.fill"
        }
    }
}

struct CryptoCoinRowView: View {
    let coin: CryptoCoin
    
    var body: some View {
        HStack {
            // Coin Icon and Info
            HStack(spacing: 12) {
                Circle()
                    .fill(coinColor.opacity(0.2))
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(String(coin.symbol.prefix(1)))
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(coinColor)
                    )
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(coin.symbol)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        Text(coin.name)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Text("Vol: \(formatVolume(coin.volume24h))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // Price and Change
            VStack(alignment: .trailing, spacing: 2) {
                Text(coin.price.formattedCurrency)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                HStack(spacing: 4) {
                    Image(systemName: coin.isPositiveChange ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption)
                        .foregroundColor(coin.isPositiveChange ? .green : .red)
                    
                    Text("\(coin.changePercent24h >= 0 ? "+" : "")\(coin.changePercent24h, specifier: "%.2f")%")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(coin.isPositiveChange ? .green : .red)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private var coinColor: Color {
        switch coin.symbol {
        case "BTC": return .orange
        case "ETH": return .blue
        case "BNB": return .yellow
        default: return .green
        }
    }
    
    private func formatVolume(_ volume: Double) -> String {
        if volume >= 1e9 {
            return String(format: "$%.1fB", volume / 1e9)
        } else if volume >= 1e6 {
            return String(format: "$%.1fM", volume / 1e6)
        } else {
            return String(format: "$%.1fK", volume / 1e3)
        }
    }
}

struct CryptoActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let isEnabled: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Spacer()
                if !isEnabled {
                    Text("Soon")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.gray.opacity(0.3))
                        .cornerRadius(8)
                }
            }
            .foregroundColor(isEnabled ? .white : .gray)
            .padding()
            .background(isEnabled ? color : .gray.opacity(0.3))
            .cornerRadius(12)
        }
        .disabled(!isEnabled)
    }
}

struct AllocationRowView: View {
    let name: String
    let percentage: String
    let color: Color
    
    var body: some View {
        HStack {
            HStack(spacing: 8) {
                Circle()
                    .fill(color)
                    .frame(width: 12, height: 12)
                Text(name)
                    .font(.subheadline)
            }
            
            Spacer()
            
            Text(percentage)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Connect Binance Sheet
struct ConnectBinanceView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var apiKey = ""
    @State private var secretKey = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 16) {
                    Image(systemName: "bitcoinsign.circle.fill")
                        .font(.system(size: 64))
                        .foregroundColor(.orange)
                    
                    Text("Connect Binance")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Connect your Binance account to start trading and monitoring your crypto portfolio.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("API Key")
                            .font(.headline)
                        TextField("Enter your Binance API key", text: $apiKey)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Secret Key")
                            .font(.headline)
                        TextField("Enter your Binance secret key", text: $secretKey)
                            .textFieldStyle(.roundedBorder)
                    }
                }
                
                VStack(spacing: 12) {
                    Button(action: {
                        // Connect action - placeholder
                        dismiss()
                    }) {
                        HStack {
                            Image(systemName: "link")
                            Text("Connect Account")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.gray) // Disabled for now
                        .cornerRadius(12)
                    }
                    .disabled(true) // Disabled until implementation
                    
                    Text("Coming Soon")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Add Binance Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    CryptoView()
        .environmentObject(PortfolioViewModel())
} 