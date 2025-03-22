import { Ludo } from './ludo/Ludo.js';

// ✅ Import Firebase properly
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCM7nVs98RN8UdnVd9PgeRkQNu54c-Z7Es",
    authDomain: "ludo-e645e.firebaseapp.com",
    databaseURL: "https://ludo-e645e-default-rtdb.firebaseio.com",
    projectId: "ludo-e645e",
    storageBucket: "ludo-e645e.appspot.com",
    messagingSenderId: "448963096452",
    appId: "1:448963096452:web:5d8002d3b3baddadca77d1"
};

// ✅ Ensure Firebase is initialized only once
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0]; // If Firebase was already initialized, reuse the instance
}

// ✅ Initialize Firebase Database AFTER Firebase is initialized
const db = getDatabase(app);

// ✅ WebRTC Setup
let peerConnection = new RTCPeerConnection();
let dataChannel;
let roomId;

// ✅ Handle UI Events
document.getElementById('createGame').addEventListener('click', createGame);
document.getElementById('joinGame').addEventListener('click', joinGame);

// ✅ Create Game
async function createGame() {
    const roomRef = push(ref(db, 'rooms'));
    roomId = roomRef.key;
    alert("Share this code with friends: " + roomId);

    document.getElementById('start-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';

    setupWebRTC(true);
}

// ✅ Join Game
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

// ✅ WebRTC Setup with Firebase Signaling
async function setupWebRTC(isHost) {
    const roomRef = ref(db, 'rooms/' + roomId);

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        dataChannel.onmessage = (event) => handleGameMessage(event.data);
        console.log("✅ Data channel open!");
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            push(ref(db, `rooms/${roomId}/ice`), event.candidate);
        }
    };

    onValue(ref(db, `rooms/${roomId}/ice`), async (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const iceCandidate = new RTCIceCandidate(childSnapshot.val());
                peerConnection.addIceCandidate(iceCandidate);
            });
        }
    });

    if (isHost) {
        dataChannel = peerConnection.createDataChannel("game");
        dataChannel.onopen = () => console.log("✅ Data channel open!");
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

// ✅ Hook WebRTC into Ludo Game
const ludo = new Ludo();
const originalRollDice = ludo.rollDice;
ludo.rollDice = function() {
    originalRollDice.call(ludo);
    sendGameState({ dice: ludo.diceValue, turn: ludo.turn });
};
