from fastapi.testclient import TestClient

from app.main import app


def test_region_list_matches_map_boundaries() -> None:
    client = TestClient(app)
    listing = client.get("/regions")
    boundaries = client.get("/regions/geojson")

    assert listing.status_code == boundaries.status_code == 200
    assert boundaries.headers["content-type"] == "application/geo+json"
    catalog = listing.json()
    geojson = boundaries.json()
    assert catalog["dataset"] == geojson["dataset"]
    assert catalog["dataset"]["source_version"] == "ver20261001"
    assert catalog["dataset"]["status"] == "active"
    assert geojson["type"] == "FeatureCollection"
    assert len(catalog["regions"]) == len(geojson["features"]) == 44

    listed = {item["region_code"]: item["name"] for item in catalog["regions"]}
    mapped = {}
    for feature in geojson["features"]:
        props = feature["properties"]
        assert props["region_code"] == props["adm_cd2"]
        mapped[props["region_code"]] = props["adm_nm"]

    assert len(listed) == len(mapped) == 44
    assert listed == mapped
    assert all(len(code) == 10 and code.isascii() and code.isdecimal() for code in listed)
    assert all(item["region_code"] == item["adm_cd2"] for item in catalog["regions"])
    assert listed["4111156000"].endswith("파장동")
    assert all(
        item["geometry"]["type"] in {"Polygon", "MultiPolygon"}
        and item["geometry"]["coordinates"]
        for item in geojson["features"]
    )
