import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({port: 8080})



let senderSocket: WebSocket | null = null;
let receiverSocket: WebSocket | null = null;

wss.on('connection', function connection(ws) {

    ws.on('message', function message(data: any) {
        const message = JSON.parse(data)
        console.log(message)

        if(message.type === "identify-as-sender") {
            senderSocket = ws
        }
        else if (message.type === "identify-as-receicver") {
            receiverSocket = ws
        }
        else if(message.type === "create-offer") {
            receiverSocket?.send(JSON.stringify({type: "offer", offer: message.offer}))
        }
        else if(message.type === "create-offer") {
            senderSocket?.send(JSON.stringify({type: "offer", offer: message.offer}))
        }
        //identify as sender
        //identify as receiver
        //create offer
        //create answer
        //add ice candidate
    })
})