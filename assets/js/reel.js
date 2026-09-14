/* The hero reel and the per-card clips.
 *
 * Every view has a short recording of itself. The cards play theirs when they scroll into view;
 * the hero plays the same files as a playlist, one after another, with a caption under each.
 * Nothing is concatenated — the same six files serve both places.
 *
 * "Stills" is the second presentation of the same tour: the screenshots those clips were
 * recorded from, captioned, crossfading. Both are real product and the switch under the frame
 * chooses, because which one actually sells the app is worth answering by watching both.
 *
 * Progressive enhancement matters here more than usual: this is the front page of an app whose
 * pitch is that it sends nothing anywhere, so the page has to work with scripting off. It does —
 * every card video carries its screenshot as a poster, the first still is marked `on` in the
 * HTML with its caption already written, and everything below only ever adds behaviour.
 *
 * No build step, no dependencies, no network beyond the clips themselves.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ------------------------------------------------------------------ card clips

  /* A card's clip is fetched only once the card is near the viewport, and paused again when it
     leaves. Five autoplaying videos above the fold would cost several megabytes to show motion
     nobody has scrolled to yet. `preload="none"` in the markup is what makes that true — the
     poster is already on screen either way. */
  (function cardClips() {
    var vids = Array.prototype.slice.call(document.querySelectorAll(".card-vid"));
    if (!vids.length) return;
    if (reduced.matches || !("IntersectionObserver" in window)) return; // posters only

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (v.preload === "none") v.preload = "auto";
          var p = v.play();
          if (p && p.catch) p.catch(function () { /* autoplay refused; the poster stands */ });
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: "200px 0px" });

    vids.forEach(function (v) { io.observe(v); });
  })();

  // ------------------------------------------------------------------ the hero

  var stills = Array.prototype.slice.call(
    document.querySelectorAll("#reel-stills .reel-still")
  );
  if (stills.length < 2) return;

  var video = document.getElementById("reel-video");
  var caption = document.getElementById("reel-caption");
  var switcher = document.getElementById("reel-switch");
  var dotsBox = document.getElementById("reel-dots");

  var HOLD_MS = 2600;
  var FADE_MS = 420; // must match .reel-still's transition in site.css
  var index = 0;
  var timer = null;
  var mode = "stills";

  function captionFor(i) {
    caption.innerHTML = "";
    var b = document.createElement("b");
    b.textContent = stills[i].getAttribute("data-cap") || "";
    var s = document.createElement("span");
    s.textContent = stills[i].getAttribute("data-sub") || "";
    caption.appendChild(b);
    caption.appendChild(s);
    Array.prototype.forEach.call(dotsBox.children, function (d, n) {
      d.setAttribute("aria-current", n === i ? "true" : "false");
    });
  }

  function show(next) {
    var outgoing = stills[index];
    index = (next + stills.length) % stills.length;
    stills.forEach(function (img, i) { img.classList.toggle("on", i === index); });
    // Hold the frame we are leaving underneath the one arriving, so the dissolve never shows the
    // black behind them both. Dropped once the incoming image is fully opaque.
    if (outgoing && outgoing !== stills[index]) {
      outgoing.classList.add("prev");
      window.setTimeout(function () { outgoing.classList.remove("prev"); }, FADE_MS);
    }
    captionFor(index);
  }

  function play() {
    stop();
    // Someone who has asked for reduced motion gets the dots and no auto-advance: a slideshow
    // that moves on its own is exactly what that setting is about.
    if (reduced.matches) return;
    timer = window.setInterval(function () { show(index + 1); }, HOLD_MS);
  }

  function stop() {
    if (timer !== null) { window.clearInterval(timer); timer = null; }
  }

  stills.forEach(function (_, i) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", "Show screen " + (i + 1) + " of " + stills.length);
    dot.addEventListener("click", function () {
      if (mode === "video") { playClip(i); } else { show(i); stop(); }
    });
    dotsBox.appendChild(dot);
  });
  dotsBox.hidden = false;

  var frame = document.getElementById("reel");
  frame.addEventListener("mouseenter", function () { if (mode === "stills") stop(); });
  frame.addEventListener("mouseleave", function () { if (mode === "stills") play(); });

  // ------------------------------------------------------------------ video playlist

  /* The hero plays the per-view clips in the order the stills are in, advancing on `ended`, so
     the two modes tell the same story in the same sequence and there is one list to maintain. */
  function clipName(i) { return stills[i].getAttribute("data-clip"); }

  function playClip(i) {
    index = (i + stills.length) % stills.length;
    var name = clipName(index);
    video.innerHTML = "";
    [["webm", "video/webm"], ["mp4", "video/mp4"]].forEach(function (kind) {
      var src = document.createElement("source");
      src.src = "assets/video/" + name + "." + kind[0];
      src.type = kind[1];
      video.appendChild(src);
    });
    video.poster = "assets/shots/" + name + ".webp";
    video.load();
    captionFor(index);
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        // Autoplay refused (some mobile power-saving modes do). A controls-free frame would then
        // sit on its poster forever, which reads as broken — fall back to the stills rather than
        // leave a dead rectangle.
        setMode("stills");
        syncButtons();
      });
    }
  }

  if (video) {
    video.addEventListener("ended", function () {
      if (mode === "video") playClip(index + 1);
    });
  }

  function setMode(next) {
    mode = next;
    var isVideo = next === "video";
    if (video) {
      video.hidden = !isVideo;
      if (isVideo) { playClip(index); } else { video.pause(); }
    }
    document.getElementById("reel-stills").hidden = isVideo;
    if (isVideo) stop(); else play();
  }

  function syncButtons() {
    if (!switcher) return;
    Array.prototype.forEach.call(switcher.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-mode") === mode ? "true" : "false");
    });
  }

  /* Whether there are clips to play at all is decided by asking for one, not by assuming. The
     recordings are absent until someone makes them on a real device, and a Video button that
     switches to a blank frame is worse than no Video button. HEAD rather than loading the file:
     the check must not cost the visitor a download it may then throw away. */
  function probeVideo() {
    if (!video || !switcher) return;
    fetch("assets/video/" + clipName(0) + ".mp4", { method: "HEAD" })
      .then(function (r) {
        if (!r.ok) throw new Error("no clips");
        switcher.hidden = false;
        if (reduced.matches) return; // offer the switch, but do not start moving unasked
        setMode("video");
        syncButtons();
      })
      .catch(function () {
        /* No recordings yet. The stills are the whole tour and the switch stays hidden. */
      });
  }

  if (switcher) {
    switcher.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-mode]");
      if (!btn) return;
      setMode(btn.getAttribute("data-mode"));
      syncButtons();
    });
  }

  show(0);
  play();
  probeVideo();
})();
