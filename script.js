/* =========================================================
   THE WORST UI WORD SEARCH - GAMEPLAY & CHAOS ENGINE
   ========================================================= */

// Target words placed in the 10x10 grid
const TARGET_WORDS = [
    { word: "CHAOS", emoji: "🌀", found: false },
    { word: "UGLY", emoji: "🪳", found: false },
    { word: "PAIN", emoji: "🩹", found: false },
    { word: "EMOJI", emoji: "💩", found: false },
    { word: "POPUP", emoji: "🚨", found: false },
    { word: "SLUDGE", emoji: "🦠", found: false },
    { word: "VOMIT", emoji: "🤮", found: false },
    { word: "CLOWN", emoji: "🤡", found: false }
];

const GRID_SIZE = 10;
let gridData = []; // 10x10 array of characters
let wordPositions = {}; // word -> array of {r, c}
let selectedCells = [];
let soundEnabled = true;
let score = -9999;
let secondsWasted = 0;

// Web Audio API synthesizer for cursed sound effects
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playCursedSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'type') {
            // High click / chirp
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400 + Math.random() * 500, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'found') {
            // Loud discordant fanfare
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'error') {
            // Ugly buzz
            osc.type = 'square';
            osc.frequency.setValueAtTime(95, now);
            osc.frequency.setValueAtTime(75, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'chaos') {
            // Screech
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch (e) {
        console.warn("Audio error (expected in muted/unfocused state):", e);
    }
}

// ---------------------------------------------------------
// GRID GENERATOR
// ---------------------------------------------------------

function initializeGrid() {
    // 10x10 empty matrix
    gridData = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    wordPositions = {};

    // Directions: [dRow, dCol]
    const directions = [
        [0, 1],   // horizontal right
        [1, 0],   // vertical down
        [1, 1],   // diagonal down-right
        [0, -1],  // horizontal left (spicy!)
        [-1, 0]   // vertical up
    ];

    TARGET_WORDS.forEach(item => {
        item.found = false;
        const word = item.word;
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 250) {
            attempts++;
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const dr = dir[0];
            const dc = dir[1];

            // Choose starting coordinate that fits
            const startR = Math.floor(Math.random() * GRID_SIZE);
            const startC = Math.floor(Math.random() * GRID_SIZE);

            const endR = startR + dr * (word.length - 1);
            const endC = startC + dc * (word.length - 1);

            if (endR >= 0 && endR < GRID_SIZE && endC >= 0 && endC < GRID_SIZE) {
                // Check collision
                let canPlace = true;
                for (let i = 0; i < word.length; i++) {
                    const r = startR + dr * i;
                    const c = startC + dc * i;
                    if (gridData[r][c] !== '' && gridData[r][c] !== word[i]) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace) {
                    const coords = [];
                    for (let i = 0; i < word.length; i++) {
                        const r = startR + dr * i;
                        const c = startC + dc * i;
                        gridData[r][c] = word[i];
                        coords.push({ r, c });
                    }
                    wordPositions[word] = coords;
                    placed = true;
                }
            }
        }
    });

    // Fill remaining empty cells with random letters
    const randomLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (gridData[r][c] === '') {
                gridData[r][c] = randomLetters[Math.floor(Math.random() * randomLetters.length)];
            }
        }
    }

    renderGrid();
    renderWordList();
}

function renderGrid() {
    const gridEl = document.getElementById("word-grid");
    gridEl.innerHTML = "";

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement("div");
            cell.className = "grid-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.textContent = gridData[r][c];

            // Check if this cell belongs to an already found word
            for (let item of TARGET_WORDS) {
                if (item.found && wordPositions[item.word]) {
                    if (wordPositions[item.word].some(pos => pos.r === r && pos.c === c)) {
                        cell.classList.add("found");
                    }
                }
            }

            // Cell click / selection logic
            cell.addEventListener("click", () => handleCellClick(r, c, cell));

            gridEl.appendChild(cell);
        }
    }
}

function renderWordList() {
    const listEl = document.getElementById("word-target-list");
    listEl.innerHTML = "";

    TARGET_WORDS.forEach(item => {
        const li = document.createElement("li");
        li.className = `target-word-item ${item.found ? 'word-found' : ''}`;
        li.id = `target-${item.word}`;
        li.innerHTML = `
            <span>${item.word}</span>
            <span class="word-emoji">${item.found ? '💀❌' : item.emoji}</span>
        `;
        listEl.appendChild(li);
    });

    updateSufferingMeter();
}

function updateSufferingMeter() {
    const foundCount = TARGET_WORDS.filter(w => w.found).length;
    const pct = Math.round((foundCount / TARGET_WORDS.length) * 100);
    const fill = document.getElementById("pain-meter-fill");
    fill.style.width = Math.max(10, pct) + "%";
    fill.textContent = `${pct}% (${pct === 100 ? 'UNSUFFERABLE MASTER' : 'PURE AGONY'})`;

    if (foundCount === TARGET_WORDS.length) {
        showStatus("🚨 YOU FOUND ALL WORDS?! HOW DARE YOU BE PRODUCTIVE?! 🚨", "#39ff14");
        spawnConfettiDisaster();
    }
}

// ---------------------------------------------------------
// CELL CLICK & WORD SELECTION
// ---------------------------------------------------------

function handleCellClick(r, c, cellEl) {
    playCursedSound('type');

    // Toggle cell in selected list
    const index = selectedCells.findIndex(pos => pos.r === r && pos.c === c);
    if (index >= 0) {
        selectedCells.splice(index, 1);
        cellEl.classList.remove("selected");
    } else {
        selectedCells.push({ r, c, char: gridData[r][c] });
        cellEl.classList.add("selected");
    }

    // Build word from currently selected cells
    const currentWord = selectedCells.map(c => c.char).join("");
    const reversedWord = currentWord.split("").reverse().join("");

    // Put current formed text into the input box to show interactivity!
    const input = document.getElementById("word-input");
    if (selectedCells.length > 0) {
        input.value = currentWord;
    }

    // Check if it matches any target word
    const matched = TARGET_WORDS.find(w => !w.found && (w.word === currentWord || w.word === reversedWord));
    if (matched) {
        claimFoundWord(matched.word);
        clearSelection();
    }
}

function clearSelection() {
    selectedCells = [];
    document.querySelectorAll(".grid-cell.selected").forEach(el => el.classList.remove("selected"));
}

// ---------------------------------------------------------
// SEARCH INPUT & SUBMISSION
// ---------------------------------------------------------

function performSearch() {
    const input = document.getElementById("word-input");
    const rawVal = input.value.trim().toUpperCase();

    if (!rawVal) {
        showStatus("⚠️ YOU TYPED NOTHING! DO YOU THINK THIS IS A JOKE?! ⚠️", "#ff0055");
        playCursedSound('error');
        spawnAlertPopup("EMPTY WORD SYNDROME", "You searched for literally nothing. Are you proud of yourself? 🤷‍♂️");
        return;
    }

    // Search against targets
    const targetObj = TARGET_WORDS.find(w => w.word === rawVal);

    if (targetObj) {
        if (targetObj.found) {
            showStatus(`🙄 ALREADY FOUND "${rawVal}", GET SOME NEW BRAINCELLS!`, "#ffff00");
            playCursedSound('error');
        } else {
            claimFoundWord(rawVal);
        }
    } else {
        // Not in list: give rude, hilarious feedback
        playCursedSound('error');
        const insults = [
            `❌ ERROR 404: "${rawVal}" IS TOO INTELLIGENT FOR THIS WEBSITE!`,
            `💩 NOPE! "${rawVal}" WAS DELETED BY THE GOVERNMENT!`,
            `🤡 DID YOU INVENT "${rawVal}" IN YOUR DREAMS?! NOT FOUND!`,
            `📉 FAILED! YOUR SEARCH WASTED 4 KILOWATTS OF COAL ENERGY!`,
            `🪳 "${rawVal}" IS CURRENTLY BEING DIGESTED BY A COCKROACH!`
        ];
        const chosenInsult = insults[Math.floor(Math.random() * insults.length)];
        showStatus(chosenInsult, "#ff0000");

        // Decrement score
        score -= Math.floor(Math.random() * 500) + 100;
        document.getElementById("cursed-score").textContent = score;

        // Trigger word alert popup
        spawnAlertPopup(rawVal, `Our toxic algorithm analyzed "${rawVal}" and concluded it has zero nutritional value.`);
    }

    // Wobble input box violently
    input.style.transform = `scale(1.15) rotate(${Math.random() * 10 - 5}deg)`;
    setTimeout(() => {
        input.style.transform = "";
    }, 200);
}

function claimFoundWord(word) {
    const targetObj = TARGET_WORDS.find(w => w.word === word);
    if (!targetObj) return;

    targetObj.found = true;
    playCursedSound('found');

    // Highlight cells in grid
    const coords = wordPositions[word] || [];
    coords.forEach(pos => {
        const cell = document.querySelector(`.grid-cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
        if (cell) {
            cell.classList.remove("selected");
            cell.classList.add("found");
        }
    });

    // Update list UI
    renderWordList();

    // Reward with terrible score decrease (it's the worst UI!)
    score -= 1000;
    document.getElementById("cursed-score").textContent = score;

    showStatus(`🎉 UNFORTUNATELY YOU LOCATED "${word}"! PENALTY: -1000 POINTS! 📉`, "#39ff14");

    // Clear input
    document.getElementById("word-input").value = "";

    // Moldy toast comments
    moldyToastSays(`Congrats on finding ${word}! You are now 0.001% closer to wasting your entire afternoon! 🍞`);
}

function showStatus(text, color) {
    const feedback = document.getElementById("search-feedback");
    const statusText = feedback.querySelector(".status-text");
    statusText.textContent = text;
    statusText.style.color = color || "#00ffff";
    feedback.style.transform = `rotate(${Math.random() * 4 - 2}deg) scale(1.02)`;
    setTimeout(() => {
        feedback.style.transform = "";
    }, 400);
}

// ---------------------------------------------------------
// RANDOM EMOJI DRIFTERS
// ---------------------------------------------------------

const EMOJI_POOL = ["💩", "🤡", "🤮", "🪳", "🥑", "💀", "👁️", "🌭", "🔥", "🍌", "💥", "⚡", "🧀", "🥒", "🩼", "📉", "🎉", "🍞"];

function spawnBackgroundEmoji() {
    const container = document.getElementById("emoji-cloud");
    const emoji = document.createElement("div");
    emoji.className = "floating-emoji";
    emoji.textContent = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
    emoji.style.left = Math.random() * 95 + "vw";
    emoji.style.animationDuration = (8 + Math.random() * 8) + "s";
    emoji.style.fontSize = (20 + Math.random() * 30) + "px";

    container.appendChild(emoji);

    setTimeout(() => {
        emoji.remove();
    }, 16000);
}

function spawnConfettiDisaster() {
    for (let i = 0; i < 40; i++) {
        setTimeout(spawnBackgroundEmoji, i * 60);
    }
}

// ---------------------------------------------------------
// POPUPS & ANNOYANCES ENGINE
// ---------------------------------------------------------

function closePopup(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
    playCursedSound('type');
}

function spawnPopup(type) {
    playCursedSound('chaos');
    if (type === 'ram') {
        const popup = document.getElementById("spin-popup");
        if (popup) popup.style.display = "flex";
    }
}

function spawnAlertPopup(title, body) {
    const popup = document.getElementById("word-alert-popup");
    const head = document.getElementById("alert-word-heading");
    const desc = document.getElementById("alert-word-body");
    if (head) head.textContent = `🚨 SUSPICIOUS WORD: ${title} 🚨`;
    if (desc) desc.textContent = body;
    if (popup) popup.style.display = "flex";
}

function confirmWordAlert() {
    closePopup('word-alert-popup');
    showStatus("YOU PERSISTED IN YOUR FOLLY. NOTHING WAS ACCOMPLISHED! 💥", "#ff9900");
}

function solveRiddle() {
    const input = document.getElementById("riddle-input");
    playCursedSound('chaos');
    alert(`INCORRECT! The answer was "POTATO". Your virtual toaster has exploded in shipping! 🍞💥`);
    closePopup('spin-popup');
}

// The Runaway Decline Button in the Cookie Banner
function setupRunawayCookieBtn() {
    const btn = document.getElementById("runaway-cookie-btn");
    if (!btn) return;

    btn.addEventListener("mouseenter", () => {
        const randX = Math.random() * 320 - 160;
        const randY = Math.random() * 140 - 70;
        btn.style.transform = `translate(${randX}px, ${randY}px) rotate(${Math.random() * 30 - 15}deg)`;
        playCursedSound('type');
    });

    btn.addEventListener("click", () => {
        alert("NICE TRY! Decline is not recognized under Galactic Law 🌌. 12,000 extra cookies added!");
        closePopup('cookie-popup');
    });

    const acceptBtn = document.getElementById("accept-cookies-btn");
    if (acceptBtn) {
        acceptBtn.addEventListener("click", () => {
            playCursedSound('found');
            closePopup('cookie-popup');
            setTimeout(() => {
                alert("🍪 9,418 COOKIES SUCCESSFULLY INJECTED INTO YOUR TOASTER! ENJOY!");
            }, 300);
        });
    }
}

// ---------------------------------------------------------
// MOLDY TOAST ASSISTANT
// ---------------------------------------------------------

const TOAST_QUOTES = [
    "It looks like you're trying to read text! Would you like me to invert your colors? 🍞",
    "Did you know clicking buttons burns 0.000001 calories? Keep going! 🪳",
    "I'm detecting elevated frustration levels. Good! Working as intended! ✨",
    "Warning: Searching for words in a word search is considered cheating! 🚨",
    "Have you considered looking behind your monitor for the words? 👀",
    "Your current session is being monitored by our elite team of raccoons 🦝."
];

function moldyToastSays(text) {
    const bubble = document.getElementById("assistant-bubble");
    if (bubble) {
        bubble.textContent = text;
        bubble.style.transform = `scale(1.1) rotate(${Math.random() * 6 - 3}deg)`;
        setTimeout(() => { bubble.style.transform = ""; }, 300);
    }
}

function setupAssistant() {
    const avatar = document.getElementById("assistant-clicker");
    const dismissBtn = document.getElementById("assistant-dismiss-btn");
    const assistant = document.getElementById("cursed-assistant");

    if (avatar) {
        avatar.addEventListener("click", () => {
            playCursedSound('chaos');
            const quote = TOAST_QUOTES[Math.floor(Math.random() * TOAST_QUOTES.length)];
            moldyToastSays(quote);
        });
    }

    if (dismissBtn) {
        dismissBtn.addEventListener("click", () => {
            // Refuses to close or comes back instantly
            playCursedSound('error');
            dismissBtn.textContent = "I NEVER LEAVE 😈";
            setTimeout(() => {
                dismissBtn.textContent = "❌ SHUT UP";
            }, 2000);
            moldyToastSays("You cannot dismiss me, mortal! I am woven into the DOM! 🍞🪳");
        });
    }
}

// ---------------------------------------------------------
// CHAOTIC BUTTON HANDLERS
// ---------------------------------------------------------

function setupEventListeners() {
    // Search Button
    const searchBtn = document.getElementById("search-btn");
    if (searchBtn) {
        searchBtn.addEventListener("click", performSearch);
    }

    // Input Keypress
    const input = document.getElementById("word-input");
    if (input) {
        input.addEventListener("keydown", (e) => {
            playCursedSound('type');
            if (e.key === "Enter") {
                performSearch();
            }
        });
        // Jiggle on typing
        input.addEventListener("input", () => {
            input.style.letterSpacing = `${Math.floor(Math.random() * 8) + 2}px`;
        });
    }

    // "DO NOT PRESS" Button
    const fakeBtn1 = document.getElementById("fake-btn-1");
    if (fakeBtn1) {
        fakeBtn1.addEventListener("click", () => {
            playCursedSound('chaos');
            document.body.style.filter = "invert(1)";
            showStatus("💥 YOU WERE WARNED! COLOR SPECTRUM SHATTERED! 💥", "#ff0000");
            spawnConfettiDisaster();
            setTimeout(() => {
                document.body.style.filter = "";
            }, 1200);
        });
    }

    // Scramble Eyeballs Button
    const scrambleBtn = document.getElementById("scramble-btn");
    if (scrambleBtn) {
        scrambleBtn.addEventListener("click", () => {
            playCursedSound('chaos');
            initializeGrid();
            showStatus("🌪️ PUZZLE RESHAKEN! GOOD LUCK FINDING ANYTHING NOW! 🌪️", "#ffff00");
        });
    }

    // Worse Mode Toggle
    const themeBtn = document.getElementById("theme-destroyer");
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            playCursedSound('chaos');
            document.body.classList.toggle("worse-mode");
            if (document.body.classList.contains("worse-mode")) {
                themeBtn.textContent = "🌈 SAVE MY RETINAS (DEACTIVATE) 🌈";
            } else {
                themeBtn.textContent = "☣️ ACTIVATE WORSE MODE ☣️";
            }
        });
    }

    // Sound Toggle
    const soundBtn = document.getElementById("sound-toggle-btn");
    if (soundBtn) {
        soundBtn.addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            soundBtn.textContent = soundEnabled ? "🔊 UNMUTE CURSED SOUNDS" : "🔇 CURSED SOUNDS MUTED";
            if (soundEnabled) playCursedSound('found');
        });
    }

    // Timer & Score Ticker
    setInterval(() => {
        secondsWasted++;
        const hrs = String(Math.floor(secondsWasted / 3600)).padStart(2, '0');
        const mins = String(Math.floor((secondsWasted % 3600) / 60)).padStart(2, '0');
        const secs = String(secondsWasted % 60).padStart(2, '0');
        const timerEl = document.getElementById("cursed-timer");
        if (timerEl) {
            timerEl.textContent = `${hrs}:${mins}:${secs}`;
        }
    }, 1000);

    // Emoji spawner interval
    setInterval(spawnBackgroundEmoji, 1500);

    // Periodic unwanted popups (every 50 seconds if idle)
    setInterval(() => {
        if (Math.random() > 0.5) {
            spawnPopup('ram');
        }
    }, 50000);
}

// ---------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------

window.addEventListener("DOMContentLoaded", () => {
    initializeGrid();
    setupRunawayCookieBtn();
    setupAssistant();
    setupEventListeners();

    // Initial shower of emojis
    for (let i = 0; i < 15; i++) {
        setTimeout(spawnBackgroundEmoji, i * 150);
    }
});
