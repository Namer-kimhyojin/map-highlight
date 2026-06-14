import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
SHP_PATH = WORKSPACE / "DAM_DAN.shp"
DBF_PATH = WORKSPACE / "DAM_DAN.dbf"
ADMIN_PATH = ROOT / "public" / "data" / "admin_sigungu.geojson"
OUTPUT_PATH = ROOT / "public" / "data" / "industrial_parks_pohang.geojson"

A = 6378137.0
F = 1 / 298.257222101
E2 = 2 * F - F * F
EP2 = E2 / (1 - E2)
K0 = 1.0
LON0 = math.radians(127.0)
LAT0 = math.radians(38.0)
FE = 200000.0
FN = 600000.0

TYPE_LABELS = {
    "1": "국가산업단지",
    "2": "일반산업단지",
    "3": "도시첨단산업단지",
    "4": "농공단지",
}


def meridional_arc(phi):
    e4 = E2 * E2
    e6 = e4 * E2
    return A * (
        (1 - E2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
        - (3 * E2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * math.sin(2 * phi)
        + (15 * e4 / 256 + 45 * e6 / 1024) * math.sin(4 * phi)
        - (35 * e6 / 3072) * math.sin(6 * phi)
    )


M0 = meridional_arc(LAT0)


def inverse_tm(x, y):
    m = M0 + (y - FN) / K0
    mu = m / (A * (1 - E2 / 4 - 3 * E2**2 / 64 - 5 * E2**3 / 256))
    e1 = (1 - math.sqrt(1 - E2)) / (1 + math.sqrt(1 - E2))
    fp = (
        mu
        + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu)
        + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
        + (151 * e1**3 / 96) * math.sin(6 * mu)
        + (1097 * e1**4 / 512) * math.sin(8 * mu)
    )
    sinfp = math.sin(fp)
    cosfp = math.cos(fp)
    tanfp = math.tan(fp)
    c1 = EP2 * cosfp * cosfp
    t1 = tanfp * tanfp
    n1 = A / math.sqrt(1 - E2 * sinfp * sinfp)
    r1 = A * (1 - E2) / (1 - E2 * sinfp * sinfp) ** 1.5
    d = (x - FE) / (n1 * K0)
    lat = fp - (n1 * tanfp / r1) * (
        d * d / 2
        - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d**4 / 24
        + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d**6 / 720
    )
    lon = LON0 + (
        d
        - (1 + 2 * t1 + c1) * d**3 / 6
        + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d**5 / 120
    ) / cosfp
    return [round(math.degrees(lon), 7), round(math.degrees(lat), 7)]


def read_dbf(path):
    data = path.read_bytes()
    count = struct.unpack("<I", data[4:8])[0]
    header_length = struct.unpack("<H", data[8:10])[0]
    record_length = struct.unpack("<H", data[10:12])[0]
    fields = []
    offset = 32
    while data[offset] != 0x0D:
        desc = data[offset : offset + 32]
        name = desc[:11].split(b"\x00", 1)[0].decode("ascii", "ignore")
        fields.append((name, desc[16]))
        offset += 32

    rows = []
    for index in range(count):
        record = data[header_length + index * record_length : header_length + (index + 1) * record_length]
        if record[:1] == b"*":
            rows.append(None)
            continue
        pos = 1
        row = {}
        for name, length in fields:
            raw = record[pos : pos + length]
            pos += length
            row[name] = raw.decode("cp949", "ignore").strip()
        rows.append(row)
    return rows


def read_shapes(path):
    data = path.read_bytes()
    offset = 100
    shapes = []
    while offset < len(data):
        _, content_words = struct.unpack(">ii", data[offset : offset + 8])
        offset += 8
        content_length = content_words * 2
        content = data[offset : offset + content_length]
        offset += content_length
        shape_type = struct.unpack("<i", content[:4])[0]
        if shape_type == 0:
            shapes.append(None)
            continue
        if shape_type not in (5, 15, 25, 31):
            shapes.append(None)
            continue
        part_count, point_count = struct.unpack("<2i", content[36:44])
        parts = list(struct.unpack("<" + "i" * part_count, content[44 : 44 + 4 * part_count]))
        points_offset = 44 + 4 * part_count
        points = [
            struct.unpack("<2d", content[points_offset + idx * 16 : points_offset + idx * 16 + 16])
            for idx in range(point_count)
        ]
        rings = []
        for part_index, start in enumerate(parts):
            end = parts[part_index + 1] if part_index + 1 < len(parts) else point_count
            ring = [inverse_tm(x, y) for x, y in points[start:end]]
            if ring and ring[0] != ring[-1]:
                ring.append(ring[0])
            rings.append(ring)
        shapes.append(rings)
    return shapes


def point_in_ring(point, ring):
    x, y = point
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        intersects = (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
        if intersects:
            inside = not inside
        j = i
    return inside


def point_in_geometry(point, geometry):
    polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    for polygon in polygons:
        if polygon and point_in_ring(point, polygon[0]):
            return True
    return False


def centroid(rings):
    points = [point for ring in rings for point in ring]
    return [
        round(sum(point[0] for point in points) / len(points), 7),
        round(sum(point[1] for point in points) / len(points), 7),
    ]


def display_name(name, type_label):
    if name.endswith(("산업단지", "농공단지", "산업지구")):
        return name
    if name == "포항":
        return "포항국가산업단지"
    if name == "포항블루밸리":
        return "포항블루밸리국가산업단지"
    return f"{name}{type_label}"


def main():
    rows = read_dbf(DBF_PATH)
    shapes = read_shapes(SHP_PATH)
    admin = json.loads(ADMIN_PATH.read_text(encoding="utf-8"))
    pohang_admins = [
        feature
        for feature in admin["features"]
        if feature["properties"].get("name") in {"포항시 남구", "포항시 북구"}
    ]

    features = []
    for row, rings in zip(rows, shapes):
        if not row or not rings:
            continue
        center = centroid(rings)
        containing_admin = next(
            (
                feature["properties"]["name"]
                for feature in pohang_admins
                if point_in_geometry(center, feature["geometry"])
            ),
            None,
        )
        if not containing_admin:
            continue
        type_label = TYPE_LABELS.get(row.get("DANJI_TYPE", ""), row.get("DANJI_TYPE", "산업단지"))
        raw_name = row.get("DAN_NAME", "")
        geometry = {
            "type": "MultiPolygon",
            "coordinates": [[ring] for ring in rings if len(ring) >= 4],
        }
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": row.get("DAN_ID", ""),
                    "name": display_name(raw_name, type_label),
                    "sourceName": raw_name,
                    "type": type_label,
                    "address": containing_admin,
                    "municipality": containing_admin,
                    "status": "산업단지 경계 원본",
                    "center": center,
                    "source": "DAM_DAN.shp",
                },
                "geometry": geometry,
            }
        )

    features.sort(key=lambda item: (item["properties"]["municipality"], item["properties"]["name"]))
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "name": "pohang_industrial_parks_from_dam_dan",
                "features": features,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"wrote {len(features)} features to {OUTPUT_PATH}")
    for feature in features:
        props = feature["properties"]
        print(f"- {props['name']} / {props['type']} / {props['municipality']}")


if __name__ == "__main__":
    main()
