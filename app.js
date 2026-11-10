const DATA_URL = "quiz_contabilitate_CSIE_complet.json";
const state = {
  data: null, questions: [], quizQuestions: [], questionIndex: 0, selected: false,
  solved: JSON.parse(localStorage.getItem("contalabs-solved") || "{}"),
  points: Number(localStorage.getItem("contalabs-points") || 0),
  streak: Number(localStorage.getItem("contalabs-streak") || 0)
};

const $ = (selector) => document.querySelector(selector);
const escapeText = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

async function loadData() {
  try {
    if (window.CONTA_DATA) {
      state.data = window.CONTA_DATA;
    } else {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.data = await response.json();
    }
    state.questions = state.data.intrebari;
    renderTopics();
    updateStats();
  } catch (error) {
    showToast("Nu am putut încărca întrebările. Deschide proiectul printr-un server local.");
    console.error("Încărcarea întrebărilor a eșuat:", error);
  }
}

function renderTopics() {
  const topicGrid = $("#topic-grid");
  topicGrid.innerHTML = state.data.capitole.slice(0, 8).map((chapter, index) => `
    <article class="topic-card" data-topic="${escapeText(chapter.id)}">
      <span class="topic-index">${String(index + 1).padStart(2, "0")}</span>
      <div><h3>${escapeText(chapter.titlu)}</h3><p>${chapter.numar_intrebari} întrebări</p></div>
    </article>
  `).join("");
  topicGrid.querySelectorAll(".topic-card").forEach((card) => card.addEventListener("click", () => startQuiz(card.dataset.topic)));
}

function updateStats() {
  const solvedCount = Object.keys(state.solved).length;
  const correctCount = Object.values(state.solved).filter(Boolean).length;
  const total = state.questions.length || 1;
  $("#solved-count").textContent = solvedCount;
  $("#solved-percent").textContent = `${Math.round(solvedCount / total * 100)}% din total`;
  $("#accuracy-count").textContent = solvedCount ? `${Math.round(correctCount / solvedCount * 100)}%` : "—";
  $("#points-count").textContent = state.points;
  $("#streak-count").textContent = state.streak;
  $("#ring-value").textContent = `${Math.round(solvedCount / total * 100)}%`;
  $("#quiz-progress").style.width = `${Math.round(solvedCount / total * 100)}%`;
  localStorage.setItem("contalabs-solved", JSON.stringify(state.solved));
  localStorage.setItem("contalabs-points", state.points);
  localStorage.setItem("contalabs-streak", state.streak);
}

function startQuiz(topic = "all") {
  if (!state.questions.length) return;
  const pool = topic === "all" ? [...state.questions] : state.questions.filter((question) => question.capitol === topic);
  state.quizQuestions = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(10, pool.length));
  state.questionIndex = 0;
  state.selected = false;
  $("#quiz-modal").hidden = false;
  document.body.style.overflow = "hidden";
  renderQuestion();
}

function renderQuestion() {
  const question = state.quizQuestions[state.questionIndex];
  if (!question) return;
  state.selected = false;
  $("#question-counter").textContent = `${state.questionIndex + 1} / ${state.quizQuestions.length}`;
  $("#quiz-title").textContent = question.tema || "Quiz contabilitate";
  $("#quiz-topic").textContent = question.dificultate ? `Nivel ${question.dificultate}` : "Întrebare de antrenament";
  $("#quiz-difficulty").textContent = "● alegere unică";
  $("#question-text").textContent = question.intrebare;
  $("#answers").innerHTML = question.optiuni.map((option, index) => `<button class="answer" data-index="${index}">${escapeText(option)}</button>`).join("");
  $("#explanation").hidden = true;
  $("#explanation").textContent = "";
  $("#feedback-label").textContent = "Alege un răspuns";
  $("#next-button").disabled = true;
  $("#next-button").innerHTML = state.questionIndex === state.quizQuestions.length - 1 ? "Vezi rezultatul <span>→</span>" : "Următoarea <span>→</span>";
  $("#quiz-progress").style.width = `${(state.questionIndex / state.quizQuestions.length) * 100}%`;
  $("#answers").querySelectorAll(".answer").forEach((button) => button.addEventListener("click", () => selectAnswer(Number(button.dataset.index))));
}

function selectAnswer(index) {
  if (state.selected) return;
  state.selected = true;
  const question = state.quizQuestions[state.questionIndex];
  const correct = index === question.raspuns_corect_index;
  const id = question.id;
  state.solved[id] = correct;
  if (correct) { state.points += 10; state.streak += 1; } else state.streak = 0;
  $("#answers").querySelectorAll(".answer").forEach((button, buttonIndex) => {
    button.disabled = true;
    if (buttonIndex === question.raspuns_corect_index) button.classList.add("correct");
    if (buttonIndex === index && !correct) button.classList.add("wrong");
  });
  $("#feedback-label").textContent = correct ? "Corect! +10 XP" : "Nu încă — învață din explicație";
  $("#explanation").textContent = question.explicatie || `Răspuns corect: ${question.raspuns_corect}`;
  $("#explanation").hidden = false;
  $("#next-button").disabled = false;
  updateStats();
}

function nextQuestion() {
  if (!state.selected) return;
  if (state.questionIndex === state.quizQuestions.length - 1) {
    closeQuiz();
    showToast("Quiz finalizat! Progresul tău a fost salvat.");
    return;
  }
  state.questionIndex += 1;
  renderQuestion();
}

function closeQuiz() {
  $("#quiz-modal").hidden = true;
  document.body.style.overflow = "";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

$("#start-button").addEventListener("click", () => startQuiz());
$("#daily-button").addEventListener("click", () => startQuiz());
$("#all-topics-button").addEventListener("click", () => startQuiz());
$("#next-button").addEventListener("click", nextQuestion);
$("#close-quiz").addEventListener("click", closeQuiz);
$("#quiz-modal").addEventListener("click", (event) => { if (event.target === $("#quiz-modal")) closeQuiz(); });
$("#theme-toggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("contalabs-dark", document.body.classList.contains("dark"));
});
if (localStorage.getItem("contalabs-dark") === "true") document.body.classList.add("dark");
loadData();
