import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { useBackgroundAwareInterval } from '../useBackgroundAwareInterval';

// Opt this test file into React's act() environment so flushing effects
// doesn't emit "not configured to support act(...)" warnings.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

interface HarnessProps {
  callback: () => void;
  ms: number;
  options?: Parameters<typeof useBackgroundAwareInterval>[2];
}

function Harness({ callback, ms, options }: HarnessProps) {
  useBackgroundAwareInterval(callback, ms, options);
  return null;
}

function render(node: React.ReactNode) {
  act(() => {
    root.render(node);
  });
}

describe('useBackgroundAwareInterval', () => {
  beforeEach(() => {
    setVisibility('visible');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('fires every intervalMs while active', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} />);
    expect(cb).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(cb).toHaveBeenCalledTimes(4);
  });

  it('does not fire on mount by default (matches setInterval)', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} />);
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires once on mount when immediate=true', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} options={{ immediate: true }} />);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('pauses while document is hidden, resumes when visible', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      setVisibility('hidden');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      setVisibility('visible');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('pauses on axo-app-pause, resumes on axo-app-resume', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new Event('axo-app-pause'));
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new Event('axo-app-resume'));
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('stays paused if either signal still says inactive', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} />);

    act(() => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('axo-app-pause'));
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).not.toHaveBeenCalled();

    // Native resumes, but webview still hidden — should remain paused.
    act(() => {
      document.dispatchEvent(new Event('axo-app-resume'));
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).not.toHaveBeenCalled();

    // Webview becomes visible — now it should run.
    act(() => {
      setVisibility('visible');
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires immediately on resume when immediate=true', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={1000} options={{ immediate: true }} />);
    expect(cb).toHaveBeenCalledTimes(1); // mount

    act(() => {
      document.dispatchEvent(new Event('axo-app-pause'));
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new Event('axo-app-resume'));
    });
    expect(cb).toHaveBeenCalledTimes(2); // immediate catch-up
  });

  it('does not fire while enabled=false', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} options={{ enabled: false }} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('starts firing when enabled flips false → true', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} options={{ enabled: false }} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(cb).not.toHaveBeenCalled();

    render(<Harness callback={cb} ms={100} options={{ enabled: true }} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('uses the latest callback without restarting the interval', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    render(<Harness callback={cb1} ms={100} />);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    // Swap callback halfway through the interval. If the interval restarts,
    // the next fire would be at 50+100=150ms; since it shouldn't, it's at 100ms.
    render(<Harness callback={cb2} ms={100} />);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('cleans up listeners and interval on unmount', () => {
    const cb = vi.fn();
    render(<Harness callback={cb} ms={100} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    act(() => {
      vi.advanceTimersByTime(500);
      document.dispatchEvent(new Event('axo-app-resume'));
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
