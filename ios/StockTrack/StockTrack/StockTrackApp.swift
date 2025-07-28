import SwiftUI

@main
struct StockTrackApp: App {
    @StateObject private var portfolioViewModel = PortfolioViewModel()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(portfolioViewModel)
        }
    }
} 