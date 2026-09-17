(() => {
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const path = location.pathname;

  const setText = (el, value) => { if (el && (el.textContent || '') !== value) el.textContent = value; };
  const replaceExact = (root, selector, from, to) => {
    $$(selector, root).forEach((el) => { if ((el.textContent || '').trim() === from) setText(el, to); });
  };

  function bindAdvancedToggle() {
    $$('[data-ux-advanced-toggle]').forEach((button) => {
      if (button.dataset.uxReady) return;
      button.dataset.uxReady='true';
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click', () => {
        const on = document.body.classList.toggle('show-advanced-fields');
        button.setAttribute('aria-pressed', String(on));
        setText(button, on ? 'Hide advanced fields' : 'Advanced fields');
      });
    });
  }

  function markTechnicalLabels(root=document) {
    $$('label',root).forEach((label) => {
      const title = label.querySelector(':scope > span');
      if (!title) return;
      const text=(title.textContent||'').trim();
      if (text === 'ID' || text === 'Node ID' || text === 'Outcome ID' || text === 'Internal ID') {
        setText(title,'Internal ID');
        label.classList.add('ux-technical-field');
      }
    });
  }

  function applyHelpCopy(page) {
    const title=$('[data-help-title]');
    const body=$('[data-help-body]');
    if(!title||!body)return;
    const t=(title.textContent||'').trim();
    const maps={
      interaction:{
        'Project Assets':['Source files & media','Add reference content and media before authoring so compatible fields can use those files automatically. Files stay local to this browser session unless you download an editable project.'],
        'Generated JSON':['Advanced project data','This is the structured data behind the interaction. You normally do not need to edit or copy it during everyday authoring.'],
        'Export options':['Save & reuse','Download the editable project to continue later, or download the interaction file when you want to add it to Course Composer.'],
        'Component basics':['Interaction basics','Name the interaction, describe the learning purpose, and tell the learner what to do.'],
        'Component-specific fields':['Interaction content','These fields change based on what the learner needs to do: browse, explore, answer, watch, or listen.']
      },
      composer:{
        'Project assets':['Source files & media','Add reference content and media before building the course so Composer can suggest compatible files as you add sections.'],
        'Course content':['Build the course','Everything stays editable in one canvas. Add, reorder, duplicate, or remove sections without jumping between separate screens.'],
        'Course preview':['Preview','Check the sequence in the embedded preview or open Preview as learner for a focused learner view.'],
        'Export':['Save & reuse','Download the editable project to continue later. Advanced course data stays available when you need the engine structure directly.']
      },
      scenario:{
        'Scenario basics':['Scenario setup','Start with what the learner is practicing and what they should do. Scoring and internal IDs are optional/advanced details.'],
        'Project assets':['Source files & media','Add reference content and visuals before writing decisions so scenario cards can use those images automatically.'],
        'Decision path':['Build decisions','Write what is happening, what the learner knows, their response choices, coaching feedback, and what happens next.'],
        'Learner preview':['Preview','Try different decisions and confirm the coaching feedback and outcomes make sense before saving the scenario.'],
        'Export':['Save & reuse','Download the editable project to continue later or download the scenario interaction file to add it to a course.']
      }
    };
    const match=maps[page]?.[t];
    if(match){setText(title,match[0]);setText(body,match[1]);}
  }

  function humanizeAssetDrawer(){
    replaceExact(document,'.asset-import-button','Project Assets','Source files & media');
    replaceExact(document,'.asset-library-head h2','Asset Library','Source files & media');
    replaceExact(document,'.asset-library-head .eyebrow','Project package','Source library');
    replaceExact(document,'.asset-import-actions button','Choose project folder','Add source folder');
    replaceExact(document,'.asset-import-actions button','Choose files','Add selected files');
    replaceExact(document,'.asset-import-actions button','Auto-fill paths','Fill compatible fields');
    replaceExact(document,'.asset-library-section h3','Assets','Media & documents');
    replaceExact(document,'.asset-library-section h3','Source context','Reference content');
    replaceExact(document,'.asset-empty','No assets selected yet.','No media or documents added yet.');
    replaceExact(document,'.asset-empty','No source context imported.','No reference content added yet.');
    replaceExact(document,'[data-asset-summary]','No project files imported','No source files added yet');
    const privacy=$('.asset-privacy span');
    if(privacy){
      const next=(privacy.textContent||'').replace('Component Studio','Interaction Builder');
      setText(privacy,next);
    }
    const help=$('.asset-help');
    if(help && (help.textContent||'').includes('Recommended folders:')) setText(help,'Add your existing source folder when possible. The builder keeps technical file references underneath so media can stay portable when you save the editable project.');
  }

  function applyInteractionBuilder() {
    if(document.title!=='Interaction Builder · Learning Experience Engine')document.title='Interaction Builder · Learning Experience Engine';
    replaceExact(document,'small','Component Studio','Interaction Builder');
    replaceExact(document,'.status-chip','Engine-native','Reusable interaction');
    replaceExact(document,'a,button','Component Studio','Interaction Builder');
    replaceExact(document,'.preview-actions button','Review interaction','Preview as learner');
    replaceExact(document,'.preview-actions button','Refresh preview','Restart preview');
    humanizeAssetDrawer();

    const labels={
      'Image path':'Image','Media path':'Media file','X %':'Horizontal position (%)','Y %':'Vertical position (%)',
      'Correct?':'Correct answer?','Items per page':'Items shown at once'
    };
    $$('label > span').forEach((span)=>{const t=(span.textContent||'').trim();if(labels[t])setText(span,labels[t]);});

    const humanTypes={carousel:'Carousel','hotspot-reveal':'Visual exploration',assessment:'Knowledge check','media-presentation':'Guided media'};
    const active=$('[data-type].active')?.dataset.type;
    if(active&&humanTypes[active]){
      setText($('[data-editor-title]'),humanTypes[active]);
      setText($('[data-preview-type]'),humanTypes[active]);
      setText($('[data-preview-kind]'),humanTypes[active]);
    }
    markTechnicalLabels();
    applyHelpCopy('interaction');
  }

  function applyComposer() {
    replaceExact(document,'a,button','Component Studio','Interaction Builder');
    replaceExact(document,'button','Preview from beginning','Preview');
    replaceExact(document,'button','Open full preview','Preview as learner');
    replaceExact(document,'button','Import component JSON','Choose interaction file');
    replaceExact(document,'button','Replace component JSON','Replace interaction');
    replaceExact(document,'a','Open Component Studio →','Open Interaction Builder →');
    replaceExact(document,'strong','No component imported yet','No interaction added yet');

    $$('label > span').forEach((span)=>{
      const map={'Image path':'Image','Video path':'Video','Caption path':'Captions','Document path':'Document'};
      const t=(span.textContent||'').trim(); if(map[t]) setText(span,map[t]);
    });
    $$('.type-chip').forEach((chip)=>{
      const t=(chip.textContent||'').trim();
      if(t==='component')setText(chip,'interaction');
      if(t==='resource')setText(chip,'job aid');
    });
    $$('.content-card-title small').forEach((el)=>{
      const next=(el.textContent||'').replace(/\bcomponent\b/g,'interaction').replace(/\bresource\b/g,'job aid');
      setText(el,next);
    });
    $$('.component-summary small,.editor-note').forEach((el)=>{
      const next=(el.textContent||'')
        .replace(/Engine-native interaction/g,'Reusable interaction')
        .replace(/Component Studio/g,'Interaction Builder')
        .replace(/component JSON/gi,'interaction file');
      setText(el,next);
    });
    applyHelpCopy('composer');
  }

  function applyScenario() {
    const labelMap={
      'Node ID':'Internal ID','Outcome ID':'Internal ID','Speaker / role':'Who is speaking?',
      'Decision title / situation':"What's happening?",'Situation details':'What does the learner know?',
      'Send learner to':'What happens next?','Score change':'Impact on score','Immediate feedback':'Coaching feedback',
      'Outcome title':'Outcome name','Outcome explanation':'What happened?','Visual':'Image'
    };
    $$('label > span').forEach((span)=>{const t=(span.textContent||'').trim();if(labelMap[t])setText(span,labelMap[t]);});
    markTechnicalLabels();

    const check=$('[data-path-check]');
    if(check){
      const t=(check.textContent||'').trim();
      if(t.startsWith('Path check:')) setText(check,t.replace(/^Path check:\s*/,'Things to fix before preview: '));
      else if(t.startsWith('Path runs,')) setText(check,t.replace(/^Path runs,\s*/,'Ready to preview, with '));
      else if(t.startsWith('Path check ✓')) setText(check,'Ready to preview ✓ All decisions lead somewhere and at least one outcome can be reached.');
    }
    $$('select[data-choice-field="targetId"] option').forEach((option)=>{
      const next=(option.textContent||'').replace(/^Decision · /,'Next decision · ').replace(/^Missing · /,'Needs attention · ');
      setText(option,next);
    });
    replaceExact(document,'button','Preview from beginning','Preview');
    replaceExact(document,'button','Open focused preview','Preview as learner');
    replaceExact(document,'.canvas-label span','Decision nodes','Decision points');
    applyHelpCopy('scenario');
  }

  function updateScoreSummary(){
    const details=$('[data-score-settings]');
    const enabled=$('[data-score-field="enabled"]');
    const summary=details?.querySelector('summary [data-score-summary]');
    if(summary&&enabled)setText(summary,enabled.checked?'Optional scoring · On':'Optional scoring · Off');
  }

  function apply() {
    bindAdvancedToggle();
    if(path.includes('/component-studio/')) applyInteractionBuilder();
    if(path.includes('/course-composer/')) applyComposer();
    if(path.includes('/scenario-builder/')) { applyScenario(); updateScoreSummary(); }
  }

  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true});
  document.addEventListener('change',(event)=>{if(event.target.matches('[data-score-field="enabled"]'))updateScoreSummary();});
  apply();
})();
