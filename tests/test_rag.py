from rag.data_loader import load_cve_json, load_all_documents


def test_load_cve_json_reads_sample_record():
    records = load_cve_json("data/cve/cve_data.json")
    assert len(records) == 1
    assert records[0]["cve_id"] == "CVE-2024-1001"


def test_load_all_documents_creates_documents():
    documents = load_all_documents()
    assert len(documents) >= 1
    assert documents[0].metadata["cve_id"]
