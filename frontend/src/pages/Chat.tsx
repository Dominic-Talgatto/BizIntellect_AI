import { useState, useRef, useEffect, type FormEvent } from 'react'
import { api } from '../api/client'
import { Send, Loader2, User, Zap } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'How is my profit trending?',
  'How can I reduce my expenses?',
  'What are my biggest cost categories?',
  'Should I be worried about next month?',
  'Give me tax optimization tips',
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm FinSight AI, your personal financial advisor. I have access to your transaction data and can help you understand your business finances, reduce costs, and plan for the future. What would you like to know?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      console.log('[Chat] sending message:', text)
      const history = messages.slice(-10)
      const res = await api.post('/chat', {
        message: text,
        history: history.map(m => ({ role: m.role, content: m.content })),
      })
      console.log('[Chat] received response:', res.data)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err: any) {
      console.error('[Chat] error:', err)
      let errorMsg = 'Unknown error'
      
      // Try to extract error message from various sources
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      } else if (typeof err.response?.data === 'string') {
        errorMsg = err.response.data
      } else if (err.message) {
        errorMsg = err.message
      }
      
      console.log('[Chat] extracted error message:', errorMsg)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}. Please try again or check your OpenAI API key is set.`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[800px]">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold">AI Financial Advisor</h1>
        <p className="text-slate-400 text-sm mt-1">Chat with FinSight AI about your business finances</p>
      </div>

      <div className="card flex flex-col flex-1 overflow-hidden p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-violet-600/20 border border-violet-500/20'
                  : 'bg-blue-600/20 border border-blue-500/20'
              }`}>
                {msg.role === 'assistant'
                  ? <Zap size={14} className="text-violet-400" />
                  : <User size={14} className="text-blue-400" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'assistant'
                  ? 'bg-slate-800/80 text-slate-200 rounded-tl-sm'
                  : 'bg-violet-600/20 border border-violet-500/20 text-slate-200 rounded-tr-sm'
              }`}>
                {msg.content.split('\n').map((line, j) => (
                  <p key={j} className={j > 0 ? 'mt-1' : ''}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-violet-600/20 border border-violet-500/20">
                <Zap size={14} className="text-violet-400" />
              </div>
              <div className="bg-slate-800/80 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-800 p-4 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask about your finances..."
              className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
