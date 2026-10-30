import { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from '../Modal.jsx';
import { useIsPending, useFeedbackActions } from '../../context/FeedbackContext.jsx';

function countItems(node) {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countItems(child);
    }
  }
  return count;
}

export function ConfirmDeleteDialog({ item, onConfirm, onClose }) {
  const [errorMessage, setErrorMessage] = useState('');
  const isPending = useIsPending();
  const { clearError } = useFeedbackActions();
  const cancelButtonRef = useRef(null);

  const isFolder = item?.type === 'folder';
  const totalCount = useMemo(() => (isFolder ? countItems(item) : 1), [isFolder, item]);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (isPending) return;

    const result = await onConfirm();
    if (result?.ok) {
      onClose?.();
    } else if (result?.ok === false) {
      const message = result.error?.message || String(result.error || 'Failed to delete');
      setErrorMessage(message);
      clearError();
    }
  };

  return (
    <Modal title="Delete" onClose={onClose}>
      <form onSubmit={handleConfirm} noValidate>
        <p className="text-xs text-ink mb-1.5">
          Delete {item?.name}?
        </p>
        {isFolder && (
          <p className="text-xs text-ink-muted mb-3">
            {totalCount} {totalCount === 1 ? 'item' : 'items'} will be removed in total. This can be undone with Undo.
          </p>
        )}
        {errorMessage && (
          <div role="alert" className="text-xs text-danger mb-3">
            {errorMessage}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            ref={cancelButtonRef}
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
            className="px-3 py-1.5 rounded text-xs font-medium bg-danger text-on-accent hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </form>
    </Modal>
  );
}
