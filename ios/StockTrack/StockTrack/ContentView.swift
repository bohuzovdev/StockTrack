import SwiftUI

struct ContentView: View {
    @EnvironmentObject var portfolioViewModel: PortfolioViewModel
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Image(systemName: "chart.bar.fill")
                    Text("Dashboard")
                }
                .tag(0)
            
            BankingView()
                .tabItem {
                    Image(systemName: "creditcard.fill")
                    Text("Banking")
                }
                .tag(1)
            
            CryptoView()
                .tabItem {
                    Image(systemName: "bitcoinsign.circle.fill")
                    Text("Crypto")
                }
                .tag(2)
            
            HistoricalDataView()
                .tabItem {
                    Image(systemName: "clock.fill")
                    Text("History")
                }
                .tag(3)
            
            ForecastView()
                .tabItem {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                    Text("Forecast")
                }
                .tag(4)
        }
        .onAppear {
            portfolioViewModel.loadPortfolioData()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(PortfolioViewModel())
} 