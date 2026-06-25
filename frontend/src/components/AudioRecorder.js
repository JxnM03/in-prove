import React, { useState, useRef } from 'react';
import axios from 'axios';
import RecordRTC from 'recordrtc';

function AudioRecorder({ onTranscriptReceived }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Bereit');
  const recorderRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000
      });

      recorderRef.current = { recorder, stream };
      recorder.startRecording();
      setIsRecording(true);
      setStatus('🔴 Aufnahme läuft...');
    } catch (error) {
      console.error('Mikrofon-Fehler:', error);
      setStatus('❌ Mikrofon nicht verfügbar');
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    const { recorder, stream } = recorderRef.current;

    recorder.stopRecording(async () => {
      setStatus('⏳ Wird verarbeitet...');
      const blob = recorder.getBlob();

      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');

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

      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    });
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