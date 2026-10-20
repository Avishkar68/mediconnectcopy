import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { describe, it } from 'node:test';
import {
  loginUser,
  logoutUser,
  registerUser,
} from '../controllers/authController.js';
import { authorizeRoles } from '../middleware/authMiddleware.js';

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

describe('Backend nonfunctional checks', () => {
  it('keeps registration validation p95 below 100ms across 50 requests', async () => {
    const durations = [];

    for (let index = 0; index < 50; index += 1) {
      const res = createResponse();
      const startedAt = performance.now();
      await registerUser({ body: {} }, res);
      durations.push(performance.now() - startedAt);
      assert.equal(res.statusCode, 400);
    }

    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
    console.log(
      `[MEASURE] Registration validation p95 across 50 in-process calls: ${p95.toFixed(2)}ms (limit <100ms).`,
    );
    assert.ok(p95 < 100, `registration validation p95 was ${p95.toFixed(2)}ms`);
  });

  it('returns the same validation response across 50 repeated requests', async () => {
    const results = [];

    for (let index = 0; index < 50; index += 1) {
      const res = createResponse();
      await loginUser({ body: {} }, res);
      results.push({ statusCode: res.statusCode, body: res.body });
    }

    assert.ok(results.every((result) => result.statusCode === 400));
    assert.ok(results.every((result) => result.body.success === false));
    assert.ok(results.every(
      (result) => result.body.message === 'Email and password are required',
    ));
  });

  it('clears the session cookie consistently across 25 logouts', async () => {
    for (let index = 0; index < 25; index += 1) {
      const res = createResponse();
      await logoutUser({}, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.cookies.length, 1);
      assert.equal(res.cookies[0].name, 'jwt');
      assert.equal(res.cookies[0].value, '');
      assert.equal(res.cookies[0].options.httpOnly, true);
    }
  });

  it('returns consistent forbidden responses across 50 unauthorized role checks', () => {
    for (let index = 0; index < 50; index += 1) {
      const res = createResponse();
      authorizeRoles('doctor')(
        { user: { role: 'patient' } },
        res,
        () => assert.fail('next should not be called'),
      );

      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /not authorized/i);
    }
  });
});
