import React, { useState } from 'react';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import FoodList from './components/FoodList';
import ConfirmDialog from './components/ConfirmDialog';
import axios from 'axios';

function App() {
  const [transcript, setTranscript] = useState('');
  const [foodItems, setFoodItems] = useState([]);
  const [followupQuestion, setFollowupQuestion] = useState(null);
  const [allClear, setAllClear] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mealType, setMealType] = useState('Mittagessen');

  // Schritt 1: Transkript vom AudioRecorder empfangen → GPT Extraktion
  const handleTranscriptReceived = async (text) => {
    setTranscript(text);
    setSaved(false);

    try {
      const response = await axios.post(
        'http://localhost:3001/api/food/extract',
        { transcript: text }
      );
      setFoodItems(response.data.items);
      setAllClear(response.data.all_quantities_clear);
      setFollowupQuestion(
        response.data.all_quantities_clear
          ? 'Sind diese Angaben korrekt?'
          : response.data.followup_question
      );
    } catch (error) {
      console.error('Extraktionsfehler:', error);
    }
  };

  // Schritt 2: Rückfrage beantwortet → GPT Clarification
  const handleClarification = async (text) => {
    setTranscript(text);

    try {
      const response = await axios.post(
        'http://localhost:3001/api/food/clarify',
        { transcript: text, previousItems: foodItems }
      );
      setFoodItems(response.data.items);
      setAllClear(response.data.all_quantities_clear);
      setFollowupQuestion(
        response.data.all_quantities_clear
          ? 'Sind diese Angaben korrekt?'
          : response.data.followup_question
      );
    } catch (error) {
      console.error('Clarification Fehler:', error);
    }
  };

  // Schritt 3: Bestätigen → In Datenbank speichern
  const handleConfirm = async () => {
    try {
      await axios.post('http://localhost:3001/api/log/save', {
        meal_type: mealType,
        items: foodItems,
        raw_transcript: transcript
      });
      setSaved(true);
      setFollowupQuestion(null);
    } catch (error) {
      console.error('Speicherfehler:', error);
    }
  };

  // Schritt 4: Korrigieren → Neue Aufnahme starten
  const handleCorrect = () => {
    setFollowupQuestion(null);
    setFoodItems([]);
    setTranscript('');
    setSaved(false);
  };

  return (
    <div className="App">
      <header>
        <h1>in:prove 🏋️</h1>
        <p>Dein Ernährungsassistent für Sportler</p>
      </header>

      <main>
        {/* Mahlzeit-Typ auswählen */}
        <div className="meal-selector">
          <label>Mahlzeit: </label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            <option>Frühstück</option>
            <option>Mittagessen</option>
            <option>Abendessen</option>
            <option>Snack</option>
          </select>
        </div>

        {/* Aufnahme */}
        <AudioRecorder
          onTranscriptReceived={
            allClear ? handleClarification : handleTranscriptReceived
          }
        />

        {/* Transkript anzeigen */}
        {transcript && (
          <div className="transcript">
            <p>🗣️ <em>"{transcript}"</em></p>
          </div>
        )}

        {/* Erkannte Lebensmittel */}
        <FoodList items={foodItems} />

        {/* Bestätigung oder Rückfrage */}
        <ConfirmDialog
          question={followupQuestion}
          onConfirm={handleConfirm}
          onCorrect={handleCorrect}
        />

        {/* Erfolgsmeldung */}
        {saved && (
          <div className="success">
            ✅ Mahlzeit wurde gespeichert!
          </div>
        )}
      </main>
    </div>
  );
}

export default App;