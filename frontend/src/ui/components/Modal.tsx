import React from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <div className={`modal ${active ? 'is-active' : ''}`}>
      <div
        className="modal-background"
        onClick={bgDismiss ? () => onClose() : null}
      />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{title}</p>
          {showCancel ? (
            <button
              className="delete"
              aria-label="close"
              onClick={() => onClose()}
            />
          ) : null}
        </header>
        <section className="modal-card-body">{children}</section>
        <footer className="modal-card-foot">
          <button
            className={`button ${confirmClass ?? ''}`}
            disabled={!confirmEnabled}
            onClick={() => onConfirm()}
          >
            {confirmName ?? t('actions.ok')}
          </button>
          {showCancel ? (
            <button
              className={`button ${cancelClass ?? ''}`}
              onClick={() => onClose()}
            >
              {cancelName ?? t('actions.cancel')}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

export default React.memo(Modal);
