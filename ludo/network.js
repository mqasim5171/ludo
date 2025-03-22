// WebRTC Communication for Multiplayer Ludo
export let dataChannel = null;
export let peerConnection = new RTCPeerConnection();

// Set up WebRTC Data Channel
export function setupDataChannel(channel) {
    dataChannel = channel;
    dataChannel.onmessage = (event) => handleGameMessage(event.data);
    console.log("✅ Data channel set up!");
}

// Function to Send Game State to Other Players
export function sendGameState(state) {
    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify(state));
        console.log("📤 Sent game state:", state);
    }
}

// Handle Incoming Game State from Other Players
export function handleGameMessage(message) {
    let gameState = JSON.parse(message);
    console.log("📥 Received game state:", gameState);

    if (gameState.type === "diceRoll") {
        ludo.diceValue = gameState.diceValue;
        ludo.turn = gameState.turn;
        ludo.checkForEligiblePieces();
    } 
    
    else if (gameState.type === "movePiece") {
        ludo.setPiecePosition(gameState.player, gameState.piece, gameState.newPosition);
    }
}
