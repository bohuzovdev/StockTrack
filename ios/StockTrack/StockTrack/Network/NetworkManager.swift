import Foundation
import Combine

class NetworkManager: ObservableObject {
    static let shared = NetworkManager()
    
    // Change this to your backend URL
    private let baseURL = "http://localhost:3000/api"
    
    private let session = URLSession.shared
    private var cancellables = Set<AnyCancellable>()
    
    private init() {}
    
    // MARK: - Generic API Call Method
    private func makeRequest<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Data? = nil,
        responseType: T.Type
    ) -> AnyPublisher<T, Error> {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            return Fail(error: NetworkError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let body = body {
            request.httpBody = body
        }
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: responseType, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    // MARK: - Portfolio API Calls
    func fetchPortfolioSummary() -> AnyPublisher<PortfolioSummary, Error> {
        return makeRequest(endpoint: "/portfolio/summary", responseType: PortfolioSummary.self)
    }
    
    func fetchInvestments() -> AnyPublisher<[Investment], Error> {
        return makeRequest(endpoint: "/investments", responseType: [Investment].self)
    }
    
    func addInvestment(amount: Double, purchaseDate: Date) -> AnyPublisher<Investment, Error> {
        let investmentData = [
            "amount": amount,
            "purchaseDate": ISO8601DateFormatter().string(from: purchaseDate)
        ]
        
        guard let body = try? JSONSerialization.data(withJSONObject: investmentData) else {
            return Fail(error: NetworkError.encodingFailed)
                .eraseToAnyPublisher()
        }
        
        return makeRequest(
            endpoint: "/investments",
            method: .POST,
            body: body,
            responseType: Investment.self
        )
    }
    
    // MARK: - Market Data API Calls
    func fetchMarketData() -> AnyPublisher<MarketData, Error> {
        return makeRequest(endpoint: "/market/sp500", responseType: MarketData.self)
    }
    
    func refreshMarketData() -> AnyPublisher<[String: String], Error> {
        return makeRequest(
            endpoint: "/market/refresh",
            method: .POST,
            responseType: [String: String].self
        )
    }
    
    // MARK: - Banking API Calls
    func testBankingConnection(provider: String, token: String) -> AnyPublisher<BankingResponse, Error> {
        let requestData = [
            "provider": provider,
            "token": token
        ]
        
        guard let body = try? JSONSerialization.data(withJSONObject: requestData) else {
            return Fail(error: NetworkError.encodingFailed)
                .eraseToAnyPublisher()
        }
        
        return makeRequest(
            endpoint: "/banking/test",
            method: .POST,
            body: body,
            responseType: BankingResponse.self
        )
    }
    
    func fetchBankAccounts(provider: String, token: String) -> AnyPublisher<BankingResponse, Error> {
        let requestData = [
            "provider": provider,
            "token": token
        ]
        
        guard let body = try? JSONSerialization.data(withJSONObject: requestData) else {
            return Fail(error: NetworkError.encodingFailed)
                .eraseToAnyPublisher()
        }
        
        return makeRequest(
            endpoint: "/banking/accounts",
            method: .POST,
            body: body,
            responseType: BankingResponse.self
        )
    }
    
    func fetchBankTransactions(
        provider: String,
        token: String,
        accountId: String,
        from: Date? = nil,
        to: Date? = nil
    ) -> AnyPublisher<BankingResponse, Error> {
        var requestData: [String: Any] = [
            "provider": provider,
            "token": token,
            "accountId": accountId
        ]
        
        if let from = from {
            requestData["from"] = ISO8601DateFormatter().string(from: from)
        }
        
        if let to = to {
            requestData["to"] = ISO8601DateFormatter().string(from: to)
        }
        
        guard let body = try? JSONSerialization.data(withJSONObject: requestData) else {
            return Fail(error: NetworkError.encodingFailed)
                .eraseToAnyPublisher()
        }
        
        return makeRequest(
            endpoint: "/banking/transactions",
            method: .POST,
            body: body,
            responseType: BankingResponse.self
        )
    }
    
    // MARK: - Crypto API Calls (Future Implementation)
    func fetchCryptoData() -> AnyPublisher<[CryptoCoin], Error> {
        // This would connect to your crypto API when implemented
        // For now, return mock data
        let mockData = [
            CryptoCoin(
                id: "bitcoin",
                symbol: "BTC",
                name: "Bitcoin",
                price: 67432.50,
                change24h: 1234.20,
                changePercent24h: 1.87,
                volume24h: 28500000000,
                marketCap: 1320000000000
            ),
            CryptoCoin(
                id: "ethereum",
                symbol: "ETH",
                name: "Ethereum",
                price: 3456.78,
                change24h: -89.45,
                changePercent24h: -2.52,
                volume24h: 15200000000,
                marketCap: 415000000000
            )
        ]
        
        return Just(mockData)
            .setFailureType(to: Error.self)
            .eraseToAnyPublisher()
    }
}

// MARK: - Supporting Types
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
}

enum NetworkError: Error, LocalizedError {
    case invalidURL
    case encodingFailed
    case decodingFailed
    case noData
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .encodingFailed:
            return "Failed to encode request"
        case .decodingFailed:
            return "Failed to decode response"
        case .noData:
            return "No data received"
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}

// MARK: - Secure Storage for API Tokens
class SecureStorage {
    private static let tokenKey = "monobank_token"
    
    static func saveToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: tokenKey)
    }
    
    static func getToken() -> String? {
        return UserDefaults.standard.string(forKey: tokenKey)
    }
    
    static func removeToken() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
    }
} 