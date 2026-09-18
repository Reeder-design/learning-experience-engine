(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const api = window.LX_WORKBENCH;
  if (!api) return;

  let connected = false;
  let csrf = "";
  let lastBeforeAi = null;
  let localPrivateMode = false;

  const statusChip = $("[data-ai-status]");
  const connectionSummary = $("[data-ai-connection-summary]");
  const generateButton = $("[data-generate-ai]");
  const runButton = $("[data-run-ai]");
  const resultPanel = $("[data-ai-result]");
  const logoutButton = $("[data-workbench-logout]");

  function setStatus(text, tone = "neutral") {
    if (!statusChip) return;
    statusChip.textContent = text;
    statusChip.dataset.tone = tone;
  }

  function setConnected(value, detail = "") {
    connected = value;
    if (generateButton) generateButton.disabled = !value;
    if (runButton) runButton.disabled = !value;
    setStatus(value ? "AI connected" : localPrivateMode ? "AI not configured" : "Secure local mode", value ? "ok" : "warn");
    if (connectionSummary) {
      connectionSummary.textContent = detail || (value
        ? "Private local AI is ready"
        : localPrivateMode
          ? "Add an OpenAI API key to .env.workbench to enable AI"
          : "Open the password-protected local Workbench to use AI");
    }
  }

  async function loadSession(showToast = false) {
    try {
      const response = await fetch("/api/workbench-session", { credentials: "same-origin", cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.authenticated) throw new Error("Private Workbench session unavailable.");
      localPrivateMode = true;
      csrf = json.csrf || "";
      if (logoutButton) logoutButton.hidden = false;
      setConnected(Boolean(json.aiConfigured), json.aiConfigured
        ? `${json.model || "AI model"} ready in private local mode`
        : "Private Workbench is unlocked; add an OpenAI API key to enable AI");
      if (showToast) api.toast(json.aiConfigured ? "Workbench AI connected" : "Workbench unlocked; API key still needed");
      return Boolean(json.aiConfigured);
    } catch (_) {
      localPrivateMode = false;
      csrf = "";
      if (logoutButton) logoutButton.hidden = true;
      setConnected(false, "Open this page through npm run preview-docs and sign in to use private AI tools");
      return false;
    }
  }

  async function testConnection(showToast = true) {
    const sessionReady = await loadSession(false);
    if (!localPrivateMode) {
      if (showToast) api.toast("AI is available only in the password-protected local Workbench.");
      return false;
    }
    if (!sessionReady) {
      if (showToast) api.toast("Private Workbench is unlocked, but the OpenAI API key is not configured yet.");
      return false;
    }
    try {
      setStatus("Checking AI…");
      const response = await fetch("/api/workbench-ai", { method: "GET", credentials: "same-origin", cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok || !json.configured) throw new Error(json.error || "Workbench AI is not ready.");
      setConnected(true, `${json.model || "AI model"} ready in private local mode`);
      if (showToast) api.toast("Workbench AI connected");
      return true;
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

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[char]));
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

  async function runAi(mode, instruction) {
    if (!connected && !(await testConnection(false))) {
      api.toast(localPrivateMode
        ? "Add the OpenAI API key before running AI."
        : "Open the password-protected local Workbench before running AI.");
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

      const response = await fetch("/api/workbench-ai", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type":"application/json", "X-CSRF-Token":csrf },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (response.status === 401 || response.status === 403) {
        location.href = "/workbench-login";
        return;
      }
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

  $("[data-test-ai]")?.addEventListener("click", () => testConnection(true));

  generateButton?.addEventListener("click", () => runAi(
    "generate",
    "Create a complete branching scenario from the project brief and selected source materials. Use the current project as the structural template where helpful."
  ));

  runButton?.addEventListener("click", () => {
    const prompt = $("[data-ai-prompt]")?.value.trim();
    if (!prompt) return api.toast("Tell AI what you want to change first.");
    runAi("transform", prompt);
  });

  logoutButton?.addEventListener("click", async () => {
    if (!csrf) return;
    const response = await fetch("/api/workbench-logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token":csrf }
    });
    if (response.ok) location.href = "/workbench-login";
  });

  setConnected(false);
  loadSession(false);
})();
