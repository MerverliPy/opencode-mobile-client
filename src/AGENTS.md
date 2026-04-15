# Product Runtime Rules

## Scope

These instructions apply to product code under `src/`.

## Runtime rules

- preserve iPhone-first behavior
- preserve narrow-screen readability
- do not imply live backend capability unless the active phase explicitly adds it
- prefer small focused modules over one large file
- preserve interaction continuity for sessions, tool surfaces, and composer behavior
- preserve honest offline and install messaging
- avoid hidden architectural expansion

## Change discipline

- make the smallest useful code change
- avoid unrelated refactors
- keep names explicit and readable
- preserve current user-visible behavior unless the active phase requires behavior change
