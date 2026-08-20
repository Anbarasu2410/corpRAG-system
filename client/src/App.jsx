import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  RefreshCw,
  X,
  User,
  Lock,
  Mail,
  Table
} from 'lucide-react';
import { marked } from 'marked';

// Dynamically determine Backend URL (uses deployed URL or fallback)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('corpRAG_JWT'));
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('corpRAG_User') || 'null'));
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Flowise Chatbot Cloud URL state
  const [flowiseChatbotUrl, setFlowiseChatbotUrl] = useState('http://localhost:3000/chatbot/79d8f8ed-b5ef-4dd9-b988-6f1309e9e042');

  // Workspace Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'embed'
  const [selectedSources, setSelectedSources] = useState(null);

  // Fetch backend config on load
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/config`)
      .then(res => res.json())
      .then(data => {
        if (data.flowiseChatbotUrl) {
          setFlowiseChatbotUrl(data.flowiseChatbotUrl);
        }
      })
      .catch(err => console.error("Config fetch error:", err));
  }, []);

  // Handle Auth Form Submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await res.json();
      setAuthLoading(false);

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      // Save Auth Token & User
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('corpRAG_JWT', data.token);
      localStorage.setItem('corpRAG_User', JSON.stringify(data.user));

    } catch (err) {
      setAuthLoading(false);
      setAuthError('Cannot connect to Backend Server. Please check configuration.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('corpRAG_JWT');
    localStorage.removeItem('corpRAG_User');
    setToken(null);
    setCurrentUser(null);
  };

  // Handle Chat Query
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: userQuery })
      });

      const data = await res.json();
      setChatLoading(false);

      if (!res.ok) {
        setMessages(prev => [...prev, { sender: 'bot', text: `⚠️ Error: ${data.error}` }]);
      } else {
        setMessages(prev => [
          ...prev, 
          { sender: 'bot', text: data.text, sources: data.sourceDocuments }
        ]);
      }
    } catch (err) {
      setChatLoading(false);
      setMessages(prev => [...prev, { sender: 'bot', text: `⚠️ Server connection error: ${err.message}` }]);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER AUTH MODAL IF NOT LOGGED IN
  // --------------------------------------------------------------------------
  if (!token || !currentUser) {
    return (
      <div className="flex h-screen w-screen bg-slate-950 text-slate-100 items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-lg">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-500/30">
              <Bot className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">corpRAG Intelligence</h1>
            <p className="text-xs text-slate-400 mt-1">Enterprise RAG Knowledge System</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === 'signup' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="user@company.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {authLoading ? 'Connecting...' : authMode === 'signup' ? 'Create Account' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN WORKSPACE INTERFACE
  // --------------------------------------------------------------------------
  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100">corpRAG</h1>
            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded-full">
              Enterprise RAG
            </span>
          </div>
        </div>

        {/* User Badge */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
              {(currentUser.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 p-1.5" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="space-y-1.5 mb-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" /> Custom RAG Workspace
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
              activeTab === 'embed' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" /> Flowise Widget View
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-slate-950">
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">corpRAG Document Intelligence</h2>
          </div>
        </header>

        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800 flex items-center justify-center text-indigo-400 mb-4">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mb-1">Welcome to corpRAG Workspace</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Query your loaded document vector store. Every answer is grounded in RAG context.
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`flex gap-4 max-w-3xl ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400 border border-slate-700'
                    }`}>
                      {m.sender === 'user' ? 'You' : <Bot className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div 
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          m.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                        dangerouslySetInnerHTML={{ __html: marked.parse(m.text || '') }}
                      />
                      {m.sources && m.sources.length > 0 && (
                        <button
                          onClick={() => setSelectedSources(m.sources)}
                          className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] bg-indigo-950 border border-indigo-800 text-indigo-300 hover:bg-indigo-900"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> View {m.sources.length} RAG Source Context(s)
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {chatLoading && (
                <div className="flex gap-4 max-w-xl">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Querying Flowise RAG engine...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/30">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center bg-slate-900 border border-slate-800 rounded-xl p-2 focus-within:border-indigo-600 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your documents..."
                  className="flex-1 bg-transparent px-4 text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
                <button type="submit" disabled={chatLoading} className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full">
            <iframe 
              src={flowiseChatbotUrl}
              className="w-full h-full border-none"
              title="Flowise Chatbot Widget"
            />
          </div>
        )}
      </main>

      {/* Sources Modal */}
      {selectedSources && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" /> RAG Context Document Excerpts
              </h3>
              <button onClick={() => setSelectedSources(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              {selectedSources.map((doc, i) => (
                <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="font-semibold text-indigo-400 mb-1">Source Chunk #{i + 1}</div>
                  <p className="text-slate-300 leading-relaxed font-sans">{doc.pageContent || JSON.stringify(doc)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
