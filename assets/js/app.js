/* ============================================================
   PRIME FACE — interactions (vanilla JS, no dependencies)
   ============================================================ */
(function () {
  "use strict";
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     >>> WHERE SUBMISSIONS GO <<<
     Paste an endpoint below to switch the form on.
     Empty string = DEMO mode (nothing is sent; the entry is saved
     to localStorage and logged to the browser console for testing).
     See FORM-SETUP.md for the three one-minute options.
     ---------------------------------------------------------- */
  var FORM_ENDPOINT = "";

  /* Downscale + base64-encode an image (used by the Google Sheets option,
     which receives JSON rather than multipart form data). */
  function compressImage(file, maxDim) {
    maxDim = maxDim || 1400;
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var data = c.toDataURL("image/jpeg", 0.82).split(",")[1];
        URL.revokeObjectURL(url);
        resolve({ name: file.name, data: data });
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve({ name: file.name, data: "" }); };
      img.src = url;
    });
  }

  /* ---------- preloader ---------- */
  window.addEventListener("load", function () {
    setTimeout(function () { document.body.classList.add("is-loaded"); }, reduced ? 0 : 850);
  });
  setTimeout(function () { document.body.classList.add("is-loaded"); }, 3000); // safety

  /* ---------- sticky nav ---------- */
  var nav = $(".nav");
  var onScroll = function () {
    if (window.scrollY > 24) { nav.classList.add("is-scrolled"); }
    else { nav.classList.remove("is-scrolled"); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- fullscreen menu ---------- */
  var burger = $(".burger");
  var menuLinks = $$(".menu a");
  var setMenu = function (open) {
    document.body.classList.toggle("menu-open", open);
    document.body.classList.toggle("is-locked", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  };
  burger.addEventListener("click", function () {
    setMenu(!document.body.classList.contains("menu-open"));
  });
  menuLinks.forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
  });

  /* ---------- hero parallax ---------- */
  var heroImg = $(".hero__media img");
  if (heroImg && !reduced && window.matchMedia("(min-width:860px)").matches) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, window.innerHeight);
        heroImg.style.transform = "translate3d(0," + (y * 0.13).toFixed(1) + "px,0) scale(1.06)";
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- reveal on scroll ---------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("is-in"); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach(function (el, i) {
    el.style.transitionDelay = Math.min(i % 6, 5) * 70 + "ms";
    revealIO.observe(el);
  });

  /* roster cards stagger */
  var cardIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en, i) {
      if (en.isIntersecting) {
        var el = en.target;
        setTimeout(function () { el.classList.add("is-in"); }, reduced ? 0 : i * 80);
        cardIO.unobserve(el);
      }
    });
  }, { threshold: 0.1 });
  $$(".card").forEach(function (c) { cardIO.observe(c); });

  /* ---------- stat counters ---------- */
  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      countIO.unobserve(el);
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = reduced ? 0 : 1500;
      var start = performance.now();
      var step = function (now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      if (dur === 0) { el.textContent = target + suffix; } else { requestAnimationFrame(step); }
    });
  }, { threshold: 0.5 });
  $$("[data-count]").forEach(function (el) { countIO.observe(el); });

  /* ---------- roster filtering ---------- */
  var chips = $$(".chip");
  var cards = $$(".card");
  var roster = $(".roster");
  var emptyMsg = $(".roster-empty");
  var visible = function () { return cards.filter(function (c) { return !c.hidden; }); };

  function filterBy(key) {
    cards.forEach(function (c) {
      var match = key === "all" || c.getAttribute("data-division") === key;
      c.hidden = !match;
      if (match) { c.classList.remove("is-in"); requestAnimationFrame(function () { c.classList.add("is-in"); }); }
    });
    if (emptyMsg) emptyMsg.hidden = visible().length > 0;
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-active"); c.setAttribute("aria-selected", "false"); });
      chip.classList.add("is-active");
      chip.setAttribute("aria-selected", "true");
      filterBy(chip.getAttribute("data-filter"));
    });
  });

  /* ---------- desktop cursor badge ---------- */
  var badge = $(".cursor-badge");
  if (badge && window.matchMedia("(hover:hover) and (min-width:900px)").matches) {
    var bx = 0, by = 0, raf = null;
    roster.addEventListener("mousemove", function (e) {
      bx = e.clientX; by = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(function () {
          badge.style.transform = "translate(" + bx + "px," + by + "px) translate(-50%,-50%) scale(1)";
          raf = null;
        });
      }
    });
    cards.forEach(function (c) {
      c.addEventListener("mouseenter", function () { badge.classList.add("is-on"); });
      c.addEventListener("mouseleave", function () { badge.classList.remove("is-on"); });
    });
  }

  /* ---------- model sheet ---------- */
  var sheet = $("#sheet");
  var panel = $(".sheet__panel");
  var lastFocus = null;
  var currentIdx = -1;

  function fill(card) {
    var d = JSON.parse(card.getAttribute("data-model"));
    var img = card.querySelector("img");
    var full = img.getAttribute("data-full") || img.currentSrc || img.src;
    $("#sheet-img").src = full;
    $("#sheet-img").alt = d.name;
    $("#sheet-name").textContent = d.name;
    $("#sheet-division").textContent = d.division + " — " + d.city;
    $("#sheet-bio").textContent = d.bio;
    var specs = $("#sheet-specs");
    specs.innerHTML = "";
    Object.keys(d.specs).forEach(function (k) {
      var row = document.createElement("div");
      row.innerHTML = '<span class="k">' + k + '</span><span class="v">' + d.specs[k] + "</span>";
      specs.appendChild(row);
    });
    $("#sheet-book").setAttribute("href", "mailto:info@theprimefacemodels.com?subject=Booking%20enquiry%20%E2%80%94%20" + encodeURIComponent(d.name));
  }

  function openSheet(card) {
    fill(card);
    lastFocus = document.activeElement;
    currentIdx = visible().indexOf(card);
    sheet.classList.add("is-open");
    document.body.classList.add("is-locked");
    sheet.setAttribute("aria-hidden", "false");
    setTimeout(function () { $(".sheet__close").focus(); }, reduced ? 0 : 420);
  }
  function closeSheet() {
    sheet.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    sheet.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }
  function step(dir) {
    var v = visible();
    if (!v.length) return;
    currentIdx = (currentIdx + dir + v.length) % v.length;
    fill(v[currentIdx]);
  }

  cards.forEach(function (c) {
    c.setAttribute("tabindex", "0");
    c.setAttribute("role", "button");
    c.addEventListener("click", function () { openSheet(c); });
    c.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(c); }
    });
  });
  $(".sheet__close").addEventListener("click", closeSheet);
  $(".sheet__bd").addEventListener("click", closeSheet);
  $("#sheet-prev").addEventListener("click", function () { step(-1); });
  $("#sheet-next").addEventListener("click", function () { step(1); });
  document.addEventListener("keydown", function (e) {
    if (!sheet.classList.contains("is-open")) return;
    if (e.key === "Escape") closeSheet();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
    if (e.key === "Tab") {
      var f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', panel);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- scroll rails + dots ---------- */
  $$(".rail, .quotes").forEach(function (rail) {
    var items = $$(":scope > *", rail);
    if (items.length < 2) return;
    var dotWrap = document.createElement("div");
    dotWrap.className = "rail-dots";
    var dots = items.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Go to item " + (i + 1));
      b.addEventListener("click", function () {
        rail.scrollTo({ left: items[i].offsetLeft - rail.offsetLeft, behavior: reduced ? "auto" : "smooth" });
      });
      dotWrap.appendChild(b);
      return b;
    });
    rail.parentNode.insertBefore(dotWrap, rail.nextSibling);
    var upd = function () {
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var best = 0, bestD = Infinity;
      items.forEach(function (it, i) {
        var c = it.offsetLeft - rail.offsetLeft + it.offsetWidth / 2;
        var d = Math.abs(c - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === best); });
    };
    rail.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  });

  /* ---------- application form ---------- */
  var form = $("#apply-form");
  if (form) {
    var validate = function (field) {
      var wrap = field.closest(".field");
      var ok = true;
      if (field.type === "checkbox") { ok = field.checked; }
      else if (field.hasAttribute("required") && !field.value.trim()) { ok = false; }
      else if (field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(field.value)) { ok = false; }
      if (!field.hasAttribute("required") && !field.value.trim() && field.type !== "checkbox") ok = true;
      wrap.classList.toggle("has-error", !ok);
      return ok;
    };
    $$("input,select,textarea", form).forEach(function (f) {
      f.addEventListener("blur", function () { if (f.closest(".field")) validate(f); });
      f.addEventListener("input", function () {
        var w = f.closest(".field");
        if (w && w.classList.contains("has-error")) validate(f);
      });
    });

    var drop = $(".drop");
    var fileInput = $("#photos");
    var previews = $(".previews");
    var chosen = [];
    function renderPreviews() {
      previews.innerHTML = "";
      chosen.forEach(function (file, i) {
        var fig = document.createElement("figure");
        var img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        var rm = document.createElement("button");
        rm.type = "button";
        rm.innerHTML = "&times;";
        rm.setAttribute("aria-label", "Remove " + file.name);
        rm.addEventListener("click", function () {
          chosen.splice(i, 1);
          renderPreviews();
        });
        fig.appendChild(img);
        fig.appendChild(rm);
        previews.appendChild(fig);
      });
    }
    fileInput.addEventListener("change", function () {
      Array.prototype.forEach.call(fileInput.files, function (f) { if (f.type.indexOf("image") === 0) chosen.push(f); });
      renderPreviews();
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) {
        Array.prototype.forEach.call(e.dataTransfer.files, function (f) { if (f.type.indexOf("image") === 0) chosen.push(f); });
        renderPreviews();
      }
    });

    var submitBtn = $("button[type=submit]", form);
    var errBox = $("#form-error");
    var btnLabel = submitBtn.innerHTML;

    function setLoading(on) {
      submitBtn.classList.toggle("is-loading", on);
      submitBtn.innerHTML = on ? "Sending…" : btnLabel;
    }
    function showError(msg) {
      if (!errBox) return;
      errBox.textContent = msg;
      errBox.hidden = !msg;
    }
    function succeed(name) {
      $("#success-name").textContent = name;
      form.style.display = "none";
      var s = $(".success");
      s.classList.add("is-on");
      s.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showError("");
      var fields = $$("input[required],select[required],textarea[required]", form);
      var firstBad = null;
      fields.forEach(function (f) { if (!validate(f) && !firstBad) firstBad = f; });
      if (firstBad) {
        firstBad.focus();
        firstBad.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        return;
      }

      var data = new FormData(form);
      var entry = {
        at: new Date().toISOString(),
        name: (data.get("first") || "") + " " + (data.get("last") || ""),
        email: data.get("email") || "",
        phone: data.get("phone") || "",
        city: data.get("city") || "",
        division: data.get("division") || "",
        height: data.get("height") || "",
        instagram: data.get("instagram") || "",
        about: data.get("about") || "",
        photos: chosen.map(function (f) { return f.name; })
      };
      var first = (data.get("first") || "").trim().split(" ")[0] || "friend";

      /* ---- No endpoint configured yet: hand the application over by email
             so nothing is ever silently lost while the backend is wired up ---- */
      if (!FORM_ENDPOINT) {
        try {
          var log = JSON.parse(localStorage.getItem("pf_submissions") || "[]");
          log.push(entry);
          localStorage.setItem("pf_submissions", JSON.stringify(log));
        } catch (err) { /* private mode */ }
        console.warn("[Prime Face] FORM_ENDPOINT is empty — falling back to email. See FORM-SETUP.md.");
        var lines = [
          "NEW MODEL APPLICATION",
          "",
          "Name: " + entry.name.trim(),
          "Email: " + entry.email,
          "Phone: " + entry.phone,
          "City: " + entry.city,
          "Division: " + entry.division,
          "Height: " + (entry.height ? entry.height + " cm" : ""),
          "Instagram: " + entry.instagram,
          "",
          "About: " + entry.about,
          "",
          "Digitals: " + (entry.photos.length
            ? entry.photos.join(", ") + " — ask the applicant to attach these"
            : "none uploaded")
        ].join("\n");
        window.location.href = "mailto:info@theprimefacemodels.com?subject=" +
          encodeURIComponent("New model application — " + entry.name.trim()) +
          "&body=" + encodeURIComponent(lines);
        var note = $("#success-note");
        if (note) {
          note.textContent = "We've opened your email app so your application reaches us directly — "
            + "please attach three digitals before sending. If nothing opened, email "
            + "info@theprimefacemodels.com.";
        }
        succeed(first);
        return;
      }

      /* ---- LIVE MODE ---- */
      setLoading(true);

      /* Google Apps Script receives JSON with the digitals base64-encoded. */
      if (FORM_ENDPOINT.indexOf("script.google.com") > -1) {
        Promise.all(chosen.map(compressImage))
          .then(function (files) {
            entry.photos = files.map(function (f) { return { name: f.name, data: f.data }; });
            return fetch(FORM_ENDPOINT, {
              method: "POST",
              body: JSON.stringify(entry),
              headers: { "Content-Type": "text/plain;charset=utf-8" }
            });
          })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            setLoading(false);
            if (d && d.result === "success") succeed(first);
            else showError((d && d.message) || "Submission failed — please email info@theprimefacemodels.com.");
          })
          .catch(function () {
            setLoading(false);
            showError("Could not reach the server. Please email info@theprimefacemodels.com.");
          });
        return;
      }

      /* Formspree / Web3Forms / Netlify: standard multipart POST */
      data.append("_subject", "New model application — " + entry.name.trim());
      data.append("_replyto", entry.email);
      fetch(FORM_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      }).then(function (r) {
        setLoading(false);
        if (r.ok) { succeed(first); }
        else {
          return r.json().then(function (d) {
            showError((d && (d.error || d.message)) || "Something went wrong. Please email info@theprimefacemodels.com instead.");
          }).catch(function () {
            showError("Something went wrong. Please email info@theprimefacemodels.com instead.");
          });
        }
      }).catch(function () {
        setLoading(false);
        showError("Network error — check your connection, or email info@theprimefacemodels.com.");
      });
    });
  }

  /* ---------- mobile sticky bar: hide over footer ---------- */
  var mcta = $(".mcta");
  var foot = $(".foot");
  if (mcta && foot) {
    var footIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { mcta.classList.toggle("is-hidden", en.isIntersecting); });
    }, { threshold: 0.08 });
    footIO.observe(foot);
  }

  /* ---------- footer year ---------- */
  var y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
