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
let isFastDrop = false;

//Dibuja el tablero de juego en el canvas.
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

//Dibuja el tetromino actual en el canvas.
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

//Mueve el tetromino hacia abajo y verifica colisiones.
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


//Rota el tetromino y verifica colisiones.
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

// Verifica si el tetromino actual colisiona con el tablero o los bordes.
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

// Fusiona el tetromino en el tablero.
function merge() {
    tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[tetromino.y + y][tetromino.x + x] = value;
            }
        });
    });
}

// Resetea el tetromino actual a una nueva forma.
function resetTetromino() {
    tetromino.shape = getRandomShape();
    tetromino.x = 3;
    tetromino.y = 0;
}

// Elimina las líneas completas del tablero.
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

// Actualiza el puntaje en función de las líneas eliminadas.
function updateScore(linesCleared) {
    if (linesCleared > 0) {
        // Cada línea eliminada otorga 100 puntos
        score += linesCleared * 100;
        document.getElementById('score').textContent = `Score: ${score}`;
    }
}

// Actualiza el juego, mueve el tetromino y dibuja el tablero.
function update(time = 0) {
    if (gameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        moveDown();
        dropCounter = 0;
        console.log('Tetromino movido hacia abajo');  // Verificar si se llama a moveDown
    }

    drawBoard();
    drawTetromino();
    requestAnimationFrame(update);
}

// Reinicia el juego.
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

// Configuración para el control táctil
const MOVE_THRESHOLD = 15;  // Ajusta el umbral según sea necesario
const MOVE_COOLDOWN = 100;  // Tiempo en milisegundos entre movimientos
const DROP_INTERVAL_FAST = 50; // Intervalo rápido para la bajada
const DROP_INTERVAL_NORMAL = 500; // Intervalo normal para la bajada

let lastMoveTime = 0;
let isDragging = false;
let touchStartX, touchStartY;
let touchStartTime;
let touchMoveInterval;

function handleTouchStart(event) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();

    // Iniciar el intervalo de bajada rápida
    touchMoveInterval = setInterval(() => {
        if (!isFastDrop) {
            isFastDrop = true;
            dropInterval = DROP_INTERVAL_FAST;
        }
        dropCounter += DROP_INTERVAL_FAST;
        update();  // Llama a la función de actualización para mover la pieza hacia abajo
    }, DROP_INTERVAL_FAST);
}

function handleTouchMove(event) {
    event.preventDefault();  // Previene el comportamiento predeterminado del navegador

    const touch = event.touches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    const now = Date.now();

    if (now - lastMoveTime < MOVE_COOLDOWN) {
        return;  // Ignora movimientos si el tiempo de enfriamiento no ha pasado
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > MOVE_THRESHOLD) {
            lastMoveTime = now;  // Actualiza el tiempo de la última acción
            if (deltaX > MOVE_THRESHOLD) {
                moveRight();
            } else if (deltaX < -MOVE_THRESHOLD) {
                moveLeft();
            }
            isDragging = true;
        }
    } else {
        if (Math.abs(deltaY) > MOVE_THRESHOLD) {
            lastMoveTime = now;  // Actualiza el tiempo de la última acción
            if (deltaY > MOVE_THRESHOLD) {
                // Este bloque se maneja con el intervalo de bajada
            }
            isDragging = true;
        }
    }
}

function handleTouchEnd(event) {
    clearInterval(touchMoveInterval);  // Detén el intervalo de bajada rápida

    if (isDragging) {
        isDragging = false;
        isFastDrop = false;
        dropInterval = DROP_INTERVAL_NORMAL;  // Restablecer la velocidad cuando se suelta
    } else if (Date.now() - touchStartTime >= MOVE_COOLDOWN) {
        rotate();
    }
}

// Agrega los listeners de eventos táctiles
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);
document.addEventListener('touchend', handleTouchEnd, false);

// Configura el botón de reinicio
document.getElementById('restart-button').addEventListener('click', restartGame);

// Inicia el juego
requestAnimationFrame(update);
