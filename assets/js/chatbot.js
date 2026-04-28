/**
 * Ask Devansh — RAG Chatbot Integration
 */

const RAG_API_URL = window.RAG_API_URL || 'http://localhost:5000';

(function () {
  const messagesEl    = document.getElementById('chat-messages');
  const inputEl       = document.getElementById('chat-input');
  const sendBtn       = document.getElementById('chat-send');
  const suggestionsEl = document.getElementById('chat-suggestions');

  if (!messagesEl || !inputEl || !sendBtn) return;

  (async function checkHealth() {
    try {
      const res = await fetch(`${RAG_API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('unhealthy');
    } catch {
      const headerSub = document.querySelector('.chatbot-panel__header p');
      if (headerSub) { headerSub.textContent = 'Backend deploying — live responses coming soon'; headerSub.style.color = 'var(--accent-orange)'; }
      const firstMsg = messagesEl.querySelector('.chat-msg--bot');
      if (firstMsg) firstMsg.textContent = "I'm currently offline while the backend finishes deploying to Render. In the meantime, feel free to explore my projects and experience below!";
    }
  })();

  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg--typing';
    div.innerHTML = '<span class="chat-typing-dots"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function setLoading(state) { sendBtn.disabled = state; inputEl.disabled = state; }

  async function sendMessage(text) {
    const message = (text || inputEl.value).trim();
    if (!message) return;
    inputEl.value = '';
    if (suggestionsEl) suggestionsEl.style.display = 'none';
    addMessage(message, 'user');
    setLoading(true);
    const typingEl = addTypingIndicator();
    try {
      const res = await fetch(`${RAG_API_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      typingEl.remove();
      if (res.status === 429) { addMessage("You're sending messages a bit fast — wait a few seconds and try again.", 'bot'); return; }
      if (!res.ok) { const err = await res.json().catch(() => ({})); addMessage(err.error || `Error ${res.status}. Please try again.`, 'bot'); return; }
      const data = await res.json();
      addMessage(data.response, 'bot');
    } catch (err) {
      typingEl.remove();
      if (err.name === 'TypeError' || err.name === 'AbortError') addMessage("I'm offline right now — the backend is still deploying. Check back soon!", 'bot');
      else addMessage('Something went wrong. Please try again.', 'bot');
    } finally { setLoading(false); inputEl.focus(); }
  }

  sendBtn.addEventListener('click', () => sendMessage());
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  if (suggestionsEl) {
    suggestionsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (!chip) return;
      sendMessage(chip.dataset.q);
    });
  }

  async function loadSuggestions() {
    try {
      const res = await fetch(`${RAG_API_URL}/api/suggest`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (!suggestionsEl || !Array.isArray(data.questions)) return;
      suggestionsEl.innerHTML = '';
      data.questions.slice(0, 5).forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-chip';
        btn.textContent = q;
        btn.dataset.q = q;
        suggestionsEl.appendChild(btn);
      });
    } catch { /* silently fail */ }
  }

  loadSuggestions();
})();
