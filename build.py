#!/usr/bin/env python3
"""Build the static site from _src/.

Edit _src/layout.html (shared head, header, footer, booking dialog, cookie banner)
or _src/views/<page>.html (page content), then run:  python3 build.py
Outputs: index.html, <page>/index.html, 404.html, sitemap.xml.
"""
import json, re, html, hashlib, pathlib
from datetime import date
from bs4 import BeautifulSoup  # pip install beautifulsoup4 lxml

ROOT = pathlib.Path(__file__).parent
SITE = "https://flowbuildr.co.uk"
DESC_HOME = ("FlowBuildr finds the job AI should do for your business, builds it in your format and keeps it running: "
             "a fixed-price audit, then builds and monthly support. Manchester, UK.")
PAGES = {
    "home":     ("/",          "FlowBuildr | AI that works while you work", DESC_HOME),
    "audit":    ("/audit/",    "The AI audit | FlowBuildr",
                 "One fixed-price session: we go through your week job by job, find the three uses of AI that would save you the most time, and give you a written plan and a fixed price for the first build."),
    "services": ("/services/", "What we build | FlowBuildr",
                 "Paperwork drafted for you, follow-ups on time, enquiries answered and sorted, your own AI workspace and websites that bring in work. Built on your own templates and tools."),
    "about":    ("/about/",    "About FlowBuildr | AI automation, Manchester",
                 "FlowBuildr is a Manchester company run by two partners, Terrel Burton and Rheece Hemmings. We find the job worth handing to AI, build it, and keep it working."),
    "faq":      ("/faq/",      "FAQ | FlowBuildr",
                 "What owners ask before they start with FlowBuildr: the free call, the audit, costs, the tools we use and how we look after your data."),
    "privacy":  ("/privacy/",  "Privacy notice | FlowBuildr",
                 "How FlowBuildr Ltd collects, uses and protects your personal data, including cookies and your rights under UK GDPR."),
    "404":      ("/404.html",  "Page not found | FlowBuildr", "This page could not be found. Go to the FlowBuildr home page."),
}
ORG_ID = SITE + "/#organization"

def text(el): return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()

def org():
    return {
        "@type": ["Organization", "ProfessionalService"], "@id": ORG_ID,
        "name": "FlowBuildr", "legalName": "FlowBuildr Ltd", "url": SITE + "/",
        "logo": SITE + "/assets/logo-dark.png", "image": SITE + "/assets/logo-dark.png",
        "email": "admin@flowbuildr.co.uk",
        "description": "AI that works while you work. We find the job worth handing to AI, build it in your format and keep it running. Manchester, UK.",
        "identifier": {"@type": "PropertyValue", "propertyID": "Companies House company number", "value": "17203503"},
        # Registered (virtual) office only: no opening hours, not a place to visit.
        "address": {"@type": "PostalAddress", "name": "Registered office",
                    "streetAddress": "First Floor, Swan Buildings, 20 Swan Street",
                    "addressLocality": "Manchester", "postalCode": "M4 5JW", "addressCountry": "GB"},
        "areaServed": [{"@type": "City", "name": "Manchester"}, {"@type": "Country", "name": "United Kingdom"}],
        "founder": [{"@type": "Person", "name": "Terrel Burton"}, {"@type": "Person", "name": "Rheece Hemmings"}],
    }

def services():
    out = []
    home = BeautifulSoup((ROOT / "_src/views/home.html").read_text(), "lxml")
    for h3 in home.select("h3.h3"):
        if text(h3) in ("The audit", "The build", "We run it"):
            out.append((text(h3), text(h3.find_next("p"))))
    js = (ROOT / "assets/site.js").read_text()
    for name, blurb in re.findall(r"\{name:'([^']+)',icon:'[^']+',\s*blurb:'((?:[^'\\]|\\.)*)'", js):
        out.append((name, blurb.replace("\\'", "'")))
    return [{"@type": "Service", "name": n, "description": d, "provider": {"@id": ORG_ID},
             "areaServed": [{"@type": "City", "name": "Manchester"}, {"@type": "Country", "name": "United Kingdom"}]}
            for n, d in out]

def faq():
    soup = BeautifulSoup((ROOT / "_src/views/faq.html").read_text(), "lxml")
    return {"@type": "FAQPage", "@id": SITE + "/faq/#faq", "mainEntity": [
        {"@type": "Question", "name": text(qa.select_one("h3 button")),
         "acceptedAnswer": {"@type": "Answer", "text": text(qa.select_one(".reveal"))}}
        for qa in soup.select(".qa") if "Placeholder" not in text(qa)]}  # skip draft answers

def jsonld(name, url, title, desc):
    graph = [org(), {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "FlowBuildr", "publisher": {"@id": ORG_ID}}]
    if name != "404":
        graph.append({"@type": "WebPage", "@id": SITE + url, "url": SITE + url, "name": title, "description": desc,
                      "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": ORG_ID}})
    if name == "services": graph += services()
    if name == "faq": graph.append(faq())
    data = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)
    return '<script type="application/ld+json">\n' + data.replace("</", "<\\/") + "\n</script>"

def main():
    layout = (ROOT / "_src/layout.html").read_text()
    v = hashlib.sha1(b"".join((ROOT / "assets" / f).read_bytes() for f in ("site.css", "site.js", "consent.js"))).hexdigest()[:8]
    for name, (url, title, desc) in PAGES.items():
        extra = jsonld(name, url, title, desc)
        if name == "404": extra = '<meta name="robots" content="noindex">\n' + extra
        page = (layout.replace("{{view}}", (ROOT / f"_src/views/{name}.html").read_text().rstrip("\n"))
                      .replace("{{title}}", html.escape(title)).replace("{{description}}", html.escape(desc))
                      .replace("{{url}}", SITE + url).replace("{{head_extra}}", extra).replace("{{v}}", v))
        assert "{{" not in page and page.count("<h1") == 1, name
        dest = ROOT / ("index.html" if name == "home" else "404.html" if name == "404" else f"{name}/index.html")
        dest.parent.mkdir(exist_ok=True); dest.write_text(page)
    today = date.today().isoformat()
    urls = "".join(f"  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>\n" for n, (u, *_) in PAGES.items() if n != "404")
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n")

if __name__ == "__main__": main()
