import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import RecordRTC from 'recordrtc';

function AudioRecorder({ onTranscriptReceived, isClarification = false }) {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [isTyping, setIsTyping] = useState(false);
    const [typedText, setTypedText] = useState('');
    const [isSubmittingText, setIsSubmittingText] = useState(false);

    const recorderRef = useRef(null);
    const textAreaRef = useRef(null);

    useEffect(() => {
        if (isTyping && textAreaRef.current) {
            textAreaRef.current.focus();
        }
    }, [isTyping]);

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

            setIsTyping(false);
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
                await Promise.resolve(onTranscriptReceived(response.data.transcript));
            } catch (error) {
                console.error('Transcription error:', error);
                setStatus('Transcription failed');
            }

            stream.getTracks().forEach((track) => track.stop());
            recorderRef.current = null;
            setIsRecording(false);
        });
    };

    const handleTypedSubmit = async (event) => {
        event.preventDefault();

        const cleanText = typedText.trim();

        if (!cleanText || isSubmittingText) {
            return;
        }

        setIsSubmittingText(true);
        setStatus(isClarification ? 'Sending answer...' : 'Sending text...');

        try {
            await Promise.resolve(onTranscriptReceived(cleanText));

            setTypedText('');
            setIsTyping(false);
            setStatus('Text submitted');
        } catch (error) {
            console.error('Typed input error:', error);
            setStatus('Text input failed');
        } finally {
            setIsSubmittingText(false);
        }
    };

    const handleTypedKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleTypedSubmit(event);
        }
    };

    const typedPlaceholder = isClarification
        ? 'e.g. The rice was 150 grams.'
        : 'e.g. I had chicken with rice and broccoli.';

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

                {!isRecording && (
                    <button
                        type="button"
                        className={isTyping ? 'btn-type-toggle active' : 'btn-type-toggle'}
                        onClick={() => setIsTyping((current) => !current)}
                        aria-expanded={isTyping}
                    >
                        {isTyping ? 'Hide text input' : 'Type it instead'}
                    </button>
                )}
            </div>

            {isTyping && !isRecording && (
                <form className="typed-input-panel" onSubmit={handleTypedSubmit}>
                    <label className="typed-input-label" htmlFor="typed-meal-input">
                        {isClarification ? 'Type your answer' : 'Type your meal'}
                    </label>

                    <div className="typed-input-row">
                        <textarea
                            id="typed-meal-input"
                            ref={textAreaRef}
                            value={typedText}
                            onChange={(event) => setTypedText(event.target.value)}
                            onKeyDown={handleTypedKeyDown}
                            placeholder={typedPlaceholder}
                            rows={2}
                            disabled={isSubmittingText}
                        />

                        <button
                            type="submit"
                            className="btn-typed-submit"
                            disabled={!typedText.trim() || isSubmittingText}
                        >
                            {isSubmittingText ? 'Sending...' : 'Submit'}
                        </button>
                    </div>

                    <p className="typed-input-hint">
                        Press Enter to submit. Shift + Enter for a new line.
                    </p>
                </form>
            )}
        </section>
    );
}

export default AudioRecorder;
