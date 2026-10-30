import { renderHook, act } from '@testing-library/react';
import {
  FeedbackProvider,
  useFeedbackError,
  useIsPending,
  useFeedbackActions,
} from '../../src/context/FeedbackContext.jsx';

describe('FeedbackContext', () => {
  it('reportError stores a message and code, clearError resets it, and passing a string or an Error both work', () => {
    const { result } = renderHook(
      () => ({
        error: useFeedbackError(),
        actions: useFeedbackActions(),
      }),
      { wrapper: FeedbackProvider }
    );

    expect(result.current.error).toBeNull();

    act(() => {
      result.current.actions.reportError('Simple error');
    });
    expect(result.current.error).toEqual({
      message: 'Simple error',
      code: undefined,
    });

    act(() => {
      result.current.actions.clearError();
    });
    expect(result.current.error).toBeNull();

    const customError = new Error('Disk failure');
    customError.code = 'ERR_DISK';
    act(() => {
      result.current.actions.reportError(customError);
    });
    expect(result.current.error).toEqual({
      message: 'Disk failure',
      code: 'ERR_DISK',
    });

    act(() => {
      result.current.actions.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('pending is true between startPending and endPending, and counts correctly when two operations overlap', () => {
    const { result } = renderHook(
      () => ({
        isPending: useIsPending(),
        actions: useFeedbackActions(),
      }),
      { wrapper: FeedbackProvider }
    );

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.actions.startPending();
    });
    expect(result.current.isPending).toBe(true);

    act(() => {
      result.current.actions.startPending();
    });
    expect(result.current.isPending).toBe(true);

    act(() => {
      result.current.actions.endPending();
    });
    expect(result.current.isPending).toBe(true);

    act(() => {
      result.current.actions.endPending();
    });
    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.actions.endPending();
    });
    expect(result.current.isPending).toBe(false);
  });

  it('setting the same state again does not notify subscribers', () => {
    let renderCount = 0;
    const { result } = renderHook(
      () => {
        renderCount++;
        return {
          error: useFeedbackError(),
          actions: useFeedbackActions(),
        };
      },
      { wrapper: FeedbackProvider }
    );

    expect(renderCount).toBe(1);

    act(() => {
      result.current.actions.reportError('Failed action');
    });
    expect(renderCount).toBe(2);

    act(() => {
      result.current.actions.reportError('Failed action');
    });
    expect(renderCount).toBe(2);

    act(() => {
      result.current.actions.clearError();
    });
    expect(renderCount).toBe(3);

    act(() => {
      result.current.actions.clearError();
    });
    expect(renderCount).toBe(3);
  });

  it('useFeedbackActions returns the same object reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useFeedbackActions(), {
      wrapper: FeedbackProvider,
    });

    const initialActions = result.current;
    rerender();
    expect(result.current).toBe(initialActions);
  });

  it('hooks outside the provider throw a clear error', () => {
    expect(() => renderHook(() => useFeedbackError())).toThrow(
      'Feedback hooks must be used within a FeedbackProvider'
    );
    expect(() => renderHook(() => useIsPending())).toThrow(
      'Feedback hooks must be used within a FeedbackProvider'
    );
    expect(() => renderHook(() => useFeedbackActions())).toThrow(
      'Feedback hooks must be used within a FeedbackProvider'
    );
  });
});
