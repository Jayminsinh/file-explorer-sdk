import { EventEmitter } from '../../src/sdk/emitter.js';

describe('EventEmitter', () => {
  it('subscribe returns an unsubscribe function and the listener receives the emitted payload', () => {
    const emitter = new EventEmitter();
    const received = [];
    const unsubscribe = emitter.subscribe((payload) => {
      received.push(payload);
    });

    expect(typeof unsubscribe).toBe('function');

    emitter.emit({ message: 'hello' });
    expect(received).toEqual([{ message: 'hello' }]);
  });

  it('the same function subscribed twice is only called once per emit', () => {
    const emitter = new EventEmitter();
    let callCount = 0;
    const listener = () => {
      callCount++;
    };

    emitter.subscribe(listener);
    emitter.subscribe(listener);

    emitter.emit('event');
    expect(callCount).toBe(1);
  });

  it('after unsubscribe the listener is no longer called', () => {
    const emitter = new EventEmitter();
    let called = false;
    const unsubscribe = emitter.subscribe(() => {
      called = true;
    });

    unsubscribe();
    emitter.emit('event');
    expect(called).toBe(false);
  });

  it('calling unsubscribe twice does not throw', () => {
    const emitter = new EventEmitter();
    const unsubscribe = emitter.subscribe(() => {});

    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });

  it('if one listener throws, the other listeners still run and emit does not throw', () => {
    const emitter = new EventEmitter();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let secondRan = false;

    emitter.subscribe(() => {
      throw new Error('listener failure');
    });
    emitter.subscribe(() => {
      secondRan = true;
    });

    expect(() => emitter.emit('data')).not.toThrow();
    expect(secondRan).toBe(true);

    errorSpy.mockRestore();
  });

  it('a listener that unsubscribes itself during an emit does not break the other listeners', () => {
    const emitter = new EventEmitter();
    let secondRan = false;

    const unsubscribe = emitter.subscribe(() => {
      unsubscribe();
    });

    emitter.subscribe(() => {
      secondRan = true;
    });

    expect(() => emitter.emit('data')).not.toThrow();
    expect(secondRan).toBe(true);

    secondRan = false;
    emitter.emit('data');
    expect(secondRan).toBe(true);
  });

  it('subscribing something that is not a function throws a TypeError', () => {
    const emitter = new EventEmitter();

    expect(() => emitter.subscribe(null)).toThrow(TypeError);
    expect(() => emitter.subscribe(undefined)).toThrow(TypeError);
    expect(() => emitter.subscribe('string')).toThrow(TypeError);
    expect(() => emitter.subscribe(123)).toThrow(TypeError);
    expect(() => emitter.subscribe({})).toThrow(TypeError);
  });
});
