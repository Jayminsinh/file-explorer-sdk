import { useRef } from 'react';
import { useExplorer } from '../context/ExplorerContext.jsx';
import { useFeedbackActions } from '../context/FeedbackContext.jsx';
import { useUiActions, useSelectedId } from '../context/UiStateContext.jsx';

export function useExplorerActions() {
  const explorer = useExplorer();
  const { select, clearSelection } = useUiActions();
  const { reportError, clearError, startPending, endPending } = useFeedbackActions();
  const selectedId = useSelectedId();

  const depsRef = useRef({
    explorer,
    select,
    clearSelection,
    reportError,
    clearError,
    startPending,
    endPending,
    selectedId,
  });

  depsRef.current = {
    explorer,
    select,
    clearSelection,
    reportError,
    clearError,
    startPending,
    endPending,
    selectedId,
  };

  const actionsRef = useRef(null);

  if (!actionsRef.current) {
    const run = async (fn) => {
      const { explorer: exp, reportError: report, clearError: clear, startPending: start, endPending: end } = depsRef.current;
      clear();
      start();
      try {
        const value = await fn(exp);
        return { ok: true, value };
      } catch (err) {
        report(err);
        return { ok: false, error: err };
      } finally {
        end();
      }
    };

    actionsRef.current = Object.freeze({
      createFile: async (parentId, name) => {
        const result = await run((exp) => exp.createFile(parentId, name));
        if (result.ok && result.value?.id) {
          depsRef.current.select(result.value.id);
        }
        return result;
      },

      createFolder: async (parentId, name) => {
        const result = await run((exp) => exp.createFolder(parentId, name));
        if (result.ok && result.value?.id) {
          depsRef.current.select(result.value.id);
        }
        return result;
      },

      renameItem: async (id, name) => {
        return run((exp) => exp.renameItem(id, name));
      },

      moveItem: async (id, newParentId) => {
        return run((exp) => exp.moveItem(id, newParentId));
      },

      deleteItem: async (id) => {
        const result = await run((exp) => exp.deleteItem(id));
        if (result.ok) {
          const currentSelected = depsRef.current.selectedId;
          if (currentSelected) {
            try {
              depsRef.current.explorer.getItem(currentSelected);
            } catch {
              depsRef.current.clearSelection();
            }
          }
        }
        return result;
      },

      undo: async () => {
        return run((exp) => exp.undo());
      },

      redo: async () => {
        return run((exp) => exp.redo());
      },
    });
  }

  return actionsRef.current;
}
