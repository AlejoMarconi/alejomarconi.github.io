const FILAS = 4;
const COLUMNAS = 4;
const gridContainer = document.getElementById('grid-container');
const scoreDisplay = document.getElementById('score');
const UMBRAL_MOVIMIENTO = 10; // Umbral en píxeles para considerar un movimiento

class Logica {
  constructor() {
    this.tablero = Array(FILAS).fill().map(() => Array(COLUMNAS).fill(0));
    this.puntaje = 0;
    this.inicializarTablero();
  }

  inicializarTablero() {
    this.agregarValorRandom();
    this.agregarValorRandom();
  }

  getTablero() {
    return this.tablero;
  }

  agregarValor(posF, posC, valor) {
    if (posF >= FILAS || posF < 0 || posC >= COLUMNAS || posC < 0) {
      throw new Error("Posicion erronea");
    }
    this.tablero[posF][posC] = valor;
  }

  agregarValorRandom() {
    let value = Math.random() < 0.9 ? 2 : 4;
    let x, y;
    do {
      x = Math.floor(Math.random() * FILAS);
      y = Math.floor(Math.random() * COLUMNAS);
    } while (this.tablero[x][y] != 0);
    this.tablero[x][y] = value;
  }

  moverDerecha() {
    let movida = false;
    for (let f = 0; f < this.tablero.length; f++) {
      for (let col = this.tablero[f].length - 2; col >= 0; col--) {
        if (this.tablero[f][col] != 0) {
          let pos = col + 1;
          while (pos < this.tablero[f].length && this.tablero[f][pos] == 0) {
            pos++;
          }
          if (pos < this.tablero[f].length && this.tablero[f][pos] == this.tablero[f][col]) {
            this.tablero[f][pos] *= 2;
            this.puntaje += this.tablero[f][pos];
            this.tablero[f][col] = 0;
            movida = true;
          } else {
            this.tablero[f][pos - 1] = this.tablero[f][col];
            if (pos - 1 != col) {
              this.tablero[f][col] = 0;
            }
            movida = true;
          }
        }
      }
    }
    if (movida) {
      this.agregarValorRandom();
    }
    return movida;
  }

  moverIzquierda() {
    let movida = false;

    for (let f = 0; f < this.tablero.length; f++) {
      for (let col = 1; col < this.tablero[f].length; col++) {
        if (this.tablero[f][col] != 0) {
          let pos = col - 1;
          while (pos >= 0 && this.tablero[f][pos] == 0) {
            pos--;
          }
          if (pos >= 0 && this.tablero[f][pos] == this.tablero[f][col]) {
            this.tablero[f][pos] *= 2;
            this.puntaje += this.tablero[f][pos];
            this.tablero[f][col] = 0;
            movida = true;
          } else {
            this.tablero[f][pos + 1] = this.tablero[f][col];
            if (pos + 1 != col) {
              this.tablero[f][col] = 0;
            }
            movida = true;
          }
        }
      }
    }
    if (movida) {
      this.agregarValorRandom();
    }
    return movida;
  }

  moverAbajo() {
    let movida = false;

    for (let col = 0; col < this.tablero[0].length; col++) {
      for (let fila = this.tablero.length - 2; fila >= 0; fila--) {
        if (this.tablero[fila][col] != 0) {
          let pos = fila + 1;
          while (pos < this.tablero.length && this.tablero[pos][col] == 0) {
            pos++;
          }
          if (pos < this.tablero.length && this.tablero[pos][col] == this.tablero[fila][col]) {
            this.tablero[pos][col] *= 2;
            this.puntaje += this.tablero[pos][col];
            this.tablero[fila][col] = 0;
            movida = true;
          } else {
            this.tablero[pos - 1][col] = this.tablero[fila][col];
            if (pos - 1 != fila) {
              this.tablero[fila][col] = 0;
            }
            movida = true;
          }
        }
      }
    }
    if (movida) {
      this.agregarValorRandom();
    }
    return movida;
  }

  moverArriba() {
    let movida = false;

    for (let col = 0; col < this.tablero[0].length; col++) {
      for (let fila = 1; fila < this.tablero.length; fila++) {
        if (this.tablero[fila][col] != 0) {
          let pos = fila - 1;
          while (pos >= 0 && this.tablero[pos][col] == 0) {
            pos--;
          }
          if (pos >= 0 && this.tablero[pos][col] == this.tablero[fila][col]) {
            this.tablero[pos][col] *= 2;
            this.puntaje += this.tablero[pos][col];
            this.tablero[fila][col] = 0;
            movida = true;
          } else {
            this.tablero[pos + 1][col] = this.tablero[fila][col];
            if (pos + 1 != fila) {
              this.tablero[fila][col] = 0;
            }
            movida = true;
          }
        }
      }
    }
    if (movida) {
      this.agregarValorRandom();
    }
    return movida;
  }
}

const logica = new Logica();

function actualizarTablero() {
  const tablero = logica.getTablero();
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      const cell = document.getElementById(`celda-${f}-${c}`);
      cell.textContent = tablero[f][c] === 0 ? '' : tablero[f][c];
    }
  }
}

function actualizarPuntaje() {
  scoreDisplay.textContent = logica.puntaje;
}

function mover(direccion) {
  let movida = false;
  switch (direccion) {
    case 'arriba':
      movida = logica.moverArriba();
      break;
    case 'abajo':
      movida = logica.moverAbajo();
      break;
    case 'izquierda':
      movida = logica.moverIzquierda();
      break;
    case 'derecha':
      movida = logica.moverDerecha();
      break;
  }

  if (movida) {
    actualizarTablero();
    actualizarPuntaje();
  }
}

function handleTouchMove(event) {
  event.preventDefault();
}

document.addEventListener('touchmove', handleTouchMove, { passive: false });

function handleTouch(event) {
  const touch = event.touches[0];
  const startX = touch.clientX;
  const startY = touch.clientY;

  function handleTouchEnd(endEvent) {
    endEvent.preventDefault();

    const endX = endEvent.changedTouches[0].clientX;
    const endY = endEvent.changedTouches[0].clientY;

    const xDiff = Math.abs(startX - endX);
    const yDiff = Math.abs(startY - endY);

    // Verificar si el movimiento supera el umbral
    if (xDiff > UMBRAL_MOVIMIENTO || yDiff > UMBRAL_MOVIMIENTO) {
      if (xDiff > yDiff) {
        if (startX < endX) {
          mover('derecha');
        } else {
          mover('izquierda');
        }
      } else {
        if (startY < endY) {
          mover('abajo');
        } else {
          mover('arriba');
        }
      }
    }

    document.removeEventListener('touchend', handleTouchEnd);
  }

  document.addEventListener('touchend', handleTouchEnd);
}

gridContainer.addEventListener('touchstart', handleTouch);

actualizarTablero();
actualizarPuntaje();
