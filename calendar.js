document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Ready: initializing FullCalendar...');

  const allDayCheckbox = document.getElementById('eventAllDay');
  const endGroup = document.getElementById('endDateGroup');
  const eventColorSelect = document.getElementById('eventColor');
  const colorPreview = document.getElementById('colorPreview');

  // Color class to hex fallback
  const bootstrapColors = {
    primary: '#0d6efd',
    secondary: '#6c757d',
    success: '#198754',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#0dcaf0',
    light: '#f8f9fa',
    // dark: '#212529',
  };

  function toggleEndField() {
    if (allDayCheckbox.checked) {
      endGroup.classList.add('d-none');
    } else {
      endGroup.classList.remove('d-none');
    }
  }

  if (allDayCheckbox && endGroup) {
    allDayCheckbox.addEventListener('change', toggleEndField);
    toggleEndField(); // Initial check
  }

  if (eventColorSelect && colorPreview) {
    eventColorSelect.addEventListener('change', e => {
      const colorClass = e.target.value;
      const hex = bootstrapColors[colorClass] || '#3788d8';
      colorPreview.style.backgroundColor = hex;
    });

    // Trigger preview update on load
    const initialColor = eventColorSelect.value;
    colorPreview.style.backgroundColor = bootstrapColors[initialColor] || '#3788d8';
  }

  setTimeout(() => {
    const { Calendar } = window.FullCalendarNamespace;
    const dayGridPlugin = window.FullCalendarNamespace.dayGridPlugin;
    const timeGridPlugin = window.FullCalendarNamespace.timeGridPlugin;
    const listPlugin = window.FullCalendarNamespace.listPlugin;
    const interactionPlugin = window.FullCalendarNamespace.interactionPlugin;

    if (!Calendar || !dayGridPlugin) {
      console.error('❌ Required FullCalendar plugins not loaded.');
      return;
    }

    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
      console.error('❌ #calendar element not found.');
      return;
    }

    const calendar = new Calendar(calendarEl, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
      },
      selectable: true,
      editable: true,

      eventDidMount: function(info) {
        // Force all event text to use black for contrast on light backgrounds
        info.el.style.color = 'black';
      },

      events: (fetchInfo, successCallback, failureCallback) => {
        toggleLoader(true);
        const fetchPayload = {
          system: 'calendar',
          action: 'getEvents',
          start: fetchInfo.startStr,
          end: fetchInfo.endStr
        };

        fetch(scriptURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fetchPayload)
        })
        .then(res => res.json())
        .then(response => {
          if (response.success && Array.isArray(response.data)) {
            const events = response.data.map(ev => {
              const colorKey = ev.color;
              const colorHex = bootstrapColors[colorKey] || colorKey || '#3788d8';

              return {
                id: ev.eventID,
                title: ev.title,
                start: ev.start,
                end: ev.end,
                allDay: ev.allDay === true || ev.allDay === 'TRUE' || (!ev.start.includes('T')),
                backgroundColor: colorHex,
                borderColor: colorHex,
                textColor: '#fff',
                extendedProps: {
                  description: ev.description || '',
                  status: ev.status || '',
                  category: ev.category || ''
                }
              };
            });
            successCallback(events);
          } else {
            failureCallback('Could not fetch events.');
            showToast('⚠️ Failed to load events', 'danger');
          }
        })
        .catch(err => {
          console.error('❌ Fetch error:', err);
          failureCallback(err.message);
          showToast("⚠️ " + err.message, 'danger');
        })
        .finally(() => toggleLoader(false));
      },

      select(info) {
        const form = document.getElementById('eventForm');
        form.reset();
        form.dataset.editing = 'false';
        form.dataset.eventId = '';

        document.getElementById('eventTitle').value = '';
        document.getElementById('eventStart').value = info.startStr;
        document.getElementById('eventEnd').value = info.endStr;
        document.getElementById('eventAllDay').checked = info.allDay;
        toggleEndField();

        document.getElementById('eventStatus').value = 'scheduled';
        document.getElementById('eventCategory').value = '';
        document.getElementById('eventDescription').value = '';
        eventColorSelect.value = 'primary';
        colorPreview.style.backgroundColor = bootstrapColors['primary'];

        document.getElementById('deleteEventBtn').style.display = 'none';
        new bootstrap.Modal(document.getElementById('addEventModal')).show();
      },

    eventClick: function(info) {
      const event = info.event;
      const form = document.getElementById('eventForm');

      form.dataset.editing = 'true';
      form.dataset.eventId = event.id;

      document.getElementById('eventTitle').value = event.title;

      const startInput = document.getElementById('eventStart');
      const endInput = document.getElementById('eventEnd');

      // Safely parse start
      if (event.start instanceof Date && !isNaN(event.start)) {
        startInput.value = formatDateTimeLocal(event.start);
      } else {
        startInput.value = '';
      }

      if (event.end instanceof Date && !isNaN(event.end)) {
        endInput.value = formatDateTimeLocal(event.end);
      } else {
        endInput.value = '';
      }

      document.getElementById('eventAllDay').checked = event.allDay;
      toggleEndField();

      document.getElementById('eventStatus').value = event.extendedProps.status || '';
      document.getElementById('eventCategory').value = event.extendedProps.category || '';
      document.getElementById('eventDescription').value = event.extendedProps.description || '';

      let selectedColor = Object.keys(bootstrapColors).find(
        key => bootstrapColors[key] === event.backgroundColor
      ) || 'light';

      eventColorSelect.value = selectedColor;
      colorPreview.style.backgroundColor = bootstrapColors[selectedColor];

      document.getElementById('deleteEventBtn').style.display = 'inline-block';
      new bootstrap.Modal(document.getElementById('addEventModal')).show();
    },

      eventDrop(info) {
        updateEvent(info.event);
      },

      eventResize(info) {
        updateEvent(info.event);
      }
    });

    calendar.render();

    document.getElementById('eventForm').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      const title = document.getElementById('eventTitle').value.trim();
      if (!title) return showToast('⚠️ Event title required.', 'warning');

    const startInput = document.getElementById('eventStart').value;
    let endInput = document.getElementById('eventEnd').value;
    const isAllDay = allDayCheckbox.checked;

    // If all day and end is missing, set end = start + 1 day
    if (isAllDay && (!endInput || endInput.trim() === '')) {
      const startDate = new Date(startInput);
      startDate.setDate(startDate.getDate() + 1);
      endInput = startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }

    const eventData = {
      system: 'calendar',
      action: form.dataset.editing === 'true' ? 'editEvent' : 'addEvent',
      ...(form.dataset.editing === 'true' && { eventID: form.dataset.eventId }),
      eventInfo: {
        title,
        start: startInput,
        end: endInput,
        allDay: isAllDay,
        status: document.getElementById('eventStatus').value,
        category: document.getElementById('eventCategory').value,
        description: document.getElementById('eventDescription').value,
        color: eventColorSelect.value
      }
    };

      toggleLoader(true);
      fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      .then(res => res.json())
      .then(response => {
        if (response.success) {
          calendar.refetchEvents();
          bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();
          form.reset();
          showToast('✅ Event saved', 'success');
        } else {
          showToast("⚠️ Save error: " + (response.error || 'Unknown issue'), 'danger');
        }
      })
      .catch(err => {
        showToast("⚠️ " + err.message, 'danger');
      })
      .finally(() => toggleLoader(false));
    });

    document.getElementById('deleteEventBtn').addEventListener('click', () => {
      const form = document.getElementById('eventForm');
      const eventId = form.dataset.eventId;
      if (!eventId) return showToast('⚠️ No event to delete.', 'warning');

      const payload = {
        system: 'calendar',
        action: 'deleteEvent',
        eventID: eventId
      };

      toggleLoader(true);
      fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(response => {
        if (response.success) {
          calendar.refetchEvents();
          bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();
          showToast('🗑️ Event deleted', 'success');
        } else {
          showToast("⚠️ Delete failed", 'danger');
        }
      })
      .catch(err => {
        showToast("⚠️ " + err.message, 'danger');
      })
      .finally(() => toggleLoader(false));
    });

    function updateEvent(event) {
      const payload = {
        system: 'calendar',
        action: 'editEvent',
        eventID: event.id,
        eventInfo: {
          title: event.title,
          start: event.startStr,
          end: event.endStr || event.startStr,
          allDay: event.allDay
        }
      };

      toggleLoader(true);
      fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(response => {
        if (!response.success) {
          showToast('⚠️ Failed to update event.', 'danger');
        }
      })
      .catch(err => {
        showToast("⚠️ " + err.message, 'danger');
      })
      .finally(() => toggleLoader(false));
    }
  }, 200);
});

function formatDateTimeLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
