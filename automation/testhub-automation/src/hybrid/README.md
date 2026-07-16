# `hybrid/` — API-assisted UI tests

A **hybrid** test combines two layers in one flow:

1. Use the fast **API** (`ApiClient`) to reach the state it needs — register a
   user, seed a couple of projects — in milliseconds, no clicking.
2. Inject that session into the browser and switch to the **UI** to prove the
   screen reflects that state.

It's the shortcut for verifying a screen that would normally take many clicks to
reach. Think of it as: **set up over the API, assert through the browser.**

| Test | What it proves |
|---|---|
| `ApiLoginDashboardTest` | API-registered user + API-seeded projects show up on the real dashboard |
| `ApiLoginExistingUserTest` | Standing tester logs in over the API; an API-seeded project is visible in the Projects UI |

This is the **only** place the API and the browser meet in one test. Pure-API
tests live in `api/`; pure-UI tests live in `ui/`.
