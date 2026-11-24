from datetime import datetime, timezone


def _date(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)


DEMO_PROFILE = {
    'id': 'demo-profile-001',
    'display_code': 'DEMO-001',
    'display_name': 'Perfil sintético de demostración',
    'status': 'active',
    'created_at': _date('2026-07-01T09:00:00'),
}

DEMO_PROFILES = [
    DEMO_PROFILE,
    {
        'id': 'demo-profile-002',
        'display_code': 'DEMO-002',
        'display_name': 'Perfil sintético alto',
        'status': 'active',
        'created_at': _date('2026-08-12T10:30:00'),
    },
    {
        'id': 'demo-profile-003',
        'display_code': 'DEMO-003',
        'display_name': 'Perfil sintético seguimiento',
        'status': 'active',
        'created_at': _date('2026-09-20T14:15:00'),
    },
]

DEMO_MEASUREMENTS = [
    {
        'id': f'demo-measurement-{index:03d}',
        'profile_id': DEMO_PROFILE['id'],
        'metric_code': metric,
        'value': value,
        'unit': unit,
        'method': 'simulated',
        'measured_at': _date(measured_at),
        'created_by': 'demo-fixture',
        'notes': 'Dato sintético de demostración; no corresponde a una persona real.',
        'supersedes_id': None,
        'created_at': _date(measured_at),
    }
    for index, (metric, value, unit, measured_at) in enumerate([
        ('height', 172.0, 'cm', '2026-09-01T09:00:00'),
        ('weight', 74.2, 'kg', '2026-09-01T09:00:00'),
        ('waist', 86.0, 'cm', '2026-09-01T09:00:00'),
        ('body_fat_pct', 21.5, '%', '2026-09-01T09:00:00'),
        ('weight', 73.8, 'kg', '2026-10-01T09:00:00'),
        ('waist', 85.4, 'cm', '2026-10-01T09:00:00'),
        ('body_fat_pct', 21.2, '%', '2026-10-01T09:00:00'),
        ('weight', 73.5, 'kg', '2026-11-01T09:00:00'),
        ('waist', 84.9, 'cm', '2026-11-01T09:00:00'),
        ('body_fat_pct', 20.8, '%', '2026-11-01T09:00:00'),
        ('muscle_mass_pct', 38.5, '%', '2026-11-01T09:00:00'),
        ('hip', 98.0, 'cm', '2026-11-01T09:00:00'),
    ], start=1)
]

DEMO_MEASUREMENTS_BY_PROFILE = {
    'demo-profile-001': DEMO_MEASUREMENTS,
    'demo-profile-002': [
        {
            'id': f'demo-tall-{index:03d}',
            'profile_id': 'demo-profile-002',
            'metric_code': metric,
            'value': value,
            'unit': unit,
            'method': 'simulated',
            'measured_at': _date(measured_at),
            'created_by': 'demo-fixture',
            'notes': 'Dato sintético de demostración; no corresponde a una persona real.',
            'supersedes_id': None,
            'created_at': _date(measured_at),
        }
        for index, (metric, value, unit, measured_at) in enumerate([
            ('height', 181.0, 'cm', '2026-09-15T09:00:00'),
            ('weight', 82.4, 'kg', '2026-09-15T09:00:00'),
            ('waist', 82.0, 'cm', '2026-09-15T09:00:00'),
            ('hip', 101.0, 'cm', '2026-09-15T09:00:00'),
            ('weight', 81.9, 'kg', '2026-10-15T09:00:00'),
            ('waist', 81.4, 'cm', '2026-10-15T09:00:00'),
            ('body_fat_pct', 18.4, '%', '2026-10-15T09:00:00'),
            ('weight', 81.2, 'kg', '2026-11-15T09:00:00'),
            ('waist', 80.8, 'cm', '2026-11-15T09:00:00'),
            ('muscle_mass_pct', 42.1, '%', '2026-11-15T09:00:00'),
        ], start=1)
    ],
    'demo-profile-003': [
        {
            'id': f'demo-follow-{index:03d}',
            'profile_id': 'demo-profile-003',
            'metric_code': metric,
            'value': value,
            'unit': unit,
            'method': 'simulated',
            'measured_at': _date(measured_at),
            'created_by': 'demo-fixture',
            'notes': 'Dato sintético de seguimiento; no corresponde a una persona real.',
            'supersedes_id': None,
            'created_at': _date(measured_at),
        }
        for index, (metric, value, unit, measured_at) in enumerate([
            ('height', 168.0, 'cm', '2026-08-20T09:00:00'),
            ('weight', 69.8, 'kg', '2026-08-20T09:00:00'),
            ('chest', 94.0, 'cm', '2026-08-20T09:00:00'),
            ('waist', 78.5, 'cm', '2026-08-20T09:00:00'),
            ('weight', 69.1, 'kg', '2026-09-20T09:00:00'),
            ('chest', 94.3, 'cm', '2026-09-20T09:00:00'),
            ('waist', 77.9, 'cm', '2026-09-20T09:00:00'),
            ('body_fat_pct', 24.1, '%', '2026-10-20T09:00:00'),
            ('weight', 68.7, 'kg', '2026-10-20T09:00:00'),
            ('muscle_mass_pct', 35.8, '%', '2026-10-20T09:00:00'),
        ], start=1)
    ],
}
