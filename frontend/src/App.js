import React, { useState } from 'react';
import './App.css';
import AudioRecorder from './components/AudioRecorder';
import FoodList from './components/FoodList';
import ConfirmDialog from './components/ConfirmDialog';
import MealTypeConflict from './components/MealTypeConflict';
import axios from 'axios';

function App() {
  const [transcript, setTranscript] = useState('');
  const [foodItems, setFoodItems] = useState([]);
  const [followupQuestion, setFollowupQuestion] = useState(null);
  const [allClear, setAllClear] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mealType, setMealType] = useState('Mittagessen');
  const [detectedMealType, setDetectedMealType] = useState(null);
  const [mealTypeResolved, setMealTypeResolved] = useState(true);

  const handleTranscriptReceived = async (text) => {
    setTranscript(text);
    setSaved(false);
    setDetectedMealType(null);
    setMealTypeResolved(true);

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

      // NEU: Mahlzeit-Typ Konflikt prüfen
      const detected = response.data.detected_meal_type;
      if (detected && detected !== mealType) {
        setDetectedMealType(detected);
        setMealTypeResolved(false);  // Konflikt → erst auflösen
      }

    } catch (error) {
      console.error('Extraktionsfehler:', error);
    }
  };

  // NEU: User wählt Mahlzeit-Typ
  const handleMealTypeChoice = (chosen) => {
    setMealType(chosen);
    setDetectedMealType(null);
    setMealTypeResolved(true);
  };

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

  const handleCorrect = () => {
    setFollowupQuestion(null);
    setFoodItems([]);
    setTranscript('');
    setSaved(false);
    setDetectedMealType(null);
    setMealTypeResolved(true);
  };

  return (
    <div className="App">
      <header>
        <h1>in:prove 🏋️</h1>
        <p>Dein Ernährungsassistent für Sportler</p>
      </header>

      <main>
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

        <AudioRecorder
          onTranscriptReceived={
            allClear ? handleClarification : handleTranscriptReceived
          }
        />

        {transcript && (
          <div className="transcript">
            <p>🗣️ <em>"{transcript}"</em></p>
          </div>
        )}

        <FoodList items={foodItems} />

        {/* NEU: Mahlzeit-Konflikt Dialog */}
        <MealTypeConflict
          selected={mealType}
          detected={detectedMealType}
          onChoose={handleMealTypeChoice}
        />

        {/* Bestätigung nur anzeigen wenn kein Konflikt offen */}
        {mealTypeResolved && (
          <ConfirmDialog
            question={followupQuestion}
            onConfirm={handleConfirm}
            onCorrect={handleCorrect}
          />
        )}

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