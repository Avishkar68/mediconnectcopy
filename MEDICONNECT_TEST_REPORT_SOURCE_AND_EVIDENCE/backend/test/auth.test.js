import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import {
  loginUser,
  logoutUser,
  registerUser,
  verifyOtp,
} from '../controllers/authController.js';
import { authorizeRoles, protect } from '../middleware/authMiddleware.js';

function createResponse() {
  return {
    statusCode: null,
    body: null,
    cookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
  };
}

describe('Authentication endpoints', () => {
  it('rejects registration when required fields are missing', async () => {
    const res = createResponse();
    await registerUser({ body: { email: 'patient@example.com' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Name, email, and password are required');
  });

  it('rejects registration passwords shorter than six characters', async () => {
    const res = createResponse();
    await registerUser({
      body: { name: 'Patient One', email: 'patient@example.com', password: '12345' },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Password must be at least 6 characters long');
  });

  it('rejects registration with an unsupported role', async () => {
    const res = createResponse();
    await registerUser({
      body: {
        name: 'Patient One',
        email: 'patient@example.com',
        password: 'secret123',
        role: 'superuser',
      },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid user role specified');
  });

  it('requires email and OTP code for verification', async () => {
    const res = createResponse();
    await verifyOtp({ body: { email: 'patient@example.com' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Email and OTP code are required');
  });

  it('requires credentials for login', async () => {
    const res = createResponse();
    await loginUser({ body: { email: 'patient@example.com' } }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Email and password are required');
  });

  it('clears the authentication cookie on logout', async () => {
    const res = createResponse();
    await logoutUser({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.cookies.length, 1);
    assert.equal(res.cookies[0].name, 'jwt');
    assert.equal(res.cookies[0].value, '');
    assert.equal(res.cookies[0].options.httpOnly, true);
  });
});

describe('Role authorization middleware', () => {
  it('allows requests matching an authorized role', () => {
    const middleware = authorizeRoles('doctor', 'admin');
    const req = { user: { role: 'doctor' } };
    const res = createResponse();
    let nextCalls = 0;

    middleware(req, res, () => { nextCalls += 1; });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, null);
  });

  it('rejects requests with an unauthorized role', () => {
    const middleware = authorizeRoles('doctor');
    const req = { user: { role: 'patient' } };
    const res = createResponse();

    middleware(req, res, () => assert.fail('next should not be called'));

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Role 'patient' is not authorized/);
  });
});

describe('Additional authentication input cases', () => {
  const validRegistration = {
    name: 'Patient One',
    email: 'patient@example.com',
    password: 'secret123',
  };

  const missingRegistrationFields = [
    ['name omitted', ['name']],
    ['email omitted', ['email']],
    ['password omitted', ['password']],
    ['name and email omitted', ['name', 'email']],
    ['name and password omitted', ['name', 'password']],
    ['email and password omitted', ['email', 'password']],
    ['all required fields omitted', ['name', 'email', 'password']],
  ];

  for (const [caseName, omittedFields] of missingRegistrationFields) {
    it(`rejects registration when ${caseName}`, async () => {
      const body = { ...validRegistration };
      for (const field of omittedFields) delete body[field];
      const res = createResponse();

      await registerUser({ body }, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Name, email, and password are required');
    });
  }

  for (const password of ['a', '12', 'abc', 'abcd', 'abcde', '     ']) {
    it(`rejects registration password ${JSON.stringify(password)} below minimum length`, async () => {
      const res = createResponse();
      await registerUser({
        body: { ...validRegistration, password },
      }, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'Password must be at least 6 characters long');
    });
  }

  for (const role of ['superuser', 'guest', 'Patient!', 'doctor-admin', 'admin ', ' PATIENT', 7, {}]) {
    it(`rejects unsupported registration role ${JSON.stringify(role)}`, async () => {
      const res = createResponse();
      await registerUser({
        body: { ...validRegistration, role },
      }, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Invalid user role specified');
    });
  }

  for (const body of [{}, { email: 'patient@example.com' }, { otpCode: '123456' }]) {
    it(`requires both verification fields for ${JSON.stringify(body)}`, async () => {
      const res = createResponse();
      await verifyOtp({ body }, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'Email and OTP code are required');
    });
  }

  for (const body of [{}, { email: 'patient@example.com' }, { password: 'secret123' }]) {
    it(`requires both login credentials for ${JSON.stringify(body)}`, async () => {
      const res = createResponse();
      await loginUser({ body }, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'Email and password are required');
    });
  }

  for (const [role, permittedRoles] of [
    ['patient', ['patient']],
    ['doctor', ['doctor']],
    ['admin', ['admin']],
    ['patient', ['doctor', 'patient']],
    ['doctor', ['admin', 'doctor']],
    ['admin', ['patient', 'admin']],
  ]) {
    it(`allows ${role} access when permitted by ${permittedRoles.join(', ')}`, () => {
      const res = createResponse();
      let nextCalls = 0;
      authorizeRoles(...permittedRoles)(
        { user: { role } },
        res,
        () => { nextCalls += 1; },
      );

      assert.equal(nextCalls, 1);
      assert.equal(res.statusCode, null);
    });
  }

  for (const [user, permittedRoles] of [
    [{ role: 'patient' }, ['doctor']],
    [{ role: 'doctor' }, ['admin']],
    [{ role: 'admin' }, ['patient']],
    [undefined, ['patient']],
  ]) {
    it(`denies role access when user ${JSON.stringify(user)} is not permitted`, () => {
      const res = createResponse();
      authorizeRoles(...permittedRoles)(
        { user },
        res,
        () => assert.fail('next should not be called'),
      );

      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
    });
  }

  for (const [caseName, req] of [
    ['no cookie or authorization header', { cookies: {}, headers: {} }],
    ['empty authentication cookie', { cookies: { jwt: '' }, headers: {} }],
    ['unsupported authorization scheme', { cookies: {}, headers: { authorization: 'Basic abc' } }],
  ]) {
    it(`rejects protected request with ${caseName}`, async () => {
      const res = createResponse();
      await protect(req, res, () => assert.fail('next should not be called'));

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /no token session/i);
    });
  }
});

describe('JWT authentication checks', () => {
  for (const [caseName, token] of [
    ['malformed token', 'not-a-jwt'],
    ['token signed by an unknown secret', jwt.sign({ userId: 'user-1' }, 'wrong-secret')],
    [
      'expired token',
      jwt.sign({ userId: 'user-1' }, 'fallback_secret_key', { expiresIn: '-1s' }),
    ],
  ]) {
    it(`rejects protected request with ${caseName}`, async () => {
      const res = createResponse();

      await protect(
        { cookies: { jwt: token }, headers: {} },
        res,
        () => assert.fail('next should not be called'),
      );

      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Not authorized, token validation failed');
    });
  }
});
