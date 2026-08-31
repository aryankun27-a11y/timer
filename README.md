# ⏳ pixel timer

A minimal, self-made 8-bit retro pixel timer, Pomodoro tracker, and stopwatch designed for focus and simplicity. Built with pure HTML, Vanilla CSS, and JavaScript.

## ✨ Features

- **3 Modes**: Countdown Timer, Pomodoro Tracker (with cycle indicators), and Stopwatch.
- **8-Bit Sound Engine**: Custom square-wave chimes and metronome ticks synthesized via Web Audio API.
- **Handjet Typography**: Crisp retro pixel font powered by Google Fonts.
- **Dark & Light Themes**: Quick toggle (`T`) matching your aesthetic.
- **Daily Focus Stats**: Automatically records daily focus time and active streaks in `localStorage`.
- **Keyboard Shortcuts**: Built for speed (`Space` to start/pause, `M` for mode, `1-9` for quick time presets, `E` to edit custom time).

## 🚀 Quick Start

No dependencies or build steps required. Simply open `index.html` in any browser or serve locally:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## ⌨️ Shortcuts

| Key | Action |
| --- | --- |
| `Space` / Click | Start / Pause |
| `Scroll` / Drag | Adjust minutes |
| `R` | Restart / Reset |
| `M` | Cycle Mode (Timer / Pomodoro / Stopwatch) |
| `T` | Toggle Dark / Light Theme |
| `K` | Toggle 1s Metronome Tick |
| `S` | Toggle Sound |
| `1-9` | Quick time presets |
| `E` | Edit custom time |
| `F` | Toggle Fullscreen |
| `?` | Show Shortcuts Help |

---

*Built for simple, distraction-free focus.*
