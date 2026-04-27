/**
 * Ask Devansh — RAG Chatbot Integration
 *
 * Calls the Flask API. For local dev: http://localhost:5000
 * For production: update RAG_API_URL to your deployed Render URL.
 *
 * POST /api/chat   { message: "..." }  → { response: "...", sources: [...] }
 * POST /api/suggest {}                 → { questions: [...] }
 * GET  /health                         → { status: "ok" }
 */

const RAG_API_URL = window.RAG_API_URL || 'http://localhost:5000';

(function () {
  const messagesEl   = document.getElementById('chat-messages');
  const inputEl      = document.getElementById('chat-input');
  const sendBtn      = document.getElementById('chat-send');
  const suggestionsEl= document.getElementById('chat-suggestions');

  if (!messagesEl || !inputEl || !sendBtn) return;

  // ── Wake-up ping on load — Render free tier sleeps after 15min of inactivity.
  // Fire-and-forget so the backend starts warming up while the user reads the page.
  // 60s timeout (Render cold starts can take 30-50s). Don't show "offline" unless
  // the *user's actual message* fails — health checks shouldn't gate the UI.
  fetch(`${RAG_API_URL}/health`, { signal: AbortSignal.timeout(60000) })
    .catch(() => { /* silent — let real messages handle errors */ });

  // ── Helpers ──────────────────────────────────────────────────────────────

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

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

  function setLoading(state) {
    sendBtn.disabled = state;
    inputEl.disabled = state;
  }

  // ── Send message ─────────────────────────────────────────────────────────

  async function sendMessage(text) {
    const message = (text || inputEl.value).trim();
    if (!message) return;

    // Clear input, hide suggestions
    inputEl.value = '';
    if (suggestionsEl) suggestionsEl.style.display = 'none';

    addMessage(message, 'user');
    setLoading(true);
    const typingEl = addTypingIndicator();

    // After 4s of waiting, show a "waking up" hint so cold-start delays don't feel broken.
    // Render free tier takes 30-50s to wake from sleep, so we want users to know to be patient.
    let coldStartHint = null;
    const coldStartTimer = setTimeout(() => {
      coldStartHint = document.createElement('div');
      coldStartHint.className = 'chat-msg chat-msg--bot';
      coldStartHint.style.opacity = '0.7';
      coldStartHint.style.fontSize = '0.85rem';
      coldStartHint.textContent = 'Waking up the backend — first response can take ~30s...';
      messagesEl.insertBefore(coldStartHint, typingEl);
      scrollToBottom();
    }, 4000);

    try {
      const res = await fetch(`${RAG_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        // 60s timeout to comfortably cover Render cold starts
        signal: AbortSignal.timeout(60000),
      });

      clearTimeout(coldStartTimer);
      coldStartHint?.remove();
      typingEl.remove();

      if (res.status === 429) {
        addMessage("You're sending messages a bit fast — wait a few seconds and try again.", 'bot');
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addMessage(err.error || `Error ${res.status}. Please try again.`, 'bot');
        return;
      }

      const data = await res.json();
      addMessage(data.response, 'bot');

    } catch (err) {
      clearTimeout(coldStartTimer);
      coldStartHint?.remove();
      typingEl.remove();
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        addMessage(
          "Took too long to respond — the backend may still be waking up. Try again in a moment.",
          'bot'
        );
      } else if (err.name === 'TypeError') {
        addMessage(
          "Can't reach the backend right now. Try again in a moment.",
          'bot'
        );
      } else {
        addMessage('Something went wrong. Please try again.', 'bot');
      }
    } finally {
      setLoading(false);
      inputEl.focus();
    }
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  sendBtn.addEventListener('click', () => sendMessage());

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Suggestion chips
  if (suggestionsEl) {
    suggestionsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (!chip) return;
      sendMessage(chip.dataset.q);
    });
  }

  // ── Load suggested questions from API (optional enhancement) ─────────────

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
    } catch {
      // Silently fail — static chips already rendered in HTML
    }
  }

  loadSuggestions();
})();
