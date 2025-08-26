/**
 * ==================================================================================
 *  CHAT STORY MAKER - v3.0 (Финальная версия с надежным экспортом)
 * ==================================================================================
 *  - ИСПРАВЛЕНО: Функция createFinalCanvas полностью переписана на надежный
 *    метод с временным изменением DOM. Это решает все проблемы с версткой
 *    (выравнивание, фон, отступы, прозрачность) на финальном изображении.
 *  - Все предыдущие функции сохранены и работают корректно.
 * ==================================================================================
 */

if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); }

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. ПОИСК ЭЛЕМЕНТОВ DOM ---
    const getElement = (id) => document.getElementById(id);
    const appContainer = getElement('app-container');
    const chatScreen = getElement('chat-screen');
    const messageInput = getElement('message-input');
    const messageComposer = appContainer.querySelector('.message-composer');
    const exportControls = appContainer.querySelector('.export-controls');
    const topBar = appContainer.querySelector('.top-bar');
    const colorPalette = getElement('color-palette');
    const sendBtn = getElement('send-btn');
    const exportBtn = getElement('export-btn');
    const changeBgBtn = getElement('change-bg-btn');
    const modeSwitcher = getElement('mode-switcher');
    const senderSelectorBtn = getElement('sender-selector-btn');
    const resetChatBtn = getElement('reset-chat-btn');
    const setTimeBtn = getElement('set-time-btn');
    const chatHeader = getElement('chat-header');
    const headerAvatar = getElement('header-avatar');
    const headerName = getElement('header-name');
    const headerStatus = getElement('header-status');
    const participantsModal = { overlay: getElement('participants-modal-overlay'), list: getElement('participants-list'), addBtn: getElement('add-participant-modal-btn'), closeBtn: getElement('participants-modal-overlay').querySelector('.close-modal-btn') };
    const customModal = { overlay: getElement('custom-modal-overlay'), title: getElement('custom-modal-title'), body: getElement('custom-modal-body'), footer: getElement('custom-modal-footer') };
    const exportPreview = { overlay: getElement('export-preview-overlay'), img: getElement('export-preview-img') };


    // --- 2. ДАННЫЕ И СОСТОЯНИЕ ---
    let appData = {};
    const backgroundOptions = Array.from({ length: 10 }, (_, i) => ({ id: `bg${i + 1}`, value: `url("${i + 1}.jpg")` }));
    const nameColors = ['#ca6052', '#3e95c5', '#5eb44f', '#d7894a', '#8c62a5', '#4e9b95', '#d4769a', '#cb823f'];
    const avatarColors = ['#6A88E5', '#7BC862', '#A973E3', '#E4646E', '#5FBADD', '#EE8850'];
    const statusOptions = ['в сети', 'был(а) недавно', 'был(а) сегодня', 'был(а) на этой неделе', 'был(а) давно'];
    function getInitialState() { return { currentMode: 'personal', currentTime: '12:30', personal: { participants: [{ id: 1, name: 'Вы', type: 'sent' }, { id: 2, name: 'Собеседник', type: 'received' }], messages: [], nextParticipantId: 3, selectedParticipantId: 1, currentBackground: backgroundOptions[0].value, status: statusOptions[0] }, group: { participants: [{ id: 1, name: 'Вы', type: 'sent' }, { id: 2, name: 'Анна', type: 'received' }, { id: 3, name: 'Павел', type: 'received' }], messages: [], nextParticipantId: 4, selectedParticipantId: 1, currentBackground: backgroundOptions[0].value, displayParticipantCount: 3, groupName: 'Групповой чат' } }; }
    function saveState() { localStorage.setItem('chatStoryMakerState_v9', JSON.stringify(appData)); }
    function loadState() { const savedState = localStorage.getItem('chatStoryMakerState_v9'); appData = savedState ? JSON.parse(savedState) : getInitialState(); if (appData.group && !appData.group.hasOwnProperty('displayParticipantCount')) appData.group.displayParticipantCount = appData.group.participants.length; if (appData.group && !appData.group.hasOwnProperty('groupName')) appData.group.groupName = 'Групповой чат'; if (appData.personal && !appData.personal.hasOwnProperty('status')) appData.personal.status = statusOptions[0]; }
    function updateState(updater) { const changes = updater(appData); appData = { ...appData, ...changes }; saveState(); }
    function getParticipantDeclension(count) { const lastDigit = count % 10; const lastTwoDigits = count % 100; if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'участников'; if (lastDigit === 1) return 'участник'; if (lastDigit >= 2 && lastDigit <= 4) return 'участника'; return 'участников'; }


    // --- 4. РЕНДЕРИНГ ---
    function createMessageElement(msg, state) { const participant = state.participants.find(p => p.id === msg.participantId); if (!participant) return null; const wrapper = document.createElement('div'); wrapper.className = `message-wrapper ${participant.type}`; wrapper.dataset.messageId = msg.id; const messageEl = document.createElement('div'); messageEl.className = 'message'; if (appData.currentMode === 'group' && participant.type === 'received') { const headerEl = document.createElement('div'); headerEl.className = 'message-header'; const senderName = document.createElement('div'); senderName.className = 'sender-name'; senderName.textContent = participant.name; senderName.style.color = nameColors[(participant.id - 2) % nameColors.length]; const replyBtn = document.createElement('div'); replyBtn.className = 'reply-btn'; replyBtn.textContent = 'Ответить'; headerEl.appendChild(senderName); headerEl.appendChild(replyBtn); messageEl.appendChild(headerEl); } const contentEl = document.createElement('div'); contentEl.className = 'message-content'; contentEl.textContent = msg.text; const metaEl = document.createElement('div'); metaEl.className = 'message-meta'; const timeEl = document.createElement('span'); timeEl.textContent = msg.time; metaEl.appendChild(timeEl); if (msg.status && msg.status !== 'none') { const ticksEl = document.createElement('div'); ticksEl.className = 'message-ticks'; if (msg.status === 'read') ticksEl.classList.add('read'); if (msg.status === 'sent') { const tick1 = document.createElement('div'); tick1.className = 'tick tick-1'; ticksEl.appendChild(tick1); } if (msg.status === 'delivered' || msg.status === 'read') { const tick1 = document.createElement('div'); tick1.className = 'tick tick-1'; ticksEl.appendChild(tick1); const tick2 = document.createElement('div'); tick2.className = 'tick tick-2'; ticksEl.appendChild(tick2); } metaEl.appendChild(ticksEl); } contentEl.appendChild(metaEl); messageEl.appendChild(contentEl); wrapper.appendChild(messageEl); return wrapper; }
    function addMessageToDOM(msg, state) { const el = createMessageElement(msg, state); if (el) chatScreen.prepend(el); }
    function renderMessages(state) { chatScreen.innerHTML = ''; state.messages.forEach(msg => { const el = createMessageElement(msg, state); if (el) { el.style.animation = 'none'; chatScreen.prepend(el); } }); }
    function renderAll() { const state = appData[appData.currentMode]; document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active')); document.querySelector(`.mode-btn[data-mode="${appData.currentMode}"]`).classList.add('active'); const selectedParticipant = state.participants.find(p => p.id === state.selectedParticipantId); senderSelectorBtn.textContent = selectedParticipant ? selectedParticipant.name : 'Выбрать'; chatScreen.style.backgroundImage = state.currentBackground; document.querySelectorAll('.color-swatch').forEach(swatch => { swatch.classList.toggle('active', swatch.dataset.bg === state.currentBackground); }); renderChatHeader(state); renderMessages(state); }
    function renderChatHeader(state) { let name = '', status = '', letter = '', colorIndex = 0; headerStatus.style.cursor = ''; headerName.style.cursor = ''; if (appData.currentMode === 'personal') { const companion = state.participants.find(p => p.type === 'received'); name = companion ? companion.name : '...'; status = state.status; letter = name.charAt(0).toUpperCase(); colorIndex = 1; headerName.style.cursor = 'pointer'; headerStatus.style.cursor = 'pointer'; } else { name = state.groupName; const count = state.displayParticipantCount; const word = getParticipantDeclension(count); status = `${count} ${word}`; letter = name.charAt(0).toUpperCase(); colorIndex = 0; headerName.style.cursor = 'pointer'; headerStatus.style.cursor = 'pointer'; } headerName.textContent = name; headerStatus.textContent = status; headerAvatar.textContent = letter; headerAvatar.style.backgroundColor = avatarColors[colorIndex % avatarColors.length]; }
    function updateMessageInDOM(messageId) { const state = appData[appData.currentMode]; const messageData = state.messages.find(m => m.id === messageId); if (!messageData) return; const wrapper = chatScreen.querySelector(`.message-wrapper[data-message-id="${messageId}"]`); if (!wrapper) return; const newElement = createMessageElement(messageData, state); if(newElement) { newElement.style.animation = 'none'; wrapper.replaceWith(newElement); } }


    // --- 5. ОСНОВНЫЕ ФУНКЦИИ ---
    function sendMessage() { const text = messageInput.value.trim(); if (!text) return; const state = appData[appData.currentMode]; const participant = state.participants.find(p => p.id === state.selectedParticipantId); const newMessage = { id: Date.now(), text, participantId: state.selectedParticipantId, time: appData.currentTime, status: 'sent' }; const updatedMessages = [...state.messages, newMessage]; updateState(data => ({ ...data, [data.currentMode]: { ...state, messages: updatedMessages } })); addMessageToDOM(newMessage, state); messageInput.value = ''; messageInput.style.height = 'auto'; messageInput.focus(); }
    function switchMode(newMode) { if (appData.currentMode === newMode) return; updateState(() => ({ currentMode: newMode })); renderAll(); }
    function selectParticipant(id) { const state = appData[appData.currentMode]; updateState(data => ({ ...data, [data.currentMode]: { ...state, selectedParticipantId: id } })); const selected = state.participants.find(p => p.id === id); if(selected) senderSelectorBtn.textContent = selected.name; participantsModal.overlay.classList.remove('visible'); }
    function changeMessageStatus(messageId) { const state = appData[appData.currentMode]; const messageIndex = state.messages.findIndex(m => m.id === messageId); if (messageIndex === -1) return; const message = state.messages[messageIndex]; const statuses = ['sent', 'delivered', 'read', 'none']; const currentIndex = statuses.indexOf(message.status); const nextIndex = (currentIndex + 1) % statuses.length; const updatedMessages = [...state.messages]; updatedMessages[messageIndex] = { ...message, status: statuses[nextIndex] }; updateState(data => ({ ...data, [data.currentMode]: { ...state, messages: updatedMessages } })); updateMessageInDOM(messageId); }


    // --- 6. УПРАВЛЕНИЕ УЧАСТНИКАМИ ---
    function openParticipantsModal() { const state = appData.group; participantsModal.list.innerHTML = ''; state.participants.forEach(p => { const li = document.createElement('li'); li.dataset.id = p.id; if(p.id === state.selectedParticipantId) li.classList.add('active-sender'); li.innerHTML = ` <span class="participant-name">${p.name}</span> <div class="participant-actions"> <button class="edit-btn" data-id="${p.id}" title="Редактировать">✏️</button> ${state.participants.length > 2 && p.id !== 1 ? `<button class="delete-btn" data-id="${p.id}" title="Удалить">🗑️</button>` : ''} </div> `; participantsModal.list.appendChild(li); }); participantsModal.addBtn.style.display = state.participants.length < 5 ? 'block' : 'none'; participantsModal.overlay.classList.add('visible'); }
    function addParticipant(name) { const state = appData.group; if (state.participants.length >= 5 || !name || !name.trim()) return; const newParticipant = { id: state.nextParticipantId, name: name.trim(), type: 'received' }; const updatedParticipants = [...state.participants, newParticipant]; updateState(data => ({ ...data, group: { ...state, participants: updatedParticipants, nextParticipantId: state.nextParticipantId + 1, displayParticipantCount: updatedParticipants.length } })); renderChatHeader(appData.group); openParticipantsModal(); }
    function editParticipantName(id, newName) { if (!newName || !newName.trim()) return; const state = appData.group; const updatedParticipants = state.participants.map(p => p.id === id ? { ...p, name: newName.trim() } : p); updateState(data => ({ ...data, group: { ...state, participants: updatedParticipants } })); renderAll(); openParticipantsModal(); }
    function deleteParticipant(id) { const state = appData.group; const updatedParticipants = state.participants.filter(p => p.id !== id); const updatedMessages = state.messages.filter(m => m.participantId !== id); const newSelectedId = state.selectedParticipantId === id ? 1 : state.selectedParticipantId; updateState(data => ({ ...data, group: { ...state, participants: updatedParticipants, messages: updatedMessages, selectedParticipantId: newSelectedId, displayParticipantCount: updatedParticipants.length } })); renderAll(); openParticipantsModal(); }


    // --- 7. ЭКСПОРТ ИЗОБРАЖЕНИЯ ---
    /**
     * ИЗМЕНЕНО: Полностью переписанная, надежная функция создания скриншота.
     */
async function createFinalCanvas() {
    // Сохраняем стили элементов, которые скрываем
    const elementsToHide = [topBar, colorPalette, messageComposer, exportControls];
    const originalDisplays = elementsToHide.map(el => el.style.display);
    const originalAppHeight = appContainer.style.height;
    const originalChatOverflow = chatScreen.style.overflowY;
    const originalChatHeight = chatScreen.style.height;

    let finalCanvas;

    try {
        // Скрываем ненужные элементы
        elementsToHide.forEach(el => el.style.display = 'none');

        // Задаем фиксированное соотношение 9:16 для финального изображения
        const targetWidth = 1080;
        const targetHeight = 1920;
        appContainer.style.height = `${targetHeight}px`;
        chatScreen.style.height = `${targetHeight}px`;
        chatScreen.style.overflowY = 'visible'; // Показываем все сообщения

        // Делаем небольшой таймаут для рендера
        await new Promise(resolve => setTimeout(resolve, 50));

        // Рендерим html2canvas
        finalCanvas = await html2canvas(appContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: targetWidth,
            height: targetHeight,
            scrollY: -window.scrollY, // Чтобы верхний контент корректно отрисовался
            scrollX: -window.scrollX,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight,
            backgroundColor: getComputedStyle(chatScreen).backgroundColor || '#f0f2f5'
        });

    } finally {
        // Восстанавливаем все стили
        elementsToHide.forEach((el, i) => el.style.display = originalDisplays[i]);
        appContainer.style.height = originalAppHeight;
        chatScreen.style.height = originalChatHeight;
        chatScreen.style.overflowY = originalChatOverflow;
    }

    return finalCanvas;
}

    
    async function exportChat() { const originalButtonText = exportBtn.textContent; exportBtn.disabled = true; exportBtn.textContent = 'Создание...'; try { const finalCanvas = await createFinalCanvas(); const imageUrl = finalCanvas.toDataURL("image/png"); exportPreview.img.src = imageUrl; exportPreview.overlay.classList.add('visible'); } catch (err) { console.error("Ошибка при создании изображения:", err); showCustomAlert("Ошибка", "Произошла ошибка при создании изображения."); } finally { exportBtn.disabled = false; exportBtn.textContent = originalButtonText; } }


    // --- 8. МОДАЛЬНЫЕ ОКНА ---
    function showModal({ title, bodyHtml, buttons, isStatusList = false }) { customModal.title.textContent = title; customModal.body.innerHTML = bodyHtml; customModal.footer.innerHTML = ''; if (buttons && buttons.length > 0) { buttons.forEach(btn => { const buttonEl = document.createElement('button'); buttonEl.textContent = btn.text; buttonEl.className = btn.class; buttonEl.onclick = () => { if (btn.handler) btn.handler(); closeCustomModal(); }; customModal.footer.appendChild(buttonEl); }); } customModal.body.style.padding = isStatusList ? '10px 0' : '20px'; customModal.overlay.classList.add('visible'); const input = customModal.body.querySelector('input'); if (input) input.focus(); }
    function closeCustomModal() { customModal.overlay.classList.remove('visible'); }
    function showCustomAlert(title, message) { showModal({ title, bodyHtml: `<p>${message}</p>`, buttons: [{ text: 'OK', class: 'primary' }] }); }
    function handleSetTime() { showModal({ title: 'Установить время', bodyHtml: `<input type="text" id="time-input" value="${appData.currentTime}" placeholder="ЧЧ:ММ">`, buttons: [{ text: 'Отмена', class: 'secondary' }, { text: 'Сохранить', class: 'primary', handler: () => { const newTime = document.getElementById('time-input').value; if (newTime && newTime.match(/^\d{1,2}:\d{2}$/)) { updateState(() => ({ currentTime: newTime })); } else if (newTime) { showCustomAlert('Ошибка', 'Неверный формат времени. Используйте ЧЧ:ММ.'); } } }] }); }
    function handleResetChat() { showModal({ title: 'Сбросить чат?', bodyHtml: '<p>Вы уверены, что хотите удалить все сообщения? Это действие нельзя отменить.</p>', buttons: [{ text: 'Отмена', class: 'secondary' }, { text: 'Удалить', class: 'danger', handler: () => { const state = appData[appData.currentMode]; updateState(data => ({ ...data, [data.currentMode]: { ...state, messages: [] } })); renderMessages(appData[appData.currentMode]); } }] }); }
    function handleEditParticipantCount() { showModal({ title: 'Введите кол-во участников', bodyHtml: `<input type="text" id="participant-count-input" value="${appData.group.displayParticipantCount}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" placeholder="Только цифры">`, buttons: [{ text: 'Отмена', class: 'secondary' }, { text: 'Сохранить', class: 'primary', handler: () => { const input = document.getElementById('participant-count-input'); const newCount = parseInt(input.value); if (!isNaN(newCount)) { updateState(data => ({ ...data, group: { ...data.group, displayParticipantCount: newCount } })); renderChatHeader(appData.group); } } }] }); }
    function handleEditChatName() { const mode = appData.currentMode; const state = appData[mode]; const currentName = mode === 'personal' ? state.participants.find(p => p.type === 'received').name : state.groupName; showModal({ title: 'Введите новое имя', bodyHtml: `<input type="text" id="chat-name-input" value="${currentName}" maxlength="25">`, buttons: [{ text: 'Отмена', class: 'secondary' }, { text: 'Сохранить', class: 'primary', handler: () => { const newName = document.getElementById('chat-name-input').value.trim(); if (newName) { if (mode === 'personal') { const updatedParticipants = state.participants.map(p => p.type === 'received' ? { ...p, name: newName } : p); updateState(data => ({ ...data, personal: { ...state, participants: updatedParticipants } })); } else { updateState(data => ({ ...data, group: { ...state, groupName: newName } })); } renderChatHeader(appData[mode]); } } }] }); }
    function handleSelectStatus() { const statusListHtml = `<ul class="participants-list">${statusOptions.map(status => `<li data-status="${status}">${status}</li>`).join('')}</ul>`; showModal({ title: 'Выберите статус', bodyHtml: statusListHtml, isStatusList: true }); const list = customModal.body.querySelector('.participants-list'); list.addEventListener('click', (e) => { const targetLi = e.target.closest('li'); if (targetLi && targetLi.dataset.status) { const newStatus = targetLi.dataset.status; updateState(data => ({ ...data, personal: { ...data.personal, status: newStatus } })); renderChatHeader(appData.personal); closeCustomModal(); } }); }


    // --- 9. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
    function init() {
        if (window.Telegram && window.Telegram.WebApp) { const tg = window.Telegram.WebApp; const applyTheme = () => document.documentElement.className = tg.colorScheme === 'dark' ? 'dark-mode' : ''; tg.onEvent('themeChanged', applyTheme); applyTheme(); }
        const setFixedViewportHeight = () => appContainer.style.height = `${window.innerHeight}px`;
        window.addEventListener('resize', setFixedViewportHeight);
        setFixedViewportHeight();
        colorPalette.innerHTML = backgroundOptions.map(bg => `<div class="color-swatch" data-bg='${bg.value}' style="background-image: ${bg.value};"></div>`).join('');
        
        modeSwitcher.addEventListener('click', (e) => { if (e.target.classList.contains('mode-btn')) switchMode(e.target.dataset.mode); });
        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }});
        messageInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = `${this.scrollHeight}px`; });
        exportBtn.addEventListener('click', exportChat);
        changeBgBtn.addEventListener('click', () => colorPalette.classList.toggle('visible'));
        resetChatBtn.addEventListener('click', handleResetChat);
        setTimeBtn.addEventListener('click', handleSetTime);
        senderSelectorBtn.addEventListener('click', () => { if (appData.currentMode === 'personal') { const currentId = appData.personal.selectedParticipantId; selectParticipant(currentId === 1 ? 2 : 1); } else { openParticipantsModal(); } });
        colorPalette.addEventListener('click', (e) => { if (e.target.classList.contains('color-swatch')) { const newBg = e.target.dataset.bg; const state = appData[appData.currentMode]; updateState(() => ({ [appData.currentMode]: { ...state, currentBackground: newBg } })); renderAll(); } });
        chatScreen.addEventListener('click', (e) => { const wrapper = e.target.closest('.message-wrapper'); if(wrapper) { changeMessageStatus(Number(wrapper.dataset.messageId)); } });
        document.addEventListener('click', (e) => { if (colorPalette.classList.contains('visible') && !colorPalette.contains(e.target) && !changeBgBtn.contains(e.target)) { colorPalette.classList.remove('visible'); } });
        participantsModal.closeBtn.addEventListener('click', () => participantsModal.overlay.classList.remove('visible'));
        participantsModal.overlay.addEventListener('click', (e) => { if (e.target === participantsModal.overlay) participantsModal.overlay.classList.remove('visible'); });
        participantsModal.addBtn.addEventListener('click', () => { showModal({ title: 'Новый участник', bodyHtml: `<input type="text" id="new-participant-input" placeholder="Имя участника">`, buttons: [{ text: 'Отмена', class: 'secondary' }, { text: 'Добавить', class: 'primary', handler: () => addParticipant(document.getElementById('new-participant-input').value) }] }); });
        participantsModal.list.addEventListener('click', (e) => { const targetLi = e.target.closest('li'); const editBtn = e.target.closest('.edit-btn'); const deleteBtn = e.target.closest('.delete-btn'); if (editBtn) { const id = parseInt(editBtn.dataset.id); const p = appData.group.participants.find(p => p.id === id); showModal({ title: 'Редактировать имя', bodyHtml: `<input type="text" id="edit-name-input" value="${p.name}">`, buttons: [{ text: 'Отмена', class: 'secondary' }, { text: 'Сохранить', class: 'primary', handler: () => editParticipantName(id, document.getElementById('edit-name-input').value) }] }); } else if (deleteBtn) { deleteParticipant(parseInt(deleteBtn.dataset.id)); } else if (targetLi) { selectParticipant(parseInt(targetLi.dataset.id)); } });
        exportPreview.overlay.addEventListener('click', () => exportPreview.overlay.classList.remove('visible'));
        customModal.overlay.addEventListener('click', (e) => { if(e.target === customModal.overlay) closeCustomModal(); });
        
        headerName.addEventListener('click', handleEditChatName);
        headerStatus.addEventListener('click', () => { if (appData.currentMode === 'group') { handleEditParticipantCount(); } else { handleSelectStatus(); } });

        loadState();
        renderAll();
    }

    init();
});
