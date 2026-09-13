/* The hero reel: one phone frame, two presentations of the same tour.
 *
 * "Video" is a recorded run of the app on the phone; "Stills" is the captured screens with
 * captions. Both are real product, neither is a fallback for the other — which of the two
 * actually sells the app is a question worth answering by watching both, so the switch under
 * the frame is a feature rather than a debug aid.
 *
 * Progressive enhancement matters here more than usual: this is the front page of an app whose
 * pitch is that it sends nothing anywhere, so the page has to work with scripting off. It does —
 * the first still is marked `on` in the HTML with its caption already written, and everything
 * below only ever adds behaviour.
 *
 * No build step, no dependencies, no network.
 */
(function () {
  "use strict";

  var stills = Array.prototype.slice.call(
    document.querySelectorAll("#reel-stills .reel-still")
  );
  if (stills.length < 2) return;

  var video = document.getElementById("reel-video");
  var caption = document.getElementById("reel-caption");
  var switcher = document.getElementById("reel-switch");
  var dotsBox = document.getElementById("reel-dots");

  var HOLD_MS = 2600;
  var index = 0;
  var timer = null;
  var mode = "stills";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------------------------------------------------------------- stills

  function show(next) {
    index = (next + stills.length) % stills.length;
    stills.forEach(function (img, i) {
      img.classList.toggle("on", i === index);
    });
    var cur = stills[index];
    caption.innerHTML = "";
    var b = document.createElement("b");
    b.textContent = cur.getAttribute("data-cap") || "";
    var s = document.createElement("span");
    s.textContent = cur.getAttribute("data-sub") || "";
    caption.appendChild(b);
    caption.appendChild(s);
    Array.prototype.forEach.call(dotsBox.children, function (d, i) {
      d.setAttribute("aria-current", i === index ? "true" : "false");
    });
  }

  function play() {
    stop();
    // Someone who has asked for reduced motion gets the dots and no auto-advance: an
    // eleven-frame slideshow that moves on its own is exactly what that setting is about.
    if (reduced.matches) return;
    timer = window.setInterval(function () {
      show(index + 1);
    }, HOLD_MS);
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  stills.forEach(function (_, i) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", "Show screen " + (i + 1) + " of " + stills.length);
    dot.addEventListener("click", function () {
      show(i);
      stop(); // A deliberate pick stops the carousel; it is now the reader's, not the page's.
    });
    dotsBox.appendChild(dot);
  });
  dotsBox.hidden = false;

  // Pausing while the pointer is over the frame is the difference between a reel you can read
  // and one you have to chase.
  var frame = document.getElementById("reel");
  frame.addEventListener("mouseenter", stop);
  frame.addEventListener("mouseleave", function () {
    if (mode === "stills") play();
  });

  // ---------------------------------------------------------------- the two modes

  function setMode(next) {
    mode = next;
    var isVideo = next === "video";
    if (video) {
      video.hidden = !isVideo;
      if (isVideo) {
        video.play().catch(function () {
          /* Autoplay refused (some mobile power-saving modes do). The controls-free frame would
             then sit on its poster forever, which reads as broken — fall back to the stills
             rather than leave a dead rectangle. */
          setMode("stills");
          syncButtons();
        });
      } else {
        video.pause();
      }
    }
    document.getElementById("reel-stills").hidden = isVideo;
    dotsBox.hidden = isVideo;
    caption.hidden = isVideo;
    if (isVideo) stop(); else play();
  }

  function syncButtons() {
    if (!switcher) return;
    Array.prototype.forEach.call(switcher.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-mode") === mode ? "true" : "false");
    });
  }

  /* Whether there is a reel to show at all is decided by asking for it, not by assuming.
     `assets/video/sizzle.mp4` is absent until someone records one on a real device, and a Video
     button that switches to a blank frame is worse than no Video button. HEAD rather than
     loading the file: the check must not cost the visitor a multi-megabyte download it may
     then throw away. */
  function probeVideo() {
    if (!video || !switcher) return;
    var src = video.querySelector("source[type='video/mp4']");
    if (!src) return;
    fetch(src.getAttribute("src"), { method: "HEAD" })
      .then(function (r) {
        if (!r.ok) throw new Error("no reel");
        switcher.hidden = false;
        // The recording is the better pitch when it exists, so it becomes the default.
        video.preload = "metadata";
        setMode("video");
        syncButtons();
      })
      .catch(function () {
        /* No recording yet. The stills are the whole tour and the switch stays hidden. */
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
