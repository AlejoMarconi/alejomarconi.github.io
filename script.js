const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

const grid = 32;
const rows = 20;
const cols = 10;

const tetrominoes = [
    // I
    [
        [1, 1, 1, 1]
    ],
    // T
    [
        [0, 1, 0],
        [1, 1, 1]
    ],
    // O
    [
        [1, 1],
        [1, 1]
    ],
    // L
    [
        [1, 0, 0],
        [1, 1, 1]
    ],
    // J
    [
        [0, 0, 1],
        [1, 1, 1]
    ],
    // Z
    [
        [1, 1, 0],
        [0, 1, 1]
    ],
    // S
    [
        [0, 1, 1],
        [1, 1, 0]
    ]
];

const colors = [
    null,
    'cyan',
    'purple',
    'yellow',
    'orange',
    'blue',
    'red',
    'green'
];

let board = Array.from({ length: rows }, () => Array(cols).fill(0));
let score = 0;

let tetromino = {
    x: 3,
    y: 0,
    shape: getRandomShape(),
};

let dropCounter = 0;
let dropInterval = 500;  // Intervalo normal
let lastTime = 0;
let gameOver = false;

function drawBoard() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                context.fillStyle = colors[value];
                context.fillRect(x * grid, y * grid, grid, grid);
                context.strokeStyle = '#333'; // Color del borde
                context.lineWidth = 1; // Grosor del borde
                context.strokeRect(x * grid, y * grid, grid, grid); // Dibujar el borde
            }
        });
    });
}

function drawTetromino() {
    tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                context.fillStyle = colors[value];
                context.fillRect((tetromino.x + x) * grid, (tetromino.y + y) * grid, grid, grid);
                context.strokeStyle = '#333'; // Color del borde
                context.lineWidth = 1; // Grosor del borde
                context.strokeRect((tetromino.x + x) * grid, (tetromino.y + y) * grid, grid, grid); // Dibujar el borde
            }
        });
    });
}

function getRandomShape() {
    const rand = Math.floor(Math.random() * tetrominoes.length);
    return tetrominoes[rand];
}

function moveDown() {
    tetromino.y++;
    if (collides()) {
        tetromino.y--;
        merge();
        const linesCleared = clearLines();
        updateScore(linesCleared);
        resetTetromino();
        if (collides()) {
            gameOver = true;
            showGameOverScreen();
        }
    }
    dropCounter = 0;
}

function moveLeft() {
    tetromino.x--;
    if (collides()) {
        tetromino.x++;
    }
}

function moveRight() {
    tetromino.x++;
    if (collides()) {
        tetromino.x--;
    }
}

function rotate() {
    const previousShape = tetromino.shape;
    const N = tetromino.shape.length;

    // Rotar la matriz 90 grados en sentido horario
    const rotatedShape = tetromino.shape[0].map((_, index) =>
        tetromino.shape.map(row => row[index]).reverse()
    );

    tetromino.shape = rotatedShape;

    // Verificar colisiones tras la rotación
    const originalX = tetromino.x;
    let offset = 0;
    while (collides()) {
        offset++;
        tetromino.x = originalX + offset;

        if (offset > N) {
            tetromino.shape = previousShape;
            tetromino.x = originalX;
            break;
        }
    }
}

function collides() {
    return tetromino.shape.some((row, y) => {
        return row.some((value, x) => {
            if (value) {
                const newX = tetromino.x + x;
                const newY = tetromino.y + y;
                return (
                    newX < 0 ||
                    newX >= cols ||
                    newY >= rows ||
                    board[newY] && board[newY][newX]
                );
            }
            return false;
        });
    });
}

function merge() {
    tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[tetromino.y + y][tetromino.x + x] = value;
            }
        });
    });
}

function resetTetromino() {
    tetromino.shape = getRandomShape();
    tetromino.x = 3;
    tetromino.y = 0;
}

function clearLines() {
    let linesCleared = 0;
    for (let y = rows - 1; y >= 0; y--) {
        if (board[y].every(value => value !== 0)) {
            board.splice(y, 1);  // Elimina la fila completa
            board.unshift(Array(cols).fill(0));  // Agrega una nueva fila vacía en la parte superior
            linesCleared++;
            y++;  // Revisar la fila actual nuevamente después de que la fila superior haya caído
        }
    }
    return linesCleared;
}

function updateScore(linesCleared) {
    if (linesCleared > 0) {
        // Cada línea eliminada otorga 100 puntos
        score += linesCleared * 100;
        document.getElementById('score').textContent = `Score: ${score}`;
    }
}

function update(time = 0) {
    if (gameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        moveDown();
        dropCounter = 0;
    }

    drawBoard();
    drawTetromino();
    requestAnimationFrame(update);
}

function restartGame() {
    board = Array.from({ length: rows }, () => Array(cols).fill(0));
    score = 0;
    document.getElementById('score').textContent = `Score: ${score}`;
    tetromino = {
        x: 3,
        y: 0,
        shape: getRandomShape(),
    };
    gameOver = false;
    hideGameOverScreen();
    requestAnimationFrame(update);
}

function showGameOverScreen() {
    const finalScoreElement = document.getElementById('final-score');
    finalScoreElement.textContent = `Puntuación Final: ${score}`;
    document.getElementById('game-over-screen').style.display = 'flex';
}

function hideGameOverScreen() {
    document.getElementById('game-over-screen').style.display = 'none';
}

document.addEventListener('keydown', event => {
    if (gameOver) return;

    if (event.key === 'ArrowLeft') {
        moveLeft();
    } else if (event.key === 'ArrowRight') {
        moveRight();
    } else if (event.key === 'ArrowUp' || event.key === ' ') {  // 'ArrowUp' o 'espacio' para rotar
        rotate();
    } else if (event.key === 'ArrowDown') {
        moveDown();
        dropInterval = 50;  // Aumentar la velocidad cuando se presiona 'abajo'
    }
});

document.addEventListener('keyup', event => {
    if (event.key === 'ArrowDown') {
        dropInterval = 500;  // Restablecer la velocidad cuando se suelta 'abajo'
    }
});

document.getElementById('restart-button').addEventListener('click', restartGame);

document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);
document.addEventListener('touchend', handleTouchEnd, false);

let touchStartX, touchStartY;

function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchMove(event) {
    if (gameOver) return;

    const touch = event.touches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 10) {
            console.log("Version 5")
            moveRight();
        } else if (deltaX < -10) {
            moveLeft();
            console.log("Version 5")
        }
    } else {
        if (deltaY > 10) {
            moveDown();
            console.log("Version 5")
        }
    }
    touchStartX = touchEndX;
    touchStartY = touchEndY;
}

function handleTouchEnd(event) {
    if (gameOver) return;

    const touchEnd = event.changedTouches[0];
    if (touchEnd.clientX === touchStartX && touchEnd.clientY === touchStartY) {
        rotate();
    }
}

// Iniciar la animación
requestAnimationFrame(update);
