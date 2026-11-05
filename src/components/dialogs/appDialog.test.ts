import { AppDialogManager } from './appDialogCore';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runDialogTests() {
  console.log('Starting AppDialogProvider Core Unit Tests...');

  // Test 1: Confirm resolves true on resolveCurrent(true)
  {
    const manager = new AppDialogManager();
    const promise = manager.confirm({
      title: 'Confirm Delete',
      message: 'Are you sure?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    });

    const current = manager.getCurrentDialog();
    assert(current !== null, 'Current dialog should be set');
    assert(current?.type === 'confirm', 'Dialog type should be confirm');
    if (current && current.type === 'confirm') {
      assert(current.options.destructive === true, 'Destructive option should be true');
    }

    manager.resolveCurrent(true);
    const result = await promise;
    assert(result === true, 'Confirm should resolve to true');
    assert(manager.getCurrentDialog() === null, 'Dialog should clear after resolution');
    console.log('✓ Test 1 passed: Confirm resolves true on confirm action');
  }

  // Test 2: Confirm resolves false on dismissCurrent()
  {
    const manager = new AppDialogManager();
    const promise = manager.confirm({
      title: 'Cancel Action',
      message: 'Dismiss me',
    });

    manager.dismissCurrent();
    const result = await promise;
    assert(result === false, 'Confirm should resolve to false on dismiss/cancel');
    console.log('✓ Test 2 passed: Confirm resolves false on dismiss action');
  }

  // Test 3: Notify resolves on resolveCurrent() or dismissCurrent()
  {
    const manager = new AppDialogManager();
    const promise = manager.notify({
      title: 'Notification',
      message: 'Information',
      buttonText: 'Got it',
    });

    assert(manager.getCurrentDialog()?.type === 'notify', 'Dialog type should be notify');
    manager.resolveCurrent();
    await promise;
    assert(manager.getCurrentDialog() === null, 'Notify dialog should clear');
    console.log('✓ Test 3 passed: Notify resolves cleanly');
  }

  // Test 4: FIFO Queue order for sequential dialogs
  {
    const manager = new AppDialogManager();
    const p1 = manager.confirm({ title: 'Dialog 1', message: 'First' });
    const p2 = manager.notify({ title: 'Dialog 2', message: 'Second' });
    const p3 = manager.confirm({ title: 'Dialog 3', message: 'Third' });

    assert(manager.getCurrentDialog()?.options.title === 'Dialog 1', 'First dialog should be active');
    assert(manager.getQueueLength() === 2, 'Queue should hold remaining 2 dialogs');

    // Resolve first
    manager.resolveCurrent(true);
    const r1 = await p1;
    assert(r1 === true, 'First dialog resolved true');

    // Second should now be active
    assert(manager.getCurrentDialog()?.options.title === 'Dialog 2', 'Second dialog should now be active');
    assert(manager.getQueueLength() === 1, 'Queue length should be 1');

    manager.resolveCurrent();
    await p2;

    // Third should now be active
    assert(manager.getCurrentDialog()?.options.title === 'Dialog 3', 'Third dialog should now be active');
    assert(manager.getQueueLength() === 0, 'Queue should be empty');

    manager.dismissCurrent();
    const r3 = await p3;
    assert(r3 === false, 'Third dialog resolved false');
    assert(manager.getCurrentDialog() === null, 'All dialogs cleared');
    console.log('✓ Test 4 passed: FIFO Queue processes sequential dialogs accurately');
  }

  // Test 5: Listener subscription
  {
    const manager = new AppDialogManager();
    const titles: (string | undefined)[] = [];
    const unsub = manager.subscribe((dialog) => {
      titles.push(dialog?.options.title);
    });

    manager.notify({ title: 'Live Update', message: 'Test' });
    manager.resolveCurrent();
    unsub();

    assert(titles.includes('Live Update'), 'Subscriber should receive dialog update');
    console.log('✓ Test 5 passed: Listener subscription receives dialog transitions');
  }

  console.log('All AppDialogProvider Core Unit Tests PASSED Cleanly!');
}

runDialogTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
