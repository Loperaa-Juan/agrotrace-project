from unittest.mock import Mock

from fastapi.testclient import TestClient

from main import app


def test_lifespan_loads_model(monkeypatch):
    fake_model = Mock()

    load_model_mock = Mock(return_value=fake_model)
    monkeypatch.setattr("main.load_model", load_model_mock)

    with TestClient(app):
        load_model_mock.assert_called_once()
        assert app.state.model == fake_model


def test_lifespan_loads_detector(monkeypatch):
    fake_detector = Mock()

    load_detector_mock = Mock(return_value=fake_detector)
    monkeypatch.setattr("main.load_detector", load_detector_mock)

    with TestClient(app):
        load_detector_mock.assert_called_once()
        assert app.state.detector == fake_detector
