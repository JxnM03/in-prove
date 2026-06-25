import React from 'react';

function ConfirmDialog({ question, onConfirm, onCorrect }) {
  if (!question) return null;

  return (
    <div className="confirm-dialog">
      <p>🤖 <strong>{question}</strong></p>
      <div className="confirm-buttons">
        <button onClick={onConfirm} className="btn-confirm">
          ✅ Bestätigen
        </button>
        <button onClick={onCorrect} className="btn-correct">
          ✏️ Korrigieren
        </button>
      </div>
    </div>
  );
}

export default ConfirmDialog;