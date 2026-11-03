## ZionWorx

![ZionWorx](images/zionworx.png)

Controls ZionWorx 5 (Jubilate Software) over its control API on your local network: slides, playlist items, the
output mode (Logo, Blank, Hide Text, Go Live), the camera background, media and volume. Buttons light up from what
ZionWorx is showing, and they can show the live title, slide, times and more.

### Setting up ZionWorx

1. In ZionWorx, open **Web Remote** and tick **Active**. The window shows the PC's address and the port (normally
   7650).
2. Click **Add API Client…**, give it a name (for example "Companion") and copy the token. It is shown only once.
3. In Companion, add a **Jubilate Software: ZionWorx** connection and enter the PC's address, the port and the token.
   Use `127.0.0.1` when Companion runs on the ZionWorx PC.

The connection turns green within a few seconds. If ZionWorx is closed or the Web Remote is switched off, it goes red
and reconnects by itself when ZionWorx is back.

To stop Companion controlling ZionWorx, remove the API client in the Web Remote window. The connection then shows
"This API client was removed in ZionWorx".

### Presets

The quickest start: drag buttons from **Presets → ZionWorx**.

- **Slides**: previous / next, the live slide ("3/9" and the song section), slides 1-10 (lit while live), and
  Auto-advance (an image show's or timed PowerPoint's slide timer, lit while running).
- **Playlist items**: previous / next, the live and next titles, and items 1-20 showing their titles (lit while
  live, greyed out when the item is unavailable).
- **Output**: Logo, Blank, Hide Text and Go Live, lit while showing, and the camera background.
- **Media**: Play / Pause with the time left (lit while playing), Restart, Rewind, Forward, and a time display.
  They work on a video or audio item, and on the audio attached to any item (a song's backing track, an image
  show's soundtrack).
- **Volume**: a dial for surfaces with encoders (turn for volume, push to mute), volume up / down and mute.
- **Clocks and status**: countdown, time since the item went live, playlist title, output mode and alerts.

A button greys out when its control makes no sense for what is live (no slides, nothing to play…) or while ZionWorx
is not connected.

### Actions

| Action            | Does                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slide             | Next, previous, or a slide number (from 1) of the live item                                                                                                                                                 |
| Playlist item     | Next, previous, or an item number (from 1) goes live. Next with nothing live: the first item. Next and previous skip unavailable items (song or file missing, greyed out in ZionWorx's playlist)            |
| Output mode       | Logo, Blank, Hide Text or Go Live. It **sets** the mode: pressing again does nothing, so a button never toggles back                                                                                        |
| Camera background | On or off                                                                                                                                                                                                   |
| Media transport   | Play / Pause, Restart, Rewind, Forward on the live item's media: a video or audio item's own, else the audio attached to the item (a song's backing track)                                                  |
| Volume            | Up / down in steps of 5 %, or set to a percentage, as the volume bar in ZionWorx (saved with the item): the attached audio's where the item has some, else a video or audio item's own. Changing it unmutes |
| Mute              | Toggle, mute or unmute the same audio. Not saved: the next item starts unmuted                                                                                                                              |
| Auto-advance      | Play / Pause, Play or Pause the live item's slide timer: an image show with Auto Advance on, a PowerPoint using its slide timings. Separate from its media, so pictures and soundtrack can be paused apart  |

Older ZionWorx builds (Beta 6 and earlier) control a video or audio item only, and answer the Auto-advance action
with "too old".

Slide and item numbers, and the volume, accept a variable: switch the field to an expression.

When ZionWorx refuses a command (no such slide, nothing to play, the live item changed on the way), it is noted in the
connection's log; the button does nothing.

### Feedbacks

| Feedback                                | True when                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Output mode is…                         | The mode is showing                                                                                      |
| Camera background is on                 |                                                                                                          |
| Playlist item is live                   | Item _n_ is live                                                                                         |
| Playlist item is unavailable (grey out) | Item _n_ can't go live (its song or file is missing), there is no item _n_, or ZionWorx is not connected |
| Slide is live                           | Slide _n_ of the live item is showing                                                                    |
| Media is playing                        | The live item's media (as Media transport picks it) is playing                                           |
| Media is muted                          | The live item's audio (as Volume picks it) is muted                                                      |
| Auto-advance is running                 | The live item's slide timer is running                                                                   |
| Attached audio is playing               | The live item's attached audio is playing                                                                |
| Alert is showing                        | The main or stage alert is fading in, showing or fading out                                              |
| Control is unavailable (grey out)       | The control makes no sense for the live item now, or ZionWorx is not connected                           |

### Variables

| Variable                                                                                                   | Value                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `playlist_title`, `playlist_count`                                                                         | The playlist                                                                          |
| `live_item`, `live_title`, `live_type`                                                                     | The live item (number from 1, 0 = none)                                               |
| `live_slide`, `live_slides`, `live_slide_of`                                                               | The live slide, the slide count, and both as "3/9"                                    |
| `live_label`                                                                                               | The song section on screen ("V1", "C")                                                |
| `mode`, `mode_label`                                                                                       | The output mode (`goLive`, "Go Live")                                                 |
| `camera`                                                                                                   | Camera background on                                                                  |
| `next_item`, `next_title`, `next_type`                                                                     | The item Next would put live                                                          |
| `item_1_title`, `item_2_title`, …                                                                          | Every playlist item's title                                                           |
| `media_playing`, `media_position`, `media_remaining`, `media_duration`, `media_remaining_s`                | The live item's media, as Media transport picks it (mm:ss; time left also in seconds) |
| `volume`, `volume_text`, `muted`                                                                           | The volume the Volume action sets, as "55%" or "Muted", and mute                      |
| `attached_playing`, `attached_position`, `attached_remaining`, `attached_duration`, `attached_remaining_s` | The attached audio alone (empty when none): for a video with attached audio           |
| `auto_advancing`                                                                                           | The slide timer is running                                                            |
| `elapsed`, `elapsed_s`                                                                                     | Time since the item went live                                                         |
| `countdown`, `countdown_s`, `countdown_running`                                                            | The live countdown (empty when none)                                                  |
| `alert_main`, `alert_stage`                                                                                | `off`, `fadingIn`, `live` or `fadingOut`                                              |

Use them in button text, for example `$(zionworx:live_title)`, with your connection's name in place of `zionworx`.
The times count every second without extra traffic to ZionWorx.

### Troubleshooting

- **Red, "not reachable"**: check the address and port, that the Web Remote is Active, and that Windows Firewall on
  the ZionWorx PC allows ZionWorx on private networks. The PC and Companion must be on the same network.
- **"ZionWorx does not know this token"**: the token was mistyped or the API client was removed; add a new one.
- **"Too many bad tokens"**: ten wrong tokens within a minute shut this address out for a minute.
- **A command is "too old for that command"**: update ZionWorx; that command needs a newer version.
