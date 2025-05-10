import os
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from werkzeug.datastructures import FileStorage
from serve import app, messages


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_mongo():
    with patch('serve.messages') as mock:
        yield mock


@pytest.fixture
def mock_file():
    file_content = b'dummy audio content'
    return FileStorage(
        stream=open(os.devnull, 'rb'),
        filename='test_audio.wav',
        content_type='audio/wav',
    )


def test_health_check(client, mock_mongo):
    mock_mongo.admin.command.return_value = True
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'ok'


def test_health_check_failure(client, mock_mongo):
    mock_mongo.admin.command.side_effect = Exception('DB Error')
    response = client.get('/health')
    assert response.status_code == 500
    assert response.json['status'] == 'error'


def test_upload_audio_success(client, mock_mongo, mock_file):
    test_data = {
        'sender': 'user1',
        'recipient': 'user2',
        'file': mock_file
    }

    mock_mongo.insert_one.return_value = MagicMock(inserted_id='message123')

    response = client.post('/upload', data=test_data)
    assert response.status_code == 200
    assert 'id' in response.json


def test_upload_audio_missing_fields(client):
    response = client.post('/upload', data={})
    assert response.status_code == 400
    assert 'error' in response.json
    assert response.json['error'] == 'Missing required fields'


def test_get_messages_success(client, mock_mongo):
    test_messages = [
        {
            '_id': 'msg1',
            'sender': 'user1',
            'filename': 'audio1.wav',
            'created_at': datetime.utcnow()
        },
        {
            '_id': 'msg2',
            'sender': 'user2',
            'filename': 'audio2.wav',
            'created_at': datetime.utcnow()
        }
    ]

    mock_mongo.find.return_value.sort.return_value = test_messages

    response = client.get('/messages?recipient=user1')
    assert response.status_code == 200
    assert len(response.json) == 2
    assert all('url' in msg for msg in response.json)


def test_get_messages_missing_recipient(client):
    response = client.get('/messages')
    assert response.status_code == 400
    assert 'error' in response.json
    assert response.json['error'] == 'Missing recipient'


def test_file_upload_size(client, mock_mongo):
    large_file = FileStorage(
        stream=open(os.devnull, 'rb'),
        filename='large_audio.wav',
        content_type='audio/wav',
    )

    test_data = {
        'sender': 'user1',
        'recipient': 'user2',
        'file': large_file
    }

    # Mock a large file
    with patch.object(large_file, 'read', return_value=b'0' * (10 * 1024 * 1024)):  # 10MB
        response = client.post('/upload', data=test_data)
        assert response.status_code == 400
        assert 'error' in response.json


def test_invalid_audio_format(client, mock_mongo):
    invalid_file = FileStorage(
        stream=open(os.devnull, 'rb'),
        filename='test.txt',
        content_type='text/plain',
    )

    test_data = {
        'sender': 'user1',
        'recipient': 'user2',
        'file': invalid_file
    }

    response = client.post('/upload', data=test_data)
    assert response.status_code == 400
    assert 'error' in response.json
