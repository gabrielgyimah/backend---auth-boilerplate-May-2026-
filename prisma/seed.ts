/// <reference types="node" />
/**
 * Prisma Database Seed Script
 * Initializes the database with realistic banking data
 * Run with: npm run prisma:seed
 */

import {
  hashPassword,
} from '../src/core/utils';
import {
  PERMISSION_CODES,
  SYSTEM_ADMIN_PERMISSIONS,
} from '../src/core/constants';
import { db } from '../src/infrastructure/database/prisma';



// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function clearDatabase(): Promise<void> {
  console.log('🗑️  Clearing database...');

  // Delete in order of dependencies
  await db.document.deleteMany();
  await db.notification.deleteMany();
  await db.securityEvent.deleteMany();
  await db.auditLog.deleteMany();
  await db.userPermission.deleteMany();
  await db.userRole.deleteMany();
  await db.aPIKey.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.refreshToken.deleteMany();
  await db.oTPRequest.deleteMany();
  await db.device.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.permission.deleteMany();
  await db.role.deleteMany();
  await db.exchangeRate.deleteMany();
  await db.currency.deleteMany();
  await db.country.deleteMany();
  await db.featureFlag.deleteMany();
  await db.systemSetting.deleteMany();

  console.log('✅ Database cleared');
}

async function seedCountriesAndCurrencies(): Promise<void> {
  console.log('🌍 Seeding countries and currencies...');

  // Create countries
  const countries = await Promise.all([
    db.country.create({
      data: {
        code: 'US',
        name: 'United States',
        displayName: 'USA',
        isActive: true,
      },
    }),
    db.country.create({
      data: {
        code: 'IN',
        name: 'India',
        displayName: 'India',
        isActive: true,
      },
    }),
    db.country.create({
      data: {
        code: 'GB',
        name: 'United Kingdom',
        displayName: 'UK',
        isActive: true,
      },
    }),
    db.country.create({
      data: {
        code: 'CA',
        name: 'Canada',
        displayName: 'Canada',
        isActive: true,
      },
    }),
  ]);

  // Create currencies
  await Promise.all([
    db.currency.create({
      data: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        countryId: countries[0].id,
        isActive: true,
      },
    }),
    db.currency.create({
      data: {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        decimalPlaces: 2,
        countryId: countries[1].id,
        isActive: true,
      },
    }),
    db.currency.create({
      data: {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalPlaces: 2,
        countryId: countries[2].id,
        isActive: true,
      },
    }),
    db.currency.create({
      data: {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        decimalPlaces: 2,
        countryId: countries[3].id,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Countries and currencies seeded');
}

async function seedRolesAndPermissions(): Promise<void> {
  console.log('👥 Seeding roles and permissions...');

  // Create all permissions
  const permissionData = [
    // User Management
    { code: PERMISSION_CODES.USERS_CREATE, displayName: 'Create Users', module: 'users', action: 'create' },
    { code: PERMISSION_CODES.USERS_READ, displayName: 'Read Users', module: 'users', action: 'read' },
    { code: PERMISSION_CODES.USERS_UPDATE, displayName: 'Update Users', module: 'users', action: 'update' },
    { code: PERMISSION_CODES.USERS_DELETE, displayName: 'Delete Users', module: 'users', action: 'delete' },
    { code: PERMISSION_CODES.USERS_MANAGE_ROLES, displayName: 'Manage Roles', module: 'users', action: 'manage_roles' },
    { code: PERMISSION_CODES.USERS_MANAGE_PERMISSIONS, displayName: 'Manage Permissions', module: 'users', action: 'manage_permissions' },

    // Audit & Security
    { code: PERMISSION_CODES.AUDIT_READ, displayName: 'Read Audit Logs', module: 'audit', action: 'read' },
    { code: PERMISSION_CODES.AUDIT_EXPORT, displayName: 'Export Audit Logs', module: 'audit', action: 'export' },
    { code: PERMISSION_CODES.SECURITY_EVENTS_READ, displayName: 'Read Security Events', module: 'security', action: 'read' },
    { code: PERMISSION_CODES.SECURITY_EVENTS_MANAGE, displayName: 'Manage Security Events', module: 'security', action: 'manage' },

    // Role & Permission Management
    { code: PERMISSION_CODES.ROLES_CREATE, displayName: 'Create Roles', module: 'roles', action: 'create' },
    { code: PERMISSION_CODES.ROLES_READ, displayName: 'Read Roles', module: 'roles', action: 'read' },
    { code: PERMISSION_CODES.ROLES_UPDATE, displayName: 'Update Roles', module: 'roles', action: 'update' },
    { code: PERMISSION_CODES.ROLES_DELETE, displayName: 'Delete Roles', module: 'roles', action: 'delete' },
    { code: PERMISSION_CODES.PERMISSIONS_READ, displayName: 'Read Permissions', module: 'permissions', action: 'read' },
    { code: PERMISSION_CODES.PERMISSIONS_MANAGE, displayName: 'Manage Permissions', module: 'permissions', action: 'manage' },

    // System Settings
    { code: PERMISSION_CODES.SETTINGS_READ, displayName: 'Read Settings', module: 'settings', action: 'read' },
    { code: PERMISSION_CODES.SETTINGS_UPDATE, displayName: 'Update Settings', module: 'settings', action: 'update' },
    { code: PERMISSION_CODES.FEATURE_FLAGS_MANAGE, displayName: 'Manage Feature Flags', module: 'settings', action: 'manage_flags' },
  ];

  const permissions = await Promise.all(
    permissionData.map((p) =>
      db.permission.create({
        data: {
          code: p.code,
          displayName: p.displayName,
          module: p.module,
          action: p.action,
          isSystem: true,
          isActive: true,
        },
      })
    )
  );

  // Create roles
  const systemAdminPermissions = permissions.filter((p: typeof permissions[0]) =>
    SYSTEM_ADMIN_PERMISSIONS.includes(p.code as any)
  );

  await Promise.all([
    db.role.create({
      data: {
        name: 'SUPER_ADMIN',
        displayName: 'Super Administrator',
        description: 'Full system access - highest privilege',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: permissions.map((p: typeof permissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'SYSTEM_ADMIN',
        displayName: 'System Administrator',
        description: 'Administrator role with full permissions',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: systemAdminPermissions.map((p: typeof systemAdminPermissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'COMPLIANCE_OFFICER',
        displayName: 'Compliance Officer',
        description: 'Manages compliance and regulatory requirements',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: permissions
            .filter((p: typeof permissions[0]) => ['audit', 'users', 'customers'].includes(p.module))
            .map((p: typeof permissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'BRANCH_MANAGER',
        displayName: 'Branch Manager',
        description: 'Manages branch operations',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: permissions
            .filter((p: typeof permissions[0]) => ['customers', 'accounts', 'transactions', 'audit'].includes(p.module) && p.action === 'read')
            .map((p: typeof permissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'TELLER',
        displayName: 'Teller',
        description: 'Handles customer transactions',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: permissions
            .filter((p: typeof permissions[0]) => ['transactions', 'accounts'].includes(p.module) && p.action === 'create')
            .map((p: typeof permissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'CUSTOMER_SERVICE',
        displayName: 'Customer Service Representative',
        description: 'Provides customer support',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: permissions
            .filter((p: typeof permissions[0]) => p.module === 'customers' && p.action === 'read')
            .map((p: typeof permissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'LOAN_OFFICER',
        displayName: 'Loan Officer',
        description: 'Manages loan applications and approvals',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: permissions
            .filter((p: typeof permissions[0]) => p.module === 'loans')
            .map((p: typeof permissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'AUDITOR',
        displayName: 'Auditor',
        description: 'Audits and monitors system activities',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: permissions
            .filter((p: typeof permissions[0]) => ['audit', 'security'].includes(p.module))
            .map((p: typeof permissions[0]) => ({ id: p.id })),
        },
      },
    }),
    db.role.create({
      data: {
        name: 'CUSTOMER',
        displayName: 'Customer',
        description: 'Regular customer role',
        isSystem: true,
        isActive: true,
        permissions: {
          connect: [], // Customers have no direct permissions
        },
      },
    }),
  ]);

  console.log('✅ Roles and permissions seeded');
}

async function seedSystemUsers(): Promise<void> {
  console.log('👤 Seeding system users...');

  const superAdminRole = await db.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  const systemAdminRole = await db.role.findUnique({
    where: { name: 'SYSTEM_ADMIN' },
  });

  // Create super admin
  await db.user.create({
    data: {
      email: 'superadmin@banking.local',
      phone: '+1-212-555-1001',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: await hashPassword('SuperAdmin@123'),
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      is2FAEnabled: true,
      status: true,
      roleId: superAdminRole!.id,
    },
  });

  // Create system admin
  await db.user.create({
    data: {
      email: 'admin@banking.local',
      phone: '+1-212-555-1002',
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: await hashPassword('Admin@123456'),
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      is2FAEnabled: true,
      status: true,
      roleId: systemAdminRole!.id,
    },
  });

  console.log('✅ System users seeded');
}


async function seedFeatureFlags(): Promise<void> {
  console.log('🚩 Seeding feature flags...');

  await Promise.all([
    db.featureFlag.create({
      data: {
        key: 'ENABLE_2FA',
        name: 'Enable Two-Factor Authentication',
        description: 'Enable 2FA for all users',
        isEnabled: true,
        rolloutPercentage: 100,
      },
    }),
    db.featureFlag.create({
      data: {
        key: 'ENABLE_DEVICE_MANAGEMENT',
        name: 'Device Management',
        description: 'Enable device trust management',
        isEnabled: true,
        rolloutPercentage: 100,
      },
    }),
    db.featureFlag.create({
      data: {
        key: 'ENABLE_SESSION_MANAGEMENT',
        name: 'Session Management',
        description: 'Enable session management',
        isEnabled: true,
        rolloutPercentage: 100,
      },
    }),
    db.featureFlag.create({
      data: {
        key: 'ENABLE_AUDIT_LOGGING',
        name: 'Audit Logging',
        description: 'Enable comprehensive audit logging',
        isEnabled: true,
        rolloutPercentage: 100,
      },
    }),
  ]);

  console.log('✅ Feature flags seeded');
}

async function seedSystemSettings(): Promise<void> {
  console.log('⚙️  Seeding system settings...');

  await Promise.all([
    db.systemSetting.create({
      data: {
        key: 'APP_NAME',
        value: 'Banking Platform',
        description: 'Application name',
        dataType: 'string',
      },
    }),
    db.systemSetting.create({
      data: {
        key: 'APP_VERSION',
        value: '1.0.0',
        description: 'Application version',
        dataType: 'string',
      },
    }),
    db.systemSetting.create({
      data: {
        key: 'MAX_LOGIN_ATTEMPTS',
        value: '5',
        description: 'Maximum login attempts before account lock',
        dataType: 'number',
      },
    }),
    db.systemSetting.create({
      data: {
        key: 'PASSWORD_EXPIRY_DAYS',
        value: '90',
        description: 'Password expiry in days',
        dataType: 'number',
      },
    }),
  ]);

  console.log('✅ System settings seeded');
}

// ============================================================================
// MAIN SEED EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...\n');

  try {
    await clearDatabase();
    await seedCountriesAndCurrencies();
    await seedRolesAndPermissions();
    await seedSystemUsers();
    await seedFeatureFlags();
    await seedSystemSettings();

    console.log('\n✅ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
