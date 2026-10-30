import { memo, useState } from 'react';
import { VscNewFile, VscNewFolder, VscRename } from 'react-icons/vsc';
import { useSelectedItem } from '../../hooks/useSelectedItem.js';
import { useFileExplorerTree } from '../../hooks/useFileExplorer.js';
import { useExplorerActions } from '../../hooks/useExplorerActions.js';
import { useUiActions } from '../../context/UiStateContext.jsx';
import { NameDialog } from '../Dialogs/NameDialog.jsx';

export const Toolbar = memo(function Toolbar() {
  const selectedItem = useSelectedItem();
  const tree = useFileExplorerTree();
  const { createFile, createFolder, renameItem } = useExplorerActions();
  const { setExpanded } = useUiActions();

  const [dialogType, setDialogType] = useState(null);

  const isRenameDisabled = !selectedItem || selectedItem.id === tree?.id;

  const getTargetFolderId = () => {
    if (!selectedItem) {
      return tree?.id;
    }
    if (selectedItem.type === 'folder') {
      return selectedItem.id;
    }
    return selectedItem.parentId || tree?.id;
  };

  const handleCreateFile = async (name) => {
    const targetFolderId = getTargetFolderId();
    const result = await createFile(targetFolderId, name);
    if (result?.ok && targetFolderId) {
      setExpanded(targetFolderId, true);
    }
    return result;
  };

  const handleCreateFolder = async (name) => {
    const targetFolderId = getTargetFolderId();
    const result = await createFolder(targetFolderId, name);
    if (result?.ok && targetFolderId) {
      setExpanded(targetFolderId, true);
    }
    return result;
  };

  const handleRename = async (name) => {
    if (!selectedItem) {
      return { ok: false, error: new Error('No item selected') };
    }
    return renameItem(selectedItem.id, name);
  };

  const buttonClass =
    'flex items-center justify-center w-6 h-6 rounded text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted disabled:cursor-not-allowed';

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          title="New File"
          aria-label="New File"
          onClick={() => setDialogType('newFile')}
          className={buttonClass}
        >
          <VscNewFile className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="New Folder"
          aria-label="New Folder"
          onClick={() => setDialogType('newFolder')}
          className={buttonClass}
        >
          <VscNewFolder className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Rename"
          aria-label="Rename"
          disabled={isRenameDisabled}
          onClick={() => setDialogType('rename')}
          className={buttonClass}
        >
          <VscRename className="w-4 h-4" />
        </button>
        {/* Space for future Move and Delete actions */}
      </div>

      {dialogType === 'newFile' && (
        <NameDialog
          title="New File"
          submitLabel="Create"
          onSubmit={handleCreateFile}
          onClose={() => setDialogType(null)}
        />
      )}
      {dialogType === 'newFolder' && (
        <NameDialog
          title="New Folder"
          submitLabel="Create"
          onSubmit={handleCreateFolder}
          onClose={() => setDialogType(null)}
        />
      )}
      {dialogType === 'rename' && (
        <NameDialog
          title="Rename"
          submitLabel="Rename"
          initialValue={selectedItem ? selectedItem.name : ''}
          onSubmit={handleRename}
          onClose={() => setDialogType(null)}
        />
      )}
    </>
  );
});
