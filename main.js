import { Ludo } from './ludo/Ludo.js';
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Initialize Firebase Realtime Database
const db = getDatabase();

// WebRTC Setup
let peerConnection = new RTCPeerConnection();
let dataChannel;
let roomId;

document.getElementById('createGame').addEventListener('click', createGame);
document.getElementById('joinGame').addEventListener('click', joinGame);

async function createGame() {
    const roomRef = push(ref(db, 'rooms'));
    roomId = roomRef.key;
    alert("Share this code with friends: " + roomId);

    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    setupWebRTC(true);
}

async function joinGame() {
    roomId = document.getElementById('roomCode').value;
    if (!roomId) {
        alert("Please enter a valid room code.");
        return;
    }

    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    setupWebRTC(false);
}

// WebRTC Setup with Firebase Signaling
async function setupWebRTC(isHost) {
    const roomRef = ref(db, 'rooms/' + roomId);

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        dataChannel.onmessage = (event) => handleGameMessage(event.data);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            set(ref(db, `rooms/${roomId}/ice`), event.candidate);
        }
    };

    onValue(ref(db, `rooms/${roomId}/ice`), async (snapshot) => {
        if (snapshot.exists()) {
            const iceCandidate = new RTCIceCandidate(snapshot.val());
            await peerConnection.addIceCandidate(iceCandidate);
        }
    });

    if (isHost) {
        dataChannel = peerConnection.createDataChannel("game");
        dataChannel.onopen = () => console.log("Data channel open");
        dataChannel.onmessage = (event) => handleGameMessage(event.data);

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        set(ref(db, `rooms/${roomId}/offer`), offer);

        onValue(ref(db, `rooms/${roomId}/answer`), async (snapshot) => {
            if (snapshot.exists()) {
                const answer = snapshot.val();
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });
    } else {
        onValue(ref(db, `rooms/${roomId}/offer`), async (snapshot) => {
            if (snapshot.exists()) {
                const offer = snapshot.val();
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                set(ref(db, `rooms/${roomId}/answer`), answer);
            }
        });
    }
}

// Sync Game State
function sendGameState(state) {
    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(JSON.stringify(state));
    }
}

function handleGameMessage(message) {
    let gameState = JSON.parse(message);
    console.log("Received game state:", gameState);
    // Update game UI based on received state
}

// Hook WebRTC into Ludo Game
const ludo = new Ludo();
const originalRollDice = ludo.rollDice;
ludo.rollDice = function() {
    originalRollDice.call(ludo);
    sendGameState({ dice: ludo.diceValue, turn: ludo.turn });
};
