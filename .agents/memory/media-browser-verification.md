---
name: Media browser verification
description: Distinguish unsupported browser codecs from missing or broken homepage media.
---

Check the test browser's codec support before attributing a blank MP4 player to serving or caching.

**Why:** The preview testing browser returned no support for H.264/AAC even though same-origin byte-range requests returned valid MP4 data and file inspection confirmed both video and audio tracks. Cache-busting did not repair that limitation.

**How to apply:** Compare `canPlayType` for the actual codec combination with the media response and stream metadata. Report unsupported test-browser playback as unverified rather than claiming broken media or confirmed audible playback. Published-device playback remains a separate check.