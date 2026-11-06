#!/usr/bin/env python3
"""Generate images with fal.ai. Python stdlib only.

Key, in this order:
  1. FAL_KEY
  2. ~/.config/fal/key  (single line, mode 600)

The key is never printed.
Default model: fal-ai/nano-banana.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_MODEL = "fal-ai/nano-banana"
ASPECTS = {"21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"}
FORMATS = {"jpeg", "png", "webp"}


def load_key() -> str:
    key = os.environ.get("FAL_KEY", "").strip()
    if key:
        return key
    path = Path.home() / ".config" / "fal" / "key"
    if path.is_file():
        key = path.read_text(encoding="utf-8").strip()
        if key:
            return key
    sys.exit("FAL_KEY is not set and ~/.config/fal/key is missing")


def request_json(url: str, key: str, payload: dict | None, timeout: int, method: str = "POST") -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Key {key}",
            "Accept": "application/json",
            **({"Content-Type": "application/json"} if data is not None else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:800]
        sys.exit(f"fal HTTP {exc.code} for {url.split('?', 1)[0]}: {detail}")
    except urllib.error.URLError as exc:
        sys.exit(f"fal request failed: {exc.reason}")
    if not body:
        return {}
    return json.loads(body)


def generate(model: str, payload: dict, key: str, timeout: int) -> dict:
    result = request_json(f"https://fal.run/{model}", key, payload, timeout)
    if result.get("images"):
        return result
    status_url = result.get("status_url")
    response_url = result.get("response_url")
    if not status_url or not response_url:
        sys.exit(f"fal returned no images: {json.dumps(result, ensure_ascii=False)[:800]}")
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = request_json(status_url, key, None, timeout, method="GET")
        state = str(status.get("status", "")).upper()
        if state in {"COMPLETED", "OK"} or status.get("images"):
            if status.get("images"):
                return status
            return request_json(response_url, key, None, timeout, method="GET")
        if state in {"FAILED", "ERROR"}:
            sys.exit(f"fal generation failed: {json.dumps(status, ensure_ascii=False)[:800]}")
        time.sleep(2)
    sys.exit("fal generation timed out")


def download(url: str, dest: Path, timeout: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            dest.write_bytes(resp.read())
    except urllib.error.URLError as exc:
        sys.exit(f"download failed for {dest.name}: {exc.reason}")


def run_job(job: dict, key: str, model: str, timeout: int) -> None:
    prompt = (job.get("prompt") or "").strip()
    out = (job.get("out") or "").strip()
    if not prompt or not out:
        sys.exit("each job needs prompt and out")
    aspect = job.get("aspect_ratio") or "4:5"
    output_format = job.get("output_format") or "png"
    if aspect not in ASPECTS:
        sys.exit(f"unsupported aspect_ratio: {aspect}")
    if output_format not in FORMATS:
        sys.exit(f"unsupported output_format: {output_format}")
    payload = {
        "prompt": prompt,
        "num_images": 1,
        "aspect_ratio": aspect,
        "output_format": output_format,
        "limit_generations": True,
    }
    if job.get("seed") is not None:
        payload["seed"] = int(job["seed"])
    chosen_model = job.get("model") or model
    result = generate(chosen_model, payload, key, timeout)
    images = result.get("images") or []
    image_url = images[0].get("url") if images else ""
    if not image_url:
        sys.exit(f"fal returned no image url: {json.dumps(result, ensure_ascii=False)[:800]}")
    dest = Path(out)
    download(image_url, dest, timeout)
    print(json.dumps({
        "out": str(dest),
        "bytes": dest.stat().st_size,
        "model": chosen_model,
        "aspect_ratio": aspect,
        "url": image_url,
    }, ensure_ascii=False))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate images with fal.ai Nano Banana")
    parser.add_argument("--prompt", default="", help="Single prompt")
    parser.add_argument("--out", default="", help="Output file for --prompt")
    parser.add_argument("--jobs", default="", help="JSON list of {prompt,out,aspect_ratio}")
    parser.add_argument("--aspect-ratio", default="4:5")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--timeout", type=int, default=180)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    key = load_key()
    if args.jobs:
        jobs = json.loads(Path(args.jobs).read_text(encoding="utf-8"))
        if not isinstance(jobs, list) or not jobs:
            sys.exit("--jobs must be a non-empty JSON list")
    elif args.prompt and args.out:
        jobs = [{
            "prompt": args.prompt,
            "out": args.out,
            "aspect_ratio": args.aspect_ratio,
            "seed": args.seed,
        }]
    else:
        sys.exit("pass --prompt and --out, or --jobs")
    for job in jobs:
        run_job(job, key, args.model, args.timeout)


if __name__ == "__main__":
    main()
