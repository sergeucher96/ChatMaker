// --- ИНТЕГРАЦИЯ С TELEGRAM (выполняется до загрузки DOM) ---
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Элементы DOM ---
    const getElement = (id) => document.getElementById(id);
    const appContainer = getElement('app-container');
    const chatScreen = getElement('chat-screen');
    const messageInput = getElement('message-input');
    const sendBtn = getElement('send-btn');
    const exportBtn = getElement('export-btn');
    const changeBgBtn = getElement('change-bg-btn');
    const colorPalette = getElement('color-palette');
    const modeSwitcher = getElement('mode-switcher');
    const senderSelectorBtn = getElement('sender-selector-btn');
    const participantsModalOverlay = getElement('participants-modal-overlay');
    const closeParticipantsModalBtn = getElement('close-participants-modal-btn');
    const participantsList = getElement('participants-list');
    const addParticipantModalBtn = getElement('add-participant-modal-btn');
    const resetChatBtn = getElement('reset-chat-btn');
    const setTimeBtn = getElement('set-time-btn');
    // Оверлей для предпросмотра больше не нужен для основной логики, но оставим его для совместимости HTML
    const exportPreviewOverlay = getElement('export-preview-overlay');
    const exportPreviewImg = getElement('export-preview-img');
    const customModal = {
        overlay: getElement('custom-modal-overlay'),
        title: getElement('custom-modal-title'),
        body: getElement('custom-modal-body'),
        footer: getElement('custom-modal-footer'),
    };

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
    
    // --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ---
    function saveState() { localStorage.setItem('chatStoryState_v2', JSON.stringify(appData)); }
    function loadState() {
        const savedState = localStorage.getItem('chatStoryState_v2');
        appData = savedState ? JSON.parse(savedState) : getInitialState();
    }
    function updateState(updater) {
        const changes = updater(appData);
        appData = { ...appData, ...changes };
        saveState();
    }

    // --- Рендеринг (без изменений) ---
    function createMessageElement(msg, state) {
        const participant = state.participants.find(p => p.id === msg.participantId);
        if (!participant) return null;
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${participant.type}`;
        wrapper.dataset.messageId = msg.id;
        if (appData.currentMode === 'group' && participant.type === 'received') {
            const senderName = document.createElement('div');
            senderName.className = 'sender-name';
            senderName.textContent = participant.name;
            if(participant.id > 1) { senderName.style.color = nameColors[(participant.id - 2) % nameColors.length]; }
            wrapper.appendChild(senderName);
        }
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        const contentEl = document.createElement('span');
        contentEl.className = 'message-content';
        contentEl.textContent = msg.text;
        const metaEl = document.createElement('div');
        metaEl.className = 'message-meta';
        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        timeEl.textContent = msg.time;
        metaEl.appendChild(timeEl);
        if (participant.type === 'sent') {
            const ticksEl = document.createElement('div');
            ticksEl.className = 'message-ticks';
            if (msg.status === 'read') ticksEl.classList.add('read');
            if (msg.status && msg.status !== 'none') {
                const tick1 = document.createElement('div'); tick1.className = 'tick tick-1'; ticksEl.appendChild(tick1);
            }
            if (msg.status === 'delivered' || msg.status === 'read') {
                const tick2 = document.createElement('div'); tick2.className = 'tick tick-2'; ticksEl.appendChild(tick2);
            }
            metaEl.appendChild(ticksEl);
        }
        messageEl.appendChild(contentEl);
        messageEl.appendChild(metaEl);
        wrapper.appendChild(messageEl);
        return wrapper;
    }
    function renderMessages(state) {
        chatScreen.innerHTML = ''; 
        state.messages.forEach(msg => {
            const el = createMessageElement(msg, state);
            if (el) chatScreen.appendChild(el);
        });
        scrollToBottom();
    }
    function addMessageToDOM(msg, state) {
        const el = createMessageElement(msg, state);
        if (el) chatScreen.appendChild(el);
        scrollToBottom();
    }
    function updateMessageInDOM(msg, state) {
        const newElement = createMessageElement(msg, state);
        if (newElement) {
            const oldElement = chatScreen.querySelector(`.message-wrapper[data-message-id="${msg.id}"]`);
            if (oldElement) oldElement.replaceWith(newElement);
        }
    }
    function renderAll() {
        const state = appData[appData.currentMode];
        renderMessages(state);
        updateSenderSelector(state);
        updateBackground(state.currentBackground);
        updateModeSwitcher();
    }
    function updateSenderSelector(state) {
        const selected = state.participants.find(p => p.id === state.selectedParticipantId);
        senderSelectorBtn.textContent = selected ? selected.name : 'Выбрать';
    }
    function updateBackground(bgValue) {
        chatScreen.style.background = bgValue;
        chatScreen.style.backgroundSize = 'cover';
        chatScreen.style.backgroundPosition = 'center';
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.toggle('active', swatch.dataset.bg === bgValue);
        });
    }
    function updateModeSwitcher() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === appData.currentMode);
        });
    }
    function scrollToBottom() {
        chatScreen.scrollTop = chatScreen.scrollHeight;
    }

    // --- Основные функции приложения (без изменений) ---
    function sendMessage() {
        const text = messageInput.value.trim(); if (!text) return;
        const state = appData[appData.currentMode];
        const participant = state.participants.find(p => p.id === state.selectedParticipantId);
        const newMessage = { id: Date.now(), text: text, participantId: state.selectedParticipantId, time: appData.currentTime, status: participant?.type === 'sent' ? 'sent' : 'none' };
        const updatedMessages = [...state.messages, newMessage];
        updateState(data => ({ ...data, [data.currentMode]: { ...state, messages: updatedMessages } }));
        addMessageToDOM(newMessage, state);
        messageInput.value = ''; 
        messageInput.style.height = 'auto';
    }
    function changeMessageStatus(id) {
        const state = appData[appData.currentMode];
        const messageIndex = state.messages.findIndex(m => m.id === id);
        if (messageIndex === -1) return;
        const message = state.messages[messageIndex];
        const participant = state.participants.find(p => p.id === message.participantId);
        if (participant?.type !== 'sent') return;
        const statuses = ['sent', 'delivered', 'read', 'none'];
        const currentIndex = statuses.indexOf(message.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        const newStatus = statuses[nextIndex];
        const updatedMessages = [...state.messages];
        const updatedMessage = { ...message, status: newStatus };
        updatedMessages[messageIndex] = updatedMessage;
        updateState(data => ({ ...data, [data.currentMode]: { ...state, messages: updatedMessages } }));
        updateMessageInDOM(updatedMessage, state);
    }
    function switchMode(newMode) {
        if (appData.currentMode === newMode) return;
        updateState(data => ({ currentMode: newMode }));
        renderAll();
    }
    function changeBackground(bgValue) {
        const state = appData[appData.currentMode];
        updateState(data => ({ ...data, [data.currentMode]: { ...state, currentBackground: bgValue } }));
        updateBackground(bgValue);
    }
    function selectParticipant(id) {
        const state = appData[appData.currentMode];
        updateState(data => ({ ...data, [data.currentMode]: { ...state, selectedParticipantId: id } }));
        updateSenderSelector(appData[appData.currentMode]);
        participantsModalOverlay.classList.remove('visible');
    }
    function addParticipant(name) {
        const state = appData.group;
        if (state.participants.length >= 5 || !name || !name.trim()) return;
        const newParticipant = { id: state.nextParticipantId, name: name.trim(), type: 'received' };
        const updatedParticipants = [...state.participants, newParticipant];
        updateState(data => ({ ...data, group: { ...state, participants: updatedParticipants, nextParticipantId: state.nextParticipantId + 1, selectedParticipantId: newParticipant.id } }));
        renderAll();
        openParticipantsModal();
    }
    function editParticipantName(id, newName) {
        if (!newName || !newName.trim()) return;
        const state = appData.group;
        const updatedParticipants = state.participants.map(p => p.id === id ? { ...p, name: newName.trim() } : p);
        updateState(data => ({ ...data, group: { ...state, participants: updatedParticipants } }));
        renderAll();
        openParticipantsModal();
    }
    function deleteParticipant(id) {
        if (id === 1) return;
        const state = appData.group;
        if (state.participants.length <= 2) return;
        const updatedParticipants = state.participants.filter(p => p.id !== id);
        const updatedMessages = state.messages.filter(m => m.participantId !== id);
        const newSelectedId = state.selectedParticipantId === id ? 1 : state.selectedParticipantId;
        updateState(data => ({ ...data, group: { ...state, participants: updatedParticipants, messages: updatedMessages, selectedParticipantId: newSelectedId } }));
        renderAll();
        openParticipantsModal();
    }

    // --- Экспорт ---
    async function createFinalCanvas() {
        // Эта функция остается без изменений
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const exportWidth = 1080;
        const exportHeight = 1920;
        finalCanvas.width = exportWidth;
        finalCanvas.height = exportHeight;
        const state = appData[appData.currentMode];
        const bgValue = state.currentBackground;
        const urlMatch = bgValue.match(/url\("(.+?)"\)/);
        if (urlMatch) {
            try {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = urlMatch[1];
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('Не удалось загрузить фоновое изображение.'));
                });
                ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
            } catch (error) {
                console.error(error);
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim();
                ctx.fillRect(0, 0, exportWidth, exportHeight);
            }
        }
        const messageElements = Array.from(chatScreen.querySelectorAll('.message-wrapper'));
        const messageCanvases = await Promise.all(messageElements.map(el =>
            html2canvas(el, { scale: 3, backgroundColor: null, useCORS: true })
        ));
        let currentY = 60;
        const sidePadding = 45;
        const messageGap = 6;
        for (let i = 0; i < messageCanvases.length; i++) {
            const msgCanvas = messageCanvases[i];
            const el = messageElements[i];
            let xPosition = sidePadding;
            if (el.classList.contains('sent')) {
                xPosition = exportWidth - (msgCanvas.width / 3) - sidePadding;
            }
            ctx.drawImage(msgCanvas, xPosition, currentY, msgCanvas.width / 3, msgCanvas.height / 3);
            currentY += (msgCanvas.height / 3) + messageGap;
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.font = 'bold 32px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('by Chat Story Maker', exportWidth / 2, exportHeight - 60);
        return finalCanvas;
    }
    
    // !!! --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ --- !!!
    // Эта функция теперь отправляет данные боту
    async function exportChat() {
        const tg = window.Telegram.WebApp;
        if (!tg || !tg.sendData) {
            showCustomAlert("Ошибка", "Функция отправки доступна только внутри Telegram.");
            // Можно добавить старую логику с показом картинки как fallback
            return;
        }

        const originalButtonText = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = 'Создание...';

        try {
            const finalCanvas = await createFinalCanvas();
            // Получаем данные картинки как data URL
            const imageUrl = finalCanvas.toDataURL("image/png");
            
            // Отделяем заголовок 'data:image/png;base64,' от самих данных
            const base64Data = imageUrl.split(',')[1];
            
            exportBtn.textContent = 'Отправка...';

            // Отправляем данные боту
            tg.sendData(base64Data);
            
            // Telegram рекомендует закрывать WebApp после отправки данных
            // tg.close(); // Раскомментируйте, если хотите, чтобы приложение закрывалось после отправки

        } catch (err) {
            console.error("Ошибка при создании или отправке изображения:", err);
            showCustomAlert("Ошибка", "Произошла ошибка: " + err.message);
        } finally {
            // Кнопка останется неактивной, если приложение не закрывается
            // Если вы не используете tg.close(), верните кнопке исходное состояние через пару секунд
            setTimeout(() => {
                exportBtn.disabled = false;
                exportBtn.textContent = originalButtonText;
            }, 2000);
        }
    }

    // --- Модальные окна (без изменений) ---
    function showModal({ title, bodyHtml, buttons }) {
        customModal.title.textContent = title;
        customModal.body.innerHTML = bodyHtml;
        customModal.footer.innerHTML = '';
        buttons.forEach(btn => {
            const buttonEl = document.createElement('button');
            buttonEl.textContent = btn.text;
            buttonEl.className = btn.class;
            buttonEl.onclick = () => {
                if (btn.handler) btn.handler();
                closeCustomModal();
            };
            customModal.footer.appendChild(buttonEl);
        });
        customModal.overlay.classList.add('visible');
        const input = customModal.body.querySelector('input');
        if (input) input.focus();
    }
    function closeCustomModal() { customModal.overlay.classList.remove('visible'); }
    function showCustomAlert(title, message) {
        showModal({ title: title, bodyHtml: `<p>${message}</p>`, buttons: [{ text: 'OK', class: 'primary' }] });
    }
    function handleSetTime() {
        showModal({
            title: 'Установить время',
            bodyHtml: `<input type="text" id="time-input" value="${appData.currentTime}" placeholder="ЧЧ:ММ">`,
            buttons: [
                { text: 'Отмена', class: 'secondary' },
                { 
                    text: 'Сохранить', 
                    class: 'primary',
                    handler: () => {
                        const newTime = document.getElementById('time-input').value;
                        if (newTime && newTime.match(/^\d{1,2}:\d{2}$/)) {
                            updateState(() => ({ currentTime: newTime }));
                        } else if (newTime) {
                            showCustomAlert('Ошибка', 'Неверный формат времени. Используйте ЧЧ:ММ.');
                        }
                    } 
                }
            ]
        });
    }
    function handleResetChat() {
        showModal({
            title: 'Сбросить чат?',
            bodyHtml: '<p>Вы уверены, что хотите удалить все сообщения в этом чате? Это действие нельзя отменить.</p>',
            buttons: [
                { text: 'Отмена', class: 'secondary' },
                { 
                    text: 'Удалить', 
                    class: 'danger',
                    handler: () => {
                        const state = appData[appData.currentMode];
                        updateState(data => ({ ...data, [data.currentMode]: { ...state, messages: [] } }));
                        renderMessages(appData[appData.currentMode]);
                    } 
                }
            ]
        })
    }
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

    // --- Инициализация и обработчики событий ---
    function init() {
        // Меняем текст на кнопке экспорта
        exportBtn.textContent = 'Отправить боту';

        // Адаптация под тему Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            const applyTheme = () => document.documentElement.className = tg.colorScheme === 'dark' ? 'dark-mode' : '';
            tg.onEvent('themeChanged', applyTheme);
            applyTheme();
        }
        const setFixedViewportHeight = () => appContainer.style.height = `${window.innerHeight}px`;
        window.addEventListener('resize', setFixedViewportHeight);
        setFixedViewportHeight();
        colorPalette.innerHTML = backgroundOptions.map(bg => `<div class="color-swatch" data-bg='${bg.value}' style="background-image: ${bg.value};"></div>`).join('');

        // Обработчики
        modeSwitcher.addEventListener('click', (e) => { if (e.target.classList.contains('mode-btn')) switchMode(e.target.dataset.mode); });
        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }});
        messageInput.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });
        exportBtn.addEventListener('click', exportChat);
        senderSelectorBtn.addEventListener('click', () => { appData.currentMode === 'personal' ? selectParticipant(appData.personal.selectedParticipantId === 1 ? 2 : 1) : openParticipantsModal(); });
        addParticipantModalBtn.addEventListener('click', () => {
             showModal({
                title: 'Новый участник',
                bodyHtml: `<input type="text" id="new-participant-input" value="Участник ${appData.group.participants.length}" placeholder="Имя участника">`,
                buttons: [ { text: 'Отмена', class: 'secondary' }, { text: 'Добавить', class: 'primary', handler: () => addParticipant(document.getElementById('new-participant-input').value) } ]
            });
        });
        closeParticipantsModalBtn.addEventListener('click', () => participantsModalOverlay.classList.remove('visible'));
        participantsModalOverlay.addEventListener('click', (e) => { if (e.target === participantsModalOverlay) participantsModalOverlay.classList.remove('visible'); });
        participantsList.addEventListener('click', (e) => { 
            const targetLi = e.target.closest('li');
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            if (editBtn) {
                const id = parseInt(editBtn.dataset.id);
                const p = appData.group.participants.find(p => p.id === id);
                showModal({
                    title: 'Редактировать имя',
                    bodyHtml: `<input type="text" id="edit-name-input" value="${p.name}">`,
                    buttons: [ { text: 'Отмена', class: 'secondary' }, { text: 'Сохранить', class: 'primary', handler: () => editParticipantName(id, document.getElementById('edit-name-input').value) }]
                });
            } else if (deleteBtn) {
                deleteParticipant(parseInt(deleteBtn.dataset.id));
            } else if (targetLi) {
                selectParticipant(parseInt(targetLi.dataset.id));
            }
        });
        changeBgBtn.addEventListener('click', () => colorPalette.classList.toggle('visible'));
        colorPalette.addEventListener('click', (e) => { if (e.target.classList.contains('color-swatch')) changeBackground(e.target.dataset.bg); });
        resetChatBtn.addEventListener('click', handleResetChat);
        setTimeBtn.addEventListener('click', handleSetTime);
        chatScreen.addEventListener('click', (e) => {
            const wrapper = e.target.closest('.message-wrapper');
            if (wrapper && wrapper.dataset.messageId) changeMessageStatus(Number(wrapper.dataset.messageId));
        });
        document.addEventListener('click', (e) => { if ( colorPalette.classList.contains('visible') && !changeBgBtn.contains(e.target) && !colorPalette.contains(e.target) ) colorPalette.classList.remove('visible'); });
        exportPreviewOverlay.addEventListener('click', () => exportPreviewOverlay.classList.remove('visible'));
        customModal.overlay.addEventListener('click', (e) => { if(e.target === customModal.overlay) closeCustomModal(); })

        loadState();
        renderAll();
    }
    init();
});
