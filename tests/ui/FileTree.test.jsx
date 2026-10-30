import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { ExplorerProvider } from '../../src/context/ExplorerContext.jsx';
import { UiStateProvider } from '../../src/context/UiStateContext.jsx';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext.jsx';
import { FileTree } from '../../src/components/FileTree/FileTree.jsx';
import { FileExplorer } from '../../src/sdk/FileExplorer.js';

function renderTree(explorer = new FileExplorer()) {
  return render(
    <ThemeProvider>
      <ExplorerProvider explorer={explorer}>
        <UiStateProvider>
          <FileTree />
        </UiStateProvider>
      </ExplorerProvider>
    </ThemeProvider>
  );
}

describe('FileTree', () => {
  it('renders the seeded tree: My Files expanded, Documents and Images visible but collapsed, and Notes.txt', () => {
    const explorer = new FileExplorer();
    renderTree(explorer);

    expect(screen.getByText('My Files')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Images')).toBeInTheDocument();
    expect(screen.getByText('Notes.txt')).toBeInTheDocument();

    expect(screen.queryByText('Resume.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('Project Plan.docx')).not.toBeInTheDocument();
    expect(screen.queryByText('Photo.png')).not.toBeInTheDocument();
  });

  it('clicking a folder chevron shows its children, and clicking again hides them', async () => {
    const explorer = new FileExplorer();
    renderTree(explorer);

    const docsItem = screen.getByText('Documents').closest('[role="treeitem"]');
    const expandButton = within(docsItem).getByRole('button', { name: /expand folder/i });

    await fireEvent.click(expandButton);
    expect(screen.getByText('Resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Project Plan.docx')).toBeInTheDocument();

    const collapseButton = within(docsItem).getByRole('button', { name: /collapse folder/i });
    await fireEvent.click(collapseButton);
    expect(screen.queryByText('Resume.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('Project Plan.docx')).not.toBeInTheDocument();
  });

  it('clicking a row selects it and sets aria-selected to true on that row only', async () => {
    const explorer = new FileExplorer();
    renderTree(explorer);

    const notesItem = screen.getByText('Notes.txt').closest('[role="treeitem"]');
    const docsItem = screen.getByText('Documents').closest('[role="treeitem"]');

    expect(notesItem).toHaveAttribute('aria-selected', 'false');
    expect(docsItem).toHaveAttribute('aria-selected', 'false');

    await fireEvent.click(screen.getByText('Notes.txt'));
    expect(notesItem).toHaveAttribute('aria-selected', 'true');
    expect(docsItem).toHaveAttribute('aria-selected', 'false');

    await fireEvent.click(screen.getByText('Documents'));
    expect(docsItem).toHaveAttribute('aria-selected', 'true');
    expect(notesItem).toHaveAttribute('aria-selected', 'false');
  });

  it('folders are listed before files, each group sorted by name case-insensitively', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();

    explorer.createFolder(root.id, 'zebra');
    explorer.createFile(root.id, 'alpha.txt');
    explorer.createFolder(root.id, 'beta');
    explorer.createFile(root.id, 'apple.txt');

    renderTree(explorer);

    const items = screen.getAllByRole('treeitem');
    const directNames = items.slice(1).map((item) => {
      const nameSpan = item.querySelector('button span.truncate');
      return nameSpan ? nameSpan.textContent : '';
    });

    expect(directNames).toEqual([
      'beta',
      'Documents',
      'Images',
      'zebra',
      'alpha.txt',
      'apple.txt',
      'Notes.txt',
    ]);
  });

  it('an expanded empty folder shows the "Empty" text', async () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    explorer.createFolder(root.id, 'EmptyFolder');

    renderTree(explorer);

    const folderItem = screen.getByText('EmptyFolder').closest('[role="treeitem"]');
    const chevronButton = within(folderItem).getByRole('button', { name: /expand folder/i });

    await fireEvent.click(chevronButton);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('when the SDK changes outside React, the tree updates to match', () => {
    const explorer = new FileExplorer();
    const root = explorer.getTree();
    const docs = root.children.find((c) => c.name === 'Documents');
    const images = root.children.find((c) => c.name === 'Images');

    renderTree(explorer);

    act(() => {
      explorer.createFile(root.id, 'Dynamic.txt');
    });
    expect(screen.getByText('Dynamic.txt')).toBeInTheDocument();

    act(() => {
      explorer.renameItem(docs.id, 'ArchivedDocs');
    });
    expect(screen.getByText('ArchivedDocs')).toBeInTheDocument();
    expect(screen.queryByText('Documents')).not.toBeInTheDocument();

    act(() => {
      explorer.deleteItem(images.id);
    });
    expect(screen.queryByText('Images')).not.toBeInTheDocument();
  });

  it('rows have role="treeitem" inside role="tree", and folders expose aria-expanded', () => {
    const explorer = new FileExplorer();
    renderTree(explorer);

    expect(screen.getByRole('tree')).toBeInTheDocument();

    const rootItem = screen.getByText('My Files').closest('[role="treeitem"]');
    expect(rootItem).toHaveAttribute('aria-expanded', 'true');

    const docsItem = screen.getByText('Documents').closest('[role="treeitem"]');
    expect(docsItem).toHaveAttribute('aria-expanded', 'false');

    const notesItem = screen.getByText('Notes.txt').closest('[role="treeitem"]');
    expect(notesItem).not.toHaveAttribute('aria-expanded');
  });

  it('maintains targeted re-renders observed via console.log', async () => {
    const explorer = new FileExplorer();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    let themeContext;
    function ThemeCapture() {
      themeContext = useTheme();
      return null;
    }

    render(
      <ThemeProvider>
        <ThemeCapture />
        <ExplorerProvider explorer={explorer}>
          <UiStateProvider>
            <FileTree />
          </UiStateProvider>
        </ExplorerProvider>
      </ThemeProvider>
    );

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockClear();

    // 1. Expanding 'Documents' logs only 'Documents' and its newly shown children
    const docsItem = screen.getByText('Documents').closest('[role="treeitem"]');
    const expandButton = within(docsItem).getByRole('button', { name: /expand folder/i });
    await fireEvent.click(expandButton);

    const expandLogs = logSpy.mock.calls
      .map((call) => call[0])
      .filter((msg) => typeof msg === 'string' && msg.startsWith('render TreeNode:'));

    expect(expandLogs).toEqual([
      'render TreeNode: Documents',
      'render TreeNode: Project Plan.docx',
      'render TreeNode: Resume.pdf',
    ]);
    logSpy.mockClear();

    // 2. Selecting 'Notes.txt' logs only 'Notes.txt'
    await fireEvent.click(screen.getByText('Notes.txt'));
    const selectFirstLogs = logSpy.mock.calls
      .map((call) => call[0])
      .filter((msg) => typeof msg === 'string' && msg.startsWith('render TreeNode:'));

    expect(selectFirstLogs).toEqual(['render TreeNode: Notes.txt']);
    logSpy.mockClear();

    // 3. Selecting 'Images' logs only previous selection ('Notes.txt') and new ('Images')
    await fireEvent.click(screen.getByText('Images'));
    const selectSecondLogs = logSpy.mock.calls
      .map((call) => call[0])
      .filter((msg) => typeof msg === 'string' && msg.startsWith('render TreeNode:'))
      .sort();

    expect(selectSecondLogs).toEqual([
      'render TreeNode: Images',
      'render TreeNode: Notes.txt',
    ]);
    logSpy.mockClear();

    // 4. Toggling the theme does not log any TreeNode render
    act(() => {
      themeContext.toggleTheme();
    });

    const themeToggleLogs = logSpy.mock.calls
      .map((call) => call[0])
      .filter((msg) => typeof msg === 'string' && msg.startsWith('render TreeNode:'));

    expect(themeToggleLogs).toHaveLength(0);

    logSpy.mockRestore();
  });
});
