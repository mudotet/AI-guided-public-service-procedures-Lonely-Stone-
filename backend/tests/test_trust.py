from app.routers.trust import SOURCE_URLS, trust


def test_trust_endpoint_exposes_only_official_source_urls() -> None:
    response = trust()

    assert len(response.sources) == len(SOURCE_URLS) == 6
    assert all(source.domain == "dichvucong.gov.vn" for source in response.sources)
    assert [source.url for source in response.sources] == list(SOURCE_URLS)
    assert "không tuyên bố" in response.training_disclosure.lower()
