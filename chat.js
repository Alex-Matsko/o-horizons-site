/* ===== Open Horizons — Custom Chat Widget ===== */
(function () {
  'use strict';

  /* ── state ── */
  var sessionId = localStorage.getItem('oh_chat_sid') ||
    ('sid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  localStorage.setItem('oh_chat_sid', sessionId);

  var history   = JSON.parse(localStorage.getItem('oh_chat_msgs') || '[]');
  var isOpen    = false;
  var isTyping  = false;
  var userName  = localStorage.getItem('oh_chat_name')  || '';
  var userPhone = localStorage.getItem('oh_chat_phone') || '';
  var identified = !!(userName && userPhone); // already gave contacts?
  var greeted   = identified && localStorage.getItem('oh_chat_greeted') === '1';

  /* ── DOM ── */
  var bubble = el('button', 'oh-chat-bubble', '\uD83D\uDCAC');
  var badge  = el('span',   'oh-chat-badge',  '1');
  bubble.appendChild(badge);

  var win = el('div', 'oh-chat-win');
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', '\u0427\u0430\u0442 \u0441 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u043e\u0439');
  win.innerHTML = [
    '<div class="oh-chat-head">',
      '<div class="oh-chat-head-info">',
        '<span class="oh-chat-avatar">\u2B21</span>',
        '<div>',
          '<strong>\u041e\u0442\u043a\u0440\u044b\u0442\u044b\u0435 \u0413\u043e\u0440\u0438\u0437\u043e\u043d\u0442\u044b</strong>',
          '<span class="oh-chat-status"><span class="oh-dot"></span>\u041e\u043d\u043b\u0430\u0439\u043d</span>',
        '</div>',
      '</div>',
      '<button class="oh-chat-close" aria-label="\u0417\u0430\u043a\u0440\u044b\u0442\u044c">\u2715</button>',
    '</div>',

    /* ── intro form (shown before chat) ── */
    '<div class="oh-intro-form" id="oh-intro-form">',
      '<p class="oh-intro-title">\u0414\u043e\u0431\u0440\u044b\u0439 \u0434\u0435\u043d\u044c! \uD83D\uDC4B</p>',
      '<p class="oh-intro-sub">\u041e\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0438\u043c\u044f \u0438 \u0442\u0435\u043b\u0435\u0444\u043e\u043d \u2014 \u0438 \u043c\u044b \u043d\u0430\u0447\u043d\u0451\u043c \u043e\u0431\u0449\u0435\u043d\u0438\u0435.</p>',
      '<input class="oh-lead-input" id="oh-intro-name"  type="text" placeholder="\u0412\u0430\u0448\u0435 \u0438\u043c\u044f *" autocomplete="name" />',
      '<input class="oh-lead-input" id="oh-intro-phone" type="tel"  placeholder="\u0422\u0435\u043b\u0435\u0444\u043e\u043d * (+7 ...)" autocomplete="tel" />',
      '<button class="oh-lead-submit" id="oh-intro-submit">\u041d\u0430\u0447\u0430\u0442\u044c \u0447\u0430\u0442 \u2192</button>',
      '<p class="oh-lead-note">\u041d\u0430\u0436\u0438\u043c\u0430\u044f \u043a\u043d\u043e\u043f\u043a\u0443, \u0432\u044b \u0441\u043e\u0433\u043b\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044c \u0441 <a href="/privacy-policy.html" target="_blank">\u043f\u043e\u043b\u0438\u0442\u0438\u043a\u043e\u0439 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438</a></p>',
    '</div>',

    /* ── chat area (hidden until identified) ── */
    '<div class="oh-chat-area" id="oh-chat-area" style="display:none">',
      '<div class="oh-chat-body" id="oh-body"></div>',
      '<div class="oh-chat-typing" id="oh-typing" style="display:none">',
        '<span></span><span></span><span></span>',
      '</div>',
      '<div class="oh-chat-foot" id="oh-foot">',
        '<textarea class="oh-chat-input" id="oh-input" rows="1" placeholder="\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435..."></textarea>',
        '<button class="oh-chat-send" id="oh-send" aria-label="\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c">',
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
            '<line x1="22" y1="2" x2="11" y2="13"/>',
            '<polygon points="22 2 15 22 11 13 2 9 22 2"/>',
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
  var send        = document.getElementById('oh-send');
  var typing      = document.getElementById('oh-typing');
  var introName   = document.getElementById('oh-intro-name');
  var introPhone  = document.getElementById('oh-intro-phone');
  var introSubmit = document.getElementById('oh-intro-submit');

  /* ── restore history if already identified ── */
  if (identified) {
    showChatArea();
    history.forEach(function (m) { renderMsg(m.role, m.text, true); });
  }

  if (!greeted && !identified) setTimeout(function () { if (!isOpen) showBadge(); }, 8000);

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
  introSubmit.addEventListener('click', submitIntroForm);
  introPhone.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitIntroForm();
  });

  /* ── phone mask ── */
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

  /* ══════════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════════ */
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
    }
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('oh-chat-open');
    bubble.classList.remove('oh-bubble-open');
  }

  /* ══════════════════════════════════════════════════════════════
     INTRO FORM SUBMIT
  ══════════════════════════════════════════════════════════════ */
  function submitIntroForm() {
    var name  = introName.value.trim();
    var phone = introPhone.value.trim();

    if (!name) {
      introName.style.borderColor = '#ef4444';
      introName.focus();
      return;
    }
    if (!phone || phone.replace(/\D/g,'').length < 7) {
      introPhone.style.borderColor = '#ef4444';
      introPhone.focus();
      return;
    }

    introName.style.borderColor = '';
    introPhone.style.borderColor = '';
    introSubmit.disabled = true;
    introSubmit.textContent = '\u041F\u043E\u0434\u0436\u0434\u0438\u0442\u0435...';

    userName  = name;
    userPhone = phone;
    localStorage.setItem('oh_chat_name',  userName);
    localStorage.setItem('oh_chat_phone', userPhone);
    identified = true;

    /* notify 1C that a new contact started a chat */
    fetch('/api/chat-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, name: userName, phone: userPhone, history: [], event: 'chat_started' }),
    }).catch(function(){}); /* fire-and-forget */

    showChatArea();
    startGreeting();
  }

  function showChatArea() {
    introForm.style.display = 'none';
    chatArea.style.display  = 'flex';
  }

  /* ══════════════════════════════════════════════════════════════
     GREETING
  ══════════════════════════════════════════════════════════════ */
  function startGreeting() {
    if (greeted) return;
    greeted = true;
    localStorage.setItem('oh_chat_greeted', '1');

    setTimeout(function () {
      showTyping();
      setTimeout(function () {
        hideTyping();
        addBotMsg('\u041f\u0440\u0438\u0432\u0435\u0442, ' + userName + '! \uD83D\uDC4B \u0427\u0435\u043c \u043c\u043e\u0433\u0443 \u043f\u043e\u043c\u043e\u0447\u044c?');
        setTimeout(function () {
          showTyping();
          setTimeout(function () {
            hideTyping();
            addBotMsgWithButtons('\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u0435\u043c\u0443 \u0438\u043b\u0438 \u043d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043e\u0439 \u0432\u043e\u043f\u0440\u043e\u0441:', [
              '\u0423\u0437\u043d\u0430\u0442\u044c \u043e \u0442\u0430\u0440\u0438\u0444\u0430\u0445',
              '\u0417\u0430\u043a\u0430\u0437\u0430\u0442\u044c \u0430\u0443\u0434\u0438\u0442',
              '\u0417\u0430\u0434\u0430\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441',
            ]);
            setTimeout(function() { input.focus(); }, 100);
          }, 700);
        }, 500);
      }, 1000);
    }, 300);
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
      body: JSON.stringify({
        sessionId: sessionId,
        text:      text,
        history:   history.slice(-60),
        name:      userName,
        phone:     userPhone,
      }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hideTyping();
      isTyping = false;
      send.disabled = false;
      if (data.reply) addBotMsg(data.reply);
      scrollBottom();
    })
    .catch(function () {
      hideTyping();
      isTyping = false;
      send.disabled = false;
      addBotMsg('\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u0447\u0442\u043e-\u0442\u043e \u043f\u043e\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a. \u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043d\u0430\u043f\u0440\u044f\u043c\u0443\u044e: info@o-horizons.com');
    });
  }

  /* ══════════════════════════════════════════════════════════════
     HISTORY HELPERS
  ══════════════════════════════════════════════════════════════ */
  function addUserMsg(text) {
    history.push({ role: 'user', text: text });
    saveHistory();
    renderMsg('user', text);
    /* sync every user message to 1C so conversation is visible live */
    syncTo1C();
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

  /* send full conversation to 1C (upsert — same extConversationId) */
  function syncTo1C() {
    if (!userName || !userPhone) return;
    fetch('/api/chat-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        name:      userName,
        phone:     userPhone,
        history:   history.slice(-60),
        event:     'message',
      }),
    }).catch(function(){});
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
