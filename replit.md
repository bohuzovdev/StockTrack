# Investment Portfolio Tracker

## Overview

This is a full-stack investment portfolio tracking application built with React, Express, and PostgreSQL. The application allows users to track their USD-based S&P 500 investments, view portfolio performance, analyze historical data with real-time market integration, and forecast future portfolio growth based on 50 years of historical S&P 500 performance.

## Recent Changes (July 25, 2025)

- ✓ Fixed portfolio chart to display actual investment dates instead of hardcoded months
- ✓ Added comprehensive forecasting feature based on 50 years of S&P 500 historical data
- ✓ Implemented multiple scenario projections (conservative 7.5%, expected 10.5%, optimistic 13.5%)
- ✓ Created dedicated forecast page with educational information and interactive controls
- ✓ Fixed investment form validation and simplified to USD-only investments
- ✓ Added monthly contribution calculator to forecast future portfolio growth

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **API Style**: RESTful API endpoints
- **Development**: Hot reloading with custom Vite integration
- **Error Handling**: Centralized error middleware

### Database Architecture
- **Database**: PostgreSQL (configured for use with Neon Database)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Schema**: Type-safe database schema with Zod validation
- **Connection**: Uses @neondatabase/serverless for PostgreSQL connectivity

## Key Components

### Data Layer
- **Investments Table**: Stores investment records (symbol, shares, purchase price, purchase date)
- **Market Data Table**: Stores current market prices and changes
- **Schema Validation**: Drizzle-zod integration for type-safe data validation
- **Storage Interface**: Abstracted storage layer with in-memory fallback implementation

### API Endpoints
- **Investment CRUD**: Full CRUD operations for investment management
- **Portfolio Summary**: Aggregated portfolio performance metrics
- **Market Data**: Integration with Alpha Vantage API for real-time market data
- **Data Refresh**: Endpoint to manually refresh market data

### Frontend Pages
- **Dashboard**: Main portfolio overview with summary cards, charts, and forecasting preview
- **Add Investment**: Form for adding new investments to portfolio
- **Historical Data**: Portfolio performance charts and investment timeline
- **Forecast**: Advanced portfolio projection based on 50 years of S&P 500 historical performance
- **404 Page**: Error handling for unknown routes

### UI Components
- **Investment Table**: Sortable/filterable table with search functionality
- **Portfolio Chart**: Interactive charts using Recharts library showing real investment dates
- **Portfolio Forecast**: Advanced forecasting component with multiple scenarios and historical data
- **Add Investment Modal**: Modal form for quick investment entry
- **Sidebar Navigation**: Fixed navigation with active state indicators

## Data Flow

1. **Investment Entry**: Users add investments through forms validated with Zod schemas
2. **Market Data Integration**: External API calls to Alpha Vantage for current market prices
3. **Portfolio Calculations**: Server-side computation of gains/losses and portfolio metrics
4. **Real-time Updates**: TanStack Query handles caching and background refresh of data
5. **Chart Visualization**: Historical data transformed for chart display using Recharts
6. **Forecasting Engine**: Client-side projection calculations using 50 years of S&P 500 historical returns (10.5% annual)

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL with Neon Database hosting
- **UI Library**: Radix UI primitives with shadcn/ui styling
- **Validation**: Zod for runtime type checking and form validation
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React icon library

### Market Data Integration
- **Alpha Vantage API**: Real-time stock market data (configurable API key)
- **Demo Mode**: Fallback to demo data when API key not configured

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESLint/Prettier**: Code formatting and linting (implied by modern setup)
- **Replit Integration**: Special handling for Replit development environment

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations in `migrations/` directory

### Environment Configuration
- **Development**: Vite dev server with Express backend integration
- **Production**: Static file serving with Express production build
- **Database**: Environment variable `DATABASE_URL` for PostgreSQL connection
- **API Keys**: `ALPHA_VANTAGE_API_KEY` for market data (optional, falls back to demo)

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express backend application
├── shared/          # Shared types and schemas
├── migrations/      # Database migration files
└── dist/           # Production build output
```

### Key Design Decisions

1. **Monorepo Structure**: Frontend and backend in same repository for easier development
2. **Shared Schema**: Common TypeScript types between frontend and backend
3. **Storage Abstraction**: Interface-based storage layer allows for easy database switching
4. **Component Library**: shadcn/ui provides consistent, accessible UI components
5. **Type Safety**: End-to-end TypeScript with runtime validation using Zod
6. **Modern Development**: ES modules throughout with latest tooling (Vite, Drizzle)
7. **Historical Data Accuracy**: Uses real S&P 500 50-year performance data (10.5% annual return) for forecasting
8. **USD-Only Investments**: Simplified to track dollar amounts rather than individual stock shares