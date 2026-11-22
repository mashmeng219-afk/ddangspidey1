# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Public Read-Only Visitors, Single-Admin Mutations**: Collections `works`, `characters`, `videos`, `songs`, and `links` are publicly readable (`get` and `list`) because this is a public creator archive without PII, while `create`, `update`, and `delete` strictly require `isAdmin()` (authenticated with `email_verified == true` and `email == 'choehyejeong219@gmail.com'`).
2. **Global Default-Deny Safety Net**: Any unspecified collection or path (including `/admins` or `/test`) is denied by default.
3. **Referential Integrity**: When creating or updating a `Character` with a non-empty `workId`, the referenced `/works/{workId}` document must exist (`exists()`).
4. **Immutable Ownership & Temporal Integrity**: `ownerId` must equal `request.auth.uid` on create and remain unchanged on update. `createdAt` must equal `request.time` on create and remain unchanged on update; `updatedAt` must equal `request.time` on both create and update.
5. **Bounded Payloads & Strict Keys**: Every collection validates required and allowed keys via `hasAll()` and `hasOnly()`, validates types and `.size()` bounds on all strings and lists, and prevents shadow fields.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Create on `/works/work_1`**: Visitor without auth tries to create a work -> `PERMISSION_DENIED`.
2. **Non-Admin Verified User Write on `/characters/char_1`**: Authenticated user whose email is `attacker@example.com` tries to create a character -> `PERMISSION_DENIED`.
3. **Unverified Admin Email Spoof**: Authenticated user with `email == 'choehyejeong219@gmail.com'` and `email_verified == false` tries to write `/links/notice` -> `PERMISSION_DENIED`.
4. **Self-Privilege Escalation**: Non-admin user tries to write `/admins/{uid}` with `{ role: 'admin' }` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: Admin sends `{ ...validWork, isFeaturedAdminBypass: true }` -> `PERMISSION_DENIED`.
6. **ID Poisoning Attack**: Admin tries to create `/works/invalid$id!with/slashes` or 500-char ID -> `PERMISSION_DENIED`.
7. **Orphaned Work Reference**: Admin creates a character with `workId: "non_existent_work_999"` -> `PERMISSION_DENIED`.
8. **Type / Size Exhaustion ("Denial of Wallet")**: Admin creates a song with `lyrics` > 15000 chars or `title` > 160 chars -> `PERMISSION_DENIED`.
9. **OwnerId Spoofing on Create**: Admin creates a video with `ownerId: "different_uid"` -> `PERMISSION_DENIED`.
10. **Immortal Field Tampering on Update**: Admin updates a character while altering `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
11. **Client-Forged Timestamp**: Admin creates a link with `createdAt` set to a past client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
12. **PII / Admin Registry Scraping**: Unauthenticated visitor or non-admin tries to `list` or `get` `/admins` -> `PERMISSION_DENIED`.
