document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const width = 10;
    const height = 10;
    const mines = 10;
    const cells = [];
  
    function createBoard() {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const cell = document.createElement('div');
          cell.classList.add('cell');
          cell.dataset.status = 'hidden';
          cell.dataset.x = x;
          cell.dataset.y = y;
          gameBoard.appendChild(cell);
          cells.push(cell);
        }
      }
    }
  
    function placeMines() {
      const minePositions = [];
  
      while (minePositions.length < mines) {
        const randomIndex = Math.floor(Math.random() * cells.length);
        if (!minePositions.includes(randomIndex)) {
          minePositions.push(randomIndex);
        }
      }
  
      minePositions.forEach(index => {
        cells[index].classList.add('mine');
      });
    }
  
    function revealCell(cell) {
      if (cell.dataset.status === 'hidden') {
        cell.dataset.status = 'revealed';
        cell.classList.add('revealed');
  
        if (cell.classList.contains('mine')) {
          alert('¡Boom! Has pisado una mina.');
        } else {
          const adjacentMines = countAdjacentMines(cell);
          if (adjacentMines > 0) {
            cell.textContent = adjacentMines;
          }
        }
      }
    }
  
    function countAdjacentMines(cell) {
      const x = parseInt(cell.dataset.x);
      const y = parseInt(cell.dataset.y);
      let count = 0;
  
      for (let i = Math.max(0, y - 1); i <= Math.min(height - 1, y + 1); i++) {
        for (let j = Math.max(0, x - 1); j <= Math.min(width - 1, x + 1); j++) {
          const adjacentCell = cells[i * width + j];
          if (adjacentCell.classList.contains('mine')) {
            count++;
          }
        }
      }
  
      return count;
    }
  
    function revealAdjacentCells(cell) {
      const x = parseInt(cell.dataset.x);
      const y = parseInt(cell.dataset.y);
  
      for (let i = Math.max(0, y - 1); i <= Math.min(height - 1, y + 1); i++) {
        for (let j = Math.max(0, x - 1); j <= Math.min(width - 1, x + 1); j++) {
          const adjacentCell = cells[i * width + j];
  
          if (adjacentCell.dataset.status === 'hidden' && !adjacentCell.classList.contains('mine')) {
            revealCell(adjacentCell);
  
            if (countAdjacentMines(adjacentCell) === 0) {
              revealAdjacentCells(adjacentCell);
            }
          }
        }
      }
    }
  
    function toggleFlag(cell) {
      if (cell.dataset.status === 'hidden') {
        cell.dataset.status = 'flagged';
        cell.classList.add('flagged');
      } else if (cell.dataset.status === 'flagged') {
        cell.dataset.status = 'hidden';
        cell.classList.remove('flagged');
      }
    }
  
    function checkWin() {
        let revealedCells = 0;
      
        cells.forEach(cell => {
          if (cell.dataset.status === 'revealed' && !cell.classList.contains('mine')) {
            revealedCells++;
          }
        });
      
        if (revealedCells === width * height - mines) {
          alert('¡Felicidades! Has ganado el Buscaminas.');
        }
      }
      
    gameBoard.addEventListener('click', event => {
      if (event.target.classList.contains('cell')) {
        const cell = event.target;
  
        if (cell.dataset.status === 'hidden') {
          revealCell(cell);
  
          if (countAdjacentMines(cell) === 0) {
            revealAdjacentCells(cell);
          }
  
          checkWin();
        }
      }
    });
  
    gameBoard.addEventListener('contextmenu', event => {
      event.preventDefault();
  
      if (event.target.classList.contains('cell')) {
        toggleFlag(event.target);
        checkWin();
      }
    });

    function restartGame() {
        cells.forEach(cell => {
          cell.classList.remove('revealed', 'flagged', 'mine');
          cell.dataset.status = 'hidden';
          cell.textContent = '';
        });
      
        placeMines();
      }
      
      
    function showMines() {
        const showMinesBtn = document.getElementById('show-mines-btn');
    
        cells.forEach(cell => {
        if (cell.classList.contains('mine')) {
            cell.classList.toggle('show-mine');
        }
        });
    
        if (showMinesBtn.textContent === 'Mostrar minas') {
        showMinesBtn.textContent = 'Ocultar minas';
        } else {
        showMinesBtn.textContent = 'Mostrar minas';
        }
    }
      
      document.getElementById('restart-btn').addEventListener('click', restartGame);
      document.getElementById('show-mines-btn').addEventListener('click', showMines);
  
    createBoard();
    placeMines();
  });
  