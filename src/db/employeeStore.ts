import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db } from './index.ts';
import { operations, users, warehouses } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { createUser, getUserByEmail } from './queries.ts';

const SETTINGS_FILE = path.resolve(process.cwd(), 'data', 'employee_settings.json');

interface EmployeeMeta {
  canCreateReceipts: boolean;
  warehouseId?: number | null;
}

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadAllMeta(): Record<string, EmployeeMeta> {
  try {
    ensureDataDir();
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading employee settings:', err);
  }
  return {};
}

function saveAllMeta(data: Record<string, EmployeeMeta>) {
  try {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving employee settings:', err);
  }
}

export function getEmployeeMeta(email: string): EmployeeMeta {
  const all = loadAllMeta();
  const normalized = email.toLowerCase().trim();
  if (all[normalized]) return all[normalized];
  return { canCreateReceipts: false, warehouseId: 1 };
}

export function setEmployeeMeta(email: string, meta: Partial<EmployeeMeta>) {
  const all = loadAllMeta();
  const normalized = email.toLowerCase().trim();
  all[normalized] = {
    ...all[normalized],
    ...meta,
  };
  saveAllMeta(all);
  return all[normalized];
}

export async function getAllEmployeesWithStats() {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.id));
    const allOps = await db.select().from(operations);
    const allWarehouses = await db.select().from(warehouses);
    const whMap = new Map(allWarehouses.map((w) => [w.id, w.name]));

    const allMeta = loadAllMeta();

    return allUsers.map((u) => {
      const email = u.email.toLowerCase().trim();
      const meta = allMeta[email] || {
        canCreateReceipts: u.role === 'Inventory Manager',
        warehouseId: 1,
      };

      // Count active floor tasks assigned to this employee
      const activeTasksCount = allOps.filter(
        (o) =>
          (o.status === 'ready' || o.status === 'processing') &&
          o.responsible &&
          (o.responsible.toLowerCase() === u.name.toLowerCase() ||
            o.responsible.toLowerCase() === u.email.toLowerCase())
      ).length;

      return {
        id: u.id,
        uid: u.uid,
        email: u.email,
        name: u.name,
        role: u.role as 'Inventory Manager' | 'Warehouse Staff',
        canCreateReceipts: meta.canCreateReceipts ?? (u.role === 'Inventory Manager'),
        warehouseId: meta.warehouseId || 1,
        warehouseName: whMap.get(meta.warehouseId || 1) || 'Central Warehouse (WH)',
        activeTasksCount,
        createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Error getting employees with stats:', error);
    throw error;
  }
}

export async function createNewEmployee(data: {
  name: string;
  email: string;
  warehouseId?: number;
  canCreateReceipts?: boolean;
}) {
  const email = data.email.toLowerCase().trim();
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error(`An employee or user with email '${email}' already exists.`);
  }

  // Generate a memorable, secure temporary initial password
  const tempPassword = `StockStaff#${Math.floor(1000 + Math.random() * 9000)}`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(tempPassword, salt);
  const uid = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newUser = await createUser({
    uid,
    email,
    name: data.name,
    role: 'Warehouse Staff',
    passwordHash,
  });

  // Save metadata
  setEmployeeMeta(email, {
    canCreateReceipts: data.canCreateReceipts ?? false,
    warehouseId: data.warehouseId || 1,
  });

  // PRINT / LOG AUTOMATIC EMAIL DISPATCH AS SPECIFIED
  console.log('\n=============================================================');
  console.log('📬 [EMPLOYEE ONBOARDING EMAIL SERVICE]');
  console.log(`👤 New Staff:         ${data.name}`);
  console.log(`📧 Destination Email: ${email}`);
  console.log(`🏢 Assigned Facility: Warehouse #${data.warehouseId || 1}`);
  console.log(`🔑 Initial Password:  ${tempPassword}`);
  console.log(`📋 Role & Scope:      Warehouse Floor Staff (Transfers, Shelving, Picking)`);
  console.log(`✨ Receipt Rights:    ${data.canCreateReceipts ? 'Granted' : 'Restricted'}`);
  console.log('📦 Subject:           Welcome to StockSense IMS - Your Staff Credentials');
  console.log('=============================================================\n');

  return {
    employee: {
      id: newUser.id,
      uid: newUser.uid,
      email: newUser.email,
      name: newUser.name,
      role: 'Warehouse Staff',
      canCreateReceipts: data.canCreateReceipts ?? false,
      warehouseId: data.warehouseId || 1,
      activeTasksCount: 0,
      createdAt: newUser.createdAt ? newUser.createdAt.toISOString() : new Date().toISOString(),
    },
    temporaryPassword: tempPassword,
    emailDispatched: true,
  };
}
