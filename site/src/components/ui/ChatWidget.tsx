'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface ChatMsg { role: 'user' | 'bot' | 'operator'; text: string; ts: number }

function genId() {
  return 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [identified, setIdentified] = useState(false)
  const [operatorMode, setOperatorMode] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [badge, setBadge] = useState(true)
  const [introName, setIntroName] = useState('')
  const [introPhone, setIntroPhone] = useState('')
  const sessionRef = useRef<string>('')
  const pollRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastPollTsRef = useRef(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sid = localStorage.getItem('oh_chat_sid') || genId()
    localStorage.setItem('oh_chat_sid', sid)
    sessionRef.current = sid
    const saved = JSON.parse(localStorage.getItem('oh_chat_msgs') || '[]') as ChatMsg[]
    setMessages(saved)
    const name = localStorage.getItem('oh_chat_name') || ''
    const phone = localStorage.getItem('oh_chat_phone') || ''
    if (name && phone) setIdentified(true)
    if (localStorage.getItem('oh_chat_op') === '1') setOperatorMode(true)
    lastPollTsRef.current = parseInt(localStorage.getItem('oh_chat_poll_ts') || '0', 10)
  }, [])

  useEffect(() => {
    if (isOpen) { setBadge(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [isOpen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const saveMessages = (msgs: ChatMsg[]) => {
    setMessages(msgs)
    localStorage.setItem('oh_chat_msgs', JSON.stringify(msgs.slice(-60)))
  }

  const addMsg = useCallback((role: ChatMsg['role'], text: string) => {
    setMessages(prev => {
      const next = [...prev, { role, text, ts: Date.now() }]
      localStorage.setItem('oh_chat_msgs', JSON.stringify(next.slice(-60)))
      return next
    })
  }, [])

  const startPoll = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/chat-poll?sessionId=${sessionRef.current}&after=${lastPollTsRef.current}`)
        const d = await r.json()
        if (d.operatorMode) { setOperatorMode(true); localStorage.setItem('oh_chat_op', '1') }
        if (d.messages?.length) {
          d.messages.forEach((m: { text: string; ts: number }) => {
            addMsg('operator', m.text)
            lastPollTsRef.current = Math.max(lastPollTsRef.current, m.ts)
          })
          localStorage.setItem('oh_chat_poll_ts', String(lastPollTsRef.current))
          if (!isOpen) setBadge(true)
        }
      } catch { /* ignore */ }
    }, 3000)
  }, [addMsg, isOpen])

  useEffect(() => {
    if (identified) startPoll()
    return () => { clearInterval(pollRef.current); pollRef.current = undefined }
  }, [identified, startPoll])

  async function handleIntroSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!introName.trim() || !introPhone.trim()) return
    localStorage.setItem('oh_chat_name', introName)
    localStorage.setItem('oh_chat_phone', introPhone)
    setIdentified(true)
    try {
      await fetch('/api/chat-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionRef.current, name: introName, phone: introPhone, history: [], event: 'chat_started' }),
      })
    } catch { /* ignore */ }
    const greeting = 'Добрый день, ' + introName.split(' ')[0] + '! Чем могу помочь? Расскажу о тарифах, аудите — или сразу соединю с инженером.'
    addMsg('bot', greeting)
    startPoll()
  }

  async function sendMessage() {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    addMsg('user', text)
    if (operatorMode) {
      try {
        const name = localStorage.getItem('oh_chat_name') || ''
        const phone = localStorage.getItem('oh_chat_phone') || ''
        await fetch('/api/chat-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionRef.current, name, phone, history: [{ role: 'user', text }], event: 'message' }),
        })
      } catch { /* ignore */ }
      return
    }
    setIsTyping(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionRef.current, text }),
      })
      const d = await r.json()
      if (d.operatorMode) { setOperatorMode(true); localStorage.setItem('oh_chat_op', '1') }
      if (d.reply) addMsg('bot', d.reply)
      const name = localStorage.getItem('oh_chat_name') || ''
      const phone = localStorage.getItem('oh_chat_phone') || ''
      await fetch('/api/chat-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionRef.current, name, phone, history: [{ role: 'user', text }, ...(d.reply ? [{ role: 'bot', text: d.reply }] : [])], event: 'message' }),
      }).catch(() => {/* ignore */})
    } catch {
      addMsg('bot', 'Ошибка соединения. Напишите нам напрямую: info@o-horizons.com')
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {/* Bubble */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 8px 24px rgba(37,99,235,0.45)' }}
        aria-label="Открыть чат"
      >
        💬
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">1</span>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 bg-[#151820] border border-white/[0.07] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '520px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <span className="text-[#3b82f6] text-lg">⬡</span>
              <div>
                <p className="text-sm font-semibold text-[#e2e8f0]">Открытые Горизонты</p>
                <p className="text-xs text-[#64748b] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Онлайн
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[#64748b] hover:text-[#e2e8f0] transition-colors">✕</button>
          </div>

          {/* Intro form */}
          {!identified ? (
            <form onSubmit={handleIntroSubmit} className="flex flex-col gap-3 p-4 flex-1">
              <p className="text-sm font-semibold text-[#e2e8f0]">Добрый день! 👋</p>
              <p className="text-xs text-[#64748b]">Оставьте имя и телефон — начнём общение.</p>
              <input
                value={introName} onChange={e => setIntroName(e.target.value)}
                type="text" placeholder="Ваше имя *" required autoComplete="name"
                className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#3b82f6]"
              />
              <input
                value={introPhone} onChange={e => setIntroPhone(e.target.value)}
                type="tel" placeholder="Телефон * (+7 ...)" required autoComplete="tel"
                className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#3b82f6]"
              />
              <button type="submit" className="py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg transition-colors">
                Начать чат →
              </button>
              <p className="text-[10px] text-[#475569]">Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности</p>
            </form>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {messages.length === 0 && (
                  <p className="text-xs text-[#475569] text-center">Напишите сообщение или выберите тему:</p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-sm text-white bg-gradient-to-br from-[#3b82f6] to-[#2563eb]'
                        : m.role === 'operator'
                        ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#e2e8f0]'
                        : 'bg-[#0d0f14] border border-white/[0.07] text-[#94a3b8]'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#0d0f14] border border-white/[0.07] rounded-xl px-3 py-2 text-[#64748b] text-xs">
                      печатает...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Input */}
              <div className="border-t border-white/[0.07] p-3 flex gap-2">
                <input
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Напишите сообщение..."
                  className="flex-1 bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#3b82f6]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className="px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white rounded-lg transition-colors text-sm"
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
