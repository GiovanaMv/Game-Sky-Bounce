const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isMobile = /Mobi|Android/i.test(navigator.userAgent);
let gameStarted = false;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    radius: 15,
    color: "#ff00ff",
    dy: 0,
    dx: 0,
    maxHeight: 0
};

const fases = 3;
const plataformasPorFase = 40;
const alturaPorFase = 100; // altura entre plataformas
const totalPlataformas = fases * plataformasPorFase;

let platforms = [];
let stars = [];
let keys = {};
let motionX = 0;
let score = 0;
let backgroundHue = 200;

let movingBars = [];
let turbos = [];
let nextBarHeight = 1000;

let calmDots = [];

// Cria plataformas e estrelas
function createPlatforms() {
    platforms = [];
    stars = [];
    movingBars = [];
    turbos = [];
    const spacing = isMobile ? 70 : 50;

    // Plataforma inicial
    platforms.push({
        x: player.x - 50,
        y: canvas.height - 70,
        width: 100,
        height: 10,
        color: "#000000ff",
        type: "normal",
        opacity: 1
    });

    // Geração aleatória
    for (let i = 1; i < 15; i++) {
        const platformPadding = isMobile ? 0 : 250;
        const px = platformPadding + Math.random() * (canvas.width - 100 - platformPadding * 2);

        const spacing = isMobile ? 70 : 40;
        const py = canvas.height - i * spacing;

        const isFake = Math.random() < 0.3;

        platforms.push({
            x: px,
            y: py,
            width: 100,
            height: 10,
            color: isFake ? "#000000" : `hsl(${Math.random() * 360}, 100%, 50%)`,
            type: isFake ? "fake" : "normal",
            used: false,
            opacity: 1
        });

        stars.push({
            x: px + 40,
            y: py - 20,
            collected: false
        });
    }
}

// Fundo psicodélico
function generateCalmDots() {
    calmDots = [];
    const colors = [
        "rgba(255, 214, 245, 1)",
        "rgba(206, 243, 255, 1)",
        "rgba(206, 255, 206, 1)",
        "rgba(255, 245, 188, 1)"
    ];

    // 👉 diminui a quantidade (ex: 20 ao invés de 50)
    for (let i = 0; i < 50; i++) {
        calmDots.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,

            // 👉 aumenta o tamanho (ex: de 10+5 → 30+15)
            baseRadius: Math.random() * 50 + 15,

            pulsePhase: Math.random() * Math.PI * 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function drawWhiteBGWithCalmDots() {
    ctx.fillStyle = "#f5f5f5ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    calmDots.forEach(dot => {
        dot.pulsePhase += 0.01;
        const pulse = Math.sin(dot.pulsePhase) + 1;
        const radius = dot.baseRadius * pulse;

        const gradient = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, radius);
        gradient.addColorStop(0, dot.color);
        gradient.addColorStop(1, dot.color.replace("1)", "0)")); // troca alfa 1 → 0

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    });
}

// Estrela
function drawStar(x, y) {
    const spikes = 10;
    const outerRadius = 10;
    const innerRadius = 5;
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(x, y - outerRadius);
    for (let i = 0; i < spikes; i++) {
        let x1 = x + Math.cos(rot) * outerRadius;
        let y1 = y + Math.sin(rot) * outerRadius;
        ctx.lineTo(x1, y1);
        rot += step;
        let x2 = x + Math.cos(rot) * innerRadius;
        let y2 = y + Math.sin(rot) * innerRadius;
        ctx.lineTo(x2, y2);
        rot += step;
    }
    ctx.lineTo(x, y - outerRadius);
    ctx.closePath();
    ctx.fillStyle = "gold";
    ctx.fill();
}

// Desenha estrelas
function drawStars() {
    stars.forEach(s => {
        if (!s.collected) drawStar(s.x, s.y);
    });
}

// Desenha jogador
function drawPlayer() {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

// Desenha plataformas
function drawPlatforms() {
    platforms.forEach(p => {
        ctx.globalAlpha = p.opacity;
        if (p.type === "fake") {
            ctx.setLineDash([5, 3]);
            ctx.strokeStyle = p.color;
            ctx.strokeRect(p.x, p.y, p.width, p.height);
            ctx.setLineDash([]);
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }
        ctx.globalAlpha = 1;
    });
}

// Atualiza jogador
function updatePlayer() {
    if (!isMobile) {
        player.dx = keys["ArrowLeft"] ? -5 : keys["ArrowRight"] ? 5 : 0;
    } else {
        player.dx = motionX * 5;
    }

    player.x += player.dx;
    player.dy += 0.5;
    player.y += player.dy;

    if (player.x < -player.radius) {
        player.x = canvas.width + player.radius;
    } else if (player.x > canvas.width + player.radius) {
        player.x = -player.radius;
    }

    // Colisão
    platforms.forEach(p => {
        const prevY = player.y - player.dy;
        const wasAbove = prevY + player.radius <= p.y;
        const isBelow = player.y + player.radius >= p.y;
        const horizontal = player.x + player.radius > p.x && player.x - player.radius < p.x + p.width;

        const collided = wasAbove && isBelow && horizontal && player.dy > 0;

        if (collided) {
            if (p.type === "fake" && !p.used) {
                p.used = true;
                player.dy = -14;
                p.opacity = 0;
                p.y = canvas.height + 100;
            } else if (p.type === "normal") {
                player.dy = -14;
            }

            score++;
            player.color = `hsl(${(score * 30) % 360}, 100%, 50%)`;
        }
    });

    // Coleta estrelas
    stars.forEach(s => {
        if (!s.collected && Math.abs(player.x - s.x) < 20 && Math.abs(player.y - s.y) < 20) {
            s.collected = true;
            score += 5;
        }
    });

    // Game over
    if (player.y > canvas.height) {
        alert("Game Over! Pontuação: " + score);
        resetGame();
    }

    // Subida
    if (player.y < canvas.height / 2) {
        const diff = canvas.height / 2 - player.y;
        player.y = canvas.height / 2;
        player.maxHeight += diff;

        platforms.forEach(p => {
            p.y += diff;
            if (p.y > canvas.height) {
                p.y = 0;
                const platformPadding = isMobile ? 0 : 250;
                p.x = platformPadding + Math.random() * (canvas.width - 100 - platformPadding * 2);
                p.type = Math.random() < 0.3 ? "fake" : "normal";
                p.color = p.type === "fake" ? "#000000" : `hsl(${Math.random() * 360}, 100%, 50%)`; p.opacity = 1;
                p.used = false;
            }
        });

        stars.forEach(s => {
            s.y += diff;
            if (s.y > canvas.height) {
                s.y = 0;
                s.x = Math.random() * canvas.width;
                s.collected = false;
            }
        });
    }

    document.getElementById("hud").innerText = `Altura: ${Math.floor(player.maxHeight)}`;
}

// Loop
function gameLoop() {
    if (!gameStarted) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWhiteBGWithCalmDots();
    drawPlatforms();
    drawStars();
    updatePlayer();
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

// Start
function startGame() {
    document.getElementById("startScreen").style.display = "none";
    gameStarted = true;
    generateCalmDots();
    createPlatforms();
    gameLoop();
}

// Reset
function resetGame() {
    score = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.dy = 0;
    player.dx = 0;
    player.maxHeight = 0;
    keys = {};
    createPlatforms();
}

// Loja
function openStore() {
    alert("Loja ainda em construção ✨");
}

// Teclado para desktop
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Movimento para celular
if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", e => {
        const gamma = Math.max(-45, Math.min(45, e.gamma || 0));
        motionX = gamma / 45; // Inverte o valor pra o movimento ficar intuitivo
    });
}
