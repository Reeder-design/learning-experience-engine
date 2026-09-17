(() => {
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const path = location.pathname;

  const replaceExact = (root, selector, from, to) => {
    $$(selector, root).forEach((el) => { if ((el.textContent || '').trim() === from) el.textContent = to; });
  };

  function bindAdvancedToggle() {
    $$('[data-ux-advanced-toggle]').forEach((button) => {
      if (button.dataset.uxReady) return;
      button.dataset.uxReady='true';
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click', () => {
        const on = document.body.classList.toggle('show-advanced-fields');
        button.setAttribute('aria-pressed', String(on));
        button.textContent = on ? 'Hide advanced fields' : 'Advanced fields';
      });
    });
  }

  function markTechnicalLabels(root=document) {
    $$('label',root).forEach((label) => {
      const title = label.querySelector(':scope > span');
      if (!title) return;
      const text=(title.textContent||'').trim();
      if (text === 'ID' || text === 'Node ID' || text === 'Outcome ID' || text === 'Internal ID') {
        title.textContent='Internal ID';
        label.classList.add('ux-technical-field');
      }
    });
  }

  function applyInteractionBuilder() {
    document.title='Interaction Builder · Learning Experience Engine';
    replaceExact(document,'small','Component Studio','Interaction Builder');
    replaceExact(document,'.status-chip','Engine-native','Reusable interaction');
    replaceExact(document,'a,button','Component Studio','Interaction Builder');
    replaceExact(document,'.preview-actions button','Review interaction','Preview as learner');
    replaceExact(document,'.preview-actions button','Refresh preview','Restart preview');

    const labels={
      'Image path':'Image',
      'Media path':'Media file',
      'X %':'Horizontal position (%)',
      'Y %':'Vertical position (%)',
      'Correct?':'Correct answer?',
      'Items per page':'Items shown at once'
    };
    $$('label > span').forEach((span)=>{const t=(span.textContent||'').trim();if(labels[t])span.textContent=labels[t];});

    const humanTypes={
      carousel:'Carousel',
      'hotspot-reveal':'Visual exploration',
      assessment:'Knowledge check',
      'media-presentation':'Guided media'
    };
    const active=$('[data-type].active')?.dataset.type;
    if(active&&humanTypes[active]){
      $('[data-editor-title]') && ($('[data-editor-title]').textContent=humanTypes[active]);
      $('[data-preview-type]') && ($('[data-preview-type]').textContent=humanTypes[active]);
      $('[data-preview-kind]') && ($('[data-preview-kind]').textContent=humanTypes[active]);
    }
    markTechnicalLabels();
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
      const t=(span.textContent||'').trim(); if(map[t]) span.textContent=map[t];
    });
    $$('.type-chip').forEach((chip)=>{
      const t=(chip.textContent||'').trim();
      if(t==='component')chip.textContent='interaction';
      if(t==='resource')chip.textContent='job aid';
    });
    $$('.content-card-title small').forEach((el)=>{
      el.textContent=(el.textContent||'').replace(/\bcomponent\b/g,'interaction').replace(/\bresource\b/g,'job aid');
    });
    $$('.component-summary small,.editor-note').forEach((el)=>{
      el.textContent=(el.textContent||'')
        .replace(/Engine-native interaction/g,'Reusable interaction')
        .replace(/Component Studio/g,'Interaction Builder')
        .replace(/component JSON/gi,'interaction file');
    });
  }

  function applyScenario() {
    const labelMap={
      'Node ID':'Internal ID',
      'Outcome ID':'Internal ID',
      'Speaker / role':'Who is speaking?',
      'Decision title / situation':"What's happening?",
      'Situation details':'What does the learner know?',
      'Send learner to':'What happens next?',
      'Score change':'Impact on score',
      'Immediate feedback':'Coaching feedback',
      'Outcome title':'Outcome name',
      'Outcome explanation':'What happened?',
      'Visual':'Image'
    };
    $$('label > span').forEach((span)=>{const t=(span.textContent||'').trim();if(labelMap[t])span.textContent=labelMap[t];});
    markTechnicalLabels();

    const check=$('[data-path-check]');
    if(check){
      const t=(check.textContent||'').trim();
      if(t.startsWith('Path check:')) check.textContent=t.replace(/^Path check:\s*/,'Things to fix before preview: ');
      else if(t.startsWith('Path runs,')) check.textContent=t.replace(/^Path runs,\s*/,'Ready to preview, with ');
      else if(t.startsWith('Path check ✓')) check.textContent='Ready to preview ✓ All decisions lead somewhere and at least one outcome can be reached.';
    }
    $$('select[data-choice-field="targetId"] option').forEach((option)=>{
      option.textContent=(option.textContent||'').replace(/^Decision · /,'Next decision · ').replace(/^Missing · /,'Needs attention · ');
    });
    replaceExact(document,'button','Preview from beginning','Preview');
    replaceExact(document,'button','Open focused preview','Preview as learner');
    replaceExact(document,'.canvas-label span','Decision nodes','Decision points');
  }

  function updateScoreSummary(){
    const details=$('[data-score-settings]');
    const enabled=$('[data-score-field="enabled"]');
    const summary=details?.querySelector('summary [data-score-summary]');
    if(summary&&enabled) summary.textContent=enabled.checked?'Optional scoring · On':'Optional scoring · Off';
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
