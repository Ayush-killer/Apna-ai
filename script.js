let allSessions = JSON.parse(localStorage.getItem('ai_sessions') || '[]');
let currentSession = { id: Date.now(), messages: [] };
let userName = localStorage.getItem('ai_user_name');

const chatView = document.getElementById('chat-view');
const msgInput = document.getElementById('msg-in');
const imgToggle = document.getElementById('img-toggle');
const userDisplay = document.getElementById('user-display');

// --- TERA LLAMA 3.2 CONFIG ---
const CHAT_API_KEY = "YOUR_LLAMA_API_KEY_HERE"; // <--- Bhai yahan apni Llama API key daal
const CHAT_API_URL = "https://api.groq.com/openai/v1/chat/completions"; // Groq ka URL (sabse fast hai)
const LLAMA_MODEL = "llama-3.2-90b-vision-preview"; // Ya fir "llama-3.2-3b-preview" chota wala

window.onload = () => {
    renderHistory();
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => { 
            document.getElementById('loader').style.display = 'none'; 
            checkUser();
        }, 600);
    }, 5000);
};

function checkUser() {
    if(!userName) {
        document.getElementById('name-modal-overlay').style.display = 'flex';
        setTimeout(() => document.getElementById('name-modal').classList.add('show'), 100);
    } else { showApp(); }
}

function saveUserName() {
    const input = document.getElementById('user-name-input');
    if(input.value.trim() !== "") {
        userName = input.value.trim();
        localStorage.setItem('ai_user_name', userName);
        document.getElementById('name-modal').classList.remove('show');
        setTimeout(() => {
            document.getElementById('name-modal-overlay').style.display = 'none';
            showApp();
        }, 400);
    }
}

function showApp() {
    document.getElementById('app').classList.add('visible');
    userDisplay.innerText = `Hi, ${userName}`;
    startNewChat();
}

function startNewChat() {
    if (currentSession.messages.length > 0) {
        const idx = allSessions.findIndex(s => s.id === currentSession.id);
        if(idx === -1) allSessions.push(currentSession);
        else allSessions[idx] = currentSession;
    }
    localStorage.setItem('ai_sessions', JSON.stringify(allSessions));
    currentSession = { id: Date.now(), messages: [] };
    chatView.innerHTML = `<div class="ai-msg"><div class="bubble">Welcome <b>${userName}</b>, I am your personal AI Chat Bot powered by Llama 3.2. Bol bhai!</div></div>`;
    renderHistory();
    if(document.getElementById('sidebar').classList.contains('active')) toggleSidebar();
}

async function sendMsg() {
    const val = msgInput.value.trim();
    if(!val) return;

    addBubble('user', val);
    msgInput.value = '';
    msgInput.style.height = 'auto';

    const genBubble = addGeneratingBubble();

    if (imgToggle.checked) {
        // --- IMAGE GENERATION (Pollinations Free) ---
        try {
            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(val)}?width=1024&height=1024&seed=${seed}&model=flux`;
            
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                genBubble.remove();
                addBubble('ai', '', imageUrl);
            };
        } catch (e) {
            genBubble.remove();
            addBubble('ai', "Bhai photo nahi ban payi!");
        }
    } else {
        // --- LLAMA 3.2 CHAT API CALL ---
        try {
            const response = await fetch(CHAT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CHAT_API_KEY}`
                },
                body: JSON.stringify({
                    model: LLAMA_MODEL,
                    messages: [
                        { role: "system", content: `You are a helpful AI assistant. The user's name is ${userName}.` },
                        { role: "user", content: val }
                    ],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            genBubble.remove();

            if (data.choices && data.choices[0]) {
                const aiReply = data.choices[0].message.content;
                addBubble('ai', aiReply);
            } else {
                addBubble('ai', "Bhai API ne error diya hai, key check kar!");
            }
        } catch (e) {
            genBubble.remove();
            addBubble('ai', "Bhai connection fail ho gaya. Internet ya API key check karle!");
        }
    }
}

// --- UI HELPERS (NO CHANGES) ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function renderHistory() {
    const list = document.getElementById('hist-list');
    list.innerHTML = '';
    allSessions.slice().reverse().forEach(session => {
        const firstMsg = session.messages.find(m => m.role === 'user')?.text || "Photo Chat";
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<span><i class="far fa-comment"></i> ${firstMsg.substring(0,22)}...</span>`;
        div.onclick = () => loadSession(session.id);
        list.appendChild(div);
    });
}

function loadSession(id) {
    const session = allSessions.find(s => s.id === id);
    if(!session) return;
    currentSession = session;
    chatView.innerHTML = '';
    session.messages.forEach(m => addBubble(m.role, m.text, m.img, false));
    toggleSidebar();
}

function showConfirmModal() {
    document.getElementById('confirm-modal-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('confirm-modal').classList.add('show'), 50);
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('show');
    setTimeout(() => { document.getElementById('confirm-modal-overlay').style.display = 'none'; }, 300);
}

function executeClearStorage() {
    localStorage.clear();
    location.reload();
}

function handleImg(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = (f) => addBubble('user', '', f.target.result);
        reader.readAsDataURL(file);
    }
}

function addBubble(role, text, img = null, save = true) {
    if(save) currentSession.messages.push({role, text, img});
    const div = document.createElement('div');
    div.className = `${role}-msg`;
    let html = img ? `<img src="${img}" class="chat-img"><br>` : '';
    html += text ? `<span>${text}</span>` : '';
    div.innerHTML = `<div class="bubble">${html}</div>`;
    chatView.appendChild(div);
    chatView.scrollTop = chatView.scrollHeight;
    if(save) {
        const idx = allSessions.findIndex(s => s.id === currentSession.id);
        if(idx === -1) allSessions.push(currentSession); else allSessions[idx] = currentSession;
        localStorage.setItem('ai_sessions', JSON.stringify(allSessions));
        renderHistory();
    }
    return div;
}

function addGeneratingBubble() {
    const div = document.createElement('div');
    div.className = `ai-msg`;
    div.innerHTML = `<div class="generating-bubble"><span class="spinner"></span> Llama is Thinking...</div>`;
    chatView.appendChild(div);
    chatView.scrollTop = chatView.scrollHeight;
    return div;
}

msgInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });

