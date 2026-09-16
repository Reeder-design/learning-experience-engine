(() => {
  const templates = {
    carousel: {
      schemaVersion: '0.1', id: 'new-carousel', title: 'Customer Signals', type: 'carousel',
      description: 'A reusable learning interaction created directly in the Learning Experience Engine.',
      instruction: 'Review each item to continue.', theme: 'portfolio',
      completion: { strategy: 'view-all', required: true },
      content: { pageSize: 3, items: [
        { id: 'item-1', title: 'Signal one', body: 'Describe the first learning point.', image: null, alt: null },
        { id: 'item-2', title: 'Signal two', body: 'Describe the second learning point.', image: null, alt: null },
        { id: 'item-3', title: 'Signal three', body: 'Describe the third learning point.', image: null, alt: null },
        { id: 'item-4', title: 'Signal four', body: 'Describe another learning point.', image: null, alt: null }
      ] }
    },
    'hotspot-reveal': {
      schemaVersion: '0.1', id: 'new-hotspot-reveal', title: 'Explore the Workflow', type: 'hotspot-reveal',
      description: 'Explore a visual and reveal details at meaningful points.',
      instruction: 'Select each hotspot to reveal more information.', theme: 'portfolio',
      completion: { strategy: 'view-all', required: true },
      content: { background: { image: null, alt: 'Interaction background' }, hotspots: [
        { id: 'hotspot-1', x: 22, y: 30, label: 'Step 1', title: 'First area', body: 'Explain what the learner should notice here.', image: null },
        { id: 'hotspot-2', x: 50, y: 58, label: 'Step 2', title: 'Second area', body: 'Add the next piece of contextual information.', image: null },
        { id: 'hotspot-3', x: 78, y: 34, label: 'Step 3', title: 'Third area', body: 'Close the exploration with another relevant detail.', image: null }
      ] }
    },
    assessment: {
      schemaVersion: '0.1', id: 'new-assessment', title: 'Knowledge Check', type: 'assessment',
      description: 'A focused assessment with immediate feedback.',
      instruction: 'Choose the best response for each question.', theme: 'portfolio',
      completion: { strategy: 'answer', required: true },
      content: { questions: [
        { id: 'q1', prompt: 'What is the best next step?', type: 'single-select', options: [
          { id: 'q1-a', text: 'Explore the learner or customer need first.', correct: true, feedback: 'Correct. Start with the underlying need.' },
          { id: 'q1-b', text: 'Jump directly to the solution.', correct: false, feedback: 'That moves to a solution before the need is understood.' },
          { id: 'q1-c', text: 'Skip discovery and send a generic resource.', correct: false, feedback: 'A generic resource does not replace discovery.' }
        ] }
      ] }
    },
    'media-presentation': {
      schemaVersion: '0.1', id: 'new-media-presentation', title: 'Guided Media Walkthrough', type: 'media-presentation',
      description: 'Organize video or audio into a guided learning sequence.',
      instruction: 'Move through each media segment.', theme: 'portfolio',
      completion: { strategy: 'media-end', required: true },
      content: { media: [
        { id: 'media-1', kind: 'video', src: 'assets/video.mp4', title: 'Introduction', caption: 'Introduce the context for the learner.', transcript: 'Add transcript text here.' },
        { id: 'media-2', kind: 'audio', src: 'assets/audio.mp3', title: 'Conversation example', caption: 'Listen for the key signal.', transcript: 'Add transcript text here.' }
      ] }
    }
  };

  const typeNames = { carousel: 'Carousel', 'hotspot-reveal': 'Hotspot reveal', assessment: 'Assessment', 'media-presentation': 'Media presentation' };
  let model = structuredClone(templates.carousel);
  let carouselPage = 0;
  const viewedHotspots = new Set();

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const editor = $('[data-dynamic-editor]');
  const jsonOutput = $('[data-json-output]');
  const previewStage = $('[data-preview-stage]');
  const previewStatus = $('[data-preview-status]');
  const previewState = $('[data-preview-state]');

  function slug(value, fallback) {
    const text = String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return text || fallback;
  }

  function input(label, value, onInput, options = {}) {
    const wrapper = document.createElement('label');
    const title = document.createElement('span');
    title.textContent = label;
    const field = options.textarea ? document.createElement('textarea') : document.createElement('input');
    if (!options.textarea) field.type = options.type || 'text';
    if (options.textarea) field.rows = options.rows || 2;
    field.value = value ?? '';
    if (options.min != null) field.min = options.min;
    if (options.max != null) field.max = options.max;
    field.addEventListener('input', () => onInput(options.type === 'number' ? Number(field.value) : field.value));
    wrapper.append(title, field);
    return wrapper;
  }

  function selectField(label, value, values, onInput) {
    const wrapper = document.createElement('label');
    const title = document.createElement('span'); title.textContent = label;
    const field = document.createElement('select');
    for (const optionValue of values) {
      const option = document.createElement('option'); option.value = optionValue; option.textContent = optionValue; option.selected = optionValue === value; field.appendChild(option);
    }
    field.addEventListener('change', () => onInput(field.value));
    wrapper.append(title, field); return wrapper;
  }

  function button(label, className, onClick) {
    const element = document.createElement('button');
    element.type = 'button'; element.className = className; element.textContent = label; element.addEventListener('click', onClick); return element;
  }

  function groupHeader(title, addLabel, onAdd) {
    const head = document.createElement('div'); head.className = 'editor-group-head';
    const h = document.createElement('h3'); h.textContent = title; head.appendChild(h);
    if (onAdd) head.appendChild(button(addLabel, 'mini-button', onAdd));
    return head;
  }

  function repeatCard(label, onRemove) {
    const card = document.createElement('div'); card.className = 'repeat-card';
    const head = document.createElement('div'); head.className = 'repeat-card-head';
    const strong = document.createElement('strong'); strong.textContent = label;
    head.append(strong, button('Remove', 'remove-button', onRemove)); card.appendChild(head); return card;
  }

  function row(...fields) { const element = document.createElement('div'); element.className = 'field-row'; fields.forEach((field) => element.appendChild(field)); return element; }

  function syncGeneralFields() {
    $('[data-field="title"]').value = model.title;
    $('[data-field="description"]').value = model.description || '';
    $('[data-field="instruction"]').value = model.instruction || '';
    $('[data-editor-title]').textContent = typeNames[model.type];
    $('[data-preview-type]').textContent = typeNames[model.type];
  }

  function renderEditor() {
    editor.innerHTML = '';
    const group = document.createElement('div'); group.className = 'editor-group';

    if (model.type === 'carousel') {
      group.appendChild(input('Items per page', model.content.pageSize, (value) => { model.content.pageSize = Math.max(1, value || 1); refresh(); }, { type: 'number', min: 1, max: 6 }));
      group.appendChild(groupHeader('Carousel items', '+ Add item', () => {
        const n = model.content.items.length + 1;
        model.content.items.push({ id: `item-${n}`, title: `Item ${n}`, body: '', image: null, alt: null }); renderEditor(); refresh();
      }));
      model.content.items.forEach((item, index) => {
        const card = repeatCard(`Item ${index + 1}`, () => { model.content.items.splice(index, 1); renderEditor(); refresh(); });
        card.append(
          row(input('Title', item.title, (v) => { item.title = v; refresh(); }), input('ID', item.id, (v) => { item.id = slug(v, `item-${index + 1}`); refresh(); })),
          input('Body', item.body, (v) => { item.body = v; refresh(); }, { textarea: true }),
          row(input('Image path', item.image || '', (v) => { item.image = v || null; refresh(); }), input('Alt text', item.alt || '', (v) => { item.alt = v || null; refresh(); }))
        ); group.appendChild(card);
      });
    }

    if (model.type === 'hotspot-reveal') {
      group.appendChild(groupHeader('Background', null));
      group.append(row(input('Image path', model.content.background.image || '', (v) => { model.content.background.image = v || null; refresh(); }), input('Alt text', model.content.background.alt || '', (v) => { model.content.background.alt = v || null; refresh(); })));
      group.appendChild(groupHeader('Hotspots', '+ Add hotspot', () => {
        const n = model.content.hotspots.length + 1;
        model.content.hotspots.push({ id: `hotspot-${n}`, x: 50, y: 50, label: `Hotspot ${n}`, title: `Hotspot ${n}`, body: '', image: null }); renderEditor(); refresh();
      }));
      model.content.hotspots.forEach((item, index) => {
        const card = repeatCard(`Hotspot ${index + 1}`, () => { model.content.hotspots.splice(index, 1); viewedHotspots.clear(); renderEditor(); refresh(); });
        card.append(
          row(input('Label', item.label, (v) => { item.label = v; refresh(); }), input('Title', item.title, (v) => { item.title = v; refresh(); })),
          row(input('X %', item.x, (v) => { item.x = Math.max(0, Math.min(100, v)); refresh(); }, { type: 'number', min: 0, max: 100 }), input('Y %', item.y, (v) => { item.y = Math.max(0, Math.min(100, v)); refresh(); }, { type: 'number', min: 0, max: 100 })),
          input('Reveal content', item.body, (v) => { item.body = v; refresh(); }, { textarea: true })
        ); group.appendChild(card);
      });
    }

    if (model.type === 'assessment') {
      group.appendChild(groupHeader('Questions', '+ Add question', () => {
        const n = model.content.questions.length + 1;
        model.content.questions.push({ id: `q${n}`, prompt: 'New question', type: 'single-select', options: [
          { id: `q${n}-a`, text: 'Correct option', correct: true, feedback: 'Correct.' },
          { id: `q${n}-b`, text: 'Incorrect option', correct: false, feedback: 'Try again.' }
        ] }); renderEditor(); refresh();
      }));
      model.content.questions.forEach((question, qi) => {
        const card = repeatCard(`Question ${qi + 1}`, () => { model.content.questions.splice(qi, 1); renderEditor(); refresh(); });
        card.append(input('Prompt', question.prompt, (v) => { question.prompt = v; refresh(); }, { textarea: true }));
        card.appendChild(groupHeader('Answer options', '+ Add option', () => {
          const letter = String.fromCharCode(97 + question.options.length);
          question.options.push({ id: `${question.id}-${letter}`, text: 'New option', correct: false, feedback: '' }); renderEditor(); refresh();
        }));
        question.options.forEach((option, oi) => {
          const optionCard = repeatCard(`Option ${oi + 1}`, () => { question.options.splice(oi, 1); renderEditor(); refresh(); });
          const correct = selectField('Correct?', option.correct ? 'yes' : 'no', ['no', 'yes'], (v) => { option.correct = v === 'yes'; refresh(); });
          optionCard.append(row(input('Answer text', option.text, (v) => { option.text = v; refresh(); }), correct), input('Feedback', option.feedback || '', (v) => { option.feedback = v; refresh(); }));
          card.appendChild(optionCard);
        }); group.appendChild(card);
      });
    }

    if (model.type === 'media-presentation') {
      group.appendChild(groupHeader('Media segments', '+ Add segment', () => {
        const n = model.content.media.length + 1;
        model.content.media.push({ id: `media-${n}`, kind: 'video', src: 'assets/media.mp4', title: `Segment ${n}`, caption: '', transcript: '' }); renderEditor(); refresh();
      }));
      model.content.media.forEach((item, index) => {
        const card = repeatCard(`Segment ${index + 1}`, () => { model.content.media.splice(index, 1); renderEditor(); refresh(); });
        card.append(
          row(input('Title', item.title, (v) => { item.title = v; refresh(); }), selectField('Type', item.kind, ['video', 'audio'], (v) => { item.kind = v; refresh(); })),
          input('Media path', item.src, (v) => { item.src = v; refresh(); }),
          input('Caption', item.caption || '', (v) => { item.caption = v; refresh(); }, { textarea: true }),
          input('Transcript', item.transcript || '', (v) => { item.transcript = v; refresh(); }, { textarea: true, rows: 3 })
        ); group.appendChild(card);
      });
    }
    editor.appendChild(group);
  }

  function resetPreviewState() {
    previewState.textContent = 'In progress'; previewState.classList.remove('complete');
  }
  function completePreview() { previewState.textContent = 'Complete ✓'; previewState.classList.add('complete'); }

  function renderCarouselPreview() {
    const items = model.content.items || [], pageSize = Math.max(1, model.content.pageSize || 3), pages = Math.max(1, Math.ceil(items.length / pageSize));
    carouselPage = Math.min(carouselPage, pages - 1); previewStage.innerHTML = '';
    const cards = document.createElement('div'); cards.className = 'preview-cards';
    const visible = items.slice(carouselPage * pageSize, carouselPage * pageSize + pageSize);
    visible.forEach((item) => { const card = document.createElement('article'); card.className = 'preview-card'; card.innerHTML = `<div class="preview-visual">${item.image ? 'Image' : 'Visual'}</div><div class="preview-card-body"><h3>${escapeHtml(item.title || 'Untitled')}</h3><p>${escapeHtml(item.body || '')}</p></div>`; cards.appendChild(card); });
    const controls = document.createElement('div'); controls.className = 'preview-controls';
    const prev = button('← Previous', '', () => { carouselPage = Math.max(0, carouselPage - 1); renderPreview(); }); prev.disabled = carouselPage === 0;
    const dots = document.createElement('div'); dots.className = 'preview-dots'; for(let i=0;i<pages;i++){const dot=document.createElement('span');if(i===carouselPage)dot.className='active';dots.appendChild(dot)}
    const next = button('Next →', '', () => { carouselPage = Math.min(pages - 1, carouselPage + 1); renderPreview(); }); next.disabled = carouselPage === pages - 1;
    controls.append(prev,dots,next); previewStage.append(cards,controls); previewStatus.textContent = `Page ${carouselPage + 1} of ${pages}`;
    if (pages === 1 || carouselPage === pages - 1) completePreview();
  }

  function renderHotspotPreview() {
    previewStage.innerHTML = ''; const canvas=document.createElement('div');canvas.className='hotspot-canvas'; const detail=document.createElement('div');detail.className='hotspot-detail';detail.innerHTML='<h3>Select a hotspot</h3><p>Reveal content appears here.</p>';
    (model.content.hotspots||[]).forEach((item,index)=>{const b=button(String(index+1),'studio-hotspot',()=>{viewedHotspots.add(item.id);b.classList.add('visited');detail.innerHTML=`<h3>${escapeHtml(item.title||item.label)}</h3><p>${escapeHtml(item.body||'')}</p>`;previewStatus.textContent=`${viewedHotspots.size} of ${model.content.hotspots.length} hotspots viewed`;if(viewedHotspots.size>=model.content.hotspots.length)completePreview()});b.style.left=`${item.x}%`;b.style.top=`${item.y}%`;b.title=item.label;if(viewedHotspots.has(item.id))b.classList.add('visited');canvas.appendChild(b)});previewStage.append(canvas,detail);previewStatus.textContent=`${viewedHotspots.size} of ${model.content.hotspots.length} hotspots viewed`;
  }

  function renderAssessmentPreview() {
    previewStage.innerHTML=''; const q=model.content.questions?.[0]; if(!q){previewStage.textContent='Add a question to preview the assessment.';return} const wrap=document.createElement('div');wrap.className='preview-question';const h=document.createElement('h3');h.textContent=q.prompt;const options=document.createElement('div');options.className='preview-options';const feedback=document.createElement('div');feedback.className='preview-feedback';feedback.textContent='Choose an option to preview feedback.';q.options.forEach((option)=>{const b=button(option.text,'',()=>{options.querySelectorAll('button').forEach(x=>x.disabled=true);b.classList.add(option.correct?'correct':'incorrect');feedback.textContent=option.feedback|| (option.correct?'Correct.':'Not quite.');completePreview()});options.appendChild(b)});wrap.append(h,options,feedback);previewStage.appendChild(wrap);previewStatus.textContent=`Previewing question 1 of ${model.content.questions.length}`;
  }

  function renderMediaPreview() {
    previewStage.innerHTML='';const media=model.content.media||[];if(!media.length){previewStage.textContent='Add a media segment to preview.';return}let selected=0;const tabs=document.createElement('div');tabs.className='preview-media-tabs';const card=document.createElement('div');card.className='preview-media-card';function draw(){tabs.innerHTML='';media.forEach((item,index)=>{const b=button(item.title||`Segment ${index+1}`,index===selected?'active':'',()=>{selected=index;draw()});tabs.appendChild(b)});const item=media[selected];card.innerHTML=`<h3>${escapeHtml(item.title||'Media segment')}</h3><div class="media-placeholder">${item.kind==='audio'?'Audio':'Video'} preview</div><p>${escapeHtml(item.caption||'')}</p>`;previewStatus.textContent=`Segment ${selected+1} of ${media.length}`;if(selected===media.length-1)completePreview()}draw();previewStage.append(tabs,card);
  }

  function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

  function renderPreview() {
    $('[data-preview-kind]').textContent=model.type;$('[data-preview-title]').textContent=model.title;$('[data-preview-description]').textContent=model.description||'';$('[data-preview-instruction]').textContent=model.instruction||'';jsonOutput.textContent=JSON.stringify(model,null,2);resetPreviewState();
    if(model.type==='carousel')renderCarouselPreview();if(model.type==='hotspot-reveal')renderHotspotPreview();if(model.type==='assessment')renderAssessmentPreview();if(model.type==='media-presentation')renderMediaPreview();
  }

  function refresh(){model.id=slug(model.title,`new-${model.type}`);renderPreview()}

  $$('[data-field]').forEach((field)=>field.addEventListener('input',()=>{model[field.dataset.field]=field.value;refresh()}));
  $$('[data-type]').forEach((buttonEl)=>buttonEl.addEventListener('click',()=>{const type=buttonEl.dataset.type;model=structuredClone(templates[type]);carouselPage=0;viewedHotspots.clear();$$('[data-type]').forEach((b)=>b.classList.toggle('active',b===buttonEl));syncGeneralFields();renderEditor();refresh()}));

  $('[data-copy]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(model,null,2));const b=$('[data-copy]');const old=b.textContent;b.textContent='Copied ✓';setTimeout(()=>b.textContent=old,1200)}catch(_){jsonOutput.parentElement.open=true}});
  $('[data-download]').addEventListener('click',()=>{const blob=new Blob([`${JSON.stringify(model,null,2)}\n`],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${slug(model.title,model.type)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)});

  syncGeneralFields();renderEditor();refresh();
})();
