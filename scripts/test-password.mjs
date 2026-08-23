/**
 * Password rules, asserted without a database or a browser.
 *
 * `lib/blog/password.ts` imports nothing — no `server-only`, no Supabase — which
 * is what makes this possible. Run with:
 *
 *   npm run test:password
 */

import assert from "node:assert/strict";
import {
  PASSWORD_MIN,
  checkConfirmation,
  checkIsDifferent,
  checkPassword,
  looksLikeEmail,
  passwordByteLength,
} from "../src/lib/blog/password.ts";

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log("password rules\n");

test("rejects an empty password", () => {
  assert.ok(checkPassword(""));
});

test("rejects anything under the minimum", () => {
  assert.ok(checkPassword("a".repeat(PASSWORD_MIN - 1)));
});

test("accepts a long, varied passphrase", () => {
  assert.equal(checkPassword("correct horse battery staple"), null);
});

test("rejects a long but repetitive password", () => {
  // Clears the length check and nothing else.
  assert.ok(checkPassword("aaaaaaaaaaaaaaaa"));
});

test("rejects leading or trailing whitespace", () => {
  assert.ok(checkPassword(" correct horse battery"));
  assert.ok(checkPassword("correct horse battery "));
});

test("counts bytes, not characters, against the bcrypt ceiling", () => {
  // Four-byte emoji: 20 characters, 80 bytes — over the 72-byte truncation point
  // even though `.length` says otherwise.
  const emoji = "😀".repeat(20);
  assert.equal(emoji.length, 40);
  assert.equal(passwordByteLength(emoji), 80);
  assert.ok(checkPassword(emoji), "should refuse a password bcrypt would truncate");
});

test("confirmation must be present and must match", () => {
  assert.ok(checkConfirmation("a-good-passphrase", ""));
  assert.ok(checkConfirmation("a-good-passphrase", "different"));
  assert.equal(checkConfirmation("a-good-passphrase", "a-good-passphrase"), null);
});

test("refuses a new password identical to the current one", () => {
  assert.ok(checkIsDifferent("same-passphrase", "same-passphrase"));
  assert.equal(checkIsDifferent("old-passphrase", "new-passphrase"), null);
  // No current password (the recovery path) is not a match.
  assert.equal(checkIsDifferent("", "new-passphrase"), null);
});

test("email shape check", () => {
  assert.ok(looksLikeEmail("someone@example.com"));
  assert.ok(!looksLikeEmail("someone@example"));
  assert.ok(!looksLikeEmail("not an email"));
  assert.ok(!looksLikeEmail(""));
});

console.log(`\n${passed} passed`);
