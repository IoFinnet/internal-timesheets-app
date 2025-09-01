# io-timesheets-app

## 0.2.1

### Patch Changes

- b2ac7fc: Include tray icon in bundle

## 0.2.0

### Minor Changes

- 7e8d8ac: Minimize to system tray

## 0.1.0

### Minor Changes

- 222fdd3: Added day-off compatibility

### Patch Changes

- 37baab4: Improved `TimestampSchema`
- 38712b4: Ensure DB entry is deleted when using delete timesheets button
- de36dc6: Fixed bug where the UI would not render until the window had lost and
  regained focus once

## 0.0.10

### Patch Changes

- f3d57d6: Ensure old recurring events that mess up the data are not returned by
  the Google Calendar API

## 0.0.9

### Patch Changes

- f74325a: Generate timesheets only for the last 5 days
- f74325a: Button to generate timesheets for a selected date range

## 0.0.8

### Patch Changes

- 22c901e: Fix `isOneOnOne` check

## 0.0.7

### Patch Changes

- ccc19fc: Fix TS error around `TimestampSchema`

## 0.0.6

### Patch Changes

- 9051818: Modify `TimestampSchema` so that it doesn't crash when receiving an
  input like `{ date: '2022-10-01' }`

## 0.0.5

### Patch Changes

- 80a443b: Wrapped object in `JSON.stringify()` when throwing "invalid
  timestamp"

## 0.0.4

### Patch Changes

- c56d7f8: Minor UI improvements
- 820d6c3: Added update check

## 0.0.3

### Patch Changes

- a4e412e: Fix Tauri plugin mismatch
- f6dd6ca: Added updater plugin

## 0.0.2

### Patch Changes

- a630a1c: Upgraded dependencies
- d7ce985: Passed migrations to Tauri's SQL plugin

## 0.0.1

### Patch Changes

- dacf67b: First try building the app
