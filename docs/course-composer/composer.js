(() => {
  const STORAGE_KEY = 'lx-course-composer:draft-v0.1';
  const IMAGE_EXT = new Set(['png','jpg','jpeg','gif','webp','svg']);
  const VIDEO_EXT = new Set(['mp4','webm','mov','m4v']);
  const AUDIO_EXT = new Set(['mp3','wav','m4a','aac','ogg']);
  const CAPTION_EXT = new Set(['vtt','srt']);
  const CONTEXT_EXT = new Set(['txt','md','markdown','csv','json']);
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const clone = (v) => JSON.parse(JSON.stringify(v));

  const helpTopics = {
    outline: ['Course structure', 'This is the learner sequence. Add content or components, drag items to reorder them, and select any item to edit it.'],
    basics: ['Course basics', 'Set the learner-facing course title, description, audience, and objectives. These values become part of the engine course JSON.'],
    section: ['Section editor', 'The fields here change with the selected section type. Media and resource paths can be filled from the shared Project Assets library.'],
    preview: ['Learner preview', 'Use Previous and Next to walk through the course in sequence. Selecting an outline item also jumps the preview to that section.'],
    json: ['Generated course JSON', 'Composer keeps this engine-native course definition synchronized for you. Normal authoring should happen through the interface, not by hand-editing JSON.']
  };

  function slugify(value) {
    return String(value || 'course').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64) || 'course';
  }
  function uid(prefix='section') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }
  function extension(name='') { const m=String(name).toLowerCase().match(/\.([a-z0-9]+)$/); return m?m[1]:''; }
  function classify(file, path='') {
    const ext=extension(file.name); const lower=path.toLowerCase();
    if (IMAGE_EXT.has(ext)) return 'image'; if (VIDEO_EXT.has(ext)) return 'video'; if (AUDIO_EXT.has(ext)) return 'audio';
    if (CAPTION_EXT.has(ext)) return 'caption'; if (ext==='pdf') return 'pdf';
    if (CONTEXT_EXT.has(ext)||lower.includes('/context/')||lower.startsWith('context/')) return 'context';
    if (['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)) return 'document'; return 'other';
  }
  function defaultPath(file) {
    const kind=classify(file,file.name); const folder={image:'assets/images',video:'assets/video',audio:'assets/audio',caption:'assets/captions',pdf:'assets/documents',document:'assets/documents',context:'context',other:'assets/other'}[kind]||'assets/other';
    return `${folder}/${file.name}`;
  }
  function newUnit(type='text') {
    const id=uid(type); const titles={text:'New text section',image:'New image section',video:'New video section',resource:'New resource',component:'New component'};
    const payload={type};
    if(type==='text') payload.body='Add the learning content for this section.';
    if(type==='image') Object.assign(payload,{body:'',assetPath:'',alt:''});
    if(type==='video') Object.assign(payload,{body:'',assetPath:'',captionPath:'',transcript:''});
    if(type==='resource') Object.assign(payload,{body:'',assetPath:'',label:'Open resource'});
    if(type==='component') Object.assign(payload,{component:null});
    return {id,kind:'lesson',title:titles[type]||'New section',source:`inline:${id}`,composer:payload};
  }
  function defaultCourse() {
    const first=newUnit('text'); first.title='Welcome'; first.composer.body='Introduce the learning experience and explain what the learner will accomplish.';
    return {schemaVersion:'0.1',id:'new-learning-experience',title:'New learning experience',description:'',audience:[],objectives:['Describe the key ideas in this learning experience.'],metadata:{composer:{version:'0.1',assets:[]}},theme:{id:'portfolio'},navigation:{mode:'linear'},units:[first]};
  }

  const state={course:defaultCourse(),selectedId:null,previewIndex:0,assets:[],context:[],objectUrls:new Map(),activePathInput:null,history:[],historyIndex:-1,historyTimer:null,saveTimer:null,dragId:null};
  state.selectedId=state.course.units[0].id;

  function selectedUnit(){return state.course.units.find(u=>u.id===state.selectedId)||state.course.units[0]||null;}
  function getCourse(){
    const out=clone(state.course); out.id=slugify(out.title);
    out.metadata=out.metadata||{}; out.metadata.composer=out.metadata.composer||{version:'0.1'};
    out.metadata.composer.assets=state.assets.map(a=>({path:a.path,kind:a.kind,size:a.file.size,mediaType:a.file.type||null}));
    out.metadata.composer.updatedAt=new Date().toISOString(); return out;
  }
  function snapshot(){return JSON.stringify(state.course);}
  function captureHistory(){
    clearTimeout(state.historyTimer); state.historyTimer=setTimeout(()=>{
      const snap=snapshot(); if(state.history[state.historyIndex]===snap) return;
      state.history=state.history.slice(0,state.historyIndex+1); state.history.push(snap); if(state.history.length>60) state.history.shift();
      state.historyIndex=state.history.length-1; updateUndoRedo();
    },350);
  }
  function captureNow(){clearTimeout(state.historyTimer);const snap=snapshot();if(state.history[state.historyIndex]===snap)return;state.history=state.history.slice(0,state.historyIndex+1);state.history.push(snap);if(state.history.length>60)state.history.shift();state.historyIndex=state.history.length-1;updateUndoRedo();}
  function updateUndoRedo(){ $('[data-undo]').disabled=state.historyIndex<=0; $('[data-redo]').disabled=state.historyIndex<0||state.historyIndex>=state.history.length-1; }
  function undo(){if(state.historyIndex<=0)return;state.historyIndex--;state.course=JSON.parse(state.history[state.historyIndex]);ensureSelection();renderAll();scheduleSave(false);}
  function redo(){if(state.historyIndex>=state.history.length-1)return;state.historyIndex++;state.course=JSON.parse(state.history[state.historyIndex]);ensureSelection();renderAll();scheduleSave(false);}
  function ensureSelection(){if(!state.course.units.some(u=>u.id===state.selectedId))state.selectedId=state.course.units[0]?.id||null;state.previewIndex=Math.max(0,Math.min(state.previewIndex,state.course.units.length-1));}
  function scheduleSave(show=true){clearTimeout(state.saveTimer);if(show)$('[data-save-state]').textContent='Saving…';state.saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.course));$('[data-save-state]').textContent='Autosaved';}catch(_){$('[data-save-state]').textContent='Local save unavailable';}},260);}
  function restoreDraft(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;const parsed=JSON.parse(raw);if(parsed?.schemaVersion==='0.1'&&Array.isArray(parsed.units)){state.course=parsed;state.selectedId=parsed.units[0]?.id||null;}}catch(_){} }

  function updateDerived({history=true}={}){renderOutline();renderJson();renderPreview();renderCourseHeadOnly();scheduleSave();if(history)captureHistory();}
  function renderAll(){renderBasics();renderObjectives();renderOutline();renderSectionEditor();renderJson();renderPreview();renderCourseHeadOnly();updateUndoRedo();}
  function renderCourseHeadOnly(){ $('[data-outline-title]').textContent=state.course.title||'Untitled course'; $('[data-preview-title]').textContent=state.course.title||'Untitled course'; }

  function renderBasics(){
    $('[data-course-field="title"]').value=state.course.title||''; $('[data-course-field="description"]').value=state.course.description||''; $('[data-course-field="audience"]').value=(state.course.audience||[]).join(', ');
  }
  function renderObjectives(){
    const root=$('[data-objectives]');root.innerHTML='';(state.course.objectives||[]).forEach((obj,i)=>{
      const row=document.createElement('div');row.className='objective-row';row.innerHTML=`<input type="text" value="${escapeAttr(obj)}" aria-label="Objective ${i+1}"><button type="button" class="remove-objective" aria-label="Remove objective">×</button>`;
      $('input',row).addEventListener('input',e=>{state.course.objectives[i]=e.target.value;updateDerived();});
      $('button',row).addEventListener('click',()=>{state.course.objectives.splice(i,1);captureNow();renderObjectives();updateDerived({history:false});});root.appendChild(row);
    });
    if(!state.course.objectives.length)root.innerHTML='<div class="editor-note">No objectives yet. Add one when you are ready.</div>';
  }
  function iconFor(type){return {text:'¶',image:'▧',video:'▶',resource:'↗',component:'◇'}[type]||'•';}
  function renderOutline(){
    const root=$('[data-outline-list]');root.innerHTML='';
    if(!state.course.units.length){root.innerHTML='<div class="empty-state">Your course is empty. Add the first section above.</div>';return;}
    state.course.units.forEach((u,i)=>{
      const type=u.composer?.type||'text';const row=document.createElement('div');row.className=`outline-item${u.id===state.selectedId?' active':''}`;row.draggable=true;row.dataset.id=u.id;
      row.innerHTML=`<span class="drag-handle" title="Drag to reorder">⋮⋮</span><span class="outline-copy"><strong>${escapeHtml(u.title||'Untitled')}</strong><small>${iconFor(type)} ${type}</small></span><span class="outline-actions"><button type="button" data-up title="Move up">↑</button><button type="button" data-down title="Move down">↓</button><button type="button" data-duplicate title="Duplicate">⧉</button><button type="button" data-delete title="Delete">×</button></span>`;
      row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.selectedId=u.id;state.previewIndex=i;renderOutline();renderSectionEditor();renderPreview();});
      $('[data-up]',row).addEventListener('click',()=>moveUnit(i,-1)); $('[data-down]',row).addEventListener('click',()=>moveUnit(i,1)); $('[data-duplicate]',row).addEventListener('click',()=>duplicateUnit(i)); $('[data-delete]',row).addEventListener('click',()=>deleteUnit(i));
      row.addEventListener('dragstart',()=>{state.dragId=u.id;row.classList.add('dragging');});row.addEventListener('dragend',()=>{state.dragId=null;row.classList.remove('dragging');});row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>{e.preventDefault();reorderTo(state.dragId,u.id);});root.appendChild(row);
    });
  }
  function moveUnit(index,delta){const target=index+delta;if(target<0||target>=state.course.units.length)return;const [item]=state.course.units.splice(index,1);state.course.units.splice(target,0,item);state.previewIndex=target;captureNow();renderAll();scheduleSave();}
  function duplicateUnit(index){const copy=clone(state.course.units[index]);copy.id=uid(copy.composer?.type||'section');copy.source=`inline:${copy.id}`;copy.title=`${copy.title} copy`;state.course.units.splice(index+1,0,copy);state.selectedId=copy.id;state.previewIndex=index+1;captureNow();renderAll();scheduleSave();}
  function deleteUnit(index){const removed=state.course.units[index];state.course.units.splice(index,1);if(state.selectedId===removed.id)state.selectedId=state.course.units[Math.min(index,state.course.units.length-1)]?.id||null;state.previewIndex=Math.min(index,Math.max(0,state.course.units.length-1));captureNow();renderAll();scheduleSave();}
  function reorderTo(sourceId,targetId){if(!sourceId||sourceId===targetId)return;const from=state.course.units.findIndex(u=>u.id===sourceId),to=state.course.units.findIndex(u=>u.id===targetId);if(from<0||to<0)return;const [item]=state.course.units.splice(from,1);state.course.units.splice(to,0,item);state.previewIndex=state.course.units.findIndex(u=>u.id===state.selectedId);captureNow();renderAll();scheduleSave();}

  function field(label,value,key,type='text',extra=''){
    if(type==='textarea')return `<label><span>${label}</span><textarea rows="4" data-unit-field="${key}" ${extra}>${escapeHtml(value||'')}</textarea></label>`;
    return `<label><span>${label}</span><input type="${type}" data-unit-field="${key}" value="${escapeAttr(value||'')}" ${extra}></label>`;
  }
  function renderSectionEditor(){
    const root=$('[data-section-editor]'),u=selectedUnit();if(!u){$('[data-editor-title]').textContent='Section editor';$('[data-editor-type]').textContent='empty';root.innerHTML='<div class="empty-state">Add a section to start building your course.</div>';return;}
    const type=u.composer?.type||'text';$('[data-editor-title]').textContent=u.title||'Untitled section';$('[data-editor-type]').textContent=type;
    let html='<div class="section-form">'+field('Section title',u.title,'title');
    if(type==='text')html+=field('Body',u.composer.body,'body','textarea');
    if(type==='image')html+=field('Supporting text',u.composer.body,'body','textarea')+field('Image path',u.composer.assetPath,'assetPath')+field('Alt text',u.composer.alt,'alt');
    if(type==='video')html+=field('Supporting text',u.composer.body,'body','textarea')+field('Video path',u.composer.assetPath,'assetPath')+field('Caption path',u.composer.captionPath,'captionPath')+field('Transcript',u.composer.transcript,'transcript','textarea');
    if(type==='resource')html+=field('Description',u.composer.body,'body','textarea')+field('Document path',u.composer.assetPath,'assetPath')+field('Button label',u.composer.label,'label');
    if(type==='component'){
      const c=u.composer.component;html+=`<div class="component-summary">${c?`<strong>${escapeHtml(c.title||'Imported component')}</strong><small>${escapeHtml(c.type||'component')} · ${escapeHtml(c.description||'Engine-native interaction')}</small>`:'<strong>No component imported yet</strong><small>Import a Component Studio JSON file, or build one in Component Studio first.</small>'}</div><div class="component-actions"><button type="button" class="action-button primary-soft" data-import-component>${c?'Replace component JSON':'Import component JSON'}</button><a class="action-button" href="../component-studio/index.html">Open Component Studio →</a></div><div class="editor-note">Component JSON is embedded into the course. Its asset paths can reference this course&apos;s shared Project Assets folder.</div>`;
    }
    html+='</div>';root.innerHTML=html;
    $$('[data-unit-field]',root).forEach(input=>{input.addEventListener('focus',()=>{if(/path$/i.test(input.dataset.unitField))state.activePathInput=input;});input.addEventListener('input',()=>{const unit=selectedUnit();if(!unit)return;const k=input.dataset.unitField;if(k==='title')unit.title=input.value;else unit.composer[k]=input.value;updateDerived();$('[data-editor-title]').textContent=unit.title||'Untitled section';});});
    $('[data-import-component]',root)?.addEventListener('click',()=>{window.__lxComponentTarget=state.selectedId;$('[data-component-input]').click();});
  }

  function renderJson(){ $('[data-json-output]').textContent=JSON.stringify(getCourse(),null,2); }
  function assetUrl(path){return state.objectUrls.get(path)||null;}
  function renderPreview(){
    const units=state.course.units;state.previewIndex=Math.max(0,Math.min(state.previewIndex,Math.max(0,units.length-1)));const u=units[state.previewIndex];
    $('[data-preview-course-title]').textContent=state.course.title||'Untitled course';$('[data-preview-course-description]').textContent=state.course.description||'';
    const objRoot=$('[data-preview-objectives]');objRoot.innerHTML='';(state.course.objectives||[]).filter(Boolean).slice(0,4).forEach(o=>{const s=document.createElement('span');s.textContent=o;objRoot.appendChild(s);});
    $('[data-progress]').textContent=units.length?`${state.previewIndex+1} / ${units.length}`:'0 / 0';
    const stage=$('[data-preview-stage]');if(!u){stage.innerHTML='<div class="empty-state">Add course content to see the learner preview.</div>';}else renderUnitPreview(u,stage);
    $('[data-prev]').disabled=state.previewIndex<=0;$('[data-next]').disabled=state.previewIndex>=units.length-1;
    const dots=$('[data-preview-dots]');dots.innerHTML='';units.forEach((_,i)=>{const d=document.createElement('span');if(i===state.previewIndex)d.className='active';dots.appendChild(d);});
  }
  function renderUnitPreview(u,stage){
    const type=u.composer?.type||'text';stage.innerHTML='';
    const wrap=document.createElement('article');wrap.innerHTML=`<span class="component-badge">${escapeHtml(type)}</span><h3>${escapeHtml(u.title||'Untitled')}</h3>`;stage.appendChild(wrap);
    if(type==='text'){wrap.insertAdjacentHTML('beforeend',`<p>${nl2br(u.composer.body||'')}</p>`);return;}
    if(type==='image'){wrap.insertAdjacentHTML('beforeend',`<p>${nl2br(u.composer.body||'')}</p>`);const media=document.createElement('div');media.className='media-preview';const url=assetUrl(u.composer.assetPath);media.innerHTML=url?`<img src="${url}" alt="${escapeAttr(u.composer.alt||'')}">`:`<span>${escapeHtml(u.composer.assetPath||'Choose an image from Project Assets')}</span>`;wrap.appendChild(media);return;}
    if(type==='video'){wrap.insertAdjacentHTML('beforeend',`<p>${nl2br(u.composer.body||'')}</p>`);const media=document.createElement('div');media.className='media-preview';const url=assetUrl(u.composer.assetPath);if(url){const v=document.createElement('video');v.src=url;v.controls=true;const cap=assetUrl(u.composer.captionPath);if(cap){const t=document.createElement('track');t.kind='captions';t.srclang='en';t.label='Captions';t.src=cap;v.appendChild(t);}media.appendChild(v);}else media.innerHTML=`<span>${escapeHtml(u.composer.assetPath||'Choose a video from Project Assets')}</span>`;wrap.appendChild(media);return;}
    if(type==='resource'){wrap.insertAdjacentHTML('beforeend',`<p>${nl2br(u.composer.body||'')}</p>`);const card=document.createElement('div');card.className='resource-card';card.innerHTML=`<span>${escapeHtml(u.composer.assetPath||'Choose a document from Project Assets')}</span><strong>${escapeHtml(u.composer.label||'Open resource')} ↗</strong>`;wrap.appendChild(card);return;}
    if(type==='component'){renderComponent(u.composer.component,wrap);}
  }
  function renderComponent(c,root){
    if(!c){root.insertAdjacentHTML('beforeend','<p>Import an engine component to preview it here.</p>');return;}root.insertAdjacentHTML('beforeend',`<p>${escapeHtml(c.description||'')}</p>`);const box=document.createElement('div');box.className='component-preview';
    if(c.type==='carousel'){const cards=document.createElement('div');cards.className='component-cards';(c.content?.items||[]).slice(0,c.content?.pageSize||3).forEach(item=>{const el=document.createElement('div');el.className='component-card';el.innerHTML=`<strong>${escapeHtml(item.title||'Item')}</strong><p>${escapeHtml(item.body||'')}</p>`;cards.appendChild(el);});box.appendChild(cards);}
    else if(c.type==='assessment'){const q=c.content?.questions?.[0];if(q){box.innerHTML=`<strong>${escapeHtml(q.prompt||'Question')}</strong>`;(q.options||[]).forEach(o=>{const b=document.createElement('button');b.className='assessment-option';b.textContent=o.text||'Answer';b.addEventListener('click',()=>toast(o.feedback||(o.correct?'Correct':'Try again')));box.appendChild(b);});}}
    else if(c.type==='media-presentation'){const item=c.content?.media?.[0];if(item){box.innerHTML=`<strong>${escapeHtml(item.title||'Media')}</strong>`;const url=assetUrl(item.src);if(url){const media=document.createElement(item.kind==='audio'?'audio':'video');media.src=url;media.controls=true;media.style.width='100%';box.appendChild(media);}else box.insertAdjacentHTML('beforeend',`<p>${escapeHtml(item.src||'Media path')}</p>`);}}
    else if(c.type==='hotspot-reveal'){const bg=c.content?.background?.image;const canvas=document.createElement('div');canvas.className='media-preview';canvas.style.position='relative';const url=assetUrl(bg);if(url)canvas.style.background=`center/cover url("${url}")`;else canvas.textContent=bg||'Hotspot visual';(c.content?.hotspots||[]).forEach((h,i)=>{const b=document.createElement('button');b.textContent=i+1;b.title=h.title||h.label||`Hotspot ${i+1}`;Object.assign(b.style,{position:'absolute',left:`${h.x||50}%`,top:`${h.y||50}%`,transform:'translate(-50%,-50%)',width:'34px',height:'34px',borderRadius:'50%',border:'3px solid white',background:'#508484',color:'white',fontWeight:'800'});b.addEventListener('click',()=>toast(`${h.title||h.label||'Hotspot'}: ${h.body||''}`));canvas.appendChild(b);});box.appendChild(canvas);}
    else box.innerHTML=`<div class="editor-note">${escapeHtml(c.type||'component')} preview will use the generic engine renderer.</div>`;root.appendChild(box);
  }

  function addUnit(type){const u=newUnit(type);state.course.units.push(u);state.selectedId=u.id;state.previewIndex=state.course.units.length-1;captureNow();renderAll();scheduleSave();}
  function importComponent(file){file.text().then(text=>{try{const c=JSON.parse(text);if(!c?.type)throw new Error('Missing component type');const target=state.course.units.find(u=>u.id===(window.__lxComponentTarget||state.selectedId));if(!target||target.composer?.type!=='component')return;target.composer.component=c;target.title=c.title||target.title;target.kind=c.type==='assessment'?'assessment':'lesson';captureNow();renderAll();scheduleSave();toast('Component imported');}catch(err){toast(`Could not import component: ${err.message}`);}finally{$('[data-component-input]').value='';}});}

  function normalizeFolderPath(file,root){const original=file.webkitRelativePath||file.name;const parts=original.split('/').filter(Boolean);if(root&&parts[0]===root)parts.shift();return file.webkitRelativePath?parts.join('/'):defaultPath(file);}
  async function importAssets(fileList,fromFolder=false){
    const files=[...fileList];if(!files.length)return;revokeUrls();let root=null;if(fromFolder&&files[0]?.webkitRelativePath)root=files[0].webkitRelativePath.split('/')[0];
    state.assets=[];state.context=[];
    for(const file of files){const path=normalizeFolderPath(file,root);const kind=classify(file,path);const entry={file,path,kind,name:file.name};state.assets.push(entry);if(['image','video','audio','caption','pdf'].includes(kind))state.objectUrls.set(path,URL.createObjectURL(file));if(kind==='context'){try{state.context.push({path,text:await file.text()});}catch(_){}}}
    state.assets.sort((a,b)=>a.path.localeCompare(b.path));renderAssets();renderJson();renderPreview();openAssets();toast(`${state.assets.length} project files loaded`);
  }
  function installImportedAssets(entries){
    revokeUrls();state.assets=[];state.context=[];entries.forEach(({file,path})=>{const kind=classify(file,path);state.assets.push({file,path,kind,name:file.name});if(['image','video','audio','caption','pdf'].includes(kind))state.objectUrls.set(path,URL.createObjectURL(file));if(kind==='context')file.text().then(text=>{state.context.push({path,text});renderAssets();});});state.assets.sort((a,b)=>a.path.localeCompare(b.path));renderAssets();renderJson();renderPreview();
  }
  function revokeUrls(){for(const url of state.objectUrls.values())URL.revokeObjectURL(url);state.objectUrls.clear();}
  function renderAssets(){
    $('[data-asset-summary]').textContent=state.assets.length?`${state.assets.length} files loaded`:'No files selected';const list=$('[data-asset-list]');list.innerHTML='';const usable=state.assets.filter(a=>a.kind!=='context');if(!usable.length)list.innerHTML='<div class="empty-state">Choose a project folder or files to build the shared asset library.</div>';
    usable.forEach(a=>{const row=document.createElement('div');row.className='asset-row';row.innerHTML=`<span class="asset-kind">${assetKindLabel(a.kind)}</span><span class="asset-info"><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.path)}</small></span><button type="button">Use</button>`;$('button',row).addEventListener('click',()=>useAsset(a));list.appendChild(row);});
    const ctx=$('[data-context-list]');ctx.innerHTML='';if(!state.context.length)ctx.innerHTML='<div class="empty-state">No text/markdown/JSON context files loaded.</div>';state.context.forEach(c=>{const d=document.createElement('details');d.innerHTML=`<summary>${escapeHtml(c.path)}</summary><pre>${escapeHtml(c.text)}</pre>`;ctx.appendChild(d);});
  }
  function assetKindLabel(kind){return {image:'IMG',video:'VID',audio:'AUD',caption:'CC',pdf:'PDF',document:'DOC',other:'FILE'}[kind]||kind.toUpperCase();}
  function useAsset(a){
    const input=state.activePathInput&&document.contains(state.activePathInput)?state.activePathInput:$('[data-unit-field="assetPath"]');if(!input){toast('Select an asset path field first');return;}input.value=a.path;input.dispatchEvent(new Event('input',{bubbles:true}));closeAssets();
  }
  function openAssets(){ $('[data-asset-drawer]').classList.add('open');$('[data-drawer-scrim]').classList.add('open'); }
  function closeAssets(){ $('[data-asset-drawer]').classList.remove('open');$('[data-drawer-scrim]').classList.remove('open'); }

  function exportJson(){const data=JSON.stringify(getCourse(),null,2)+'\n';downloadBlob(new Blob([data],{type:'application/json'}),`${slugify(state.course.title)}.course.json`);}
  function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),800);}
  function loadCourse(course){if(!course||!Array.isArray(course.units))throw new Error('This is not a valid course JSON file.');state.course=course;state.selectedId=course.units[0]?.id||null;state.previewIndex=0;state.history=[snapshot()];state.historyIndex=0;renderAll();scheduleSave();}
  function loadProjectFile(file){if(file.name.toLowerCase().endsWith('.json'))file.text().then(t=>{try{loadCourse(JSON.parse(t));toast('Course project opened');}catch(e){toast(e.message);}});}

  function showHelp(button,key){const topic=helpTopics[key];if(!topic)return;const p=$('[data-help-popover]');$('[data-help-title]',p).textContent=topic[0];$('[data-help-body]',p).textContent=topic[1];const r=button.getBoundingClientRect(),w=Math.min(350,innerWidth-28);p.style.left=`${Math.max(14,Math.min(innerWidth-w-14,r.left+r.width/2-w/2))}px`;p.style.top=`${Math.min(innerHeight-210,r.bottom+10)}px`;p.classList.add('open');p.setAttribute('aria-hidden','false');}
  function closeHelp(){const p=$('[data-help-popover]');p.classList.remove('open');p.setAttribute('aria-hidden','true');}
  function toast(message){const old=$('.toast');old?.remove();const t=document.createElement('div');t.className='toast';t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),2200);}

  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function escapeAttr(v=''){return escapeHtml(v);}
  function nl2br(v=''){return escapeHtml(v).replace(/\n/g,'<br>');}

  function bind(){
    $$('[data-course-field]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.courseField;if(key==='audience')state.course.audience=input.value.split(',').map(v=>v.trim()).filter(Boolean);else state.course[key]=input.value;updateDerived();}));
    $('[data-add-objective]').addEventListener('click',()=>{state.course.objectives=state.course.objectives||[];state.course.objectives.push('New learning objective');captureNow();renderObjectives();updateDerived({history:false});});
    $$('[data-add]').forEach(b=>b.addEventListener('click',()=>addUnit(b.dataset.add)));
    $('[data-prev]').addEventListener('click',()=>{if(state.previewIndex>0){state.previewIndex--;state.selectedId=state.course.units[state.previewIndex]?.id||state.selectedId;renderOutline();renderSectionEditor();renderPreview();}});
    $('[data-next]').addEventListener('click',()=>{if(state.previewIndex<state.course.units.length-1){state.previewIndex++;state.selectedId=state.course.units[state.previewIndex]?.id||state.selectedId;renderOutline();renderSectionEditor();renderPreview();}});
    $('[data-undo]').addEventListener('click',undo);$('[data-redo]').addEventListener('click',redo);$('[data-export-json]').addEventListener('click',exportJson);
    $('[data-open-assets]').addEventListener('click',openAssets);$('[data-close-assets]').addEventListener('click',closeAssets);$('[data-drawer-scrim]').addEventListener('click',closeAssets);
    $('[data-choose-folder]').addEventListener('click',()=>$('[data-folder-input]').click());$('[data-choose-files]').addEventListener('click',()=>$('[data-files-input]').click());
    $('[data-folder-input]').addEventListener('change',e=>importAssets(e.target.files,true));$('[data-files-input]').addEventListener('change',e=>importAssets(e.target.files,false));
    $('[data-component-input]').addEventListener('change',e=>{if(e.target.files[0])importComponent(e.target.files[0]);});
    $('[data-import-project]').addEventListener('click',()=>$('[data-project-input]').click());$('[data-project-input]').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(f.name.toLowerCase().endsWith('.json'))loadProjectFile(f);});
    $$('[data-help]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showHelp(b,b.dataset.help);}));$('[data-close-help]').addEventListener('click',closeHelp);document.addEventListener('click',e=>{if(e.target.closest('[data-help-popover]')||e.target.closest('[data-help]'))return;closeHelp();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeHelp();closeAssets();}});
    window.addEventListener('beforeunload',revokeUrls);
  }

  restoreDraft();state.history=[snapshot()];state.historyIndex=0;bind();renderAll();renderAssets();scheduleSave(false);

  window.LXCourseComposer={getCourse,getAssets:()=>state.assets.slice(),loadCourse,installImportedAssets,downloadBlob,toast,projectInput:$('[data-project-input]')};
})();
