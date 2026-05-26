const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzAfGJXv4aatclHflxYMJhqna29zmOiQ3fcE8wQTDN47hDMzRJj8k4GljZYot2c4BacPQ/exec';
const PAGE_PARAMS = new URLSearchParams(location.search);
const API_URL = PAGE_PARAMS.get('apiUrl') || PAGE_PARAMS.get('api') || DEFAULT_API_URL;
const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const STORAGE_KEY = 'wink.agent.name';

const state = {
  month: '',
  agent: '',
  filter: 'open',
  data: null,
  activeGroup: null
};

const $ = (id) => document.getElementById(id);

function boot() {
  state.month = new URLSearchParams(location.search).get('month') || currentMonth();
  state.agent = localStorage.getItem(STORAGE_KEY) || '';
  $('monthInput').value = state.month;
  $('agentSelect').value = state.agent;
  bindEvents();
  loadData();
}

function bindEvents() {
  $('reloadButton').addEventListener('click', loadData);
  $('monthInput').addEventListener('change', () => {
    state.month = $('monthInput').value;
    loadData();
  });
  $('prevMonth').addEventListener('click', () => shiftMonth(-1));
  $('nextMonth').addEventListener('click', () => shiftMonth(1));
  $('agentSelect').addEventListener('change', () => {
    state.agent = $('agentSelect').value;
    localStorage.setItem(STORAGE_KEY, state.agent);
    render();
  });
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      render();
    });
  });
  $('modalClose').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (event) => {
    if (event.target === $('modal')) closeModal();
  });
}

function shiftMonth(offset) {
  const [year, month] = state.month.split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  state.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  $('monthInput').value = state.month;
  loadData();
}

function loadData() {
  setStatus('달력을 불러오는 중...');
  jsonp({ api: 'agentData', month: state.month, agent: state.agent })
    .then((data) => {
      if (!data || data.ok === false) throw new Error(data && data.message ? data.message : '데이터를 불러오지 못했습니다.');
      state.data = data;
      state.month = data.month || state.month;
      $('monthInput').value = state.month;
      render();
      setStatus(`${state.month} 이벤트 ${data.eventCount || 0}개를 불러왔습니다.`);
    })
    .catch((error) => {
      setStatus(error.message || String(error), true);
      showToast(error.message || String(error));
    });
}

function render() {
  if (!state.data) return;
  renderAgents();
  renderCounts();
  renderSidebar();
  renderCalendar();
}

function renderAgents() {
  const select = $('agentSelect');
  const activeAgents = (state.data.agentRecords || [])
    .filter((agent) => agent.status !== '업무종료')
    .map((agent) => agent.name);
  const names = unique(activeAgents.length ? activeAgents : (state.data.agents || []).filter((name) => !/^Pilih /.test(name)));
  const selected = state.agent;
  select.innerHTML = '<option value="">에이전트를 선택하세요</option>' + names.map((name) => {
    return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
  }).join('');
  if (selected && names.includes(selected)) select.value = selected;
}

function renderCounts() {
  const counts = { open: 0, pending: 0, approved: 0, db: 0 };
  collectSlots().forEach((item) => {
    const status = slotStatus(item.slot);
    counts[status] += 1;
    if (status === 'approved' && item.slot.agent) counts.db += 1;
  });
  $('countOpen').textContent = counts.open;
  $('countPending').textContent = counts.pending;
  $('countApproved').textContent = counts.approved;
  $('countDb').textContent = counts.db;
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === state.filter);
  });
}

function renderSidebar() {
  const mine = collectSlots()
    .filter((item) => state.agent && item.slot.agent === state.agent)
    .sort(sortSlotItems);
  $('myList').innerHTML = mine.length ? mine.slice(0, 20).map((item) => {
    return `<button class="side-item" type="button" data-open-group="${escapeHtml(groupKey(item.day.date, item.event.id))}">
      <strong>${escapeHtml(item.event.venue)}</strong>
      <span>${escapeHtml(item.day.date)} · ${escapeHtml(timeText(item.slot))} · ${statusText(slotStatus(item.slot))}</span>
    </button>`;
  }).join('') : '<span class="empty">신청한 일정이 없습니다.</span>';

  const missingDb = mine.filter((item) => slotStatus(item.slot) === 'approved' && !item.slot.db);
  $('dbMissingList').innerHTML = missingDb.length ? missingDb.slice(0, 12).map((item) => {
    return `<button class="side-item" type="button" data-open-group="${escapeHtml(groupKey(item.day.date, item.event.id))}">
      <strong>${escapeHtml(item.event.venue)}</strong>
      <span>${escapeHtml(item.day.date)} · ${escapeHtml(timeText(item.slot))}</span>
    </button>`;
  }).join('') : '<span class="empty">없음</span>';

  document.querySelectorAll('[data-open-group]').forEach((button) => {
    button.addEventListener('click', () => openGroup(button.dataset.openGroup));
  });
}

function renderCalendar() {
  const calendar = $('calendar');
  const weekdayHtml = WEEKDAYS.map((day, index) => {
    const cls = index === 5 ? ' sat' : index === 6 ? ' sun' : '';
    return `<div class="weekday${cls}">${day}</div>`;
  }).join('');
  const dayHtml = (state.data.weeks || []).map((week) => {
    return week.map((day) => renderDayCell(day)).join('');
  }).join('');
  calendar.innerHTML = weekdayHtml + dayHtml;
  calendar.querySelectorAll('[data-open-event]').forEach((button) => {
    button.addEventListener('click', () => openGroup(button.dataset.openEvent));
  });
}

function renderDayCell(day) {
  if (!day) return '<div class="day-cell empty"></div>';
  const dayName = WEEKDAYS[(day.weekday + 6) % 7] || '';
  const dayClass = day.weekday === 6 ? ' sat' : day.weekday === 0 ? ' sun' : '';
  const visibleEvents = (day.events || []).filter((event) => {
    return (event.slots || []).some((slot) => isVisibleSlot(slot));
  });
  const cards = visibleEvents.map((event, index) => renderEventCard(day, event, index)).join('');
  return `<div class="day-cell${dayClass}">
    <div class="day-head"><span class="day-num">${day.day}</span><span class="day-name">${escapeHtml(dayName)}</span></div>
    <div class="event-list">${cards}</div>
  </div>`;
}

function renderEventCard(day, event, index) {
  const summary = summarizeSlots(event.slots || []);
  return `<button class="event-card color-${index % 4}" type="button" data-open-event="${escapeHtml(groupKey(day.date, event.id))}">
    <strong>${escapeHtml(event.venue)}</strong>
    <span class="event-meta">
      <span class="count-dot open" title="선택 가능"><b>${summary.open}</b> 가능</span>
      <span class="count-dot pending" title="승인중"><b>${summary.pending}</b> 승인</span>
      <span class="count-dot approved" title="승인완료"><b>${summary.approved}</b> 완료</span>
    </span>
  </button>`;
}

function openGroup(key) {
  const group = findGroup(key);
  if (!group) return;
  state.activeGroup = key;
  const dayName = WEEKDAYS[(group.day.weekday + 6) % 7] || '';
  $('modalTitle').textContent = group.event.venue;
  $('modalMeta').textContent = `${group.day.date} · ${dayName} · ${group.event.slots.length}개 슬롯`;
  $('slotTable').innerHTML = renderSlotTable(group);
  $('modal').classList.add('open');
  $('modal').setAttribute('aria-hidden', 'false');
  bindSlotActions();
}

function closeModal() {
  $('modal').classList.remove('open');
  $('modal').setAttribute('aria-hidden', 'true');
  state.activeGroup = null;
}

function renderSlotTable(group) {
  const rows = (group.event.slots || [])
    .slice()
    .sort((a, b) => timeToMinutes(timeText(a)) - timeToMinutes(timeText(b)) || Number(a.slot) - Number(b.slot))
    .map((slot) => renderSlotRow(group.day, group.event, slot))
    .join('');
  return `<div class="slot-event-title">${escapeHtml(group.event.venue)}</div>${rows}`;
}

function renderSlotRow(day, event, slot) {
  const time = splitTime(timeText(slot));
  const agentValue = slot.agent || state.agent || '';
  const agentOptions = agentOptionsHtml(agentValue);
  const status = slotStatus(slot);
  const cls = teamClass(agentValue);
  const action = actionButtonHtml(status, slot);
  return `<div class="slot-row ${escapeHtml(cls)}"
    data-date="${escapeHtml(day.date)}"
    data-event-id="${escapeHtml(event.id)}"
    data-event-name="${escapeHtml(event.venue)}"
    data-base-time="${escapeHtml(slot.baseTime || slot.time)}"
    data-time="${escapeHtml(slot.time || slot.baseTime)}"
    data-slot="${Number(slot.slot)}"
    data-db="${escapeHtml(slot.db || '')}"
    data-status="${escapeHtml(slot.status || '')}">
    <div class="slot-cell"><select data-start>${timeOptionsHtml(time.start)}</select></div>
    <div class="slot-cell"><select data-end>${timeOptionsHtml(time.end)}</select></div>
    <div class="slot-cell agent"><select data-agent>${agentOptions}</select></div>
    <div class="slot-cell action">${action}</div>
  </div>`;
}

function actionButtonHtml(status) {
  if (status === 'open') return '<button class="slot-action" data-claim type="button">선점</button>';
  if (status === 'pending') return '<button class="slot-action pending" type="button" disabled>승인중</button>';
  return '<button class="slot-action done" type="button" disabled>승인완료</button>';
}

function bindSlotActions() {
  document.querySelectorAll('[data-claim]').forEach((button) => {
    button.addEventListener('click', () => claimSlot(button.closest('.slot-row')));
  });
  document.querySelectorAll('[data-save-db]').forEach((button) => {
    button.addEventListener('click', () => saveDb(button.closest('.slot-row')));
  });
}

function claimSlot(row) {
  const payload = payloadFromRow(row, '승인대기');
  if (!payload.agent) {
    showToast('에이전트를 먼저 선택해주세요.');
    return;
  }
  showToast('신청되었습니다. 팀리더 승인 대기중입니다.');
  setStatus('신청되었습니다. 저장 중입니다.');
  setRowBusy(row, true);
  applyLocalSlot(payload);
  renderAfterSlotChange();
  jsonp(Object.assign({ api: 'claimSlot' }, payload))
    .then((result) => {
      if (!result || result.ok === false) throw new Error(result && result.message ? result.message : '선점하지 못했습니다.');
      showToast('신청되었습니다. 팀리더 승인 대기중입니다.');
      loadData();
    })
    .catch((error) => {
      showToast(error.message || String(error));
      loadData();
    })
    .finally(() => setRowBusy(row, false));
}

function saveDb(row) {
  const status = row.dataset.status || '배정완료';
  const payload = payloadFromRow(row, status);
  if (!payload.agent) {
    showToast('에이전트 정보가 없습니다.');
    return;
  }
  setRowBusy(row, true);
  applyLocalSlot(payload);
  renderAfterSlotChange();
  jsonp(Object.assign({ api: 'saveDb' }, payload))
    .then((result) => {
      if (!result || result.ok === false) throw new Error(result && result.message ? result.message : 'DB를 저장하지 못했습니다.');
      showToast('DB를 저장했습니다.');
      loadData();
    })
    .catch((error) => {
      showToast(error.message || String(error));
      loadData();
    })
    .finally(() => setRowBusy(row, false));
}

function payloadFromRow(row, status) {
  const start = row.querySelector('[data-start]').value;
  const end = row.querySelector('[data-end]').value;
  const time = `${start}~${end}`;
  const agent = row.querySelector('[data-agent]').value;
  if (agent) {
    state.agent = agent;
    $('agentSelect').value = agent;
    localStorage.setItem(STORAGE_KEY, agent);
  }
  return {
    date: row.dataset.date,
    eventId: row.dataset.eventId,
    eventName: row.dataset.eventName,
    baseTime: row.dataset.baseTime,
    time,
    customTime: time,
    slot: row.dataset.slot,
    agent,
    db: row.querySelector('[data-db]') ? row.querySelector('[data-db]').value : (row.dataset.db || ''),
    status
  };
}

function renderAfterSlotChange() {
  renderCounts();
  renderSidebar();
  renderCalendar();
  if (state.activeGroup) openGroup(state.activeGroup);
}

function applyLocalSlot(payload) {
  const slot = findSlot(payload);
  if (!slot) return;
  slot.time = payload.time;
  slot.agent = payload.agent;
  slot.db = payload.db;
  slot.status = payload.status;
}

function findSlot(payload) {
  let found = null;
  (state.data.weeks || []).forEach((week) => {
    week.forEach((day) => {
      if (!day || day.date !== payload.date) return;
      (day.events || []).forEach((event) => {
        if (String(event.id) !== String(payload.eventId)) return;
        (event.slots || []).forEach((slot) => {
          const baseTime = slot.baseTime || slot.time;
          if (String(baseTime) === String(payload.baseTime) && Number(slot.slot) === Number(payload.slot)) found = slot;
        });
      });
    });
  });
  return found;
}

function findGroup(key) {
  let found = null;
  (state.data.weeks || []).forEach((week) => {
    week.forEach((day) => {
      if (!day) return;
      (day.events || []).forEach((event) => {
        if (groupKey(day.date, event.id) === key) found = { day, event };
      });
    });
  });
  return found;
}

function collectSlots() {
  const items = [];
  if (!state.data) return items;
  (state.data.weeks || []).forEach((week) => {
    week.forEach((day) => {
      if (!day) return;
      (day.events || []).forEach((event) => {
        (event.slots || []).forEach((slot) => items.push({ day, event, slot }));
      });
    });
  });
  return items;
}

function isVisibleSlot(slot) {
  const status = slotStatus(slot);
  if (state.filter === 'db') return status === 'approved' && slot.agent;
  return status === state.filter;
}

function slotStatus(slot) {
  if (!slot.agent) return 'open';
  return slot.status === '배정완료' ? 'approved' : 'pending';
}

function statusText(status) {
  if (status === 'approved') return '승인완료';
  if (status === 'pending') return '승인중';
  return '선택 가능';
}

function summarizeSlots(slots) {
  return (slots || []).reduce((acc, slot) => {
    const status = slotStatus(slot);
    acc[status] += 1;
    return acc;
  }, { open: 0, pending: 0, approved: 0 });
}

function groupKey(date, eventId) {
  return `${date}__${eventId}`;
}

function teamClass(agent) {
  const key = state.data && state.data.agentTeams ? state.data.agentTeams[agent] : '';
  return key || '';
}

function agentOptionsHtml(selected) {
  const activeAgents = (state.data.agentRecords || [])
    .filter((agent) => agent.status !== '업무종료')
    .map((agent) => agent.name);
  const names = unique(activeAgents.length ? activeAgents : (state.data.agents || []).filter((name) => !/^Pilih /.test(name)));
  return '<option value="">선택</option>' + names.map((name) => {
    const selectedAttr = name === selected ? 'selected' : '';
    return `<option value="${escapeHtml(name)}" ${selectedAttr}>${escapeHtml(name)}</option>`;
  }).join('');
}

function timeOptionsHtml(selected) {
  const normalized = normalizeTimePoint(selected);
  const options = timeOptions();
  const list = normalized && !options.includes(normalized) ? [normalized].concat(options) : options;
  return unique(list).map((time) => {
    const selectedAttr = time === normalized ? 'selected' : '';
    return `<option value="${time}" ${selectedAttr}>${time}</option>`;
  }).join('');
}

function timeOptions() {
  const rows = [];
  for (let hour = 9; hour <= 21; hour += 1) {
    rows.push(`${String(hour).padStart(2, '0')}:00`);
    rows.push(`${String(hour).padStart(2, '0')}:30`);
  }
  rows.push('22:00');
  return rows;
}

function splitTime(value) {
  const text = String(value || '').replace(/\s+/g, '').replace('-', '~');
  const parts = text.split('~');
  return { start: normalizeTimePoint(parts[0]), end: normalizeTimePoint(parts[1]) };
}

function timeText(slot) {
  return slot.time || slot.baseTime || '';
}

function normalizeTimePoint(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2})[:.]?(\d{2})$/);
  if (!match) return text;
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
}

function timeToMinutes(value) {
  const start = splitTime(value).start;
  const match = start.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 99999;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sortSlotItems(a, b) {
  return a.day.date.localeCompare(b.day.date)
    || timeToMinutes(timeText(a.slot)) - timeToMinutes(timeText(b.slot))
    || a.event.venue.localeCompare(b.event.venue);
}

function jsonp(params) {
  const callback = `__winkAgent${Date.now()}${Math.random().toString(16).slice(2)}`;
  const query = new URLSearchParams(Object.assign({}, params, { callback }));
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('요청 시간이 초과되었습니다.'));
    }, 25000);

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('API 연결에 실패했습니다.'));
    };

    function cleanup() {
      clearTimeout(timer);
      delete window[callback];
      script.remove();
    }

    script.src = `${API_URL}?${query.toString()}`;
    document.body.appendChild(script);
  });
}

function setRowBusy(row, busy) {
  if (!row) return;
  row.querySelectorAll('button, input, select').forEach((node) => {
    node.disabled = Boolean(busy);
  });
}

function setStatus(message, isError) {
  $('statusLine').textContent = message;
  $('statusLine').style.color = isError ? 'var(--red)' : 'var(--muted)';
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function unique(items) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', boot);
