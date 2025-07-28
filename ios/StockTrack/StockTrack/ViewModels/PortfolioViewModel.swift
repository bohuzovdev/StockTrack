import SwiftUI
import Combine

class PortfolioViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var portfolioSummary: PortfolioSummary?
    @Published var investments: [Investment] = []
    @Published var marketData: MarketData?
    @Published var bankAccounts: [BankAccount] = []
    @Published var bankTransactions: [BankTransaction] = []
    @Published var cryptoCoins: [CryptoCoin] = []
    
    // MARK: - Loading States
    @Published var isLoadingPortfolio = false
    @Published var isLoadingMarket = false
    @Published var isLoadingBanking = false
    @Published var isLoadingCrypto = false
    
    // MARK: - Error States
    @Published var errorMessage: String?
    @Published var showingError = false
    
    // MARK: - Banking States
    @Published var isBankingConnected = false
    @Published var selectedBankAccount: BankAccount?
    
    private let networkManager = NetworkManager.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadSavedBankingToken()
    }
    
    // MARK: - Portfolio Data Loading
    func loadPortfolioData() {
        loadPortfolioSummary()
        loadInvestments()
        loadMarketData()
        loadCryptoData()
    }
    
    private func loadPortfolioSummary() {
        isLoadingPortfolio = true
        
        networkManager.fetchPortfolioSummary()
            .sink(
                receiveCompletion: { [weak self] completion in
                    DispatchQueue.main.async {
                        self?.isLoadingPortfolio = false
                        if case .failure(let error) = completion {
                            self?.handleError(error)
                        }
                    }
                },
                receiveValue: { [weak self] summary in
                    DispatchQueue.main.async {
                        self?.portfolioSummary = summary
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    private func loadInvestments() {
        networkManager.fetchInvestments()
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.handleError(error)
                    }
                },
                receiveValue: { [weak self] investments in
                    DispatchQueue.main.async {
                        self?.investments = investments
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    private func loadMarketData() {
        isLoadingMarket = true
        
        networkManager.fetchMarketData()
            .sink(
                receiveCompletion: { [weak self] completion in
                    DispatchQueue.main.async {
                        self?.isLoadingMarket = false
                        if case .failure(let error) = completion {
                            self?.handleError(error)
                        }
                    }
                },
                receiveValue: { [weak self] data in
                    DispatchQueue.main.async {
                        self?.marketData = data
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    private func loadCryptoData() {
        isLoadingCrypto = true
        
        networkManager.fetchCryptoData()
            .sink(
                receiveCompletion: { [weak self] completion in
                    DispatchQueue.main.async {
                        self?.isLoadingCrypto = false
                        if case .failure(let error) = completion {
                            self?.handleError(error)
                        }
                    }
                },
                receiveValue: { [weak self] coins in
                    DispatchQueue.main.async {
                        self?.cryptoCoins = coins
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Investment Management
    func addInvestment(amount: Double, purchaseDate: Date = Date()) {
        networkManager.addInvestment(amount: amount, purchaseDate: purchaseDate)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.handleError(error)
                    }
                },
                receiveValue: { [weak self] newInvestment in
                    DispatchQueue.main.async {
                        self?.investments.append(newInvestment)
                        self?.loadPortfolioSummary() // Refresh summary
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Banking Integration
    private func loadSavedBankingToken() {
        if let token = SecureStorage.getToken() {
            testBankingConnection(provider: "monobank", token: token)
        }
    }
    
    func testBankingConnection(provider: String, token: String) {
        isLoadingBanking = true
        
        networkManager.testBankingConnection(provider: provider, token: token)
            .sink(
                receiveCompletion: { [weak self] completion in
                    DispatchQueue.main.async {
                        self?.isLoadingBanking = false
                        if case .failure(let error) = completion {
                            self?.handleError(error)
                        }
                    }
                },
                receiveValue: { [weak self] response in
                    DispatchQueue.main.async {
                        if response.valid == true {
                            self?.isBankingConnected = true
                            SecureStorage.saveToken(token)
                            self?.loadBankAccounts(provider: provider, token: token)
                        } else {
                            self?.isBankingConnected = false
                            SecureStorage.removeToken()
                            self?.handleError(NetworkError.serverError(response.error ?? "Invalid token"))
                        }
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    private func loadBankAccounts(provider: String, token: String) {
        networkManager.fetchBankAccounts(provider: provider, token: token)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.handleError(error)
                    }
                },
                receiveValue: { [weak self] response in
                    DispatchQueue.main.async {
                        if let accounts = response.accounts {
                            self?.bankAccounts = accounts
                            self?.selectedBankAccount = accounts.first
                            
                            // Load transactions for the first account
                            if let firstAccount = accounts.first {
                                self?.loadBankTransactions(
                                    provider: provider,
                                    token: token,
                                    accountId: firstAccount.id
                                )
                            }
                        }
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    func loadBankTransactions(provider: String, token: String, accountId: String) {
        let fromDate = Calendar.current.date(byAdding: .day, value: -30, to: Date()) // Last 30 days
        
        networkManager.fetchBankTransactions(
            provider: provider,
            token: token,
            accountId: accountId,
            from: fromDate,
            to: Date()
        )
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            },
            receiveValue: { [weak self] response in
                DispatchQueue.main.async {
                    if let transactions = response.transactions {
                        self?.bankTransactions = transactions
                    }
                }
            }
        )
        .store(in: &cancellables)
    }
    
    func disconnectBanking() {
        SecureStorage.removeToken()
        isBankingConnected = false
        bankAccounts = []
        bankTransactions = []
        selectedBankAccount = nil
    }
    
    // MARK: - Data Refresh
    func refreshAllData() {
        loadPortfolioData()
        
        if isBankingConnected, let token = SecureStorage.getToken() {
            loadBankAccounts(provider: "monobank", token: token)
        }
    }
    
    func refreshMarketData() {
        networkManager.refreshMarketData()
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.handleError(error)
                    } else {
                        // Reload market data after refresh
                        self?.loadMarketData()
                    }
                },
                receiveValue: { _ in
                    // Success handled in completion
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Computed Properties
    var totalBankBalance: Double {
        bankAccounts.reduce(0) { total, account in
            if account.currency == "UAH" {
                return total + account.balance
            } else if account.currency == "USD" {
                return total + (account.balance * 4100) // Approximate USD to UAH rate
            } else if account.currency == "EUR" {
                return total + (account.balance * 4400) // Approximate EUR to UAH rate
            }
            return total + account.balance
        }
    }
    
    var hasInvestments: Bool {
        !investments.isEmpty
    }
    
    var hasBankAccounts: Bool {
        !bankAccounts.isEmpty
    }
    
    // MARK: - Error Handling
    private func handleError(_ error: Error) {
        DispatchQueue.main.async {
            self.errorMessage = error.localizedDescription
            self.showingError = true
        }
    }
    
    func clearError() {
        errorMessage = nil
        showingError = false
    }
} 