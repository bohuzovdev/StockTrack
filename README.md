# 📈 StockTrack

A comprehensive financial portfolio management application with advanced security features and banking integration.

![StockTrack](https://img.shields.io/badge/StockTrack-v1.0-brightgreen)
![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-red)
![Banking](https://img.shields.io/badge/Banking-Monobank%20Integrated-blue)

## ✨ Features

### 🛡️ **Enterprise-Grade Security**
- **AES-256-GCM Encryption** - Client-side token encryption using Web Crypto API
- **Device-Specific Binding** - Tokens work only on your device
- **Rate Limiting** - API abuse prevention
- **Secure Logging** - Tokens always hashed, never exposed
- **Token Strength Assessment** - Automatic security validation
- **Environment Encryption** - Production-ready encrypted environment variables

### 💰 **Portfolio Management**
- **Investment Tracking** - Add and manage your investment portfolio
- **Real-Time Market Data** - Live stock prices via Alpha Vantage API
- **Portfolio Performance** - Track portfolio value vs invested amount
- **Purchase Date Tracking** - Historical investment entry management
- **S&P 500 Integration** - Market benchmark comparison

### 🏦 **Banking Integration**
- **Monobank Support** - Connect your Ukrainian Monobank account
- **Beautiful Account Cards** - Visual account representation with masked PAN
- **Transaction History** - Last 30 days with detailed categorization
- **Balance Visibility Toggle** - Privacy protection
- **Cashback Tracking** - Automatic cashback calculation display
- **Secure Token Storage** - Encrypted local storage

### 🎨 **Modern UI/UX**
- **Dark/Light Theme** - Automatic system detection with manual toggle
- **Responsive Design** - Mobile-first approach
- **Beautiful Charts** - Portfolio performance visualization using Recharts
- **Real-Time Updates** - WebSocket integration for live data
- **Loading States** - Smooth user experience with loading indicators

### 🔄 **Real-Time Features**
- **WebSocket Integration** - Separate port (3001) for real-time updates
- **Live Market Data** - Automatic periodic updates with rate limiting  
- **Portfolio Sync** - Real-time portfolio value calculations
- **Connection Status** - Visual WebSocket connection indicators

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- (Optional) Alpha Vantage API key for real market data
- (Optional) Monobank API token for banking features

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/StockTrack.git
cd StockTrack
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup** (Optional)
```bash
# Copy example environment file
cp .env.example .env

# Add your API keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
ENCRYPTION_MASTER_KEY=your_64_character_hex_key_here
```

4. **Generate Master Key** (For production)
```bash
openssl rand -hex 32
```

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**
```
http://localhost:3000
```

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: In-memory storage (Drizzle ORM schemas ready for PostgreSQL)
- **Security**: Web Crypto API, Node.js crypto module
- **Real-time**: WebSocket (ws library)
- **Charts**: Recharts
- **Forms**: React Hook Form
- **State Management**: React Query (TanStack Query)

### **Project Structure**
```
StockTrack/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── lib/           # Utilities and crypto functions
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Node.js application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API endpoints
│   ├── websocket.ts      # WebSocket server
│   ├── banking.ts        # Banking integration
│   └── crypto.ts         # Server-side encryption
├── shared/               # Shared schemas and types
└── scripts/             # Utility scripts and tests
```

## 🔐 Security Features

### **Client-Side Security**
- **AES-256-GCM** encryption with 100,000 PBKDF2 iterations
- **Device fingerprinting** for encryption key derivation
- **Secure localStorage** replacement with automatic cleanup
- **Fallback encryption** for older browsers

### **Server-Side Security**  
- **Token validation** with strength assessment (weak/medium/strong)
- **Rate limiting**: 10 auth attempts per 5 minutes
- **Secure logging** with SHA-256 token hashing
- **Environment variable encryption** for production deployment

### **Banking Security**
- **Encrypted token storage** - Never stored in plain text
- **Connection validation** - Real-time token strength feedback
- **Automatic disconnect** - Complete token removal capability
- **Audit logging** - All banking operations logged securely

## 🏦 Banking Integration

### **Supported Banks**
- ✅ **Monobank** (Ukraine) - Full integration
- 🔜 **Open Banking** (August 2025+) - Future integration

### **Features**
- **Account Management** - Multiple account support
- **Transaction History** - 30-day transaction retrieval
- **Balance Display** - Real-time balance with privacy toggle
- **Cashback Tracking** - Automatic cashback calculation
- **Security Assessment** - Token strength validation

### **Getting Your Monobank Token**
1. Open Monobank mobile app
2. Go to Settings → API
3. Generate new personal token
4. Copy token to StockTrack

## 📊 Portfolio Features

### **Investment Tracking**
- Add investments with purchase date and amount
- Historical entry tracking (entry date vs purchase date)
- Real-time portfolio value calculation
- Performance vs invested amount comparison

### **Market Data**
- Real-time stock prices via Alpha Vantage API
- S&P 500 index tracking
- Automatic data caching and fallback
- Rate limit protection

### **Charts & Visualization**
- Portfolio performance over time
- Investment allocation breakdown
- Forecast projections with custom parameters
- Responsive chart design for all devices

## 🛠️ Development

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript type checking
```

### **Testing Security**
```bash
# Test server-side encryption
node scripts/test-encryption.js

# Test client-side crypto (open in browser)
open scripts/test-client-crypto.html
```

### **Environment Encryption**
```bash
# Encrypt environment variables for production
node scripts/encrypt-env.js ALPHA_VANTAGE_API_KEY your_api_key
```

## 🔧 Configuration

### **Environment Variables**
```bash
# Optional - for real market data
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Optional - for production encryption
ENCRYPTION_MASTER_KEY=your_64_character_hex_key

# Optional - custom server port  
PORT=3000
```

### **WebSocket Configuration**
- **Main Server**: Port 3000 (configurable via PORT env var)
- **WebSocket Server**: Port 3001 (separate for stability)
- **Rate Limiting**: 1 request per minute for market data
- **Auto-reconnection**: Exponential backoff client-side

## 📱 Mobile Support

StockTrack is fully responsive and works beautifully on:
- 📱 **Mobile phones** (iOS/Android)
- 📟 **Tablets** (iPad/Android tablets)  
- 💻 **Desktop** (Windows/Mac/Linux)
- 🌐 **All modern browsers** (Chrome, Firefox, Safari, Edge)

## 🌟 Future Enhancements

### **Planned Features**
- [ ] **Open Banking Integration** (August 2025+)
- [ ] **Multiple Currency Support**
- [ ] **Advanced Portfolio Analytics** 
- [ ] **Export/Import Functionality**
- [ ] **Mobile PWA Support**
- [ ] **Multi-user Authentication**
- [ ] **Cloud Data Synchronization**

### **Banking Expansion**
- [ ] **PrivatBank** (Ukraine)
- [ ] **PUMB** (Ukraine)  
- [ ] **European Open Banking** APIs
- [ ] **Transaction Categorization** with AI
- [ ] **Expense Analytics** and budgeting

## 📄 Documentation

- 📖 **[Security Documentation](SECURITY.md)** - Comprehensive security guide
- 🏦 **[Banking Integration](BANKING_INTEGRATION.md)** - Banking setup guide
- 🔐 **[Encryption Guide](scripts/test-client-crypto.html)** - Interactive crypto testing

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Alpha Vantage** - Stock market data API
- **Monobank** - Ukrainian banking API
- **Shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - React charting library

## 📞 Support

If you have questions or need help:

1. **Check the documentation** in the `/docs` folder
2. **Review security features** in `SECURITY.md`
3. **Test encryption** with provided test scripts
4. **Open an issue** for bugs or feature requests

---

**⚡ Built with modern technologies for a secure financial future! ⚡**

---

*Last updated: December 2024* 