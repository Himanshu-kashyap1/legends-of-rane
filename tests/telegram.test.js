import test from 'node:test';
import assert from 'node:assert/strict';
import { userLoaderMiddleware, getNewPlayerDefaults } from '../src/telegram/middlewares/userLoader.js';
import {
  actionLockMiddleware,
  acquireLock,
  releaseLock,
  isLocked,
  clearAllLocks
} from '../src/telegram/middlewares/actionLock.js';
import { ownershipGuardMiddleware } from '../src/telegram/middlewares/ownershipGuard.js';
import { errorBoundaryMiddleware } from '../src/telegram/middlewares/errorBoundary.js';
import { encodeCallback, parseCallback } from '../src/telegram/buttons/callbackData.js';
import { User } from '../src/models/User.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { UnauthorizedError, ConcurrencyError } from '../src/utils/errors.js';

// Setup DB connection for middleware integration tests
test.before(async () => {
  await connectDatabase();
});

test.after(async () => {
  await User.deleteMany({ telegramId: { $in: ['test_user_1', 'test_user_2', 'test_user_3'] } });
  await disconnectDatabase();
  clearAllLocks();
});

test('1 & 2 & 5. UserLoader: New Telegram user is registered with 100 coins and ctx.state.user', async () => {
  const telegramId = 'test_user_1';
  await User.deleteOne({ telegramId });

  const ctx = {
    from: { id: telegramId, username: 'tester1', first_name: 'Test' },
    chat: { id: 1001, type: 'private' },
    state: {}
  };

  let nextCalled = false;
  await userLoaderMiddleware(ctx, async () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.ok(ctx.state.user);
  assert.strictEqual(ctx.state.user.telegramId, telegramId);
  assert.strictEqual(ctx.state.user.coins, 100);
  assert.strictEqual(ctx.state.user.level, 1);
  assert.strictEqual(ctx.state.user.skills.woodcutting.level, 1);
  assert.strictEqual(ctx.state.user.tools.length, 2);
  assert.strictEqual(ctx.state.isPrivate, true);
  assert.strictEqual(ctx.state.isGroup, false);
});

test('3. UserLoader: Existing user is not reset on subsequent interactions', async () => {
  const telegramId = 'test_user_1';
  
  // Modify coins to simulate in-game progress
  await User.updateOne({ telegramId }, { $set: { coins: 550, level: 3 } });

  const ctx = {
    from: { id: telegramId, username: 'tester1_renamed', first_name: 'Test' },
    chat: { id: 1001, type: 'private' },
    state: {}
  };

  await userLoaderMiddleware(ctx, async () => {});

  assert.strictEqual(ctx.state.user.coins, 550);
  assert.strictEqual(ctx.state.user.level, 3);
  assert.strictEqual(ctx.state.user.username, 'tester1_renamed');
});

test('4. UserLoader: Concurrent registration requests cannot create duplicate players', async () => {
  const telegramId = 'test_user_2';
  await User.deleteOne({ telegramId });

  const createCtx = () => ({
    from: { id: telegramId, username: 'concurrent_user' },
    chat: { id: 2002, type: 'private' },
    state: {}
  });

  const ctx1 = createCtx();
  const ctx2 = createCtx();

  // Run two concurrent userLoader middleware calls simultaneously
  await Promise.all([
    userLoaderMiddleware(ctx1, async () => {}),
    userLoaderMiddleware(ctx2, async () => {})
  ]);

  const count = await User.countDocuments({ telegramId });
  assert.strictEqual(count, 1);
  assert.strictEqual(ctx1.state.user.telegramId, telegramId);
  assert.strictEqual(ctx2.state.user.telegramId, telegramId);
});

test('6. UserLoader: Missing Telegram identity is handled safely without throwing', async () => {
  const ctx = {
    chat: { id: 9999, type: 'channel' },
    state: {}
  };

  let nextCalled = false;
  await userLoaderMiddleware(ctx, async () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(ctx.state.user, null);
  assert.strictEqual(ctx.state.telegramUser, null);
});

test('7. ActionLock: Read-only actions do not acquire a state-changing lock', async () => {
  const ctx = {
    from: { id: 'test_user_3' },
    callbackQuery: { data: 'menu:test_user_3:profile' }
  };

  let handlerRan = false;
  await actionLockMiddleware(ctx, async () => {
    handlerRan = true;
    assert.strictEqual(isLocked('test_user_3'), false);
  });

  assert.strictEqual(handlerRan, true);
  assert.strictEqual(isLocked('test_user_3'), false);
});

test('8 & 9. ActionLock: Concurrent state-changing action is blocked, lock releases after success', async () => {
  const telegramId = 'test_user_3';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: {
      data: 'gather:test_user_3:forest_oak'
    },
    answerCbQuery: async () => {}
  };

  let insideLockIsLocked = false;
  let concurrentBlocked = false;

  await actionLockMiddleware(ctx, async () => {
    insideLockIsLocked = isLocked(telegramId);

    // Attempt concurrent action inside execution
    try {
      await actionLockMiddleware(ctx, async () => {});
    } catch (err) {
      if (err instanceof ConcurrencyError) {
        concurrentBlocked = true;
      }
    }
  });

  assert.strictEqual(insideLockIsLocked, true);
  assert.strictEqual(concurrentBlocked, true);
  // Lock should be cleanly released after middleware finishes
  assert.strictEqual(isLocked(telegramId), false);
});

test('10. ActionLock: Lock releases even if handler throws an error', async () => {
  const telegramId = 'test_user_3';
  clearAllLocks();

  const ctx = {
    from: { id: telegramId },
    callbackQuery: { data: 'craft:test_user_3:axe' },
    answerCbQuery: async () => {}
  };

  let threwError = false;
  try {
    await actionLockMiddleware(ctx, async () => {
      throw new Error('Crafting engine internal failure');
    });
  } catch (err) {
    threwError = true;
  }

  assert.strictEqual(threwError, true);
  assert.strictEqual(isLocked(telegramId), false);
});

test('11. ActionLock: Lock has timeout failsafe behavior', async () => {
  const telegramId = 'lock_timeout_user';
  acquireLock(telegramId, 50); // 50ms timeout
  assert.strictEqual(isLocked(telegramId), true);

  await new Promise((r) => setTimeout(r, 70));
  assert.strictEqual(isLocked(telegramId), false);
});

test('12. OwnershipGuard: Player A can use Player A callback', async () => {
  const callbackStr = encodeCallback({ action: 'inventory', ownerId: '12345', targetId: 'page_1' });
  const ctx = {
    from: { id: '12345' },
    callbackQuery: { data: callbackStr },
    answerCbQuery: async () => {},
    state: {}
  };

  let nextCalled = false;
  await ownershipGuardMiddleware(ctx, async () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(ctx.state.callback.action, 'inventory');
  assert.strictEqual(ctx.state.callback.ownerId, '12345');
});

test('13 & 14. OwnershipGuard: Player B is rejected from Player A callback and does not run handler', async () => {
  const callbackStr = encodeCallback({ action: 'profile', ownerId: '12345' });
  let alertMessage = '';

  const ctx = {
    from: { id: '99999' }, // Different user
    callbackQuery: {
      data: callbackStr
    },
    answerCbQuery: async (msg) => { alertMessage = msg; },
    state: {}
  };

  let handlerRan = false;
  let rejected = false;

  try {
    await ownershipGuardMiddleware(ctx, async () => {
      handlerRan = true;
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      rejected = true;
    }
  }

  assert.strictEqual(rejected, true);
  assert.strictEqual(handlerRan, false);
  assert.ok(alertMessage.includes('another adventurer'));
});

test('15. OwnershipGuard: Malformed callback data is safely rejected', () => {
  const parsed1 = parseCallback('');
  assert.strictEqual(parsed1.isValid, false);

  const parsed2 = parseCallback('menu:123:item_1:extra_meta');
  assert.strictEqual(parsed2.isValid, true);
  assert.strictEqual(parsed2.action, 'menu');
  assert.strictEqual(parsed2.ownerId, '123');
  assert.strictEqual(parsed2.targetId, 'item_1');
  assert.strictEqual(parsed2.meta, 'extra_meta');
});

test('16. Chat type handling distinguishes private and group chats', async () => {
  const privateCtx = {
    from: { id: 'user_p' },
    chat: { id: 1, type: 'private' },
    state: {}
  };
  await userLoaderMiddleware(privateCtx, async () => {});
  assert.strictEqual(privateCtx.state.isPrivate, true);
  assert.strictEqual(privateCtx.state.isGroup, false);

  const groupCtx = {
    from: { id: 'user_g' },
    chat: { id: -1001234, type: 'supergroup' },
    state: {}
  };
  await userLoaderMiddleware(groupCtx, async () => {});
  assert.strictEqual(groupCtx.state.isPrivate, false);
  assert.strictEqual(groupCtx.state.isGroup, true);
});

test('17. ErrorBoundary: Catches unexpected errors and replies safely without throwing', async () => {
  let repliedMessage = '';
  const ctx = {
    updateType: 'message',
    from: { id: 'error_user' },
    chat: { id: 1, type: 'private' },
    reply: async (msg) => { repliedMessage = msg; }
  };

  await errorBoundaryMiddleware(ctx, async () => {
    throw new Error('Fatal unexpected database error with secret token 12345');
  });

  assert.ok(repliedMessage.includes('unexpected error occurred'));
  assert.strictEqual(repliedMessage.includes('12345'), false); // No sensitive details leaked
});
