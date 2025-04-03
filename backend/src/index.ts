import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

let senderSocket: WebSocket | null = null;
let receiverSocket: WebSocket | null = null;

function safeSend(socket: WebSocket | null, message: any) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return true;
    }
    return false;
}

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data: any) {
        try {
            const message = JSON.parse(data.toString());
            if (message.type === "sender") {
                senderSocket = ws;
                if (receiverSocket) {
                    safeSend(senderSocket, { type: "receiver" });
                }
            } else if (message.type === "receiver") {
                receiverSocket = ws;
                if (senderSocket) {
                    safeSend(senderSocket, { type: "receiver" });
                }
            } else if (message.type === "createOffer") {
                safeSend(receiverSocket, { type: "createOffer", sdp: message.sdp });
            } else if (message.type === "createAnswer") {
                safeSend(senderSocket, { type: "createAnswer", sdp: message.sdp });
            } else if (message.type === "iceCandidate") {
                if (ws === senderSocket) {
                    safeSend(receiverSocket, { type: "iceCandidate", candidate: message.candidate });
                } else if (ws === receiverSocket) {
                    safeSend(senderSocket, { type: "iceCandidate", candidate: message.candidate });
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', function() {
        if (ws === senderSocket) {
            senderSocket = null;
            safeSend(receiverSocket, { type: "peerDisconnected" });
        } else if (ws === receiverSocket) {
            receiverSocket = null;
            safeSend(senderSocket, { type: "peerDisconnected" });
        }
    });

    ws.on('error', function(error) {
        console.error('WebSocket error:', error);
    });
});