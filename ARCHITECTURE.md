# Banking Platform Backend - Architecture & Design Documentation

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                       │
│                   (Web, Mobile, Admin Portal)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Gateway / Load Balancer
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS APPLICATION                        │
│  ┌────────────┬──────────────┬──────────────┬────────────────┐  │
│  │ HTTP Layer │ Middleware   │ Error        │ Request        │  │
│  │ (Handlers) │ (Security,   │ Handling     │ Validation     │  │
│  │            │ Logging)     │              │                │  │
│  └────────────┴──────────────┴──────────────┴────────────────┘  │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API ROUTES (v1)                            │    │
│  │  ├─ /auth                                              │    │
│  │  ├─ /users                                             │    │
│  │  ├─ /customers                                         │    │
│  │  ├─ /accounts                                          │    │
│  │  ├─ /transactions                                      │    │
│  │  └─ ...                                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           MODULE LAYER (Controllers)                    │    │
│  │   - Request parsing                                     │    │
│  │   - Response formatting                                │    │
│  │   - Authorization checks                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         SERVICE LAYER (Business Logic)                  │    │
│  │   - Use case implementation                             │    │
│  │   - Validation                                          │    │
│  │   - Business rules                                      │    │
│  │   - Transaction management                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         REPOSITORY LAYER (Data Access)                  │    │
│  │   - Database queries                                    │    │
│  │   - Query optimization                                 │    │
│  │   - Transaction handling                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────┬──────────────┬─────────────┐
         ↓            ↓              ↓             ↓
    PostgreSQL    Redis Cache   Job Queue    File Storage
    (Database)    (BullMQ)      (BullMQ)     (Optional)
```

## 📁 Directory Structure & Responsibility

### src/modules/
**Business Domain Modules** - Each module is self-contained with its own controller, service, repository, and routes.

```
src/modules/
├── auth/                    # Authentication module
│   ├── controllers/         # HTTP request handlers
│   ├── services/            # Business logic
│   ├── repositories/        # Data access layer
│   ├── dto/                 # Data transfer objects (input/output)
│   ├── validators/          # Input validation schemas
│   ├── types/               # TypeScript types
│   ├── tests/               # Module-specific tests
│   └── routes.ts            # API routes
├── users/                   # User management module
├── customers/               # Customer management
├── accounts/                # Bank accounts
├── transactions/            # Transaction processing
├── cards/                   # Card management
├── loans/                   # Loan management
├── rbac/                    # Role-based access control
├── audit/                   # Audit logging
├── notifications/           # Notifications
└── ... (other modules)
```

### src/core/
**Cross-cutting Infrastructure** - Shared utilities and infrastructure.

```
src/core/
├── middlewares/             # Express middlewares
│   ├── auth.middleware.ts   # JWT authentication
│   └── auth.guard.ts        # RBAC authorization
├── guards/                  # Access control guards
├── services/                # Shared services
├── errors/                  # Custom error classes
│   └── AppError.ts          # Base error class
├── utils/                   # Utility functions
│   └── index.ts             # All utils (crypto, validation, etc.)
├── constants/               # Application constants
│   └── index.ts             # Roles, permissions, enums
├── events/                  # Event emitter setup
└── interceptors/            # Request/response interceptors
```

### src/infrastructure/
**Technical Infrastructure** - Database, cache, queue, storage setup.

```
src/infrastructure/
├── database/
│   ├── prisma.ts            # Prisma client initialization
│   └── logger.ts            # Pino logger setup
├── cache/                   # Redis cache setup
├── queue/                   # BullMQ job queue setup
└── storage/                 # File storage setup
```

### src/config/
**Configuration Management** - Environment variables and configuration.

```
src/config/
└── index.ts                 # Zod-validated config
```

## 🔐 Authentication & Authorization Flow

### JWT Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│  1. USER LOGIN                                      │
│  POST /api/v1/auth/login                           │
│  {email, password}                                 │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  2. VERIFY CREDENTIALS                             │
│  - Find user by email                              │
│  - Verify password hash (Argon2)                   │
│  - Check if account is locked                      │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  3. GENERATE TOKENS                                │
│  - Create JWT access token (15m expiry)           │
│  - Create refresh token (7d expiry)               │
│  - Hash tokens for database storage               │
│  - Store refresh token in database                │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  4. RETURN RESPONSE                                │
│  {                                                 │
│    accessToken: "...",                            │
│    refreshToken: "...",                           │
│    user: {...}                                     │
│  }                                                 │
└─────────────────────────────────────────────────────┘
```

### RBAC Authorization Flow

```
┌─────────────────────────────────────────────────────┐
│  1. RECEIVE REQUEST                                │
│  GET /api/v1/users                                 │
│  Headers: {Authorization: "Bearer <token>"}       │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  2. AUTHENTICATE MIDDLEWARE                        │
│  - Extract token from Authorization header         │
│  - Verify JWT signature and expiry                │
│  - Extract user ID from token payload             │
│  - Attach user to request object                  │
└──────────────────────┬────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  3. AUTHORIZATION MIDDLEWARE                       │
│  - Get required permissions from route             │
│  - Query user's role and permissions              │
│  - Check if user has required permissions         │
└──────────────────────┬────────────────────────────┘
                       ↓
        ┌─────────────┴──────────────┐
        ↓                             ↓
┌──────────────────┐        ┌──────────────────┐
│ PERMISSION       │        │ PERMISSION       │
│ GRANTED          │        │ DENIED           │
│ ↓                │        │ ↓                │
│ Proceed to       │        │ Return 403      │
│ controller       │        │ Forbidden       │
└──────────────────┘        └──────────────────┘
```

## 💾 Database Schema Highlights

### Key Entities

**User** - System users (employees, admins)
- Unique email and phone
- Password hash (Argon2)
- Account status and locking
- Role assignment
- 2FA setup

**Role** - Permission groupings
- SUPER_ADMIN, SYSTEM_ADMIN, COMPLIANCE_OFFICER, etc.
- Permission associations
- System vs. custom roles

**Permission** - Fine-grained access control
- Module-based (users, transactions, etc.)
- Action-based (create, read, update, delete)
- Assigned to roles and directly to users

**Customer** - Bank customers
- Basic information
- KYC profile
- Documents
- Multiple accounts

**BankAccount** - Customer accounts
- Account number (unique)
- Balance tracking
- Account type (Savings, Current, etc.)
- Status management
- Interest calculation

**Transaction** - Account transactions
- Reference number (unique)
- Transaction type and status
- Amount and currency
- Related transaction tracking
- Approval workflow

**AuditLog** - Action tracking
- What action (CREATE, UPDATE, DELETE)
- Who performed it
- When it happened
- Old and new values
- Device and IP information

## 🔒 Security Implementation

### Password Security
```typescript
// Password hashing with Argon2
const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,  // Most secure type
  memoryCost: 2 ** 16,     // 64MB memory
  timeCost: 3,             // 3 iterations
  parallelism: 1,          // Single thread
});

// Verification
const isValid = await argon2.verify(hash, password);
```

### JWT Token Management
```typescript
// Access token (short-lived)
const accessToken = jwt.sign(
  { id, email, role, permissions },
  JWT_SECRET,
  { expiresIn: '15m' }
);

// Refresh token (long-lived, stored in DB)
const refreshToken = jwt.sign(
  { id, tokenVersion },
  REFRESH_TOKEN_SECRET,
  { expiresIn: '7d' }
);
```

### Rate Limiting
```typescript
// Global rate limit: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.user?.isAdmin, // Skip for admins
});

// Login rate limit: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Count only failures
});
```

### SQL Injection Prevention
```typescript
// Prisma provides parameterized queries by default
const user = await db.user.findUnique({
  where: { email }, // Parameterized - safe from SQL injection
});
```

## 📊 Data Flow Example: User Creation

```
Request
│
├─ HTTP POST /api/v1/users
│  with { email, password, firstName, lastName, roleId }
│
↓
1. ROUTE HANDLER
│  ├─ Authenticate middleware: verify JWT
│  ├─ Authorization: check users:create permission
│  └─ Validation: Zod schema validation
│
↓
2. CONTROLLER (userController.createUser)
│  ├─ Parse request body
│  ├─ Validate input
│  └─ Call service
│
↓
3. SERVICE (userService.createUser)
│  ├─ Check email uniqueness
│  ├─ Validate password strength
│  ├─ Hash password with Argon2
│  └─ Call repository
│
↓
4. REPOSITORY (userRepository.create)
│  ├─ Insert user into database
│  ├─ Include role relationship
│  └─ Return created user
│
↓
5. SERVICE (continued)
│  ├─ Format response
│  └─ Return to controller
│
↓
6. CONTROLLER
│  ├─ Create audit log
│  ├─ Send email notification (async)
│  └─ Return response
│
↓
7. RESPONSE
   { success: true, data: {...} }
```

## 🔄 Error Handling Pattern

```typescript
// Custom Error Hierarchy
AppError (base)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitError (429)
└── InternalServerError (500)

// Usage in controller
try {
  // Operations
} catch (error) {
  if (error instanceof ValidationError) {
    return res.status(400).json(error.toJSON());
  } else if (error instanceof AuthenticationError) {
    return res.status(401).json(error.toJSON());
  }
  // Global error handler will catch
  next(error);
}
```

## 🧪 Testing Strategy

### Unit Tests (Services & Utilities)
```typescript
describe('UserService', () => {
  it('should hash password correctly', async () => {
    const hash = await hashPassword('Pass@123456');
    const isValid = await verifyPassword('Pass@123456', hash);
    expect(isValid).toBe(true);
  });
});
```

### Integration Tests (API Endpoints)
```typescript
describe('POST /api/v1/users', () => {
  it('should create user with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ ... });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

## 🚀 Performance Considerations

### Database Optimization
- Indexes on frequently queried fields
- Composite indexes for common queries
- Connection pooling via Prisma
- Query caching with Redis

### Caching Strategy
```typescript
// Cache user permissions for 1 hour
const key = `user:${userId}:permissions`;
let permissions = await cache.get(key);

if (!permissions) {
  permissions = await db.userPermission.findMany(...);
  await cache.set(key, permissions, 3600); // 1 hour TTL
}
```

### Pagination
```typescript
// Always paginate list endpoints
GET /api/v1/users?page=1&limit=20

// Database query optimization
const skip = (page - 1) * limit;
const users = await db.user.findMany({
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

## 📈 Monitoring & Observability

### Structured Logging
```typescript
logger.info({
  msg: 'User created',
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
  requestId: req.id,
});
```

### Health Check Endpoints
```
GET /health     - Application health
GET /ready      - Readiness for traffic
```

### Metrics to Track
- Request latency
- Error rates
- Database query performance
- Cache hit ratios
- Authentication failures
- Authorization failures

## 🔗 API Versioning

Current version: v1
Location: `/api/v1/*`

Future versions would be:
- `/api/v2/*` - Breaking changes
- `/api/v3/*` - New major features

## 📚 References & Patterns

- **Repository Pattern**: Abstraction over data access
- **Service Pattern**: Business logic encapsulation
- **Dependency Injection**: Loose coupling via constructor injection
- **Clean Architecture**: Separation of concerns
- **SOLID Principles**:
  - Single Responsibility
  - Open/Closed
  - Liskov Substitution
  - Interface Segregation
  - Dependency Inversion

---

**This architecture provides the foundation for a scalable, maintainable, and secure banking system.**
