# Unsaid

> Thought Catcher backend platform — Realtime sync, Groq Cloud AI enrichment, Firestore zero-trust security rules, and RevenueCat subscription lifecycle management.

---

## Repository Structure

```
Unsaid/
├── README.md
├── .gitignore
│
└── backend/
    ├── README.md              # Backend overview & local quickstart
    ├── BACKEND_SETUP.md       # Setup & deployment guide
    ├── SECURITY.md            # Security architecture & policies
    ├── API.md                 # API specification
    ├── firebase.json          # Firebase Emulator & deploy config
    ├── .firebaserc            # Firebase project configuration
    ├── firestore.rules        # Cloud Firestore security rules
    ├── firestore.indexes.json # Composite indexes
    ├── package.json           # Backend scripts & tooling
    │
    ├── functions/             # Cloud Functions v2 (TypeScript)
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/               # Application logic, services, triggers, tests
    │
    ├── emulator/              # Local Firebase Emulator seed data
    └── scripts/               # Verification & test automation scripts
```

For complete setup and local development instructions, see [backend/README.md](./backend/README.md) and [backend/BACKEND_SETUP.md](./backend/BACKEND_SETUP.md).
