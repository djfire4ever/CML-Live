document.addEventListener('DOMContentLoaded', () => {
  if (!window.FullCalendar) {
    console.error('❌ FullCalendar is not loaded');
    return;
  }

  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.error('❌ #calendar element not found');
    return;
  }

  // Create basic calendar instance (core calendar defaults to dayGridMonth view)
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    }
  });

  calendar.render();
  console.log('✅ FullCalendar rendered successfully');
});
