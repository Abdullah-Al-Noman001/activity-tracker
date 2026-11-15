# Daily Habit Tracker

A lightweight, browser-based habit tracker built with plain HTML, CSS, and JavaScript. Add habits, record daily progress, and review your consistency over time.

## Features

- Add, rename, and delete habits.
- Mark habits complete for the current day.
- View a 16-week activity history for each habit.
- See an activity heatmap summarizing all habits.
- Export your data to a JSON backup and import it later.
- Save data in the browser with `localStorage`.
- Adapt to the device's light or dark appearance setting.

## Project files

- `index.html` contains the page structure.
- `styles.css` contains the layout, colors, heatmaps, and responsive styles.
- `app.js` contains habit management, history, and backup/restore behavior.

## Run locally

No build tools or dependencies are required. Download or clone this repository, then open `index.html` in a modern web browser.

You can also serve the folder with any static web server. For example, with Python installed:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Data and backups

Habit names and completion history are saved in the current browser's local storage. They are not synced between browsers or devices. Use **Export backup** to download a JSON file, and **Import backup** to restore a previously exported file. Clearing browser data may remove the saved tracker data, so keep a backup if you need to preserve it.

## Technologies

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage` and File APIs

No external libraries or build step are required.
