from pipeline.anomaly_detector import AnomalyDetector


def test_anomaly_detector_extracts_features():
    detector = AnomalyDetector()
    features = detector.extract_features(
        "failed login failed login error from 192.168.1.10 admin attempt\n"
        "failed login from 10.0.0.5\n"
        "success login"
    )
    assert len(features) == 5
    assert features[0] >= 2
    assert features[1] >= 2


def test_anomaly_detector_analyzes_text():
    detector = AnomalyDetector()
    result = detector.analyze("failed login failed login error from 192.168.1.10 admin attempt")
    assert "is_anomaly" in result
    assert "severity" in result


def test_anomaly_detector_flags_rule_based_attack_patterns():
    detector = AnomalyDetector()
    result = detector.analyze(
        "failed login failed login failed login from 192.168.1.10 and 10.0.0.5 "
        "admin escalation rate limit exceeded"
    )
    assert result["is_anomaly"] is True
    assert result["anomaly_score"] >= 50
    assert result["severity"] in {"high", "critical"}
