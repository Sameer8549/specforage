"""Verify the deployed /process response exposes request-scoped cache provenance."""

from __future__ import annotations

import json
import urllib.request


URL = "https://specforge-backend-production.up.railway.app/process"
PAYLOAD = {
    "mfg_part_num": "PDSH4816AF",
    "part_desc": "PDSH4816AF Dishwasher SS - Display Only",
    "e1_brand": None,
    "unilog_brand": None,
    "dib_brand": None,
    "part_manuf": "Appliance Dealers Cooperative (APPDE)",
}


def process() -> dict:
    request = urllib.request.Request(
        URL,
        data=json.dumps(PAYLOAD).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.load(response)


for run in (1, 2):
    record = process()
    resolution = record["brand_resolution"]
    print(json.dumps({
        "run": run,
        "item_id": record["item_id"],
        "all_stages_present": all(record.get(stage) is not None for stage in (
            "clean", "brand_resolution", "classify", "extract", "normalize",
            "verify", "adjudicate", "description", "audit", "output_row",
        )),
        "mpn_lookup_attempted": resolution["mpn_lookup_attempted"],
        "mpn_lookup_cache_hit": resolution["mpn_lookup_cache_hit"],
        "classification": record["classify"]["unspsc_code"],
        "final_attributes": len(record["adjudicate"]["attributes"]),
    }))
