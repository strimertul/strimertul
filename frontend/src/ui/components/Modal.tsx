import React from 'react';

export interface ModalProps {
  title: string;
  active: boolean;
  onClose?: () => void;
  onConfirm: () => void;
  confirmName?: string;
  confirmClass?: string;
  confirmEnabled?: boolean;
  cancelName?: string;
  cancelClass?: string;
  showCancel?: boolean;
  bgDismiss?: boolean;
}

function Modal({
  active,
  title,
  onClose,
  onConfirm,
  confirmName,
  confirmClass,
  confirmEnabled,
  cancelName,
  cancelClass,
  showCancel,
  bgDismiss,
  children,
}: React.PropsWithChildren<ModalProps>): React.ReactElement {
  return (
    <div className={`modal ${active ? 'is-active' : ''}`}>
      <div
        className="modal-background"
        onClick={bgDismiss ? () => onClose() : null}
      ></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{title}</p>
          {showCancel ? (
            <button
              className="delete"
              aria-label="close"
              onClick={() => onClose()}
            ></button>
          ) : null}
        </header>
        <section className="modal-card-body">{children}</section>
        <footer className="modal-card-foot">
          <button
            className={`button ${confirmClass ?? ''}`}
            disabled={!confirmEnabled}
            onClick={() => onConfirm()}
          >
            {confirmName ?? 'OK'}
          </button>
          {showCancel ? (
            <button
              className={`button ${cancelClass ?? ''}`}
              onClick={() => onClose()}
            >
              {cancelName ?? 'Cancel'}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

export default React.memo(Modal);
