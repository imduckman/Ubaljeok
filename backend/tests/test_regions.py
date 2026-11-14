from fastapi.testclient import TestClient


def test_region_list_matches_map_boundaries(client: TestClient, login) -> None:
    for path in ("/regions", "/regions/geojson"):
        response = client.get(path)
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"

    login(client, "maptester")
    listing = client.get("/regions")
    boundaries = client.get("/regions/geojson")
    assert listing.status_code == boundaries.status_code == 200
    assert boundaries.headers["content-type"] == "application/geo+json"

    catalog = listing.json()
    geojson = boundaries.json()
    assert catalog["dataVersion"] == geojson["dataVersion"] == "ver20261001"
    assert geojson["dataset"]["sourceVersion"] == geojson["dataVersion"]
    assert geojson["type"] == "FeatureCollection"
    assert len(catalog["regions"]) == len(geojson["features"]) == 44
    listed = {item["regionCode"]: item for item in catalog["regions"]}
    assert len(listed) == 44
    assert listed["4111156000"]["name"] == "파장동"
    for feature in geojson["features"]:
        props = feature["properties"]
        code = props["regionCode"]
        assert len(code) == 10 and code.isascii() and code.isdecimal()
        assert code == props["adm_cd2"]
        assert listed[code]["sigunguName"] == props["sggnm"]
        assert listed[code]["name"] == props["adm_nm"].rsplit(" ", 1)[-1]
        assert feature["geometry"]["type"] in {"Polygon", "MultiPolygon"}
        assert feature["geometry"]["coordinates"]
    assert {f["properties"]["regionCode"] for f in geojson["features"]} == set(listed)
