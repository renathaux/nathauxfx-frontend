(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('replayCalendar');
  const month = $('calendarMonth');
  const year = $('calendarYear');
  let field = null;
  let selectedDay = 1;
  let opener = null;
  const pad = value => String(value).padStart(2, '0');
  const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' });
  const fullDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });

  for (let index = 0; index < 12; index++) {
    month.add(new Option(monthName.format(new Date(2024, index, 1)), String(index)));
  }

  function render() {
    const y = Number(year.value), m = Number(month.value);
    const days = new Date(y, m + 1, 0).getDate();
    selectedDay = Math.min(selectedDay, days);
    const grid = $('calendarDays');
    grid.replaceChildren();
    for (let offset = 0; offset < new Date(y, m, 1).getDay(); offset++) {
      grid.appendChild(document.createElement('span'));
    }
    for (let day = 1; day <= days; day++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.day = String(day);
      button.textContent = String(day);
      button.setAttribute('aria-label', fullDate.format(new Date(y, m, day)));
      button.setAttribute('aria-pressed', String(day === selectedDay));
      button.addEventListener('click', () => {
        selectedDay = day;
        for (const item of grid.querySelectorAll('button')) {
          item.setAttribute('aria-pressed', String(Number(item.dataset.day) === day));
        }
      });
      grid.appendChild(button);
    }
    $('calendarPrevious').disabled = m === 0 && year.selectedIndex === 0;
    $('calendarNext').disabled = m === 11 && year.selectedIndex === year.options.length - 1;
  }

  function open(target) {
    field = target;
    opener = $(field + 'CalendarBtn');
    year.replaceChildren(...Array.from($(field + 'Year').options, option => option.cloneNode(true)));
    year.value = $(field + 'Year').value;
    const value = $(field + 'Date').value.match(/^(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
    const now = new Date();
    month.value = String(value ? Math.max(0, Math.min(11, Number(value[1]) - 1)) : now.getMonth());
    selectedDay = value ? Math.max(1, Number(value[2])) : now.getDate();
    $('calendarTime').value = value && Number(value[3]) < 24 && Number(value[4]) < 60
      ? `${value[3]}:${value[4]}` : `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    $('calendarTitle').textContent = `${field === 'start' ? 'Start' : 'End'} date & time`;
    render();
    opener.setAttribute('aria-expanded', 'true');
    dialog.showModal();
    $('calendarDays').querySelector('[aria-pressed="true"]')?.focus();
  }

  function moveMonth(delta) {
    const date = new Date(Number(year.value), Number(month.value) + delta, 1);
    if (!Array.from(year.options).some(option => Number(option.value) === date.getFullYear())) return;
    year.value = String(date.getFullYear());
    month.value = String(date.getMonth());
    render();
  }

  for (const target of ['start', 'end']) $(target + 'CalendarBtn').addEventListener('click', () => open(target));
  month.addEventListener('change', render);
  year.addEventListener('change', render);
  $('calendarPrevious').addEventListener('click', () => moveMonth(-1));
  $('calendarNext').addEventListener('click', () => moveMonth(1));
  $('calendarCancel').addEventListener('click', () => dialog.close());
  $('calendarClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    opener?.setAttribute('aria-expanded', 'false');
    opener?.focus();
  });
  $('calendarForm').addEventListener('submit', event => {
    event.preventDefault();
    const value = `${pad(Number(month.value) + 1)}-${pad(selectedDay)} ${$('calendarTime').value}`;
    const dateInput = $(field + 'Date'), yearInput = $(field + 'Year');
    yearInput.value = year.value;
    dateInput.value = value;
    yearInput.dispatchEvent(new Event('change', { bubbles: true }));
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    dialog.close();
  });
})();
