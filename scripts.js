document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const width = 10;
    const height = 10;
    const mines = 0;
    const cells = [];
    let gameOver = false;
    let timerInterval;
    let secondsPassed = 0;
  
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
  
      minePositions.forEach((index) => {
        cells[index].classList.add('mine');
      });
    }
  
    function revealCell(cell) {
      if (!gameOver && cell.dataset.status === 'hidden') {
        cell.dataset.status = 'revealed';
        cell.classList.add('revealed');
  
        if (cell.classList.contains('mine')) {
          gameOver = true;
  
          cells.forEach((cell) => {
            if (cell.classList.contains('mine')) {
              cell.dataset.status = 'revealed';
              cell.classList.add('revealed');
            }
          });
  
          stopTimer();
  
          setTimeout(() => {
            alert('¡Boom! Has pisado una mina.');
          }, 250);
        } else {
          const adjacentMines = countAdjacentMines(cell);
          if (adjacentMines > 0) {
            cell.textContent = adjacentMines;
          } else {
            revealAdjacentCells(cell);
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
          }
        }
      }
    }
  
    function showCheatMessage() {
      alert('Tramposa de mierda');
    }
  
    function showMines() {
      if (!gameOver) {
        showCheatMessage();
  
        // cells.forEach((cell) => {
        //   if (cell.classList.contains('mine')) {
        //     cell.classList.add('show-mine');
        //   }
        // });
      }
    }
  
    function restartGame() {
      cells.forEach((cell) => {
        cell.classList.remove('revealed', 'flagged', 'mine', 'show-mine');
        cell.dataset.status = 'hidden';
        cell.textContent = '';
      });
  
      gameOver = false;
      placeMines();
      resetTimer();
    }
  
    function startTimer() {
      timerInterval = setInterval(() => {
        secondsPassed++;
        const minutes = Math.floor(secondsPassed / 60);
        const seconds = secondsPassed % 60;
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
    }
  
    function stopTimer() {
      clearInterval(timerInterval);
    }
  
    function resetTimer() {
      stopTimer();
      secondsPassed = 0;
      document.getElementById('timer').textContent = '0:00';
    }
  
    createBoard();
    placeMines();
  

    function checkWin() {
        let revealedCells = 0;
      
        cells.forEach(cell => {
          if (cell.dataset.status === 'revealed' && !cell.classList.contains('mine')) {
            revealedCells++;
          }
        });
      
        if (revealedCells === width * height - mines) {
          alert('¡Felicidades! Has ganado el Buscaminas.');
          gameOver = true;
          stopTimer();
        }
      }
      

    gameBoard.addEventListener('click', (event) => {
      if (!gameOver && event.target.classList.contains('cell')) {
        if (!timerInterval) {
          startTimer();
        }
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
  
    gameBoard.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (!gameOver && event.target.classList.contains('cell')) {
        const cell = event.target;
        cell.classList.toggle('flagged');
      }
    });
  
    document.getElementById('restart-btn').addEventListener('click', () => {
      resetTimer();
      restartGame();
    });
  
    document.getElementById('show-mines-btn').addEventListener('click', () => {
      showMines();
    });
  });
  
