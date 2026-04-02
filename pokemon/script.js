let pokemon_all = [[]];

let target, current, rounds, skips;
let used_dex, used_stats;
let r;

const statsNames = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

async function loadData() {
    const response = await fetch("/pokemon/stats.csv");
    const text = await response.text();

    const lines = text.trim().split("\n");

    for (let line of lines) {
        const parts = line.split(",");

        const dex = parseInt(parts[0]);
        let name = parts[1];
        let name2 = parts[2] || parts[1];

        const stats = parts.slice(3).map(x => parseInt(x));
        const entry = [name, name2, ...stats];

        if (pokemon_all.length < dex + 1) {
            pokemon_all.push([entry]);
        } else {
            pokemon_all[dex].push(entry);
        }
    }

    // merge identical forms
    for (let i = 0; i < pokemon_all.length; i++) {
        let x = pokemon_all[i];
        if (x.length > 1) {
            let holds = true;
            let d = x[0];
            for (let p of x.slice(1)) {
                if (JSON.stringify(d.slice(2)) !== JSON.stringify(p.slice(2))) {
                    holds = false;
                }
            }
            if (holds) {
                pokemon_all[i] = [[d[0], d[0], ...d.slice(2)]];
            }
        }
    }
}

function startGame() {
    target = Math.floor(Math.random() * 201) + 400;
    current = 0;
    rounds = 6;
    skips = 2;

    used_dex = new Set();
    used_stats = new Set();

    r = 0;

    nextRound();
}

function updateInfo() {
    document.getElementById("info").innerText =
        `Round ${r+1}/6 | Target: ${target} | Current: ${current} | Remaining: ${target - current} | Skips: ${skips}`;
}

function nextRound() {
    // Clear previous round display
    document.getElementById("pokemon").innerText = "";
    document.getElementById("choices").innerHTML = "";

    if (r >= rounds) {
        endGame();
        return;
    }

    let dex = Math.floor(Math.random() * (pokemon_all.length - 1)) + 1;
    while (!pokemon_all[dex] || pokemon_all[dex].length === 0 || used_dex.has(dex)) {
        dex = Math.floor(Math.random() * (pokemon_all.length - 1)) + 1;
    }

    used_dex.add(dex);
    let pokemon = pokemon_all[dex][Math.floor(Math.random() * pokemon_all[dex].length)];
    let name = pokemon[1];

    updateInfo();
    document.getElementById("pokemon").innerText = `Pokémon: ${name}`;

    let choicesDiv = document.getElementById("choices");

    // stat buttons
    for (let i = 1; i <= 6; i++) {
        if (!used_stats.has(String(i))) {
            let btn = document.createElement("button");
            btn.innerText = statsNames[i-1];

            // spacing
            btn.style.marginRight = "0.5em";
            btn.style.marginBottom = "0.5em";

            btn.onclick = () => {
                used_stats.add(String(i));
                let value = pokemon[i+1];
                current += value;

                // remove stat buttons
                choicesDiv.innerHTML = "";

                // show in-page output
                const output = document.createElement("p");
                output.innerText = `${name}'s ${statsNames[i-1]} was ${value}!`;
                choicesDiv.appendChild(output);

                // add "OK" button to continue
                const okBtn = document.createElement("button");
                okBtn.innerText = "OK";
                okBtn.onclick = () => {
                    r++;
                    nextRound();
                };
                choicesDiv.appendChild(okBtn);
            };

            choicesDiv.appendChild(btn);
        }
    }

    // skip button
    if (skips > 0) {
        let skipBtn = document.createElement("button");
        skipBtn.innerText = "Skip";

        skipBtn.onclick = () => {
            skips--;
            nextRound();
        };

        choicesDiv.appendChild(skipBtn);
    }
}

function endGame() {
    document.getElementById("choices").innerHTML = "";
    document.getElementById("pokemon").innerText = "";

    let diff = Math.abs(target - current);
    let resultText = `Final: ${current} | Target: ${target} | Diff: ${diff}\n`;

    if (diff === 0) resultText += "Perfect!";
    else if (diff <= 25) resultText += "Very close! You win!";
    else if (diff <= 50) resultText += "Close.";
    else resultText += "Way off.";

    const choicesDiv = document.getElementById("choices");
    const result = document.createElement("p");
    result.innerText = resultText;
    choicesDiv.appendChild(result);
}

// Attach to start button
document.getElementById("nextBtn").onclick = startGame;

// Load CSV and prepare game
loadData();