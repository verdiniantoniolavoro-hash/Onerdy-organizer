// app.js - Nerdy Organizer (complete client-side implementation)
// Drop this file into the same folder as your index.html
// Dependencies: FullCalendar (you already linked CDN in HTML)

document.addEventListener('DOMContentLoaded', () => {
  /* -------- Storage keys -------- */
  const KEY = {
    TASKS: 'nerdy_tasks_v1',
    APPTS: 'nerdy_appts_v1',
    DEADLINES: 'nerdy_deadlines_v1',
    NOTES: 'nerdy_notes_v1',
    SHOP: 'nerdy_shop_v1',
    RECORDINGS_META: 'nerdy_recs_meta_v1',
    SETTINGS: 'nerdy_settings_v1',
  };

  /* -------- Utility -------- */
  const $ = id => document.getElementById(id);
  const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v || []));
  const loadJSON = k => {
    try { return JSON.parse(localStorage.getItem(k) || '[]'); }
    catch(e){ return []; }
  };

  /* -------- App state -------- */
  let tasks = loadJSON(KEY.TASKS);
  let appts = loadJSON(KEY.APPTS);
  let deadlines = loadJSON(KEY.DEADLINES);
  let notes = loadJSON(KEY.NOTES);
  let shop = loadJSON(KEY.SHOP);
  let recMeta = loadJSON(KEY.RECORDINGS_META);
  let settings = JSON.parse(localStorage.getItem(KEY.SETTINGS) || '{}');

  /* -------- Tabs -------- */
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const to = tab.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const target = $(to);
      if (target) target.classList.add('active');
    });
  });

  /* -------- Renderers -------- */
  function renderList(containerId, items, emptyText) {
    const el = $(containerId);
    el.innerHTML = '';
    if (!items || items.length === 0) {
      el.innerHTML = `<p>${emptyText}</p>`;
      return;
    }
    const ul = document.createElement('div');
    items.slice().reverse().forEach(it => {
      const node = document.createElement('div');
      node.className = 'list-item';
      node.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px">
                          <div>
                            <strong>${it.title || it.text || 'Elemento'}</strong>
                            <div style="font-size:0.9em;color:#666">${it.t || (it.date || '')}</div>
                          </div>
                          <div>
                            <button class="btn small" data-id="${it.id}" data-type="del">✖</button>
                          </div>
                        </div>`;
      ul.appendChild(node);
    });
    el.appendChild(ul);
  }

  function renderAll() {
    renderList('taskList', tasks, 'Nessun impegno');
    renderList('fullTaskList', tasks, 'Nessun impegno');
    renderList('appointmentList', appts, 'Nessun appuntamento');
    renderList('fullAppointmentList', appts, 'Nessun appuntamento');
    renderList('fullDeadlineList', deadlines, 'Nessuna scadenza');
    renderList('noteList', notes, 'Nessuna nota');
    renderList('fullNoteList', notes, 'Nessuna nota');
    renderList('shoppingList', shop, 'Lista vuota');
    renderRecordingsList();
    initCalendarEvents();
    if (settings.userName) $('userName').textContent = settings.userName;
  }

  /* -------- ID generator & timestamp -------- */
  function uid(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }
  function ts() {
    return new Date().toLocaleString();
  }

  /* -------- CRUD functions -------- */
  window.addTask = function(){
    const val = $('taskInput').value.trim();
    if(!val){ alert('Inserisci descrizione attività'); return; }
    const obj = { id: uid('task_'), title: val, t: ts() };
    tasks.push(obj); saveJSON(KEY.TASKS, tasks); $('taskInput').value=''; renderAll(); speak('Impegno aggiunto');
  };

  window.addAppointment = function(){
    const val = $('appointmentInput').value.trim();
    const date = $('appointmentDate').value;
    if(!val || !date){ alert('Inserisci descrizione e data'); return; }
    const obj = { id: uid('appt_'), title: val, date, t: ts() };
    appts.push(obj); saveJSON(KEY.APPTS, appts); $('appointmentInput').value=''; $('appointmentDate').value=''; renderAll(); speak('Appuntamento aggiunto');
  };

  window.addDeadline = function(){
    const val = $('deadlineInput').value.trim();
    const date = $('deadlineDate').value;
    if(!val || !date){ alert('Inserisci descrizione e data'); return; }
    const obj = { id: uid('dead_'), title: val, date, t: ts() };
    deadlines.push(obj); saveJSON(KEY.DEADLINES, deadlines); $('deadlineInput').value=''; $('deadlineDate').value=''; renderAll(); speak('Scadenza aggiunta');
  };

  window.addNote = function(){
    const title = $('noteInput').value.trim();
    const content = $('noteContent').value.trim();
    if(!title || !content){ alert('Inserisci titolo e contenuto'); return; }
    const obj = { id: uid('note_'), title, text: content, t: ts() };
    notes.push(obj); saveJSON(KEY.NOTES, notes); $('noteInput').value=''; $('noteContent').value=''; renderAll(); speak('Nota aggiunta');
  };

  window.addShoppingItem = function(){
    const item = $('shoppingInput').value.trim();
    if(!item){ alert('Inserisci articolo'); return; }
    const obj = { id: uid('shop_'), title: item, t: ts() };
    shop.push(obj); saveJSON(KEY.SHOP, shop); $('shoppingInput').value=''; renderAll(); speak('Aggiunto alla lista della spesa');
  };

  /* -------- Delete handlers via event delegation -------- */
  document.body.addEventListener('click', e => {
    const btn = e.target.closest('button[data-type="del"]');
    if(btn){
      const id = btn.dataset.id;
      // try remove from all lists
      [tasks, appts, deadlines, notes, shop].forEach((arr, idx) => {
        const i = arr.findIndex(x=>x.id===id);
        if(i>=0){ arr.splice(i,1); }
      });
      saveJSON(KEY.TASKS, tasks); saveJSON(KEY.APPTS, appts); saveJSON(KEY.DEADLINES, deadlines);
      saveJSON(KEY.NOTES, notes); saveJSON(KEY.SHOP, shop);
      renderAll();
    }
  });

  /* -------- FullCalendar init & events persistence -------- */
  let calendar;
  function initCalendar(){
    const calEl = $('calendar');
    if(!calEl) return;
    if(typeof FullCalendar === 'undefined'){
      calEl.innerHTML = '<p>FullCalendar non caricato (CDN mancante)</p>';
      return;
    }
    calendar = new FullCalendar.Calendar(calEl, {
      initialView: 'dayGridMonth',
      locale: 'it',
      headerToolbar: { left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay' },
      events: []
    });
    calendar.render();
    initCalendarEvents();
  }

  function initCalendarEvents(){
    if(!calendar) return;
    const evs = [];
    appts.forEach(a => evs.push({ id:a.id, title:a.title, start:a.date }));
    deadlines.forEach(d => evs.push({ id:d.id, title:d.title, start:d.date, color:'#e67e22' }));
    calendar.removeAllEvents();
    evs.forEach(ev => calendar.addEvent(ev));
  }

  /* -------- Recorder (MediaRecorder) -------- */
  let mediaRecorder, recordedChunks = [], currentStream = null;
  const recStatus = $('recorderStatus');
  const recordBtn = $('recordBtn'), stopBtn = $('stopBtn'), playBtn = $('playBtn'), saveBtn = $('saveBtn');

  async function startRecording(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      alert('Il browser non supporta la registrazione audio.');
      return;
    }
    try{
      currentStream = await navigator.mediaDevices.getUserMedia({ audio:true });
      mediaRecorder = new MediaRecorder(currentStream);
      recordedChunks = [];
      mediaRecorder.ondataavailable = e => { if(e.data.size>0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        recStatus.textContent = 'Registrazione pronta per il salvataggio';
        playBtn.disabled = false; saveBtn.disabled = false; stopBtn.disabled = true; recordBtn.disabled=false;
        // stop tracks
        if(currentStream){ currentStream.getTracks().forEach(t=>t.stop()); currentStream=null; }
      };
      mediaRecorder.start();
      recStatus.textContent = 'Recording...';
      recordBtn.disabled = true; stopBtn.disabled=false; playBtn.disabled=true; saveBtn.disabled=true;
    }catch(err){
      console.error(err); alert('Permesso microfono negato o errore: '+err.message);
    }
  }

  function stopRecording(){
    if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    recStatus.textContent = 'Registrazione interrotta';
  }

  function playRecording(){
    if(recordedChunks.length === 0){ alert('Nessuna registrazione'); return; }
    const blob = new Blob(recordedChunks, { type:'audio/webm' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  }

  function saveRecording(){
    if(recordedChunks.length === 0){ alert('Nessuna registrazione da salvare'); return; }
    const name = ($('recordingName').value || 'registrazione') + '_' + Date.now();
    const blob = new Blob(recordedChunks, { type:'audio/webm' });
    // Save metadata to localStorage (we won't store large blobs there)
    recMeta.push({ id: uid('rec_'), name, mime: blob.type, size: blob.size, created: ts() });
    saveJSON(KEY.RECORDINGS_META, recMeta);
    // offer download link automatically
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.webm';
    document.body.appendChild(a);
    a.click();
    a.remove();
    recordedChunks = []; playBtn.disabled=true; saveBtn.disabled=true;
    recStatus.textContent = 'Registrazione salvata (download automatico)';
    renderRecordingsList();
    speak('Registrazione salvata');
  }

  function renderRecordingsList(){
    const el = $('recordingsList');
    el.innerHTML = '';
    if(recMeta.length === 0){ el.innerHTML = '<p>Nessuna registrazione</p>'; return; }
    recMeta.slice().reverse().forEach(m => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `<div style="display:flex;justify-content:space-between">
                         <div><strong>${m.name}</strong><div style="font-size:0.9em;color:#666">${m.created} • ${Math.round(m.size/1024)} KB</div></div>
                         <div>
                           <button class="btn small" data-rec="${m.id}" data-act="download">Scarica</button>
                           <button class="btn small" data-rec="${m.id}" data-act="delete" style="background:#e74c3c">Elimina</button>
                         </div>
                       </div>`;
      el.appendChild(row);
    });
  }

  document.body.addEventListener('click', e => {
    const dl = e.target.closest('button[data-act="download"]');
    const delr = e.target.closest('button[data-act="delete"]');
    if(dl){
      // recordings are only metadata in storage; the actual blob was downloaded at save time.
      alert('Le registrazioni vengono fornite come download diretto al salvataggio. Se vuoi conservarle a lungo, salva i file .webm localmente.');
    }
    if(delr){
      const rid = delr.dataset.rec;
      const idx = recMeta.findIndex(x=>x.id===rid);
      if(idx>=0){ recMeta.splice(idx,1); saveJSON(KEY.RECORDINGS_META, recMeta); renderRecordingsList(); speak('Registrazione eliminata'); }
    }
  });

  /* Recorder buttons */
  if(recordBtn) recordBtn.addEventListener('click', startRecording);
  if(stopBtn) stopBtn.addEventListener('click', stopRecording);
  if(playBtn) playBtn.addEventListener('click', playRecording);
  if(saveBtn) saveBtn.addEventListener('click', saveRecording);

  /* -------- Voice: SpeechRecognition and TTS (pyttsx3 not needed; use Web Speech API for TTS) -------- */
  function speak(msg){
    try{
      const ut = new SpeechSynthesisUtterance(msg);
      ut.lang = 'it-IT';
      speechSynthesis.cancel();
      speechSynthesis.speak(ut);
    }catch(e){
      console.log('TTS not available:', e);
    }
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let recog = null;
  if(SpeechRecognition){
    recog = new SpeechRecognition();
    recog.lang = 'it-IT';
    recog.continuous = false;
    recog.interimResults = false;
    recog.onresult = e => {
      const text = e.results[0][0].transcript.toLowerCase().trim();
      $('status').textContent = `Hai detto: "${text}"`;
      handleCommand(text);
    };
    recog.onerror = e => {
      console.error('Speech error', e);
      speak('Errore riconoscimento vocale');
    };
    recog.onend = () => {
      // ready
      $('voiceBtn').disabled = false;
      $('conversationBtn') && ($('conversationBtn').disabled = false);
    };
  }else{
    console.warn('SpeechRecognition non disponibile');
  }

  function startListeningButton(btn){
    if(!recog){ alert('Riconoscimento vocale non supportato da questo browser'); return; }
    btn.disabled = true;
    $('status').textContent = 'Ascolto...';
    recog.start();
  }

  if($('voiceBtn')) $('voiceBtn').addEventListener('click', () => startListeningButton($('voiceBtn')));
  if($('conversationBtn')) $('conversationBtn').addEventListener('click', () => startListeningButton($('conversationBtn')));

  /* -------- Command handling (basic patterns) -------- */
  function handleCommand(cmd){
    // mapping
    if(cmd.includes('ciao nerdy') || cmd.includes('ciao') || cmd.includes('attiva nerdy')){
      speak('Ciao! Dimmi cosa vuoi fare.');
      appendConversation('user', cmd);
      appendConversation('nerdy', 'Dimmi un comando, ad esempio "Aggiungi impegno compra latte"');
      return;
    }
    if(cmd.startsWith('aggiungi impegno') || cmd.startsWith('aggiungi attività') || cmd.startsWith('aggiungi impegni')){
      const text = cmd.replace(/aggiungi impegno\s*/,'').replace(/aggiungi attività\s*/,'').trim();
      if(text){ tasks.push({ id:uid('task_'), title:text, t:ts() }); saveJSON(KEY.TASKS,tasks); renderAll(); speak('Impegno aggiunto'); appendConversation('nerdy','Impegno aggiunto: '+text);}
      else speak('Non ho capito il testo dell\'impegno');
      return;
    }
    if(cmd.startsWith('aggiungi appuntamento') || cmd.startsWith('aggiungi appuntamenti')){
      const text = cmd.replace(/aggiungi appuntamento\s*/,'').trim();
      // No date from voice; add as simple appointment with now timestamp
      if(text){ appts.push({ id:uid('appt_'), title:text, date:new Date().toISOString().slice(0,16), t:ts()}); saveJSON(KEY.APPTS,appts); renderAll(); speak('Appuntamento aggiunto'); appendConversation('nerdy','Appuntamento aggiunto: '+text);}
      else speak('Non ho capito la descrizione');
      return;
    }
    if(cmd.startsWith('aggiungi scadenza')){
      const text = cmd.replace(/aggiungi scadenza\s*/,'').trim();
      if(text){ deadlines.push({ id:uid('dead_'), title:text, date:new Date().toISOString().slice(0,16), t:ts()}); saveJSON(KEY.DEADLINES,deadlines); renderAll(); speak('Scadenza aggiunta'); }
      else speak('Non ho capito la descrizione');
      return;
    }
    if(cmd.startsWith('aggiungi nota')){
      const text = cmd.replace(/aggiungi nota\s*/,'').trim();
      if(text){ notes.push({ id:uid('note_'), title:text.slice(0,20), text, t:ts() }); saveJSON(KEY.NOTES,notes); renderAll(); speak('Nota aggiunta'); }
      else speak('Non ho capito la nota');
      return;
    }
    if(cmd.startsWith('aggiungi alla lista') || cmd.startsWith('aggiungi alla lista della spesa') || cmd.startsWith('aggiungi lista')){
      const text = cmd.replace(/aggiungi alla lista(cli)?\s*/,'').replace('aggiungi alla lista della spesa','').trim();
      if(text){ shop.push({ id:uid('shop_'), title:text, t:ts()}); saveJSON(KEY.SHOP,shop); renderAll(); speak('Aggiunto alla lista'); }
      else speak('Non ho capito l\'articolo');
      return;
    }
    if(cmd.includes('mostra impegni') || cmd.includes('mostra gli impegni')){
      speak('Ecco i tuoi impegni');
      appendConversation('nerdy', tasks.length? tasks.map(t=>t.title).join('; ') : 'Nessun impegno');
      return;
    }
    if(cmd.includes('inizia registrazione') || cmd.includes('start registrazione') || cmd.includes('invia registrazione')){
      startRecording();
      speak('Registrazione avviata');
      return;
    }
    if(cmd.includes('ferma registrazione') || cmd.includes('stop registrazione')){
      stopRecording();
      speak('Registrazione fermata');
      return;
    }
    if(cmd.includes('salva registrazione')){
      saveRecording();
      return;
    }
    if(cmd.includes('backup dati') || cmd.includes('esporta dati') || cmd.includes('esporta')){
      exportData();
      speak('Export dei dati avviato');
      return;
    }
    if(cmd.includes('apri configurazione') || cmd.includes('apri config') || cmd.includes('configurazione')){
      speak('Apro configurazione');
      // HTML-level opening relies on start command in batch; in web open config editor not available
      alert('Apri il file config.ini dalla cartella del progetto se presente.');
      return;
    }
    if(cmd.includes('esci') || cmd.includes('arrivederci') || cmd.includes('chiudi')){
      speak('Arrivederci!');
      appendConversation('nerdy','Arrivederci!');
      return;
    }
    // fallback
    speak('Non ho capito il comando. Prova "Aggiungi impegno ..." o "Mostra impegni"');
  }

  /* Conversation UI */
  function appendConversation(sender, text){
    const conv = $('conversation');
    if(!conv) return;
    const div = document.createElement('div');
    div.className = sender==='nerdy' ? 'message nerdy-message' : 'message user-message';
    div.textContent = text;
    conv.appendChild(div);
    conv.scrollTop = conv.scrollHeight;
  }

  /* -------- Export / Import / Reset -------- */
  window.exportData = function(){
    const all = { tasks, appts, deadlines, notes, shop, recMeta, settings };
    const blob = new Blob([JSON.stringify(all, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nerdy_export_' + new Date().toISOString().slice(0,19) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    speak('File esportato');
  };

  window.importData = function(){
    const input = $('importFile'
