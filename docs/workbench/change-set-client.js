(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const api = window.LX_WORKBENCH;
  if (!api) return;

  const prompt = $("[data-change-request]");
  const proposeButton = $("[data-propose-changes]");
  const proposalRoot = $("[data-change-set-proposal]");
  let csrf = "";
  let proposal = null;
  let proposalModel = "";

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char]));
  }

  function assetManifest() {
    return api.getSourceFiles().map((entry) => ({ path:entry.path, kind:entry.kind, name:entry.name }));
  }

  async function loadSession() {
    const response = await fetch("/api/workbench-session", { credentials:"same-origin", cache:"no-store" });
    const json = await response.json();
    if (!response.ok || !json.authenticated || !json.csrf) throw new Error("Open the password-protected local Workbench before asking AI for changes.");
    csrf = json.csrf;
    if (!json.aiConfigured) throw new Error("The Workbench is unlocked, but AI is not configured yet.");
  }

  async function request(payload) {
    const response = await fetch("/api/workbench-change-set", {
      method:"POST",
      credentials:"same-origin",
      headers:{ "Content-Type":"application/json", "X-CSRF-Token":csrf },
      body:JSON.stringify(payload)
    });
    const json = await response.json();
    if (response.status === 401 || response.status === 403) { location.href = "/workbench-login"; return null; }
    if (!response.ok || !json.ok) throw new Error(json.error || "The change request could not be completed.");
    return json;
  }

  function acceptedIds() {
    return $$('[data-change-accept]:checked', proposalRoot).map((input) => input.value);
  }

  function renderProposal() {
    if (!proposal || !proposalRoot) return;
    proposalRoot.hidden = false;
    proposalRoot.innerHTML = `<div><span class="eyebrow">Proposed change set</span><p class="change-set-summary">${escapeHtml(proposal.summary)}</p></div><div class="change-set-list">${proposal.changes.map((change) => `<label class="change-set-item"><input type="checkbox" data-change-accept value="${escapeHtml(change.id)}" checked><span><strong>${escapeHtml(change.label)}</strong><small>${escapeHtml(change.rationale)}</small><em class="change-set-meta">${escapeHtml(change.category)}</em></span></label>`).join("")}</div>${proposal.reviewNotes?.length ? `<div class="ai-note"><strong>Review notes</strong><span>${proposal.reviewNotes.map(escapeHtml).join(" · ")}</span></div>` : ""}<div class="change-set-review-actions"><span>${escapeHtml(proposalModel || "AI")} proposed ${proposal.changes.length} reviewable change${proposal.changes.length === 1 ? "" : "s"}.</span><div><button type="button" data-discard-changes>Discard proposal</button><button type="button" class="primary" data-apply-changes>Apply selected changes</button></div></div>`;
    $("[data-discard-changes]", proposalRoot)?.addEventListener("click", () => { proposal = null; proposalRoot.hidden = true; proposalRoot.innerHTML = ""; api.toast("Change proposal discarded"); });
    $("[data-apply-changes]", proposalRoot)?.addEventListener("click", applyChanges);
  }

  async function proposeChanges() {
    const instruction = prompt?.value.trim();
    if (!instruction) return api.toast("Tell AI what you want to change first.");
    const original = proposeButton.textContent;
    proposeButton.disabled = true;
    proposeButton.textContent = "Preparing proposal…";
    try {
      await loadSession();
      const json = await request({
        action:"propose",
        instruction,
        project:api.getProject(),
        profile:api.getProfile(),
        reference:api.getReference(),
        assetManifest:assetManifest()
      });
      if (!json) return;
      proposal = json.proposal;
      proposalModel = json.model || "AI";
      renderProposal();
      api.toast("AI proposal ready for review");
    } catch (error) {
      api.toast(error.message);
    } finally {
      proposeButton.disabled = false;
      proposeButton.textContent = original;
    }
  }

  async function applyChanges() {
    const selected = acceptedIds();
    if (!selected.length) return api.toast("Select at least one proposed change to apply.");
    const button = $("[data-apply-changes]", proposalRoot);
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Applying…";
    const beforeProject = api.getProject();
    const beforeProfile = api.getProfile();
    try {
      if (!csrf) await loadSession();
      const json = await request({
        action:"apply",
        project:beforeProject,
        profile:beforeProfile,
        proposal,
        acceptedChangeIds:selected,
        assetManifest:assetManifest()
      });
      if (!json) return;
      api.replaceProject(json.project, json.profile);
      api.addHistoryEntry({
        action:"Approved AI change set",
        prompt:prompt?.value.trim() || "AI change proposal",
        model:proposalModel,
        summary:(json.appliedChanges || []).map((change) => change.label),
        reviewNotes:proposal.reviewNotes || [],
        beforeProject,
        afterProject:json.project,
        beforeProfile,
        afterProfile:json.profile
      });
      proposal = null;
      proposalRoot.hidden = true;
      proposalRoot.innerHTML = "";
      api.switchTab("adapt");
      api.toast(`${selected.length} approved change${selected.length === 1 ? "" : "s"} applied`);
    } catch (error) {
      api.toast(error.message);
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  const presets = {
    sanitize:"Sanitize this course for a new client. Replace company, product, and identifying references with neutral placeholders while preserving the instructional intent. Flag any visuals or media that need replacement.",
    objectives:"Rewrite every learning objective as a clear, measurable performance outcome. Keep the instructional intent and existing course structure.",
    media:"Use the uploaded media where appropriate. Replace only learner-facing source media references that have a clear corresponding upload, and flag anything else as needing media.",
    theme:"Update the visual direction in the Project Profile for the requested brand. Preserve learner-facing content and interaction structure."
  };

  $$('[data-change-preset]').forEach((button) => button.addEventListener("click", () => { prompt.value = presets[button.dataset.changePreset] || ""; prompt.focus(); }));
  proposeButton?.addEventListener("click", proposeChanges);
})();
