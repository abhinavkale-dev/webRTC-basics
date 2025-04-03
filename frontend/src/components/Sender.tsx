import { useEffect, useState, useRef } from "react";

export const Sender = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [pc, setPC] = useState<RTCPeerConnection | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "sender" }));
    };
    ws.onclose = () => {};
    setSocket(ws);
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const initiateConn = async () => {
    if (!socket) {
      alert("Socket not found");
      return;
    }
    const newPC = new RTCPeerConnection();
    setPC(newPC);

    newPC.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "iceCandidate",
            candidate: event.candidate,
          })
        );
      }
    };

    newPC.onnegotiationneeded = async () => {
      try {
        const offer = await newPC.createOffer();
        await newPC.setLocalDescription(offer);
        socket.send(
          JSON.stringify({
            type: "createOffer",
            sdp: newPC.localDescription,
          })
        );
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "createAnswer" && newPC) {
        await newPC.setRemoteDescription(message.sdp);
      } else if (message.type === "iceCandidate" && newPC) {
        await newPC.addIceCandidate(message.candidate);
      } else if (message.type === "receiver") {
        if (newPC.signalingState === "stable") {
          try {
            const offer = await newPC.createOffer();
            await newPC.setLocalDescription(offer);
            socket.send(JSON.stringify({ type: "createOffer", sdp: newPC.localDescription }));
          } catch (error) {
            console.error("Error renegotiating:", error);
          }
        }
      }
    };

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setVideoStream(stream);
      stream.getTracks().forEach((track) => {
        newPC.addTrack(track, stream);
      });
    } catch (error) {
        console.error("Error accessing display media:", error);
    }
  };

  return (
    <div>
      <h1>Sender</h1>
      <button onClick={initiateConn}>Send Data</button>
      {videoStream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: "100%", maxWidth: "600px" }}
        />
      )}
    </div>
  );
};