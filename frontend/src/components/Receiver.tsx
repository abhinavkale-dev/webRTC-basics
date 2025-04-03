import { useEffect, useRef } from "react";

export function Receiver() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "receiver" }));
    };
    socket.onclose = () =>  console.log("Receiver WebSocket connection closed.");;

    const pc = new RTCPeerConnection();

    const remoteStream = new MediaStream();
    if (videoRef.current) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(err => {
        console.log("Initial play failed, will retry when tracks arrive:", err);
      });
    }

    pc.ontrack = (event) => {
      remoteStream.addTrack(event.track);
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
            console.error("Error playing video:", err);
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
      }
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "createOffer") {
        try {
          await pc.setRemoteDescription(message.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: "createAnswer", sdp: pc.localDescription }));
        } catch (error) {}
      } else if (message.type === "iceCandidate") {
        try {
          await pc.addIceCandidate(message.candidate);
        } catch (error) {
            console.error("Error adding ICE candidate:", error);
        }
      }
    };

    return () => {
      socket.close();
      pc.close();
    };
  }, []);

  return (
    <div>
      <h1>Receiver</h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", maxWidth: "600px", backgroundColor: "black" }}
      />
    </div>
  );
}