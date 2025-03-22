import { BASE_POSITIONS, HOME_ENTRANCE, HOME_POSITIONS, PLAYERS, SAFE_POSITIONS, START_POSITIONS, STATE, TURNING_POINTS } from './constants.js';
import { UI } from './UI.js';
import { sendGameState } from './network.js'; // WebRTC Communication

export class Ludo {
    constructor() {
        console.log('🎲 Welcome to Ludo Multiplayer!');
        this.currentPositions = this.cloneObject(BASE_POSITIONS);
        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;
        this.listenDiceClick();
        this.listenResetClick();
        this.listenPieceClick();
        this.resetGame();
    }

    cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj)); // ✅ Fix for `structuredClone`
    }

    listenDiceClick() {
        UI.listenDiceClick(this.onDiceClick.bind(this));
    }

    onDiceClick() {
        this.diceValue = 1 + Math.floor(Math.random() * 6);
        this.state = STATE.DICE_ROLLED;

        sendGameState({
            type: "diceRoll",
            diceValue: this.diceValue,
            turn: this.turn
        });

        this.checkForEligiblePieces();
    }

    checkForEligiblePieces() {
        const player = PLAYERS[this.turn];
        const eligiblePieces = this.getEligiblePieces(player);

        if (eligiblePieces.length) {
            UI.highlightPieces(player, eligiblePieces);
        } else {
            this.incrementTurn();
        }
    }

    incrementTurn() {
        this.turn = (this.turn + 1) % PLAYERS.length; // ✅ Fix for multi-player turns
        this.state = STATE.DICE_NOT_ROLLED;

        sendGameState({
            type: "turnChange",
            turn: this.turn
        });
    }

    getEligiblePieces(player) {
        return [0, 1, 2, 3].filter(piece => {
            const currentPosition = this.currentPositions[player][piece];

            if (currentPosition === HOME_POSITIONS[player]) return false;
            if (BASE_POSITIONS[player].includes(currentPosition) && this.diceValue !== 6) return false;
            if (HOME_ENTRANCE[player].includes(currentPosition) && this.diceValue > HOME_POSITIONS[player] - currentPosition) return false;
            
            return true;
        });
    }

    listenResetClick() {
        UI.listenResetClick(this.resetGame.bind(this));
    }

    resetGame() {
        console.log('🔄 Resetting game...');
        this.currentPositions = this.cloneObject(BASE_POSITIONS);
        
        PLAYERS.forEach(player => {
            [0, 1, 2, 3].forEach(piece => {
                this.setPiecePosition(player, piece, this.currentPositions[player][piece]);
            });
        });

        this.turn = 0;
        this.state = STATE.DICE_NOT_ROLLED;

        sendGameState({
            type: "resetGame"
        });
    }

    listenPieceClick() {
        UI.listenPieceClick(this.onPieceClick.bind(this));
    }

    onPieceClick(event) {
        const target = event.target;
        if (!target.classList.contains('player-piece') || !target.classList.contains('highlight')) {
            return;
        }

        const player = target.getAttribute('player-id');
        const piece = target.getAttribute('piece');
        this.handlePieceClick(player, piece);
    }

    handlePieceClick(player, piece) {
        const currentPosition = this.currentPositions[player][piece];

        if (BASE_POSITIONS[player].includes(currentPosition)) {
            this.setPiecePosition(player, piece, START_POSITIONS[player]);
            this.state = STATE.DICE_NOT_ROLLED;

            sendGameState({
                type: "movePiece",
                player: player,
                piece: piece,
                newPosition: START_POSITIONS[player]
            });

            return;
        }

        UI.unhighlightPieces();
        this.movePiece(player, piece, this.diceValue);
    }

    setPiecePosition(player, piece, newPosition) {
        this.currentPositions[player][piece] = newPosition;
        UI.setPiecePosition(player, piece, newPosition);
    }

    movePiece(player, piece, moveBy) {
        const interval = setInterval(() => {
            this.incrementPiecePosition(player, piece);
            moveBy--;

            if (moveBy === 0) {
                clearInterval(interval);

                if (this.hasPlayerWon(player)) {
                    alert(`🎉 Player ${player} has won!`);
                    this.resetGame();
                    return;
                }

                const isKill = this.checkForKill(player, piece);

                if (isKill || this.diceValue === 6) {
                    this.state = STATE.DICE_NOT_ROLLED;
                    return;
                }

                this.incrementTurn();
            }
        }, 200);

        sendGameState({
            type: "movePiece",
            player: player,
            piece: piece,
            newPosition: this.currentPositions[player][piece]
        });
    }

    checkForKill(player, piece) {
        const currentPosition = this.currentPositions[player][piece];
        const opponent = player === 'P1' ? 'P2' : 'P1';

        let kill = false;

        [0, 1, 2, 3].forEach(piece => {
            const opponentPosition = this.currentPositions[opponent][piece];

            if (currentPosition === opponentPosition && !SAFE_POSITIONS.includes(currentPosition)) {
                this.setPiecePosition(opponent, piece, BASE_POSITIONS[opponent][piece]);
                kill = true;
            }
        });

        return kill;
    }

    hasPlayerWon(player) {
        return [0, 1, 2, 3].every(piece => this.currentPositions[player][piece] === HOME_POSITIONS[player]);
    }

    incrementPiecePosition(player, piece) {
        this.setPiecePosition(player, piece, this.getIncrementedPosition(player, piece));
    }

    getIncrementedPosition(player, piece) {
        const currentPosition = this.currentPositions[player][piece];

        if (currentPosition === TURNING_POINTS[player]) {
            return HOME_ENTRANCE[player][0];
        } else if (currentPosition === 51) {
            return 0;
        }
        return currentPosition + 1;
    }
}
