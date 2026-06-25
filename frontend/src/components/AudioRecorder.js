import React, { useState, useRef } from 'react';
import axios from 'axios';

function AudioRecorder({ onTranscriptReceived }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Bereit');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setStatus('⏳ Wird verarbeitet...');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const response = await axios.post(
            'http://localhost:3001/api/audio/transcribe',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );
          setStatus('✅ Transkription erfolgreich');
          onTranscriptReceived(response.data.transcript);
        } catch (error) {
          console.error('Transkriptionsfehler:', error);
          setStatus('❌ Fehler bei der Transkription');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('🔴 Aufnahme läuft...');
    } catch (error) {
      console.error('Mikrofon-Fehler:', error);
      setStatus('❌ Mikrofon nicht verfügbar');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div className="audio-recorder">
      <p className="status">{status}</p>
      {!isRecording ? (
        <button onClick={startRecording} className="btn-record">
          🎤 Aufnahme starten
        </button>
      ) : (
        <button onClick={stopRecording} className="btn-stop">
          ⏹ Aufnahme stoppen
        </button>
      )}
    </div>
  );
}

export default AudioRecorder;