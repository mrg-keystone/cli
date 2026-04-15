/**
 * HTML Calendar Export
 */

import type { ProjectStore } from "../data/projects.ts";

const projectColors = [
  "#2196F3", "#FF9800", "#4CAF50", "#E91E63",
  "#FFEB3B", "#F44336", "#00BCD4", "#9C27B0",
];

const milestones: Record<string, { symbol: string; label: string }> = {
  "Kickoff": { symbol: "K", label: "Kickoff" },
  "Software": { symbol: "S", label: "Software" },
  "Meeting": { symbol: "M", label: "Meeting" },
  "POC Delivery": { symbol: "P", label: "POC Delivery" },
  "Integration": { symbol: "I", label: "Integration" },
  "Launch": { symbol: "L", label: "Launch" },
  "Iteration": { symbol: "R", label: "Iteration" },
};

function getProjectColor(index: number): string {
  return projectColors[index % projectColors.length];
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function loadNotes(store: ProjectStore, projectName: string): Promise<string> {
  try {
    return await Deno.readTextFile(store.getNotesPath(projectName));
  } catch {
    return "";
  }
}

export async function generateCalendarHTML(
  store: ProjectStore,
  startDate: Date,
  monthsToShow: number = 12
): Promise<string> {
  const projects = store.getActiveProjects();
  const projectIndexMap = new Map<string, number>();
  projects.forEach((p, i) => projectIndexMap.set(p.name, i));

  const allEvents = store.getAllEvents();
  const eventsByDate = new Map<string, { project: string; milestone: string; projectIndex: number }[]>();

  for (const event of allEvents) {
    if (!eventsByDate.has(event.date)) {
      eventsByDate.set(event.date, []);
    }
    eventsByDate.get(event.date)!.push({
      project: event.project,
      milestone: event.milestone,
      projectIndex: projectIndexMap.get(event.project) ?? 0,
    });
  }

  // Load all project notes
  const projectNotes = new Map<string, string>();
  for (const project of projects) {
    const notes = await loadNotes(store, project.name);
    projectNotes.set(project.name, notes);
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendars
  let calendarsHTML = "";
  const currentDate = new Date(startDate);

  for (let m = 0; m < monthsToShow; m++) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let monthHTML = `<div class="month"><h2>${monthNames[month]} ${year}</h2><table class="calendar"><thead><tr>${dayNames.map(d => `<th>${d}</th>`).join("")}</tr></thead><tbody>`;

    let dayCount = 1;
    for (let week = 0; week < 6; week++) {
      if (dayCount > daysInMonth) break;
      monthHTML += "<tr>";
      for (let dow = 0; dow < 7; dow++) {
        if ((week === 0 && dow < firstDay) || dayCount > daysInMonth) {
          monthHTML += `<td class="empty"></td>`;
        } else {
          const dateStr = formatDate(new Date(year, month, dayCount));
          const events = eventsByDate.get(dateStr) || [];
          const isToday = dateStr === formatDate(new Date());

          let eventsHTML = "";
          const projectsOnDate: string[] = [];
          for (const event of events.slice(0, 3)) {
            const color = getProjectColor(event.projectIndex);
            const symbol = milestones[event.milestone]?.symbol || "?";
            eventsHTML += `<div class="event" style="background-color: ${color};">${symbol}</div>`;
            if (!projectsOnDate.includes(event.project)) projectsOnDate.push(event.project);
          }
          if (events.length > 3) eventsHTML += `<div class="more">+${events.length - 3}</div>`;

          const hasEvents = events.length > 0;
          const dataAttr = hasEvents ? `data-date="${dateStr}" data-projects="${escapeHtml(projectsOnDate.join(","))}"` : "";
          monthHTML += `<td class="day${isToday ? " today" : ""}${hasEvents ? " has-events" : ""}" ${dataAttr}><span class="day-number">${dayCount}</span><div class="events">${eventsHTML}</div></td>`;
          dayCount++;
        }
      }
      monthHTML += "</tr>";
    }
    monthHTML += `</tbody></table></div>`;
    calendarsHTML += monthHTML;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Generate project data for JS
  const projectDataJS: Record<string, { color: string; timeline: { date: string; milestone: string; symbol: string }[]; notes: string }> = {};
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const color = getProjectColor(i);
    const timeline = allEvents
      .filter(e => e.project === project.name)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({ date: e.date, milestone: e.milestone, symbol: milestones[e.milestone]?.symbol || "?" }));
    projectDataJS[project.name] = { color, timeline, notes: projectNotes.get(project.name) || "" };
  }

  // Legend HTML - starts collapsed
  let legendHTML = `<div class="legend collapsed" id="legend"><button class="legend-toggle" onclick="toggleLegend()">▶ Legend</button><div class="legend-content"><div class="legend-section"><h4>Milestones</h4><div class="legend-items">`;
  for (const [, info] of Object.entries(milestones)) {
    legendHTML += `<span class="legend-item"><span class="legend-symbol">${info.symbol}</span>${info.label}</span>`;
  }
  legendHTML += `</div></div><div class="legend-section"><h4>Projects</h4><div class="legend-items">`;
  for (let i = 0; i < projects.length; i++) {
    legendHTML += `<span class="legend-item"><span class="color-dot" style="background-color: ${getProjectColor(i)};"></span>${projects[i].name}</span>`;
  }
  legendHTML += `</div></div></div></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Calendar</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root { --bg: #1a1a2e; --bg-light: #16213e; --bg-lighter: #1f2b47; --text: #eee; --text-dim: #888; --border: #333; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }

    .header { padding: 1.5rem 2rem; }
    h1 { font-weight: 300; font-size: 1.8rem; }

    .legend { position: fixed; top: 1rem; right: 1rem; z-index: 50; background: var(--bg-light); border-radius: 8px; padding: 0; min-width: 180px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .legend-toggle { background: none; border: none; color: var(--text); padding: 0.75rem 1rem; cursor: pointer; width: 100%; text-align: left; font-size: 0.9rem; font-weight: 500; }
    .legend-toggle:hover { background: var(--bg-lighter); }
    .legend-content { padding: 0 1rem 1rem; }
    .legend.collapsed .legend-content { display: none; }
    .legend.collapsed .legend-toggle { border-radius: 8px; }
    .legend-section { margin-top: 0.75rem; }
    .legend-section h4 { font-size: 0.75rem; color: var(--text-dim); margin-bottom: 0.5rem; text-transform: uppercase; }
    .legend-items { display: flex; flex-direction: column; gap: 0.25rem; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
    .legend-symbol { width: 20px; height: 20px; background: var(--border); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
    .color-dot { width: 12px; height: 12px; border-radius: 50%; }

    .main { display: flex; gap: 2rem; padding: 0 2rem 2rem; }
    .calendars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; flex: 1; }
    @media (max-width: 1400px) { .calendars { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 1000px) { .calendars { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 700px) { .calendars { grid-template-columns: 1fr; } .main { flex-direction: column; } .header { flex-direction: column; align-items: flex-start; } }

    .month { background: var(--bg-light); border-radius: 12px; padding: 1rem; }
    .month h2 { font-size: 1rem; font-weight: 500; margin-bottom: 0.75rem; }
    .calendar { border-spacing: 2px; border-collapse: separate; width: 100%; }
    .calendar th { padding: 0.4rem 0; text-align: center; font-weight: 500; color: var(--text-dim); font-size: 0.7rem; }
    .calendar td { height: 48px; vertical-align: top; padding: 4px; background: var(--bg); border-radius: 4px; position: relative; }
    .calendar td.empty { background: transparent; }
    .calendar td.today { background: rgba(33, 150, 243, 0.2); }
    .calendar td.has-events { cursor: pointer; }
    .calendar td.has-events:hover { background: var(--bg-lighter); }
    .day-number { font-size: 0.75rem; color: var(--text-dim); }
    .today .day-number { color: #2196F3; font-weight: 600; }
    .events { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 2px; }
    .event { width: 16px; height: 16px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #fff; }
    .more { font-size: 8px; color: var(--text-dim); }

    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; align-items: center; justify-content: center; padding: 2rem; }
    .modal-overlay.active { display: flex; }
    .modal { background: var(--bg-light); border-radius: 12px; max-width: 700px; width: 100%; max-height: 80vh; overflow: auto; }
    .modal-header { padding: 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--bg-light); }
    .modal-header h2 { font-size: 1.25rem; display: flex; align-items: center; gap: 0.75rem; }
    .modal-close { background: none; border: none; color: var(--text-dim); font-size: 1.5rem; cursor: pointer; padding: 0.25rem 0.5rem; }
    .modal-close:hover { color: var(--text); }
    .modal-body { padding: 1.5rem; }

    .timeline-section { margin-bottom: 2rem; }
    .timeline-section h3 { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 1rem; text-transform: uppercase; }
    .milestone-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0 0.5rem 1rem; border-left: 3px solid var(--border); }
    .milestone-date { font-family: monospace; font-size: 0.8rem; color: var(--text-dim); min-width: 90px; }
    .milestone-badge { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; }
    .milestone-label { font-size: 0.9rem; }

    .notes-section h3 { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 1rem; text-transform: uppercase; }
    .notes-content { background: var(--bg); border-radius: 8px; padding: 1.5rem; font-size: 0.9rem; line-height: 1.7; }
    .notes-content h1, .notes-content h2, .notes-content h3 { margin: 1.5rem 0 0.75rem; font-weight: 600; }
    .notes-content h1 { font-size: 1.4rem; }
    .notes-content h2 { font-size: 1.2rem; }
    .notes-content h3 { font-size: 1rem; }
    .notes-content p { margin-bottom: 1rem; }
    .notes-content ul, .notes-content ol { margin: 0 0 1rem 1.5rem; }
    .notes-content code { background: var(--bg-lighter); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
    .notes-content pre { background: var(--bg-lighter); padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; }
    .notes-content pre code { background: none; padding: 0; }
    .notes-content a { color: #2196F3; }
    .notes-empty { color: var(--text-dim); font-style: italic; }

    @media print { body { background: #fff; color: #000; } .modal-overlay, .legend-toggle { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Project Calendar</h1>
    ${legendHTML}
  </div>

  <div class="main">
    <div class="calendars">${calendarsHTML}</div>
  </div>

  <div class="modal-overlay" id="modal" onclick="if(event.target === this) closeModal()">
    <div class="modal">
      <div class="modal-header">
        <h2><span class="color-dot" id="modal-dot"></span><span id="modal-title"></span></h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="timeline-section">
          <h3>Timeline</h3>
          <div id="modal-timeline"></div>
        </div>
        <div class="notes-section">
          <h3>Notes</h3>
          <div class="notes-content" id="modal-notes"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const projectData = ${JSON.stringify(projectDataJS)};

    function toggleLegend() {
      document.getElementById('legend').classList.toggle('collapsed');
      const btn = document.querySelector('.legend-toggle');
      btn.textContent = btn.textContent.startsWith('▼') ? '▶ Legend' : '▼ Legend';
    }

    document.querySelectorAll('.has-events').forEach(cell => {
      cell.addEventListener('click', () => {
        const projects = cell.dataset.projects.split(',');
        if (projects.length === 1) {
          showProject(projects[0]);
        } else {
          // For multiple projects, show first one (could enhance to show picker)
          showProject(projects[0]);
        }
      });
    });

    function showProject(name) {
      const data = projectData[name];
      if (!data) return;

      document.getElementById('modal-dot').style.backgroundColor = data.color;
      document.getElementById('modal-title').textContent = name;

      let timelineHTML = '';
      data.timeline.forEach(m => {
        timelineHTML += \`<div class="milestone-item" style="border-left-color: \${data.color}">
          <span class="milestone-date">\${m.date}</span>
          <span class="milestone-badge" style="background-color: \${data.color}">\${m.symbol}</span>
          <span class="milestone-label">\${m.milestone}</span>
        </div>\`;
      });
      document.getElementById('modal-timeline').innerHTML = timelineHTML;

      if (data.notes) {
        document.getElementById('modal-notes').innerHTML = marked.parse(data.notes);
      } else {
        document.getElementById('modal-notes').innerHTML = '<p class="notes-empty">No notes yet.</p>';
      }

      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;
}
