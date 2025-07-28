import Foundation

// MARK: - Portfolio Models
struct PortfolioSummary: Codable {
    let totalValue: Double
    let totalInvested: Double
    let totalGains: Double
    let totalGainsPercent: Double
}

struct Investment: Codable, Identifiable {
    let id: String
    let amount: Double
    let purchaseDate: Date
    let createdAt: Date
    let symbol: String?
    let name: String?
    
    private enum CodingKeys: String, CodingKey {
        case id, amount, purchaseDate, createdAt, symbol, name
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        amount = try container.decode(Double.self, forKey: .amount)
        symbol = try container.decodeIfPresent(String.self, forKey: .symbol)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        
        let dateFormatter = ISO8601DateFormatter()
        if let purchaseDateString = try container.decodeIfPresent(String.self, forKey: .purchaseDate) {
            purchaseDate = dateFormatter.date(from: purchaseDateString) ?? Date()
        } else {
            purchaseDate = Date()
        }
        
        if let createdAtString = try container.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = dateFormatter.date(from: createdAtString) ?? Date()
        } else {
            createdAt = Date()
        }
    }
}

// MARK: - Market Data Models
struct MarketData: Codable {
    let symbol: String
    let price: Double
    let change: Double
    let changePercent: Double
    let volume: Double?
    let lastUpdated: Date?
    
    private enum CodingKeys: String, CodingKey {
        case symbol, price, change, changePercent, volume, lastUpdated
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        symbol = try container.decode(String.self, forKey: .symbol)
        price = try container.decode(Double.self, forKey: .price)
        change = try container.decode(Double.self, forKey: .change)
        changePercent = try container.decode(Double.self, forKey: .changePercent)
        volume = try container.decodeIfPresent(Double.self, forKey: .volume)
        
        if let lastUpdatedString = try container.decodeIfPresent(String.self, forKey: .lastUpdated) {
            let dateFormatter = ISO8601DateFormatter()
            lastUpdated = dateFormatter.date(from: lastUpdatedString)
        } else {
            lastUpdated = nil
        }
    }
}

// MARK: - Banking Models
struct BankAccount: Codable, Identifiable {
    let id: String
    let name: String
    let type: String
    let balance: Double
    let currency: String
    let maskedPan: String?
    let cashbackType: String?
}

struct BankTransaction: Codable, Identifiable {
    let id: String
    let time: TimeInterval
    let description: String
    let mcc: Int
    let originalMcc: Int
    let amount: Double
    let operationAmount: Double
    let currency: String
    let commissionRate: Double
    let cashbackAmount: Double
    let balance: Double
    let comment: String?
    let receipt: String?
    let invoiceId: String?
    let counterEdrpou: String?
    let counterIban: String?
    
    var date: Date {
        Date(timeIntervalSince1970: time)
    }
    
    var isIncome: Bool {
        amount > 0
    }
}

// MARK: - Crypto Models
struct CryptoCoin: Codable, Identifiable {
    let id: String
    let symbol: String
    let name: String
    let price: Double
    let change24h: Double
    let changePercent24h: Double
    let volume24h: Double
    let marketCap: Double
    
    var isPositiveChange: Bool {
        changePercent24h >= 0
    }
}

// MARK: - API Response Models
struct APIResponse<T: Codable>: Codable {
    let data: T?
    let error: String?
    let success: Bool
}

struct BankingResponse: Codable {
    let accounts: [BankAccount]?
    let transactions: [BankTransaction]?
    let valid: Bool?
    let strength: String?
    let error: String?
}

// MARK: - Helper Extensions
extension Double {
    var formattedCurrency: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: self)) ?? "$0.00"
    }
    
    var formattedPercent: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: self / 100)) ?? "0.00%"
    }
    
    var formattedCurrencyUAH: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "UAH"
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 0
        // Convert from cents to UAH
        return formatter.string(from: NSNumber(value: self / 100)) ?? "₴0"
    }
}

extension Date {
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: self)
    }
    
    var formattedDateTime: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
} 