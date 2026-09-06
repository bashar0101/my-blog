// Lightweight i18n for static chrome strings (nav, headings, buttons, footer).
// Works with the dc-runtime's async re-renders via MutationObserver — translations
// are re-applied after every DOM mutation, and writes are skipped once text already
// matches the target language so the observer loop settles instead of spinning.
(function () {
  "use strict";

  var STORAGE_KEY = "lang";

  var DICT = {
    en: {
      "nav.home": "Home",
      "nav.projects": "Projects",
      "nav.articles": "Articles",
      "nav.videos": "Videos",
      "nav.downloadCV": "Download CV",
      "hero.viewProjects": "View projects",
      "hero.contactMe": "Contact me",
      "about.heading": "About",
      "featured.heading": "Featured projects",
      "featured.viewAll": "All projects →",
      "latest.heading": "Latest articles",
      "latest.viewAll": "All articles →",
      "videosHome.heading": "Videos",
      "videosHome.viewAll": "All videos →",
      "skills.heading": "Skills",
      "skills.backend": "Backend",
      "skills.frontend": "Frontend",
      "skills.tools": "Tools",
      "contact.heading": "Contact",
      "contact.name": "Name",
      "contact.email": "Email",
      "contact.message": "Message",
      "contact.send": "Send message",
      "articles.kicker": "Writing",
      "articles.title": "Articles",
      "articleCard.read": "Read →",
      "projects.kicker": "Portfolio",
      "projects.title": "Projects",
      "projects.caseStudy": "Case study →",
      "videos.kicker": "Watch",
      "videos.title": "Videos",
      "article.back": "← All articles",
      "article.moreArticles": "More articles →"
    },
    tr: {
      "nav.home": "Ana Sayfa",
      "nav.projects": "Projeler",
      "nav.articles": "Makaleler",
      "nav.videos": "Videolar",
      "nav.downloadCV": "CV İndir",
      "hero.viewProjects": "Projeleri görüntüle",
      "hero.contactMe": "Bana ulaşın",
      "about.heading": "Hakkımda",
      "featured.heading": "Öne çıkan projeler",
      "featured.viewAll": "Tüm projeler →",
      "latest.heading": "Son makaleler",
      "latest.viewAll": "Tüm makaleler →",
      "videosHome.heading": "Videolar",
      "videosHome.viewAll": "Tüm videolar →",
      "skills.heading": "Yetenekler",
      "skills.backend": "Backend",
      "skills.frontend": "Frontend",
      "skills.tools": "Araçlar",
      "contact.heading": "İletişim",
      "contact.name": "Ad",
      "contact.email": "E-posta",
      "contact.message": "Mesaj",
      "contact.send": "Mesaj gönder",
      "articles.kicker": "Yazılar",
      "articles.title": "Makaleler",
      "articleCard.read": "Oku →",
      "projects.kicker": "Portföy",
      "projects.title": "Projeler",
      "projects.caseStudy": "Vaka incelemesi →",
      "videos.kicker": "İzle",
      "videos.title": "Videolar",
      "article.back": "← Tüm makaleler",
      "article.moreArticles": "Diğer makaleler →"
    },
    ar: {
      "nav.home": "الرئيسية",
      "nav.projects": "المشاريع",
      "nav.articles": "المقالات",
      "nav.videos": "الفيديوهات",
      "nav.downloadCV": "تحميل السيرة الذاتية",
      "hero.viewProjects": "عرض المشاريع",
      "hero.contactMe": "تواصل معي",
      "about.heading": "نبذة عني",
      "featured.heading": "مشاريع مميزة",
      "featured.viewAll": "كل المشاريع ←",
      "latest.heading": "أحدث المقالات",
      "latest.viewAll": "كل المقالات ←",
      "videosHome.heading": "الفيديوهات",
      "videosHome.viewAll": "كل الفيديوهات ←",
      "skills.heading": "المهارات",
      "skills.backend": "الواجهة الخلفية",
      "skills.frontend": "الواجهة الأمامية",
      "skills.tools": "الأدوات",
      "contact.heading": "تواصل",
      "contact.name": "الاسم",
      "contact.email": "البريد الإلكتروني",
      "contact.message": "الرسالة",
      "contact.send": "إرسال الرسالة",
      "articles.kicker": "الكتابة",
      "articles.title": "المقالات",
      "articleCard.read": "اقرأ ←",
      "projects.kicker": "الأعمال",
      "projects.title": "المشاريع",
      "projects.caseStudy": "دراسة الحالة ←",
      "videos.kicker": "شاهد",
      "videos.title": "الفيديوهات",
      "article.back": "→ كل المقالات",
      "article.moreArticles": "المزيد من المقالات ←"
    }
  };

  function getLang() {
    var saved = localStorage.getItem(STORAGE_KEY);
    return DICT[saved] ? saved : "en";
  }

  function applyLang(lang) {
    var dict = DICT[lang] || DICT.en;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var text = dict[key];
      if (text != null && el.textContent !== text) el.textContent = text;
    });

    document.querySelectorAll("[data-lang]").forEach(function (el) {
      var active = el.getAttribute("data-lang") === lang;
      el.style.color = active ? "var(--color-accent-700)" : "var(--color-neutral-600)";
      if (active) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    });
  }

  function setLang(lang) {
    if (!DICT[lang]) return;
    localStorage.setItem(STORAGE_KEY, lang);
    applyLang(lang);
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-lang]");
    if (!trigger) return;
    e.preventDefault();
    setLang(trigger.getAttribute("data-lang"));
  });

  var observer = new MutationObserver(function () {
    applyLang(getLang());
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  applyLang(getLang());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { applyLang(getLang()); });
  }
  window.addEventListener("load", function () { applyLang(getLang()); });
})();
