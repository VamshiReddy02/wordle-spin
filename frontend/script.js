document.addEventListener('DOMContentLoaded', () => {
  const startGameButton = document.getElementById('startGame');
  const submitGuessButton = document.getElementById('submitGuess');
  const gameBoard = document.getElementById('gameBoard');
  const gridElement = document.getElementById('grid');
  const guessInput = document.getElementById('guessInput');
  const messageElement = document.getElementById('message');

  let gameId = null;

  startGameButton.addEventListener('click', async () => {
    const response = await fetch('/api/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();

    if (response.ok) {
      gameId = result.gameId;
      updateGrid(result.grid);
      messageElement.textContent = result.message;
      gameBoard.classList.remove('hidden');
    } else {
      messageElement.textContent = result.message || 'Failed to start the game.';
    }
  });

  submitGuessButton.addEventListener('click', async () => {
    const guess = guessInput.value.trim();

    if (guess.length !== 5) {
      messageElement.textContent = 'Please enter a 5-letter word.';
      return;
    }

    const response = await fetch('/api/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ guess })
    });

    const result = await response.json();

    if (response.ok) {
      updateGrid(result.grid);
      messageElement.textContent = result.message;
      if (result.solved || result.currentRow === 5) {
        guessInput.disabled = true;
        submitGuessButton.disabled = true;
      }
    } else {
      messageElement.textContent = result.message || 'Failed to process the guess.';
    }

    guessInput.value = '';
  });

  function updateGrid(grid) {
    gridElement.innerHTML = '';
    grid.forEach(row => {
      const rowElement = document.createElement('div');
      rowElement.className = 'row';
      row.forEach(letter => {
        const cellElement = document.createElement('div');
        cellElement.className = 'cell';
        cellElement.textContent = letter;
        rowElement.appendChild(cellElement);
      });
      gridElement.appendChild(rowElement);
    });
  }
});
