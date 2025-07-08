# DIRTY MIGRATION REMOVAL INSTRUCTIONS

## Overview
This document contains instructions for removing the dirty user ID migration code after the rollout is complete.

## Files to Remove

### 1. Migration Service
- **File**: `app/services/migration/DirtyUserIdMigration.ts`
- **Action**: Delete the entire file

### 2. Migration Directory (if empty)
- **Directory**: `app/services/migration/`
- **Action**: Delete directory if no other files remain

## Files to Modify

### 1. Authentication Configuration
- **File**: `app/lib/auth.ts`
- **Action**: Remove the migration code from the session callback

**Remove these lines** (approximately lines 22-30):
```typescript
        // DIRTY MIGRATION - DELETE AFTER ROLLOUT
        // Migrate user data from old format to new format
        try {
          const migration = new DirtyUserIdMigration()
          await migration.migrateUserData(token.sub!)
        } catch (error) {
          // Log error but don't break authentication
          console.error('User ID migration failed:', error)
        }
```

**Remove this import** (line 4):
```typescript
import { DirtyUserIdMigration } from '@/services/migration/DirtyUserIdMigration'
```

## Post-Removal Cleanup

### 1. Run Code Quality Checks
```bash
npm run format      # Format code
npm run ci          # Run all checks
```

### 2. Test Authentication
- Test user login/logout functionality
- Verify user settings and API keys are accessible
- Check that new users can authenticate properly

### 3. Remove This File
- **File**: `MIGRATION_REMOVAL_INSTRUCTIONS.md`
- **Action**: Delete this file after cleanup is complete

## Migration Context
This migration was created to handle the change from raw GitHub user IDs (e.g., `"12345678"`) to prefixed format (e.g., `"/github/12345678"`) in the KV store. The migration:

1. Checked if user ID already had the `/github/` prefix
2. If not, migrated settings and API keys from old format to new format
3. **Properly handled encryption**: Decrypted data with old user key, re-encrypted with new user key
4. Cleaned up old data after successful migration
5. Ran during user authentication to ensure seamless transition

**Critical**: This migration properly handles the encryption key derivation which is based on the user ID. Simply copying encrypted data would not work since the encryption key changes with the user ID format.

## Timing
Remove this migration code after:
- All active users have logged in at least once post-deployment
- Monitoring shows no more old-format user IDs in the logs
- At least 2-4 weeks have passed since deployment (recommended)

## Rollback Considerations
If rollback is needed:
1. Keep the migration code in place
2. Temporarily revert the user ID format change in `app/lib/auth.ts`
3. The migration will work in reverse (new format → old format)