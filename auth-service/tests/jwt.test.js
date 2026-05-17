const test = require("node:test");
const assert = require("node:assert");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("../src/utils/jwt");

process.env.JWT_ACCESS_SECRET = "test_access_secret";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret";

const mockUser = {
  id: "123",
  email: "test@test.com",
  role: "ADMIN",
};

test("generate access token", () => {
  const token = generateAccessToken(mockUser);

  assert.ok(token);
});

test("verify access token", () => {
  const token = generateAccessToken(mockUser);

  const decoded = verifyAccessToken(token);

  assert.equal(decoded.email, mockUser.email);
});

test("generate refresh token", () => {
  const token = generateRefreshToken(mockUser);

  assert.ok(token);
});

test("verify refresh token", () => {
  const token = generateRefreshToken(mockUser);

  const decoded = verifyRefreshToken(token);

  assert.equal(decoded.id, mockUser.id);
});