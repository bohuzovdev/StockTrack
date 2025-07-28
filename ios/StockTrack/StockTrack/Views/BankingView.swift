import SwiftUI

struct BankingView: View {
    @EnvironmentObject var viewModel: PortfolioViewModel
    @State private var showingTokenInput = false
    @State private var tokenInput = ""
    @State private var balanceVisible = true
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    if viewModel.isBankingConnected {
                        // Connected State
                        connectedStateView
                    } else {
                        // Not Connected State
                        notConnectedStateView
                    }
                }
                .padding()
            }
            .navigationTitle("Banking")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if viewModel.isBankingConnected {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Menu {
                            Button("Refresh Data") {
                                viewModel.refreshAllData()
                            }
                            Button("Toggle Balance") {
                                balanceVisible.toggle()
                            }
                            Button("Disconnect", role: .destructive) {
                                viewModel.disconnectBanking()
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showingTokenInput) {
            TokenInputView(tokenInput: $tokenInput) { token in
                viewModel.testBankingConnection(provider: "monobank", token: token)
                showingTokenInput = false
            }
        }
        .alert("Error", isPresented: $viewModel.showingError) {
            Button("OK") {
                viewModel.clearError()
            }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Connected State View
    private var connectedStateView: some View {
        VStack(spacing: 20) {
            // Connection Status
            connectionStatusCard
            
            // Account Cards
            if !viewModel.bankAccounts.isEmpty {
                accountCardsSection
            }
            
            // Transaction History
            if !viewModel.bankTransactions.isEmpty {
                transactionHistorySection
            }
        }
    }
    
    // MARK: - Not Connected State View
    private var notConnectedStateView: some View {
        VStack(spacing: 24) {
            // Connection Status
            disconnectedStatusCard
            
            // How to Connect
            howToConnectSection
            
            // Connect Button
            Button(action: {
                showingTokenInput = true
            }) {
                HStack {
                    Image(systemName: "link")
                    Text("Connect Monobank")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue)
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Connection Status Card
    private var connectionStatusCard: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.green.opacity(0.1))
            .frame(height: 80)
            .overlay(
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("Monobank Connected")
                                .font(.headline)
                                .fontWeight(.semibold)
                        }
                        Text("\(viewModel.bankAccounts.count) account\(viewModel.bankAccounts.count != 1 ? "s" : "") linked")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding()
            )
    }
    
    private var disconnectedStatusCard: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.orange.opacity(0.1))
            .frame(height: 80)
            .overlay(
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.orange)
                            Text("Not Connected")
                                .font(.headline)
                                .fontWeight(.semibold)
                        }
                        Text("Connect your Monobank account to track expenses")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding()
            )
    }
    
    // MARK: - Account Cards Section
    private var accountCardsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Your Accounts")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Button(action: {
                    balanceVisible.toggle()
                }) {
                    Image(systemName: balanceVisible ? "eye.slash" : "eye")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(viewModel.bankAccounts) { account in
                    BankAccountCard(
                        account: account,
                        balanceVisible: balanceVisible,
                        isSelected: viewModel.selectedBankAccount?.id == account.id
                    ) {
                        viewModel.selectedBankAccount = account
                        if let token = SecureStorage.getToken() {
                            viewModel.loadBankTransactions(
                                provider: "monobank",
                                token: token,
                                accountId: account.id
                            )
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Transaction History Section
    private var transactionHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Transactions")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                if let selectedAccount = viewModel.selectedBankAccount {
                    Text(selectedAccount.name)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            LazyVStack(spacing: 8) {
                ForEach(Array(viewModel.bankTransactions.prefix(10))) { transaction in
                    TransactionRowView(
                        transaction: transaction,
                        balanceVisible: balanceVisible
                    )
                }
            }
        }
    }
    
    // MARK: - How to Connect Section
    private var howToConnectSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("How to Get Your Monobank API Token")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(alignment: .leading, spacing: 12) {
                InstructionStep(
                    number: 1,
                    title: "Open Monobank App",
                    description: "Launch the Monobank mobile application"
                )
                
                InstructionStep(
                    number: 2,
                    title: "Go to Settings",
                    description: "Navigate to Settings → API for developers"
                )
                
                InstructionStep(
                    number: 3,
                    title: "Generate Token",
                    description: "Create a new personal API token"
                )
                
                InstructionStep(
                    number: 4,
                    title: "Copy & Paste",
                    description: "Copy the token and paste it in StockTrack"
                )
            }
        }
    }
}

// MARK: - Supporting Views
struct BankAccountCard: View {
    let account: BankAccount
    let balanceVisible: Bool
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? .blue : .clear, lineWidth: 2)
                )
                .frame(height: 120)
                .overlay(
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            accountTypeIcon(for: account.type)
                            Spacer()
                            Text(account.type.uppercased())
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(.gray.opacity(0.2))
                                .cornerRadius(4)
                        }
                        
                        Text(account.name)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        
                        if let maskedPan = account.maskedPan {
                            Text("•••• •••• •••• \(String(maskedPan.suffix(4)))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Balance")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                Text(balanceVisible ? account.balance.formattedCurrencyUAH : "••••••")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(account.balance >= 0 ? .primary : .red)
                            }
                            Spacer()
                        }
                    }
                    .padding()
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func accountTypeIcon(for type: String) -> some View {
        let color: Color
        switch type.lowercased() {
        case "black": color = .black
        case "white": color = .gray
        case "platinum": color = .purple
        default: color = .blue
        }
        
        return Image(systemName: "creditcard.fill")
            .font(.title2)
            .foregroundColor(color)
    }
}

struct TransactionRowView: View {
    let transaction: BankTransaction
    let balanceVisible: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    transactionIcon
                    VStack(alignment: .leading, spacing: 2) {
                        Text(transaction.description)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .lineLimit(1)
                        
                        Text(transaction.date.formattedDateTime)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let comment = transaction.comment, !comment.isEmpty {
                    Text(comment)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.leading, 28)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(transaction.isIncome ? "+\(abs(transaction.amount).formattedCurrencyUAH)" : "-\(abs(transaction.amount).formattedCurrencyUAH)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(transaction.isIncome ? .green : .red)
                
                if transaction.cashbackAmount > 0 {
                    Text("+\(transaction.cashbackAmount.formattedCurrencyUAH) cashback")
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
                
                Text("Balance: \(balanceVisible ? transaction.balance.formattedCurrencyUAH : "••••••")")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private var transactionIcon: some View {
        Circle()
            .fill(transaction.isIncome ? .green.opacity(0.2) : .red.opacity(0.2))
            .frame(width: 24, height: 24)
            .overlay(
                Image(systemName: transaction.isIncome ? "arrow.down.left" : "arrow.up.right")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(transaction.isIncome ? .green : .red)
            )
    }
}

struct InstructionStep: View {
    let number: Int
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(.blue)
                .frame(width: 24, height: 24)
                .overlay(
                    Text("\(number)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
    }
}

// MARK: - Token Input Sheet
struct TokenInputView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var tokenInput: String
    let onConnect: (String) -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 16) {
                    Image(systemName: "key.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.blue)
                    
                    Text("Connect Monobank")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Enter your Monobank API token to connect your account securely.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("API Token")
                        .font(.headline)
                    
                    TextField("Enter your Monobank API token", text: $tokenInput, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...6)
                }
                
                Button(action: {
                    onConnect(tokenInput)
                }) {
                    HStack {
                        Image(systemName: "link")
                        Text("Connect Account")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(tokenInput.isEmpty ? .gray : .blue)
                    .cornerRadius(12)
                }
                .disabled(tokenInput.isEmpty)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Add Account")
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

// MARK: - Additional Supporting Views
struct HistoricalDataView: View {
    @EnvironmentObject var viewModel: PortfolioViewModel
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 16) {
                    if viewModel.hasInvestments {
                        ForEach(viewModel.investments) { investment in
                            InvestmentRowView(investment: investment)
                        }
                    } else {
                        VStack(spacing: 16) {
                            Image(systemName: "clock")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text("No investment history")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Text("Add your first investment to see historical data")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Historical Data")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ForecastView: View {
    @State private var forecastYears: Double = 10
    @State private var monthlyContribution: String = "500"
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Forecast Parameters
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Forecast Parameters")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Forecast Period: \(Int(forecastYears)) years")
                                .font(.subheadline)
                            Slider(value: $forecastYears, in: 1...30, step: 1)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Monthly Contribution")
                                .font(.subheadline)
                            TextField("$500", text: $monthlyContribution)
                                .keyboardType(.decimalPad)
                                .textFieldStyle(.roundedBorder)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    
                    // Forecast Results
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Projected Results")
                            .font(.headline)
                        
                        let monthlyAmount = Double(monthlyContribution) ?? 500
                        let totalContributions = monthlyAmount * 12 * forecastYears
                        let projectedValue = totalContributions * 1.105 // Assuming 10.5% annual return
                        
                        VStack(spacing: 12) {
                            ForecastResultCard(
                                title: "Total Contributions",
                                value: totalContributions.formattedCurrency,
                                color: .blue
                            )
                            
                            ForecastResultCard(
                                title: "Projected Value",
                                value: projectedValue.formattedCurrency,
                                color: .green
                            )
                            
                            ForecastResultCard(
                                title: "Projected Gains",
                                value: (projectedValue - totalContributions).formattedCurrency,
                                color: .orange
                            )
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Portfolio Forecast")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ForecastResultCard: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(color)
            }
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

#Preview {
    BankingView()
        .environmentObject(PortfolioViewModel())
} 