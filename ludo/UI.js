import { COORDINATES_MAP, PLAYERS, STEP_LENGTH } from './constants.js';

const diceButtonElement = document.querySelector('#dice-btn');

// ✅ Get player pieces dynamically to ensure they exist
function getPlayerPieces() {
    return {
        P1: document.querySelectorAll('[player-id="P1"].player-piece'),
        P2: document.querySelectorAll('[player-id="P2"].player-piece'),
    };
}

export class UI {
    static listenDiceClick(callback) {
        diceButtonElement.addEventListener('click', callback);
    }

    static listenResetClick(callback) {
        document.querySelector('button#reset-btn').addEventListener('click', callback);
    }

    static listenPieceClick(callback) {
        document.querySelector('.player-pieces').addEventListener('click', callback);
    }

    static setPiecePosition(player, piece, newPosition) {
        const playerPiecesElements = getPlayerPieces(); // ✅ Fetch fresh elements

        if (!playerPiecesElements[player] || !playerPiecesElements[player][piece]) {
            console.warn(`⚠️ Player element for ${player}, piece ${piece} not found`);
            return;
        }

        const [x, y] = COORDINATES_MAP[newPosition];
        const pieceElement = playerPiecesElements[player][piece];
        pieceElement.style.top = y * STEP_LENGTH + '%';
        pieceElement.style.left = x * STEP_LENGTH + '%';
    }

    static setTurn(index) {
        if (index < 0 || index >= PLAYERS.length) {
            console.error('⚠️ Invalid turn index!');
            return;
        }

        const player = PLAYERS[index];
        document.querySelector('.active-player span').innerText = player;

        const activePlayerBase = document.querySelector('.player-base.highlight');
        if (activePlayerBase) {
            activePlayerBase.classList.remove('highlight');
        }

        const newActiveBase = document.querySelector(`[player-id="${player}"].player-base`);
        if (newActiveBase) {
            newActiveBase.classList.add('highlight');
        } else {
            console.warn(`⚠️ Player base for ${player} not found`);
        }
    }

    static enableDice() {
        diceButtonElement.removeAttribute('disabled');
    }

    static disableDice() {
        diceButtonElement.setAttribute('disabled', '');
    }

    static highlightPieces(player, pieces) {
        const playerPiecesElements = getPlayerPieces(); // ✅ Fetch fresh elements

        pieces.forEach(piece => {
            if (playerPiecesElements[player][piece]) {
                playerPiecesElements[player][piece].classList.add('highlight');
            } else {
                console.warn(`⚠️ Cannot highlight piece ${piece} for ${player}, not found`);
            }
        });
    }

    static unhighlightPieces() {
        document.querySelectorAll('.player-piece.highlight').forEach(ele => {
            ele.classList.remove('highlight');
        });
    }

    static setDiceValue(value) {
        document.querySelector('.dice-value').innerText = value;
    }
}
