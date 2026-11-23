from database.migrations.audit_ar_objects_consistency import audit_documents

CATALOG = {
    "elephant_marker_01": ("animals-v2", 0),
    "shiba_marker_01": ("animals-v2", 1),
}


def test_audit_reports_partial_duplicate_and_mixed_shape_documents():
    documents = [
        {
            "_id": "1",
            "ar_tag": "elephant_marker_01",
            "tracking_mode": "catalog",
            "mind_catalog_id": "animals-v2",
            "mind_target_index": 0,
            "model_3d_url": "https://assets/elephant.glb",
            "image_2d_url": None,
            "texture_url": None,
            "glb_size": 1.0,
            "position": "0 0 0",
            "rotation": "0 0 0",
            "scale": "1 1 1",
        },
        {
            "_id": "2",
            "ar_tag": "shiba_marker_01",
            "mind_catalog_id": "animals-v2",
            "mind_target_index": "1",
            "nft_base_url": "/old.mind",
            "model_3d_url": "",
            "image_2d_url": "",
            "glb_size": 0,
            "position": '{"x":0,"y":0,"z":0}',
            "rotation": {"x": 0, "y": 0, "z": 0},
            "scale": [1, 1, 1],
        },
    ]
    report = audit_documents(documents, CATALOG)
    assert report.valid_catalog == 1
    assert report.invalid == 1
    assert set(report.documents[1].issues) >= {
        "TRACKING_MODE_MISSING",
        "CATALOG_INDEX_TYPE_INVALID",
        "CATALOG_URL_DUPLICATED",
        "MODEL_URL_EMPTY",
        "GLB_SIZE_INVALID",
        "TRANSFORM_ENCODING_MIXED",
    }


def test_audit_never_mutates_input():
    document = {"_id": "1", "ar_tag": "unknown"}
    original = dict(document)
    audit_documents([document], CATALOG)
    assert document == original
