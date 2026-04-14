/* ===== Open Horizons — Custom Chat Widget ===== */
(function () {
  'use strict';

  /* ── state ── */
  var sessionId = localStorage.getItem('oh_chat_sid') ||
    ('sid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  localStorage.setItem('oh_chat_sid', sessionId);

  var history  = JSON.parse(localStorage.getItem('oh_chat_msgs') || '[]');
  var isOpen   = false;
  var isTyping = false;
  var greeted  = localStorage.getItem('oh_chat_greeted') === '1';
  var formShown = false; // guard: show form only once per session

  /* ── DOM ── */
  var bubble = el('button', 'oh-chat-bubble', '💬');
  var badge  = el('span',   'oh-chat-badge',  '1');
  bubble.appendChild(badge);

  var win = el('div', 'oh-chat-win');
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Чат с поддержкой');
  win.innerHTML = [
    '<div class="oh-chat-head">',
      '<div class="oh-chat-head-info">',
        '<span class="oh-chat-avatar">⬡</span>',
        '<div>',
          '<strong>Открытые Горизонты</strong>',
          '<span class="oh-chat-status"><span class="oh-dot"></span>Онлайн</span>',
        '</div>',
      '</div>',
      '<button class="oh-chat-close" aria-label="Закрыть">✕</button>',
    '</div>',
    '<div class="oh-chat-body" id="oh-body"></div>',
    '<div class="oh-chat-typing" id="oh-typing" style="display:none">',
      '<span></span><span></span><span></span>',
    '</div>',
    /* ── inline lead form (hidden by default) ── */
    '<div class="oh-lead-form" id="oh-lead-form" style="display:none">',
      '<p class="oh-lead-title">Оставьте контакт — инженер свяжется с вами</p>',
      '<input class="oh-lead-input" id="oh-lead-name"  type="text"  placeholder="Ваше имя *" />',
      '<input class="oh-lead-input" id="oh-lead-phone" type="tel"   placeholder="Телефон * (+7 ...)" />',
      '<button class="oh-lead-submit" id="oh-lead-submit">Отправить заявку</button>',
      '<p class="oh-lead-note">Нажимая кнопку, вы соглашаетесь с <a href="/privacy-policy.html" target="_blank">политикой конфиденциальности</a></p>',
    '</div>',
    '<div class="oh-chat-foot" id="oh-foot">',
      '<textarea class="oh-chat-input" id="oh-input" rows="1" placeholder="Напишите сообщение..."></textarea>',
      '<button class="oh-chat-send" id="oh-send" aria-label="Отправить">',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
          '<line x1="22" y1="2" x2="11" y2="13"/>',
          '<polygon points="22 2 15 22 11 13 2 9 22 2"/>',
        '</svg>',
      '</button>',
    '</div>',
  ].join('');

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  var body        = document.getElementById('oh-body');
  var input       = document.getElementById('oh-input');
  var send        = document.getElementById('oh-send');
  var typing      = document.getElementById('oh-typing');
  var leadForm    = document.getElementById('oh-lead-form');
  var foot        = document.getElementById('oh-foot');
  var leadName    = document.getElementById('oh-lead-name');
  var leadPhone   = document.getElementById('oh-lead-phone');
  var leadSubmit  = document.getElementById('oh-lead-submit');

  /* ── restore history ── */
  history.forEach(function (m) { renderMsg(m.role, m.text, true); });
  if (!greeted) setTimeout(function () { if (!isOpen) showBadge(); }, 8000);

  /* ── events ── */
  bubble.addEventListener('click', toggleChat);
  win.querySelector('.oh-chat-close').addEventListener('click', closeChat);
  send.addEventListener('click', submitMsg);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMsg(); }
  });
  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeChat();
  });
  leadSubmit.addEventListener('click', submitLeadForm);

  /* ── phone mask ── */
  leadPhone.addEventListener('input', function () {
    var digits = this.value.replace(/\D/g, '');
    if (digits.length && digits[0] !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);
    var d = digits.slice(1);
    var out = '+7';
    if (d.length > 0) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    this.value = out;
  });
  leadPhone.addEventListener('focus', function () { if (!this.value) this.value = '+7'; });
  leadPhone.addEventListener('blur',  function () { if (this.value === '+7') this.value = ''; });

  /* ══════════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════════ */
  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function openChat() {
    isOpen = true;
    win.classList.add('oh-chat-open');
    bubble.classList.add('oh-bubble-open');
    hideBadge();
    scrollBottom();
    input.focus();

    if (!greeted) {
      greeted = true;
      localStorage.setItem('oh_chat_greeted', '1');
      setTimeout(function () {
        showTyping();
        setTimeout(function () {
          hideTyping();
          addBotMsg('Добрый день! 👋 Я помогу разобраться с IT-аутсорсингом и аудитом. Чем могу помочь?');
          setTimeout(function () {
            showTyping();
            setTimeout(function () {
              hideTyping();
              addBotMsgWithButtons('Выберите тему или напишите свой вопрос:', [
                'Узнать о тарифах',
                'Заказать аудит',
                'Задать вопрос',
              ]);
            }, 800);
          }, 600);
        }, 1200);
      }, 400);
    }
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('oh-chat-open');
    bubble.classList.remove('oh-bubble-open');
  }

  /* ══════════════════════════════════════════════════════════════
     SEND MESSAGE
  ══════════════════════════════════════════════════════════════ */
  function submitMsg() {
    var text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    input.style.height = 'auto';
    addUserMsg(text);
    sendToBackend(text);
  }

  function sendToBackend(text) {
    isTyping = true;
    send.disabled = true;
    showTyping();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, text: text, history: history.slice(-60) }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hideTyping();
      isTyping = false;
      send.disabled = false;
      if (data.reply) addBotMsg(data.reply);
      // Server signals that it's time to show the lead form
      if (data.showForm) showLeadForm();
    })
    .catch(function () {
      hideTyping();
      isTyping = false;
      send.disabled = false;
      addBotMsg('Извините, что-то пошло не так. Напишите напрямую: info@o-horizons.com');
    });
  }

  /* ══════════════════════════════════════════════════════════════
     LEAD FORM
  ══════════════════════════════════════════════════════════════ */
  function showLeadForm() {
    if (formShown) return;
    formShown = true;
    // Hide text input, show the form
    foot.style.display = 'none';
    leadForm.style.display = 'flex';
    leadName.focus();
    scrollBottom();
  }

  function hideLeadForm() {
    leadForm.style.display = 'none';
    foot.style.display = 'flex';
  }

  function submitLeadForm() {
    var name  = leadName.value.trim();
    var phone = leadPhone.value.trim();

    if (!name) { leadName.focus(); leadName.style.borderColor = '#ef4444'; return; }
    if (!phone || phone.length < 6) { leadPhone.focus(); leadPhone.style.borderColor = '#ef4444'; return; }

    leadSubmit.disabled = true;
    leadSubmit.textContent = 'Отправляем...';

    // Add to history so it goes to 1C
    addUserMsg('📋 Имя: ' + name + ' | Телефон: ' + phone);

    fetch('/api/chat-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        name:      name,
        phone:     phone,
        history:   history.slice(-60),
      }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hideLeadForm();
      addBotMsg('✅ Заявка принята! Наш инженер позвонит вам в ближайшее время. Если срочно — info@o-horizons.com или @ohorizons в Telegram.');
      formShown = true; // don't show again
    })
    .catch(function () {
      leadSubmit.disabled = false;
      leadSubmit.textContent = 'Отправить заявку';
      addBotMsg('Не удалось отправить. Напишите напрямую: info@o-horizons.com');
      hideLeadForm();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     HISTORY HELPERS
  ══════════════════════════════════════════════════════════════ */
  function addUserMsg(text) {
    history.push({ role: 'user', text: text });
    saveHistory();
    renderMsg('user', text);
  }

  function addBotMsg(text) {
    history.push({ role: 'bot', text: text });
    saveHistory();
    renderMsg('bot', text);
  }

  function addBotMsgWithButtons(text, buttons) {
    history.push({ role: 'bot', text: text });
    saveHistory();
    var wrap = renderMsg('bot', text);
    var row = document.createElement('div');
    row.className = 'oh-msg-btns';
    buttons.forEach(function (label) {
      var btn = document.createElement('button');
      btn.className = 'oh-quick-btn';
      btn.textContent = label;
      btn.addEventListener('click', function () {
        row.remove();
        input.value = label;
        submitMsg();
      });
      row.appendChild(btn);
    });
    body.appendChild(row);
    scrollBottom();
    return wrap;
  }

  function saveHistory() {
    if (history.length > 60) history = history.slice(-60);
    try { localStorage.setItem('oh_chat_msgs', JSON.stringify(history)); } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════
     DOM HELPERS
  ══════════════════════════════════════════════════════════════ */
  function renderMsg(role, text, silent) {
    var wrap = document.createElement('div');
    wrap.className = 'oh-msg oh-msg-' + role;
    var bub = document.createElement('div');
    bub.className = 'oh-msg-bubble';
    bub.textContent = text;
    wrap.appendChild(bub);
    body.appendChild(wrap);
    if (!silent) scrollBottom();
    return wrap;
  }

  function showTyping()  { typing.style.display = 'flex'; scrollBottom(); }
  function hideTyping()  { typing.style.display = 'none'; }
  function showBadge()   { badge.style.display = 'flex'; }
  function hideBadge()   { badge.style.display = 'none'; }
  function scrollBottom(){ setTimeout(function () { body.scrollTop = body.scrollHeight; }, 50); }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    e.className = cls;
    if (txt) e.textContent = txt;
    return e;
  }
})();
