let pokemon_all = [[]];

let target, current, rounds, skips;
let used_dex, used_stats;
let r;

let round_pokemon = [];
let player_choices = [];

const statsNames = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

// ---------- LOAD DATA ----------
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

// ---------- START GAME ----------
function startGame() {
    target = Math.floor(Math.random() * 201) + 400;
    current = 0;
    rounds = 6;
    skips = 2;

    used_dex = new Set();
    used_stats = new Set();

    round_pokemon = [];
    player_choices = [];

    r = 0;

    nextRound();
}

// ---------- UI ----------
function updateInfo() {
    document.getElementById("info").innerText =
        `Round ${r+1}/6 | Target: ${target} | Current: ${current} | Remaining: ${target - current} | Skips: ${skips}`;
}

// ---------- MAIN LOOP ----------
function nextRound() {
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

    for (let i = 0; i < 6; i++) {
        if (!used_stats.has(i)) {
            let btn = document.createElement("button");
            btn.innerText = statsNames[i];

            btn.style.marginRight = "0.5em";
            btn.style.marginBottom = "0.5em";

            btn.onclick = () => {
                used_stats.add(i);

                let value = pokemon[i + 2];
                current += value;

                round_pokemon.push(pokemon);
                player_choices.push(i);

                choicesDiv.innerHTML = "";

                const output = document.createElement("p");
                output.innerText = `${name}'s ${statsNames[i]} was ${value}!`;
                choicesDiv.appendChild(output);

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

    // Skip (reroll)
    if (skips > 0) {
        let skipBtn = document.createElement("button");
        skipBtn.innerText = "Skip";

        skipBtn.style.display = "block";
        skipBtn.style.marginTop = "0.5em";

        skipBtn.onclick = () => {
            skips--;
            nextRound();
        };

        choicesDiv.appendChild(skipBtn);
    }
}

// ---------- PERMUTATIONS ----------
function getPermutations(arr) {
    if (arr.length === 0) return [[]];

    let result = [];

    for (let i = 0; i < arr.length; i++) {
        let rest = arr.slice(0, i).concat(arr.slice(i + 1));
        let perms = getPermutations(rest);

        for (let p of perms) {
            result.push([arr[i], ...p]);
        }
    }

    return result;
}

// ---------- BEST SOLUTION (TRUE MATCHING) ----------
function findBestScore() {
    const n = round_pokemon.length;

    const perms = getPermutations([...Array(n).keys()]);

    let bestDiff = Infinity;
    let bestTotal = 0;
    let bestAssignment = null;

    for (let perm of perms) {
        let total = 0;

        for (let statIndex = 0; statIndex < n; statIndex++) {
            let pokemonIndex = perm[statIndex];
            let pokemon = round_pokemon[pokemonIndex];

            total += pokemon[statIndex + 2];
        }

        let diff = Math.abs(target - total);

        if (diff < bestDiff) {
            bestDiff = diff;
            bestTotal = total;
            bestAssignment = perm;
        }
    }

    return { bestTotal, bestDiff, bestAssignment };
}

// ---------- END GAME ----------
function endGame() {
    document.getElementById("info").innerText = "";

    document.getElementById("choices").innerHTML = "";
    document.getElementById("pokemon").innerText = "";

    let diff = Math.abs(target - current);
    let resultText = `Final: ${current} | Target: ${target} | Diff: ${diff}\n`;

    if (diff === 0) resultText += "Perfect!";
    else if (diff <= 10) resultText += `Just ${diff} off? Pretty good!`;
    else if (diff <= 25) resultText += "Not terrible.";
    else if (diff <= 50) resultText += "Could be better.";
    else resultText += `You missed by ${diff}...`;

    if (round_pokemon.length > 0) {
        const best = findBestScore();

        resultText += `\n\nBest Possible: ${best.bestTotal} (Diff: ${best.bestDiff})\n\n`;

        // Header
        resultText +=
            "Pokemon".padEnd(18) +
            "Your Stat".padEnd(15) +
            "Value".padEnd(8) +
            "Optimal Stat".padEnd(18) +
            "Value\n";

        resultText += "-".repeat(70) + "\n";

        // Build reverse mapping
        let pokemonToStat = Array(round_pokemon.length);
        for (let statIndex = 0; statIndex < round_pokemon.length; statIndex++) {
            let pokemonIndex = best.bestAssignment[statIndex];
            pokemonToStat[pokemonIndex] = statIndex;
        }

        // Rows
        for (let i = 0; i < round_pokemon.length; i++) {
            let p = round_pokemon[i];

            let yourStatIndex = player_choices[i];
            let yourStatName = statsNames[yourStatIndex];
            let yourValue = p[yourStatIndex + 2];

            let optStatIndex = pokemonToStat[i];
            let optStatName = statsNames[optStatIndex];
            let optValue = p[optStatIndex + 2];

            resultText +=
                p[1].padEnd(18) +
                yourStatName.padEnd(15) +
                String(yourValue).padEnd(8) +
                optStatName.padEnd(18) +
                String(optValue) + "\n";
        }
    }

    const choicesDiv = document.getElementById("choices");
    const result = document.createElement("pre"); // ✅ preserves spacing
    result.innerText = resultText;
    choicesDiv.appendChild(result);
}

// ---------- INIT ----------
document.getElementById("nextBtn").onclick = startGame;
loadData();