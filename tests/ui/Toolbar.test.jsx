import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { Toolbar } from '../../src/components/Toolbar/Toolbar.jsx';
import { FileTree } from '../../src/components/FileTree/FileTree.jsx';
import { ErrorBanner } from '../../src/components/ErrorBanner.jsx';
import { renderWithProviders } from './renderWithProviders.jsx';

function ToolbarHarness() {
  return (
    <div>
      <ErrorBanner />
      <Toolbar />
      <FileTree />
    </div>
  );
}

function getToolbar() {
  return screen.getByRole('toolbar', { name: 'Explorer actions' });
}

function toolbarButton(name) {
  return within(getToolbar()).getByRole('button', { name });
}

describe('Toolbar and Dialogs', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('with nothing selected, Rename, Move and Delete are disabled and New File and New Folder are enabled', () => {
    renderWithProviders(<ToolbarHarness />);

    expect(toolbarButton('New File')).toBeEnabled();
    expect(toolbarButton('New Folder')).toBeEnabled();
    expect(toolbarButton('Rename')).toBeDisabled();
    expect(toolbarButton('Move')).toBeDisabled();
    expect(toolbarButton('Delete')).toBeDisabled();
  });

  it('with the root selected, Rename, Move and Delete are disabled', () => {
    renderWithProviders(<ToolbarHarness />);

    fireEvent.click(screen.getByText('My Files'));

    expect(toolbarButton('New File')).toBeEnabled();
    expect(toolbarButton('New Folder')).toBeEnabled();
    expect(toolbarButton('Rename')).toBeDisabled();
    expect(toolbarButton('Move')).toBeDisabled();
    expect(toolbarButton('Delete')).toBeDisabled();
  });

  it('New Folder with nothing selected adds the folder under the root and the tree shows it', async () => {
    const { explorer } = renderWithProviders(<ToolbarHarness />);

    fireEvent.click(toolbarButton('New Folder'));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Projects' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    // async: wait for the dialog to close and the tree to show the new folder
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Projects')).toBeInTheDocument();

    const root = explorer.getTree();
    expect(root.children.some((c) => c.name === 'Projects')).toBe(true);
  });

  it("New File with a folder selected adds the file inside that folder and expands it; with a file selected it adds the file in that file's parent", async () => {
    const { explorer } = renderWithProviders(<ToolbarHarness />);

    // 1. Select Documents (collapsed), create file inside it
    fireEvent.click(screen.getByText('Documents'));
    fireEvent.click(toolbarButton('New File'));

    let dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Spec.txt' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    // wait for dialog to close and tree to expand Documents and show Spec.txt
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Spec.txt')).toBeInTheDocument();
    const docs = explorer.getTree().children.find((c) => c.name === 'Documents');
    expect(docs.children.some((c) => c.name === 'Spec.txt')).toBe(true);

    // 2. Select Notes.txt (a file at root), create file → goes to root
    fireEvent.click(screen.getByText('Notes.txt'));
    fireEvent.click(toolbarButton('New File'));

    dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'RootFile.txt' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('RootFile.txt')).toBeInTheDocument();
    const root = explorer.getTree();
    expect(root.children.some((c) => c.name === 'RootFile.txt')).toBe(true);
  });

  it('duplicate name (including different letter casing), an empty name and a name with a slash each show an inline error with role="alert" in the dialog, keep the dialog open, and do not show the top banner at the same time', async () => {
    renderWithProviders(<ToolbarHarness />);

    fireEvent.click(toolbarButton('New File'));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByRole('textbox');
    const createButton = within(dialog).getByRole('button', { name: 'Create' });

    // Empty name (whitespace-only trims to '' → InvalidNameError)
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(createButton);
    const alert1 = await within(dialog).findByRole('alert');
    expect(alert1).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss error' })).not.toBeInTheDocument();

    // Name with a slash
    fireEvent.change(input, { target: { value: 'bad/name.txt' } });
    fireEvent.click(createButton);
    // typing cleared the previous alert, now wait for the new one
    const alert2 = await within(dialog).findByRole('alert');
    expect(alert2).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss error' })).not.toBeInTheDocument();

    // Duplicate name (case-insensitive → SDK treats 'notes.txt' same as 'Notes.txt')
    fireEvent.change(input, { target: { value: 'notes.txt' } });
    fireEvent.click(createButton);
    const alert3 = await within(dialog).findByRole('alert');
    expect(alert3).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss error' })).not.toBeInTheDocument();
  });

  it('fixing the name after an error and submitting again succeeds and closes the dialog', async () => {
    renderWithProviders(<ToolbarHarness />);

    fireEvent.click(toolbarButton('New File'));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByRole('textbox');
    const createButton = within(dialog).getByRole('button', { name: 'Create' });

    // Cause an error (duplicate)
    fireEvent.change(input, { target: { value: 'Notes.txt' } });
    fireEvent.click(createButton);
    await within(dialog).findByRole('alert');

    // Typing clears the inline alert
    fireEvent.change(input, { target: { value: 'FixedName.txt' } });
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();

    // Fix the name and submit — dialog should close
    fireEvent.click(createButton);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('FixedName.txt')).toBeInTheDocument();
  });

  it('Rename prefills the current name, and renaming to a valid name updates the tree; renaming to an existing sibling name shows an inline error', async () => {
    renderWithProviders(<ToolbarHarness />);

    fireEvent.click(screen.getByText('Notes.txt'));
    fireEvent.click(toolbarButton('Rename'));

    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByRole('textbox');
    expect(input).toHaveValue('Notes.txt');

    const renameButton = within(dialog).getByRole('button', { name: 'Rename' });

    // Rename to an existing sibling name → inline error
    fireEvent.change(input, { target: { value: 'Documents' } });
    fireEvent.click(renameButton);
    await within(dialog).findByRole('alert');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Fix the name → dialog closes and tree updates
    fireEvent.change(input, { target: { value: 'NotesRenamed.txt' } });
    fireEvent.click(renameButton);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('NotesRenamed.txt')).toBeInTheDocument();
    expect(screen.queryByText('Notes.txt')).not.toBeInTheDocument();
  });

  it('Escape, the backdrop and Cancel each close a dialog without changing the tree', async () => {
    const { explorer } = renderWithProviders(<ToolbarHarness />);
    const initialTreeJson = JSON.stringify(explorer.getTree());

    // 1. Escape
    fireEvent.click(toolbarButton('New File'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(JSON.stringify(explorer.getTree())).toBe(initialTreeJson);

    // 2. Cancel
    fireEvent.click(toolbarButton('New Folder'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(JSON.stringify(explorer.getTree())).toBe(initialTreeJson);

    // 3. Backdrop click (the outer fixed overlay, parent of the dialog panel)
    fireEvent.click(toolbarButton('New File'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.parentElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(JSON.stringify(explorer.getTree())).toBe(initialTreeJson);
  });

  it('Move: the folder list disables the item itself and its descendants; the Move button stays disabled until a different folder is picked; choosing another folder and clicking Move moves the item and the tree updates', async () => {
    const { explorer } = renderWithProviders(<ToolbarHarness />);

    // Select Documents and open Move dialog
    fireEvent.click(screen.getByText('Documents'));
    fireEvent.click(toolbarButton('Move'));

    const dialog = screen.getByRole('dialog');
    const moveSubmit = within(dialog).getByRole('button', { name: 'Move' });
    expect(moveSubmit).toBeDisabled(); // current parent is root → same folder → disabled

    const listbox = within(dialog).getByRole('listbox');

    // Documents (the item being moved) should be disabled
    const docsOption = within(listbox).getByRole('option', { name: /Documents/i });
    expect(docsOption).toBeDisabled();

    // Root is the current parent → shows (current)
    const rootOption = within(listbox).getByRole('option', { name: /My Files/i });
    expect(rootOption).toHaveTextContent('(current)');

    // Images is selectable
    const imagesOption = within(listbox).getByRole('option', { name: /Images/i });
    expect(imagesOption).toBeEnabled();

    // Select Images → Move button enables
    fireEvent.click(imagesOption);
    expect(moveSubmit).toBeEnabled();

    // Submit the move → dialog closes and tree reflects the change
    fireEvent.click(moveSubmit);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const images = explorer.getTree().children.find((c) => c.name === 'Images');
    expect(images.children.some((c) => c.name === 'Documents')).toBe(true);
  });

  it('Move that fails (duplicate name in the target) keeps the dialog open with an inline error', async () => {
    const { explorer } = renderWithProviders(<ToolbarHarness />);

    // Seed a Notes.txt inside Images so moving root Notes.txt into Images will fail (duplicate)
    const images = explorer.getTree().children.find((c) => c.name === 'Images');
    explorer.createFile(images.id, 'Notes.txt');

    // Select root Notes.txt and open Move dialog
    fireEvent.click(screen.getByText('Notes.txt'));
    fireEvent.click(toolbarButton('Move'));

    const dialog = screen.getByRole('dialog');
    const listbox = within(dialog).getByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: /Images/i }));

    fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }));

    // async: wait for inline error to appear; dialog stays open
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('text-danger');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss error' })).not.toBeInTheDocument();
  });

  it('Delete: the confirmation shows the item count for a folder; initial focus is on Cancel; Cancel changes nothing; confirming deletes the folder and clears the selection', async () => {
    renderWithProviders(<ToolbarHarness />);

    // Select Documents (root → Documents → Resume.pdf + Project Plan.docx = 3 items total)
    fireEvent.click(screen.getByText('Documents'));
    fireEvent.click(toolbarButton('Delete'));

    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete Documents?')).toBeInTheDocument();
    expect(within(dialog).getByText(/3 items will be removed in total/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/This can be undone with Undo/i)).toBeInTheDocument();

    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(document.activeElement).toBe(cancelBtn);

    // Cancel → dialog closes, tree unchanged
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();

    // Open again and confirm delete
    fireEvent.click(toolbarButton('Delete'));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Documents')).not.toBeInTheDocument();

    // Selection cleared → item-action buttons disabled again
    expect(toolbarButton('Rename')).toBeDisabled();
    expect(toolbarButton('Move')).toBeDisabled();
    expect(toolbarButton('Delete')).toBeDisabled();
  });

  it("the SDK's undo history reflects these UI operations (explorer.canUndo() becomes true after a successful action and stays the same after a failed one)", async () => {
    const { explorer } = renderWithProviders(<ToolbarHarness />);

    expect(explorer.canUndo()).toBe(false);

    // Failed action (empty name) must not push to history
    fireEvent.click(toolbarButton('New File'));
    let dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    // wait for the async handler to settle (alert appears = handler is done)
    await within(dialog).findByRole('alert');
    expect(explorer.canUndo()).toBe(false);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    // Successful action pushes to history
    fireEvent.click(toolbarButton('New Folder'));
    dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'UndoFolder' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(explorer.canUndo()).toBe(true);

    // Second failed action (duplicate name) must not push an extra undo step
    fireEvent.click(toolbarButton('New Folder'));
    dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'UndoFolder' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await within(dialog).findByRole('alert');
    expect(explorer.canUndo()).toBe(true);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    // SDK undo reverts the folder
    explorer.undo();
    expect(explorer.getTree().children.some((c) => c.name === 'UndoFolder')).toBe(false);
  });
});
