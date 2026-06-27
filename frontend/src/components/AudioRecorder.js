import React, { useState, useRef } from 'react';
import axios from 'axios';
import RecordRTC from 'recordrtc';

function AudioRecorder({ onTranscriptReceived, isClarification = false }) {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Ready');
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
            setStatus('Recording');
        } catch (error) {
            console.error('Microphone error:', error);
            setStatus('Microphone unavailable');
        }
    };

    const stopRecording = () => {
        if (!recorderRef.current) return;

        const { recorder, stream } = recorderRef.current;

        recorder.stopRecording(async () => {
            setStatus('Processing...');

            const blob = recorder.getBlob();
            const formData = new FormData();
            formData.append('audio', blob, 'recording.wav');

            try {
                const response = await axios.post(
                    'http://localhost:3001/api/audio/transcribe',
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );

                setStatus('Transcription successful');
                onTranscriptReceived(response.data.transcript);
            } catch (error) {
                console.error('Transcription error:', error);
                setStatus('Transcription failed');
            }

            stream.getTracks().forEach((track) => track.stop());
            recorderRef.current = null;
            setIsRecording(false);
        });
    };

    return (
        <section className="audio-recorder card">
            <div className="audio-copy">
                <p className="eyebrow">
                    {isClarification ? 'Answer follow-up' : 'Voice input'}
                </p>
                <h2>
                    {isClarification
                        ? 'State the missing quantity'
                        : 'What did you eat?'}
                </h2>
                <p className="muted">
                    {isClarification
                        ? 'For example: "The rice was 150 grams."'
                        : 'Record your meal. Food items and quantities are detected automatically.'}
                </p>
            </div>

            <div className="audio-actions">
                <div className={isRecording ? 'status recording' : 'status'}>
                    <span></span>
                    {status}
                </div>

                {!isRecording ? (
                    <button onClick={startRecording} className="btn-record">
                        🎤 {isClarification ? 'Record answer' : 'Start recording'}
                    </button>
                ) : (
                    <button onClick={stopRecording} className="btn-stop">
                        ⏹ Stop recording
                    </button>
                )}
            </div>
        </section>
    );
}

export default AudioRecorder;
