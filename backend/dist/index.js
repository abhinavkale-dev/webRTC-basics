"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let senderSocket = null;
let receiverSocket = null;
console.log('WebRTC Signaling Server started on port 8080');
// Utility function to safely send a WebSocket message
function safeSend(socket, message) {
    if (socket && socket.readyState === ws_1.WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return true;
    }
    return false;
}
wss.on('connection', function connection(ws) {
    console.log('New WebSocket connection established');
    ws.on('message', function message(data) {
        try {
            const message = JSON.parse(data.toString());
            console.log('Received message:', message);
            // Handle client identification
            if (message.type === "sender") {
                console.log('Sender identified');
                senderSocket = ws;
                // If receiver is already connected, notify sender
                if (receiverSocket) {
                    console.log('Notifying sender that receiver is available');
                    safeSend(senderSocket, { type: "receiver" });
                }
            }
            else if (message.type === "receiver") {
                console.log('Receiver identified');
                receiverSocket = ws;
                // Notify sender about receiver connection
                if (senderSocket) {
                    console.log('Notifying sender about receiver connection');
                    safeSend(senderSocket, { type: "receiver" });
                }
            }
            // Handle offer creation from sender
            else if (message.type === "createOffer") {
                console.log('Forwarding offer to receiver');
                if (safeSend(receiverSocket, {
                    type: "createOffer",
                    sdp: message.sdp
                })) {
                    console.log('Successfully forwarded offer to receiver');
                }
                else {
                    console.log('No receiver connected to forward offer');
                }
            }
            // Handle answer from receiver
            else if (message.type === "createAnswer") {
                console.log('Forwarding answer to sender');
                if (safeSend(senderSocket, {
                    type: "createAnswer",
                    sdp: message.sdp
                })) {
                    console.log('Successfully forwarded answer to sender');
                }
                else {
                    console.log('No sender connected to forward answer');
                }
            }
            // Handle ICE candidates
            else if (message.type === "iceCandidate") {
                // Forward ice candidates to the other peer
                if (ws === senderSocket) {
                    console.log('Forwarding ICE candidate from sender to receiver');
                    if (safeSend(receiverSocket, {
                        type: "iceCandidate",
                        candidate: message.candidate
                    })) {
                        console.log('Successfully forwarded ICE candidate to receiver');
                    }
                    else {
                        console.log('Failed to forward ICE candidate to receiver');
                    }
                }
                else if (ws === receiverSocket) {
                    console.log('Forwarding ICE candidate from receiver to sender');
                    if (safeSend(senderSocket, {
                        type: "iceCandidate",
                        candidate: message.candidate
                    })) {
                        console.log('Successfully forwarded ICE candidate to sender');
                    }
                    else {
                        console.log('Failed to forward ICE candidate to sender');
                    }
                }
            }
            else {
                console.log('Unknown message type:', message.type);
            }
        }
        catch (error) {
            console.error('Error processing message:', error);
        }
    });
    ws.on('close', function () {
        console.log('WebSocket connection closed');
        if (ws === senderSocket) {
            console.log('Sender disconnected');
            senderSocket = null;
            // Notify receiver that sender disconnected
            safeSend(receiverSocket, { type: "peerDisconnected" });
        }
        else if (ws === receiverSocket) {
            console.log('Receiver disconnected');
            receiverSocket = null;
            // Notify sender that receiver disconnected
            safeSend(senderSocket, { type: "peerDisconnected" });
        }
    });
    ws.on('error', function (error) {
        console.error('WebSocket error:', error);
    });
});
