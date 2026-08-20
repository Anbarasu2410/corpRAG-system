document.addEventListener('DOMContentLoaded', () => {
    // Auth Elements
    const authOverlay = document.getElementById('auth-overlay');
    const authForm = document.getElementById('auth-form');
    const authNameGroup = document.getElementById('name-group');
    const authName = document.getElementById('auth-name');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');

    // App User Elements
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userAvatarInitials = document.getElementById('user-avatar-initials');
    const logoutBtn = document.getElementById('logout-btn');

    // Chat Elements
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const messagesContainer = document.getElementById('messages-container');

    // Navigation Tabs
    const viewChatBtn = document.getElementById('view-chat-btn');
    const viewEmbedBtn = document.getElementById('view-embed-btn');
    const chatWorkspaceView = document.getElementById('chat-workspace-view');
    const embedWorkspaceView = document.getElementById('embed-workspace-view');

    let authMode = 'login'; // 'login' or 'signup'
    let jwtToken = localStorage.getItem('corpRAG_JWT');
    let currentUser = JSON.parse(localStorage.getItem('corpRAG_User') || 'null');

    // Check Auth State
    if (jwtToken && currentUser) {
        showApp(currentUser);
    } else {
        authOverlay.style.display = 'flex';
    }

    // Switch Auth Tabs
    tabLogin.addEventListener('click', () => {
        authMode = 'login';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        authNameGroup.style.display = 'none';
        authSubmitBtn.textContent = 'Login to corpRAG';
        authError.textContent = '';
    });

    tabSignup.addEventListener('click', () => {
        authMode = 'signup';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        authNameGroup.style.display = 'flex';
        authSubmitBtn.textContent = 'Create corpRAG Account';
        authError.textContent = '';
    });

    // Auth Form Submit
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';

        const email = authEmail.value.trim();
        const password = authPassword.value.trim();
        const name = authName.value.trim();

        const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const payload = authMode === 'signup' ? { name, email, password } : { email, password };

        try {
            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                authError.textContent = data.error || 'Authentication failed.';
                return;
            }

            // Save Credentials
            jwtToken = data.token;
            currentUser = data.user;
            localStorage.setItem('corpRAG_JWT', jwtToken);
            localStorage.setItem('corpRAG_User', JSON.stringify(currentUser));

            showApp(currentUser);

        } catch (err) {
            authError.textContent = 'Server connection error. Ensure backend running on :5000';
        }
    });

    // Logout Handler
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('corpRAG_JWT');
        localStorage.removeItem('corpRAG_User');
        jwtToken = null;
        currentUser = null;
        authOverlay.style.display = 'flex';
    });

    function showApp(user) {
        authOverlay.style.display = 'none';
        userDisplayName.textContent = user.name || 'User';
        userDisplayEmail.textContent = user.email || '';
        userAvatarInitials.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }

    // Toggle Workspace Views
    viewChatBtn.addEventListener('click', () => {
        viewChatBtn.classList.add('active');
        viewEmbedBtn.classList.remove('active');
        chatWorkspaceView.style.display = 'flex';
        embedWorkspaceView.style.display = 'none';
    });

    viewEmbedBtn.addEventListener('click', () => {
        viewEmbedBtn.classList.add('active');
        viewChatBtn.classList.remove('active');
        chatWorkspaceView.style.display = 'none';
        embedWorkspaceView.style.display = 'block';
    });

    // Chat Query Submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text) return;

        const welcomeCard = messagesContainer.querySelector('.welcome-card');
        if (welcomeCard) welcomeCard.remove();

        appendMessage('user', text);
        userInput.value = '';

        try {
            const res = await fetch('http://localhost:5000/api/chat/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify({ question: text })
            });

            const data = await res.json();

            if (!res.ok) {
                appendMessage('bot', `⚠️ Error: ${data.error}`);
            } else {
                appendMessage('bot', data.text);
            }
        } catch (err) {
            appendMessage('bot', `⚠️ Backend Exception: ${err.message}`);
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    function appendMessage(sender, text) {
        const row = document.createElement('div');
        row.classList.add('message-row', `${sender}-row`);
        
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        bubble.innerHTML = window.marked ? marked.parse(text) : text;

        row.appendChild(bubble);
        messagesContainer.appendChild(row);
    }
});
