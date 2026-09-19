(() => {
  const STORAGE_KEY = "lx-learning-project-workbench:v0.3";
  const LEGACY_STORAGE_KEYS = ["lx-learning-project-workbench:v0.1"];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
  const TEXT_EXT = new Set(["txt", "md", "markdown", "csv", "json"]);

  const templates = {
    "customer-discovery": {
      schemaVersion: "0.1",
      id: "customer-discovery-conversation",
      title: "Customer Discovery Conversation",
      type: "branching-scenario",
      description: "Practice uncovering business impact before moving to a solution recommendation.",
      instruction: "Choose the response that best advances the discovery conversation. Review the coaching feedback, then continue.",
      theme: "portfolio",
      completion: { strategy: "reach-outcome", required: true },
      content: {
        startNodeId: "opening",
        score: { enabled: false, label: "Decision quality", startingValue: 0, minimum: 0, maximum: 100, showToLearner: false },
        nodes: [
          {
            id: "opening",
            speaker: "Customer",
            title: "The customer describes a recurring operational problem.",
            body: "You have enough context to begin discovery, but you do not yet know the business impact or what success would look like.",
            image: "",
            alt: "",
            choices: [
              { id: "opening-discover", text: "Ask where the problem is happening and how it affects day-to-day operations.", targetId: "impact", feedback: "Good discovery move. You stayed focused on the customer problem instead of jumping to a recommendation.", scoreDelta: 10 },
              { id: "opening-pitch", text: "Explain why your solution is a strong fit and offer to schedule a demonstration.", targetId: "needs-more-discovery", feedback: "You moved to the solution before understanding enough about the customer need.", scoreDelta: -10 }
            ]
          },
          {
            id: "impact",
            speaker: "Customer",
            title: "The customer explains the operational consequences.",
            body: "The issue is now tied to lost time and inconsistent performance. You need to determine how they would define a successful outcome.",
            image: "",
            alt: "",
            choices: [
              { id: "impact-success", text: "Ask what would need to improve for them to consider the problem solved.", targetId: "clear-business-case", feedback: "You connected the pain point to measurable success criteria.", scoreDelta: 20 },
              { id: "impact-rush", text: "Move into pricing and implementation timing while the problem feels urgent.", targetId: "needs-more-discovery", feedback: "Urgency matters, but the desired outcome is still under-defined.", scoreDelta: -5 }
            ]
          }
        ],
        outcomes: [
          { id: "clear-business-case", title: "Clear business case", body: "You uncovered the operational impact and established what a successful outcome needs to accomplish.", image: "", alt: "", summary: "The next conversation can focus on solution fit, stakeholders, constraints, and a credible path to value." },
          { id: "needs-more-discovery", title: "More discovery needed", body: "The conversation moved toward a recommendation before enough customer context was established.", image: "", alt: "", summary: "Revisit the problem, operational impact, and desired outcomes before positioning a solution." }
        ]
      },
      metadata: { templateId: "customer-discovery", workbenchVersion: "0.1" }
    },
    "decision-practice": {
      schemaVersion: "0.1",
      id: "decision-practice",
      title: "Decision Practice with Coaching",
      type: "branching-scenario",
      description: "Practice making a judgment call, see immediate coaching, and experience the consequence of the decision.",
      instruction: "Choose the response you think is strongest, review the feedback, then continue to the outcome.",
      theme: "portfolio",
      completion: { strategy: "reach-outcome", required: true },
      content: {
        startNodeId: "decision-1",
        score: { enabled: false, label: "Decision quality", startingValue: 0, minimum: 0, maximum: 100, showToLearner: false },
        nodes: [
          {
            id: "decision-1",
            speaker: "Scenario",
            title: "A situation requires a decision.",
            body: "Replace this placeholder with the context the learner needs before choosing a response.",
            image: "",
            alt: "",
            choices: [
              { id: "choice-1", text: "Choose the response that demonstrates the desired behavior.", targetId: "strong-outcome", feedback: "Explain why this response aligns with the desired behavior.", scoreDelta: 0 },
              { id: "choice-2", text: "Choose a plausible but weaker response.", targetId: "coaching-outcome", feedback: "Explain the tradeoff or missed signal in this response.", scoreDelta: 0 }
            ]
          }
        ],
        outcomes: [
          { id: "strong-outcome", title: "Strong decision", body: "The learner applied the desired behavior.", image: "", alt: "", summary: "Reinforce the principle or next step." },
          { id: "coaching-outcome", title: "Coaching opportunity", body: "The learner chose a plausible response that missed an important consideration.", image: "", alt: "", summary: "Explain what to reconsider next time." }
        ]
      },
      metadata: { templateId: "decision-practice", workbenchVersion: "0.1" }
    },
    "objection-handling": {
      schemaVersion: "0.1",
      id: "objection-handling-conversation",
      title: "Objection Handling Conversation",
      type: "branching-scenario",
      description: "Practice responding to a realistic objection without becoming defensive or skipping discovery.",
      instruction: "Choose how you would respond, review the coaching, and continue the conversation.",
      theme: "portfolio",
      completion: { strategy: "reach-outcome", required: true },
      content: {
        startNodeId: "objection",
        score: { enabled: false, label: "Conversation quality", startingValue: 0, minimum: 0, maximum: 100, showToLearner: false },
        nodes: [
          {
            id: "objection",
            speaker: "Customer",
            title: "The customer raises a concern about moving forward.",
            body: "The objection may reflect a genuine constraint, missing information, or uncertainty. Your response should help uncover what is behind it.",
            image: "",
            alt: "",
            choices: [
              { id: "acknowledge", text: "Acknowledge the concern and ask a focused question to understand what is driving it.", targetId: "clarify", feedback: "You lowered pressure and created room to understand the objection before responding.", scoreDelta: 10 },
              { id: "counter", text: "Immediately explain why the concern should not prevent the customer from moving forward.", targetId: "defensive-outcome", feedback: "You responded to the objection before confirming what the customer actually meant.", scoreDelta: -10 }
            ]
          },
          {
            id: "clarify",
            speaker: "Customer",
            title: "The customer explains the concern in more detail.",
            body: "You now have enough information to respond directly to the real issue rather than the surface objection.",
            image: "",
            alt: "",
            choices: [
              { id: "respond-evidence", text: "Address the specific concern with relevant evidence and confirm whether it resolves the issue.", targetId: "productive-outcome", feedback: "You connected your response to the concern the customer actually described.", scoreDelta: 15 },
              { id: "generic-pitch", text: "Return to the standard value proposition to reinforce the overall solution.", targetId: "defensive-outcome", feedback: "The response is relevant to the product, but not specific enough to the concern you uncovered.", scoreDelta: -5 }
            ]
          }
        ],
        outcomes: [
          { id: "productive-outcome", title: "Productive next step", body: "The objection was clarified and addressed without derailing the conversation.", image: "", alt: "", summary: "Continue discovery and confirm the customer's next decision criteria." },
          { id: "defensive-outcome", title: "Conversation stalls", body: "The response focused on defending the solution instead of understanding the concern.", image: "", alt: "", summary: "Acknowledge the objection, clarify what is behind it, then respond to the actual issue." }
        ]
      },
      metadata: { templateId: "objection-handling", workbenchVersion: "0.1" }
    }
  };

  function defaultProfile() {
    return {
      schemaVersion: "0.1",
      experienceModel: "published-learning-web",
      source: {
        origin: "engine-native",
        structureModel: "interaction",
        templateId: "",
        notes: ""
      },
      learning: {
        audience: "",
        purpose: "",
        objectives: [],
        duration: "",
        prerequisites: ""
      },
      presentation: {
        accessibility: "Use meaningful alt text, captions/transcripts where needed, keyboard-friendly focus behavior, sufficient contrast, responsive layout, and reduced-motion support.",
        theme: {
          name: "Portfolio",
          layout: "clean-cards",
          brandNotes: "Clean, modern, instructional-design portfolio treatment.",
          colors: {
            primary: "#508484",
            secondary: "#79C99E",
            accent: "#97DB4F",
            background: "#ffffff",
            text: "#24302D"
          },
          typography: { heading: "Montserrat", body: "Open Sans" },
          logoTreatment: "",
          motion: "Subtle transitions; respect reduced-motion preferences.",
          targetNotes: { web: "", rise: "", storyline: "", lms: "" }
        }
      },
      behavior: {
        navigation: "branching",
        progress: "hidden",
        scoring: "none",
        feedback: "coaching"
      },
      export: {
        target: "web",
        notes: ""
      }
    };
  }

  function profileFromModel(model) {
    const saved = model?.metadata?.workbenchProfile;
    const base = defaultProfile();
    if (!saved || typeof saved !== "object") return base;
    return {
      ...base,
      ...clone(saved),
      source: { ...base.source, ...(saved.source || {}) },
      learning: { ...base.learning, ...(saved.learning || {}) },
      presentation: {
        ...base.presentation,
        ...(saved.presentation || {}),
        theme: {
          ...base.presentation.theme,
          ...(saved.presentation?.theme || {}),
          colors: { ...base.presentation.theme.colors, ...(saved.presentation?.theme?.colors || {}) },
          typography: { ...base.presentation.theme.typography, ...(saved.presentation?.theme?.typography || {}) },
          targetNotes: { ...base.presentation.theme.targetNotes, ...(saved.presentation?.theme?.targetNotes || {}) }
        }
      },
      behavior: { ...base.behavior, ...(saved.behavior || {}) },
      export: { ...base.export, ...(saved.export || {}) }
    };
  }

  function getPath(object, path) {
    return String(path).split(".").reduce((value, key) => value?.[key], object);
  }

  function setPath(object, path, value) {
    const keys = String(path).split(".");
    let cursor = object;
    keys.slice(0, -1).forEach((key) => {
      if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
      cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
  }

  function syncScoringFromProfile() {
    if (state.model?.type === "rise-course" || state.model?.type === "storyline-experience") return;
    if (!state.model?.content?.score) return;
    const mode = state.profile?.behavior?.scoring || "none";
    state.model.content.score.enabled = mode !== "none";
    state.model.content.score.showToLearner = mode === "visible";
    document.body.dataset.scoring = mode;
    if (!state.model.content.score.label) state.model.content.score.label = "Decision quality";
  }

  function blankScenario() {
    return {
      schemaVersion: "0.1",
      id: "new-scenario",
      title: "New Branching Scenario",
      type: "branching-scenario",
      description: "",
      instruction: "Choose the response that best fits the situation.",
      theme: "portfolio",
      completion: { strategy: "reach-outcome", required: true },
      content: {
        startNodeId: "decision-1",
        score: { enabled: false, label: "Decision quality", startingValue: 0, minimum: 0, maximum: 100, showToLearner: false },
        nodes: [
          {
            id: "decision-1",
            speaker: "",
            title: "What is happening?",
            body: "Add the information the learner needs before making this decision.",
            image: "",
            alt: "",
            choices: [
              { id: "choice-1", text: "First learner response", targetId: "outcome-1", feedback: "Add coaching feedback for this response.", scoreDelta: 0 },
              { id: "choice-2", text: "Second learner response", targetId: "outcome-1", feedback: "Add coaching feedback for this response.", scoreDelta: 0 }
            ]
          }
        ],
        outcomes: [
          { id: "outcome-1", title: "Outcome", body: "Describe what happened.", image: "", alt: "", summary: "Add the learner takeaway or next step." }
        ]
      },
      metadata: { workbenchVersion: "0.1" }
    };
  }

  const state = {
    model: null,
    sourcePrompt: "",
    sourceFiles: [],
    reference: [],
    objectUrls: new Map(),
    inlineAssets: new Map(),
    mediaStreams: new Map(),
    activeTab: "source",
    activeTool: null,
    profile: defaultProfile(),
    history: [],
    saveTimer: null
  };

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function escapeAttr(value = "") { return escapeHtml(value); }
  function slug(value = "project") { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "project"; }
  function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }
  function ext(name = "") { return (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || ""; }

  function classify(file) {
    const extension = ext(file.name);
    if (IMAGE_EXT.has(extension)) return "image";
    if (TEXT_EXT.has(extension)) return "reference";
    if (["pdf", "doc", "docx", "ppt", "pptx"].includes(extension)) return "document";
    if (["mp4", "webm", "mov", "m4v"].includes(extension)) return "video";
    if (["mp3", "wav", "m4a", "aac", "ogg"].includes(extension)) return "audio";
    if (["vtt", "srt"].includes(extension)) return "caption";
    return "other";
  }

  function revokeUrls() {
    for (const url of state.objectUrls.values()) URL.revokeObjectURL(url);
    state.objectUrls.clear();
  }

  function clearProjectResources() {
    revokeUrls();
    state.sourceFiles = [];
    state.reference = [];
    state.inlineAssets.clear();
    state.mediaStreams.clear();
  }

  function filePath(file, fromFolder = false) {
    if (fromFolder && file.webkitRelativePath) return file.webkitRelativePath.split("/").slice(1).join("/") || file.name;
    const folder = {
      image: "assets/images",
      video: "assets/video",
      audio: "assets/audio",
      caption: "assets/captions",
      document: "assets/documents",
      reference: "context",
      other: "assets/other"
    }[classify(file)] || "assets/other";
    return `${folder}/${file.name}`;
  }

  function validScenario(model) {
    return !!(model && model.type === "branching-scenario" && model.schemaVersion === "0.1" && Array.isArray(model.content?.nodes) && model.content.nodes.length && Array.isArray(model.content?.outcomes) && model.content.outcomes.length);
  }

  function validRiseCourse(model) {
    return !!(model && model.type === "rise-course" && model.schemaVersion === "0.1" && Array.isArray(model.content?.lessons) && model.content.lessons.length);
  }

  function validStorylineExperience(model) {
    return !!(model && model.type === "storyline-experience" && model.schemaVersion === "0.1" && Array.isArray(model.content?.scenes) && model.content.scenes.length);
  }

  function validProject(model) { return validScenario(model) || validRiseCourse(model) || validStorylineExperience(model); }
  function isRiseCourse() { return state.model?.type === "rise-course"; }
  function isStorylineExperience() { return state.model?.type === "storyline-experience"; }
  function isImportedProject() { return isRiseCourse() || isStorylineExperience(); }

  function setText(selector, text) {
    const element = $(selector);
    if (element) element.textContent = text;
  }

  function destinationItems() {
    if (!validScenario(state.model)) return [];
    return [
      ...state.model.content.nodes.map((item) => ({ id: item.id, label: `Next decision · ${item.title || item.id}` })),
      ...state.model.content.outcomes.map((item) => ({ id: item.id, label: `Outcome · ${item.title || item.id}` }))
    ];
  }

  function imageOptions(value = "") {
    const images = state.sourceFiles.filter((item) => item.kind === "image");
    let html = '<option value="">No image</option>';
    for (const item of images) html += `<option value="${escapeAttr(item.path)}"${item.path === value ? " selected" : ""}>${escapeHtml(item.name)}</option>`;
    if (value && !images.some((item) => item.path === value)) html += `<option value="${escapeAttr(value)}" selected>${escapeHtml(value.split("/").pop() || value)}</option>`;
    return html;
  }

  function assetUrl(path) { return state.objectUrls.get(path) || state.inlineAssets.get(path) || null; }

  function mediaUrl(asset = {}) {
    return assetUrl(`asset:${asset.id}`) || assetUrl(asset.path) || state.mediaStreams.get(asset.id) || null;
  }

  function registerPreviewAssets(assets = []) {
    state.inlineAssets.clear();
    assets.forEach((asset) => {
      if (!asset?.dataUrl) return;
      if (asset.id) state.inlineAssets.set(`asset:${asset.id}`, asset.dataUrl);
      if (asset.path) state.inlineAssets.set(asset.path, asset.dataUrl);
    });
  }

  function registerMediaStreams(streams = []) {
    state.mediaStreams.clear();
    streams.forEach((stream) => {
      if (stream?.assetId && stream.url) state.mediaStreams.set(stream.assetId, stream.url);
    });
  }

  function mediaPlayerMarkup(asset, compact = false) {
    const url = mediaUrl(asset);
    const label = escapeHtml(asset.fileName || String(asset.path || asset.id || "Media asset").split("/").pop());
    const kind = asset.kind || "other";
    if (!url) return `<article class="media-card media-card--missing"><strong>NEEDS MEDIA</strong><span>${label}</span><small>This media reference was found, but its file is not available in this preview.</small></article>`;
    if (kind === "image") return `<article class="media-card${compact ? " media-card--compact" : ""}"><img src="${escapeAttr(url)}" alt="${label}"><strong>${label}</strong><small>Image asset</small></article>`;
    if (kind === "audio") return `<article class="media-card${compact ? " media-card--compact" : ""}"><strong>${label}</strong><audio controls preload="metadata" src="${escapeAttr(url)}"></audio><small>Audio asset</small></article>`;
    if (kind === "video" || kind === "hls") return `<article class="media-card${compact ? " media-card--compact" : ""}"><strong>${label}</strong><video controls playsinline preload="metadata" src="${escapeAttr(url)}"></video><small>${kind === "hls" ? "HLS stream · Safari plays this directly; other browsers may need the original published player." : "Video asset"}</small></article>`;
    if (kind === "caption") return `<article class="media-card${compact ? " media-card--compact" : ""}"><strong>${label}</strong><a href="${escapeAttr(url)}" target="_blank" rel="noopener">Open caption file</a><small>Caption / transcript asset</small></article>`;
    return `<article class="media-card${compact ? " media-card--compact" : ""}"><strong>${label}</strong><a href="${escapeAttr(url)}" target="_blank" rel="noopener">Open source file</a><small>${escapeHtml(kind)} asset</small></article>`;
  }

  function mediaInventory() {
    const imported = (state.model?.metadata?.assetManifest || []).map((asset) => ({ ...asset, source:"published export" }));
    const source = state.sourceFiles.filter((file) => ["image", "audio", "video", "caption"].includes(file.kind)).map((file, index) => ({ id:`source-${index}-${file.path}`, path:file.path, fileName:file.name, kind:file.kind, source:"added source" }));
    const seen = new Set();
    return [...imported, ...source].filter((asset) => {
      const key = `${asset.source}:${asset.id || asset.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return ["image", "audio", "video", "hls", "caption"].includes(asset.kind);
    });
  }

  function renderMediaLibrary() {
    const root = $("[data-media-library]");
    if (!root) return;
    const assets = mediaInventory();
    root.hidden = !assets.length;
    if (!assets.length) return;
    const available = assets.filter((asset) => mediaUrl(asset)).length;
    root.innerHTML = `<details><summary><strong>Media library</strong><span>${assets.length} media asset${assets.length === 1 ? "" : "s"} · ${available} ready to preview</span></summary><p>Each file is a <strong>media asset</strong>. A slide or lesson points to it through a <strong>media reference</strong>. HLS video is a <strong>media bundle</strong>: a playlist plus its video segments.</p><div class="media-grid">${assets.map((asset) => mediaPlayerMarkup(asset)).join("")}</div></details>`;
  }

  function importedMediaMarkup() {
    const assets = state.model?.metadata?.assetManifest || [];
    const previewable = assets.filter((asset) => mediaUrl(asset));
    if (!previewable.length) return "";
    const cards = previewable.map((asset) => {
      const url = mediaUrl(asset);
      const label = escapeHtml(String(asset.path || asset.id || "Imported asset").split("/").pop());
      if (asset.kind === "image") return `<figure class="learner-feedback"><img class="learner-image" src="${escapeAttr(url)}" alt="${label}"><figcaption>${label}</figcaption></figure>`;
      if (asset.kind === "audio") return `<div class="learner-feedback"><strong>${label}</strong><audio controls src="${escapeAttr(url)}"></audio></div>`;
      if (asset.kind === "video" || asset.kind === "hls") return `<div class="learner-feedback"><strong>${label}</strong><video controls playsinline preload="metadata" src="${escapeAttr(url)}"></video></div>`;
      return "";
    }).join("");
    return cards ? `<div class="learner-prompt">Imported media available in this browser session</div>${cards}` : "";
  }

  function storylineSlideMedia(slide) {
    const manifest = new Map((state.model?.metadata?.assetManifest || []).map((asset) => [asset.id, asset]));
    const objects = (slide.layers || []).flatMap((layer) => layer.objects || []);
    const references = [];
    objects.forEach((object) => (object.assets || []).forEach((id) => {
      const asset = manifest.get(id);
      if (asset && !references.some((item) => item.asset.id === asset.id && item.object.id === object.id)) references.push({ asset, object });
    }));
    const assetUrlFor = (asset) => mediaUrl(asset);
    const canvasArea = Math.max(1, Number(slide.canvas?.width || 0) * Number(slide.canvas?.height || 0));
    const visualCandidates = references.filter(({ asset }) => asset.kind === "image" && assetUrlFor(asset));
    visualCandidates.sort((a, b) => {
      const aArea = Number(a.object.bounds?.width || 0) * Number(a.object.bounds?.height || 0);
      const bArea = Number(b.object.bounds?.width || 0) * Number(b.object.bounds?.height || 0);
      return bArea - aArea;
    });
    const background = visualCandidates.find(({ object }) => {
      const area = Number(object.bounds?.width || 0) * Number(object.bounds?.height || 0);
      return area / canvasArea >= 0.5;
    }) || null;
    return {
      background,
      references,
      inlineImages:visualCandidates.filter((item) => item !== background),
      missing:references.filter(({ asset }) => !assetUrlFor(asset)),
      assetUrlFor,
    };
  }

  function storylineMediaMarkup(media) {
    const images = media.inlineImages.slice(0, 2).map(({ asset }) => `<img class="storyline-inline-image" src="${escapeAttr(media.assetUrlFor(asset))}" alt="">`).join("");
    const missing = media.missing.length ? '<div class="storyline-needs-media">NEEDS MEDIA</div>' : "";
    const players = media.references.filter(({ asset }) => asset.kind !== "image" && media.assetUrlFor(asset)).map(({ asset }) => mediaPlayerMarkup(asset, true)).join("");
    return images || missing || players ? `<div class="storyline-media-strip">${images}${players}${missing}</div>` : "";
  }

  function startProject(model, prompt = "") {
    clearProjectResources();
    state.model = clone(model);
    state.profile = profileFromModel(model);
    state.profile.source.templateId = model?.metadata?.templateId || state.profile.source.templateId || "";
    state.history = [];
    state.sourcePrompt = prompt;
    state.activeTab = "source";
    syncScoringFromProfile();
    $("[data-start-panel]").hidden = true;
    $("[data-workspace]").hidden = false;
    renderAll();
    saveDraft();
    switchTab("source");
  }

  function switchTab(name) {
    state.activeTab = name;
    $$("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
    $$("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
    if (name === "preview") renderPreview();
    if (name === "adapt" || name === "preview") renderProfileFields();
    const job = {
      source: "Review the imported structure and flag what needs attention before changing content.",
      edit: "Edit only the learner-facing content you want to change; source mapping stays available in project data.",
      adapt: "Set the intended visual direction and capture the small amount of reuse context that matters.",
      preview: "Test the learner view, then package the editable draft for its next handoff."
    }[name] || "Keep the learning experience moving with one clear next step.";
    setText("[data-current-job]", job);
    window.scrollTo({ top: Math.max(0, $("[data-workspace]").offsetTop - 72), behavior: "smooth" });
  }

  function applyThemePreset(value) {
    const presets = {
      portfolio: { name:"Calm studio", layout:"clean-cards", colors:{ primary:"#508484", secondary:"#79C99E", accent:"#97DB4F", background:"#ffffff", text:"#24302D" }, typography:{ heading:"Montserrat", body:"Open Sans" } },
      editorial: { name:"Editorial learning", layout:"editorial", colors:{ primary:"#5B4B8A", secondary:"#CFC1E8", accent:"#E4A46D", background:"#FFFDF9", text:"#2E2938" }, typography:{ heading:"Georgia", body:"Open Sans" } },
      "technical-dark": { name:"Workshop dark", layout:"technical-dark", colors:{ primary:"#9DE2CB", secondary:"#5E9E93", accent:"#F5C47B", background:"#16221F", text:"#F0F6F1" }, typography:{ heading:"Montserrat", body:"Open Sans" } },
      minimal: { name:"Minimal course", layout:"minimal", colors:{ primary:"#2E5266", secondary:"#BBD5E5", accent:"#EAB464", background:"#FFFFFF", text:"#1D2730" }, typography:{ heading:"Arial", body:"Arial" } }
    };
    const preset = presets[value] || presets.portfolio;
    state.profile.presentation.theme = {
      ...state.profile.presentation.theme,
      ...clone(preset),
      targetNotes: { ...(state.profile.presentation.theme.targetNotes || {}) }
    };
    renderProfileFields();
    renderPreview();
    saveDraft();
    toast(`${preset.name} preview applied`);
  }

  function renderProjectMeta() {
    setText("[data-project-title]", state.model.title || "Untitled scenario");
    if (isRiseCourse()) {
      const lessons = state.model.content.lessons || [];
      const blocks = lessons.reduce((total, lesson) => total + (Array.isArray(lesson.blocks) ? lesson.blocks.length : 0), 0);
      setText("[data-project-summary]", `${lessons.length} lesson${lessons.length === 1 ? "" : "s"} · ${blocks} normalized block${blocks === 1 ? "" : "s"}`);
    } else if (isStorylineExperience()) {
      const scenes = state.model.content.scenes || [];
      const slides = scenes.reduce((total, scene) => total + (scene.slides || []).length, 0);
      setText("[data-project-summary]", `${scenes.length} scene${scenes.length === 1 ? "" : "s"} · ${slides} slide${slides === 1 ? "" : "s"}`);
    } else {
      setText("[data-project-summary]", `${state.model.content.nodes.length} decision${state.model.content.nodes.length === 1 ? "" : "s"} · ${state.model.content.outcomes.length} outcome${state.model.content.outcomes.length === 1 ? "" : "s"}`);
    }
    $("[data-source-prompt]").value = state.sourcePrompt || "";
    $("[data-project-field=\"title\"]").value = state.model.title || "";
    $("[data-project-field=\"description\"]").value = state.model.description || "";
    $("[data-project-field=\"instruction\"]").value = state.model.instruction || "";
    const aiButton = $("[data-open-tool=\"ai\"]");
    if (aiButton) {
      aiButton.disabled = isImportedProject();
      $("small", aiButton).textContent = isImportedProject() ? "Manual review for imported drafts" : "Generate or transform";
    }
    const imported = isImportedProject();
    setText("[data-source-heading]", imported ? "Your imported experience is ready to review" : "What should this experience become?");
    setText("[data-source-description]", imported
      ? "The published export is now an editable normalized draft. Continue to Build & edit to review learner-facing content, then test it in Preview."
      : "Describe the learning need in normal language, then add the source materials and assets the experience should use.");
    setText("[data-source-next-title]", imported ? "Ready to review the imported draft?" : "Ready to build?");
    setText("[data-source-next-description]", imported
      ? "Open the editor to review scenes, slides, layers, and learner-facing text."
      : "Generate a complete experience from the brief/source or continue into the current project and edit manually.");
    const generate = $("[data-generate-ai]");
    if (generate) generate.hidden = imported;
    const edit = $("[data-go-edit]");
    if (edit) {
      edit.classList.toggle("primary", imported);
      edit.textContent = imported ? "Review imported content →" : "Build & edit →";
    }
    renderProfileFields();
  }

  function renderSourceFiles() {
    const root = $("[data-source-file-list]");
    root.innerHTML = "";
    if (!state.sourceFiles.length) root.innerHTML = isImportedProject()
      ? '<div class="empty-state">The published export is already connected as this project’s source. Add extra files only if you need supporting material.</div>'
      : '<div class="empty-state">No source files added yet.</div>';
    for (const entry of state.sourceFiles) {
      const row = document.createElement("div");
      row.className = "source-file";
      row.innerHTML = `<div><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.kind)} · ${escapeHtml(entry.path)}</small></div><small>${Math.max(1, Math.round(entry.file.size / 1024))} KB</small>`;
      root.appendChild(row);
    }

    const wrap = $("[data-reference-content]");
    const list = $("[data-reference-list]");
    list.innerHTML = "";
    for (const entry of state.reference) {
      const details = document.createElement("details");
      details.innerHTML = `<summary>${escapeHtml(entry.path)}</summary><pre>${escapeHtml(entry.text)}</pre>`;
      list.appendChild(details);
    }
    wrap.hidden = !state.reference.length;
    renderMediaLibrary();
  }

  function renderEditor() {
    renderProjectMeta();
    const nodes = $("[data-decision-list]");
    const outcomes = $("[data-outcome-list]");
    const toolbar = $(".edit-toolbar");
    const sectionLabels = $$(".section-label", nodes.parentElement);
    nodes.innerHTML = "";
    if (isStorylineExperience()) {
      toolbar.hidden = true;
      if (sectionLabels[0]) sectionLabels[0].innerHTML = "<span>Imported scenes and slides</span><small>Editable normalized learner-facing text and layer labels</small>";
      if (sectionLabels[1]) sectionLabels[1].innerHTML = "<span>Imported runtime notes</span><small>Structure detected from the published Storyline web export</small>";
      state.model.content.scenes.forEach((scene, index) => nodes.appendChild(storylineSceneCard(scene, index)));
      outcomes.innerHTML = "";
      outcomes.appendChild(storylineImportNotes());
      renderFlowCheck();
      renderJson();
      return;
    }
    if (isRiseCourse()) {
      toolbar.hidden = true;
      if (sectionLabels[0]) sectionLabels[0].innerHTML = "<span>Imported lessons</span><small>Editable normalized learner-facing content</small>";
      if (sectionLabels[1]) sectionLabels[1].innerHTML = "<span>Imported assessments</span><small>Questions preserved from the published Rise export</small>";
      state.model.content.lessons.filter((lesson) => lesson.kind !== "assessment").forEach((lesson, index) => nodes.appendChild(riseLessonCard(lesson, index)));
      outcomes.innerHTML = "";
      state.model.content.lessons.filter((lesson) => lesson.kind === "assessment").forEach((lesson, index) => outcomes.appendChild(riseAssessmentCard(lesson, index)));
      if (!outcomes.children.length) outcomes.innerHTML = '<div class="empty-state">No scored Rise assessment was found in this export.</div>';
      renderFlowCheck();
      renderJson();
      return;
    }
    toolbar.hidden = false;
    if (sectionLabels[0]) sectionLabels[0].innerHTML = "<span>Decision points</span><small>Situation → learner responses → coaching → destination</small>";
    if (sectionLabels[1]) sectionLabels[1].innerHTML = "<span>Outcomes</span><small>Where the learner can finish the experience.</small>";
    state.model.content.nodes.forEach((node, index) => nodes.appendChild(decisionCard(node, index)));

    outcomes.innerHTML = "";
    state.model.content.outcomes.forEach((outcome, index) => outcomes.appendChild(outcomeCard(outcome, index)));
    renderFlowCheck();
    renderJson();
  }

  function storylineSceneCard(scene, index) {
    const card = document.createElement("article");
    card.className = "scenario-card";
    const slides = Array.isArray(scene.slides) ? scene.slides : [];
    card.innerHTML = `<div class="scenario-head"><div><span class="eyebrow">Scene ${index + 1}</span><strong>${escapeHtml(scene.title || "Untitled scene")}</strong></div><small>${slides.length} slide${slides.length === 1 ? "" : "s"}</small></div><div class="field-grid"><label class="wide"><span>Scene title</span><input data-storyline-scene-title value="${escapeAttr(scene.title || "")}"></label></div><div class="choices" data-storyline-slides></div>`;
    $("[data-storyline-scene-title]", card).addEventListener("input", (event) => { scene.title = event.target.value; touch(false); });
    const root = $("[data-storyline-slides]", card);
    if (!slides.length) root.innerHTML = '<div class="empty-state">No published slides were found in this scene.</div>';
    slides.forEach((slide, slideIndex) => root.appendChild(storylineSlideCard(slide, slideIndex)));
    return card;
  }

  function storylineSlideCard(slide, index) {
    const card = document.createElement("div");
    card.className = "choice-card";
    const layers = Array.isArray(slide.layers) ? slide.layers : [];
    const detail = `${layers.length} layer${layers.length === 1 ? "" : "s"} · ${slide.metadata?.objectCount || 0} object${slide.metadata?.objectCount === 1 ? "" : "s"} · ${slide.metadata?.actionCount || 0} action${slide.metadata?.actionCount === 1 ? "" : "s"}`;
    card.innerHTML = `<div class="choices-head"><strong>Slide ${index + 1} · ${escapeHtml(slide.title || "Untitled slide")}</strong><small>${escapeHtml(detail)}</small></div><label class="wide"><span>Slide title</span><input data-storyline-slide-title value="${escapeAttr(slide.title || "")}"></label><div class="choices" data-storyline-layers></div>`;
    $("[data-storyline-slide-title]", card).addEventListener("input", (event) => { slide.title = event.target.value; touch(false); });
    const root = $("[data-storyline-layers]", card);
    if (!layers.length) root.innerHTML = '<small>This published slide could not be fully decoded. Its slide title and source mapping are preserved for review.</small>';
    layers.forEach((layer, layerIndex) => root.appendChild(storylineLayerCard(layer, layerIndex)));
    return card;
  }

  function storylineLayerCard(layer, index) {
    const card = document.createElement("div");
    card.className = "choice-card";
    const objects = Array.isArray(layer.objects) ? layer.objects : [];
    card.innerHTML = `<div class="choices-head"><strong>${escapeHtml(layer.kind === "base" ? "Base layer" : `Layer ${index + 1}`)} · ${escapeHtml(layer.title || "Untitled layer")}</strong><small>${objects.length} object${objects.length === 1 ? "" : "s"}</small></div><label class="wide"><span>Layer title</span><input data-storyline-layer-title value="${escapeAttr(layer.title || "")}"></label><div class="field-grid">${objects.map((object, objectIndex) => `<label><span>${escapeHtml(object.kind || "Object")} ${objectIndex + 1}</span><input data-storyline-object="${objectIndex}" value="${escapeAttr(object.title || "")}" placeholder="No exposed text or alt text"></label>`).join("")}</div>`;
    $("[data-storyline-layer-title]", card).addEventListener("input", (event) => { layer.title = event.target.value; touch(false); });
    $$('[data-storyline-object]', card).forEach((input) => input.addEventListener("input", () => {
      const object = objects[Number(input.dataset.storylineObject)];
      object.title = input.value;
      object.accessibility = { ...(object.accessibility || {}), altText: input.value };
      touch(false);
    }));
    return card;
  }

  function storylineImportNotes() {
    const card = document.createElement("article");
    card.className = "outcome-card";
    const summary = state.model.metadata?.importSummary || {};
    const variables = state.model.metadata?.variables || [];
    card.innerHTML = `<div class="outcome-head"><div><span class="eyebrow">Published-web import</span><strong>Review runtime behavior before reuse</strong></div></div><p>This editable draft preserves scene, slide, layer, object-state, and action counts from the published Storyline web export. Trigger sequencing, conditions, variable behavior, media timelines, and custom JavaScript remain source-derived review items in this first pass.</p><div class="field-grid"><div><span>Parsed slides</span><strong>${Number(summary.parsedSlides || 0)} / ${Number(summary.slides || 0)}</strong></div><div><span>Layers</span><strong>${Number(summary.layers || 0)}</strong></div><div><span>Objects</span><strong>${Number(summary.objects || 0)}</strong></div><div><span>Detected actions</span><strong>${Number(summary.actions || 0)}</strong></div></div>${variables.length ? `<p><strong>Project variables:</strong> ${escapeHtml(variables.map((item) => item.name).filter(Boolean).join(", ") || "present in source data")}</p>` : ""}`;
    return card;
  }

  function riseTextField(block) {
    const content = block.content || {};
    const keys = ["body", "text", "description", "caption", "heading", "subheading", "quote", "prompt"];
    const key = keys.find((candidate) => typeof content[candidate] === "string") || "body";
    return { content, key, value: content[key] || "" };
  }

  function riseLessonCard(lesson, index) {
    const card = document.createElement("article");
    card.className = "scenario-card";
    const blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
    card.innerHTML = `<div class="scenario-head"><div><span class="eyebrow">Lesson ${index + 1}</span><strong>${escapeHtml(lesson.title || "Untitled lesson")}</strong></div><small>${blocks.length} block${blocks.length === 1 ? "" : "s"}</small></div><div class="field-grid"><label class="wide"><span>Lesson title</span><input data-rise-lesson-title value="${escapeAttr(lesson.title || "")}"></label><label class="wide"><span>Lesson description</span><textarea rows="2" data-rise-lesson-description>${escapeHtml(lesson.description || "")}</textarea></label></div><div class="choices" data-rise-blocks></div>`;
    $("[data-rise-lesson-title]", card).addEventListener("input", (event) => { lesson.title = event.target.value; touch(false); });
    $("[data-rise-lesson-description]", card).addEventListener("input", (event) => { lesson.description = event.target.value; touch(false); });
    const root = $("[data-rise-blocks]", card);
    if (!blocks.length) root.innerHTML = '<div class="empty-state">This lesson has no editable content blocks in the published export.</div>';
    blocks.forEach((block, blockIndex) => root.appendChild(riseBlockCard(block, blockIndex)));
    return card;
  }

  function riseBlockCard(block, index) {
    const card = document.createElement("div");
    card.className = "choice-card";
    const field = riseTextField(block);
    card.innerHTML = `<div class="choices-head"><strong>Block ${index + 1} · ${escapeHtml(block.kind || "custom")}</strong><small>${escapeHtml(block.variant || "Preserved normalized block")}</small></div><label class="wide"><span>Block title</span><input data-rise-block-title value="${escapeAttr(block.title || "")}"></label><label class="wide"><span>Editable content</span><textarea rows="3" data-rise-block-content>${escapeHtml(field.value)}</textarea></label>${field.value ? "" : '<small>There is no single text field to expose for this block. Its normalized source data remains available in Developer project data.</small>'}`;
    $("[data-rise-block-title]", card).addEventListener("input", (event) => { block.title = event.target.value; touch(false); });
    $("[data-rise-block-content]", card).addEventListener("input", (event) => { block.content = { ...field.content, [field.key]: event.target.value }; touch(false); });
    return card;
  }

  function riseAssessmentCard(assessment, index) {
    const card = document.createElement("article");
    card.className = "outcome-card";
    const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
    card.innerHTML = `<div class="outcome-head"><div><span class="eyebrow">Assessment ${index + 1}</span><strong>${escapeHtml(assessment.title || "Untitled assessment")}</strong></div><small>${questions.length} question${questions.length === 1 ? "" : "s"}</small></div><div class="field-grid"><label class="wide"><span>Assessment title</span><input data-rise-assessment-title value="${escapeAttr(assessment.title || "")}"></label></div><div class="choices" data-rise-questions></div>`;
    $("[data-rise-assessment-title]", card).addEventListener("input", (event) => { assessment.title = event.target.value; touch(false); });
    const root = $("[data-rise-questions]", card);
    questions.forEach((question, questionIndex) => {
      const questionCard = document.createElement("div");
      questionCard.className = "choice-card";
      questionCard.innerHTML = `<div class="choices-head"><strong>Question ${questionIndex + 1} · ${escapeHtml(question.type || "custom")}</strong></div><label class="wide"><span>Question prompt</span><textarea rows="2" data-rise-question-prompt>${escapeHtml(question.prompt || "")}</textarea></label><div class="field-grid">${(question.answers || []).map((answer, answerIndex) => `<label><span>Answer ${answerIndex + 1}${answer.correct ? " · correct" : ""}</span><input data-rise-answer="${answerIndex}" value="${escapeAttr(answer.text || "")}"></label>`).join("")}</div>`;
      $("[data-rise-question-prompt]", questionCard).addEventListener("input", (event) => { question.prompt = event.target.value; touch(false); });
      $$('[data-rise-answer]', questionCard).forEach((input) => input.addEventListener("input", () => { question.answers[Number(input.dataset.riseAnswer)].text = input.value; touch(false); }));
      root.appendChild(questionCard);
    });
    if (!questions.length) root.innerHTML = '<div class="empty-state">No editable questions were found in this assessment.</div>';
    return card;
  }

  function decisionCard(node, index) {
    const card = document.createElement("article");
    card.className = "scenario-card";
    card.innerHTML = `<div class="scenario-head"><div><span class="eyebrow">Decision ${index + 1}</span><strong>${escapeHtml(node.title || "Untitled decision")}</strong></div><div class="card-actions"><button type="button" data-up>↑</button><button type="button" data-down>↓</button><button type="button" data-copy>Duplicate</button><button type="button" data-delete>Delete</button></div></div><div class="field-grid"><label><span>Who is speaking?</span><input data-node-field="speaker" value="${escapeAttr(node.speaker || "")}"></label><label class="wide"><span>What's happening?</span><input data-node-field="title" value="${escapeAttr(node.title || "")}"></label><label class="wide"><span>What does the learner know?</span><textarea rows="3" data-node-field="body">${escapeHtml(node.body || "")}</textarea></label><label><span>Image</span><select data-node-field="image">${imageOptions(node.image || "")}</select></label><label><span>Alt text</span><input data-node-field="alt" value="${escapeAttr(node.alt || "")}"></label></div><div class="choices"><div class="choices-head"><strong>Learner responses</strong><button type="button" data-add-choice>+ Response</button></div><div class="choices-list" data-choices></div></div>`;

    const choiceRoot = $("[data-choices]", card);
    node.choices.forEach((choice, choiceIndex) => choiceRoot.appendChild(choiceCard(node, choice, choiceIndex)));

    $("[data-node-field]", card).forEach((input) => input.addEventListener("input", () => {
      const key = input.dataset.nodeField;
      node[key] = input.value;
      if (key === "title") $(".scenario-head strong", card).textContent = node.title || "Untitled decision";
      touch(false);
    }));

    $("[data-add-choice]", card).addEventListener("click", () => {
      node.choices.push({ id: uid("choice"), text: "New learner response", targetId: state.model.content.outcomes[0]?.id || "", feedback: "Add coaching feedback.", scoreDelta: 0 });
      touch(true);
    });
    $("[data-up]", card).addEventListener("click", () => move(state.model.content.nodes, index, -1));
    $("[data-down]", card).addEventListener("click", () => move(state.model.content.nodes, index, 1));
    $("[data-copy]", card).addEventListener("click", () => duplicateNode(index));
    $("[data-delete]", card).addEventListener("click", () => deleteNode(index));
    return card;
  }

  function choiceCard(node, choice, index) {
    const card = document.createElement("div");
    card.className = "choice-card";
    const options = destinationItems().map((item) => `<option value="${escapeAttr(item.id)}"${item.id === choice.targetId ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("");
    card.innerHTML = `<button type="button" class="choice-delete" data-delete aria-label="Delete response">×</button><label class="wide"><span>Learner response ${index + 1}</span><input data-choice-field="text" value="${escapeAttr(choice.text || "")}"></label><label><span>What happens next?</span><select data-choice-field="targetId"><option value="">Choose destination…</option>${options}</select></label><label class="score-field"><span>Impact on score</span><input type="number" data-choice-field="scoreDelta" value="${Number(choice.scoreDelta || 0)}"></label><label class="wide"><span>Coaching feedback</span><textarea rows="2" data-choice-field="feedback">${escapeHtml(choice.feedback || "")}</textarea></label>`;

    $$("[data-choice-field]", card).forEach((input) => input.addEventListener("input", () => {
      const key = input.dataset.choiceField;
      choice[key] = key === "scoreDelta" ? Number(input.value || 0) : input.value;
      touch(false);
    }));
    $("[data-delete]", card).addEventListener("click", () => {
      node.choices.splice(index, 1);
      touch(true);
    });
    return card;
  }

  function outcomeCard(outcome, index) {
    const card = document.createElement("article");
    card.className = "outcome-card";
    card.innerHTML = `<div class="outcome-head"><div><span class="eyebrow">Outcome ${index + 1}</span><strong>${escapeHtml(outcome.title || "Untitled outcome")}</strong></div><div class="card-actions"><button type="button" data-up>↑</button><button type="button" data-down>↓</button><button type="button" data-copy>Duplicate</button><button type="button" data-delete>Delete</button></div></div><div class="field-grid"><label><span>Outcome name</span><input data-outcome-field="title" value="${escapeAttr(outcome.title || "")}"></label><label class="wide"><span>What happened?</span><textarea rows="3" data-outcome-field="body">${escapeHtml(outcome.body || "")}</textarea></label><label class="wide"><span>Learner takeaway / next step</span><textarea rows="2" data-outcome-field="summary">${escapeHtml(outcome.summary || "")}</textarea></label><label><span>Image</span><select data-outcome-field="image">${imageOptions(outcome.image || "")}</select></label><label><span>Alt text</span><input data-outcome-field="alt" value="${escapeAttr(outcome.alt || "")}"></label></div>`;

    $("[data-outcome-field]", card).forEach((input) => input.addEventListener("input", () => {
      const key = input.dataset.outcomeField;
      outcome[key] = input.value;
      if (key === "title") $(".outcome-head strong", card).textContent = outcome.title || "Untitled outcome";
      touch(false);
    }));
    $("[data-up]", card).addEventListener("click", () => move(state.model.content.outcomes, index, -1));
    $("[data-down]", card).addEventListener("click", () => move(state.model.content.outcomes, index, 1));
    $("[data-copy]", card).addEventListener("click", () => duplicateOutcome(index));
    $("[data-delete]", card).addEventListener("click", () => deleteOutcome(index));
    return card;
  }

  function move(array, index, delta) {
    const target = index + delta;
    if (target < 0 || target >= array.length) return;
    const [item] = array.splice(index, 1);
    array.splice(target, 0, item);
    touch(true);
  }

  function renameTarget(oldId, nextId) {
    if (state.model.content.startNodeId === oldId) state.model.content.startNodeId = nextId;
    state.model.content.nodes.forEach((node) => node.choices.forEach((choice) => {
      if (choice.targetId === oldId) choice.targetId = nextId;
    }));
  }

  function uniqueId(base) {
    const ids = new Set(destinationItems().map((item) => item.id));
    let id = base;
    let count = 2;
    while (ids.has(id)) id = `${base}-${count++}`;
    return id;
  }

  function duplicateNode(index) {
    const copy = clone(state.model.content.nodes[index]);
    copy.id = uniqueId(`${copy.id}-copy`);
    copy.title = `${copy.title} copy`;
    copy.choices.forEach((choice) => { choice.id = uid("choice"); });
    state.model.content.nodes.splice(index + 1, 0, copy);
    touch(true);
  }

  function duplicateOutcome(index) {
    const copy = clone(state.model.content.outcomes[index]);
    copy.id = uniqueId(`${copy.id}-copy`);
    copy.title = `${copy.title} copy`;
    state.model.content.outcomes.splice(index + 1, 0, copy);
    touch(true);
  }

  function deleteNode(index) {
    if (state.model.content.nodes.length <= 1) return toast("A scenario needs at least one decision point.");
    const removed = state.model.content.nodes[index].id;
    state.model.content.nodes.splice(index, 1);
    if (state.model.content.startNodeId === removed) state.model.content.startNodeId = state.model.content.nodes[0].id;
    touch(true);
  }

  function deleteOutcome(index) {
    if (state.model.content.outcomes.length <= 1) return toast("A scenario needs at least one outcome.");
    state.model.content.outcomes.splice(index, 1);
    touch(true);
  }

  function validate() {
    if (isStorylineExperience()) {
      const scenes = state.model.content.scenes || [];
      const issues = scenes.length ? [] : ["The imported Storyline experience does not contain any scenes."];
      const warnings = [];
      scenes.forEach((scene, sceneIndex) => {
        if (!String(scene.title || "").trim()) warnings.push(`Scene ${sceneIndex + 1} needs a title.`);
        if (!(scene.slides || []).length) warnings.push(`${scene.title || `Scene ${sceneIndex + 1}`} has no published slides to review.`);
      });
      return { issues, warnings };
    }
    if (isRiseCourse()) {
      const lessons = state.model.content.lessons || [];
      const issues = lessons.length ? [] : ["The imported course does not contain any lessons."];
      const warnings = [];
      lessons.forEach((lesson, index) => {
        if (!String(lesson.title || "").trim()) warnings.push(`Lesson ${index + 1} needs a title.`);
        if (lesson.kind !== "assessment" && !Array.isArray(lesson.blocks)) warnings.push(`${lesson.title || `Lesson ${index + 1}`} has no normalized blocks to review.`);
      });
      return { issues, warnings };
    }
    const issues = [];
    const warnings = [];
    const all = [...state.model.content.nodes, ...state.model.content.outcomes];
    const ids = all.map((item) => item.id).filter(Boolean);
    const idSet = new Set(ids);
    if (ids.length !== all.length) issues.push("Internal routing data is incomplete.");
    if (idSet.size !== ids.length) issues.push("Two project items share the same internal ID.");
    if (!state.model.content.nodes.some((node) => node.id === state.model.content.startNodeId)) issues.push("The first decision is missing.");
    state.model.content.nodes.forEach((node) => {
      if (!node.choices.length) issues.push(`${node.title || "A decision"} needs at least one learner response.`);
      node.choices.forEach((choice) => {
        if (!idSet.has(choice.targetId)) issues.push(`A response in ${node.title || "a decision"} does not lead anywhere.`);
      });
    });
    if (!issues.length) {
      const reachable = new Set();
      const queue = [state.model.content.startNodeId];
      while (queue.length) {
        const id = queue.shift();
        if (reachable.has(id)) continue;
        reachable.add(id);
        state.model.content.nodes.find((node) => node.id === id)?.choices.forEach((choice) => {
          if (idSet.has(choice.targetId)) queue.push(choice.targetId);
        });
      }
      all.filter((item) => !reachable.has(item.id)).forEach((item) => warnings.push(`${item.title || "An item"} cannot be reached from the first decision.`));
      if (!state.model.content.outcomes.some((outcome) => reachable.has(outcome.id))) issues.push("No outcome can be reached from the first decision.");
    }
    return { issues, warnings };
  }

  function renderFlowCheck() {
    const { issues, warnings } = validate();
    const element = $("[data-flow-check]");
    if (issues.length) {
      element.className = "flow-check warn";
      element.textContent = `Things to fix before preview: ${issues[0]}${issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}`;
      setText("[data-project-health]", "Needs a quick fix");
    } else if (warnings.length) {
      element.className = "flow-check warn";
      element.textContent = `Ready to preview, with ${warnings.length} note${warnings.length === 1 ? "" : "s"}: ${warnings[0]}`;
      setText("[data-project-health]", "Ready with notes");
    } else {
      element.className = "flow-check";
      element.textContent = isRiseCourse()
        ? "Rise course draft ready to review ✓ Learner-facing normalized content is editable; source mapping is preserved in project data."
        : isStorylineExperience()
          ? "Storyline experience draft ready to review ✓ Scenes, slides, layers, and exposed learner-facing text are editable; runtime behavior remains a review item."
          : "Ready to preview ✓ Every learner response leads somewhere and an outcome is reachable.";
      setText("[data-project-health]", "Ready to preview");
    }
  }

  function renderPreview() {
    const root = $("[data-preview-root]");
    setText("[data-preview-heading]", isRiseCourse() ? "Preview the responsive course" : isStorylineExperience() ? "Preview the Storyline-style player" : "Test the learner experience");
    setText("[data-preview-description]", isRiseCourse()
      ? "This responsive course-style preview shows lesson navigation, normalized content, and available media in a learner context."
      : isStorylineExperience()
        ? "This Storyline-style player preview preserves the published scene and slide structure. Complex triggers and timeline behavior remain review items."
        : "Try alternate paths and presentation settings without leaving the project.");
    const { issues } = validate();
    if (issues.length) {
      root.innerHTML = `<div class="empty-state">Fix the project flow before previewing: ${escapeHtml(issues[0])}</div>`;
      return;
    }

    if (isRiseCourse()) {
      renderRisePreview(root);
      return;
    }
    if (isStorylineExperience()) {
      renderStorylinePreview(root);
      return;
    }

    const model = state.model;
    const nodes = new Map(model.content.nodes.map((node) => [node.id, node]));
    const outcomes = new Map(model.content.outcomes.map((outcome) => [outcome.id, outcome]));
    const config = model.content.score || {};
    const scoreMode = state.profile?.behavior?.scoring || "none";
    const scoringEnabled = scoreMode !== "none";
    const showScore = scoreMode === "visible";
    let currentId = model.content.startNodeId;
    let score = Number(config.startingValue || 0);
    const history = [];
    const clamp = (value) => Math.max(Number(config.minimum ?? 0), Math.min(Number(config.maximum ?? 100), value));
    const scoreHtml = () => scoringEnabled && showScore ? `<div class="learner-score"><span>${escapeHtml(config.label || "Score")}</span><strong>${score}</strong></div>` : "";
    const imageHtml = (path, alt) => {
      const url = assetUrl(path);
      return url ? `<img class="learner-image" src="${escapeAttr(url)}" alt="${escapeAttr(alt || "")}">` : "";
    };

    function draw() {
      const outcome = outcomes.get(currentId);
      if (outcome) {
        root.innerHTML = `<article class="learner-card">${scoreHtml()}<span class="eyebrow">Outcome</span><h3>${escapeHtml(outcome.title)}</h3>${imageHtml(outcome.image, outcome.alt || outcome.title)}<p>${escapeHtml(outcome.body || "")}</p>${outcome.summary ? `<div class="learner-feedback"><strong>Takeaway</strong><p>${escapeHtml(outcome.summary)}</p></div>` : ""}<button type="button" class="primary" data-replay>Replay scenario</button></article>`;
        $("[data-replay]", root).addEventListener("click", () => {
          currentId = model.content.startNodeId;
          score = Number(config.startingValue || 0);
          history.length = 0;
          draw();
        });
        return;
      }

      const node = nodes.get(currentId);
      if (!node) {
        root.innerHTML = '<div class="empty-state">This project points to a missing decision.</div>';
        return;
      }

      root.innerHTML = `<article class="learner-card">${scoreHtml()}<span class="eyebrow">Decision ${history.length + 1}</span>${node.speaker ? `<div class="learner-speaker">${escapeHtml(node.speaker)}</div>` : ""}<h3>${escapeHtml(node.title)}</h3>${imageHtml(node.image, node.alt || node.title)}<p>${escapeHtml(node.body || "")}</p><div class="learner-prompt">What do you do next?</div><div class="learner-choices" data-learner-choices></div></article>`;
      const choicesRoot = $("[data-learner-choices]", root);
      node.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.className = "learner-choice";
        button.innerHTML = `<span>${index + 1}</span><strong>${escapeHtml(choice.text)}</strong>`;
        button.addEventListener("click", () => {
          if (scoringEnabled) score = clamp(score + Number(choice.scoreDelta || 0));
          history.push(choice.id);
          $$(".learner-choice", root).forEach((item) => { item.disabled = true; });
          const feedback = document.createElement("div");
          feedback.className = "learner-feedback";
          feedback.innerHTML = `<strong>Coaching feedback</strong><p>${escapeHtml(choice.feedback || "Continue to see what happens next.")}</p><button type="button" class="primary">${outcomes.has(choice.targetId) ? "See outcome →" : "Continue →"}</button>`;
          $("button", feedback).addEventListener("click", () => {
            currentId = choice.targetId;
            draw();
          });
          $(".learner-card", root).appendChild(feedback);
        });
        choicesRoot.appendChild(button);
      });
    }
    draw();
  }

  function renderRisePreview(root) {
    const lessons = state.model.content.lessons || [];
    const normalLessons = lessons.filter((lesson) => lesson.kind !== "assessment");
    const assessments = lessons.filter((lesson) => lesson.kind === "assessment");
    let current = normalLessons[0] || assessments[0];
    const blockText = (block) => {
      const field = riseTextField(block);
      return field.value || block.title || "This normalized block has no standalone text field.";
    };
    function draw() {
      if (!current) {
        root.innerHTML = '<div class="empty-state">This imported course has no previewable lessons.</div>';
        return;
      }
      const content = current.kind === "assessment"
        ? (current.questions || []).map((question, index) => `<section class="rise-question"><span>Question ${index + 1}</span><h4>${escapeHtml(question.prompt || "Untitled question")}</h4>${(question.answers || []).map((answer) => `<button type="button" class="rise-answer">${escapeHtml(answer.text || "Untitled answer")}</button>`).join("")}</section>`).join("") || '<p>No questions were found in this assessment.</p>'
        : (current.blocks || []).map((block, index) => `<section class="rise-block"><span>${escapeHtml(block.title || `Block ${index + 1}`)}</span><p>${escapeHtml(blockText(block))}</p></section>`).join("") || '<p>No normalized blocks were found in this lesson.</p>';
      const navigation = lessons.map((lesson, index) => `<button type="button" class="rise-lesson${lesson.id === current.id ? " active" : ""}" data-rise-lesson="${escapeAttr(lesson.id)}"><small>${String(index + 1).padStart(2, "0")}</small><span>${escapeHtml(lesson.title || "Untitled lesson")}</span></button>`).join("");
      root.innerHTML = `<article class="rise-player"><header><div class="rise-logo">rise</div><div><strong>${escapeHtml(state.model.title || "Course")}</strong><small>Responsive course preview</small></div><button type="button" class="rise-menu" aria-label="Course menu">☰</button></header><div class="rise-body"><nav class="rise-course-nav" aria-label="Course lessons"><span>Course outline</span>${navigation}</nav><main class="rise-content"><div class="rise-progress"><span>${Math.round(((lessons.findIndex((lesson) => lesson.id === current.id) + 1) / Math.max(lessons.length, 1)) * 100)}% complete</span><i><b style="width:${((lessons.findIndex((lesson) => lesson.id === current.id) + 1) / Math.max(lessons.length, 1)) * 100}%"></b></i></div><span class="eyebrow">${current.kind === "assessment" ? "Knowledge check" : "Lesson"}</span><h3>${escapeHtml(current.title || "Untitled lesson")}</h3>${current.description ? `<p class="rise-intro">${escapeHtml(current.description)}</p>` : ""}<div class="rise-content-stack">${content}</div>${importedMediaMarkup()}</main></div></article>`;
      $$('[data-rise-lesson]', root).forEach((button) => button.addEventListener("click", () => { current = lessons.find((lesson) => lesson.id === button.dataset.riseLesson) || current; draw(); }));
    }
    draw();
  }

  function renderStorylinePreview(root) {
    const scenes = state.model.content.scenes || [];
    let scene = scenes[0];
    let slide = scene?.slides?.[0];
    const courseCover = state.model?.metadata?.courseCover || null;
    const courseCoverUrl = courseCover ? (assetUrl(`asset:${courseCover.id}`) || assetUrl(courseCover.path)) : null;
    let showingCourseCover = Boolean(courseCoverUrl);
    function draw() {
      if (!scene || !slide) {
        root.innerHTML = '<div class="empty-state">This imported Storyline experience has no previewable slides.</div>';
        return;
      }
      if (showingCourseCover) {
        const flatSlides = scenes.flatMap((item) => item.slides || []);
        root.innerHTML = `<article class="storyline-player"><header><div class="storyline-mark">SL</div><strong>${escapeHtml(state.model.title || "Storyline course")}</strong><span>Menu</span><span>Resources</span><button type="button" aria-label="Close preview">×</button></header><div class="storyline-stage storyline-launch-stage"><div class="storyline-course-cover"><img src="${escapeAttr(courseCoverUrl)}" alt="${escapeAttr(`${state.model.title || "Course"} cover`)}"></div><div class="storyline-launch-actions"><span>${flatSlides.length} slide${flatSlides.length === 1 ? "" : "s"} extracted from the published course</span><button type="button" class="primary" data-storyline-launch>Start course preview →</button></div></div></article>`;
        $("[data-storyline-launch]", root).addEventListener("click", () => { showingCourseCover = false; draw(); });
        return;
      }
      const sceneOptions = scenes.map((item) => `<option value="${escapeAttr(item.id)}"${item.id === scene.id ? " selected" : ""}>${escapeHtml(item.title || "Untitled scene")}</option>`).join("");
      const slideOptions = (scene.slides || []).map((item) => `<option value="${escapeAttr(item.id)}"${item.id === slide.id ? " selected" : ""}>${escapeHtml(item.title || "Untitled slide")}</option>`).join("");
      const flatSlides = scenes.flatMap((item) => (item.slides || []).map((candidate) => ({ scene:item, slide:candidate })));
      const position = flatSlides.findIndex((item) => item.slide.id === slide.id);
      const media = storylineSlideMedia(slide);
      const backgroundUrl = media.background ? media.assetUrlFor(media.background.asset) : null;
      const layers = (slide.layers || []).map((layer, index) => `<section class="story-layer"><span>${escapeHtml(layer.title || (layer.kind === "base" ? "Base layer" : `Layer ${index + 1}`))}</span>${(layer.objects || []).map((object) => `<p>${escapeHtml(object.title || object.accessibility?.altText || `${object.kind || "Object"} (no exposed text)`)}</p>`).join("") || "<p>No exposed learner-facing text on this layer.</p>"}</section>`).join("") || '<section class="story-layer"><span>Source review needed</span><p>This published slide could not be fully decoded into editable layers.</p></section>';
      root.innerHTML = `<article class="storyline-player"><header><div class="storyline-mark">SL</div><strong>${escapeHtml(state.model.title || "Storyline course")}</strong><span>Menu</span><span>Resources</span><button type="button" aria-label="Close preview">×</button></header><div class="storyline-stage"><div class="storyline-canvas${backgroundUrl ? " storyline-canvas--visual" : ""}"${backgroundUrl ? ` style="--storyline-slide-image:url('${escapeAttr(backgroundUrl)}')"` : ""}><div class="storyline-canvas-content"><span class="eyebrow">${escapeHtml(scene.title || "Scene")}</span><h3>${escapeHtml(slide.title || "Untitled slide")}</h3><p>${escapeHtml(`${slide.layers?.length || 0} layer(s) · ${slide.metadata?.objectCount || 0} object(s) · ${slide.metadata?.actionCount || 0} detected action(s)`)}</p><div class="story-layer-stack">${layers}</div>${storylineMediaMarkup(media)}</div></div></div><footer><div class="storyline-location"><label>Scene<select data-storyline-preview-scene>${sceneOptions}</select></label><label>Slide<select data-storyline-preview-slide>${slideOptions}</select></label></div><div class="storyline-controls"><button type="button" data-storyline-back ${position <= 0 ? "disabled" : ""}>‹ Previous</button><span>${position + 1} / ${flatSlides.length}</span><button type="button" class="primary" data-storyline-next ${position >= flatSlides.length - 1 ? "disabled" : ""}>Next ›</button></div></footer></article>`;
      $("[data-storyline-preview-scene]", root).addEventListener("change", (event) => { scene = scenes.find((item) => item.id === event.target.value) || scene; slide = scene.slides?.[0]; draw(); });
      $("[data-storyline-preview-slide]", root).addEventListener("change", (event) => { slide = scene.slides.find((item) => item.id === event.target.value) || slide; draw(); });
      $("[data-storyline-back]", root)?.addEventListener("click", () => { const target = flatSlides[position - 1]; if (target) { scene = target.scene; slide = target.slide; draw(); } });
      $("[data-storyline-next]", root)?.addEventListener("click", () => { const target = flatSlides[position + 1]; if (target) { scene = target.scene; slide = target.slide; draw(); } });
    }
    draw();
  }

  async function installSourceFiles(entries, notify = true) {
    if (!entries.length) return;
    for (const entry of entries) {
      const file = entry.file;
      if (!(file instanceof File)) continue;
      const path = entry.path || filePath(file, false);
      const kind = entry.kind || classify(file);
      state.sourceFiles.push({ file, path, kind, name: entry.name || file.name });
      if (["image", "audio", "video", "caption"].includes(kind)) state.objectUrls.set(path, URL.createObjectURL(file));
      if (kind === "reference") {
        try { state.reference.push({ path, text: typeof entry.referenceText === "string" ? entry.referenceText : await file.text() }); } catch (_) {}
      }
    }
    state.sourceFiles.sort((a, b) => a.path.localeCompare(b.path));
    renderSourceFiles();
    renderEditor();
    renderProfileFields();
    renderHistory();
    renderPreview();
    saveDraft();
    if (notify) toast(`${entries.length} source file${entries.length === 1 ? "" : "s"} added`);
  }

  async function importSourceFiles(fileList, fromFolder = false) {
    const files = [...fileList];
    if (!files.length) return;
    await installSourceFiles(files.map((file) => ({ file, path:filePath(file, fromFolder), kind:classify(file), name:file.name })));
  }

  function renderProfileFields() {
    if (!state.profile) return;
    $$('[data-profile-field]').forEach((input) => {
      const value = getPath(state.profile, input.dataset.profileField);
      if (document.activeElement !== input) input.value = value ?? "";
    });
    $$('[data-profile-list]').forEach((input) => {
      const value = getPath(state.profile, input.dataset.profileList);
      if (document.activeElement !== input) input.value = Array.isArray(value) ? value.join("\n") : "";
    });
    const meta = $("[data-preview-meta]");
    if (meta) {
      const theme = state.profile.presentation?.theme?.name || "Default";
      const audience = state.profile.learning?.audience || "Audience not set";
      const target = state.profile.export?.target || "web";
      meta.innerHTML = `<span><strong>Theme</strong>${escapeHtml(theme)}</span><span><strong>Audience</strong>${escapeHtml(audience)}</span><span><strong>Export intent</strong>${escapeHtml(target)}</span>`;
    }
    applyThemeToPreview();
  }

  function applyThemeToPreview() {
    const root = $("[data-preview-root]");
    if (!root || !state.profile?.presentation?.theme) return;
    const colors = state.profile.presentation.theme.colors || {};
    root.style.setProperty("--experience-primary", colors.primary || "#508484");
    root.style.setProperty("--experience-secondary", colors.secondary || "#79C99E");
    root.style.setProperty("--experience-accent", colors.accent || "#97DB4F");
    root.style.setProperty("--experience-background", colors.background || "#ffffff");
    root.style.setProperty("--experience-text", colors.text || "#24302D");
    root.style.setProperty("--experience-heading-font", state.profile.presentation.theme.typography?.heading || "Montserrat");
    root.style.setProperty("--experience-body-font", state.profile.presentation.theme.typography?.body || "Open Sans");
    root.dataset.layout = state.profile.presentation.theme.layout || "clean-cards";
  }

  function openTool(name) {
    state.activeTool = name;
    const drawer = $("[data-utility-drawer]");
    const backdrop = $(".drawer-backdrop");
    const titles = {
      ai: ["Project tool", "Ask AI"],
      theme: ["Presentation", "Theme"],
      history: ["Versions", "Transformation history"],
      settings: ["Project", "Project settings"]
    };
    $$('[data-tool-panel]').forEach((panel) => { panel.hidden = panel.dataset.toolPanel !== name; });
    setText("[data-tool-eyebrow]", titles[name]?.[0] || "Project tool");
    setText("[data-tool-title]", titles[name]?.[1] || "Project tool");
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
    document.body.classList.add("drawer-open");
    if (name === "history") renderHistory();
    if (name === "theme" || name === "settings") renderProfileFields();
  }

  function closeTool() {
    state.activeTool = null;
    const drawer = $("[data-utility-drawer]");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    $(".drawer-backdrop").hidden = true;
    document.body.classList.remove("drawer-open");
  }

  function addHistoryEntry(entry) {
    const record = {
      id: uid("history"),
      createdAt: new Date().toISOString(),
      prompt: entry.prompt || "",
      action: entry.action || "AI transformation",
      model: entry.model || "",
      summary: Array.isArray(entry.summary) ? entry.summary : [],
      reviewNotes: Array.isArray(entry.reviewNotes) ? entry.reviewNotes : [],
      beforeProject: clone(entry.beforeProject),
      afterProject: clone(entry.afterProject),
      beforeProfile: clone(entry.beforeProfile || state.profile),
      afterProfile: clone(entry.afterProfile || state.profile)
    };
    state.history.unshift(record);
    state.history = state.history.slice(0, 30);
    renderHistory();
    saveDraft();
    return record.id;
  }

  function restoreVersion(project, profile, message) {
    if (!validProject(project)) return toast("That history version is no longer compatible.");
    state.model = clone(project);
    state.profile = profile ? clone(profile) : profileFromModel(project);
    syncScoringFromProfile();
    renderAll();
    saveDraft();
    toast(message || "Version restored");
  }

  function renderHistory() {
    const root = $("[data-history-list]");
    if (!root) return;
    setText("[data-history-count]", state.history.length ? `${state.history.length} AI change${state.history.length === 1 ? "" : "s"}` : "No AI changes yet");
    root.innerHTML = "";
    if (!state.history.length) {
      root.innerHTML = '<div class="empty-state">No AI transformations yet. Each successful AI action will appear here as a recoverable version.</div>';
      return;
    }
    state.history.forEach((entry, index) => {
      const article = document.createElement("article");
      article.className = "history-entry";
      const date = new Date(entry.createdAt);
      article.innerHTML = `<div class="history-head"><div><span class="eyebrow">AI version ${state.history.length - index}</span><strong>${escapeHtml(entry.action || "AI transformation")}</strong><small>${escapeHtml(date.toLocaleString())}${entry.model ? ` · ${escapeHtml(entry.model)}` : ""}</small></div></div><p class="history-prompt">${escapeHtml(entry.prompt || "No prompt recorded.")}</p>${entry.summary?.length ? `<ul>${entry.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}<div class="history-actions"><button type="button" data-restore-after>Restore this version</button><button type="button" data-restore-before>Restore before change</button><button type="button" class="primary-soft" data-edit-rerun>Edit & rerun</button></div>`;
      $("[data-restore-after]", article).addEventListener("click", () => restoreVersion(entry.afterProject, entry.afterProfile, "AI version restored"));
      $("[data-restore-before]", article).addEventListener("click", () => restoreVersion(entry.beforeProject, entry.beforeProfile, "Pre-AI version restored"));
      $("[data-edit-rerun]", article).addEventListener("click", () => {
        restoreVersion(entry.beforeProject, entry.beforeProfile, "Starting point restored");
        $("[data-ai-prompt]").value = entry.prompt || "";
        openTool("ai");
        toast("Edit the prompt, then apply AI changes.");
      });
      root.appendChild(article);
    });
  }

  function renderJson() {
    if (!state.model) return;
    const portable = clone(state.model);
    portable.metadata = { ...(portable.metadata || {}), workbenchProfile: clone(state.profile), workbenchVersion: "0.3" };
    $("[data-json-output]").textContent = JSON.stringify(portable, null, 2);
  }

  function renderAll() {
    renderProjectMeta();
    renderSourceFiles();
    renderEditor();
    renderProfileFields();
    renderHistory();
    renderPreview();
  }

  function touch(structural = false) {
    state.model.id = slug(state.model.id || state.model.title);
    renderProjectMeta();
    renderFlowCheck();
    renderJson();
    if (structural) renderEditor();
    if (state.activeTab === "preview") renderPreview();
    saveDraft();
  }

  function saveDraft() {
    if (!state.model) return;
    clearTimeout(state.saveTimer);
    setText("[data-save-state]", "Saving…");
    state.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ model: state.model, profile: state.profile, history: state.history, sourcePrompt: state.sourcePrompt, reference: state.reference.map((item) => ({ path: item.path, text: item.text })) }));
        setText("[data-save-state]", "Autosaved locally");
      } catch (_) {
        setText("[data-save-state]", "Local save unavailable");
      }
    }, 250);
  }

  function restoreDraft() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      let migratedFrom = "";
      if (!raw) {
        migratedFrom = LEGACY_STORAGE_KEYS.find((key) => localStorage.getItem(key)) || "";
        raw = migratedFrom ? localStorage.getItem(migratedFrom) : null;
      }
      const saved = JSON.parse(raw || "null");
      if (!saved || !validProject(saved.model)) return false;
      state.model = saved.model;
      state.profile = saved.profile ? clone(saved.profile) : profileFromModel(saved.model);
      state.history = Array.isArray(saved.history) ? saved.history : [];
      state.sourcePrompt = saved.sourcePrompt || "";
      state.reference = Array.isArray(saved.reference) ? saved.reference : [];
      syncScoringFromProfile();
      $("[data-start-panel]").hidden = true;
      $("[data-workspace]").hidden = false;
      renderAll();
      switchTab("source");
      if (migratedFrom) {
        saveDraft();
        setTimeout(() => toast("Previous Workbench draft migrated to v0.3"), 250);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function openJson(file) {
    try {
      const model = JSON.parse(await file.text());
      if (!validProject(model)) throw new Error("This is not a compatible Workbench project JSON file.");
      startProject(model, "");
      toast("Existing scenario opened");
    } catch (error) {
      toast(error.message);
    }
  }

  function downloadJson() {
    const model = clone(state.model);
    model.id = slug(model.title || model.id);
    model.metadata = { ...(model.metadata || {}), workbenchProfile: clone(state.profile), workbenchVersion: "0.3" };
    const blob = new Blob([`${JSON.stringify(model, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${model.id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function portableProject() {
    const project = clone(state.model);
    project.metadata = { ...(project.metadata || {}), workbenchProfile: clone(state.profile), workbenchVersion: "0.4" };
    return {
      packageVersion: "0.1",
      createdWith: "Learning Project Workbench v0.4",
      exportedAt: new Date().toISOString(),
      project,
      sourcePrompt: state.sourcePrompt || "",
      history: clone(state.history),
      reference: clone(state.reference),
    };
  }

  function previewAssetsForPackage() {
    const assets = state.model?.metadata?.assetManifest || [];
    const included = [];
    const seen = new Set();
    for (const asset of assets) {
      const dataUrl = assetUrl(`asset:${asset.id}`) || assetUrl(asset.path);
      const key = asset.id || asset.path;
      if (!dataUrl || !key || seen.has(key)) continue;
      seen.add(key);
      included.push({ id:asset.id || null, path:asset.path || null, kind:asset.kind || "other", dataUrl });
    }
    return included;
  }

  async function openPortableProject(packageData, sourceEntries = [], previewAssets = []) {
    if (!packageData || packageData.packageVersion !== "0.1" || !validProject(packageData.project)) throw new Error("This ZIP does not contain a compatible Workbench project.");
    startProject(packageData.project, packageData.sourcePrompt || "");
    state.history = Array.isArray(packageData.history) ? clone(packageData.history) : [];
    await installSourceFiles(sourceEntries, false);
    registerPreviewAssets(previewAssets);
    renderAll();
    saveDraft();
    toast(`Project package opened${sourceEntries.length || previewAssets.length ? ` · ${sourceEntries.length + previewAssets.length} bundled file${sourceEntries.length + previewAssets.length === 1 ? "" : "s"}` : ""}`);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",").pop() || "");
      reader.onerror = () => reject(reader.error || new Error("The Rise export could not be read."));
      reader.readAsDataURL(file);
    });
  }

  async function importRiseExport(file) {
    const MAX_ARCHIVE_BYTES = 30 * 1024 * 1024;
    if (!file) return;
    if (file.size > MAX_ARCHIVE_BYTES) return toast("This first import pass supports Rise ZIP exports up to 30 MB.");
    toast("Reading the Rise export locally…");
    try {
      const sessionResponse = await fetch("/api/workbench-session", { credentials:"same-origin", cache:"no-store" });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || !session.authenticated || !session.csrf) throw new Error("Open the password-protected local Workbench before importing a Rise export.");
      const response = await fetch("/api/workbench-rise-import", {
        method:"POST",
        credentials:"same-origin",
        headers: { "Content-Type":"application/json", "X-CSRF-Token":session.csrf },
        body: JSON.stringify({ name:file.name, base64:await fileToBase64(file) })
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !validRiseCourse(result.project)) throw new Error(result.error || "Rise import could not create an editable course draft.");
      startProject(result.project, `Imported from published Rise web export: ${file.name}`);
      registerPreviewAssets(result.previewAssets || []);
      registerMediaStreams(result.mediaStreams || []);
      state.profile.source.origin = "rise-published-web";
      state.profile.source.structureModel = "course-lessons-blocks";
      state.profile.source.notes = "Normalized from a private published Rise web export. Review every imported block before reuse or export.";
      state.profile.behavior.navigation = "free";
      state.profile.export.target = "web";
      renderAll();
      saveDraft();
      toast("Rise course imported as an editable draft");
    } catch (error) {
      toast(error.message || "Rise import could not be completed.");
    }
  }

  async function importStorylineExport(file) {
    const MAX_ARCHIVE_BYTES = 30 * 1024 * 1024;
    if (!file) return;
    if (file.size > MAX_ARCHIVE_BYTES) return toast("This first import pass supports Storyline ZIP exports up to 30 MB.");
    toast("Reading the Storyline export locally…");
    try {
      const sessionResponse = await fetch("/api/workbench-session", { credentials:"same-origin", cache:"no-store" });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || !session.authenticated || !session.csrf) throw new Error("Open the password-protected local Workbench before importing a Storyline export.");
      const response = await fetch("/api/workbench-storyline-import", {
        method:"POST",
        credentials:"same-origin",
        headers: { "Content-Type":"application/json", "X-CSRF-Token":session.csrf },
        body: JSON.stringify({ name:file.name, base64:await fileToBase64(file) })
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !validStorylineExperience(result.project)) throw new Error(result.error || "Storyline import could not create an editable experience draft.");
      startProject(result.project, `Imported from published Storyline web export: ${file.name}`);
      registerPreviewAssets(result.previewAssets || []);
      registerMediaStreams(result.mediaStreams || []);
      state.profile.source.origin = "storyline-published-web";
      state.profile.source.structureModel = "scenes-slides-layers";
      state.profile.source.notes = "Normalized from a private published Storyline web export. Review every scene, layer, object, variable, and runtime behavior before reuse or export.";
      state.profile.behavior.navigation = "guided";
      state.profile.export.target = "web";
      renderAll();
      saveDraft();
      toast("Storyline experience imported as an editable draft");
    } catch (error) {
      toast(error.message || "Storyline import could not be completed.");
    }
  }

  function toast(message) {
    const element = $("[data-toast]");
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 2200);
  }

  function bind() {
    $$("[data-start-mode]").forEach((button) => button.addEventListener("click", () => {
      $$("[data-start-mode]").forEach((item) => item.classList.toggle("active", item === button));
      const mode = button.dataset.startMode;
      $("[data-template-picker]").hidden = mode !== "template";
      $("[data-existing-picker]").hidden = mode !== "existing";
      $("[data-rise-picker]").hidden = mode !== "rise";
      $("[data-storyline-picker]").hidden = mode !== "storyline";
      if (mode === "blank") startProject(blankScenario(), "");
    }));

    $("[data-use-template]").addEventListener("click", () => {
      const select = $("[data-template-select]");
      const id = select.value;
      const label = select.options[select.selectedIndex]?.textContent || "selected template";
      startProject(templates[id] || templates["customer-discovery"], `Use the ${label} structure as the starting point. Replace the placeholder content with my source material while preserving the interaction logic.`);
    });

    $("[data-choose-project]").addEventListener("click", () => $("[data-project-input]").click());
    $("[data-choose-rise]").addEventListener("click", () => $("[data-rise-input]").click());
    $("[data-choose-storyline]").addEventListener("click", () => $("[data-storyline-input]").click());
    $("[data-open-project]").addEventListener("click", () => $("[data-project-input]").click());
    $("[data-project-input]").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (file?.name.toLowerCase().endsWith(".zip")) {
        if (!window.LX_WORKBENCH_PACKAGE?.open) toast("Project packages are still loading. Please choose the ZIP again in a moment.");
        else await window.LX_WORKBENCH_PACKAGE.open(file);
      } else if (file) await openJson(file);
      event.target.value = "";
    });
    $("[data-rise-input]").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (file) await importRiseExport(file);
      event.target.value = "";
    });
    $("[data-storyline-input]").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (file) await importStorylineExport(file);
      event.target.value = "";
    });

    $("[data-new-project]").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      revokeUrls();
      state.model = null;
      state.sourcePrompt = "";
      state.sourceFiles = [];
      state.reference = [];
      state.profile = defaultProfile();
      state.history = [];
      closeTool();
      $("[data-workspace]").hidden = true;
      $("[data-start-panel]").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    $$('[data-tab]').forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
    $("[data-go-edit]").addEventListener("click", () => switchTab("edit"));
    $("[data-go-adapt]").addEventListener("click", () => switchTab("adapt"));
    $("[data-go-preview]").addEventListener("click", () => switchTab("preview"));
    $$('[data-open-tool]').forEach((button) => button.addEventListener("click", () => openTool(button.dataset.openTool)));
    $$('[data-close-tool]').forEach((button) => button.addEventListener("click", closeTool));

    $("[data-source-prompt]").addEventListener("input", (event) => {
      state.sourcePrompt = event.target.value;
      saveDraft();
    });
    $("[data-add-source-files]").addEventListener("click", () => $("[data-source-files]").click());
    $("[data-add-source-folder]").addEventListener("click", () => $("[data-source-folder]").click());
    $("[data-source-files]").addEventListener("change", (event) => importSourceFiles(event.target.files, false));
    $("[data-source-folder]").addEventListener("change", (event) => importSourceFiles(event.target.files, true));

    $$("[data-project-field]").forEach((input) => input.addEventListener("input", () => {
      state.model[input.dataset.projectField] = input.value;
      touch(false);
    }));

    $("[data-add-decision]").addEventListener("click", () => {
      if (isRiseCourse()) return;
      const number = state.model.content.nodes.length + 1;
      state.model.content.nodes.push({ id: uniqueId(`decision-${number}`), speaker: "", title: `Decision ${number}`, body: "Describe what the learner knows at this point.", image: "", alt: "", choices: [{ id: uid("choice"), text: "New learner response", targetId: state.model.content.outcomes[0]?.id || "", feedback: "Add coaching feedback.", scoreDelta: 0 }] });
      touch(true);
    });

    $("[data-add-outcome]").addEventListener("click", () => {
      if (isRiseCourse()) return;
      const number = state.model.content.outcomes.length + 1;
      state.model.content.outcomes.push({ id: uniqueId(`outcome-${number}`), title: `Outcome ${number}`, body: "Describe what happened.", image: "", alt: "", summary: "Add the learner takeaway." });
      touch(true);
    });

    $("[data-restart-preview]").addEventListener("click", renderPreview);
    $("[data-download-json]").addEventListener("click", downloadJson);
    $("[data-toggle-json]").addEventListener("click", () => {
      const panel = $("[data-json-panel]");
      panel.open = !panel.open;
    });

    $$("[data-ai-preset]").forEach((button) => button.addEventListener("click", () => {
      const presets = {
        sanitize: "Sanitize this project for a public portfolio. Replace confidential, internal-only, customer-specific, proprietary, or identifying information, files, and links with realistic generic alternatives while preserving the learning structure, interaction behavior, and design intent.",
        theme: "Apply and refine the current Project Theme. Make the rendered learning experience follow the saved brand direction, colors, typography, layout, identity treatment, accessibility rules, and target-specific export notes without changing the learning objective or branch logic.",
        audience: "Adapt this project for the audience defined in Project Settings. Update terminology, examples, assumptions, coaching feedback, and context while preserving the core learning objective and interaction mechanics.",
        similar: "Use this project as the source template. Keep useful interaction structure and presentation behavior, but rebuild the learning content using the source materials I uploaded."
      };
      $("[data-ai-prompt]").value = presets[button.dataset.aiPreset] || "";
    }));

    $$('[data-profile-field]').forEach((input) => input.addEventListener("input", () => {
      setPath(state.profile, input.dataset.profileField, input.value);
      syncScoringFromProfile();
      renderProfileFields();
      if (state.activeTab === "preview") renderPreview();
      saveDraft();
    }));
    $$('[data-profile-list]').forEach((input) => input.addEventListener("input", () => {
      setPath(state.profile, input.dataset.profileList, input.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean));
      saveDraft();
    }));
    $("[data-theme-preset]")?.addEventListener("change", (event) => applyThemePreset(event.target.value));
    $("[data-theme-with-ai]")?.addEventListener("click", () => {
      $("[data-ai-prompt]").value = "Apply and refine the current Project Theme. Make the rendered learning experience follow the saved brand direction, colors, typography, layout, identity treatment, accessibility rules, and target-specific export notes without changing the learning objective or branch logic.";
      openTool("ai");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.activeTool) closeTool();
    });

    window.addEventListener("beforeunload", revokeUrls);
  }

  window.LX_WORKBENCH = {
    getProject: () => state.model ? clone(state.model) : null,
    getProfile: () => clone(state.profile),
    getHistory: () => clone(state.history),
    getSourcePrompt: () => state.sourcePrompt || "",
    getReference: () => clone(state.reference),
    getSourceFiles: () => state.sourceFiles.map((item) => ({ ...item })),
    getPortableProject: portableProject,
    getPreviewAssetsForPackage: previewAssetsForPackage,
    openPortableProject,
    validScenario,
    validRiseCourse,
    validStorylineExperience,
    validProject,
    validate,
    toast,
    switchTab,
    openTool,
    addHistoryEntry,
    replaceProject: (model, profile = null) => {
      if (!validProject(model)) throw new Error("AI returned an unsupported project.");
      state.model = clone(model);
      state.profile = profile ? clone(profile) : profileFromModel(model);
      syncScoringFromProfile();
      renderAll();
      saveDraft();
      switchTab("edit");
    }
  };

  bind();
  restoreDraft();
})();
