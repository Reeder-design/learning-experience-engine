(() => {
  const ENDPOINT_KEY = "lx-workbench-ai:endpoint";
  const TOKEN_KEY = "lx-workbench-ai:token";
  const $ = (selector, root = document) => root.querySelector(selector);
  const api = window.LX_WORKBENCH;
  if (!api) return;

  let connected = false;
  let lastBeforeAi = null;

  const endpointInput = $("[data-ai-endpoint]");
  const tokenInput = $("[data-ai-token]");
  const statusChip = $("[data-ai-status]");
  const connectionSummary = $("[data-ai-connection-summary]");
  const generateButton = $("[data-generate-ai]");
  const runButton = $("[data-run-ai]");
  const resultPanel = $("[data-ai-result]");

  function defaultEndpoint() {
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") return "/api/workbench-ai";
    return localStorage.getItem(ENDPOINT_KEY) || "";
  }

  function endpoint() {
    return (endpointInput?.value || defaultEndpoint()).trim();
  }

  function token() {
    return tokenInput?.value || sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function setStatus(text, tone = "neutral") {
    if (!statusChip) return;
    statusChip.textContent = text;
    statusChip.dataset.tone = tone;
  }

  function setConnected(value, detail = "") {
    connected = value;
    generateButton.disabled = !value;
    runButton.disabled = !value;
    setStatus(value ? "AI connected" : "AI not connected", value ? "ok" : "warn");
    if (connectionSummary) connectionSummary.textContent = detail || (value ? "Secure backend ready" : "Connect a secure backend to enable AI");
  }

  function authHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    return headers;
  }

  async function testConnection(showToast = true) {
    const url = endpoint();
    if (!url) {
      setConnected(false, "Add your deployed backend endpoint");
      if (showToast) api.toast("Add a secure AI backend endpoint first.");
      return false;
    }

    try {
      setStatus("Checking AI…");
      const response = await fetch(url, { method: "GET", headers: token() ? { Authorization: `Bearer ${token()}` } : {} });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Could not reach Workbench AI.");
      const ready = Boolean(json.configured);
      setConnected(ready, ready ? `${json.model || "AI model"} ready` : "Backend reachable, but OPENAI_API_KEY is not configured");
      if (showToast) api.toast(ready ? "Workbench AI connected" : "Backend connected, API key still needed");
      return ready;
    } catch (error) {
      setConnected(false, error.message);
      if (showToast) api.toast(error.message);
      return false;
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",").pop() || "");
      reader.onerror = () => reject(reader.error || new Error("Could not read source file."));
      reader.readAsDataURL(file);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Could not read image."));
      reader.readAsDataURL(file);
    });
  }

  async function buildFiles() {
    const MAX_FILE_BYTES = 8 * 1024 * 1024;
    const MAX_TOTAL_BYTES = 22 * 1024 * 1024;
    let total = 0;
    const files = [];
    const skipped = [];

    for (const entry of api.getSourceFiles()) {
      if (!["image", "document"].includes(entry.kind)) continue;
      if (entry.file.size > MAX_FILE_BYTES || total + entry.file.size > MAX_TOTAL_BYTES) {
        skipped.push(entry.name);
        continue;
      }
      total += entry.file.size;
      if (entry.kind === "image") {
        files.push({ kind: "image", name: entry.name, path: entry.path, dataUrl: await fileToDataUrl(entry.file) });
      } else {
        files.push({ kind: "document", name: entry.name, path: entry.path, base64: await fileToBase64(entry.file) });
      }
    }
    return { files, skipped };
  }

  function assetManifest() {
    return api.getSourceFiles().map((entry) => ({ path: entry.path, kind: entry.kind, name: entry.name }));
  }

  function renderResult(result) {
    if (!resultPanel) return;
    const changes = (result.changeSummary || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const notes = (result.reviewNotes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    resultPanel.hidden = false;
    resultPanel.innerHTML = `
      <div class="ai-result-head"><div><strong>AI changes applied</strong><small>${escapeHtml(result.model || "model")}</small></div><button type="button" data-undo-ai>Undo AI change</button></div>
      ${changes ? `<div><span>What changed</span><ul>${changes}</ul></div>` : ""}
      ${notes ? `<div><span>Review notes</span><ul>${notes}</ul></div>` : ""}
    `;
    $("[data-undo-ai]", resultPanel)?.addEventListener("click", () => {
      if (!lastBeforeAi) return;
      api.replaceProject(lastBeforeAi);
      lastBeforeAi = null;
      resultPanel.hidden = true;
      api.toast("AI change undone");
    });
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  async function runAi(mode, instruction) {
    if (!connected && !(await testConnection(false))) {
      api.toast("Connect Workbench AI before running this action.");
      $("[data-ai-connection]")?.setAttribute("open", "");
      return;
    }
    if (mode === "generate" && !api.getSourcePrompt().trim() && !api.getReference().length && !api.getSourceFiles().length) {
      api.toast("Add a project brief or source material before generating.");
      return;
    }

    const activeButton = mode === "generate" ? generateButton : runButton;
    const originalText = activeButton.textContent;
    activeButton.disabled = true;
    activeButton.textContent = mode === "generate" ? "Generating project…" : "Applying changes…";
    setStatus("AI working…");

    try {
      const { files, skipped } = await buildFiles();
      lastBeforeAi = api.getProject();
      const current = api.getProject();
      const payload = {
        mode,
        instruction: instruction || "",
        sourcePrompt: api.getSourcePrompt(),
        reference: api.getReference(),
        assetManifest: assetManifest(),
        files,
        templateProject: mode === "generate" ? current : null,
        currentProject: mode === "transform" ? current : null
      };

      const response = await fetch(endpoint(), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "AI transformation failed.");

      api.replaceProject(json.project);
      renderResult({
        ...json,
        reviewNotes: [...(json.reviewNotes || []), ...(skipped.length ? [`Large source files were not sent to AI: ${skipped.join(", ")}`] : [])]
      });
      setStatus("AI connected", "ok");
      api.toast(mode === "generate" ? "AI project generated" : "AI changes applied");
    } catch (error) {
      setStatus("AI needs attention", "warn");
      api.toast(error.message);
      if (resultPanel) {
        resultPanel.hidden = false;
        resultPanel.innerHTML = `<div class="ai-error"><strong>AI action did not change your project.</strong><span>${escapeHtml(error.message)}</span></div>`;
      }
    } finally {
      activeButton.disabled = !connected;
      activeButton.textContent = originalText;
    }
  }

  function initializeConnectionFields() {
    if (endpointInput) endpointInput.value = defaultEndpoint();
    if (tokenInput) tokenInput.value = sessionStorage.getItem(TOKEN_KEY) || "";

    endpointInput?.addEventListener("change", () => {
      const value = endpointInput.value.trim();
      if (value && !value.startsWith("/")) localStorage.setItem(ENDPOINT_KEY, value);
      else localStorage.removeItem(ENDPOINT_KEY);
      setConnected(false);
    });

    tokenInput?.addEventListener("input", () => {
      if (tokenInput.value) sessionStorage.setItem(TOKEN_KEY, tokenInput.value);
      else sessionStorage.removeItem(TOKEN_KEY);
      setConnected(false);
    });
  }

  $("[data-test-ai]")?.addEventListener("click", () => testConnection(true));
  generateButton?.addEventListener("click", () => runAi("generate", "Create a complete branching scenario from the project brief and selected source materials. Use the current project as the structural template where helpful."));
  runButton?.addEventListener("click", () => {
    const prompt = $("[data-ai-prompt]")?.value.trim();
    if (!prompt) return api.toast("Tell AI what you want to change first.");
    runAi("transform", prompt);
  });

  initializeConnectionFields();
  setConnected(false);
  testConnection(false);
})();
