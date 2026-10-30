import { useState, useMemo, useRef, useEffect } from 'react';
import { VscFolder } from 'react-icons/vsc';
import { Modal } from '../Modal.jsx';
import { useFileExplorerTree } from '../../hooks/useFileExplorer.js';
import { useIsPending, useFeedbackActions } from '../../context/FeedbackContext.jsx';

function flattenFolders(node, depth = 0, list = []) {
  if (!node || node.type !== 'folder') return list;
  list.push({ id: node.id, name: node.name, depth, parentId: node.parentId });
  if (node.children) {
    for (const child of node.children) {
      if (child.type === 'folder') {
        flattenFolders(child, depth + 1, list);
      }
    }
  }
  return list;
}

function getDisabledFolderIds(item) {
  const disabledIds = new Set();
  if (!item) return disabledIds;

  function markDescendants(node) {
    if (!node) return;
    disabledIds.add(node.id);
    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'folder') {
          markDescendants(child);
        }
      }
    }
  }

  if (item.type === 'folder') {
    markDescendants(item);
  }
  return disabledIds;
}

export function MoveDialog({ item, onSubmit, onClose }) {
  const tree = useFileExplorerTree();
  const isPending = useIsPending();
  const { clearError } = useFeedbackActions();

  const folders = useMemo(() => flattenFolders(tree), [tree]);
  const disabledIds = useMemo(() => getDisabledFolderIds(item), [item]);
  const enabledFolders = useMemo(
    () => folders.filter((f) => !disabledIds.has(f.id)),
    [folders, disabledIds]
  );

  const [selectedFolderId, setSelectedFolderId] = useState(
    () => item?.parentId || null
  );
  const [highlightedId, setHighlightedId] = useState(
    () => item?.parentId || enabledFolders[0]?.id || null
  );
  const [errorMessage, setErrorMessage] = useState('');

  const listboxRef = useRef(null);

  const isMoveDisabled =
    !selectedFolderId || selectedFolderId === item?.parentId || isPending;

  const handleSelect = (folderId) => {
    if (disabledIds.has(folderId)) return;
    setSelectedFolderId(folderId);
    setHighlightedId(folderId);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = enabledFolders.findIndex((f) => f.id === highlightedId);
      const nextIndex =
        currentIndex < enabledFolders.length - 1 ? currentIndex + 1 : 0;
      if (enabledFolders[nextIndex]) {
        setHighlightedId(enabledFolders[nextIndex].id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = enabledFolders.findIndex((f) => f.id === highlightedId);
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : enabledFolders.length - 1;
      if (enabledFolders[prevIndex]) {
        setHighlightedId(enabledFolders[prevIndex].id);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlightedId && !disabledIds.has(highlightedId)) {
        handleSelect(highlightedId);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isMoveDisabled) return;

    const result = await onSubmit(selectedFolderId);
    if (result?.ok) {
      onClose?.();
    } else if (result?.ok === false) {
      const message = result.error?.message || String(result.error || 'Failed to move');
      setErrorMessage(message);
      clearError();
    }
  };

  return (
    <Modal title="Move" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <p className="text-xs text-ink-muted mb-2">
          Select target folder for <span className="text-ink font-medium">{item?.name}</span>:
        </p>
        <div
          ref={listboxRef}
          role="listbox"
          aria-label="Target folder"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="max-h-56 overflow-y-auto border border-line rounded p-1 flex flex-col gap-0.5 bg-canvas focus:outline-none"
        >
          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const isHighlighted = highlightedId === folder.id;
            const isDisabled = disabledIds.has(folder.id);
            const isCurrent = folder.id === item?.parentId;

            let rowClasses =
              'flex items-center w-full text-left py-1 pr-2 rounded text-xs transition-colors ';
            if (isDisabled) {
              rowClasses += 'opacity-40 cursor-not-allowed text-ink-muted';
            } else if (isSelected) {
              rowClasses += 'bg-accent-soft text-ink font-medium';
            } else if (isHighlighted) {
              rowClasses += 'bg-surface-hover text-ink';
            } else {
              rowClasses += 'text-ink hover:bg-surface-hover';
            }

            return (
              <button
                key={folder.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={isDisabled}
                onClick={() => handleSelect(folder.id)}
                style={{ paddingLeft: `${folder.depth * 14 + 6}px` }}
                className={rowClasses}
              >
                <VscFolder className="w-4 h-4 text-accent shrink-0 mr-1.5" />
                <span className="truncate">{folder.name}</span>
                {isCurrent && (
                  <span className="text-ink-muted text-[11px] ml-1.5 shrink-0">
                    (current)
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {errorMessage && (
          <div role="alert" className="text-xs text-danger mt-1.5">
            {errorMessage}
          </div>
        )}

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
            disabled={isMoveDisabled}
            className="px-3 py-1.5 rounded text-xs font-medium bg-accent text-on-accent hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move
          </button>
        </div>
      </form>
    </Modal>
  );
}
