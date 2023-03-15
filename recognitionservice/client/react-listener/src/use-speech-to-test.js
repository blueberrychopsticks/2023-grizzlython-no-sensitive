// import { useState, useEffect } from "react";
//
// const SpeechRecognition = window.SpeechRecognition;
//
// function useVoiceToText() {
//   const [transcript, setTranscript] = useState("");
//
//   useEffect(() => {
//     const recognition = new window.SpeechRecognition();
//
//     recognition.lang = "en-US";
//     recognition.interimResults = false;
//     recognition.maxAlternatives = 1;
//
//     recognition.onresult = (event) => {
//       const { transcript } = event.results[0][0];
//       setTranscript(transcript);
//     };
//
//     recognition.onerror = (event) => {
//       console.error(event.error);
//     };
//
//     return () => {
//       recognition.stop();
//     };
//   }, []);
//
//   const startListening = () => {
//     const recognition = new window.SpeechRecognition();
//     recognition.start();
//   };
//
//   return { transcript, startListening };
// }
//
// export default useVoiceToText;
