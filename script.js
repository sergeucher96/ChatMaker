document.addEventListener('DOMContentLoaded', () => {
    // --- ИНТЕГРАЦИЯ С TELEGRAM (опционально, но рекомендуется) ---
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
    }

    // --- Элементы DOM ---
    const appContainer = document.getElementById('app-container');
    const chatScreen = document.getElementById('chat-screen');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const exportBtn = document.getElementById('export-btn');
    const changeBgBtn = document.getElementById('change-bg-btn');
    const colorPalette = document.getElementById('color-palette');
    const modeSwitcher = document.getElementById('mode-switcher');
    const senderSelectorBtn = document.getElementById('sender-selector-btn');
    const participantsModalOverlay = document.getElementById('participants-modal-overlay');
    const closeParticipantsModalBtn = document.getElementById('close-participants-modal-btn');
    const participantsList = document.getElementById('participants-list');
    const addParticipantModalBtn = document.getElementById('add-participant-modal-btn');
    const resetChatBtn = document.getElementById('reset-chat-btn');
    const setTimeBtn = document.getElementById('set-time-btn');
    const exportPreviewOverlay = document.getElementById('export-preview-overlay');
    const exportPreviewImg = document.getElementById('export-preview-img');

    // --- Фиксация высоты ---
    function setFixedViewportHeight() {
        const vh = window.innerHeight;
        appContainer.style.height = `${vh - 30}px`;
    }
    window.addEventListener('resize', setFixedViewportHeight);

    // --- Данные ---
    const backgroundOptions = [ { id: 'bg1', value: `url("1.jpg")` }, { id: 'bg2', value: `url("2.jpg")` }, { id: 'bg3', value: `url("3.jpg")` }, { id: 'bg4', value: `url("4.jpg")` }, { id: 'bg5', value: `url("5.jpg")` }, { id: 'bg6', value: `url("6.jpg")` }, { id: 'bg7', value: `url("7.jpg")` }, { id: 'bg8', value: `url("8.jpg")` }, { id: 'bg9', value: `url("9.jpg")` }, { id: 'bg10', value: `url("10.jpg")` } ];
    const nameColors = ['#ca6052', '#3e95c5', '#5eb44f', '#d7894a', '#8c62a5', '#4e9b95', '#d4769a', '#cb823f'];
    
    // --- Состояние приложения ---
    let appData = {};

    function getInitialState() {
        return {
            currentMode: 'personal', currentTime: '12:30',
            personal: { participants: [ { id: 1, name: 'Вы', type: 'sent' }, { id: 2, name: 'Собеседник', type: 'received' } ], messages: [], nextParticipantId: 3, selectedParticipantId: 1, currentBackground: backgroundOptions[0].value },
            group: { participants: [ { id: 1, name: 'Вы', type: 'sent' }, { id: 2, name: 'Анна', type: 'received' }, { id: 3, name: 'Павел', type: 'received' } ], messages: [], nextParticipantId: 4, selectedParticipantId: 1, currentBackground: backgroundOptions[0].value }
        };
    }
    
    function saveState() { localStorage.setItem('chatStoryState_mobile_final', JSON.stringify(appData)); }
    function loadState() {
        const savedState = localStorage.getItem('chatStoryState_mobile_final');
        appData = savedState ? JSON.parse(savedState) : getInitialState();
    }

    // --- Рендеринг и основные функции ---
    function renderMessages(state) {
        chatScreen.innerHTML = ''; 
        state.messages.forEach(msg => {
            const participant = state.participants.find(p => p.id === msg.participantId);
            if (!participant) return;
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${participant.type}`;
            if (appData.currentMode === 'group' && participant.type === 'received') {
                const senderName = document.createElement('div');
                senderName.className = 'sender-name';
                senderName.textContent = participant.name;
                if(participant.id > 1) { senderName.style.color = nameColors[(participant.id - 2) % nameColors.length]; }
                wrapper.appendChild(senderName);
            }
            const messageEl = document.createElement('div');
            messageEl.className = 'message';
            messageEl.dataset.messageId = msg.id;
            const contentEl = document.createElement('span');
            contentEl.className = 'message-content';
            contentEl.textContent = msg.text;
            const metaEl = document.createElement('div');
            metaEl.className = 'message-meta';
            const timeEl = document.createElement('span');
            timeEl.className = 'message-time';
            timeEl.textContent = msg.time;
            metaEl.appendChild(timeEl);
            const ticksEl = document.createElement('div');
            ticksEl.className = 'message-ticks';
            if(msg.status === 'read') ticksEl.classList.add('read');
            if (msg.status && msg.status !== 'none') {
                const tick1 = document.createElement('div'); tick1.className = 'tick tick-1'; ticksEl.appendChild(tick1);
            }
            if (msg.status === 'delivered' || msg.status === 'read') {
                const tick2 = document.createElement('div'); tick2.className = 'tick tick-2'; ticksEl.appendChild(tick2);
            }
            metaEl.appendChild(ticksEl);
            messageEl.appendChild(contentEl);
            messageEl.appendChild(metaEl);
            wrapper.appendChild(messageEl);
            chatScreen.appendChild(wrapper);
        });
        chatScreen.scrollTop = chatScreen.scrollHeight;
    }
    
    function sendMessage() {
        const text = messageInput.value.trim(); if (!text) return;
        const state = appData[appData.currentMode];
        const participant = state.participants.find(p => p.id === state.selectedParticipantId);
        const newMessage = { id: Date.now(), text: text, participantId: state.selectedParticipantId, time: appData.currentTime, status: participant?.type === 'sent' ? 'delivered' : 'none' };
        state.messages.push(newMessage);
        messageInput.value = ''; messageInput.style.height = 'auto';
        renderMessages(state); saveState();
    }
    
    function setTime() {
        const newTime = prompt('Введите время (ЧЧ:ММ):', appData.currentTime);
        if (newTime && newTime.match(/^\d{1,2}:\d{2}$/)) {
            appData.currentTime = newTime;
            saveState();
        } else if (newTime) { alert('Неверный формат времени.'); }
    }
    
    function changeMessageStatus(id) {
        const state = appData[appData.currentMode];
        const message = state.messages.find(m => m.id === id);
        if (!message) return;
        const statuses = ['delivered', 'read', 'sent', 'none'];
        const currentIndex = statuses.indexOf(message.status);
        message.status = statuses[(currentIndex + 1) % statuses.length];
        renderMessages(state); saveState();
    }

    async function createFinalCanvas() {
        const canvas = await html2canvas(appContainer, { // Делаем снимок всего app-container
            scale: 2,
            useCORS: true
        });
        return canvas;
    }
    
    async function exportChat() {
        const originalButtonText = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = 'Создание...';
        try {
            const finalCanvas = await createFinalCanvas();
            const imageUrl = finalCanvas.toDataURL("image/png");
            exportPreviewImg.src = imageUrl;
            exportPreviewOverlay.classList.add('visible');
        } catch (err) {
            console.error("Ошибка при создании изображения:", err);
            alert("Произошла ошибка.");
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = originalButtonText;
        }
    }

    function renderAll() { 
        const state = appData[appData.currentMode]; 
        renderMessages(state); 
        updateSenderSelector(state); 
        changeBackground(state.currentBackground, false); 
    }

    function switchMode(newMode) { 
        if (appData.currentMode === newMode) return; 
        appData.currentMode = newMode; 
        document.querySelectorAll('.mode-btn').forEach(btn => { 
            btn.classList.toggle('active', btn.dataset.mode === newMode); 
        }); 
        renderAll();
        saveState(); 
    }
    
    function changeBackground(bgValue, shouldSave = true) { 
        const state = appData[appData.currentMode]; 
        state.currentBackground = bgValue; 
        chatScreen.style.background = bgValue;
        chatScreen.style.backgroundSize = 'cover';
        chatScreen.style.backgroundPosition = 'center'; 
        document.querySelectorAll('.color-swatch').forEach(swatch => { 
            swatch.classList.toggle('active', swatch.dataset.bg === bgValue); 
        }); 
        if (shouldSave) saveState();
    }

    function renderColorPalette() {
        colorPalette.innerHTML = '';
        backgroundOptions.forEach(bg => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.dataset.bg = bg.value;
            swatch.style.backgroundImage = bg.value;
            colorPalette.appendChild(swatch);
        });
    }
    
    function resetChat() { 
        if (confirm('Удалить все сообщения?')) { 
            const state = appData[appData.currentMode]; 
            state.messages = [];
            state.selectedParticipantId = state.participants[0].id;
            renderAll(); 
            saveState(); 
        } 
    }

    function handleSenderSelection() { const state = appData[appData.currentMode]; if (appData.currentMode === 'personal') { const newId = state.selectedParticipantId === 1 ? 2 : 1; selectParticipant(newId); } else { openParticipantsModal(); } }
    function updateSenderSelector(state) { const selected = state.participants.find(p => p.id === state.selectedParticipantId); senderSelectorBtn.textContent = selected ? selected.name : 'Выбрать'; }
    function selectParticipant(id) { const state = appData[appData.currentMode]; state.selectedParticipantId = id; updateSenderSelector(state); participantsModalOverlay.classList.remove('visible'); saveState(); }
    
    function openParticipantsModal() {
        const state = appData.group; 
        participantsList.innerHTML = '';
        state.participants.forEach(p => {
            const li = document.createElement('li');
            if(p.id === state.selectedParticipantId) li.classList.add('active-sender');
            li.dataset.id = p.id;
            li.innerHTML = ` <span class="participant-name">${p.name}</span> <div class="participant-actions"> <button class="edit-btn" data-id="${p.id}">✏️</button> ${state.participants.length > 2 && p.id !== 1 ? `<button class="delete-btn" data-id="${p.id}">🗑️</button>` : ''} </div> `;
            participantsList.appendChild(li);
        });
        addParticipantModalBtn.style.display = state.participants.length < 5 ? 'block' : 'none';
        participantsModalOverlay.classList.add('visible');
    }
    
    function editParticipantName(id) {
        const state = appData.group;
        const participant = state.participants.find(p => p.id === id);
        const newName = prompt(`Новое имя для "${participant.name}":`, participant.name);
        if (newName && newName.trim()) {
            participant.name = newName.trim();
            saveState();
            renderAll();
            openParticipantsModal();
        }
    }
    
    function deleteParticipant(id) { 
        if (id === 1) return; 
        const state = appData.group; 
        if (state.participants.length <= 2) return; 
        if (confirm('Удалить участника?')) { 
            state.participants = state.participants.filter(p => p.id !== id); 
            state.messages = state.messages.filter(m => m.participantId !== id); 
            if (state.selectedParticipantId === id) { state.selectedParticipantId = state.participants[0].id; } 
            saveState(); 
            renderAll(); 
            openParticipantsModal(); 
        } 
    }
    
    function addParticipant() { 
        const state = appData.group; 
        if (state.participants.length >= 5) return; 
        const name = prompt('Имя нового участника:', `Участник ${state.participants.length}`); 
        if (name && name.trim()) { 
            const newParticipant = { id: state
