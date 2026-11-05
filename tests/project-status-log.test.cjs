const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Run the real TypeScript modules with isolated database/network dependencies.
function loadModule(filename, mocks = {}, cache = new Map()) {
  const absolute = path.resolve(__dirname, "..", filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} };
  cache.set(absolute, module);
  const source = ts.transpileModule(readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: absolute,
  }).outputText;
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith(".") || name.startsWith("@/")) {
      const base = name.startsWith("@/")
        ? path.resolve(__dirname, "..", name.slice(2))
        : path.resolve(path.dirname(absolute), name);
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find((file) => existsSync(file));
      if (resolved) return loadModule(resolved, mocks, cache);
    }
    return require(name);
  };
  vm.runInThisContext(`(function(require, module, exports, console) { ${source}\n})`, { filename: absolute })(
    localRequire, module, module.exports, { ...console, error() {}, log() {} },
  );
  return module.exports;
}

const projectRow = {
  project_id: 7, customer_id: 1, order_name: "งานทดสอบ", description_project: null,
  status: "pending", base_cost: 0, labor_cost: 0, service_percent: 0, final_cost: 0,
};
const projectView = {
  ...projectRow, id: 7, customer_name: "ลูกค้าทดสอบ", phone_number: "0812345678",
  description_project: "", materials: [], payments: [], employee_ids: [], status_logs: [],
};

function projectRoute({ result = { data: projectRow, error: null }, logFailure } = {}) {
  const logs = [];
  const chain = {
    insert() { return this; }, update() { return this; }, select() { return this; }, eq() { return this; },
    async single() { return result; }, async maybeSingle() { return result; },
  };
  const route = loadModule("app/api/project/route.ts", {
    "@/lib/supabase": { supabase: { from(table) {
      if (table !== "project_status_log") return chain;
      return { async insert(row) {
        logs.push(row);
        if (logFailure === "throw") throw new Error("network unavailable");
        return { error: logFailure ? { code: "42501" } : null };
      } };
    } } },
  });
  return { route, logs };
}

function request(method, body) {
  return new Request("http://localhost/api/project?id=7", {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

test("creating a project records its initial status exactly once", async () => {
  const { route, logs } = projectRoute();
  const response = await route.POST(request("POST", projectRow));
  assert.equal(response.status, 201);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].project_id, 7);
  assert.equal(logs[0].status, "pending");
});

test("every successful status event is logged, including repeated estimated and revisions", async () => {
  for (const status of ["pending", "estimated", "estimated", "confirmed", "waiting_shop_inspection",
    "revision_shop", "waiting_shop_inspection", "shop_passed", "delivered_shop", "revision_shop",
    "waiting_site_inspection", "revision_site", "site_passed", "delivered_site", "accepted", "completed", "reject"]) {
    const { route, logs } = projectRoute({ result: { data: { ...projectRow, status }, error: null } });
    assert.equal((await route.PUT(request("PUT", { status }))).status, 200);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, status);
  }
});

test("project edits without status and unsuccessful updates never create a log", async () => {
  const regular = projectRoute();
  assert.equal((await regular.route.PUT(request("PUT", { order_name: "แก้ชื่องาน" }))).status, 200);
  assert.equal(regular.logs.length, 0);
  for (const [result, expected] of [
    [{ data: null, error: null }, 409],
    [{ data: null, error: { code: "42501" } }, 403],
  ]) {
    const { route, logs } = projectRoute({ result });
    assert.equal((await route.PUT(request("PUT", { status: "reject" }))).status, expected);
    assert.equal(logs.length, 0);
  }
  const missing = projectRoute({ result: { data: null, error: null } });
  assert.equal((await missing.route.PUT(request("PUT", { status: "confirmed" }))).status, 404);
  assert.equal(missing.logs.length, 0);
});

test("log errors and rejected promises preserve successful project responses", async () => {
  for (const logFailure of ["error", "throw"]) {
    const { route } = projectRoute({ logFailure });
    assert.equal((await route.POST(request("POST", projectRow))).status, 201);
    assert.equal((await route.PUT(request("PUT", { status: "estimated" }))).status, 200);
  }
});

test("history GET validates project ID, filters and orders consistently, with no public writes", async () => {
  const operations = [];
  const chain = {
    select(value) { operations.push(["select", value]); return this; },
    order(field, direction) { operations.push(["order", field, direction.ascending]); return this; },
    eq(field, value) { operations.push(["eq", field, value]); return this; },
    then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
  };
  const route = loadModule("app/api/project_status_log/route.ts", {
    "@/lib/supabase": { supabase: { from: () => chain } },
  });
  const response = await route.GET(new Request("http://localhost/api/project_status_log?project_id=7"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { status_logs: [] });
  assert.deepEqual(operations, [["select", "*"], ["order", "changed_at", true], ["order", "log_id", true], ["eq", "project_id", "7"]]);
  for (const id of ["", "abc", "-1", "1.2", "1 OR 1=1"]) {
    assert.equal((await route.GET(new Request(`http://localhost/api/project_status_log?project_id=${encodeURIComponent(id)}`))).status, 400);
  }
  assert.equal((await route.GET(new Request("http://localhost/api/project_status_log"))).status, 200);
  assert.equal(route.POST, undefined);
  assert.equal(route.PUT, undefined);
  assert.equal(route.DELETE, undefined);
});

function workspace(overrides = {}) {
  const calls = [];
  const get = (name, rows) => async (filters, signal) => { calls.push([name, signal]); return rows; };
  const noop = async () => {};
  const services = {
    "@/lib/phone": { getPhoneNumberError: () => null },
    "./project": { getProject: get("project", [projectRow]), updateProject: async (id, changes) => calls.push(["update", changes]) },
    "./customer": { getCustomer: get("customer", [{ customer_id: 1, customer_name: "ทดสอบ", phone_number: "0812345678" }]) },
    "./employee": { getEmployee: get("employee", []), createEmployee: noop },
    "./appointment": { getAppointment: get("appointment", []), createAppointment: noop, updateAppointment: noop },
    "./job_material": { getJobMaterial: get("material", []), createJobMaterial: async () => ({ job_material_id: 10 }), updateJobMaterial: noop, deleteJobMaterial: noop },
    "./payment": { getPayment: get("payment", []), createPayment: async () => ({ payment_id: 11 }), updatePayment: noop },
    "./work_on": { getWorkOn: get("assignment", []), createWorkOn: noop, deleteWorkOn: noop },
    "./project_status_log": { getProjectStatusLog: get("history", []) },
    ...overrides,
  };
  return { ...loadModule("service/workspace.ts", services), calls };
}

test("saving team, materials or payments omits unchanged status; re-estimate explicitly records it", async () => {
  const { saveProjectDetails, calls } = workspace();
  for (const change of [
    { employee_ids: [1] },
    { materials: [{ id: -1, material_name: "วัสดุ", unit: "ชิ้น", quantity: 1, unit_cost: 20, use_for: "" }], base_cost: 20, final_cost: 20 },
    { payments: [{ id: -1, amount: 100, payment_date: "2026-11-05", proof_of_payment: "" }] },
    { order_name: "แก้ไข" },
  ]) {
    await saveProjectDetails({ ...projectView, ...change }, projectView);
    assert.equal(Object.hasOwn(calls.at(-1)[1], "status"), false);
  }
  const estimated = { ...projectView, status: "estimated" };
  await saveProjectDetails(estimated, projectView);
  assert.equal(calls.at(-1)[1].status, "estimated");
  await saveProjectDetails(estimated, estimated, { recordStatus: true });
  assert.equal(calls.at(-1)[1].status, "estimated");
  await saveProjectDetails(estimated, estimated);
  assert.equal(Object.hasOwn(calls.at(-1)[1], "status"), false);
});

test("workspace loads history once alongside other tables and preserves explicit timezones", async () => {
  let historyCalls = 0;
  const signal = new AbortController().signal;
  const { getWorkspace, calls } = workspace({
    "./project_status_log": { async getProjectStatusLog(filters, receivedSignal) {
      historyCalls++;
      assert.equal(receivedSignal, signal);
      return [
        { log_id: 1, project_id: 7, status: "pending", changed_at: "2026-11-05T03:00:00" },
        { log_id: 2, project_id: 7, status: "estimated", changed_at: "2026-11-05T04:00:00Z" },
        { log_id: 3, project_id: 7, status: "confirmed", changed_at: "2026-11-05T12:00:00+07:00" },
        { log_id: 4, project_id: 8, status: "pending", changed_at: "2026-11-05T03:00:00" },
      ];
    } },
  });
  const data = await getWorkspace(signal);
  assert.equal(historyCalls, 1);
  assert.equal(calls.length, 7);
  assert.ok(calls.every((call) => call[1] === signal));
  assert.deepEqual(Array.from(data.projects[0].status_logs, (log) => log.changed_at), [
    "2026-11-05T03:00:00Z", "2026-11-05T04:00:00Z", "2026-11-05T12:00:00+07:00",
  ]);
  const { formatDate } = loadModule("features/project/project-utils.ts");
  assert.match(formatDate(data.projects[0].status_logs[0].changed_at, true), /10:00/);
});

test("unavailable history leaves the workspace usable and aborts are not swallowed", async () => {
  const { getWorkspace } = workspace({ "./project_status_log": { getProjectStatusLog: async () => { throw new Error("history unavailable"); } } });
  const result = await getWorkspace();
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].status_logs.length, 0);
  assert.match(result.statusLogsError, /โหลดประวัติสถานะไม่สำเร็จ/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => getWorkspace(controller.signal), /history unavailable/);
});

test("timeline sorts timestamp ties by ID and derives shop/site reasons without mutating input", () => {
  const { getStatusHistoryItems } = loadModule("features/project/status-history.ts");
  for (const branch of ["shop", "site"]) {
    const statuses = ["pending", "estimated", "confirmed", `waiting_${branch}_inspection`, `revision_${branch}`,
      `waiting_${branch}_inspection`, `${branch}_passed`, `delivered_${branch}`, `revision_${branch}`];
    const logs = statuses.map((status, index) => ({ id: index + 1, status, changed_at: "2026-11-05T03:00:00Z" })).reverse();
    const items = getStatusHistoryItems(logs);
    assert.deepEqual(Array.from(items, (item) => item.status), statuses);
    assert.equal(logs[0].id, 9);
    assert.equal(items[3].reason, undefined);
    assert.equal(items[4].reason, "ตรวจไม่ผ่าน");
    assert.equal(items[5].reason, "งานแก้ไข");
    assert.equal(items[8].reason, "ลูกค้าขอแก้");
  }
});

test("workflow shows history for normal and rejected projects, including empty/error states", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { WorkflowPanel } = loadModule("features/project/components/workflow-panel.tsx", {
    "../project-provider": { useProjects: () => ({ data: { appointments: [] } }) },
  });
  const props = { onSave: async () => true, onSchedule() {}, onEstimate() {}, onTeam() {}, onMaterial() {}, onPayment() {} };
  for (const status of ["pending", "reject"]) {
    const html = renderToStaticMarkup(React.createElement(WorkflowPanel, { ...props, project: { ...projectView, status } }));
    assert.match(html, /ประวัติสถานะ/);
    assert.match(html, /ยังไม่มีประวัติการเปลี่ยนสถานะ/);
  }
  const { ProjectStatusHistory } = loadModule("features/project/components/status-history.tsx");
  const html = renderToStaticMarkup(React.createElement(ProjectStatusHistory, { logs: [], error: "โหลดประวัติสถานะไม่สำเร็จ" }));
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /ยังไม่มีประวัติการเปลี่ยนสถานะ/);
  const entries = renderToStaticMarkup(React.createElement(ProjectStatusHistory, { logs: [
    { id: 1, status: "waiting_shop_inspection", changed_at: "2026-11-05T03:00:00Z" },
    { id: 2, status: "revision_shop", changed_at: "2026-11-05T04:00:00Z" },
    { id: 3, status: "waiting_shop_inspection", changed_at: "2026-11-05T05:00:00Z" },
  ] }));
  assert.match(entries, /ตรวจไม่ผ่าน/);
  assert.match(entries, /data-slot="badge"/);
  assert.match(entries, /10:00/);
  const rows = Array.from(entries.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g), (match) => match[1]);
  assert.equal(rows.length, 3);
  assert.match(rows[0], /2026-11-05T05:00:00Z/);
  assert.match(rows[0], /ล่าสุด/);
  assert.match(rows[0], /งานแก้ไข/);
  assert.match(rows[1], /2026-11-05T04:00:00Z/);
  assert.match(rows[1], /ตรวจไม่ผ่าน/);
  assert.doesNotMatch(rows[1], /ล่าสุด/);
  assert.match(rows[2], /2026-11-05T03:00:00Z/);
  assert.doesNotMatch(rows[2], /ล่าสุด|งานแก้ไข|ตรวจไม่ผ่าน/);
});
