(() => {
  const STORAGE_KEY = 'lx-learning-project-workbench:v0.1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const IMAGE_EXT = new Set(['png','jpg','jpeg','gif','webp','svg']);
  const TEXT_EXT = new Set(['txt','md','markdown','csv','json']);

  const templates = {
    'customer-discovery': {
      schemaVersion:'0.1', id:'customer-discovery-conversation', title:'Customer Discovery Conversation', type:'branching-scenario',
      description:'Practice uncovering business impact before moving to a solution recommendation.',
      instruction:'Choose the response that best advances the discovery conversation. Review the coaching feedback, then continue.',
      theme:'portfolio', completion:{strategy:'reach-outcome',required:true},
      content:{
        startNodeId:'opening',
        score:{enabled:true,label:'Decision quality',startingValue:50,minimum:0,maximum:100,showToLearner:true},
        nodes:[
          {id:'opening',speaker:'Customer',title:'The customer describes a recurring operational problem.',body:'You have enough context to begin discovery, but you do not yet know the business impact or what success would look like.',image:'',alt:'',choices:[
            {id:'opening-discover',text:'Ask where the problem is happening and how it affects day-to-day operations.',targetId:'impact',feedback:'Good discovery move. You stayed focused on the customer problem instead of jumping to a recommendation.',scoreDelta:10},
            {id:'opening-pitch',text:'Explain why your solution is a strong fit and offer to schedule a demonstration.',targetId:'needs-more-discovery',feedback:'You moved to the solution before understanding enough about the customer need.',scoreDelta:-10}
          ]},
          {id:'impact',speaker:'Customer',title:'The customer explains the operational consequences.',body:'The issue is now tied to lost time and inconsistent performance. You need to determine how they would define a successful outcome.',image:'',alt:'',choices:[
            {id:'impact-success',text:'Ask what would need to improve for them to consider the problem solved.',targetId:'clear-business-case',feedback:'You connected the pain point to measurable success criteria.',scoreDelta:20},
            {id:'impact-rush',text:'Move into pricing and implementation timing while the problem feels urgent.',targetId:'needs-more-discovery',feedback:'Urgency matters, but the desired outcome is still under-defined.',scoreDelta:-5}
          ]}
        ],
        outcomes:[
          {id:'clear-business-case',title:'Clear business case',body:'You uncovered the operational impact and established what a successful outcome needs to accomplish.',image:'',alt:'',summary:'The next conversation can focus on solution fit, stakeholders, constraints, and a credible path to value.'},
          {id:'needs-more-discovery',title:'More discovery needed',body:'The conversation moved toward a recommendation before enough customer context was established.',image:'',alt:'',summary:'Revisit the problem, operational impact, and desired outcomes before positioning a solution.'}
        ]
      }, metadata:{templateId:'customer-discovery',workbenchVersion:'0.1'}
    },
    'decision-practice': {
      schemaVersion:'0.1', id:'decision-practice', title:'Decision Practice with Coaching', type:'branching-scenario',
      description:'Practice making a judgment call, see immediate coaching, and experience the consequence of the decision.',
      instruction:'Choose the response you think is strongest, review the feedback, then continue to the outcome.',
      theme:'portfolio', completion:{strategy:'reach-outcome',required:true},
      content:{startNodeId:'decision-1',score:{enabled:false,label:'Decision quality',startingValue:0,minimum:0,maximum:100,showToLearner:false},nodes:[
        {id:'decision-1',speaker:'Scenario',title:'A situation requires a decision.',body:'Replace this placeholder with the context the learner needs before choosing a response.',image:'',alt:'',choices:[
          {id:'choice-1',text:'Choose the response that demonstrates the desired behavior.',targetId:'strong-outcome',feedback:'Explain why this response aligns with the desired behavior.',scoreDelta:0},
          {id:'choice-2',text:'Choose a plausible but weaker response.',targetId:'coaching-outcome',feedback:'Explain the tradeoff or missed signal in this response.',scoreDelta:0}
        ]}
      ],outcomes:[
        {id:'strong-outcome',title:'Strong decision',body:'The learner applied the desired behavior.',image:'',alt:'',summary:'Reinforce the principle or next step.'},
        {id:'coaching-outcome',title:'Coaching opportunity',body:'The learner chose a plausible response that missed an important consideration.',image:'',alt:'',summary:'Explain what to reconsider next time.'}
      ]},metadata:{templateId:'decision-practice',workbenchVersion:'0.1'}
    },
    'objection-handling': {
      schemaVersion:'0.1', id:'objection-handling-conversation', title:'Objection Handling Conversation', type:'branching-scenario',
      description:'Practice responding to a realistic objection without becoming defensive or skipping discovery.',
      instruction:'Choose how you would respond, review the coaching, and continue the conversation.',
      theme:'portfolio', completion:{strategy:'reach-outcome',required:true},
      content:{startNodeId:'objection',score:{enabled:true,label:'Conversation quality',startingValue:50,minimum:0,maximum:100,showToLearner:false},nodes:[
        {id:'objection',speaker:'Customer',title:'The customer raises a concern about moving forward.',body:'The objection may reflect a genuine constraint, missing information, or uncertainty. Your response should help uncover what is behind it.',image:'',alt:'',choices:[
          {id:'acknowledge',text:'Acknowledge the concern and ask a focused question to understand what is driving it.',targetId:'clarify',feedback:'You lowered pressure and created room to understand the objection before responding.',scoreDelta:10},
          {id:'counter',text:'Immediately explain why the concern should not prevent the customer from moving forward.',targetId:'defensive-outcome',feedback:'You responded to the objection before confirming what the customer actually meant.',scoreDelta:-10}
        ]},
        {id:'clarify',speaker:'Customer',title:'The customer explains the concern in more detail.',body:'You now have enough information to respond directly to the real issue rather than the surface objection.',image:'',alt:'',choices:[
          {id:'respond-evidence',text:'Address the specific concern with relevant evidence and confirm whether it resolves the issue.',targetId:'productive-outcome',feedback:'You connected your response to the concern the customer actually described.',scoreDelta:15},
          {id:'generic-pitch',text:'Return to the standard value proposition to reinforce the overall solution.',targetId:'defensive-outcome',feedback:'The response is relevant to the product, but not specific enough to the concern you uncovered.',scoreDelta:-5}
        ]}
      ],outcomes:[
        {id:'productive-outcome',title:'Productive next step',body:'The objection was clarified and addressed without derailing the conversation.',image:'',alt:'',summary:'Continue discovery and confirm the customer's next decision criteria.'},
        {id:'defensive-outcome',title:'Conversation stalls',body:'The response focused on defending the solution instead of understanding the concern.',image:'',alt:'',summary:'Acknowledge the objection, clarify what is behind it, then respond to the actual issue.'}
      ]},metadata:{templateId:'objection-handling',workbenchVersion:'0.1'}
    }
  };

  function blankScenario() {
    return {
      schemaVersion:'0.1', id:'new-scenario', title:'New Branching Scenario', type:'branching-scenario', description:'',
      instruction:'Choose the response that best fits the situation.', theme:'portfolio', completion:{strategy:'reach-outcome',required:true},
      content:{startNodeId:'decision-1',score:{enabled:false,label:'Decision quality',startingValue:0,minimum:0,maximum:100,showToLearner:false},nodes:[
        {id:'decision-1',speaker:'',title:'What is happening?',body:'Add the information the learner needs before making this decision.',image:'',alt:'',choices:[
          {id:'choice-1',text:'First learner response',targetId:'outcome-1',feedback:'Add coaching feedback for this response.',scoreDelta:0},
          {id:'choice-2',text:'Second learner response',targetId:'outcome-1',feedback:'Add coaching feedback for this response.',scoreDelta:0}
        ]}
      ],outcomes:[{id:'outcome-1',title:'Outcome',body:'Describe what happened.',image:'',alt:'',summary:'Add the learner takeaway or next step.'}]},
      metadata:{workbenchVersion:'0.1'}
    };
  }

  const state = { model:null, sourcePrompt:'', sourceFiles:[], reference:[], objectUrls:new Map(), activeTab:'source', saveTimer:null };

  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function escapeAttr(v=''){return escapeHtml(v);}
  function slug(v='project'){return String(v).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'project';}
  function uid(prefix){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;}
  function ext(name=''){return (String(name).toLowerCase().match(/\.([a-z0-9]+)$/)||[])[1]||'';}
  function isImage(file){return IMAGE_EXT.has(ext(file.name));}
  function classify(file){const e=ext(file.name);if(IMAGE_EXT.has(e))return'image';if(TEXT_EXT.has(e))return'reference';if(['pdf','doc','docx','ppt','pptx'].includes(e))return'document';if(['mp4','webm','mov','m4v'].includes(e))return'video';if(['mp3','wav','m4a','aac','ogg'].includes(e))return'audio';if(['vtt','srt'].includes(e))return'caption';return'other';}

  function revokeUrls(){for(const url of state.objectUrls.values())URL.revokeObjectURL(url);state.objectUrls.clear();}
  function filePath(file,fromFolder=false){if(fromFolder&&file.webkitRelativePath)return file.webkitRelativePath.split('/').slice(1).join('/')||file.name;const kind=classify(file);const folder={image:'assets/images',video:'assets/video',audio:'assets/audio',caption:'assets/captions',document:'assets/documents',reference:'context',other:'assets/other'}[kind]||'assets/other';return `${folder}/${file.name}`;}

  function validScenario(model){return !!(model&&model.type==='branching-scenario'&&model.schemaVersion==='0.1'&&Array.isArray(model.content?.nodes)&&model.content.nodes.length&&Array.isArray(model.content?.outcomes)&&model.content.outcomes.length);}
  function destinationItems(){return [...state.model.content.nodes.map(x=>({id:x.id,label:`Next decision · ${x.title||x.id}`})),...state.model.content.outcomes.map(x=>({id:x.id,label:`Outcome · ${x.title||x.id}`}))];}
  function imageOptions(value=''){const entries=state.sourceFiles.filter(x=>x.kind==='image');let html='<option value="">No image</option>';entries.forEach(x=>{html+=`<option value="${escapeAttr(x.path)}"${x.path===value?' selected':''}>${escapeHtml(x.name)}</option>`;});if(value&&!entries.some(x=>x.path===value))html+=`<option value="${escapeAttr(value)}" selected>${escapeHtml(value.split('/').pop()||value)}</option>`;return html;}
  function assetUrl(path){return state.objectUrls.get(path)||null;}

  function startProject(model, prompt=''){
    state.model=clone(model);state.sourcePrompt=prompt||'';state.activeTab='source';
    $('[data-start-panel]').hidden=true;$('[data-workspace]').hidden=false;
    renderAll();saveDraft();switchTab('source');
  }

  function switchTab(name){state.activeTab=name;$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));if(name==='preview')renderPreview();if(name==='save')renderJson();window.scrollTo({top:Math.max(0,$('[data-workspace]').offsetTop-72),behavior:'smooth'});}

  function renderProjectMeta(){setText('[data-project-title]',state.model.title||'Untitled scenario');setText('[data-project-summary]',`${state.model.content.nodes.length} decision${state.model.content.nodes.length===1?'':'s'} · ${state.model.content.outcomes.length} outcome${state.model.content.outcomes.length===1?'':'s'}`);$('[data-source-prompt]').value=state.sourcePrompt||'';$('[data-project-field="title"]').value=state.model.title||'';$('[data-project-field="description"]').value=state.model.description||'';$('[data-project-field="instruction"]').value=state.model.instruction||'';$('[data-project-field="id"]').value=state.model.id||'';}
  function setText(sel,text){const el=$(sel);if(el)el.textContent=text;}

  function renderSourceFiles(){const root=$('[data-source-file-list]');root.innerHTML='';if(!state.sourceFiles.length){root.innerHTML='<div class="empty-state">No source files added yet.</div>';}state.sourceFiles.forEach(entry=>{const row=document.createElement('div');row.className='source-file';row.innerHTML=`<div><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(entry.kind)} · ${escapeHtml(entry.path)}</small></div><small>${Math.max(1,Math.round(entry.file.size/1024))} KB</small>`;root.appendChild(row);});const wrap=$('[data-reference-content]'),list=$('[data-reference-list]');list.innerHTML='';state.reference.forEach(entry=>{const d=document.createElement('details');d.innerHTML=`<summary>${escapeHtml(entry.path)}</summary><pre>${escapeHtml(entry.text)}</pre>`;list.appendChild(d);});wrap.hidden=!state.reference.length;}

  function renderEditor(){renderProjectMeta();const nodes=$('[data-decision-list]');nodes.innerHTML='';state.model.content.nodes.forEach((node,index)=>nodes.appendChild(decisionCard(node,index)));const outcomes=$('[data-outcome-list]');outcomes.innerHTML='';state.model.content.outcomes.forEach((outcome,index)=>outcomes.appendChild(outcomeCard(outcome,index)));renderFlowCheck();renderJson();}

  function decisionCard(node,index){const card=document.createElement('article');card.className='scenario-card';card.dataset.nodeIndex=index;card.innerHTML=`<div class="scenario-head"><div><span class="eyebrow">Decision ${index+1}</span><strong>${escapeHtml(node.title||'Untitled decision')}</strong></div><div class="card-actions"><button type="button" data-up>↑</button><button type="button" data-down>↓</button><button type="button" data-copy>Duplicate</button><button type="button" data-delete>Delete</button></div></div><div class="field-grid"><label class="advanced-field"><span>Internal ID</span><input data-node-field="id" value="${escapeAttr(node.id)}"></label><label><span>Who is speaking?</span><input data-node-field="speaker" value="${escapeAttr(node.speaker||'')}"></label><label class="wide"><span>What's happening?</span><input data-node-field="title" value="${escapeAttr(node.title||'')}"></label><label class="wide"><span>What does the learner know?</span><textarea rows="3" data-node-field="body">${escapeHtml(node.body||'')}</textarea></label><label><span>Image</span><select data-node-field="image">${imageOptions(node.image||'')}</select></label><label><span>Alt text</span><input data-node-field="alt" value="${escapeAttr(node.alt||'')}"></label></div><div class="choices"><div class="choices-head"><strong>Learner responses</strong><button type="button" data-add-choice>+ Response</button></div><div class="choices-list" data-choices></div></div>`;
    const choices=$('[data-choices]',card);node.choices.forEach((choice,ci)=>choices.appendChild(choiceCard(node,choice,ci)));
    $$('[data-node-field]',card).forEach(input=>input.addEventListener(input.dataset.nodeField==='id'?'change':'input',()=>{const key=input.dataset.nodeField;if(key==='id'){const old=node.id;node.id=input.value.trim()||old;renameTarget(old,node.id);}else node[key]=input.value;if(key==='title')$('.scenario-head strong',card).textContent=node.title||'Untitled decision';touch(key==='id');}));
    $('[data-add-choice]',card).addEventListener('click',()=>{node.choices.push({id:uid('choice'),text:'New learner response',targetId:state.model.content.outcomes[0]?.id||'',feedback:'Add coaching feedback.',scoreDelta:0});touch(true);});
    $('[data-up]',card).addEventListener('click',()=>move(state.model.content.nodes,index,-1));$('[data-down]',card).addEventListener('click',()=>move(state.model.content.nodes,index,1));$('[data-copy]',card).addEventListener('click',()=>duplicateNode(index));$('[data-delete]',card).addEventListener('click',()=>deleteNode(index));return card;}

  function choiceCard(node,choice,index){const el=document.createElement('div');el.className='choice-card';const options=destinationItems().map(x=>`<option value="${escapeAttr(x.id)}"${x.id===choice.targetId?' selected':''}>${escapeHtml(x.label)}</option>`).join('');el.innerHTML=`<button type="button" class="choice-delete" data-delete aria-label="Delete response">×</button><label class="wide"><span>Learner response ${index+1}</span><input data-choice-field="text" value="${escapeAttr(choice.text||'')}"></label><label><span>What happens next?</span><select data-choice-field="targetId"><option value="">Choose destination…</option>${options}</select></label><label><span>Impact on score</span><input type="number" data-choice-field="scoreDelta" value="${Number(choice.scoreDelta||0)}"></label><label class="wide"><span>Coaching feedback</span><textarea rows="2" data-choice-field="feedback">${escapeHtml(choice.feedback||'')}</textarea></label><label class="advanced-field wide"><span>Internal response ID</span><input data-choice-field="id" value="${escapeAttr(choice.id||'')}"></label>`;$$('[data-choice-field]',el).forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.choiceField;choice[key]=key==='scoreDelta'?Number(input.value||0):input.value;touch(false);}));$('[data-delete]',el).addEventListener('click',()=>{node.choices.splice(index,1);touch(true);});return el;}

  function outcomeCard(outcome,index){const card=document.createElement('article');card.className='outcome-card';card.innerHTML=`<div class="outcome-head"><div><span class="eyebrow">Outcome ${index+1}</span><strong>${escapeHtml(outcome.title||'Untitled outcome')}</strong></div><div class="card-actions"><button type="button" data-up>↑</button><button type="button" data-down>↓</button><button type="button" data-copy>Duplicate</button><button type="button" data-delete>Delete</button></div></div><div class="field-grid"><label class="advanced-field"><span>Internal ID</span><input data-outcome-field="id" value="${escapeAttr(outcome.id)}"></label><label><span>Outcome name</span><input data-outcome-field="title" value="${escapeAttr(outcome.title||'')}"></label><label class="wide"><span>What happened?</span><textarea rows="3" data-outcome-field="body">${escapeHtml(outcome.body||'')}</textarea></label><label class="wide"><span>Learner takeaway / next step</span><textarea rows="2" data-outcome-field="summary">${escapeHtml(outcome.summary||'')}</textarea></label><label><span>Image</span><select data-outcome-field="image">${imageOptions(outcome.image||'')}</select></label><label><span>Alt text</span><input data-outcome-field="alt" value="${escapeAttr(outcome.alt||'')}"></label></div>`;$$('[data-outcome-field]',card).forEach(input=>input.addEventListener(input.dataset.outcomeField==='id'?'change':'input',()=>{const key=input.dataset.outcomeField;if(key==='id'){const old=outcome.id;outcome.id=input.value.trim()||old;renameTarget(old,outcome.id);}else outcome[key]=input.value;if(key==='title')$('.outcome-head strong',card).textContent=outcome.title||'Untitled outcome';touch(key==='id');}));$('[data-up]',card).addEventListener('click',()=>move(state.model.content.outcomes,index,-1));$('[data-down]',card).addEventListener('click',()=>move(state.model.content.outcomes,index,1));$('[data-copy]',card).addEventListener('click',()=>duplicateOutcome(index));$('[data-delete]',card).addEventListener('click',()=>deleteOutcome(index));return card;}

  function move(array,index,delta){const to=index+delta;if(to<0||to>=array.length)return;const [item]=array.splice(index,1);array.splice(to,0,item);touch(true);}
  function renameTarget(oldId,newId){if(state.model.content.startNodeId===oldId)state.model.content.startNodeId=newId;state.model.content.nodes.forEach(n=>n.choices.forEach(c=>{if(c.targetId===oldId)c.targetId=newId;}));}
  function duplicateNode(index){const copy=clone(state.model.content.nodes[index]);const old=copy.id;copy.id=uniqueId(`${old}-copy`);copy.title=`${copy.title} copy`;copy.choices.forEach(c=>c.id=uid('choice'));state.model.content.nodes.splice(index+1,0,copy);touch(true);}
  function duplicateOutcome(index){const copy=clone(state.model.content.outcomes[index]);copy.id=uniqueId(`${copy.id}-copy`);copy.title=`${copy.title} copy`;state.model.content.outcomes.splice(index+1,0,copy);touch(true);}
  function uniqueId(base){const ids=new Set(destinationItems().map(x=>x.id));let id=base,n=2;while(ids.has(id))id=`${base}-${n++}`;return id;}
  function deleteNode(index){if(state.model.content.nodes.length<=1)return toast('A scenario needs at least one decision point.');const id=state.model.content.nodes[index].id;state.model.content.nodes.splice(index,1);if(state.model.content.startNodeId===id)state.model.content.startNodeId=state.model.content.nodes[0].id;touch(true);}
  function deleteOutcome(index){if(state.model.content.outcomes.length<=1)return toast('A scenario needs at least one outcome.');state.model.content.outcomes.splice(index,1);touch(true);}

  function validate(){const issues=[],warnings=[];const all=[...state.model.content.nodes,...state.model.content.outcomes],ids=all.map(x=>x.id).filter(Boolean),set=new Set(ids);if(ids.length!==all.length)issues.push('Some advanced internal IDs are missing.');if(set.size!==ids.length)issues.push('Two project items share the same internal ID.');if(!state.model.content.nodes.some(n=>n.id===state.model.content.startNodeId))issues.push('The first decision is missing.');state.model.content.nodes.forEach(n=>{if(!n.choices.length)issues.push(`${n.title||'A decision'} needs at least one learner response.`);n.choices.forEach(c=>{if(!set.has(c.targetId))issues.push(`A response in ${n.title||'a decision'} does not lead anywhere.`);});});if(!issues.length){const reachable=new Set(),queue=[state.model.content.startNodeId];while(queue.length){const id=queue.shift();if(reachable.has(id))continue;reachable.add(id);state.model.content.nodes.find(n=>n.id===id)?.choices.forEach(c=>{if(set.has(c.targetId))queue.push(c.targetId);});}all.filter(x=>!reachable.has(x.id)).forEach(x=>warnings.push(`${x.title||'An item'} cannot be reached from the first decision.`));if(!state.model.content.outcomes.some(o=>reachable.has(o.id)))issues.push('No outcome can be reached from the first decision.');}return{issues,warnings};}
  function renderFlowCheck(){const {issues,warnings}=validate(),el=$('[data-flow-check]');if(issues.length){el.className='flow-check warn';el.textContent=`Things to fix before preview: ${issues[0]}${issues.length>1?` (+${issues.length-1} more)`:''}`;setText('[data-project-health]','Needs a quick fix');}else if(warnings.length){el.className='flow-check warn';el.textContent=`Ready to preview, with ${warnings.length} note${warnings.length===1?'':'s'}: ${warnings[0]}`;setText('[data-project-health]','Ready with notes');}else{el.className='flow-check';el.textContent='Ready to preview ✓ Every learner response leads somewhere and an outcome is reachable.';setText('[data-project-health]','Ready to preview');}}

  function renderPreview(){const root=$('[data-preview-root]'),{issues}=validate();if(issues.length){root.innerHTML=`<div class="empty-state">Fix the project flow before previewing: ${escapeHtml(issues[0])}</div>`;return;}const model=state.model,nodes=new Map(model.content.nodes.map(n=>[n.id,n])),outcomes=new Map(model.content.outcomes.map(o=>[o.id,o]));let current=model.content.startNodeId;let score=Number(model.content.score?.startingValue||0);const config=model.content.score||{};const history=[];const clamp=v=>Math.max(Number(config.minimum??0),Math.min(Number(config.maximum??100),v));function scoreHtml(){return config.enabled&&config.showToLearner?`<div class="learner-score"><span>${escapeHtml(config.label||'Score')}</span><strong>${score}</strong></div>`:'';}function imageHtml(path,alt){const url=assetUrl(path);return url?`<img class="learner-image" src="${escapeAttr(url)}" alt="${escapeAttr(alt||'')}">`:'';}function draw(){const outcome=outcomes.get(current);if(outcome){root.innerHTML=`<article class="learner-card">${scoreHtml()}<span class="eyebrow">Outcome</span><h3>${escapeHtml(outcome.title)}</h3>${imageHtml(outcome.image,outcome.alt||outcome.title)}<p>${escapeHtml(outcome.body||'')}</p>${outcome.summary?`<div class="learner-feedback"><strong>Takeaway</strong><p>${escapeHtml(outcome.summary)}</p></div>`:''}<button type="button" class="primary" data-replay>Replay scenario</button></article>`;$('[data-replay]',root).addEventListener('click',()=>{current=model.content.startNodeId;score=Number(config.startingValue||0);history.length=0;draw();});return;}const node=nodes.get(current);if(!node){root.innerHTML='<div class="empty-state">This project points to a missing decision.</div>';return;}root.innerHTML=`<article class="learner-card">${scoreHtml()}<span class="eyebrow">Decision ${history.length+1}</span>${node.speaker?`<div class="learner-speaker">${escapeHtml(node.speaker)}</div>`:''}<h3>${escapeHtml(node.title)}</h3>${imageHtml(node.image,node.alt||node.title)}<p>${escapeHtml(node.body||'')}</p><div class="learner-prompt">What do you do next?</div><div class="learner-choices" data-learner-choices></div></article>`;const list=$('[data-learner-choices]',root);node.choices.forEach((choice,i)=>{const b=document.createElement('button');b.className='learner-choice';b.innerHTML=`<span>${i+1}</span><strong>${escapeHtml(choice.text)}</strong>`;b.addEventListener('click',()=>{if(config.enabled)score=clamp(score+Number(choice.scoreDelta||0));history.push(choice.id);$$('.learner-choice',root).forEach(x=>x.disabled=true);const feedback=document.createElement('div');feedback.className='learner-feedback';feedback.innerHTML=`<strong>Coaching feedback</strong><p>${escapeHtml(choice.feedback||'Continue to see what happens next.')}</p><button type="button" class="primary">${outcomes.has(choice.targetId)?'See outcome →':'Continue →'}</button>`;$('button',feedback).addEventListener('click',()=>{current=choice.targetId;draw();});$('.learner-card',root).appendChild(feedback);});list.appendChild(b);});}draw();}

  async function importSourceFiles(fileList,fromFolder=false){const files=[...fileList];if(!files.length)return;for(const file of files){const path=filePath(file,fromFolder),kind=classify(file),entry={file,path,kind,name:file.name};state.sourceFiles.push(entry);if(kind==='image')state.objectUrls.set(path,URL.createObjectURL(file));if(kind==='reference'){try{state.reference.push({path,text:await file.text()});}catch(_){}}}state.sourceFiles.sort((a,b)=>a.path.localeCompare(b.path));renderSourceFiles();renderEditor();renderPreview();saveDraft();toast(`${files.length} source file${files.length===1?'':'s'} added`);}

  function touch(structural=false){state.model.id=slug(state.model.id||state.model.title);renderProjectMeta();renderFlowCheck();renderJson();if(structural)renderEditor();saveDraft();if(state.activeTab==='preview')renderPreview();}
  function renderJson(){if(state.model)$('[data-json-output]').textContent=JSON.stringify(state.model,null,2);}
  function renderAll(){renderProjectMeta();renderSourceFiles();renderEditor();renderPreview();}

  function saveDraft(){if(!state.model)return;clearTimeout(state.saveTimer);setText('[data-save-state]','Saving…');state.saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify({model:state.model,sourcePrompt:state.sourcePrompt,reference:state.reference.map(x=>({path:x.path,text:x.text}))}));setText('[data-save-state]','Autosaved locally');}catch(_){setText('[data-save-state]','Local save unavailable');}},250);}
  function restoreDraft(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved&&validScenario(saved.model)){state.model=saved.model;state.sourcePrompt=saved.sourcePrompt||'';state.reference=Array.isArray(saved.reference)?saved.reference:[];$('[data-start-panel]').hidden=true;$('[data-workspace]').hidden=false;renderAll();switchTab('source');return true;}}catch(_){}return false;}

  async function openJson(file){try{const model=JSON.parse(await file.text());if(!validScenario(model))throw new Error('This is not a valid branching-scenario JSON file.');startProject(model,'');toast('Existing scenario opened');}catch(error){toast(error.message);}}
  function downloadJson(){const model=clone(state.model);model.id=slug(model.title||model.id);const blob=new Blob([`${JSON.stringify(model,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${model.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
  function toast(message){const el=$('[data-toast]');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,2200);}

  function bind(){
    $$('[data-start-mode]').forEach(button=>button.addEventListener('click',()=>{$$('[data-start-mode]').forEach(x=>x.classList.toggle('active',x===button));const mode=button.dataset.startMode;$('[data-template-picker]').hidden=mode!=='template';$('[data-existing-picker]').hidden=mode!=='existing';if(mode==='blank')startProject(blankScenario(),'');}));
    $('[data-use-template]').addEventListener('click',()=>{const id=$('[data-template-select]').value;startProject(templates[id]||templates['customer-discovery'],`Use the ${$('option:checked',$('[data-template-select]')).textContent} structure as the starting point. Replace the placeholder content with my source material while preserving the interaction logic.`);});
    $('[data-choose-json]').addEventListener('click',()=>$('[data-json-input]').click());$('[data-open-project]').addEventListener('click',()=>$('[data-json-input]').click());$('[data-json-input]').addEventListener('change',async e=>{const file=e.target.files?.[0];if(file)await openJson(file);e.target.value='';});
    $('[data-new-project]').addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);revokeUrls();state.model=null;state.sourcePrompt='';state.sourceFiles=[];state.reference=[];$('[data-workspace]').hidden=true;$('[data-start-panel]').hidden=false;window.scrollTo({top:0,behavior:'smooth'});});
    $$('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.jump)));$('[data-go-edit]').addEventListener('click',()=>switchTab('edit'));
    $('[data-source-prompt]').addEventListener('input',e=>{state.sourcePrompt=e.target.value;saveDraft();});$('[data-add-source-files]').addEventListener('click',()=>$('[data-source-files]').click());$('[data-add-source-folder]').addEventListener('click',()=>$('[data-source-folder]').click());$('[data-source-files]').addEventListener('change',e=>importSourceFiles(e.target.files,false));$('[data-source-folder]').addEventListener('change',e=>importSourceFiles(e.target.files,true));
    $$('[data-project-field]').forEach(input=>input.addEventListener('input',()=>{state.model[input.dataset.projectField]=input.value;touch(false);}));
    $('[data-toggle-advanced]').addEventListener('click',e=>{const on=document.body.classList.toggle('show-advanced');e.currentTarget.textContent=on?'Hide advanced fields':'Advanced fields';});
    $('[data-add-decision]').addEventListener('click',()=>{const n=state.model.content.nodes.length+1;state.model.content.nodes.push({id:uniqueId(`decision-${n}`),speaker:'',title:`Decision ${n}`,body:'Describe what the learner knows at this point.',image:'',alt:'',choices:[{id:uid('choice'),text:'New learner response',targetId:state.model.content.outcomes[0]?.id||'',feedback:'Add coaching feedback.',scoreDelta:0}]});touch(true);});
    $('[data-add-outcome]').addEventListener('click',()=>{const n=state.model.content.outcomes.length+1;state.model.content.outcomes.push({id:uniqueId(`outcome-${n}`),title:`Outcome ${n}`,body:'Describe what happened.',image:'',alt:'',summary:'Add the learner takeaway.'});touch(true);});
    $('[data-restart-preview]').addEventListener('click',renderPreview);$('[data-download-json]').addEventListener('click',downloadJson);$('[data-toggle-json]').addEventListener('click',()=>{const panel=$('[data-json-panel]');panel.open=!panel.open;});
    $$('[data-ai-preset]').forEach(button=>button.addEventListener('click',()=>{const presets={sanitize:'Sanitize this project for a public portfolio. Replace confidential, internal-only, customer-specific, proprietary, or identifying information, files, and links with realistic generic alternatives while preserving the instructional structure and interaction logic.',rebrand:'Apply a different saved brand theme to this project without changing the instructional structure or learner flow.',audience:'Adapt this project for a different learner audience. Update terminology, examples, assumptions, coaching feedback, and context while preserving the core learning objective.',similar:'Use this project as the source template. Keep the interaction structure and behavior, but rebuild the content using the source materials I uploaded.'};$('[data-ai-prompt]').value=presets[button.dataset.aiPreset]||'';}));
    window.addEventListener('beforeunload',revokeUrls);
  }

  bind();
  restoreDraft();
})();
