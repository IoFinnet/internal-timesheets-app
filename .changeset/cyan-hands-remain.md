---
"io-timesheets-app": patch
---

Modify `TimestampSchema` so that it doesn't crash when receiving an input like
`{ date: '2022-10-01' }`
