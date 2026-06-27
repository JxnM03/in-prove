import React from 'react';

function ConfirmDialog({ question, onConfirm, onCorrect, showButtons = true }) {
    if (!question) return null;

    return (
        <section className={showButtons ? 'confirm-dialog card ready' : 'confirm-dialog card pending'}>
            <div>
                <p className="eyebrow">{showButtons ? 'Ready to save' : 'Still open'}</p>
                <h2>{question}</h2>
            </div>

            {showButtons ? (
                <div className="confirm-buttons">
                    <button onClick={onConfirm} className="btn-confirm">
                        ✅ Confirm
                    </button>
                    <button onClick={onCorrect} className="btn-correct">
                        ✏️ Start over
                    </button>
                </div>
            ) : (
                <div className="clarification-note">
                    <p>
                        Use the recording button above and say only the missing detail.
                    </p>
                </div>
            )}
        </section>
    );
}

export default ConfirmDialog;
