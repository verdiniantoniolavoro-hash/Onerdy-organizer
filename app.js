const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) { alert("Il tuo browser non supporta il riconoscimento vocale."); }

const recognition = new SpeechRecognition();
recognition.lang = 'it-IT';
recognition.interimResults = false;
recognition.continuous = false;

const voiceBtn = document.getElementById("voiceBtn");
const status = document.getElementById("status");

voiceBtn.addEventListener("click", () => {
  recognition.start();
  status.textContent = "Parla ora...";
});

recognition.addEventListener("result", (event) => {
  const transcript = event.results[0][0].transcript.trim().toLowerCase();
  console.log("Hai detto:", transcript);

  if (transcript.includes("ciao nerdy")) {
    status.textContent = "Nerdy attivato!";
    document.querySelector(".tab[data-tab='assistant']").click();
  } else if (transcript.startsWith("aggiungi impegno")) {
    const task = transcript.replace("aggiungi impegno","").trim();
    if(task) addTask(task);
  } else if (transcript.startsWith("aggiungi appuntamento")) {
    const app = transcript.replace("aggiungi appuntamento","").trim();
    if(app) addAppointment(app);
  } else if (transcript.startsWith("aggiungi nota")) {
    const note = transcript.replace("aggiungi nota","").trim();
    if(note) addNote(note);
  } else if (transcript.startsWith("aggiungi alla lista")) {
    const item = transcript.replace("aggiungi alla lista","").trim();
    if(item) addShoppingItem(item);
  } else {
    status.textContent = `Non ho capito: "${transcript}"`;
  }
});

recognition.addEventListener("error", (event) => {
  console.error("Errore riconoscimento vocale:", event.error);
  status.textContent = "Errore microfono: " + event.error;
});

function addTask(task="Nuovo impegno") {
  const list = document.getElementById("taskList");
  const p = document.createElement("p");
  p.textContent = task;
  list.appendChild(p);
}
function addAppointment(app="Nuovo appuntamento") {
  const list = document.getElementById("appointmentList");
  const p = document.createElement("p");
  p.textContent = app;
  list.appendChild(p);
}
function addNote(note="Nuova nota") {
  const list = document.getElementById("noteList");
  const p = document.createElement("p");
  p.textContent = note;
  list.appendChild(p);
}
function addShoppingItem(item="Nuovo articolo") {
  const list = document.getElementById("shoppingList");
  const p = document.createElement("p");
  p.textContent = item;
  list.appendChild(p);
}
