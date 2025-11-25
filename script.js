// Tabs: activate panel on click
document.addEventListener('DOMContentLoaded', () => {
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));

  function activateTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    panels.forEach(p => p.classList.toggle('active', p.id === name));
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.tab);
    });
  });

  // Default active (ensure correct state on load)
  activateTab('history');
});

// Modal helpers (placeholder for future integration)
function openPlayerModal(playerName, statsHtml) {
  const modal = document.getElementById('playerModal');
  document.getElementById('modalPlayerName').textContent = playerName || '';
  document.getElementById('modalPlayerStats').innerHTML = statsHtml || '';
  modal.hidden = false;
}
function closePlayerModal() {
  document.getElementById('playerModal').hidden = true;
}
