const form = document.getElementById('reflection-form');
const saveButton = document.getElementById('save');
const saveStatus = document.getElementById('save-status');
const wallStatus = document.getElementById('wall-status');
const wall = document.getElementById('reflections');
const refreshButton = document.getElementById('refresh');

// GET: ask the server for the reflections saved in lowdb.
async function loadReflections() {
  refreshButton.disabled = true;
  try {
    const response = await fetch('/data');
    if (!response.ok) throw new Error('The wall could not load. Please try Refresh wall.');
    const reflections = await response.json();
    wall.replaceChildren();
    for (const reflection of reflections) {
      const card = document.createElement('article');
      card.className = 'card';
      const time = document.createElement('time');
      time.dateTime = reflection.createdAt;
      time.textContent = new Date(reflection.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      card.append(time);
      for (const key of ['notice', 'reveal', 'repair']) {
        const heading = document.createElement('h3');
        heading.textContent = key.toUpperCase();
        const paragraph = document.createElement('p');
        // textContent displays people's words as text, never as HTML.
        paragraph.textContent = reflection[key];
        card.append(heading, paragraph);
      }
      wall.append(card);
    }
    wallStatus.textContent = reflections.length ? `${reflections.length} reflection${reflections.length === 1 ? '' : 's'} shared.` : 'The wall is waiting. Yours can be the first reflection.';
  } catch (error) {
    wallStatus.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
}

// POST: send the three form fields to Express as JSON.
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  saveStatus.textContent = 'Saving your reflection…';
  const reflection = {
    notice: form.elements.notice.value,
    reveal: form.elements.reveal.value,
    repair: form.elements.repair.value
  };
  try {
    const response = await fetch('/new-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reflection)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to save. Please try again.');
    saveStatus.textContent = result.message;
    form.reset();
    await loadReflections();
  } catch (error) {
    saveStatus.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});
refreshButton.addEventListener('click', loadReflections);
loadReflections();
