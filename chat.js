/* ===== Open Horizons — Custom Chat Widget ===== */
(function () {
  'use strict';

  var sessionId  = localStorage.getItem('oh_chat_sid') ||
    ('sid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  localStorage.setItem('oh_chat_sid', sessionId);

  var history    = JSON.parse(localStorage.getItem('oh_chat_msgs') || '[]');
  var isOpen     = false;
  var isTyping   = false;
  var userName   = localStorage.getItem('oh_chat_name')  || '';
  var userPhone  = localStorage.getItem('oh_chat_phone') || '';
  var identified = !!(userName && userPhone);
  var greeted    = identified && localStorage.getItem('oh_chat_greeted') === '1';
  var operatorMode = localStorage.getItem('oh_chat_op') === '1';
  var pollTimer  = null;
  var lastPollTs = parseInt(localStorage.getItem('oh_chat_poll_ts') || '0', 10);

  /* —— DOM —— */
  var bubble = el('button', 'oh-chat-bubble', '💬');
  var badge  = el('span',   'oh-chat-badge',  '1');
  bubble.appendChild(badge);

  var win = el('div', 'oh-chat-win');
  win.setAttribute('role', 'dialog');
  win.innerHTML = [
    '<div class="oh-chat-head">',
      '<div class="oh-chat-head-info">',
        '<span class="oh-chat-avatar">⬡</span>',
        '<div>',
          '<strong>Открытые Горизонты</strong>',
          '<span class="oh-chat-status" id="oh-status"><span class="oh-dot"></span>Онлайн</span>',
        '</div>',
      '</div>',
      '<button class="oh-chat-close" aria-label="Закрыть">✕</button>',
    '</div>',

    /* intro form */
    '<div class="oh-intro-form" id="oh-intro-form">',
      '<p class="oh-intro-title">Добрый день! 👋</p>',
      '<p class="oh-intro-sub">Оставьте имя и телефон — и мы начнём общение.</p>',
      '<input class="oh-lead-input" id="oh-intro-name"  type="text" placeholder="Ваше имя *" autocomplete="name" />',
      '<input class="oh-lead-input" id="oh-intro-phone" type="tel"  placeholder="Телефон * (+7 ...)" autocomplete="tel" />',
      '<button class="oh-lead-submit" id="oh-intro-submit">Начать чат →</button>',
      '<p class="oh-lead-note">Нажимая кнопку, вы соглашаетесь с <a href="/privacy-policy.html" target="_blank">политикой конфиденциальности</a></p>',
    '</div>',

    /* chat area */
    '<div class="oh-chat-area" id="oh-chat-area" style="display:none">',
      '<div class="oh-chat-body" id="oh-body"></div>',
      '<div class="oh-chat-typing" id="oh-typing" style="display:none"><span></span><span></span><span></span></div>',
      '<div class="oh-chat-foot" id="oh-foot">',
        '<textarea class="oh-chat-input" id="oh-input" rows="1" placeholder="Напишите сообщение..."></textarea>',
        '<button class="oh-chat-send" id="oh-send" aria-label="Отправить">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
            '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
          '</svg>',
        '</button>',
      '</div>',
    '</div>',
  ].join('');

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  var introForm   = document.getElementById('oh-intro-form');
  var chatArea    = document.getElementById('oh-chat-area');
  var body        = document.getElementById('oh-body');
  var input       = document.getElementById('oh-input');
  var sendBtn     = document.getElementById('oh-send');
  var typing      = document.getElementById('oh-typing');
  var statusEl    = document.getElementById('oh-status');
  var introName   = document.getElementById('oh-intro-name');
  var introPhone  = document.getElementById('oh-intro-phone');
  var introSubmit = document.getElementById('oh-intro-submit');

  if (identified) {
    showChatArea();
    history.forEach(function (m) { renderMsg(m.role, m.text, true); });
    if (operatorMode) setOperatorMode();
  }

  if (!greeted && !identified) setTimeout(function () { if (!isOpen) showBadge(); }, 8000);

  /* —— events —— */
  bubble.addEventListener('click', toggleChat);
  win.querySelector('.oh-chat-close').addEventListener('click', closeChat);
  sendBtn.addEventListener('click', submitMsg);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMsg(); }
  });
  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) closeChat(); });
  introSubmit.addEventListener('click', submitIntroForm);
  introPhone.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitIntroForm(); });

  /* phone mask */
  introPhone.addEventListener('input', function () {
    var digits = this.value.replace(/\D/g, '');
    if (digits.length && digits[0] !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);
    var d = digits.slice(1), out = '+7';
    if (d.length > 0) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    this.value = out;
  });
  introPhone.addEventListener('focus', function () { if (!this.value) this.value = '+7'; });
  introPhone.addEventListener('blur',  function () { if (this.value === '+7') this.value = ''; });

  /* ══ OPEN / CLOSE ══ */
  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function openChat() {
    isOpen = true;
    win.classList.add('oh-chat-open');
    bubble.classList.add('oh-bubble-open');
    hideBadge();
    if (!identified) {
      introName.focus();
    } else {
      scrollBottom();
      input.focus();
      if (!greeted) startGreeting();
      startPolling();
    }
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('oh-chat-open');
    bubble.classList.remove('oh-bubble-open');
    stopPolling();
  }

  /* ══ INTRO FORM ══ */
  function submitIntroForm() {
    var name  = introName.value.trim();
    var phone = introPhone.value.trim();
    if (!name) { introName.style.borderColor = '#ef4444'; introName.focus(); return; }
    if (!phone || phone.replace(/\D/g,'').length < 7) { introPhone.style.borderColor = '#ef4444'; introPhone.focus(); return; }
    introName.style.borderColor = '';
    introPhone.style.borderColor = '';
    introSubmit.disabled = true;
    introSubmit.textContent = 'Подождите...';

    userName  = name;
    userPhone = phone;
    localStorage.setItem('oh_chat_name',  userName);
    localStorage.setItem('oh_chat_phone', userPhone);
    identified = true;

    fetch('/api/chat-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, name: userName, phone: userPhone, history: [], event: 'chat_started' }),
    }).catch(function(){});

    showChatArea();
    startGreeting();
    startPolling();
  }

  function showChatArea() {
    introForm.style.display = 'none';
    chatArea.style.display  = 'flex';
  }

  /* ══ GREETING ══ */
  function startGreeting() {
    if (greeted) return;
    greeted = true;
    localStorage.setItem('oh_chat_greeted', '1');
    setTimeout(function () {
      showTyping();
      setTimeout(function () {
        hideTyping();
        addBotMsg('Привет, ' + userName + '! 👋 Чем могу помочь?');
        setTimeout(function () {
          showTyping();
          setTimeout(function () {
            hideTyping();
            addBotMsgWithButtons('Выберите тему или напишите свой вопрос:', [
              'Узнать о тарифах',
              'Заказать аудит',
              'Связаться с оператором',
            ]);
            setTimeout(function() { input.focus(); }, 100);
          }, 700);
        }, 500);
      }, 900);
    }, 300);
  }

  /* ══ SEND MESSAGE ══ */
  function submitMsg() {
    var text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    input.style.height = 'auto';
    addUserMsg(text);

    /* Кнопка «Связаться с оператором» — обрабатываем локально */
    if (text.toLowerCase() === 'связаться с оператором') {
      escalateToOperator();
      return;
    }

    if (operatorMode) {
      /* В режиме оператора — просто синхронизируем в 1С, бот не отвечает */
      syncTo1C();
      return;
    }

    sendToBackend(text);
  }

  function escalateToOperator() {
    setOperatorMode();
    showTyping();
    setTimeout(function () {
      hideTyping();
      addBotMsg('🔔 Соединяю с инженером! Обычно отвечаем в течение нескольких минут. Пишите — оператор всё видит.');
      syncTo1C('operator_requested');
    }, 600);
  }

  function setOperatorMode() {
    operatorMode = true;
    localStorage.setItem('oh_chat_op', '1');
    if (statusEl) {
      statusEl.innerHTML = '<span class="oh-dot oh-dot-orange"></span>Ожидание оператора';
    }
  }

  function setOperatorConnected() {
    if (statusEl) {
      statusEl.innerHTML = '<span class="oh-dot"></span>Оператор в чате';
    }
  }

  function sendToBackend(text) {
    isTyping = true;
    sendBtn.disabled = true;
    showTyping();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, text: text }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hideTyping();
      isTyping = false;
      sendBtn.disabled = false;
      if (data.operatorMode && !operatorMode) setOperatorMode();
      if (data.reply) {
        addBotMsg(data.reply);
        /* Бот тоже пишем в 1С */
        syncBotReply(data.reply);
      }
      syncTo1C();
    })
    .catch(function () {
      hideTyping();
      isTyping = false;
      sendBtn.disabled = false;
      addBotMsg('Извините, что-то пошло не так. Напишите напрямую: info@o-horizons.com');
    });
  }

  /* ══ POLLING — получаем сообщения оператора ══ */
  function startPolling() {
    if (pollTimer) return;
    doPoll();
    pollTimer = setInterval(doPoll, 4000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function doPoll() {
    if (!identified) return;
    fetch('/api/chat-poll?sessionId=' + encodeURIComponent(sessionId) + '&after=' + lastPollTs)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.operatorMode && !operatorMode) setOperatorMode();
        if (Array.isArray(data.messages) && data.messages.length) {
          data.messages.forEach(function (m) {
            renderMsg('operator', m.text);
            history.push({ role: 'operator', text: m.text });
            if (m.ts > lastPollTs) lastPollTs = m.ts;
          });
          saveHistory();
          localStorage.setItem('oh_chat_poll_ts', String(lastPollTs));
          setOperatorConnected();
          if (!isOpen) showBadge();
        }
      })
      .catch(function(){});
  }

  /* ══ HISTORY HELPERS ══ */
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
    renderMsg('bot', text);
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
  }

  function saveHistory() {
    if (history.length > 60) history = history.slice(-60);
    try { localStorage.setItem('oh_chat_msgs', JSON.stringify(history)); } catch (e) {}
  }

  function syncTo1C(event) {
    if (!userName || !userPhone) return;
    fetch('/api/chat-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        name:      userName,
        phone:     userPhone,
        history:   history.slice(-60),
        event:     event || 'message',
      }),
    }).catch(function(){});
  }

  function syncBotReply(text) {
    /* добавляем ответ бота в историю для 1С и синхронизируем */
    fetch('/api/chat-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        name:      userName,
        phone:     userPhone,
        history:   [{ role: 'bot', text: text }],
        event:     'message',
      }),
    }).catch(function(){});
  }

  /* ══ DOM HELPERS ══ */
  function renderMsg(role, text, silent) {
    var wrap = document.createElement('div');
    var cssRole = (role === 'operator') ? 'operator' : role;
    wrap.className = 'oh-msg oh-msg-' + cssRole;
    var bub = document.createElement('div');
    bub.className = 'oh-msg-bubble';
    bub.textContent = text;
    if (role === 'operator') {
      var lbl = document.createElement('div');
      lbl.className = 'oh-msg-label';
      lbl.textContent = 'Инженер';
      wrap.appendChild(lbl);
    }
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
  function el(tag, cls, txt) { var e = document.createElement(tag); e.className = cls; if (txt) e.textContent = txt; return e; }
})();
