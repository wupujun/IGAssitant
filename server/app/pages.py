CONFIG_PAGE_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IG Chat Assistant Config</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(760px, calc(100vw - 32px)); margin: 32px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 14px 36px rgba(17, 24, 39, 0.12); overflow: hidden; }
    header { padding: 18px 20px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
    h1 { margin: 0; font-size: 20px; letter-spacing: 0; }
    form { display: grid; gap: 14px; padding: 20px; }
    label { display: grid; gap: 6px; color: #374151; font-size: 13px; font-weight: 650; }
    input, select, textarea { min-height: 38px; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; color: #111827; font: inherit; font-size: 14px; }
    textarea { resize: vertical; line-height: 1.45; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding-top: 4px; }
    button { min-height: 38px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 14px; background: #fff; color: #111827; font: inherit; cursor: pointer; }
    button.primary { border-color: #2563eb; background: #2563eb; color: #fff; }
    button:hover { background: #f3f4f6; }
    button.primary:hover { background: #1d4ed8; }
    .status { min-height: 24px; padding: 0 20px 20px; color: #4b5563; font-size: 13px; white-space: pre-wrap; }
    .status.error { color: #b91c1c; }
    .status.ok { color: #047857; }
    .hint { color: #6b7280; font-size: 12px; font-weight: 400; }
    @media (max-width: 620px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <header><h1>IG Chat Assistant LLM Config</h1></header>
    <form id="config-form">
      <label>Provider<select id="provider"><option value="openai">OpenAI / OpenAI-compatible</option><option value="deepseek">DeepSeek</option></select></label>
      <label>API mode<select id="api_mode"><option value="chat_completions">Chat Completions</option><option value="responses">Responses</option></select><span class="hint">Use Chat Completions for DeepSeek.</span></label>
      <label>Model<input id="model" autocomplete="off" placeholder="gpt-4.1-mini"></label>
      <label>API key<input id="api_key" type="password" autocomplete="off" placeholder="Leave blank to keep existing key"><span class="hint" id="key-preview"></span></label>
      <label>Base URL<input id="base_url" autocomplete="off" placeholder="Optional, for OpenAI-compatible gateways"></label>
      <div class="grid">
        <label>Temperature<input id="temperature" type="number" min="0" max="2" step="0.05"></label>
        <label>Max output tokens<input id="max_output_tokens" type="number" min="16" max="4000" step="1"></label>
      </div>
      <div class="grid">
        <label>Reasoning effort<select id="reasoning_effort"><option value="">Not set</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="max">max</option></select></label>
        <label>Thinking<select id="thinking"><option value="disabled">disabled</option><option value="enabled">enabled</option></select></label>
      </div>
      <label>Correction/autocomplete rule<textarea id="autocomplete_rule" rows="6" placeholder="Optional custom prompt rule for autocomplete suggestions"></textarea><span class="hint">This rule is injected into autocomplete prompts. Keep it specific and behavioral.</span></label>
      <div class="actions"><button class="primary" type="submit">Save</button><button type="button" id="test">Test LLM</button><button type="button" id="reload">Reload</button></div>
    </form>
    <div id="status" class="status">Loading config...</div>
  </main>
  <script>
    const statusEl = document.getElementById("status");
    const fields = {
      provider: document.getElementById("provider"),
      api_mode: document.getElementById("api_mode"),
      model: document.getElementById("model"),
      api_key: document.getElementById("api_key"),
      base_url: document.getElementById("base_url"),
      temperature: document.getElementById("temperature"),
      max_output_tokens: document.getElementById("max_output_tokens"),
      reasoning_effort: document.getElementById("reasoning_effort"),
      thinking: document.getElementById("thinking"),
      autocomplete_rule: document.getElementById("autocomplete_rule"),
    };
    function setStatus(message, state = "") { statusEl.textContent = message; statusEl.className = `status ${state}`; }
    async function loadConfig() {
      setStatus("Loading config...");
      const response = await fetch("/api/config");
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      fields.provider.value = data.provider || "openai";
      fields.api_mode.value = data.api_mode || "chat_completions";
      fields.model.value = data.model || "";
      fields.api_key.value = "";
      fields.base_url.value = data.base_url || "";
      fields.temperature.value = data.temperature ?? 0.25;
      fields.max_output_tokens.value = data.max_output_tokens ?? 350;
      fields.reasoning_effort.value = data.reasoning_effort || "";
      fields.thinking.value = data.thinking || "disabled";
      fields.autocomplete_rule.value = data.autocomplete_rule || "";
      document.getElementById("key-preview").textContent = data.api_key_configured ? `Current key: ${data.api_key_preview}` : "No API key configured.";
      setStatus("Config loaded.", "ok");
    }
    document.getElementById("config-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("Saving...");
      try {
        const payload = {
          provider: fields.provider.value,
          api_mode: fields.api_mode.value,
          model: fields.model.value,
          api_key: fields.api_key.value,
          base_url: fields.base_url.value,
          temperature: Number(fields.temperature.value),
          max_output_tokens: Number(fields.max_output_tokens.value),
          reasoning_effort: fields.reasoning_effort.value,
          thinking: fields.thinking.value,
          autocomplete_rule: fields.autocomplete_rule.value,
        };
        const response = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
        fields.api_key.value = "";
        document.getElementById("key-preview").textContent = data.api_key_configured ? `Current key: ${data.api_key_preview}` : "No API key configured.";
        setStatus("Saved. The rewrite endpoint will use this config immediately.", "ok");
      } catch (error) { setStatus(error.message, "error"); }
    });
    document.getElementById("test").addEventListener("click", async () => {
      setStatus("Testing LLM...");
      try {
        const response = await fetch("/api/config/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Confirm the LLM configuration works." }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
        setStatus(`Test OK (${data.model}): ${data.message}`, "ok");
      } catch (error) { setStatus(error.message, "error"); }
    });
    document.getElementById("reload").addEventListener("click", () => loadConfig().catch((error) => setStatus(error.message, "error")));
    loadConfig().catch((error) => setStatus(error.message, "error"));
  </script>
</body>
</html>"""


LOGS_PAGE_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IG Chat Assistant Logs</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(1100px, calc(100vw - 32px)); margin: 24px auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 14px 36px rgba(17, 24, 39, 0.12); }
    header { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
    h1 { margin: 0; font-size: 18px; letter-spacing: 0; }
    button { min-height: 34px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 12px; background: #fff; color: #111827; font: inherit; cursor: pointer; }
    button:hover { background: #f3f4f6; }
    .meta { padding: 10px 16px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
    pre { height: calc(100vh - 170px); min-height: 360px; margin: 0; overflow: auto; padding: 14px 16px; background: #111827; color: #d1d5db; font-family: Consolas, "Courier New", monospace; font-size: 12px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    .ERROR, .CRITICAL { color: #fca5a5; }
    .WARNING { color: #fde68a; }
    .INFO { color: #bfdbfe; }
  </style>
</head>
<body>
  <main>
    <header><h1>IG Chat Assistant Logs</h1><div><button id="pause">Pause</button><button id="refresh">Refresh</button></div></header>
    <div class="meta" id="meta">Loading...</div>
    <pre id="logs"></pre>
  </main>
  <script>
    const logsEl = document.getElementById("logs");
    const metaEl = document.getElementById("meta");
    let paused = false;
    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
    async function loadLogs() {
      if (paused) return;
      const response = await fetch("/api/logs?limit=300", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      logsEl.innerHTML = data.logs.map((entry) => {
        const line = `${entry.time} ${entry.level.padEnd(8)} [${entry.logger}] ${entry.message}`;
        return `<span class="${entry.level}">${escapeHtml(line)}</span>`;
      }).join("\\n");
      logsEl.scrollTop = logsEl.scrollHeight;
      metaEl.textContent = `${data.logs.length} entries - refreshed ${new Date().toLocaleTimeString()}`;
    }
    document.getElementById("refresh").addEventListener("click", () => loadLogs().catch((error) => { metaEl.textContent = error.message; }));
    document.getElementById("pause").addEventListener("click", (event) => { paused = !paused; event.target.textContent = paused ? "Resume" : "Pause"; });
    setInterval(() => loadLogs().catch((error) => { metaEl.textContent = error.message; }), 2000);
    loadLogs().catch((error) => { metaEl.textContent = error.message; });
  </script>
</body>
</html>"""


METRICS_PAGE_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IG Chat Assistant Metrics</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(1160px, calc(100vw - 32px)); margin: 24px auto; }
    header { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    h1 { margin: 0; font-size: 20px; letter-spacing: 0; }
    button, a.button { min-height: 34px; border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 12px; background: #fff; color: #111827; font: inherit; cursor: pointer; text-decoration: none; }
    button:hover, a.button:hover { background: #f3f4f6; }
    .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08); }
    .label { color: #6b7280; font-size: 12px; font-weight: 650; }
    .value { margin-top: 6px; font-size: 24px; font-weight: 750; }
    .panel { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; overflow: hidden; box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08); }
    .meta { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 9px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
    th { background: #f9fafb; color: #374151; font-size: 12px; font-weight: 700; position: sticky; top: 0; }
    tbody tr:hover { background: #f9fafb; }
    .ok { color: #047857; font-weight: 700; }
    .fail { color: #b91c1c; font-weight: 700; }
    .table-wrap { max-height: calc(100vh - 280px); min-height: 360px; overflow: auto; }
    .error { max-width: 320px; color: #b91c1c; white-space: pre-wrap; word-break: break-word; }
    @media (max-width: 760px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } th, td { padding: 8px 6px; } }
  </style>
</head>
<body>
  <main>
    <header><h1>LLM Request Metrics</h1><div><a class="button" href="/config">Config</a> <a class="button" href="/logs">Logs</a> <button id="refresh">Refresh</button></div></header>
    <section class="cards">
      <div class="card"><div class="label">Total Requests</div><div class="value" id="total">0</div></div>
      <div class="card"><div class="label">Success / Fail</div><div class="value" id="success">0 / 0</div></div>
      <div class="card"><div class="label">Average Latency</div><div class="value" id="avg">0ms</div></div>
      <div class="card"><div class="label">P95 Latency</div><div class="value" id="p95">0ms</div></div>
    </section>
    <section class="panel">
      <div class="meta" id="meta">Loading...</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Time</th><th>Status</th><th>Provider</th><th>Model</th><th>Mode</th><th>Latency</th><th>Input</th><th>Output</th><th>Error</th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </section>
  </main>
  <script>
    const rowsEl = document.getElementById("rows");
    const metaEl = document.getElementById("meta");
    const totalEl = document.getElementById("total");
    const successEl = document.getElementById("success");
    const avgEl = document.getElementById("avg");
    const p95El = document.getElementById("p95");
    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
    function ms(value) { return `${Number(value || 0).toFixed(0)}ms`; }
    async function loadMetrics() {
      const response = await fetch("/api/metrics/llm?limit=300", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      const summary = data.summary || {};
      totalEl.textContent = summary.total ?? 0;
      successEl.textContent = `${summary.success ?? 0} / ${summary.failures ?? 0}`;
      avgEl.textContent = ms(summary.avg_ms);
      p95El.textContent = ms(summary.p95_ms);
      rowsEl.innerHTML = (data.metrics || []).slice().reverse().map((item) => `
        <tr>
          <td>${escapeHtml(item.time)}</td>
          <td class="${item.ok ? "ok" : "fail"}">${item.ok ? "OK" : "FAIL"}</td>
          <td>${escapeHtml(item.provider)}</td>
          <td>${escapeHtml(item.model)}</td>
          <td>${escapeHtml(item.api_mode)}</td>
          <td>${ms(item.latency_ms)}</td>
          <td>${escapeHtml(item.input_chars)}</td>
          <td>${escapeHtml(item.output_chars)}</td>
          <td class="error">${escapeHtml(item.error || "")}</td>
        </tr>
      `).join("");
      metaEl.textContent = `${data.metrics.length} rows - refreshed ${new Date().toLocaleTimeString()} - min ${ms(summary.min_ms)}, max ${ms(summary.max_ms)}, p50 ${ms(summary.p50_ms)}`;
    }
    document.getElementById("refresh").addEventListener("click", () => loadMetrics().catch((error) => { metaEl.textContent = error.message; }));
    setInterval(() => loadMetrics().catch((error) => { metaEl.textContent = error.message; }), 3000);
    loadMetrics().catch((error) => { metaEl.textContent = error.message; });
  </script>
</body>
</html>"""
