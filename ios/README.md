# StockTrack iOS Application

A native iOS application for portfolio management, banking integration, and cryptocurrency tracking that connects to your StockTrack Node.js backend.

## 📱 Features

### 🏠 Dashboard
- **Portfolio Overview**: Real-time portfolio value, gains, and performance metrics
- **S&P 500 Tracking**: Live market data with price changes
- **Monobank Integration**: Display bank account balances directly on dashboard
- **Quick Actions**: Add investments, refresh data with native iOS interactions
- **Recent Investments**: View latest investment entries with purchase dates

### 🏦 Banking (Monobank Integration)
- **Secure Connection**: Connect Monobank accounts using encrypted API tokens
- **Multi-Account Support**: View multiple bank accounts with different currencies
- **Real-time Balances**: Live account balance updates with UAH conversion
- **Transaction History**: Last 30 days of transactions with details
- **Privacy Controls**: Toggle balance visibility, secure token storage

### 🪙 Crypto Trading (Placeholder)
- **Coming Soon Banner**: Clear indication of future Binance integration
- **Mock Data Display**: Placeholder crypto portfolio with BTC, ETH, BNB
- **Portfolio Allocation**: Visual breakdown of crypto holdings
- **Market Overview**: Simulated crypto market data and trends
- **Connection UI**: Ready interface for future Binance API integration

### 📊 Historical Data & Forecasting
- **Investment History**: Complete list of all investments with dates
- **Portfolio Forecasting**: S&P 500 growth projections based on historical data
- **Customizable Parameters**: Adjust forecast periods and monthly contributions
- **Visual Results**: Clear display of projected portfolio growth

## 🛠 Technical Stack

- **SwiftUI**: Modern declarative UI framework
- **Combine**: Reactive programming for data flow
- **MVVM Architecture**: Clean separation of concerns
- **URLSession**: Native networking for API calls
- **UserDefaults**: Secure local storage for API tokens
- **iOS 17.0+**: Latest iOS features and optimizations

## 🚀 Getting Started

### Prerequisites
- Xcode 15.0 or later
- iOS 17.0+ device or simulator
- StockTrack Node.js backend running (see main project README)
- macOS with Apple Developer account (for device testing)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/bohuzovdev/StockTrack.git
   cd StockTrack/ios
   ```

2. **Open in Xcode**
   ```bash
   open StockTrack.xcodeproj
   ```

3. **Configure Backend URL**
   
   Update the base URL in `NetworkManager.swift`:
   ```swift
   private let baseURL = "http://YOUR_BACKEND_URL:3000/api"
   ```
   
   For local development:
   ```swift
   private let baseURL = "http://localhost:3000/api"  // Simulator
   private let baseURL = "http://YOUR_LOCAL_IP:3000/api"  // Physical device
   ```

4. **Build and Run**
   - Select your target device/simulator
   - Press `Cmd + R` or click the Run button
   - The app will build and launch automatically

### Backend Connection

Ensure your Node.js backend is running:
```bash
# From the main project directory
npm run dev
```

The backend should be accessible at:
- `http://localhost:3000` (local development)
- Your server's IP address if running remotely

## 📁 Project Structure

```
ios/StockTrack/
├── StockTrack/
│   ├── StockTrackApp.swift          # App entry point
│   ├── ContentView.swift            # Main tab navigation
│   ├── Models/
│   │   └── Models.swift             # Data models matching backend API
│   ├── Network/
│   │   └── NetworkManager.swift     # API client with Combine publishers
│   ├── ViewModels/
│   │   └── PortfolioViewModel.swift # Main app state management
│   └── Views/
│       ├── DashboardView.swift      # Portfolio dashboard
│       ├── BankingView.swift        # Monobank integration
│       └── CryptoView.swift         # Crypto trading (placeholder)
└── StockTrack.xcodeproj/            # Xcode project configuration
```

## 🔧 Configuration

### Network Configuration

Update `NetworkManager.swift` for your environment:

```swift
// For local development with simulator
private let baseURL = "http://localhost:3000/api"

// For local development with physical device  
private let baseURL = "http://192.168.1.100:3000/api"  // Your Mac's IP

// For production
private let baseURL = "https://your-domain.com/api"
```

### Monobank Integration

The iOS app uses the same Monobank API integration as the web version:

1. **Get Monobank Token**: Follow the in-app instructions
2. **Connect Account**: Enter token in the Banking tab
3. **View Data**: Account balances and transactions sync automatically

### Security Features

- **Token Encryption**: API tokens stored securely in UserDefaults
- **Rate Limiting**: Automatic API rate limiting to prevent abuse  
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Privacy**: Balance visibility toggles, secure token management

## 🎨 UI/UX Features

### Native iOS Design
- **SwiftUI Components**: Modern, native iOS interface elements
- **Dark Mode Support**: Automatic light/dark theme switching
- **Accessibility**: VoiceOver support and dynamic type scaling
- **Haptic Feedback**: Native iOS haptic responses

### Responsive Layout
- **iPhone Support**: Optimized for all iPhone screen sizes
- **iPad Support**: Enhanced layout for larger screens
- **Landscape Mode**: Proper rotation handling
- **Safe Areas**: Respect for notches and home indicators

### Interactive Elements
- **Pull-to-Refresh**: Native refresh gestures on all screens
- **Swipe Actions**: Context menus and swipe gestures
- **Loading States**: Smooth loading animations and progress indicators
- **Error Handling**: Clear error messages and retry options

## 🔄 Data Flow

### MVVM Architecture
```
View Layer (SwiftUI Views)
    ↓
ViewModel Layer (PortfolioViewModel)
    ↓
Network Layer (NetworkManager)
    ↓
Backend API (Node.js)
```

### State Management
- **@Published Properties**: Reactive UI updates
- **Combine Publishers**: Async data loading
- **Error Handling**: Centralized error management
- **Loading States**: Comprehensive loading indicators

## 🚀 Development Workflow

### Running Locally
1. Start the Node.js backend: `npm run dev`
2. Open Xcode project: `open StockTrack.xcodeproj`  
3. Update NetworkManager base URL to your local IP
4. Build and run on simulator or device

### Testing on Device
1. Connect iPhone/iPad via USB
2. Select device in Xcode
3. Ensure Mac and device are on same network
4. Update base URL to Mac's local IP address
5. Build and install app

### Debugging
- **Xcode Console**: View network requests and errors
- **Network Tab**: Monitor API calls and responses
- **Breakpoints**: Debug SwiftUI view updates and data flow
- **Instruments**: Profile performance and memory usage

## 🔮 Future Enhancements

### Binance Integration
- Real-time crypto portfolio tracking
- Live trading functionality  
- Advanced charting and technical analysis
- Push notifications for price alerts

### Additional Features
- **Push Notifications**: Real-time portfolio updates
- **Widget Support**: Home screen portfolio widgets
- **Apple Watch App**: Quick portfolio overview on wrist
- **Siri Shortcuts**: Voice commands for common actions
- **Face ID/Touch ID**: Biometric authentication for sensitive actions

### Performance Optimizations
- **Core Data**: Local data persistence and caching
- **Background Refresh**: Automatic data updates in background
- **Image Caching**: Efficient crypto coin icon loading
- **Memory Management**: Optimized for lower-end devices

## 🐛 Troubleshooting

### Common Issues

**Cannot Connect to Backend**
- Verify backend is running: `npm run dev`
- Check network URL in NetworkManager.swift
- Ensure firewall allows connections on port 3000

**Monobank Connection Failed**
- Verify API token is correct
- Check rate limiting (Monobank has strict limits)
- Ensure backend Monobank integration is working

**App Crashes on Launch**
- Check Xcode console for error messages
- Verify all required model properties are present
- Ensure iOS deployment target matches device

**Data Not Loading**
- Check network connectivity
- Verify API endpoints match backend routes
- Look for JSON parsing errors in console

### Debug Tips
1. **Enable Network Logging**: Add network request logging in NetworkManager
2. **Check API Responses**: Use Xcode's network debugging tools
3. **Verify Model Decoding**: Ensure API response format matches Swift models
4. **Test Backend Separately**: Use curl or Postman to test API endpoints

## 📄 License

This project is licensed under the MIT License - see the main project LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the main project documentation
- Review the backend API documentation

---

**Note**: This iOS app is designed to work seamlessly with the StockTrack Node.js backend. Make sure both are running for full functionality. 