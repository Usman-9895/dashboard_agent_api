import React from 'react'

export default function ConfirmModal({ open, title = 'Confirmer', message, confirmText = 'Confirmer', cancelText = 'Annuler', onConfirm, onClose }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p style={{ margin: '8px 0 16px' }}>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>{cancelText}</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
