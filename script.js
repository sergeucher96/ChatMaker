// --- ИНТЕГРАЦИЯ С TELEGRAM (выполняется до загрузки DOM) ---
if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('bg_color');
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Адаптация под тему Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        function applyTheme() {
            document.documentElement.className = tg.colorScheme === 'dark' ? 'dark-mode' : '';
        }
        tg.onEvent('themeChanged', applyTheme);
        applyTheme();
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
    const headerAvatar = document.getElementById('header-avatar');
    const headerName = document.getElementById('header-name');
    const headerStatus = document.getElementById('header-status');
    const exportWrapper = document.getElementById('export-wrapper');

    // --- Фиксация высоты для мобильных устройств ---
    function setFixedViewportHeight() { appContainer.style.height = `${window.innerHeight}px`; }
    window.addEventListener('resize', setFixedViewportHeight);

    // --- Данные ---
    const backgroundOptions = [ { id: 'bg1', value: `url("1.jpg")` }, { id: 'bg2', value: `url("2.jpg")` }, { id: 'bg3', value: `url("3.jpg")` }, { id: 'bg4', value: `url("4.jpg")` }, { id: 'bg5', value: `url("5.jpg")` }, { id: 'bg6', value: `url("6.jpg")` }, { id: 'bg7', value: `url("7.jpg")` }, { id: 'bg8', value: `url("8.jpg")` }, { id: 'bg9', value: `url("9.jpg")` }, { id: 'bg10', value: `url("10.jpg")` } ];
    const nameColors = ['#ca6052', '#3e95c5', '#5eb44f', '#d7894a', '#8c62a5', '#4e9b95', '#d4769a', '#cb823f'];
    const avatarOptions = ["С", "А", "П", "Г"];
    const statusOptions = ["в сети", "был(а) недавно", "был(а) в этом месяце", "печатает...", "записывает аудио..."];
    
    // --- Состояние приложения ---
    let appData = {};

    function getInitialState() {
        return {
            currentMode: 'personal', currentTime: '12:30',
            personal: { 
                header: { name: 'Сереженька', avatar: avatarOptions[0], status: statusOptions[1] },
                participants: [ { id: 1, name: 'Вы', type: 'sent' }, { id: 2, name: 'Собеседник', type: 'received' } ], 
                messages: [], nextParticipantId: 3, selectedParticipantId: 1, currentBackground: 'transparent'
            },
            group: { 
                header: { name: 'Рабочий чат', avatar: 'РЧ', status: '3 участника' },
                participants: [ { id: 1, name: 'Вы', type: 'sent' }, { id: 2, name: 'Анна', type: 'received' }, { id: 3, name: 'Павел', type: 'received' } ], 
                messages: [], nextParticipantId: 4, selectedParticipantId: 1, currentBackground: 'transparent'
            }
        };
    }
    
    function saveState() { localStorage.setItem('chatStoryState_mobile_final', JSON.stringify(appData)); }
    function loadState() {
        const savedState = localStorage.getItem('chatStoryState_mobile_final');
        appData = savedState ? JSON.parse(savedState) : getInitialState();
    }

    // --- Рендеринг и основные функции ---
    function renderHeader(state) {
        headerName.textContent = state.header.name;
        headerAvatar.textContent = state.header.avatar;
        headerStatus.textContent = state.header.status;
    }

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
        const canvas = await html2canvas(exportWrapper, {
            scale: 2,
            useCORS: true,
            backgroundColor: window.getComputedStyle(document.body).backgroundColor
        });
        
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const exportWidth = 1080;
        const exportHeight = (exportWidth / canvas.width) * canvas.height;
        finalCanvas.width = exportWidth;
        finalCanvas.height = exportHeight;
        ctx.drawImage(canvas, 0, 0, exportWidth, exportHeight);
        return finalCanvas;
    }
    
    async function exportChat() {
        const tg = window.Telegram.WebApp;
        if (!tg || !tg.initData) {
            alert("Эта функция работает только внутри Telegram.");
            return;
        }

        const originalButtonText = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = 'Создание...';

        try {
            const finalCanvas = await createFinalCanvas();
            exportBtn.textContent = 'Отправка...';

            finalCanvas.toBlob(async (blob) => {
                if (!blob) {
                    tg.showAlert("Ошибка: не удалось создать изображение.");
                    exportBtn.disabled = false;
                    exportBtn.textContent = originalButtonText;
                    return;
                }

                const formData = new FormData();
                formData.append('photo', blob, 'chat-story.png');
                formData.append('initData', tg.initData);

                try {
                    const response = await fetch('https://chatmaker-gz1e.onrender.com/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    if (response.ok) {
                        tg.showAlert('Картинка отправлена вам в чат!');
                        tg.close();
                    } else {
                        const errorData = await response.json();
                        tg.showAlert(`Ошибка отправки: ${errorData.error || 'Сервер не отвечает.'}`);
                    }
                } catch (networkError) {
                    console.error("Сетевая ошибка:", networkError);
                    tg.showAlert('Сетевая ошибка. Не удалось связаться с сервером.');
                } finally {
                    exportBtn.disabled = false;
                    exportBtn.textContent = originalButtonText;
                }
            }, 'image/jpeg', 0.9);

        } catch (err) {
            console.error("Ошибка при создании изображения:", err);
            tg.showAlert("Произошла ошибка при создании изображения.");
            exportBtn.disabled = false;
            exportBtn.textContent = originalButtonText;
        }
    }

    function renderAll() { 
        const state = appData[appData.currentMode]; 
        renderHeader(state);
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
        // ИСПРАВЛЕНО: Применяем фон к chatScreen, а не к wrapper
        chatScreen.style.backgroundImage = bgValue;
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
    
    function resetChat() { if (confirm('Удалить все сообщения?')) { const state = appData[appData.currentMode]; state.messages = []; renderAll(); saveState(); } }
    function handleSenderSelection() { const state = appData[appData.currentMode]; if (appData.currentMode === 'personal') { const newId = state.selectedParticipantId === 1 ? 2 : 1; selectParticipant(newId); } else { openParticipantsModal(); } }
    function updateSenderSelector(state) { const selected = state.participants.find(p => p.id === state.selectedParticipantId); senderSelectorBtn.textContent = selected ? selected.name : 'Выбрать'; }
    function selectParticipant(id) { const state = appData[appData.currentMode]; state.selectedParticipantId = id; updateSenderSelector(state); participantsModalOverlay.classList.remove('visible'); saveState(); }
    
    function openParticipantsModal() { /* ... (твой код без изменений) ... */ }
    function editParticipantName(id) { /* ... (твой код без изменений) ... */ }
    function deleteParticipant(id) { /* ... (твой код без изменений) ... */ }
    function addParticipant() { /* ... (твой код без изменений) ... */ }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
    modeSwitcher.addEventListener('click', (e) => { if (e.target.classList.contains('mode-btn')) switchMode(e.target.dataset.mode); });
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }});
    messageInput.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });
    exportBtn.addEventListener('click', exportChat);
    senderSelectorBtn.addEventListener('click', handleSenderSelection);
    addParticipantModalBtn.addEventListener('click', addParticipant);
    closeParticipantsModalBtn.addEventListener('click', () => participantsModalOverlay.classList.remove('visible'));
    participantsModalOverlay.addEventListener('click', (e) => { if (e.target === participantsModalOverlay) participantsModalOverlay.classList.remove('visible'); });
    participantsList.addEventListener('click', (e) => { const targetLi = e.target.closest('li'); if (!targetLi) return; const editBtn = e.target.closest('.edit-btn'); const deleteBtn = e.target.closest('.delete-btn'); if (editBtn) { editParticipantName(parseInt(editBtn.dataset.id)); } else if (deleteBtn) { deleteParticipant(parseInt(deleteBtn.dataset.id)); } else { selectParticipant(parseInt(targetLi.dataset.id)); } });
    changeBgBtn.addEventListener('click', () => colorPalette.classList.toggle('visible'));
    colorPalette.addEventListener('click', (e) => { if (e.target.classList.contains('color-swatch')) changeBackground(e.target.dataset.bg); });
    resetChatBtn.addEventListener('click', resetChat);
    setTimeBtn.addEventListener('click', setTime);
    chatScreen.addEventListener('click', (e) => { const messageEl = e.target.closest('.message'); if (messageEl && messageEl.dataset.messageId) { changeMessageStatus(Number(messageEl.dataset.messageId)); } });
    document.addEventListener('click', (e) => { if ( colorPalette.classList.contains('visible') && !changeBgBtn.contains(e.target) && !colorPalette.contains(e.target) ) { colorPalette.classList.remove('visible'); } });
    exportPreviewOverlay.addEventListener('click', () => { exportPreviewOverlay.classList.remove('visible'); });

    // Обработчики для шапки
    headerName.addEventListener('click', () => {
        const state = appData[appData.currentMode];
        const newName = prompt('Введите новое имя:', state.header.name);
        if (newName && newName.trim()) {
            state.header.name = newName.trim();
            saveState();
            renderHeader(state);
        }
    });

    headerAvatar.addEventListener('click', () => {
        const state = appData[appData.currentMode];
        if (appData.currentMode !== 'personal') {
            const newAvatar = prompt('Введите инициалы (до 2-х букв):', state.header.avatar);
            if (newAvatar && newAvatar.trim()) {
                state.header.avatar = newAvatar.trim().substring(0, 2);
                saveState();
                renderHeader(state);
            }
            return;
        };
        const currentIndex = avatarOptions.indexOf(state.header.avatar);
        state.header.avatar = avatarOptions[(currentIndex + 1) % avatarOptions.length];
        saveState();
        renderHeader(state);
    });

    headerStatus.addEventListener('click', () => {
        const state = appData[appData.currentMode];
        if (appData.currentMode !== 'personal') {
            const newStatus = prompt('Введите новый статус:', state.header.status);
            if (newStatus && newStatus.trim()) {
                state.header.status = newStatus.trim();
                saveState();
                renderHeader(state);
            }
            return;
        };
        const currentIndex = statusOptions.indexOf(state.header.status);
        state.header.status = statusOptions[(currentIndex + 1) % statusOptions.length];
        saveState();
        renderHeader(state);
    });

    // --- ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
    loadState();
    renderAll();
    setFixedViewportHeight();
});
