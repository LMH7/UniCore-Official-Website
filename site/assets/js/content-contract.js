/* Shared public-data checks used by the browser and content generator. */
(() => {
  const fail = (field) => { throw new Error(`Invalid public data: ${field}`); };
  const text = (value, field, required = false) => {
    if (typeof value !== "string" || value.length >= 5000 || (required && !value.trim())) fail(field);
  };
  const array = (value, field) => {
    if (!Array.isArray(value) || value.length > 500) fail(field);
    return value;
  };
  const object = (value, field) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(field);
  };
  const remote = (value, local = false) => {
    try {
      const u = new URL(value);
      return !/[\s\\]/.test(value) && !u.username && !u.password &&
        (u.protocol === "https:" || (local && u.protocol === "http:" && ["127.0.0.1", "localhost"].includes(u.hostname)));
    } catch { return false; }
  };
  function asset(value, field, empty = false) {
    text(value, field);
    if ((empty && value === "") || (/^assets\/images\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes("..")) || remote(value, true)) return;
    fail(field);
  }
  function link(value, field) {
    text(value, field);
    if (!value || remote(value) || (/^(?![/\\])[a-zA-Z0-9_./-]+(?:[?#][a-zA-Z0-9_.%=&-]*)?$/.test(value) && !value.includes(".."))) return;
    fail(field);
  }
  function unique(items, field) {
    const ids = new Set();
    for (const item of array(items, field)) {
      object(item, field);
      if (typeof item.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(item.id) || ids.has(item.id)) fail(`${field}.id`);
      ids.add(item.id);
    }
    return items;
  }
  function validateProducts(items) {
    for (const p of unique(items, "products")) {
      for (const k of ["name", "subtitle", "sensor", "imageAlt", "summary", "description", "status"]) text(p[k], `product.${k}`, true);
      asset(p.image, "product.image");
      for (const v of array(p.applications, "applications")) text(v, "application", true);
      for (const s of array(p.specs, "specs")) {
        object(s, "spec"); text(s.label, "spec.label", true); text(s.value, "spec.value", true);
      }
      for (const r of array(p.resources, "product.resources")) {
        object(r, "product.resource"); text(r.title, "resource.title", true); link(r.url, "resource.url");
      }
    }
    return items;
  }
  function validateContent(data) {
    object(data, "content");
    for (const k of ["name", "shortName", "brand", "tagline", "intro", "mission"]) text(data[k], `content.${k}`, true);
    for (const k of ["email", "location"]) text(data[k], `content.${k}`);
    asset(data.logo, "logo"); asset(data.qrImage, "qrImage", true);
    for (const s of unique(data.solutions, "solutions")) {
      for (const k of ["number", "title", "english", "icon", "summary", "audience", "description"]) text(s[k], `solution.${k}`, true);
      for (const t of array(s.topics, "topics")) text(t, "topic", true);
    }
    for (const c of unique(data.contacts, "contacts")) {
      for (const k of ["label", "name", "icon", "description", "action", "downloadName"]) text(c[k], `contact.${k}`, true);
      asset(c.qrImage, "contact.qrImage", true); link(c.url, "contact.url");
    }
    for (const r of array(data.resources, "resources")) {
      object(r, "resource");
      for (const k of ["title", "type", "description", "label"]) text(r[k], `resource.${k}`, true);
      link(r.url, "resource.url");
    }
    for (const f of array(data.faqs, "faqs")) {
      object(f, "faq"); text(f.question, "faq.question", true); text(f.answer, "faq.answer", true);
    }
    return data;
  }
  globalThis.ContentContract = Object.freeze({ validateProducts, validateContent });
})();
