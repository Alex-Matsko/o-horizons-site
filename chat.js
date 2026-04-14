/* ===== Open Horizons — Custom Chat Widget ===== */
(function () {
  'use strict';

  /* --- state --- */
  var sessionId = localStorage.getItem('oh_chat_sid') || ('sid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  localStorage.setItem('oh_chat_sid', sessionId);

  var messages = JSON.parse(localStorage.getItem('oh_chat_msgs') || '[]');
  var isOpen = false;
  var isTyping = false;
  var greeted = localStorage.getItem('oh_chat_greeted') === '1';

  /* --- DOM build --- */
  var bubble = el('button', 'oh-chat-bubble', '💬');
  var badge  = el('span',  'oh-chat-badge',  '1');
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
    '<div class="oh-chat-foot">',
      '<textarea class="oh-chat-input" id="oh-input" rows="1" placeholder="Напишите сообщение..."></textarea>',
      '<button class="oh-chat-send" id="oh-send" aria-label="Отправить">',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      '</button>',
    '</div>',
  ].join('');

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  var body  = document.getElementById('oh-body');
  var input = document.getElementById('oh-input');
  var send  = document.getElementById('oh-send');
  var typing = document.getElementById('oh-typing');

  /* --- restore history --- */
  messages.forEach(function (m) { appendMsg(m.role, m.text, true); });

  /* --- greeting --- */
  if (!greeted) {
    setTimeout(function () {
      if (!isOpen) showBadge();
    }, 8000);
  }

  /* --- events --- */
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

  /* --- functions --- */
  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

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
          appendMsg('bot', 'Добрый день! 👋 Я помогу вам разобраться с IT-аутсорсингом и аудитом инфраструктуры. Чем могу помочь?');
          saveMessages();
          setTimeout(function () {
            showTyping();
            setTimeout(function () {
              hideTyping();
              appendMsgWithButtons('bot', 'Выберите тему или напишите свой вопрос:', [
                'Узнать о тарифах',
                'Заказать аудит',
                'Задать вопрос',
              ]);
              saveMessages();
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

  function submitMsg() {
    var text = input.value.trim();
    if (!text || isTyping) return;
    input.value = '';
    input.style.height = 'auto';
    appendMsg('user', text);
    saveMessages();
    sendToBackend(text);
  }

  function sendToBackend(text) {
    isTyping = true;
    send.disabled = true;
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
      send.disabled = false;
      if (data.reply) {
        appendMsg('bot', data.reply);
        saveMessages();
      }
    })
    .catch(function () {
      hideTyping();
      isTyping = false;
      send.disabled = false;
      appendMsg('bot', 'Извините, что-то пошло не так. Напишите нам напрямую: info@o-horizons.com');
      saveMessages();
    });
  }

  function appendMsg(role, text, silent) {
    var wrap = document.createElement('div');
    wrap.className = 'oh-msg oh-msg-' + role;
    var bubble2 = document.createElement('div');
    bubble2.className = 'oh-msg-bubble';
    bubble2.textContent = text;
    wrap.appendChild(bubble2);
    body.appendChild(wrap);
    if (!silent) scrollBottom();
    return wrap;
  }

  function appendMsgWithButtons(role, text, buttons) {
    var wrap = appendMsg(role, text);
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

  function showTyping()  { typing.style.display = 'flex'; scrollBottom(); }
  function hideTyping()  { typing.style.display = 'none'; }
  function showBadge()   { badge.style.display = 'flex'; }
  function hideBadge()   { badge.style.display = 'none'; }
  function scrollBottom(){ setTimeout(function(){ body.scrollTop = body.scrollHeight; }, 50); }

  function saveMessages() {
    var nodes = body.querySelectorAll('.oh-msg');
    var arr = [];
    nodes.forEach(function (n) {
      arr.push({
        role: n.classList.contains('oh-msg-user') ? 'user' : 'bot',
        text: n.querySelector('.oh-msg-bubble').textContent,
      });
    });
    if (arr.length > 40) arr = arr.slice(-40);
    localStorage.setItem('oh_chat_msgs', JSON.stringify(arr));
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
})();
