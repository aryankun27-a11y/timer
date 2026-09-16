/**
 * 8-Bit Retro Pixel Timer, Pomodoro & Stopwatch
 * Featuring Handjet Typography, Pixel Progress Bar, Metronome Tick, and Daily Stats
 */

(() => {
  'use strict';

  /* ==========================================================================
     8-Bit Sound Synthesizer (Web Audio API Square Wave)
     ========================================================================== */
  class PixelSoundEngine {
    constructor() {
      this.audioCtx = null;
      this.soundEnabled = localStorage.getItem('pixel_timer_sound') !== 'false';
      this.tickEnabled = localStorage.getItem('pixel_timer_tick') === 'true';
    }

    initContext() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      localStorage.setItem('pixel_timer_sound', this.soundEnabled ? 'true' : 'false');
      if (this.soundEnabled) {
        this.initContext();
        this.playBeep(440, 0.08);
      }
      return this.soundEnabled;
    }

    toggleTick() {
      this.tickEnabled = !this.tickEnabled;
      localStorage.setItem('pixel_timer_tick', this.tickEnabled ? 'true' : 'false');
      if (this.tickEnabled) {
        this.initContext();
        this.playTick();
      }
      return this.tickEnabled;
    }

    playBeep(freq = 440, dur = 0.08) {
      if (!this.soundEnabled) return;
      this.initContext();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur);
    }

    playTick() {
      if (!this.tickEnabled) return;
      this.initContext();
      if (!this.audioCtx) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.015);
    }

    playAlarm() {
      if (!this.soundEnabled) return;
      this.initContext();
      if (!this.audioCtx) return;

      const notes = [
        { f: 523.25, d: 0.12, t: 0 },
        { f: 659.25, d: 0.12, t: 0.12 },
        { f: 783.99, d: 0.12, t: 0.24 },
        { f: 1046.50, d: 0.35, t: 0.36 }
      ];

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      notes.forEach(({ f, d, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0.1, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + d);
      });
    }
  }

  /* ==========================================================================
     Daily Focus Statistics Manager
     ========================================================================== */
  class DailyStatsManager {
    constructor() {
      this.data = this.load();
    }

    getTodayKey() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    load() {
      try {
        const raw = localStorage.getItem('pixel_daily_focus_v1');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return { days: {}, streak: 0, lastActiveDate: '' };
    }

    save() {
      localStorage.setItem('pixel_daily_focus_v1', JSON.stringify(this.data));
    }

    recordSession(durationSeconds) {
      if (durationSeconds < 10) return;
      const today = this.getTodayKey();
      if (!this.data.days[today]) {
        this.data.days[today] = { totalSec: 0, sessions: 0 };
      }
      this.data.days[today].totalSec += durationSeconds;
      this.data.days[today].sessions += 1;

      // Update streak
      if (this.data.lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        if (this.data.lastActiveDate === yKey) {
          this.data.streak += 1;
        } else if (!this.data.lastActiveDate) {
          this.data.streak = 1;
        } else {
          this.data.streak = 1;
        }
        this.data.lastActiveDate = today;
      }

      this.save();
    }

    getTodaySummary() {
      const today = this.getTodayKey();
      const record = this.data.days[today] || { totalSec: 0, sessions: 0 };
      const minutes = Math.floor(record.totalSec / 60);
      const hours = Math.floor(minutes / 60);
      const remMins = minutes % 60;

      let timeStr = '';
      if (hours > 0) {
        timeStr = `${hours}h ${remMins}m`;
      } else {
        timeStr = `${minutes}m`;
      }

      let summaryText = `today: ${timeStr} • ${record.sessions} session${record.sessions === 1 ? '' : 's'}`;
      if (this.data.streak > 0) {
        summaryText += ` • streak: ${this.data.streak}d`;
      }

      return {
        text: summaryText,
        streak: this.data.streak || 0
      };
    }
  }

  /* ==========================================================================
     Screen Wake Lock Manager (Prevents screen dimming / sleep while running)
     ========================================================================== */
  class PixelWakeLockManager {
    constructor() {
      this.wakeLock = null;
      this.videoElem = null;
      this.isSupported = 'wakeLock' in navigator;
      this.isActiveTarget = false;

      document.addEventListener('visibilitychange', () => {
        if (this.isActiveTarget && document.visibilityState === 'visible') {
          this.enable();
        }
      });
    }

    async enable() {
      this.isActiveTarget = true;

      // Method 1: Native Web Wake Lock API
      if (this.isSupported && !this.wakeLock) {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
        } catch (err) {}
      }

      // Method 2: Invisible Canvas Stream Video Loop Fallback (Guarantees screen stays awake on iOS Safari & mobile battery saver)
      try {
        if (!this.videoElem) {
          const canvas = document.createElement('canvas');
          canvas.width = 2;
          canvas.height = 2;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 2, 2);

          this.videoElem = document.createElement('video');
          this.videoElem.setAttribute('playsinline', '');
          this.videoElem.setAttribute('webkit-playsinline', '');
          this.videoElem.setAttribute('muted', '');
          this.videoElem.muted = true;
          this.videoElem.setAttribute('loop', '');
          this.videoElem.style.position = 'fixed';
          this.videoElem.style.top = '-9999px';
          this.videoElem.style.left = '-9999px';
          this.videoElem.style.width = '1px';
          this.videoElem.style.height = '1px';
          this.videoElem.style.opacity = '0';
          this.videoElem.style.pointerEvents = 'none';

          if ('captureStream' in canvas) {
            this.videoElem.srcObject = canvas.captureStream(1);
          }
          document.body.appendChild(this.videoElem);
        }

        if (this.videoElem && this.videoElem.paused) {
          const playPromise = this.videoElem.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        }
      } catch (e) {}
    }

    async disable() {
      this.isActiveTarget = false;

      if (this.wakeLock) {
        try {
          await this.wakeLock.release();
        } catch (err) {}
        this.wakeLock = null;
      }

      if (this.videoElem && !this.videoElem.paused) {
        try {
          this.videoElem.pause();
        } catch (e) {}
      }
    }

    // Legacy method aliases
    request() { return this.enable(); }
    release() { return this.disable(); }
  }

  /* ==========================================================================
     Pixel Timer Engine (Timer, Pomodoro & Stopwatch)
     ========================================================================== */
  class PixelTimerEngine {
    constructor(sound, stats) {
      this.sound = sound;
      this.stats = stats;

      this.mode = 'timer'; // 'timer' | 'pomodoro' | 'stopwatch'
      this.state = 'idle'; // 'idle' | 'running' | 'paused' | 'completed'

      // Durations
      this.timerTargetSeconds = 25 * 60;
      
      // Pomodoro cycle configuration
      this.pomoWorkSec = 25 * 60;
      this.pomoShortBreakSec = 5 * 60;
      this.pomoLongBreakSec = 15 * 60;
      this.pomoPhase = 'focus'; // 'focus' | 'break' | 'long_break'
      this.pomoCompletedCycles = 0;

      // Time tracking
      this.startTime = null;
      this.totalPausedMs = 0;
      this.pauseStartTime = null;
      this.lastTickSecond = 0;

      this.animationFrameId = null;
      this.backgroundTimerId = null;
      this.listeners = [];

      this.loadPreferences();
    }

    subscribe(listener) {
      this.listeners.push(listener);
      this.notify();
    }

    notify() {
      const snapshot = this.getSnapshot();
      this.listeners.forEach(fn => fn(snapshot));
    }

    getTargetSeconds() {
      if (this.mode === 'timer') {
        return this.timerTargetSeconds;
      } else if (this.mode === 'pomodoro') {
        if (this.pomoPhase === 'focus') return this.pomoWorkSec;
        if (this.pomoPhase === 'short_break') return this.pomoShortBreakSec;
        return this.pomoLongBreakSec;
      }
      return 0; // Stopwatch
    }

    getSnapshot() {
      const now = Date.now();
      let activeMs = 0;

      if (this.state === 'running') {
        activeMs = Math.max(0, now - this.startTime - this.totalPausedMs);
      } else if (this.state === 'paused') {
        activeMs = Math.max(0, this.pauseStartTime - this.startTime - this.totalPausedMs);
      }

      const targetSec = this.getTargetSeconds();
      let displaySeconds = 0;
      let progressFraction = 1; // 1 (start) -> 0 (end)

      if (this.mode === 'timer' || this.mode === 'pomodoro') {
        const totalMs = targetSec * 1000;
        if (this.state === 'idle') {
          displaySeconds = targetSec;
          progressFraction = 1;
        } else if (this.state === 'completed') {
          displaySeconds = 0;
          progressFraction = 0;
        } else {
          const remMs = Math.max(0, totalMs - activeMs);
          displaySeconds = Math.ceil(remMs / 1000);
          progressFraction = totalMs > 0 ? (remMs / totalMs) : 0;
        }
      } else {
        // Stopwatch
        displaySeconds = Math.floor(activeMs / 1000);
        progressFraction = (activeMs % 60000) / 60000;
      }

      return {
        mode: this.mode,
        state: this.state,
        targetSeconds: targetSec,
        displaySeconds,
        progressFraction,
        activeMs,
        pomoPhase: this.pomoPhase,
        pomoCompletedCycles: this.pomoCompletedCycles
      };
    }

    setMode(mode) {
      if (this.mode === mode) return;
      this.reset();
      this.mode = mode;
      if (mode === 'pomodoro') {
        this.pomoPhase = 'focus';
      }
      this.persistPreferences();
      this.notify();
    }

    cycleMode() {
      const modes = ['timer', 'pomodoro', 'stopwatch'];
      const nextIdx = (modes.indexOf(this.mode) + 1) % modes.length;
      this.setMode(modes[nextIdx]);
    }

    setDuration(seconds) {
      if (this.mode === 'timer') {
        this.timerTargetSeconds = Math.max(1, Math.min(36000, seconds));
      } else if (this.mode === 'pomodoro') {
        if (this.pomoPhase === 'focus') this.pomoWorkSec = Math.max(1, seconds);
        else if (this.pomoPhase === 'short_break') this.pomoShortBreakSec = Math.max(1, seconds);
        else if (this.pomoPhase === 'long_break') this.pomoLongBreakSec = Math.max(1, seconds);
      }
      this.reset();
      this.persistPreferences();
      this.notify();
    }

    adjustMinutes(delta) {
      if (this.state !== 'idle') return;
      const current = this.getTargetSeconds();
      const next = Math.max(60, current + (delta * 60));
      this.setDuration(next);
    }

    start() {
      if (this.state === 'running') return;

      const now = Date.now();
      if (this.state === 'paused') {
        if (this.pauseStartTime) {
          this.totalPausedMs += (now - this.pauseStartTime);
        }
        this.pauseStartTime = null;
        this.state = 'running';
      } else {
        this.startTime = now;
        this.totalPausedMs = 0;
        this.pauseStartTime = null;
        this.state = 'running';
        this.lastTickSecond = 0;
      }

      this.startLoop();
      this.notify();
    }

    pause() {
      if (this.state !== 'running') return;
      this.pauseStartTime = Date.now();
      this.state = 'paused';
      this.stopLoop();
      this.notify();
    }

    reset() {
      this.stopLoop();
      this.state = 'idle';
      this.startTime = null;
      this.totalPausedMs = 0;
      this.pauseStartTime = null;
      this.lastTickSecond = 0;
      this.notify();
    }

    startLoop() {
      this.stopLoop();

      const processTick = () => {
        if (this.state !== 'running') return;

        const now = Date.now();
        const activeMs = now - this.startTime - this.totalPausedMs;
        const currentSec = Math.floor(activeMs / 1000);

        // Play 1-second metronome tick
        if (currentSec !== this.lastTickSecond) {
          this.lastTickSecond = currentSec;
          this.sound.playTick();
        }

        if (this.mode === 'timer' || this.mode === 'pomodoro') {
          const totalMs = this.getTargetSeconds() * 1000;
          if (activeMs >= totalMs) {
            this.handleTimerComplete();
            return;
          }
        }

        this.notify();
      };

      const tick = () => {
        if (this.state !== 'running') return;
        processTick();
        if (this.state === 'running') {
          this.animationFrameId = requestAnimationFrame(tick);
        }
      };

      this.animationFrameId = requestAnimationFrame(tick);

      // Background-safe interval backup (handles tab backgrounding when requestAnimationFrame pauses)
      this.backgroundTimerId = setInterval(() => {
        if (this.state !== 'running') return;
        processTick();
      }, 500);
    }

    handleTimerComplete() {
      this.state = 'completed';
      this.stopLoop();

      // Record daily stats if it was a focus session
      if (this.mode === 'timer' || (this.mode === 'pomodoro' && this.pomoPhase === 'focus')) {
        this.stats.recordSession(this.getTargetSeconds());
      }

      if (this.mode === 'pomodoro') {
        if (this.pomoPhase === 'focus') {
          this.pomoCompletedCycles += 1;
          if (this.pomoCompletedCycles % 4 === 0) {
            this.pomoPhase = 'long_break';
          } else {
            this.pomoPhase = 'short_break';
          }
        } else {
          this.pomoPhase = 'focus';
        }
      }

      this.notify();
      this.sound.playAlarm();
    }

    stopLoop() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      if (this.backgroundTimerId) {
        clearInterval(this.backgroundTimerId);
        this.backgroundTimerId = null;
      }
    }

    persistPreferences() {
      localStorage.setItem('pixel_timer_mode', this.mode);
      localStorage.setItem('pixel_timer_target_sec', String(this.timerTargetSeconds));
    }

    loadPreferences() {
      const savedMode = localStorage.getItem('pixel_timer_mode');
      if (['timer', 'pomodoro', 'stopwatch'].includes(savedMode)) {
        this.mode = savedMode;
      }

      const savedSec = parseInt(localStorage.getItem('pixel_timer_target_sec'), 10);
      if (!isNaN(savedSec) && savedSec > 0) {
        this.timerTargetSeconds = savedSec;
      }
    }
  }

  /* ==========================================================================
     UI Controller
     ========================================================================== */
  class PixelUIController {
    constructor(engine, sound, stats, wakeLock) {
      this.engine = engine;
      this.sound = sound;
      this.stats = stats;
      this.wakeLock = wakeLock;

      this.dom = {
        app: document.getElementById('app'),
        brandModeBtn: document.getElementById('brand-mode-btn'),
        modeText: document.getElementById('mode-text'),
        btnTheme: document.getElementById('btn-theme'),
        themeBtnText: document.getElementById('theme-btn-text'),
        btnSound: document.getElementById('btn-sound'),
        soundBtnText: document.getElementById('sound-btn-text'),
        btnTick: document.getElementById('btn-tick'),
        tickBtnText: document.getElementById('tick-btn-text'),
        btnHelp: document.getElementById('btn-help'),
        helpDialog: document.getElementById('help-dialog'),
        btnCloseDialog: document.getElementById('btn-close-dialog'),

        mainArea: document.getElementById('main-area'),
        pomoTracker: document.getElementById('pomo-tracker'),
        pomoPhase: document.getElementById('pomo-phase'),
        pomoBlocks: document.getElementById('pomo-blocks'),

        digitsWrapper: document.getElementById('digits-wrapper'),
        pixelDigits: document.getElementById('pixel-digits'),
        timeEditOverlay: document.getElementById('time-edit-overlay'),
        timeInput: document.getElementById('time-input'),

        dailyStats: document.getElementById('daily-stats')
      };

      this.isEditing = false;
      this.keyBuffer = '';
      this.keyBufferTimeout = null;

      this.lastRenderedState = null;
      this.lastDisplayStr = '';
      this.lastDocTitle = '';

      this.initTheme();
      this.initSoundUI();
      this.initTickUI();
      this.bindEvents();
      this.engine.subscribe(this.render.bind(this));
    }

    initTheme() {
      const savedTheme = localStorage.getItem('pixel_timer_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.dom.themeBtnText.textContent = savedTheme === 'dark' ? '[light]' : '[dark]';
    }

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('pixel_timer_theme', next);
      this.dom.themeBtnText.textContent = next === 'dark' ? '[light]' : '[dark]';
      this.sound.playBeep(600, 0.05);
    }

    initSoundUI() {
      if (this.dom.soundBtnText) {
        this.dom.soundBtnText.textContent = this.sound.soundEnabled ? '[sound: on]' : '[sound: off]';
      }
    }

    toggleSound() {
      const enabled = this.sound.toggleSound();
      if (this.dom.soundBtnText) {
        this.dom.soundBtnText.textContent = enabled ? '[sound: on]' : '[sound: off]';
      }
    }

    initTickUI() {
      this.dom.tickBtnText.textContent = this.sound.tickEnabled ? '[tick: on]' : '[tick: off]';
    }

    toggleTick() {
      const enabled = this.sound.toggleTick();
      this.dom.tickBtnText.textContent = enabled ? '[tick: on]' : '[tick: off]';
    }

    bindEvents() {
      // Toggle Start / Pause on main area click
      this.dom.mainArea.addEventListener('click', (e) => {
        if (e.target === this.dom.timeInput || this.isEditing) return;
        this.handleTogglePlay();
      });

      // Mouse Wheel on digits to adjust time (ignored in stopwatch mode)
      this.dom.digitsWrapper.addEventListener('wheel', (e) => {
        if (this.engine.state !== 'idle' || this.engine.mode === 'stopwatch') return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? (e.shiftKey ? 5 : 1) : (e.shiftKey ? -5 : -1);
        this.engine.adjustMinutes(delta);
        this.sound.playBeep(520, 0.03);
      }, { passive: false });

      // Double-click on digits to open custom time editor (mouse & touch friendly)
      this.dom.digitsWrapper.addEventListener('dblclick', (e) => {
        if (this.engine.state === 'idle' && this.engine.mode !== 'stopwatch') {
          e.stopPropagation();
          this.openTimeEdit();
        }
      });

      // Mode Switcher
      this.dom.brandModeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.engine.cycleMode();
        this.sound.playBeep(560, 0.06);
      });

      // Header buttons
      this.dom.btnTheme.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTheme();
      });

      if (this.dom.btnSound) {
        this.dom.btnSound.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleSound();
        });
      }

      this.dom.btnTick.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTick();
      });

      this.dom.btnHelp.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.helpDialog.showModal();
        this.sound.playBeep(700, 0.06);
      });

      this.dom.btnCloseDialog.addEventListener('click', () => {
        this.dom.helpDialog.close();
      });

      // Time Edit Input keyboard handling
      this.dom.timeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.applyTimeEdit();
        } else if (e.key === 'Escape') {
          this.cancelTimeEdit();
        }
      });

      // Time Edit Input blur (clicking outside closes cleanly)
      this.dom.timeInput.addEventListener('blur', () => {
        if (this.isEditing) {
          this.applyTimeEdit();
        }
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if (this.dom.helpDialog.open) {
          if (e.key === 'Escape') this.dom.helpDialog.close();
          return;
        }

        if (this.isEditing) {
          if (e.key === 'Escape') this.cancelTimeEdit();
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          this.handleTogglePlay();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          this.engine.reset();
          this.sound.playBeep(350, 0.08);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          this.engine.cycleMode();
          this.sound.playBeep(560, 0.06);
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          this.toggleTheme();
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.toggleTick();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          this.toggleSound();
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          this.toggleNativeFullscreen();
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          if (this.engine.state === 'idle' && this.engine.mode !== 'stopwatch') {
            this.openTimeEdit();
          }
        } else if (e.key === '?') {
          e.preventDefault();
          this.dom.helpDialog.showModal();
        } else if (this.engine.state === 'idle' && this.engine.mode !== 'stopwatch') {
          // Direct numeric typing (e.g. typing 1 then 5 sets 15 minutes, typing 4 then 5 sets 45 minutes)
          const key = e.key;
          if (/^[0-9]$/.test(key)) {
            clearTimeout(this.keyBufferTimeout);
            this.keyBuffer += key;
            const mins = parseInt(this.keyBuffer, 10);
            if (!isNaN(mins) && mins > 0) {
              this.engine.setDuration(mins * 60);
              this.sound.playBeep(480, 0.04);
            }
            this.keyBufferTimeout = setTimeout(() => {
              this.keyBuffer = '';
            }, 1200);
          }
        }
      });
    }

    handleTogglePlay() {
      this.sound.initContext();
      if (this.engine.state === 'running') {
        this.engine.pause();
        this.wakeLock.disable();
        this.sound.playBeep(380, 0.07);
      } else {
        this.wakeLock.enable();
        this.engine.start();
        this.sound.playBeep(660, 0.08);
      }
    }

    handleStart() {
      this.sound.initContext();
      this.wakeLock.enable();
      this.engine.start();
      this.sound.playBeep(660, 0.08);
    }

    handlePause() {
      this.sound.initContext();
      this.engine.pause();
      this.wakeLock.disable();
      this.sound.playBeep(380, 0.07);
    }

    handleRestart() {
      this.sound.initContext();
      this.engine.reset();
      this.wakeLock.disable();
      this.sound.playBeep(350, 0.08);
    }

    openTimeEdit() {
      this.isEditing = true;
      const snapshot = this.engine.getSnapshot();
      this.dom.timeInput.value = this.formatTimeString(snapshot.displaySeconds);
      this.dom.timeEditOverlay.style.display = 'flex';
      this.dom.timeInput.focus();
      this.dom.timeInput.select();
    }

    applyTimeEdit() {
      const val = this.dom.timeInput.value.trim();
      const parts = val.split(':').map(n => parseInt(n, 10));
      let totalSec = 0;

      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        totalSec = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
      } else if (parts.length === 2 && parts.every(n => !isNaN(n))) {
        totalSec = (parts[0] * 60) + parts[1];
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        totalSec = parts[0] * 60;
      }

      if (totalSec > 0) {
        this.engine.setDuration(totalSec);
      }

      this.cancelTimeEdit();
      this.sound.playBeep(550, 0.06);
    }

    cancelTimeEdit() {
      this.isEditing = false;
      this.dom.timeEditOverlay.style.display = 'none';
    }

    toggleNativeFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    formatTimeString(totalSeconds) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const pad = (n) => String(n).padStart(2, '0');

      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remMins = minutes % 60;
        return `${pad(hours)}:${pad(remMins)}:${pad(seconds)}`;
      }
      return `${pad(minutes)}:${pad(seconds)}`;
    }

    render(snapshot) {
      const { mode, state, displaySeconds, progressFraction, pomoPhase, pomoCompletedCycles } = snapshot;

      // Only transition Screen Wake Lock and data-state when state changes
      if (this.lastRenderedState !== state) {
        this.lastRenderedState = state;
        if (state === 'running') {
          this.wakeLock.request();
        } else {
          this.wakeLock.release();
        }
        this.dom.app.setAttribute('data-state', state);
      }

      // Mode label text
      if (this.dom.modeText.textContent !== mode) {
        this.dom.modeText.textContent = mode;
      }

      // Format digits
      const timeStr = this.formatTimeString(displaySeconds);
      if (this.lastDisplayStr !== timeStr) {
        this.lastDisplayStr = timeStr;
        this.dom.pixelDigits.textContent = timeStr;
      }

      // Pomodoro Session Tracker
      if (mode === 'pomodoro') {
        this.dom.pomoTracker.style.display = 'flex';
        const phaseLabel = pomoPhase.replace('_', ' ');
        if (this.dom.pomoPhase.textContent !== phaseLabel) {
          this.dom.pomoPhase.textContent = phaseLabel;
        }

        // Render 4 session blocks [● ● ○ ○] (long_break displays all 4 full blocks)
        const cycleInSet = (pomoPhase === 'long_break') ? 4 : (pomoCompletedCycles % 4);
        let blocks = '';
        for (let i = 0; i < 4; i++) {
          blocks += (i < cycleInSet) ? '● ' : '○ ';
        }
        this.dom.pomoBlocks.textContent = `[${blocks.trim()}]`;
      } else {
        this.dom.pomoTracker.style.display = 'none';
      }

      // Update Daily Stats summary
      const statsSummary = this.stats.getTodaySummary();
      if (this.dom.dailyStats.textContent !== statsSummary.text) {
        this.dom.dailyStats.textContent = statsSummary.text;
      }

      // Document Title (throttled to avoid redundant DOM updates)
      let titleStr = mode;
      if (state === 'running') {
        titleStr = `${timeStr} — ${mode}`;
      } else if (state === 'paused') {
        titleStr = `[paused] ${timeStr}`;
      } else if (state === 'completed') {
        titleStr = `time's up!`;
      }
      if (this.lastDocTitle !== titleStr) {
        this.lastDocTitle = titleStr;
        document.title = titleStr;
      }
    }
  }

  /* ==========================================================================
     Bootstrap Application
     ========================================================================== */
  const sound = new PixelSoundEngine();
  const stats = new DailyStatsManager();
  const wakeLock = new PixelWakeLockManager();
  const engine = new PixelTimerEngine(sound, stats);
  new PixelUIController(engine, sound, stats, wakeLock);

  // Reveal UI once font is ready to prevent Flash of Unstyled Text (FOUT)
  const appEl = document.getElementById('app');
  if (appEl) {
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        appEl.classList.add('ready');
      });
      setTimeout(() => {
        appEl.classList.add('ready');
      }, 250);
    } else {
      appEl.classList.add('ready');
    }
  }
})();
