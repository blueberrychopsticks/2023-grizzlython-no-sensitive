import React, { useEffect } from "react";
import useWebSocket from "react-use-websocket";

export const useRecognitionService = () => {
  const [error, setError] = React.useState(null);
  const socket = useWebSocket("wss://lolserver.ngrok.io/analyze-audio", {
    reconnectAttempts: 10,
    reconnectInterval: 300,
    onError: (event) => {
      console.log(event);
    },
    shouldReconnect: (closeEvent) => true,
    retryOnError: true,
  });
  const [subtitle, setSubtitle] = React.useState("");
  const [deeplink, setDeeplink] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [range, setRange] = React.useState({ start: 0, end: 0 });
  const lastJsonMessage = socket.lastJsonMessage;
  const lastMessage = socket.lastMessage;
  useEffect(() => {
    if (!lastMessage?.data) {
      return;
    }

    const data = lastMessage.data;
    const decoded = atob(data);
    const parsed = JSON.parse(decoded);

    const regex = /\d+\.\d+/g;
    const matches = parsed.matchOffset.match(regex) || [];
    const [startSec, endSec] = matches.map(Math.floor);

    // Create a range object from the rounded values
    const range = { start: startSec, end: endSec };
    setSubtitle(parsed.subtitle);
    setDeeplink(parsed.deeplink);
    setRange(range);
  }, [lastJsonMessage, lastMessage]);
  const activateMicrophone = () => {
    const constraints = { audio: true };
    const context = new AudioContext();

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        setListening(true);
        console.log("hi");
        const source = context.createMediaStreamSource(stream);
        const scriptNode = context.createScriptProcessor(2048, 1, 1);

        // There is a warning about onaudioprocess below but it's hilarious because there's no way
        // I'm going to change this code because it works
        scriptNode.onaudioprocess = function (event) {
          // I am not going to concern myself about this deprecated symbol `inputBuffer` at the moment
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          socket.sendMessage(inputData);
        };

        // Connect the audio nodes
        source.connect(scriptNode);
        scriptNode.connect(context.destination);
      })
      .catch((error) => {
        console.error(error);
        // setListening(false);
      });
  };

  return {
    subtitle,
    deeplink,
    range,
    activateMicrophone,
    listening,
  };
};
