import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
import app from './app.js';
import { resetDatabase } from './storage.js';

describe('API auth and state', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('logs in shop admin and returns token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: '1234',
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.role).toBe('admin');
  });

  it('returns api root message on /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('SmartHub API is running');
  });

  it('supports /api/login alias', async () => {
    const res = await request(app).post('/api/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: '1234',
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'wrong',
      role: 'admin',
      rolePassword: '1234',
    });

    expect(res.status).toBe(401);
  });

  it('saves and loads shared state for a shop', async () => {
    const login = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: '1234',
    });

    const token = login.body.token;

    const save = await request(app)
      .put('/api/state')
      .set('Authorization', `Bearer ${token}`)
      .send({ state: { invoices: [{ id: 77 }], customers: [] } });

    expect(save.status).toBe(200);
    expect(save.body.ok).toBe(true);

    const load = await request(app)
      .get('/api/state')
      .set('Authorization', `Bearer ${token}`);

    expect(load.status).toBe(200);
    expect(load.body.state.invoices[0].id).toBe(77);
  });

  it('creates invoice on server and updates stock', async () => {
    const login = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: '1234',
    });
    const token = login.body.token;

    await request(app)
      .put('/api/state')
      .set('Authorization', `Bearer ${token}`)
      .send({
        state: {
          products: [{ id: 10, name: 'Tea', stock_shop: 8 }],
          customers: [{ id: 5, name: 'Ali', balance: 0, total_purchases: 0 }],
          invoices: [],
          debts: [],
          notifications: [],
          pendingApprovals: [],
        },
      });

    const create = await request(app)
      .post('/api/sales/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoice: {
          customer_id: 5,
          customer_name: 'Ali',
          customer_phone: '0700000000',
          subtotal: 300,
          discount: 0,
          total: 300,
          paid_amount: 300,
          due_amount: 0,
          payment_method: 'cash',
          status: 'pending',
          approval_status: 'pending',
          notes: '',
          items: [{ product_id: 10, product_name: 'Tea', quantity: 3, unit_price: 100, total_price: 300 }],
        },
      });

    expect(create.status).toBe(200);
    expect(create.body.invoice.invoice_number).toBeTruthy();
    expect(create.body.state.products[0].stock_shop).toBe(5);
    expect(create.body.state.invoices.length).toBe(1);
  });

  it('registers new shop', async () => {
    const res = await request(app).post('/api/register').send({
      shopCode: 'shop900',
      shopName: 'فروشگاه جدید',
      shopPassword: 'newpass900',
      ownerName: 'مالک جدید',
      ownerUsername: 'owner900',
      rolePassword: '5678',
    });

    expect(res.status).toBe(201);
    expect(res.body.shop.code).toBe('SHOP900');
  });

  it('resets shop data with security code', async () => {
    const login = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: '1234',
    });
    const token = login.body.token;

    await request(app)
      .put('/api/state')
      .set('Authorization', `Bearer ${token}`)
      .send({ state: { invoices: [{ id: 90 }], customers: [{ id: 1 }] } });

    const failReset = await request(app)
      .post('/api/system/reset-data')
      .set('Authorization', `Bearer ${token}`)
      .send({ resetCode: '00000000' });
    expect(failReset.status).toBe(401);

    const okReset = await request(app)
      .post('/api/system/reset-data')
      .set('Authorization', `Bearer ${token}`)
      .send({ resetCode: '12345678' });
    expect(okReset.status).toBe(200);

    const load = await request(app)
      .get('/api/state')
      .set('Authorization', `Bearer ${token}`);
    expect(load.status).toBe(200);
    const st = load.body.state;
    expect(st.products).toEqual([]);
    expect(st.invoices).toEqual([]);
    expect(st.customers).toEqual([]);
    expect(st.categories).toEqual([]);
  });

  it('allows super admin to change reset code', async () => {
    const superLogin = await request(app).post('/api/auth/login').send({
      shopCode: 'SUPERADMIN',
      shopPassword: 'super-secret-2026',
      role: 'super_admin',
      rolePassword: 'super-secret-2026',
    });
    const superToken = superLogin.body.token;

    const change = await request(app)
      .put('/api/system/reset-code')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ currentCode: '12345678', newCode: '87654321' });
    expect(change.status).toBe(200);

    const adminLogin = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: '1234',
    });
    const adminToken = adminLogin.body.token;

    const oldCodeFail = await request(app)
      .post('/api/system/reset-data')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resetCode: '12345678' });
    expect(oldCodeFail.status).toBe(401);

    const newCodePass = await request(app)
      .post('/api/system/reset-data')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resetCode: '87654321' });
    expect(newCodePass.status).toBe(200);
  });

  it('demo register and login with phone + password (no OTP)', async () => {
    const reg = await request(app).post('/api/auth/demo-login').send({
      mode: 'register',
      phone: '0799123456',
      password: 'secret12',
      name: 'علی',
      familyName: 'تست',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.registered).toBe(true);
    expect(reg.body.shopCode).toMatch(/^DM/);
    expect(reg.body.shopPassword).toBeTruthy();
    expect(reg.body.adminFullName).toBe('علی تست');
    expect(reg.body.adminRoleTitle).toBe('مدیر دکان');
    expect(reg.body.adminRolePassword).toBe('secret12');
    expect(reg.body.trialEndsAt).toBeTruthy();

    const badLogin = await request(app).post('/api/auth/demo-login').send({
      mode: 'login',
      phone: '0799123456',
      password: 'wrongpass',
    });
    expect(badLogin.status).toBe(401);

    const okLogin = await request(app).post('/api/auth/demo-login').send({
      mode: 'login',
      phone: '0799123456',
      password: 'secret12',
    });
    expect(okLogin.status).toBe(200);
    expect(okLogin.body.user.is_demo).toBe(true);
  });

  it('super admin can reset shop admin role password via PUT tenant', async () => {
    const superLogin = await request(app).post('/api/auth/login').send({
      shopCode: 'SUPERADMIN',
      shopPassword: 'super-secret-2026',
      role: 'super_admin',
      rolePassword: 'super-secret-2026',
    });
    expect(superLogin.status).toBe(200);
    const superToken = superLogin.body.token;

    const put = await request(app)
      .put('/api/master/tenants/SHOP001')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ admin_role_password: 'newrole8888' });
    expect(put.status).toBe(200);

    const ok = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: 'newrole8888',
    });
    expect(ok.status).toBe(200);

    const failOld = await request(app).post('/api/auth/login').send({
      shopCode: 'SHOP001',
      shopPassword: 'shop123',
      role: 'admin',
      rolePassword: '1234',
    });
    expect(failOld.status).toBe(401);
  });

  it('google login prefers tenant shop over SUPERADMIN when the same email exists on both', async () => {
    const { loadDatabase, saveDatabase } = await import('./storage.js');
    const db = await loadDatabase();
    const superShop = db.shops.find((s) => s.code === 'SUPERADMIN');
    const sUser = superShop?.users?.[0];
    expect(sUser).toBeTruthy();
    sUser.email = 'shared-google@test.com';
    sUser.username = 'shared-google@test.com';
    const shop1 = db.shops.find((s) => s.code === 'SHOP001');
    const admin1 = shop1?.users?.find((u) => u.role === 'admin');
    expect(admin1).toBeTruthy();
    admin1.email = 'shared-google@test.com';
    admin1.username = 'shared-google@test.com';
    await saveDatabase(db);

    const res = await request(app).post('/api/auth/google').send({
      email: 'shared-google@test.com',
      fullName: 'کاربر تست',
    });
    expect(res.status).toBe(200);
    expect(res.body.shop.code).toBe('SHOP001');
  });
});
