from fastapi.testclient import TestClient


def test_region_list_is_public_and_uses_10_digit_codes(client: TestClient) -> None:
    res = client.get("/regions")
    assert res.status_code == 200
    body = res.json()
    assert body["dataset"]["sourceVersion"] == "ver20261001"
    assert "CC BY 4.0" in body["dataset"]["attribution"]

    regions = body["regions"]
    assert len(regions) == 44
    codes = [r["regionCode"] for r in regions]
    assert len(set(codes)) == 44
    assert all(len(code) == 10 and code.isdigit() for code in codes)

    pajang = next(r for r in regions if r["regionCode"] == "4111156000")
    assert pajang == {
        "regionCode": "4111156000",
        "name": "파장동",
        "sigunguName": "수원시장안구",
        "fullName": "경기도 수원시장안구 파장동",
    }


def test_region_geojson_has_region_code(client: TestClient) -> None:
    res = client.get("/regions/geojson")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/geo+json")
    body = res.json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) == 44
    assert all(len(f["properties"]["regionCode"]) == 10 for f in body["features"])
    assert body["dataset"]["sourceVersion"] == "ver20261001"
