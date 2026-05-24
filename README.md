# 🏦 Banking Platform Backend

A production-grade, enterprise-ready banking system backend built with modern Node.js, TypeScript, Express.js, and PostgreSQL.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### Core Banking Features
- ✅ User authentication with JWT and refresh tokens
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission-Based Access Control (PBAC)
- ✅ Multi-role user support
- ✅ Customer management with KYC profiles
- ✅ Bank account management (Savings, Current, Fixed Deposits, Virtual)
- ✅ Transaction processing and tracking
- ✅ Internal and external transfers
- ✅ Beneficiary management
- ✅ Card management (Debit, Credit, Virtual)
- ✅ Loan management with payment tracking
- ✅ Branch and currency management
- ✅ Comprehensive audit logging
- ✅ Security event tracking

### Security Features
- ✅ Argon2 password hashing
- ✅ JWT token-based authentication
- ✅ Token rotation and refresh
- ✅ Account locking after failed login attempts
- ✅ Two-Factor Authentication (2FA) support
- ✅ OTP (One-Time Password) implementation
- ✅ Device management and trust status
- ✅ Session management
- ✅ IP and device fingerprinting
- ✅ CORS protection
- ✅ CSRF prevention
- ✅ Helmet.js security headers
- ✅ Rate limiting
- ✅ Request validation with Zod

### Operational Features
- ✅ Structured logging with Pino
- ✅ Health check endpoints
- ✅ Graceful shutdown handling
- ✅ Database migrations with Prisma
- ✅ Seed data generation
- ✅ Feature flags
- ✅ System settings management
- ✅ Request ID tracking
- ✅ Error handling and reporting

## 🛠️ Tech Stack

### Core
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5+
- **Framework**: Express.js 4+
- **ORM**: Prisma 5+
- **Database**: PostgreSQL 13+

### Authentication & Security
- **JWT**: jsonwebtoken
- **Password Hashing**: argon2
- **Validation**: Zod
- **Security Headers**: helmet
- **CORS**: cors
- **Rate Limiting**: express-rate-limit

### Infrastructure
- **Caching**: Redis / IORedis
- **Queue**: BullMQ
- **Logging**: Pino
- **Email**: Nodemailer

### Development Tools
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Jest + Supertest
- **Git Hooks**: Husky + Commitlint
- **Documentation**: Swagger/OpenAPI

## 🏗️ Architecture

### Modular Structure
```
src/
├── modules/          # Business modules
│   ├── auth/         # Authentication
│   ├── users/        # User management
│   ├── roles/        # Role management
│   ├── permissions/  # Permission management
│   ├── customers/    # Customer management
│   ├── accounts/     # Bank account management
│   ├── transactions/ # Transaction processing
│   ├── cards/        # Card management
│   ├── loans/        # Loan management
│   ├── audit/        # Audit logging
│   └── ...
├── core/             # Core infrastructure
│   ├── middlewares/  # Express middlewares
│   ├── guards/       # Authorization guards
│   ├── errors/       # Error handling
│   ├── utils/        # Utility functions
│   ├── constants/    # Application constants
│   └── services/     # Shared services
├── infrastructure/   # Technical infrastructure
│   ├── database/     # Database configuration
│   ├── cache/        # Redis/Cache setup
│   ├── queue/        # Job queue setup
│   └── storage/      # File storage setup
├── config/           # Configuration management
└── index.ts          # Application entry point
```

### Design Patterns
- **Repository Pattern**: Data access abstraction
- **Service Pattern**: Business logic encapsulation
- **Middleware Pattern**: Cross-cutting concerns
- **Dependency Inversion**: Loose coupling
- **Factory Pattern**: Object creation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL 13+
- Redis 6+ (optional, for caching)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd banking-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Set up the database**
```bash
# Create database
createdb banking_db

# Run migrations
npm run prisma:migrate

# Seed data
npm run prisma:seed
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Docker Setup

1. **Start services with Docker Compose**
```bash
docker-compose up -d
```

2. **Run migrations**
```bash
docker-compose exec app npm run prisma:migrate
```

3. **Seed the database**
```bash
docker-compose exec app npm run prisma:seed
```

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Compile TypeScript
npm run start           # Start production server

# Database
npm run prisma:migrate  # Run migrations
npm run prisma:seed     # Seed database
npm run prisma:studio   # Open Prisma Studio GUI
npm run db:push         # Push schema to database
npm run db:validate     # Validate schema

# Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues
npm run format          # Format code with Prettier
npm run format:check    # Check formatting
npm run typecheck       # TypeScript type checking

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests

# Utilities
npm run prepare         # Install Husky hooks
```

### Code Quality

The project includes automated code quality checks:
- **ESLint**: Identifies and fixes code issues
- **Prettier**: Ensures consistent code formatting
- **TypeScript**: Strict type checking
- **Jest**: Unit and integration testing
- **Husky**: Git hooks for pre-commit and pre-push checks
- **Commitlint**: Enforces conventional commit messages

### Best Practices

1. **Use TypeScript**: Always define types for better IDE support and error detection
2. **Follow SOLID Principles**: Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
3. **Error Handling**: Use custom error classes (AppError, ValidationError, etc.)
4. **Logging**: Use the logger utility for structured logging
5. **Testing**: Write tests for critical business logic
6. **Documentation**: Document complex functions and API endpoints

## 📚 API Documentation

### Health Check
```bash
GET /health
# Response: { status: 'healthy', timestamp, environment }
```

### Authentication Endpoints
```bash
# Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass@123"
}
# Response: { accessToken, refreshToken, user }

# Refresh Token
POST /api/v1/auth/refresh
{
  "refreshToken": "..."
}

# Logout
POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
```

### Swagger Documentation
Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

## 🔒 Security

### Password Policy
- Minimum 8 characters
- Requires uppercase, lowercase, numbers, special characters
- Enforced password expiration (90 days)
- Password history to prevent reuse (last 5 passwords)

### Authentication Security
- JWT tokens with 15-minute expiration
- Refresh tokens with 7-day expiration
- Token rotation on refresh
- Automatic session cleanup
- Account locking after 5 failed login attempts

### Data Protection
- Encryption at rest for sensitive fields
- HTTPS in production
- Secure cookies (HttpOnly, Secure, SameSite)
- SQL injection prevention via Prisma
- XSS protection via input sanitization

### Audit & Compliance
- Comprehensive audit logging
- Security event tracking
- User action tracking
- Database transaction logging
- IP and device monitoring

## ✅ Testing

### Running Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

### Test Structure
- **Unit Tests**: src/**/*.test.ts
- **Integration Tests**: tests/integration/**/*.test.ts
- **E2E Tests**: tests/e2e/**/*.test.ts

### Example Test
```typescript
import { db } from '@/infrastructure/database/prisma';
import { hashPassword } from '@/core/utils';

describe('User Service', () => {
  it('should create a user', async () => {
    const user = await db.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: await hashPassword('Pass@123'),
        firstName: 'Test',
        lastName: 'User',
        roleId: 'role-id',
        status: true,
      },
    });

    expect(user.email).toBe('test@example.com');
  });
});
```

## 🚢 Deployment

### Docker Deployment

1. **Build image**
```bash
docker build -t banking-backend:latest .
```

2. **Run container**
```bash
docker run -d \
  --name banking-app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@db:5432/banking" \
  -e JWT_SECRET="your-secret-key" \
  banking-backend:latest
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT secrets (min 32 chars)
- [ ] Configure HTTPS/TLS certificates
- [ ] Enable CSRF protection
- [ ] Set secure cookie flags
- [ ] Configure CORS origins
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Enable rate limiting
- [ ] Set up log aggregation
- [ ] Configure CI/CD pipeline
- [ ] Run security audit

### Environment Variables
See `.env.example` for complete list. Key variables:

```
DATABASE_URL           # PostgreSQL connection string
JWT_SECRET            # Secret for signing JWTs (min 32 chars)
NODE_ENV              # development|staging|production
LOG_LEVEL             # debug|info|warn|error
REDIS_HOST            # Redis server hostname
SMTP_*                # Email configuration
```

## 📝 Contributing

### Code Style
- Follow ESLint configuration
- Use Prettier for formatting
- Follow conventional commits
- Add tests for new features
- Update documentation

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Example:
```
feat(auth): implement two-factor authentication

Add TOTP-based 2FA support for enhanced security
```

## 📄 License

This project is proprietary and confidential.

## 🤝 Support

For issues, questions, or contributions, please contact the development team.

---

**Built with ❤️ by the Banking Platform Team**
