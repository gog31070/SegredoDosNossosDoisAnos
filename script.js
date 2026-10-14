/**
 * O Segredo dos Nossos Dois Anos — versão 5, com o final completo.
 * Cinco fechaduras, chave física na cesta, senha VOCÊ e carta final editável.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "segredo-nossos-dois-anos-v1";
  const state = {
    started: false, lastScreen: "intro", clockCompleted: false, cinemaCompleted: false,
    cinemaAct: 0, letterCompleted: false, letterFound: [false, false, false, false],
    photoCompleted: false, photoSelection: [], photoFutureOpened: false,
    hours: 12, minutes: 0, hintStep: 0,
    finalUnlocked: false, finalLetterOpened: false, finalFinished: false,
    finalVaultTried: false, finalHintStep: 0
  };

  const $ = (id) => document.getElementById(id);
  const screenIds = ["intro", "letter", "vault", "clock", "key", "cinema", "cinema-key", "letter-puzzle", "letter-key", "photos", "photo-key", "final-vault", "final-search", "final-password", "final-reveal", "final-letter", "final-future"];

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      state.clockCompleted = saved.clockCompleted === true;
      state.cinemaCompleted = saved.cinemaCompleted === true && state.clockCompleted;
      state.cinemaAct = state.clockCompleted && [0, 1, 2].includes(saved.cinemaAct) ? saved.cinemaAct : 0;
      state.letterCompleted = saved.letterCompleted === true && state.cinemaCompleted;
      state.letterFound = state.cinemaCompleted && Array.isArray(saved.letterFound)
        ? [0,1,2,3].map(i => saved.letterFound[i] === true) : [false,false,false,false];
      if (state.letterCompleted) state.letterFound.fill(true);
      state.photoCompleted = saved.photoCompleted === true && state.letterCompleted;
      state.photoSelection = state.letterCompleted && Array.isArray(saved.photoSelection) && saved.photoSelection.length <= 4 && saved.photoSelection.every(n => Number.isInteger(n) && n >= 0 && n < 4) && new Set(saved.photoSelection).size === saved.photoSelection.length
        ? saved.photoSelection : [];
      state.photoFutureOpened = saved.photoFutureOpened === true && state.photoCompleted;
      if (state.photoCompleted) state.photoSelection = [0, 1, 2, 3];
      state.finalUnlocked = saved.finalUnlocked === true && state.photoCompleted;
      state.finalLetterOpened = saved.finalLetterOpened === true && state.finalUnlocked;
      state.finalFinished = saved.finalFinished === true && state.finalLetterOpened;
      state.finalVaultTried = saved.finalVaultTried === true && state.photoCompleted;
      state.finalHintStep = Number.isInteger(saved.finalHintStep) && saved.finalHintStep >= 0 && saved.finalHintStep <= 2 ? saved.finalHintStep : 0;
      state.started = saved.started === true || state.clockCompleted || state.cinemaAct > 0 || state.cinemaCompleted || state.letterCompleted || state.photoCompleted || state.photoSelection.length > 0;
      state.lastScreen = screenIds.includes(saved.lastScreen) && saved.lastScreen !== "intro"
        ? saved.lastScreen : "vault";
      // Progresso salvo pela V2/V2.1 continua funcionando.
    } catch (_) { /* O site funciona normalmente mesmo sem armazenamento. */ }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        started: state.started, lastScreen: state.lastScreen,
        clockCompleted: state.clockCompleted, cinemaCompleted: state.cinemaCompleted,
        cinemaAct: state.cinemaAct, letterCompleted: state.letterCompleted,
        letterFound: state.letterFound, photoCompleted: state.photoCompleted,
        photoSelection: state.photoSelection, photoFutureOpened: state.photoFutureOpened,
        finalUnlocked: state.finalUnlocked, finalLetterOpened: state.finalLetterOpened,
        finalFinished: state.finalFinished, finalVaultTried: state.finalVaultTried,
        finalHintStep: state.finalHintStep
      }));
    } catch (_) { /* Sem armazenamento, a experiência continua durante a sessão. */ }
    updateSavedActions();
  }

  function updateSavedActions() {
    $("saved-actions").hidden = !state.started;
  }

  function showScreen(next) {
    if (!screenIds.includes(next)) return;
    for (const name of screenIds) {
      const element = $(`screen-${name}`);
      element.hidden = name !== next;
    }
    if (next === "vault") renderVault();
    if (next === "clock") renderClock();
    if (next === "cinema") renderCinema();
    if (next === "letter-puzzle") { releaseFlashlight(); renderLetterPuzzle(); }
    if (next === "photos") renderPhotos();
    if (next === "final-vault") renderFinalVault();
    if (next === "final-search") renderFinalSearch();
    if (next !== "intro") {
      state.started = true;
      state.lastScreen = next;
      saveProgress();
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    // Foco sem deslocar a tela; ajuda leitores de tela a acompanharem o fluxo.
    const title = $(`screen-${next}`).querySelector("h1,h2");
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  }

  function makeStars() {
    // Posições determinísticas; não dependemos de imagens nem de internet.
    const background = $("stars");
    for (let i = 0; i < 48; i++) {
      const point = document.createElement("i");
      const x = ((i * 37 + 19) % 101);
      const y = ((i * 61 + 11) % 103);
      const size = i % 7 === 0 ? 3 : (i % 3 === 0 ? 2 : 1);
      point.className = "star";
      point.style.cssText = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;--opacity:${(0.22 + (i % 5) * .12).toFixed(2)};--duration:${2.7 + i % 7}s;animation-delay:-${i % 6}s`;
      background.appendChild(point);
    }
  }

  function makeClockTicks() {
    for (let i = 0; i < 60; i++) {
      if (i % 5 !== 0) continue; // Marcações maiores, sem sobrecarregar o celular.
      const mark = document.createElement("span");
      mark.className = "tick major";
      const radians = i * Math.PI / 30;
      const radius = 81;
      const left = 50 + radius * Math.sin(radians);
      const top = 50 - radius * Math.cos(radians);
      // O dial mede 190px: usamos px, não porcentagem para o raio.
      mark.style.cssText = `left:calc(50% + ${radius * Math.sin(radians)}px);top:calc(50% - ${radius * Math.cos(radians)}px);transform:rotate(${i * 6}deg);`;
      $("clock-ticks").appendChild(mark);
    }
  }

  function renderClock() {
    $("hour-value").textContent = String(state.hours).padStart(2, "0");
    $("minute-value").textContent = String(state.minutes).padStart(2, "0");
    const hourAngle = ((state.hours % 12) + state.minutes / 60) * 30;
    const minuteAngle = state.minutes * 6;
    $("clock-face").style.setProperty("--hour-angle", `${hourAngle}deg`);
    $("clock-face").style.setProperty("--minute-angle", `${minuteAngle}deg`);
  }

  function adjustTime(unit, direction) {
    if (unit === "hours") state.hours = (state.hours + direction + 24) % 24;
    if (unit === "minutes") state.minutes = (state.minutes + direction + 60) % 60;
    $("clock-feedback").textContent = "";
    renderClock();
  }

  function renderVault() {
    const clockDone = state.clockCompleted;
    const cinemaDone = state.cinemaCompleted;
    const letterDone = state.letterCompleted;
    const photoDone = state.photoCompleted;
    const total = Number(clockDone) + Number(cinemaDone) + Number(letterDone) + Number(photoDone);
    $("progress-text").textContent = `${total} / 4`;
    $("progress-fill").style.width = `${total * 25}%`;
    $("vault-lock-a").classList.toggle("unlocked", clockDone);
    $("vault-lock-b").classList.toggle("unlocked", cinemaDone);
    $("vault-lock-c").classList.toggle("unlocked", letterDone);
    $("vault-lock-d").classList.toggle("unlocked", photoDone);
    $("slot-time").classList.toggle("complete", clockDone);
    $("slot-cinema").classList.toggle("complete", cinemaDone);
    $("slot-letter").classList.toggle("complete", letterDone);
    $("slot-future").classList.toggle("complete", photoDone);
    $("slot-time-status").textContent = clockDone ? "Conquistada" : "Pendente";
    $("slot-cinema-status").textContent = cinemaDone ? "Conquistada" : "Pendente";
    $("slot-letter-status").textContent = letterDone ? "Conquistada" : "Pendente";
    $("slot-future-status").textContent = photoDone ? "Conquistada" : "Pendente";
    $("start-clock").hidden = clockDone;
    $("start-cinema").hidden = !clockDone || cinemaDone;
    $("start-letter-puzzle").hidden = !cinemaDone || letterDone;
    $("start-photos").hidden = !letterDone || photoDone;
    $("review-photo-key").hidden = !photoDone;
    $("start-finale").hidden = !photoDone;
    $("review-letter-key").hidden = !letterDone;
    $("review-clock-key").hidden = !clockDone;
    $("review-cinema-key").hidden = !cinemaDone;
    if (!clockDone) {
      $("vault-message").textContent = "A primeira chave espera por você onde tudo começou: no tempo.";
    } else if (!cinemaDone) {
      $("vault-message").textContent = "Você encontrou a Chave do Tempo. Agora, dois ingressos escondem o próximo segredo...";
    } else if (!letterDone) {
      $("vault-message").textContent = "Duas chaves estão seguras! Procure agora as palavras escondidas na Carta Invisível...";
    } else if (!photoDone) {
      $("vault-message").textContent = "Três chaves conquistadas! Agora, reconstrua nossa história nos Fragmentos do Tempo...";
    } else {
      $("vault-message").textContent = state.finalFinished
        ? "O último segredo foi revelado. E nossa história continua... ♡"
        : "As quatro chaves estão reunidas. O cofre finalmente está pronto para revelar o último segredo. ♡";
      $("start-finale").innerHTML = state.finalFinished ? 'Revisitar nosso último segredo <span aria-hidden="true">♡</span>' : 'Revelar o último segredo <span aria-hidden="true">✦</span>';
    }
  }

  function renderCinema() {
    const second = state.cinemaAct === 2;
    const interlude = state.cinemaAct === 1;
    $("cinema-choices").hidden = interlude;
    $("cinema-interlude").hidden = !interlude;
    $("cinema-step-info").hidden = interlude;
    $("cinema-hint-button").hidden = interlude;
    $("cinema-scene-label").textContent = second ? "ATO 02 · O PEDIDO" : "ATO 01 · A PRIMEIRA SAÍDA";
    $("cinema-question").textContent = interlude ? "O primeiro ingresso está salvo!" : (second ? "O dia em que tudo mudou..." : "Antes de sermos namorados...");
    $("cinema-question-body").textContent = interlude
      ? "Uma sessão já voltou para a nossa história. Ainda resta um ingresso perdido."
      : second
        ? "Em 20/10/2024, no dia em que te pedi em namoro, qual filme assistimos?"
        : "Qual foi o primeiro filme que assistimos quando saímos juntos?";
    $("cinema-step-info").innerHTML = second
      ? '<span class="step-done">✓ INGRESSO 1</span><span class="cinema-step-bridge">—</span><span class="step-active">INGRESSO 2</span>'
      : '<span class="step-active">INGRESSO 1</span><span class="cinema-step-bridge">—</span><span>INGRESSO 2</span>';
    $("cinema-feedback").textContent = "";
    $("cinema-hint").hidden = true;
    $("cinema-hint-button").setAttribute("aria-expanded", "false");
    $("cinema-hint").textContent = second
      ? "Dica: essa sessão foi inesquecível por causa do pedido... não exatamente por causa do filme. KKKKK"
      : "Dica: antes do nosso namoro, um filme cheio de emoções marcou a primeira saída.";
    document.querySelectorAll(".movie-ticket").forEach(ticket => {
      ticket.classList.remove("ticket-error");
      ticket.disabled = false;
      ticket.hidden = second && ticket.dataset.movie === "inside";
    });
  }

  function chooseMovie(event) {
    const ticket = event.currentTarget;
    if (state.cinemaCompleted || state.cinemaAct === 1) return;
    const expected = state.cinemaAct === 0 ? "inside" : "joker";
    document.querySelectorAll(".movie-ticket").forEach(item => item.classList.remove("ticket-error"));
    if (ticket.dataset.movie !== expected) {
      ticket.classList.add("ticket-error");
      $("cinema-feedback").textContent = state.cinemaAct === 0
        ? "Hmm... não foi essa a nossa primeira sessão juntos. Tente outro ingresso! 🩵"
        : "Esse não foi o filme do pedido. Procure mais um pouquinho! 🩵";
      return;
    }
    if (state.cinemaAct === 0) {
      state.cinemaAct = 1;
      saveProgress();
      renderCinema();
    } else {
      state.cinemaCompleted = true;
      saveProgress();
      showScreen("cinema-key");
    }
  }

  function startCinema() {
    if (!state.clockCompleted) { showScreen("clock"); return; }
    if (state.cinemaCompleted) { showScreen("cinema-key"); return; }
    showScreen("cinema");
  }

  function checkClock() {
    if (state.hours === 13 && state.minutes === 51) {
      state.clockCompleted = true;
      saveProgress();
      showScreen("key");
    } else {
      $("clock-feedback").textContent = "Ainda não é esse o momento. Tente mais uma vez! 🩵";
    }
  }

  const LETTERS = ["A", "M", "O", "R"];

  // Luz negra: o texto permanece invisível fora da área iluminada.
  // A descoberta de cada letra fica salva, mas a frase NÃO permanece revelada.
  function renderLetterPuzzle() {
    const allFound = state.letterFound.every(Boolean);
    document.querySelectorAll(".secret-fragment").forEach((fragment, index) => {
      fragment.classList.toggle("found", state.letterFound[index]);
      fragment.querySelector(".fragment-trigger").setAttribute("aria-pressed", String(state.letterFound[index]));
    });
    document.querySelectorAll("[data-letter-slot]").forEach((slot, index) => {
      slot.textContent = state.letterFound[index] ? LETTERS[index] : "?";
      slot.classList.toggle("revealed", state.letterFound[index]);
    });
    $("letter-counter").textContent = `${state.letterFound.filter(Boolean).length} / 4`;
    $("secret-lock-panel").hidden = !allFound;
  }

  function findFragment(index) {
    if (!Number.isInteger(index) || index < 0 || index > 3 || state.letterFound[index]) return;
    state.letterFound[index] = true;
    state.lastScreen = "letter-puzzle";
    saveProgress();
    renderLetterPuzzle();
    $("letter-feedback").textContent = state.letterFound.every(Boolean)
      ? "Você guardou as quatro letras! Junte-as na ordem dos fragmentos para abrir o cadeado."
      : `Letra ${LETTERS[index]} guardada! Procure as outras na carta... ✦`;
  }

  function aimFlashlight(event) {
    const paper = $("secret-paper");
    const rect = paper.getBoundingClientRect();
    // Em telas sensíveis ao toque, posicionar a luz ligeiramente acima do dedo.
    const offset = event.pointerType === "touch" ? 38 : 0;
    const px = event.clientX;
    const py = event.clientY - offset;
    const x = Math.max(0, Math.min(rect.width, px - rect.left));
    const y = Math.max(0, Math.min(rect.height, py - rect.top));
    paper.style.setProperty("--beam-x", `${x}px`);
    paper.style.setProperty("--beam-y", `${y}px`);
    paper.classList.add("using-light");
    const beam = $("flashlight-beam");
    beam.style.left = `${x}px`;
    beam.style.top = `${y}px`;
    // Cada parágrafo tem sua própria máscara circular em coordenadas locais.
    document.querySelectorAll(".secret-fragment").forEach(fragment => {
      const content = fragment.querySelector(".fragment-content");
      const box = content.getBoundingClientRect();
      content.style.setProperty("--spot-x", `${px - box.left}px`);
      content.style.setProperty("--spot-y", `${py - box.top}px`);
    });
  }

  // As letras não são mais coletadas só por passar a lanterna: requer toque/clique.
  function collectIlluminatedLetter(event) {
    const offset = event.pointerType === "touch" ? 38 : 0;
    const px = event.clientX;
    document.querySelectorAll(".secret-fragment").forEach((fragment, index) => {
      const glyph = fragment.querySelector("strong").getBoundingClientRect();
      const cx = Math.max(glyph.left, Math.min(px, glyph.right));
      const touchY = event.clientY;
      const litY = event.clientY - offset;
      const distance = Math.min(Math.hypot(px - cx, touchY - Math.max(glyph.top, Math.min(touchY, glyph.bottom))),
        Math.hypot(px - cx, litY - Math.max(glyph.top, Math.min(litY, glyph.bottom))));
      // Aceita tanto tocar diretamente na letra quanto abaixo dela, junto à luz deslocada no celular.
      if (distance < 18) findFragment(index);
    });
  }

  function releaseFlashlight() {
    const paper = $("secret-paper");
    paper.classList.remove("using-light");
    // Remove INSTANTANEAMENTE toda a escrita iluminada.
    document.querySelectorAll(".fragment-content").forEach(content => {
      content.style.setProperty("--spot-x", "-900px");
      content.style.setProperty("--spot-y", "-900px");
    });
  }

  function checkSecretPassword(event) {
    event.preventDefault();
    const normalize = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    if (!state.letterFound.every(Boolean)) {
      $("letter-feedback").textContent = "Primeiro, encontre todos os quatro fragmentos!";
    } else if (normalize($("secret-password").value) === "AMOR") {
      state.letterCompleted = true;
      saveProgress();
      showScreen("letter-key");
    } else {
      $("letter-feedback").textContent = "Ainda não abriu! Junte as quatro letras em destaque, na ordem em que aparecem na carta.";
    }
  }

  function showLetterHint() {
    state.hintStep = Math.min(2, state.hintStep + 1);
    $("letter-hint").hidden = false;
    $("letter-hint").textContent = state.hintStep === 1
      ? "A escrita só aparece sob a luz e desaparece ao afastá-la. Procure as letras que mais brilham em cada trecho."
      : "São quatro letras destacadas — uma em cada mensagem. Procure-as com a lanterna e leia de cima para baixo.";
    $("letter-hint-button").textContent = state.hintStep === 1 ? "Quero outra dica →" : "Dica revelada ✓";
    $("letter-hint-button").disabled = state.hintStep >= 2;
  }

  // Fotografias: os arquivos foto-1.jpg ... foto-4.jpg devem estar em ordem cronológica.
  // A exibição embaralha a ordem, sem mostrar os índices verdadeiros.
  const PHOTOS = [
    { index: 0, id: "b", label: "Fragmento B" },
    { index: 1, id: "d", label: "Fragmento D" },
    { index: 2, id: "a", label: "Fragmento A" },
    { index: 3, id: "c", label: "Fragmento C" }
  ];
  const SHUFFLED = [2, 0, 3, 1];
  const hasRealPhoto = [false, false, false, false];

  function getPhotoTestingLabel(index) {
    return [
      "Foto 1",
      "Foto 2",
      "Foto 3",
      "Foto 4"
    ][index];
  }

  function getPhotoCardLabel(index) {
    return hasRealPhoto[index] ? PHOTOS[index].label : getPhotoTestingLabel(index);
  }

  function buildPhotoWall() {
    const wall = $("photo-wall");
    wall.replaceChildren();
    for (let pos = 0; pos < SHUFFLED.length; pos++) {
      const photo = PHOTOS[SHUFFLED[pos]];
      const card = document.createElement("button");
      card.className = "polaroid";
      card.type = "button";
      card.dataset.photoIndex = String(photo.index);
      card.setAttribute("aria-label", `Selecionar ${photo.label} como próxima fotografia`);
      const img = document.createElement("img");
      img.alt = `Foto de vocês: ${getPhotoCardLabel(photo.index)}`;
      img.loading = "lazy";
      img.src = `assets/fotos/foto-${photo.index + 1}.jpg`;
      // Foto ilustrativa só aparece enquanto a foto verdadeira não for colocada na pasta.
      img.onerror = () => {
        hasRealPhoto[photo.index] = false;
        img.onerror = null;
        img.src = `assets/ilustracoes/fragmento-${photo.index + 1}.svg`;
        updatePhotoDemoNotice();
      };
      img.onload = () => {
        if (img.currentSrc.endsWith('.jpg')) hasRealPhoto[photo.index] = true;
        caption.textContent = getPhotoCardLabel(photo.index);
        img.alt = `Foto de vocês: ${getPhotoCardLabel(photo.index)}`;
        updatePhotoDemoNotice();
      };
      const caption = document.createElement("span");
      caption.className = "polaroid-caption";
      caption.textContent = getPhotoCardLabel(photo.index);
      card.append(img, caption);
      card.addEventListener("click", () => selectPhoto(photo.index));
      wall.appendChild(card);
    }
  }

  function updatePhotoDemoNotice() {
    const note = $("photo-demo-notice");
    note.hidden = hasRealPhoto.every(Boolean);
    if (!note.hidden) {
      note.innerHTML = '✧ Modo de teste ativo: como as fotos reais ainda não foram colocadas, cada cartão mostra um rótulo provisório com a ordem correta (Foto 1 a Foto 4). Antes da surpresa, coloque as quatro fotos de vocês na pasta <code>assets/fotos</code>.';
    }
  }

  function renderPhotos() {
    const chosen = state.photoSelection;
    document.querySelectorAll("[data-photo-index]").forEach(card => {
      const selected = chosen.includes(Number(card.dataset.photoIndex));
      card.classList.toggle("selected", selected);
      card.disabled = selected || state.photoCompleted;
      card.setAttribute("aria-pressed", String(selected));
    });
    const timeline = $("photo-timeline");
    timeline.replaceChildren();
    for (let n = 0; n < 4; n++) {
      const cell = document.createElement("div");
      cell.className = `timeline-cell ${chosen[n] === undefined ? "" : "filled"}`;
      if (chosen[n] === undefined) {
        const icon = document.createElement("span");
        icon.textContent = "✧";
        const order = document.createElement("span");
        order.textContent = `${n+1}ª foto`;
        cell.append(icon, order);
      } else {
        const card = document.querySelector(`[data-photo-index="${chosen[n]}"]`);
        const img = card.querySelector("img").cloneNode(true);
        // Evita reexecutar handlers de erro no clone.
        img.removeAttribute("onerror");
        const label = document.createElement("span");
        label.textContent = getPhotoCardLabel(chosen[n]);
        cell.append(img, label);
      }
      timeline.appendChild(cell);
    }
    $("photo-counter").textContent = `${chosen.length} de 4 lembranças`;
    $("photo-undo").disabled = chosen.length === 0 || state.photoCompleted;
    $("photo-clear").disabled = chosen.length === 0 || state.photoCompleted;
    $("photo-check").disabled = chosen.length !== 4 || state.photoCompleted;
    $("photo-check").hidden = state.photoCompleted;
    $("future-reveal").hidden = !state.photoCompleted;
    $("future-message").hidden = !state.photoFutureOpened;
    $("future-photo-button").disabled = state.photoFutureOpened;
    $("future-photo-button").querySelector("small").textContent = state.photoFutureOpened ? "UM FUTURO POR ESCREVER" : "TOQUE PARA REVELAR";
    if (state.photoCompleted) $("photo-feedback").textContent = "Sequência correta! As quatro lembranças voltaram ao lugar. ♡";
  }

  function selectPhoto(index) {
    if (!state.letterCompleted || state.photoCompleted || state.photoSelection.includes(index) || state.photoSelection.length === 4) return;
    state.photoSelection.push(index);
    $("photo-feedback").textContent = state.photoSelection.length === 4
      ? "Tudo pronto! Confira a sequência escolhida."
      : "Fotografia adicionada à linha do tempo. ♡";
    saveProgress();
    renderPhotos();
  }

  function undoPhoto() {
    if (state.photoCompleted || !state.photoSelection.length) return;
    state.photoSelection.pop();
    $("photo-feedback").textContent = "Última escolha desfeita. Você pode tentar outra foto.";
    saveProgress();
    renderPhotos();
  }

  function clearPhotos() {
    if (state.photoCompleted) return;
    state.photoSelection = [];
    $("photo-feedback").textContent = "Linha do tempo limpa. Comece pela foto mais antiga.";
    saveProgress();
    renderPhotos();
  }

  function checkPhotos() {
    if (state.photoSelection.length !== 4) return;
    if (state.photoSelection.every((n, i) => n === i)) {
      state.photoCompleted = true;
      saveProgress();
      renderPhotos();
      $("future-reveal").scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      $("photo-feedback").textContent = "Quase! Essas fotos ainda não estão na ordem certa. Use Desfazer última ou Limpar sequência e tente de novo. 🩵";
    }
  }

  function revealFuture() {
    if (!state.photoCompleted || state.photoFutureOpened) return;
    state.photoFutureOpened = true;
    saveProgress();
    renderPhotos();
    $("future-message").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // EPÍLOGO: a chave verdadeira está no envelope preso à cesta.
  function renderFinalVault() {
    const scene = $("final-vault-scene");
    scene.classList.toggle("locks-opening", state.finalVaultTried || state.finalUnlocked);
    scene.classList.toggle("show-fifth", state.finalVaultTried || state.finalUnlocked);
    $("try-final-vault").hidden = state.finalVaultTried || state.finalUnlocked;
    $("reveal-fifth-lock").hidden = !state.finalVaultTried || state.finalUnlocked;
    $("final-vault-status").textContent = state.finalVaultTried || state.finalUnlocked
      ? "Quatro fechaduras abertas... mas uma quinta apareceu!" : "As quatro chaves esperam por você.";
    if (state.finalUnlocked) {
      $("reveal-fifth-lock").hidden = false;
      $("reveal-fifth-lock").innerHTML = 'Rever o segredo revelado <span aria-hidden="true">♡</span>';
    } else {
      $("reveal-fifth-lock").innerHTML = 'Descobrir o que falta <span aria-hidden="true">→</span>';
    }
  }

  function tryFinalVault() {
    if (!state.photoCompleted || state.finalVaultTried) return;
    state.finalVaultTried = true;
    saveProgress();
    $("try-final-vault").hidden = true;
    $("final-vault-scene").classList.add("locks-opening");
    $("final-vault-status").textContent = "Uma... duas... três... quatro fechaduras...";
    // Temporização apenas para o efeito teatral; a ação seguinte permanece disponível.
    setTimeout(() => {
      if ($("screen-final-vault").hidden) return;
      $("final-vault-scene").classList.add("show-fifth");
      $("final-vault-status").textContent = "Espere... uma quinta fechadura apareceu!";
      $("reveal-fifth-lock").hidden = false;
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 70 : 1700);
  }

  function renderFinalSearch() {
    const tips = [
      "",
      "Você recebeu uma surpresa especial hoje. Será que ela guarda algo que não está à vista?",
      "Procure na parte de baixo da cesta: há um pequeno envelope esperando por você."
    ];
    $("final-hint").hidden = state.finalHintStep === 0;
    $("final-hint").textContent = tips[state.finalHintStep];
    $("final-hint-button").hidden = state.finalHintStep >= 2;
    $("final-hint-button").textContent = state.finalHintStep === 1 ? "Mais uma pista, por favor →" : "Preciso de uma pista ?";
  }

  function showFinalHint() {
    state.finalHintStep = Math.min(state.finalHintStep + 1, 2);
    saveProgress();
    renderFinalSearch();
  }

  function checkFinalWord(event) {
    event.preventDefault();
    if (!state.photoCompleted) return;
    const typed = $("final-word").value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    if (typed === "VOCE") {
      state.finalUnlocked = true;
      saveProgress();
      $("final-word-feedback").textContent = "A última fechadura se abriu! ♡";
      showScreen("final-reveal");
    } else {
      $("final-word-feedback").textContent = "Ainda não é essa palavra. Confira o bilhete que acompanha a chave. 🩵";
    }
  }

  function resumeExperience() {
    const target = state.lastScreen;
    if (target === "final-future" && state.finalFinished) showScreen("final-future");
    else if (target === "final-letter" && state.finalLetterOpened) showScreen("final-letter");
    else if (target === "final-reveal" && state.finalUnlocked) showScreen("final-reveal");
    else if (target === "final-password" && state.finalVaultTried && !state.finalUnlocked) showScreen("final-password");
    else if (target === "final-search" && state.finalVaultTried && !state.finalUnlocked) showScreen("final-search");
    else if (target === "final-vault" && state.photoCompleted) showScreen("final-vault");
    else if (target === "photos" && state.letterCompleted) showScreen("photos");
    else if (target === "photo-key" && state.photoCompleted) showScreen("photo-key");
    else if (target === "letter-puzzle" && state.cinemaCompleted && !state.letterCompleted) showScreen("letter-puzzle");
    else if (target === "letter-key" && state.letterCompleted) showScreen("letter-key");
    else if (target === "cinema" && state.clockCompleted && !state.cinemaCompleted) showScreen("cinema");
    else if (target === "cinema-key" && state.cinemaCompleted) showScreen("cinema-key");
    else if (target === "key" && state.clockCompleted) showScreen("key");
    else if (target === "clock" && !state.clockCompleted) showScreen("clock");
    else if (target === "letter" && !state.clockCompleted) showScreen("letter");
    else showScreen("vault");
  }

  function resetExperience() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* Reinicia ao menos em memória. */ }
    Object.assign(state, {
      started: false, lastScreen: "intro", clockCompleted: false, cinemaCompleted: false,
      cinemaAct: 0, letterCompleted: false, letterFound: [false,false,false,false],
      photoCompleted: false, photoSelection: [], photoFutureOpened: false,
      hours: 12, minutes: 0, hintStep: 0,
      finalUnlocked: false, finalLetterOpened: false, finalFinished: false,
      finalVaultTried: false, finalHintStep: 0
    });
    $("restart-dialog").hidden = true;
    $("secret-password").value = "";
    $("letter-feedback").textContent = "";
    $("photo-feedback").textContent = "";
    $("photo-hint").hidden = true;
    $("cinema-feedback").textContent = "";
    $("clock-feedback").textContent = "";
    $("letter-hint").hidden = true;
    $("final-word").value = "";
    $("final-word-feedback").textContent = "";
    $("final-vault-scene").classList.remove("locks-opening", "show-fifth");
    $("final-hint").hidden = true;
    $("letter-hint-button").disabled = false;
    $("letter-hint-button").textContent = "Preciso de uma dica ?";
    $("hint-content").hidden = true;
    $("cinema-hint").hidden = true;
    renderClock();
    renderLetterPuzzle();
    renderPhotos();
    updateSavedActions();
    showScreen("intro");
  }

  function init() {
    loadProgress();
    makeStars();
    makeClockTicks();
    buildPhotoWall();
    renderClock();
    updateSavedActions();

    $("open-invitation").addEventListener("click", () => showScreen("letter"));
    $("resume-experience").addEventListener("click", resumeExperience);
    $("restart-experience").addEventListener("click", () => {
      $("restart-dialog").hidden = false;
      $("cancel-restart").focus();
    });
    $("cancel-restart").addEventListener("click", () => {
      $("restart-dialog").hidden = true;
      $("restart-experience").focus();
    });
    $("confirm-restart").addEventListener("click", resetExperience);
    $("restart-dialog").addEventListener("click", event => {
      if (event.target === $("restart-dialog")) $("cancel-restart").click();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !$("restart-dialog").hidden) $("cancel-restart").click();
    });
    $("accept-invitation").addEventListener("click", () => showScreen("vault"));
    $("back-to-letter").addEventListener("click", () => showScreen("letter"));
    $("start-clock").addEventListener("click", () => {
      if (state.clockCompleted) { showScreen("key"); return; }
      state.hours = 12;
      state.minutes = 0;
      $("clock-feedback").textContent = "";
      $("hint-content").hidden = true;
      $("toggle-hint").setAttribute("aria-expanded", "false");
      showScreen("clock");
    });
    $("start-cinema").addEventListener("click", startCinema);
    $("start-letter-puzzle").addEventListener("click", () => {
      if (state.letterCompleted) showScreen("letter-key");
      else if (state.cinemaCompleted) showScreen("letter-puzzle");
    });
    $("review-letter-key").addEventListener("click", () => showScreen("letter-key"));
    $("start-photos").addEventListener("click", () => { if (state.letterCompleted) showScreen("photos"); });
    $("start-finale").addEventListener("click", () => {
      if (!state.photoCompleted) return;
      if (state.finalFinished) showScreen("final-future");
      else if (state.finalUnlocked) showScreen("final-reveal");
      else showScreen("final-vault");
    });
    $("try-final-vault").addEventListener("click", tryFinalVault);
    $("reveal-fifth-lock").addEventListener("click", () => {
      if (state.finalUnlocked) showScreen("final-reveal");
      else if (state.finalVaultTried) showScreen("final-search");
    });
    $("final-back-vault").addEventListener("click", () => showScreen("vault"));
    $("found-real-key").addEventListener("click", () => { if (state.finalVaultTried) showScreen("final-password"); });
    $("final-hint-button").addEventListener("click", showFinalHint);
    $("search-back").addEventListener("click", () => showScreen("final-vault"));
    $("password-back").addEventListener("click", () => showScreen("final-search"));
    $("final-word-form").addEventListener("submit", checkFinalWord);
    $("open-final-letter").addEventListener("click", () => {
      if (!state.finalUnlocked) return;
      state.finalLetterOpened = true;
      saveProgress();
      showScreen("final-letter");
    });
    $("finish-letter").addEventListener("click", () => {
      if (!state.finalLetterOpened) return;
      state.finalFinished = true;
      saveProgress();
      showScreen("final-future");
    });
    $("reread-letter").addEventListener("click", () => {if (state.finalLetterOpened) showScreen("final-letter");});
    $("review-final-vault").addEventListener("click", () => showScreen("vault"));
    $("review-photo-key").addEventListener("click", () => showScreen("photo-key"));
    $("photos-back-vault").addEventListener("click", () => showScreen("vault"));
    $("photo-undo").addEventListener("click", undoPhoto);
    $("photo-clear").addEventListener("click", clearPhotos);
    $("photo-check").addEventListener("click", checkPhotos);
    $("future-photo-button").addEventListener("click", revealFuture);
    $("photo-claim").addEventListener("click", () => { if(state.photoCompleted && state.photoFutureOpened) showScreen("photo-key"); });
    $("return-with-photo-key").addEventListener("click", () => showScreen("vault"));
    $("photo-hint-button").addEventListener("click", () => { $("photo-hint").hidden = !$("photo-hint").hidden; });
    $("return-with-letter-key").addEventListener("click", () => showScreen("vault"));
    $("letter-back-vault").addEventListener("click", () => showScreen("vault"));
    $("secret-paper").addEventListener("pointerdown", event => {
      if (event.isPrimary && event.pointerType !== "mouse") {
        $("secret-paper").setPointerCapture(event.pointerId);
      }
      aimFlashlight(event);
      collectIlluminatedLetter(event);
    });
    $("secret-paper").addEventListener("pointermove", event => {
      if (event.pointerType === "mouse" || event.buttons === 1) aimFlashlight(event);
    });
    $("secret-paper").addEventListener("pointerup", releaseFlashlight);
    $("secret-paper").addEventListener("pointercancel", releaseFlashlight);
    $("secret-paper").addEventListener("pointerleave", releaseFlashlight);
    // Acessibilidade: botão de estrela permite marcar uma letra sem exigir arrastar.
    // A frase continua invisível fora do foco da lanterna, mesmo após o clique.
    document.querySelectorAll("[data-fragment-button]").forEach(button => button.addEventListener("click", () => {
      findFragment(Number(button.dataset.fragmentButton));
    }));
    $("secret-password-form").addEventListener("submit", checkSecretPassword);
    $("letter-hint-button").addEventListener("click", showLetterHint);
    $("review-clock-key").addEventListener("click", () => showScreen("key"));
    $("review-cinema-key").addEventListener("click", () => showScreen("cinema-key"));
    $("cinema-back-vault").addEventListener("click", () => showScreen("vault"));
    $("return-with-cinema-key").addEventListener("click", () => showScreen("vault"));
    $("cinema-next-act").addEventListener("click", () => {state.cinemaAct = 2; saveProgress(); showScreen("cinema");});
    document.querySelectorAll(".movie-ticket").forEach(ticket => ticket.addEventListener("click", chooseMovie));
    $("cinema-hint-button").addEventListener("click", () => {
      const show = $("cinema-hint").hidden;
      $("cinema-hint").hidden = !show;
      $("cinema-hint-button").setAttribute("aria-expanded", String(show));
    });
    $("back-to-vault").addEventListener("click", () => showScreen("vault"));
    $("return-with-key").addEventListener("click", () => showScreen("vault"));
    $("hour-up").addEventListener("click", () => adjustTime("hours", 1));
    $("hour-down").addEventListener("click", () => adjustTime("hours", -1));
    $("minute-up").addEventListener("click", () => adjustTime("minutes", 1));
    $("minute-down").addEventListener("click", () => adjustTime("minutes", -1));
    $("check-time").addEventListener("click", checkClock);
    $("toggle-hint").addEventListener("click", () => {
      const opened = $("hint-content").hidden;
      $("hint-content").hidden = !opened;
      $("toggle-hint").setAttribute("aria-expanded", String(opened));
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
