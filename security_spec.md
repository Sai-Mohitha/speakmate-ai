# SpeakMate AI Firestore Security Specification

## 1. Data Invariants
- Every user profile document at `/users/{userId}` contains PII (`email`) and may only be read, created, or updated by the authenticated, email-verified owner (`request.auth.uid == userId`).
- Subcollections (`practiceSessions`, `mentorshipBookings`, `chatMessages`) enforce the Master Gate: the parent `/users/{userId}` document must exist and belong to `request.auth.uid`.
- All document IDs are strictly validated via `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars) on single-document operations.
- Every string and array enforces explicit `.size()` bounds.
- `createdAt` and `updatedAt` timestamps must match server `request.time`; `uid`, `userId`, and `createdAt` are immutable once created.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Profile Read:** Anonymous client attempts `GET /users/victimUid`.
2. **Cross-User PII Read:** Authenticated `userA` attempts `GET /users/userB`.
3. **Unverified Email Write:** Authenticated user with `email_verified: false` attempts `CREATE /users/userA`.
4. **Shadow Ghost Field Injection:** Owner sends `{ ...validProfile, isAdmin: true }` on create.
5. **Identity Spoofing on Create:** `userA` creates `/users/userA/practiceSessions/s1` with `userId: "userB"`.
6. **Oversized ID Poisoning:** `userA` writes to `/users/userA/practiceSessions/<200-char-id>` or special chars `../admin`.
7. **Denial-of-Wallet String Overflow:** `userA` writes a 100KB `sessionPurpose` string to `mentorshipBookings`.
8. **Unbounded Array Flood:** `userA` submits 25 `communicationGoals` entries (limit is 10).
9. **Client Timestamp Forgery:** `userA` creates a `practiceSession` with `createdAt` set to a past client timestamp instead of `request.time`.
10. **Immutable Field Mutation:** `userA` updates `/users/userA` attempting to alter `uid` or `createdAt`.
11. **Orphaned Subcollection Write:** `userA` attempts to create a `practiceSession` before parent `/users/userA` exists.
12. **Blanket Collection Scraping:** `userA` attempts to `LIST /users/userB/practiceSessions` or `LIST /users`.
