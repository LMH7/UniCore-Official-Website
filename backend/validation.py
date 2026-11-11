"""Validate public snapshots before accepting traffic. No draft filtering in the browser."""

import hashlib
import json
import re
from urllib.parse import urlsplit


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def content_version(products, content):
    return hashlib.sha256(canonical({"products": products, "content": content}).encode("utf-8")).hexdigest()[:16]


def text(value, field, required=False):
    if not isinstance(value, str) or len(value) >= 5000 or (required and not value.strip()):
        raise ValueError("Invalid public text: " + field)


def records(value, field, limit=500):
    if not isinstance(value, list) or len(value) > limit:
        raise ValueError("Invalid public array: " + field)
    return value


def identifier(value, field):
    if not isinstance(value, str) or not re.fullmatch(r"[a-z0-9-]{1,80}", value):
        raise ValueError("Invalid public id: " + field)


def asset(value, field, allow_empty=False):
    text(value, field)
    if allow_empty and value == "":
        return
    if re.fullmatch(r"assets/images/[a-zA-Z0-9_./-]+", value) and ".." not in value:
        return
    parts = urlsplit(value)
    if parts.scheme == "https" and parts.netloc and not parts.username and not parts.password and not re.search(r"[\s\\]", value):
        return
    raise ValueError("Invalid public image URL: " + field)


def link(value, field):
    text(value, field)
    if not value:
        return
    parts = urlsplit(value)
    if parts.scheme == "https" and parts.netloc and not parts.username and not parts.password and not re.search(r"[\s\\]", value):
        return
    if re.fullmatch(r"(?![/\\])[a-zA-Z0-9_./-]+(?:[?#][a-zA-Z0-9_.%=&-]*)?", value) and ".." not in value:
        return
    raise ValueError("Invalid public link: " + field)


def validate(products, content):
    ids = set()
    for product in records(products, "products"):
        if not isinstance(product, dict):
            raise ValueError("Invalid product object")
        identifier(product.get("id"), "product.id")
        if product["id"] in ids:
            raise ValueError("Duplicate product id: " + product["id"])
        ids.add(product["id"])
        for key in ("name", "subtitle", "sensor", "imageAlt", "summary", "description", "status"):
            text(product.get(key), "product." + key, required=True)
        asset(product.get("image"), "product.image")
        for item in records(product.get("applications"), "applications"):
            text(item, "application", required=True)
        for item in records(product.get("specs"), "specs"):
            if not isinstance(item, dict):
                raise ValueError("Invalid spec")
            text(item.get("label"), "spec.label", required=True)
            text(item.get("value"), "spec.value", required=True)
        for item in records(product.get("resources"), "product.resources"):
            if not isinstance(item, dict):
                raise ValueError("Invalid product resource")
            text(item.get("title"), "product.resource.title", required=True)
            link(item.get("url"), "product.resource.url")
    if not isinstance(content, dict):
        raise ValueError("Invalid site content object")
    for key in ("name", "shortName", "brand", "tagline", "intro", "mission"):
        text(content.get(key), "content." + key, required=True)
    for key in ("email", "location"):
        text(content.get(key), "content." + key)
    asset(content.get("logo"), "content.logo")
    asset(content.get("qrImage"), "content.qrImage", allow_empty=True)
    for group in ("solutions", "contacts"):
        ids = set()
        for item in records(content.get(group), group):
            if not isinstance(item, dict):
                raise ValueError("Invalid " + group + " object")
            identifier(item.get("id"), group + ".id")
            if item["id"] in ids:
                raise ValueError("Duplicate " + group + " id")
            ids.add(item["id"])
            keys = ("number", "title", "english", "icon", "summary", "audience", "description") if group == "solutions" else ("label", "name", "icon", "description", "action", "downloadName")
            for key in keys:
                text(item.get(key), group + "." + key, required=True)
            if group == "solutions":
                for topic in records(item.get("topics"), "topics"):
                    text(topic, "topic", required=True)
            else:
                asset(item.get("qrImage"), "contact.qrImage", allow_empty=True)
                link(item.get("url"), "contact.url")
    for item in records(content.get("resources"), "resources"):
        if not isinstance(item, dict):
            raise ValueError("Invalid resource object")
        for key in ("title", "type", "description", "label"):
            text(item.get(key), "resource." + key, required=True)
        link(item.get("url"), "resource.url")
    for item in records(content.get("faqs"), "faqs"):
        if not isinstance(item, dict):
            raise ValueError("Invalid FAQ object")
        text(item.get("question"), "faq.question", required=True)
        text(item.get("answer"), "faq.answer", required=True)


def validate_snapshot(snapshot):
    if not isinstance(snapshot, dict):
        raise ValueError("Invalid public snapshot")
    validate(snapshot.get("products"), snapshot.get("content"))
    if snapshot.get("version") != content_version(snapshot["products"], snapshot["content"]):
        raise ValueError("Snapshot version does not match its content; regenerate it")
    return snapshot
