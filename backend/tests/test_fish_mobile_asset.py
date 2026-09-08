from pathlib import Path
import json
import struct


FISH_MOBILE_ASSET = (
    Path(__file__).resolve().parents[2] / "3DModels" / "fish" / "fish_mobile_v1.glb"
)


def test_fish_mobile_asset_is_a_versioned_mobile_sized_glb():
    asset = FISH_MOBILE_ASSET.read_bytes()

    assert asset[:4] == b"glTF"
    assert len(asset) <= 12 * 1024 * 1024


def test_fish_mobile_asset_requires_no_runtime_decoder():
    asset = FISH_MOBILE_ASSET.read_bytes()
    magic, version, declared_length = struct.unpack_from("<4sII", asset)
    json_length, json_type = struct.unpack_from("<I4s", asset, 12)
    document = json.loads(asset[20 : 20 + json_length].decode("utf-8"))

    assert magic == b"glTF"
    assert version == 2
    assert declared_length == len(asset)
    assert json_type == b"JSON"
    assert not {
        "KHR_draco_mesh_compression",
        "EXT_meshopt_compression",
        "KHR_texture_basisu",
    }.intersection(document.get("extensionsRequired", []))
