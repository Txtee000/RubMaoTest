require("./register-typescript.cjs");
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Intercept database traffic; never use the shop's live database.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
process.env.BOSS_USERNAME = "boss";
process.env.BOSS_PASSWORD = "test-password";
process.env.AUTH_SECRET = "test-secret-with-at-least-32-characters";
const { NextRequest } = require("next/server");
const { login, SESSION_COOKIE } = require("../lib/auth.ts");
const crud = require("../app/api/appointment/route.ts");
const reminder = require("../app/api/appointment/reminder/route.ts");
const originalFetch = global.fetch;
let state;

beforeEach(() => {
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  state = {
    appointment: {
      appointment_id: 1, project_id: 2, customer_id: 3, appointment_type: "site_visit",
      location: "บ้านลูกค้า", appointment_datetime: "2026-10-09T09:00:00",
      status: "pending", reminder_status: "pending", reminder_sent_at: null,
    },
    project: { project_id: 2, customer_id: 3, order_name: "ติดตั้งประตู", status: "confirmed" },
    requests: [], databaseWrites: 0, failWrite: false,
  };
  global.fetch = async (input, options = {}) => {
    const url = new URL(input.url ?? input.toString());
    state.requests.push(url);
    assert.equal(url.origin, "https://database.test", "The button must only update the database");
    const table = url.pathname.split("/").at(-1);
    let rows = state[table] ? [state[table]] : [];
    for (const [key, filter] of url.searchParams) {
      if (filter.startsWith("eq.")) rows = rows.filter((row) => String(row[key]) === filter.slice(3));
      if (filter === "is.null") rows = rows.filter((row) => row[key] === null);
    }
    if (options.method === "PATCH" || options.method === "POST") {
      if (state.failWrite) return Response.json({ code: "42501", message: "write denied" }, { status: 403 });
      const changes = JSON.parse(options.body);
      if (options.method === "POST") rows = [state[table] = { ...changes, appointment_id: 1 }];
      else rows.forEach((row) => Object.assign(row, changes));
      state.databaseWrites += rows.length;
    }
    const snapshot = structuredClone(rows);
    if (table === "appointment" && (!options.method || options.method === "GET") && state.onRead) await state.onRead();
    const single = new Headers(options.headers).get("accept")?.includes("vnd.pgrst.object");
    return Response.json(single ? snapshot[0] ?? null : snapshot);
  };
});
after(() => { global.fetch = originalFetch; });

function request(path = "/api/appointment/reminder?id=1", options = {}) {
  const token = login("boss", "test-password").token;
  return new NextRequest(`http://localhost${path}`, {
    method: "POST", ...options,
    headers: { cookie: `${SESSION_COOKIE}=${token}`, "content-type": "application/json", ...options.headers },
  });
}
function send(req = request()) { return reminder.POST(req); }

test("records sent without LINE credentials or a customer LINE ID", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-08T03:00:00Z") });
  const response = await send();
  assert.equal(response.status, 200);
  assert.equal(state.appointment.reminder_status, "sent");
  assert.equal(state.appointment.reminder_sent_at, "2026-10-08T10:00:00.000");
  assert.equal(state.appointment.status, "pending");
  assert.equal((await response.json()).appointment.reminder_sent_at, "2026-10-08T10:00:00.000");
  assert.ok(state.requests.every((url) => url.origin === "https://database.test"));
});

test("repeated clicks succeed and preserve the first click timestamp", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-08T03:00:00Z") });
  assert.equal((await send()).status, 200);
  t.mock.timers.tick(60000);
  assert.equal((await send()).status, 200);
  assert.equal(state.appointment.reminder_sent_at, "2026-10-08T10:00:00.000");
  assert.equal(state.appointment.reminder_status, "sent");
  assert.equal(state.databaseWrites, 1);
});

test("a configured LINE token does not cause any LINE requests", async () => {
  process.env.LINE_CHANNEL_ACCESS_TOKEN = "unused-line-token";
  assert.equal((await send()).status, 200);
  assert.ok(state.requests.every((url) => url.origin === "https://database.test"));
  assert.equal(state.appointment.reminder_status, "sent");
});

test("clicking promotes legacy statuses while preserving their existing timestamps", async () => {
  for (const status of ["failed", "pending"]) {
    state.appointment.reminder_status = status;
    state.appointment.reminder_sent_at = "2026-10-07T12:00:00";
    const response = await send();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).appointment.reminder_status, "sent");
    assert.equal(state.appointment.reminder_status, "sent");
    assert.equal(state.appointment.reminder_sent_at, "2026-10-07T12:00:00");
  }
});

test("overlapping clicks cannot overwrite an already recorded timestamp", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-08T03:00:00Z") });
  let releaseFirst;
  let firstReached;
  let reads = 0;
  const reached = new Promise((resolve) => { firstReached = resolve; });
  const blocked = new Promise((resolve) => { releaseFirst = resolve; });
  state.onRead = async () => {
    if (++reads === 1) { firstReached(); await blocked; }
  };
  const first = send();
  await reached;
  t.mock.timers.tick(1000);
  const second = await send();
  const saved = state.appointment.reminder_sent_at;
  releaseFirst();
  assert.equal(second.status, 200);
  assert.equal((await first).status, 200);
  assert.equal(state.appointment.reminder_sent_at, saved);
  assert.equal(state.databaseWrites, 1);
});

test("a database failure does not record success and the action can be retried", async () => {
  state.failWrite = true;
  const response = await send();
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /บันทึก/);
  assert.equal(state.appointment.reminder_status, "pending");
  assert.equal(state.appointment.reminder_sent_at, null);
  state.failWrite = false;
  assert.equal((await send()).status, 200);
  assert.equal(state.appointment.reminder_status, "sent");
});

test("only the authenticated boss can record a reminder", async () => {
  assert.equal((await send(request(undefined, { headers: { cookie: "" } }))).status, 401);
  assert.equal(state.databaseWrites, 0);
});

test("cross-origin requests cannot record reminders", async () => {
  assert.equal((await send(request(undefined, { headers: { origin: "https://attacker.test" } }))).status, 403);
  assert.equal(state.databaseWrites, 0);
});

test("invalid and missing appointment IDs do not update the database", async () => {
  assert.equal((await send(request("/api/appointment/reminder?id=abc"))).status, 400);
  assert.equal((await send(request("/api/appointment/reminder?id=999"))).status, 404);
  assert.equal(state.databaseWrites, 0);
});

test("completed appointments cannot record new reminders", async () => {
  state.appointment.status = "completed";
  assert.equal((await send()).status, 409);
  assert.equal(state.databaseWrites, 0);
});

test("closed or rejected projects cannot record new reminders", async () => {
  for (const status of ["completed", "reject"]) {
    state.project.status = status;
    assert.equal((await send()).status, 409);
  }
  assert.equal(state.databaseWrites, 0);
});

test("appointment edits cannot overwrite reminder metadata", async () => {
  state.appointment.reminder_status = "sent";
  state.appointment.reminder_sent_at = "2026-10-07T12:00:00";
  const response = await crud.PUT(request("/api/appointment?id=1", {
    method: "PUT", body: JSON.stringify({ location: "ร้าน", reminder_sent_at: null }),
  }));
  assert.equal(response.status, 400);
  assert.equal(state.appointment.reminder_sent_at, "2026-10-07T12:00:00");
});

test("ordinary appointment edits preserve reminder metadata", async () => {
  state.appointment.reminder_status = "sent";
  state.appointment.reminder_sent_at = "2026-10-07T12:00:00";
  const response = await crud.PUT(request("/api/appointment?id=1", {
    method: "PUT", body: JSON.stringify({ location: "ร้าน", status: "completed" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(state.appointment.location, "ร้าน");
  assert.equal(state.appointment.reminder_status, "sent");
  assert.equal(state.appointment.reminder_sent_at, "2026-10-07T12:00:00");
});

test("new appointments cannot claim that a reminder was already recorded", async () => {
  const response = await crud.POST(request("/api/appointment", {
    body: JSON.stringify({ ...state.appointment, reminder_status: "sent", reminder_sent_at: "2026-10-07T12:00:00" }),
  }));
  assert.equal(response.status, 400);
  assert.equal(state.databaseWrites, 0);
});
