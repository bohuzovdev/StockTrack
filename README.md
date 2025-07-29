# 📈 PFT

> **Personal Finance Tracker - Portfolio Management & Banking Integration Platform**

![PFT](https://img.shields.io/badge/PFT-v1.0-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Railway](https://img.shields.io/badge/Deployed-Railway-blueviolet)

A comprehensive personal finance tracking application with **real-time portfolio management**, **Ukrainian banking integration**, and **Google OAuth authentication**. Track your investments, connect your Monobank account, and manage your financial data securely.

## 🚀 **Live Demo**

**🌐 Production App:** [https://stocktrack-production.up.railway.app](https://stocktrack-production.up.railway.app)

## ✨ Key Features

### 🎯 Core Features
- **Real-time Portfolio Tracking** - S&P 500 investments with live market data
- **Monobank Integration** - Secure Ukrainian banking data sync
- **Multi-user Support** - Google OAuth with user-isolated data
- **Investment Management** - Track stocks, crypto, and portfolio performance
- **Dark/Light Theme** - System-aware theming
- **Responsive Design** - Works on desktop, tablet, and mobile

### 🔐 Security Features
- **End-to-End Encryption** - Client and server-side data protection
- **Secure Token Storage** - Device fingerprinting and AES-256 encryption
- **User Data Isolation** - Each user's data is completely separate
- **Rate Limiting** - API protection and WebSocket throttling

### 🏦 Banking Integration
- **Monobank API Support** - Real account balances and transactions
- **Future-Ready** - Prepared for Open Banking (PSD2) in Ukraine 2025
- **Transaction History** - View and categorize your spending
- **Balance Monitoring** - Real-time account balance updates

### 🚀 Future Features
- **Binance Integration** - Cryptocurrency portfolio tracking
- **Expense Categorization** - AI-powered spending insights
- **Budget Planning** - Financial goal setting and tracking
- **Investment Recommendations** - Personalized portfolio suggestions

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS + Radix UI
- React Query (TanStack Query)
- Wouter (React Router)
- Recharts (Data Visualization)

**Backend:**
- Node.js + Express + TypeScript
- Drizzle ORM + PostgreSQL
- WebSocket (Real-time updates)
- Passport.js (Google OAuth)
- Advanced Encryption (AES-256)

**APIs & Integrations:**
- Alpha Vantage (Stock Market Data)
- Monobank API (Ukrainian Banking)
- Google OAuth 2.0
- WebSocket for real-time updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google OAuth credentials
- Alpha Vantage API key
- Monobank API token (optional)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/PFT.git
cd PFT
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google OAuth (Required)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SESSION_SECRET=your_session_secret_here

# Alpha Vantage API (Required)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# Encryption (Required)
ENCRYPTION_MASTER_KEY=your_32_character_encryption_key_here

# Database (Optional - uses in-memory by default)
DATABASE_URL=postgresql://user:password@localhost:5432/pft
```

### Development Server

```bash
# Start both frontend and backend
npm run dev

# Frontend will be available at: http://localhost:3000
# WebSocket server runs on: ws://localhost:3001
```

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
PFT/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── contexts/       # React contexts (Auth, Theme)
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
│   └── index.html
├── server/                  # Node.js backend
│   ├── routes.ts           # API endpoints
│   ├── auth.ts             # Google OAuth setup
│   ├── banking.ts          # Banking API integration
│   ├── storage.ts          # Data storage layer
│   ├── websocket.ts        # Real-time WebSocket server
│   └── crypto.ts           # Server-side encryption
├── shared/                  # Shared TypeScript types
│   └── schema.ts           # Zod schemas and types
├── ios/                    # iOS React Native app
└── README.md
```

## 🏦 Banking Integration Setup

### Monobank Setup (Ukraine)

1. **Get Your Personal Token:**
   - Visit: https://api.monobank.ua/
   - Request personal token via Telegram bot
   - Wait for approval (usually 1-2 hours)

2. **Test Your Token:**
   ```bash
   curl -X GET "https://api.monobank.ua/personal/client-info" \
        -H "X-Token: YOUR_TOKEN_HERE"
   ```

3. **Add to PFT:**
   - Login to your PFT account
   - Go to Banking section
   - Enter your Monobank token
   - Your accounts and transactions will sync automatically

4. **Copy token to PFT**
   - Open PFT application
   - Navigate to Banking section
   - Enter your Monobank token
   - Your accounts will sync automatically

### Future Banking Support

**Open Banking (PSD2) - Coming August 2025:**
- Universal bank support across Ukraine
- Standardized API access
- Enhanced security with OAuth 2.0
- Real-time transaction notifications

**Current Limitations:**
- Only Monobank supported
- Personal tokens only (no business accounts)
- Rate limited to 60 requests/hour
- Ukraine-based accounts only

## 🔐 Security & Privacy

### Client-Side Security
- **Device Fingerprinting** - Unique encryption keys per device
- **Web Crypto API** - Browser-native encryption
- **Secure Storage** - Encrypted localStorage wrapper
- **Token Validation** - Client-side token strength assessment

### Server-Side Security  
- **AES-256 Encryption** - Military-grade data protection
- **PBKDF2 Key Derivation** - 100,000 iterations
- **Rate Limiting** - API and WebSocket protection
- **Secure Headers** - CORS, CSP, and security headers
- **Input Validation** - Zod schema validation

### Data Isolation
- **User-Specific Queries** - Complete data separation
- **Cache Isolation** - User-specific query keys
- **Session Management** - Secure session handling
- **Token Encryption** - Per-user encrypted storage

## 📱 Mobile Support

PFT is fully responsive and works beautifully on:
- **Desktop** (Chrome, Firefox, Safari, Edge)
- **Tablet** (iPad, Android tablets)
- **Mobile** (iPhone, Android phones)
- **iOS App** (Native React Native application available)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Reporting Issues
- Use GitHub Issues for bug reports
- Include environment details
- Provide reproduction steps
- Add screenshots if helpful

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Alpha Vantage** - Real-time stock market data
- **Monobank** - Ukrainian banking API
- **Google** - OAuth authentication
- **Radix UI** - Accessible component library
- **Tailwind CSS** - Utility-first CSS framework

## ✨ Roadmap

### Q1 2024
- ✅ Core portfolio tracking
- ✅ Monobank integration
- ✅ Google OAuth authentication
- ✅ Real-time WebSocket updates

### Q2 2024
- 🔄 Binance cryptocurrency integration
- 🔄 Advanced portfolio analytics
- 🔄 Mobile application improvements
- 🔄 Transaction categorization

### Q3 2024
- 📋 Open Banking preparation
- 📋 Advanced security features
- 📋 Multi-currency support
- 📋 Investment recommendations

### Q4 2024
- 📋 AI-powered insights
- 📋 Tax reporting features
- 📋 Premium subscription model
- 📋 API for third-party integrations

---

<div align="center">

**PFT - Personal Finance Tracker**  
*Empowering your financial journey with secure, real-time portfolio management*

[📈 Live Demo](https://stocktrack-production.up.railway.app) • [📚 Documentation](https://github.com/bohuzovdev/StockTrack) • [🚀 Deploy on Railway](https://railway.app)

</div> 