import { useState, useRef, useEffect } from 'react';
import { Modal } from '../Modal.jsx';
import { useIsPending, useFeedbackActions } from '../../context/FeedbackContext.jsx';

export function NameDialog({
  title,
  submitLabel,
  initialValue = '',
  onSubmit,
  onClose,
}) {
  const [name, setName] = useState(initialValue);
  const [errorMessage, setErrorMessage] = useState('');
  const isPending = useIsPending();
  const { clearError } = useFeedbackActions();
  const inputRef = useRef(null);
  const hasSelectedRef = useRef(false);

  const handleFocus = (e) => {
    if (initialValue && !hasSelectedRef.current) {
      hasSelectedRef.current = true;
      e.target.select();
    }
  };

  useEffect(() => {
    if (initialValue && inputRef.current) {
      queueMicrotask(() => {
        if (document.activeElement === inputRef.current && !hasSelectedRef.current) {
          hasSelectedRef.current = true;
          inputRef.current.select();
        }
      });
    }
  }, [initialValue]);

  const handleChange = (e) => {
    setName(e.target.value);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isPending) return;

    const trimmed = name.trim();
    const result = await onSubmit(trimmed);
    if (result?.ok) {
      onClose?.();
    } else if (result?.ok === false) {
      const message = result.error?.message || String(result.error || 'Operation failed');
      setErrorMessage(message);
      clearError();
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={handleChange}
            onFocus={handleFocus}
            disabled={isPending}
            className="w-full px-2.5 py-1.5 rounded text-xs bg-canvas text-ink border border-line focus:outline-none focus:border-accent disabled:opacity-50"
          />
          {errorMessage && (
            <div role="alert" className="text-xs text-danger mt-0.5">
              {errorMessage}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3 py-1.5 rounded text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-hover border border-line transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-3 py-1.5 rounded text-xs font-medium bg-accent text-on-accent hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
