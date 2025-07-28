import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var viewModel: PortfolioViewModel
    @State private var showingAddInvestment = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Summary Cards
                    summaryCardsSection
                    
                    // Quick Actions
                    quickActionsSection
                    
                    // Market Status
                    marketStatusSection
                    
                    // Recent Investments
                    recentInvestmentsSection
                }
                .padding()
            }
            .navigationTitle("Portfolio Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        viewModel.refreshAllData()
                    }
                }
            }
            .refreshable {
                viewModel.refreshAllData()
            }
        }
        .sheet(isPresented: $showingAddInvestment) {
            AddInvestmentView()
        }
        .alert("Error", isPresented: $viewModel.showingError) {
            Button("OK") {
                viewModel.clearError()
            }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Summary Cards Section
    private var summaryCardsSection: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            // Portfolio Value Card
            SummaryCard(
                title: "Portfolio Value",
                value: viewModel.portfolioSummary?.totalValue.formattedCurrency ?? "$0.00",
                subtitle: changeText(for: viewModel.portfolioSummary?.totalGainsPercent ?? 0),
                color: .blue,
                isLoading: viewModel.isLoadingPortfolio
            )
            
            // Total Invested Card
            SummaryCard(
                title: "Total Invested",
                value: viewModel.portfolioSummary?.totalInvested.formattedCurrency ?? "$0.00",
                subtitle: "Initial investment",
                color: .gray,
                isLoading: viewModel.isLoadingPortfolio
            )
            
            // Total Gains Card
            SummaryCard(
                title: "Total Gains",
                value: viewModel.portfolioSummary?.totalGains.formattedCurrency ?? "$0.00",
                subtitle: "\(viewModel.portfolioSummary?.totalGainsPercent.formattedPercent ?? "0.00%") return",
                color: (viewModel.portfolioSummary?.totalGains ?? 0) >= 0 ? .green : .red,
                isLoading: viewModel.isLoadingPortfolio
            )
            
            // S&P 500 Card
            SummaryCard(
                title: "S&P 500 Today",
                value: String(format: "%.2f", viewModel.marketData?.price ?? 0),
                subtitle: changeText(for: viewModel.marketData?.changePercent ?? 0),
                color: .orange,
                isLoading: viewModel.isLoadingMarket
            )
            
            // Monobank Balance Card
            if viewModel.isBankingConnected {
                SummaryCard(
                    title: "Monobank Balance",
                    value: viewModel.totalBankBalance.formattedCurrencyUAH,
                    subtitle: "\(viewModel.bankAccounts.count) account\(viewModel.bankAccounts.count != 1 ? "s" : "")",
                    color: .purple,
                    isLoading: viewModel.isLoadingBanking
                )
            } else {
                SummaryCard(
                    title: "Monobank Balance",
                    value: "Not Connected",
                    subtitle: "Connect in Banking",
                    color: .gray,
                    isLoading: false
                )
            }
        }
    }
    
    // MARK: - Quick Actions Section
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack(spacing: 12) {
                ActionButton(
                    title: "Add Investment",
                    icon: "plus.circle.fill",
                    color: .blue
                ) {
                    showingAddInvestment = true
                }
                
                ActionButton(
                    title: "Refresh Data",
                    icon: "arrow.clockwise",
                    color: .green
                ) {
                    viewModel.refreshMarketData()
                }
            }
        }
    }
    
    // MARK: - Market Status Section
    private var marketStatusSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Market Status")
                .font(.headline)
                .foregroundColor(.primary)
            
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
                .frame(height: 80)
                .overlay(
                    HStack {
                        VStack(alignment: .leading) {
                            HStack {
                                Circle()
                                    .fill(.green)
                                    .frame(width: 8, height: 8)
                                Text("Markets are open")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            Text("Next close: 4:00 PM EST")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                    .padding()
                )
        }
    }
    
    // MARK: - Recent Investments Section
    private var recentInvestmentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Investments")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                if viewModel.hasInvestments {
                    Button("View All") {
                        // Navigate to investments list
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                }
            }
            
            if viewModel.hasInvestments {
                LazyVStack(spacing: 8) {
                    ForEach(Array(viewModel.investments.prefix(3))) { investment in
                        InvestmentRowView(investment: investment)
                    }
                }
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemGray6))
                    .frame(height: 100)
                    .overlay(
                        VStack {
                            Image(systemName: "chart.bar.fill")
                                .font(.title2)
                                .foregroundColor(.secondary)
                            Text("No investments yet")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Button("Add your first investment") {
                                showingAddInvestment = true
                            }
                            .font(.caption)
                            .foregroundColor(.blue)
                        }
                    )
            }
        }
    }
    
    // MARK: - Helper Methods
    private func changeText(for percent: Double) -> String {
        let sign = percent >= 0 ? "+" : ""
        return "\(sign)\(percent.formattedPercent)"
    }
}

// MARK: - Supporting Views
struct SummaryCard: View {
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
        case "Total Invested": return "dollarsign.circle.fill"
        case "Total Gains": return "chart.line.uptrend.xyaxis"
        case "S&P 500 Today": return "chart.bar.fill"
        case "Monobank Balance": return "creditcard.fill"
        default: return "circle.fill"
        }
    }
}

struct ActionButton: View {
    let title: String
    let icon: String
    let color: Color
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
            }
            .foregroundColor(.white)
            .padding()
            .background(color)
            .cornerRadius(12)
        }
    }
}

struct InvestmentRowView: View {
    let investment: Investment
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(investment.amount.formattedCurrency)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(investment.purchaseDate.formattedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text("S&P 500")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("Added \(investment.createdAt.formattedDate)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Add Investment Sheet
struct AddInvestmentView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var viewModel: PortfolioViewModel
    @State private var amount = ""
    @State private var purchaseDate = Date()
    
    var body: some View {
        NavigationView {
            Form {
                Section("Investment Details") {
                    HStack {
                        Text("Amount")
                        Spacer()
                        TextField("$0.00", text: $amount)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    DatePicker("Purchase Date", selection: $purchaseDate, displayedComponents: .date)
                }
            }
            .navigationTitle("Add Investment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        addInvestment()
                    }
                    .disabled(amount.isEmpty)
                }
            }
        }
    }
    
    private func addInvestment() {
        guard let amountValue = Double(amount) else { return }
        viewModel.addInvestment(amount: amountValue, purchaseDate: purchaseDate)
        dismiss()
    }
}

#Preview {
    DashboardView()
        .environmentObject(PortfolioViewModel())
} 