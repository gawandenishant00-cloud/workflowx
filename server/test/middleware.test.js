const test = require('node:test');
const assert = require('node:assert/strict');
const requireRole = require('../src/middleware/requireRole');

function mockResponse() { return { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } }; }
test('allows a permitted role', () => { let nextCalled = false; requireRole('admin')({ user: { role: 'admin' } }, mockResponse(), () => { nextCalled = true; }); assert.equal(nextCalled, true); });
test('rejects a forbidden role', () => { const response = mockResponse(); requireRole('admin')({ user: { role: 'employee' } }, response, () => {}); assert.equal(response.statusCode, 403); assert.equal(response.body.error, 'You do not have permission to do this'); });
