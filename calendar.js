// FullCalendar Integration with Bootstrap Modal, Toasts, and Loader

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Ready: initializing FullCalendar...');

  setTimeout(() => {
    const { Calendar } = window.FullCalendar;
    const dayGridPlugin = window.FullCalendar.DayGrid?.default || window.FullCalendar.DayGrid;
    const timeGridPlugin = window.FullCalendar.TimeGrid?.default || window.FullCalendar.TimeGrid;
    const listPlugin = window.FullCalendar.List?.default || window.FullCalendar.List;
    const interactionPlugin = window.FullCalendar.Interaction?.default || window.FullCalendar.Interaction;

    if (!Calendar || !dayGridPlugin) {
      console.error('❌ Required plugins not loaded!');
      return;
    }

    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
      console.error('❌ #calendar element not found!');
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
      events: (fetchInfo, successCallback, failureCallback) => {
        toggleLoader(true);
        const fetchPayload = {
          system: 'calendar',
          action: 'getEvents',
          start: fetchInfo.startStr,
          end: fetchInfo.endStr
        };
        console.log('📡 Fetching events:', fetchPayload);

        fetch(scriptURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fetchPayload)
        })
        .then(res => res.json())
        .then(response => {
          console.log('📥 Event fetch response:', response);
          if (response.success && Array.isArray(response.data)) {
            const events = response.data.map(ev => ({
              id: ev.eventID,
              title: ev.title,
              start: ev.start,
              end: ev.end,
              allDay: ev.allDay === true || ev.allDay === 'TRUE' || (!ev.start.includes('T')),
              color: ev.color || '',
              extendedProps: {
                description: ev.description || '',
                status: ev.status || '',
                category: ev.category || ''
              }
            }));
            successCallback(events);
          } else {
            failureCallback(response.error || 'Failed to fetch events.');
            showToast("⚠️ " + (response.error || 'Could not load events'), 'danger');
          }
        })
        .catch(err => {
          console.error('❌ Fetch error:', err);
          failureCallback(err);
          showToast("⚠️ " + err.message, 'danger');
        })
        .finally(() => toggleLoader(false));
      },
      selectable: true,
      editable: true,

      select(info) {
        const form = document.getElementById('eventForm');
        form.reset();
        form.dataset.editing = 'false';
        form.dataset.eventId = '';

        document.getElementById('eventTitle').value = '';
        document.getElementById('eventStart').value = info.startStr;
        document.getElementById('eventEnd').value = info.endStr;
        document.getElementById('eventAllDay').value = info.allDay;

        document.getElementById('eventStatus').value = 'scheduled';
        document.getElementById('eventCategory').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventColor').value = '#3788d8';

        document.getElementById('deleteEventBtn').style.display = 'none';

        new bootstrap.Modal(document.getElementById('addEventModal')).show();
      },

      eventClick(info) {
        const event = info.event;
        const form = document.getElementById('eventForm');

        form.dataset.editing = 'true';
        form.dataset.eventId = event.id;

        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventStart').value = event.startStr;
        document.getElementById('eventEnd').value = event.endStr || '';
        document.getElementById('eventAllDay').checked = info.allDay;

        document.getElementById('eventStatus').value = event.extendedProps.status || '';
        document.getElementById('eventCategory').value = event.extendedProps.category || '';
        document.getElementById('eventDescription').value = event.extendedProps.description || '';
        document.getElementById('eventColor').value = event.backgroundColor || '#3788d8';

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

      const payload = {
        system: 'calendar',
        action: form.dataset.editing === 'true' ? 'editEvent' : 'addEvent',
        ...(form.dataset.editing === 'true' && { eventID: form.dataset.eventId }), // ⬅️ Moved here
        eventInfo: {
          title,
          start: document.getElementById('eventStart').value,
          end: document.getElementById('eventEnd').value,
          allDay: document.getElementById('eventAllDay').checked,
          status: document.getElementById('eventStatus').value,
          category: document.getElementById('eventCategory').value,
          description: document.getElementById('eventDescription').value,
          color: document.getElementById('eventColor').value
        }
      };

      console.log('📤 Submitting event:', payload);

      toggleLoader(true);
      fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(response => {
        console.log('📥 Save response:', response);
        if (response.success) {
          calendar.refetchEvents();
          bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();
          form.reset();
          form.dataset.editing = 'false';
          form.dataset.eventId = '';
          showToast('✅ Event saved successfully', 'success');
        } else {
          showToast("⚠️ Server Error: " + (response.error || 'Could not save event'), 'danger');
        }
      })
      .catch(err => {
        console.error('❌ Save error:', err);
        showToast("⚠️ " + (err.message || 'Unexpected error while saving event'), 'danger');
      })
      .finally(() => toggleLoader(false));
    });

    document.getElementById('deleteEventBtn').addEventListener('click', () => {
      const form = document.getElementById('eventForm');
      const eventId = form.dataset.eventId;
      if (!eventId) return showToast('⚠️ No event selected to delete.', 'warning');

      const payload = {
        system: 'calendar',
        action: 'deleteEvent',
        eventID: eventId // ✅ was previously wrapped in `data: { eventID }`
      };

      console.log('🗑️ Deleting event:', payload);

      toggleLoader(true);
      fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(response => {
        console.log('📥 Delete response:', response);
        if (response.success) {
          calendar.refetchEvents();
          bootstrap.Modal.getInstance(document.getElementById('addEventModal')).hide();
          form.reset();
          form.dataset.editing = 'false';
          form.dataset.eventId = '';
          showToast('🗑️ Event deleted successfully', 'success');
        } else {
          showToast("⚠️ Server Error: " + (response.error || 'Could not delete event'), 'danger');
        }
      })
      .catch(err => {
        console.error('❌ Delete error:', err);
        showToast("⚠️ " + (err.message || 'Unexpected error while deleting event'), 'danger');
      })
      .finally(() => toggleLoader(false));
    });

      function updateEvent(event) {
        const payload = {
          system: 'calendar',
          action: 'editEvent',
          eventID: event.id, // Moved outside eventInfo
          eventInfo: {
            title: event.title,
            start: event.startStr,
            end: event.endStr || event.startStr,
            allDay: event.allDay        }
            };

      console.log('🔄 Updating event:', payload);

      toggleLoader(true);
      fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(response => {
        console.log('📥 Update response:', response);
        if (!response.success) {
          showToast('⚠️ Failed to update event.', 'danger');
        }
      })
      .catch(err => {
        console.error('❌ Update error:', err);
        showToast("⚠️ " + (err.message || 'Unexpected error while updating event'), 'danger');
      })
      .finally(() => toggleLoader(false));
    }

    console.log('✅ Calendar ready with backend integration.');
  }, 300);
});
