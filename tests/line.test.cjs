const Module = require("node:module");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const ts = require("typescript");
const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// Compile the actual helper for Node tests; Next handles the server-only marker.
const linePath = resolve(__dirname, "../lib/line.ts");
const lineModule = new Module(linePath, module);
lineModule.filename = linePath;
lineModule.require = (specifier) => specifier === "server-only" ? {} : require(specifier);
lineModule._compile(ts.transpileModule(readFileSync(linePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: linePath,
}).outputText, linePath);
const { sendLineMessage } = lineModule.exports;
const originalFetch = global.fetch;
const originalToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
let requests;

beforeEach(() => {
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
  requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json({ sentMessages: [{ id: "test-message" }] });
  };
});
afterEach(() => {
  global.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  else process.env.LINE_CHANNEL_ACCESS_TOKEN = originalToken;
});

test("sends a text push message using the server environment token", async () => {
  await sendLineMessage("Utest-recipient", "แจ้งเตือนนัดหมาย");
  assert.equal(requests.length, 1);
  const { url, options } = requests[0];
  assert.equal(url, "https://api.line.me/v2/bot/message/push");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer test-line-token");
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.equal(options.headers["X-Line-Retry-Key"], undefined);
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(options.body), {
    to: "Utest-recipient", messages: [{ type: "text", text: "แจ้งเตือนนัดหมาย" }],
  });
});

test("rejects missing credentials and empty input before making a request", async () => {
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  await assert.rejects(sendLineMessage("Utest", "hello"), /Missing LINE_CHANNEL_ACCESS_TOKEN/);
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
  await assert.rejects(sendLineMessage(" ", "hello"), /recipient ID is required/);
  await assert.rejects(sendLineMessage("Utest", " "), /message text is required/);
  assert.equal(requests.length, 0);
});

test("throws on HTTP rejection without exposing the access token", async () => {
  global.fetch = async () => Response.json({ message: "Unauthorized" }, { status: 401 });
  await assert.rejects(sendLineMessage("Utest", "hello"), (error) => {
    assert.match(error.message, /HTTP 401/);
    assert.ok(!error.message.includes("test-line-token"));
    return true;
  });
});

test("reuses the provided retry key and recognizes an already accepted request", async () => {
  const retryKey = "123e4567-e89b-42d3-a456-426614174000";
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json({ message: "The retry key is already accepted" }, {
      status: 409, headers: { "x-line-accepted-request-id": "accepted-request" },
    });
  };
  await sendLineMessage("Utest", "hello", { retryKey });
  assert.equal(requests[0].options.headers["X-Line-Retry-Key"], retryKey);
  await assert.rejects(sendLineMessage("Utest", "hello"), /HTTP 409/);
});

test("does not treat an unrelated conflict as a successful send", async () => {
  global.fetch = async () => Response.json({ message: "Conflict" }, { status: 409 });
  await assert.rejects(sendLineMessage("Utest", "hello", {
    retryKey: "123e4567-e89b-42d3-a456-426614174000",
  }), /HTTP 409/);
});

test("propagates network failures without automatically sending again", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    throw new TypeError("fetch failed");
  };
  await assert.rejects(sendLineMessage("Utest", "hello"), /fetch failed/);
  assert.equal(calls, 1);
});
