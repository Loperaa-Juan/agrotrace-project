from unittest.mock import Mock

import pytest


# Ningún test debe hablar con S3 de verdad: el cliente se reemplaza por un Mock
@pytest.fixture(autouse=True)
def s3_client(monkeypatch):
    client = Mock()
    monkeypatch.setattr("main.create_s3_client", Mock(return_value=client))
    return client
